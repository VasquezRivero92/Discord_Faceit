import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { env, getEffectiveConfig, getEffectiveConfigForGuild, CLUB_ROLES_MAP } from '../config/index.js';
import { fetchFaceitPlayerById, checkHubBanStatus } from '../services/faceitApi.js';
import { getPlayerSkillLevel, syncMemberLevelRole, getOrCreateSpecialRole } from '../services/roles.js';
import { createMatchEmbed, createServerStatusEmbed, updateLivePanel } from '../services/matchMessages.js';
import {
  createMatchVoiceChannels,
  movePlayersToVoice,
  cleanupVoiceChannel,
} from '../services/voice.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export async function handleFaceitWebhook(event, client, db) {
  logger.info(`Webhook recibido. Evento: ${event.event}`);

  // Validación básica de schema
  if (!event.event || !event.payload) {
    logger.warn('Webhook recibido con estructura inválida');
    return;
  }

  // Obtener el HUB ID o Club ID del webhook (priorizar entity.id para evitar usar payload.id que es el Match ID)
  const webhookHubId = event.entity?.id || event.payload?.hub_id || event.payload?.id;
  const guildIds = await db.getGuildIdsByHubId(webhookHubId);
  
  if (!guildIds || guildIds.length === 0) {
    logger.info(`Webhook ignorado. No se encontró ningún servidor de Discord (guild) configurado para el Hub/Club ID: ${webhookHubId}`);
    return;
  }

  const isRoleEvent = event.event === 'hub_user_role_added' || event.event === 'hub_user_role_removed';
  const isConfigure = event.event === 'match_status_configuring';
  const isStart = event.event === 'match_status_starting' || event.event === 'match_status_ready';
  const isFinish = event.event === 'match_status_finished';
  const isCancel = event.event === 'match_status_cancelled' || event.event === 'match_status_aborted';
  const isHubUserRemoved = event.event === 'hub_user_removed';

  if (!isRoleEvent && !isConfigure && !isStart && !isFinish && !isCancel && !isHubUserRemoved) {
    logger.info(`Evento no manejado: ${event.event}`);
    return;
  }

  for (const guildId of guildIds) {
    try {
      const config = await getEffectiveConfigForGuild(guildId);

      if (isRoleEvent) {
        await handleRoleEvent(event, client, db, config);
      } else if (isHubUserRemoved) {
        await handleHubUserRemoved(event, client, db, config, guildId);
      } else if (isConfigure || isStart || isFinish || isCancel) {
        await handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config, guildId);
      }
    } catch (err) {
      logger.error(`Error al procesar webhook para la guild ${guildId}:`, err);
    }
  }
}

async function handleRoleEvent(event, client, db, config) {
  const roleData = event.payload;
  const webhookHubId = roleData?.hub_id || roleData?.id || event.entity?.id;

  if (config.faceitHubId && webhookHubId !== config.faceitHubId) {
    return;
  }

  // Feature flag: autoRoleSync
  if (!(await isFeatureEnabled('autoRoleSync'))) {
    logger.info('autoRoleSync desactivado. Ignorando cambio de rol de club.');
    return;
  }

  try {
    const faceitPlayerId = roleData.user_id;
    const roleId = roleData.role_id;

    const roleName = CLUB_ROLES_MAP[roleId];
    if (!roleName) return;

    const guildId = (await db.getGuildIdByHubId(webhookHubId)) || config.guildId || env.DISCORD_GUILD_ID;
    const discordId = await db.getDiscordIdByFaceitId(faceitPlayerId, guildId);
    if (!discordId) return;

    const rolesChannelId = config.discordRolesChannelId;
    if (!rolesChannelId) return;

    const channel = await client.channels.fetch(rolesChannelId);
    if (!channel || !channel.guild || channel.guild.id !== guildId) return;

    const guild = channel.guild;
    const member = await guild.members.fetch(discordId);
    if (!member) return;

    const discordRole = await getOrCreateSpecialRole(guild, roleName);
    if (!discordRole) return;

    if (event.event === 'hub_user_role_added') {
      if (!member.roles.cache.has(discordRole.id)) {
        await member.roles.add(discordRole);
        await channel.send(`✨ <@${discordId}> ha recibido el rol de Club: **${roleName}**`);
        logger.success(`Rol especial ${roleName} asignado a ${member.user.tag} vía Webhook.`);
        await db.addLogEntry('info', `Rol de club '${roleName}' asignado a ${member.user.tag} vía Webhook.`, 'bot');
      }
    } else if (event.event === 'hub_user_role_removed') {
      if (member.roles.cache.has(discordRole.id)) {
        await member.roles.remove(discordRole);
        await channel.send(`⚠️ A <@${discordId}> se le ha retirado el rol de Club: **${roleName}**`);
        logger.success(`Rol especial ${roleName} removido de ${member.user.tag} vía Webhook.`);
        await db.addLogEntry('warn', `Rol de club '${roleName}' retirado de ${member.user.tag} vía Webhook.`, 'bot');
      }
    }
  } catch (err) {
    logger.error('Error al procesar webhook de cambio de rol:', err);
  }
}

async function handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config, guildId) {
  const matchData = event.payload;

  let isMatchingHub = event.entity?.id === config.faceitHubId;

  if (!isMatchingHub && config.faceitHubId && event.entity?.id) {
    try {
      const hubRes = await fetch(`https://open.faceit.com/data/v4/hubs/${event.entity.id}`, {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      });
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        if (hubData.organizer_id === config.faceitHubId) {
          isMatchingHub = true;
        }
      }
    } catch (err) {
      logger.error(`Error al validar parentesco de Hub ${event.entity.id} con Club/Organizador ${config.faceitHubId}:`, err.message);
    }
  }

  if (config.faceitHubId && !isMatchingHub) {
    logger.info(`Partida ignorada. No coincide con el HUB ni el Club (ID recibido: ${event.entity?.id}).`);
    return;
  }

  let matchesChannelId = null;
  let channel = null;

  if (config.discordMatchesChannelId) {
    const ids = config.discordMatchesChannelId.split(',').map(id => id.trim());
    for (const id of ids) {
      const ch = await client.channels.fetch(id).catch(() => null);
      if (ch && ch.guild?.id === guildId) {
        channel = ch;
        matchesChannelId = id;
        break;
      }
    }
  }

  if (!channel || !matchesChannelId) {
    logger.warn('discordMatchesChannelId no configurado o canal no encontrado.');
    return;
  }

  // Feature flag: matchAnnouncements
  if (!(await isFeatureEnabled('matchAnnouncements'))) {
    logger.info('matchAnnouncements desactivado. Ignorando evento de partida.');
    return;
  }

  try {
    const guild = channel.guild;

    if (channel.guild && channel.permissionsFor) {
      const me = channel.guild.members.me || channel.guild.members.cache.get(client.user.id);
      if (me) {
        const perms = channel.permissionsFor(me);
        const missing = [];
        if (!perms.has(PermissionFlagsBits.ViewChannel)) missing.push('ViewChannel (Ver canal)');
        if (!perms.has(PermissionFlagsBits.SendMessages)) missing.push('SendMessages (Enviar mensajes)');
        if (!perms.has(PermissionFlagsBits.EmbedLinks)) missing.push('EmbedLinks (Insertar enlaces)');
        if (missing.length > 0) {
          logger.error(`[CONFIGURACIÓN DISCORD] Faltan permisos críticos en el canal #${channel.name} (${channel.id}) para el bot: ${missing.join(', ')}`);
        }
      }
    }

    const teams = matchData.teams || {};
    const faction1 = teams.faction1 || { roster: [] };
    const faction2 = teams.faction2 || { roster: [] };
    const location = matchData.voting?.location?.pick?.[0] || 'Desconocido';
    const mapName = matchData.voting?.map?.pick?.[0] || 'Votando...';

    if (isConfigure) {
      const embed = createMatchEmbed(matchData, 'configuring');
      const msg = await channel.send({ embeds: [embed] });
      const webhookHubId = event.entity?.id;
      const targetGuildId = await db.getGuildIdByHubId(webhookHubId);
      await db.addActiveMatch(matchData.id, matchData, null, null, msg.id, faction1.roster, faction2.roster, {}, targetGuildId);
      await updateLivePanel(client, matchesChannelId, db);
      logger.info(`Mensaje de Lobby Creado enviado (Msg ID: ${msg.id}).`);
      await db.addLogEntry('info', `Partida ${matchData.id} detectada en configuración.`, 'bot');
      return;
    }

    if (isStart) {
      let vc1Id = null;
      let vc2Id = null;

      const autoVoice = await isFeatureEnabled('autoVoiceChannels');
      const autoMove = await isFeatureEnabled('autoMovePlayers');
      let waitingRoomId = null;
      if (config.discordWaitingRoomChannelId) {
        const ids = config.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (autoVoice && waitingRoomId && !waitingRoomId.startsWith('ID_')) {
        const vcResult = await createMatchVoiceChannels(guild, waitingRoomId, faction1, faction2, db);
        vc1Id = vcResult.vc1Id;
        vc2Id = vcResult.vc2Id;
      }

      let originalVoiceStates = {};
      if (autoMove && vc1Id) {
        const states1 = await movePlayersToVoice(guild, faction1.roster, vc1Id, db);
        Object.assign(originalVoiceStates, states1);
      }
      if (autoMove && vc2Id) {
        const states2 = await movePlayersToVoice(guild, faction2.roster, vc2Id, db);
        Object.assign(originalVoiceStates, states2);
      }

      const startedEmbed = createMatchEmbed(matchData, 'started');

      const team1List = await buildTeamList(faction1, db);
      const team2List = await buildTeamList(faction2, db);

      startedEmbed.addFields(
        { name: `👥 ${faction1.name || 'Equipo A'}`, value: team1List, inline: true },
        { name: `👥 ${faction2.name || 'Equipo B'}`, value: team2List, inline: true }
      );

      const activeMatch = await db.getActiveMatch(matchData.id);
      let finalMsgId = null;

      if (activeMatch && activeMatch.message_id) {
        try {
          const msg = await channel.messages.fetch(activeMatch.message_id);
          if (msg) {
            await msg.edit({ embeds: [startedEmbed] });
            finalMsgId = msg.id;
            logger.info(`Mensaje de Lobby editado a Partida Iniciada: ${msg.id}`);
          }
        } catch (fetchErr) {
          logger.warn('No se pudo editar el mensaje anterior. Enviando uno nuevo...');
        }
      }

      if (!finalMsgId) {
        const newMsg = await channel.send({ embeds: [startedEmbed] });
        finalMsgId = newMsg.id;
      }

      const webhookHubId = event.entity?.id;
      const targetGuildId = await db.getGuildIdByHubId(webhookHubId);
      await db.addActiveMatch(matchData.id, matchData, vc1Id, vc2Id, finalMsgId, faction1.roster, faction2.roster, originalVoiceStates, targetGuildId);
      await updateLivePanel(client, matchesChannelId, db);
      await db.addLogEntry('success', `Partida ${matchData.id} iniciada en mapa ${mapName}.`, 'bot');

      // Enviar/Actualizar estado de servidores
      const serverStatusEnabled = await isFeatureEnabled('serverStatusAnnouncements');
      const statusChannelId = config.discordStatusChannelId;
      if (serverStatusEnabled && statusChannelId && !statusChannelId.startsWith('ID_')) {
        try {
          const statusChannel = await client.channels.fetch(statusChannelId);
          if (statusChannel && statusChannel.guild?.id === guildId) {
            const statusEmbed = await createServerStatusEmbed(location, matchData.game);
            
            const configMsg = await db.getStatusMessageConfig();
            let statusMessage = null;

            if (configMsg && configMsg.channelId === statusChannelId) {
              try {
                statusMessage = await statusChannel.messages.fetch(configMsg.messageId);
              } catch (err) {
                logger.info('El mensaje de estado anterior no fue encontrado. Creando uno nuevo...');
              }
            }

            if (statusMessage) {
              await statusMessage.edit({ embeds: [statusEmbed] });
              logger.info('Reporte de estado de servidores actualizado (editado).');
            } else {
              const newMessage = await statusChannel.send({ embeds: [statusEmbed] });
              await db.setStatusMessageConfig(newMessage.id, statusChannelId);
              logger.info('Nuevo reporte de estado de servidores enviado.');
            }
          }
        } catch (statusErr) {
          logger.error('Error al enviar/editar reporte de estado de servidores:', statusErr.message);
        }
      }

    } else {
      // isFinish o isCancel
      const activeMatch = await db.getActiveMatch(matchData.id);
      let waitingRoomId = null;
      if (config.discordWaitingRoomChannelId) {
        const ids = config.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (activeMatch) {
        const originalStates = activeMatch.original_voice_states || {};
        await cleanupVoiceChannel(guild, activeMatch.faction1_vc_id, waitingRoomId, originalStates, 'Partida terminada');
        await cleanupVoiceChannel(guild, activeMatch.faction2_vc_id, waitingRoomId, originalStates, 'Partida terminada');
      }

      // Obtener rosters del webhook, o fallback al activeMatch de la DB si es que no vienen en el payload
      let fact1 = faction1;
      let fact2 = faction2;
      if ((!faction1.roster || faction1.roster.length === 0) && activeMatch) {
        fact1 = { name: activeMatch.faction1_name, roster: activeMatch.faction1_roster || [] };
      }
      if ((!faction2.roster || faction2.roster.length === 0) && activeMatch) {
        fact2 = { name: activeMatch.faction2_name, roster: activeMatch.faction2_roster || [] };
      }

      const team1List = await buildTeamList(fact1, db, guild.id);
      const team2List = await buildTeamList(fact2, db, guild.id);

      let finalEmbed = null;
      if (isFinish) {
        finalEmbed = createMatchEmbed(matchData, 'finished');
      } else if (isCancel) {
        finalEmbed = createMatchEmbed(matchData, 'cancelled');
      }

      if (finalEmbed) {
        finalEmbed.addFields(
          { name: `👥 ${fact1.name || 'Equipo A'}`, value: team1List, inline: true },
          { name: `👥 ${fact2.name || 'Equipo B'}`, value: team2List, inline: true }
        );
      }

      if (finalEmbed && activeMatch && activeMatch.message_id) {
        try {
          const msg = await channel.messages.fetch(activeMatch.message_id);
          if (msg) {
            await msg.edit({ embeds: [finalEmbed] });
            logger.info(`Mensaje de partida editado a finalizada/cancelada (Msg ID: ${msg.id})`);
          }
        } catch (fetchErr) {
          logger.warn(`No se pudo editar el mensaje de partida anterior ${activeMatch.message_id}. Enviando uno nuevo...`);
          await channel.send({ embeds: [finalEmbed] });
        }
      } else if (finalEmbed) {
        await channel.send({ embeds: [finalEmbed] });
      }

      await db.removeActiveMatch(matchData.id);
      await updateLivePanel(client, matchesChannelId, db);

      if (isFinish) {
        const results = matchData.results || {};
        const winner = results.winner || 'TBD';
        const score = results.score || {};
        const webhookHubId = event.entity?.id;
        const targetGuildId = await db.getGuildIdByHubId(webhookHubId);
        await db.addMatchToHistory(
          matchData.id,
          matchData,
          winner,
          score.faction1 || 0,
          score.faction2 || 0,
          fact1.roster,
          fact2.roster,
          targetGuildId
        ).catch(err => logger.error('Error al guardar historial de partida:', err));

        await db.addLogEntry('success', `Partida ${matchData.id} finalizada exitosamente.`, 'bot');

        // Sincronizar niveles
        const autoRoleSync = await isFeatureEnabled('autoRoleSync');
        if (autoRoleSync) {
          const allPlayers = [...fact1.roster, ...fact2.roster];
          await syncPlayerLevels(guild, allPlayers, db);
        }
      } else if (isCancel) {
        await db.addLogEntry('warn', `Partida ${matchData.id} cancelada/abortada.`, 'bot');

        const reasonCode = (matchData.reason || matchData.cancel_reason || matchData.status_reason || event.payload?.reason || event.payload?.cancel_reason || event.payload?.status_reason || '').toLowerCase();
        const isCheckinFailed = reasonCode.includes('checkin_failed') || reasonCode.includes('checkin');
        const isAfk = reasonCode.includes('afk') || reasonCode.includes('leaver') || reasonCode.includes('afk_player');
        const isCancelledByUser = reasonCode.includes('cancelled_by_user') || reasonCode.includes('veto_aborted');

        if (isCheckinFailed || isAfk || isCancelledByUser) {
          const sanctionsChannelId = config.discordSanctionsChannelId;
          if (sanctionsChannelId && !sanctionsChannelId.startsWith('ID_')) {
            try {
              const sanctionsChannel = await client.channels.fetch(sanctionsChannelId);
              if (sanctionsChannel && sanctionsChannel.guild?.id === guildId) {
                let cause = 'Desconocida';
                if (isCheckinFailed) cause = 'No aceptó la partida';
                else if (isAfk) cause = 'Jugador AFK';
                else if (isCancelledByUser) cause = 'Cancelado por usuario / Veto Abortado';

                let responsible = 'No especificado';
                if (matchData.responsible_player) {
                  responsible = matchData.responsible_player.nickname || matchData.responsible_player.id || matchData.responsible_player;
                } else if (matchData.afk_players && matchData.afk_players.length > 0) {
                  responsible = matchData.afk_players.map(p => p.nickname || p.id || p).join(', ');
                } else if (matchData.checkin_failed_players && matchData.checkin_failed_players.length > 0) {
                  responsible = matchData.checkin_failed_players.map(p => p.nickname || p.id || p).join(', ');
                } else if (matchData.user_id) {
                  responsible = matchData.nickname || matchData.user_id;
                } else if (event.payload?.user_id) {
                  responsible = event.payload.nickname || event.payload.user_id;
                }

                const queueEmbed = new EmbedBuilder()
                  .setTitle('⚠️ Sanción de Cola Aplicada (Queue Ban)')
                  .setColor(16753920) // Naranja
                  .addFields(
                    { name: 'Partida ID', value: `\`${matchData.id || event.payload?.id || 'N/A'}\``, inline: true },
                    { name: 'Causa', value: cause, inline: true },
                    { name: 'Jugador / Responsable', value: responsible, inline: true }
                  )
                  .setTimestamp();

                await sanctionsChannel.send({ embeds: [queueEmbed] });
                logger.success(`Notificación de Sanción de Cola (Queue Ban) enviada para la partida ${matchData.id}.`);
              }
            } catch (err) {
              logger.error('Error al enviar notificación de sanción de cola:', err);
            }
          }
        }
      }
    }
  } catch (err) {
    if (err.code === 50013 && channel) {
      logger.error(`[ERROR DE PERMISOS] Falta de permisos en el canal #${channel.name} (${channel.id}). Asegúrate de que el bot tenga los permisos de Ver Canal, Enviar Mensajes, e Insertar Enlaces (Embed Links).`);
    } else {
      logger.error('Error en webhook de partida:', err);
    }
  }
}

async function buildTeamList(faction, db, guildId = null) {
  const mentions = await Promise.all(
    faction.roster.map(async (p, index) => {
      const playerId = p.player_id || p.id;
      const discordId = (await db.getDiscordIdByFaceitId(playerId, guildId)) || (await db.getDiscordIdByNickname(p.nickname, guildId));
      const nameStr = discordId ? `<@${discordId}>` : `\`${p.nickname}\``;
      return `${index + 1}. ${nameStr}`;
    })
  );
  return mentions.join('\n') || 'Sin jugadores';
}

async function syncPlayerLevels(guild, players, db) {
  const syncPromises = players.map(async (p) => {
    try {
      const playerId = p.player_id || p.id;
      const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
      if (!discordId) return;

      if (!playerId) {
        logger.warn(`No se puede sincronizar nivel para ${p.nickname} porque no tiene ID de Faceit válido.`);
        return;
      }

      const playerData = await fetchFaceitPlayerById(playerId);
      const updatedLevel = getPlayerSkillLevel(playerData);
      const elo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
      
      if (updatedLevel) {
        await syncMemberLevelRole(guild, discordId, updatedLevel);
        await db.updatePlayerStats(discordId, updatedLevel, elo, guild.id);
      }
    } catch (apiErr) {
      logger.error(`Error al actualizar nivel para ${p.nickname}:`, apiErr.message);
    }
  });

  await Promise.allSettled(syncPromises);
}

async function handleHubUserRemoved(event, client, db, config, guildId) {
  const payload = event.payload || {};
  const hubId = payload.hub_id || event.entity?.id;
  const userId = payload.user_id;

  if (!hubId || !userId) {
    logger.warn('Hub user removed recibido sin hub_id o user_id');
    return;
  }

  // Verificamos si realmente fue un baneo en la API de Faceit
  let banInfo = await checkHubBanStatus(hubId, userId);
  let isPotentialClubBan = false;
  let customReason = '';

  if (!banInfo) {
    // Si no obtuvimos info de baneo (por ejemplo, porque es un Club y el endpoint de bans retorna 404),
    // verificamos mediante los campos del webhook si fue una expulsión o acción de un administrador.
    const removedBy = payload.removed_by || payload.admin_id || payload.operator || event.payload?.removed_by;
    if (removedBy && removedBy !== userId) {
      isPotentialClubBan = true;
      customReason = payload.reason || 'Acción de moderación (Expulsión/Baneo) en el Club';
    } else if (payload.reason) {
      isPotentialClubBan = true;
      customReason = payload.reason;
    } else {
      logger.info(`Usuario ${userId} removido de Hub/Club ${hubId} no corresponde a un baneo o kick (es salida voluntaria o no admins).`);
      return;
    }
  }

  // Si es un baneo, notificamos al canal de sanciones si está configurado
  const sanctionsChannelId = config.discordSanctionsChannelId;
  if (!sanctionsChannelId || sanctionsChannelId.startsWith('ID_')) {
    logger.info('discordSanctionsChannelId no configurado o inválido. Omitiendo notificación de baneo.');
    return;
  }

  try {
    const channel = await client.channels.fetch(sanctionsChannelId);
    if (!channel || channel.guild?.id !== guildId) return;

    const nickname = banInfo?.user?.nickname || payload.nickname || userId;
    const reason = banInfo?.reason || customReason || 'No especificada';
    const endsAt = banInfo?.ends_at || null;

    // Obtener avatar del jugador para un embed súper estético
    const playerDetails = await fetchFaceitPlayerById(userId).catch(() => null);
    const playerAvatar = playerDetails?.avatar || 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';
    const hubAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

    let durationStr = 'Permanente';
    let dateStr = '';
    if (endsAt) {
      const endsDate = new Date(endsAt);
      const unixSeconds = Math.floor(endsDate.getTime() / 1000);
      durationStr = `Expira <t:${unixSeconds}:R>`;
      
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      dateStr = `\n(${endsDate.toLocaleString('es-ES', options).replace(',', '')})`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🚫 Usuario Baneado del Hub')
      .setDescription('El siguiente usuario ha sido baneado del hub.')
      .setColor(0xFF0000) // Rojo: #FF0000
      .setThumbnail(hubAvatar)
      .addFields(
        { name: '👤 Jugador', value: `**[${nickname}](https://www.faceit.com/en/players/${nickname})**\nID: ${userId}`, inline: false },
        { name: '❗ Razón', value: reason, inline: false },
        { name: '🕒 Duración / Expiración', value: `${durationStr}${dateStr}`, inline: false }
      )
      .setFooter({ 
        text: 'FACEIT Hub System', 
        iconURL: playerAvatar 
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    logger.success(`Notificación de baneo del Hub enviada para el jugador ${nickname}.`);
    await db.addLogEntry('warn', `Notificación de baneo enviada para ${nickname}: ${reason}`, 'bot');

    // Guardar en cache para evitar duplicados en el cron job
    await db.addHubBanToCache(hubId, userId, {
      nickname,
      reason,
      endsAt: endsAt || null
    });
  } catch (err) {
    logger.error('Error al enviar notificación de baneo del Hub:', err);
  }
}


