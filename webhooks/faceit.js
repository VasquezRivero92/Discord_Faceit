import { env, getEffectiveConfig, getEffectiveConfigForGuild, CLUB_ROLES_MAP } from '../config/index.js';
import { fetchFaceitPlayerById } from '../services/faceitApi.js';
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

  if (!isRoleEvent && !isConfigure && !isStart && !isFinish && !isCancel) {
    logger.info(`Evento no manejado: ${event.event}`);
    return;
  }

  for (const guildId of guildIds) {
    try {
      const config = await getEffectiveConfigForGuild(guildId);

      if (isRoleEvent) {
        await handleRoleEvent(event, client, db, config);
      } else if (isConfigure || isStart || isFinish || isCancel) {
        await handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config);
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
    if (!channel || !channel.guild) return;

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

async function handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config) {
  const matchData = event.payload;

  if (config.faceitHubId && event.entity?.id !== config.faceitHubId) {
    logger.info(`Partida ignorada. No coincide con el HUB (ID recibido: ${event.entity?.id}).`);
    return;
  }

  let matchesChannelId = null;
  let channel = null;

  if (config.discordMatchesChannelId) {
    const ids = config.discordMatchesChannelId.split(',').map(id => id.trim());
    for (const id of ids) {
      channel = await client.channels.fetch(id).catch(() => null);
      if (channel) {
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
          if (statusChannel) {
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
      }
    }
  } catch (err) {
    logger.error('Error en webhook de partida:', err);
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
