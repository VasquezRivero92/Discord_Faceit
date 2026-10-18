import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { env, getEffectiveConfig, getEffectiveConfigForGuild, resolveQueueConfig, CLUB_ROLES_MAP } from '../config/index.js';
import { fetchFaceitPlayerById, fetchCurrentHubSeason } from '../services/faceitApi.js';
import { getPlayerSkillLevel, syncMemberLevelRole, getOrCreateSpecialRole, syncMemberNickname } from '../services/roles.js';
import { createMatchEmbed, createServerStatusEmbed, updateLivePanel } from '../services/matchMessages.js';
import {
  createMatchVoiceChannels,
  movePlayersToVoice,
  cleanupVoiceChannel,
} from '../services/voice.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { playTTSCountdown } from '../utils/voiceAnnouncer.js';

function getFaceitStat(source, ...keys) {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return null;
}

function normalizeFaceitMatchStats(rawStats) {
  const round = rawStats?.rounds?.[0];
  if (!round || !Array.isArray(round.teams)) return null;

  const roundStats = round.round_stats || {};
  return {
    map: getFaceitStat(roundStats, 'Map', 'Map Name'),
    duration: getFaceitStat(roundStats, 'Match Duration', 'Duration'),
    playedAt: getFaceitStat(roundStats, 'Match Finished At', 'Match Played'),
    teams: round.teams.map(team => {
      const teamStats = team.team_stats || {};
      return {
        name: getFaceitStat(teamStats, 'Team', 'Team Name') || team.name || 'Equipo',
        score: getFaceitStat(teamStats, 'Final Score', 'Score'),
        players: (team.players || []).map(player => {
          const stats = player.player_stats || {};
          return {
            playerId: player.player_id || player.playerId || null,
            nickname: player.nickname || player.name || 'Jugador',
            kills: getFaceitStat(stats, 'Kills', 'K'),
            assists: getFaceitStat(stats, 'Assists', 'A'),
            deaths: getFaceitStat(stats, 'Deaths', 'D'),
            kd: getFaceitStat(stats, 'K/D Ratio', 'K/D'),
            headshots: getFaceitStat(stats, 'Headshots %', 'HS %', 'HS%'),
            mvps: getFaceitStat(stats, 'MVPs', 'MVP')
          };
        })
      };
    })
  };
}

async function fetchFaceitStatsForHistory(matchId) {
  if (!matchId || !env.FACEIT_API_KEY || env.FACEIT_API_KEY.startsWith('TU_')) return null;
  try {
    const response = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}/stats`, {
      headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' }
    });
    if (!response.ok) {
      logger.warn(`FACEIT aún no devolvió estadísticas para ${matchId} (${response.status}).`);
      return null;
    }
    return normalizeFaceitMatchStats(await response.json());
  } catch (error) {
    logger.warn(`No se pudieron obtener estadísticas FACEIT de ${matchId}: ${error.message}`);
    return null;
  }
}

export async function handleFaceitWebhook(event, client, db) {
  logger.info(`Webhook recibido. Evento: ${event.event}`);

  // Validación básica de schema
  if (!event.event || !event.payload) {
    logger.warn('Webhook recibido con estructura inválida');
    return;
  }

  const isRoleEvent = event.event === 'hub_user_role_added' || event.event === 'hub_user_role_removed';
  const isConfigure = event.event === 'match_status_configuring';
  const isStart = event.event === 'match_status_starting' || event.event === 'match_status_ready';
  const isFinish = event.event === 'match_status_finished';
  const isCancel = event.event === 'match_status_cancelled' || event.event === 'match_status_aborted';
  const isHubUserRemoved = event.event === 'hub_user_removed' || event.event === 'hub_user_banned' || event.event === 'hub_user_suspended' || event.event === 'hub_user_kicked' || event.event === 'hub_ban_added' || event.event === 'organizer_user_banned';
  const isHubUserAdded = event.event === 'hub_user_added' || event.event === 'hub_user_unbanned' || event.event === 'hub_ban_removed';

  const isDemoReady = event.event === 'match_demo_ready';
  if (isDemoReady) {
    logger.info(`Demo de partida lista (Match ID: ${event.payload?.id || event.payload?.match_id || 'N/A'})`);
    return;
  }

  if (!isRoleEvent && !isConfigure && !isStart && !isFinish && !isCancel && !isHubUserRemoved && !isHubUserAdded) {
    logger.info(`Evento no manejado: ${event.event}`);
    return;
  }

  // Obtener el HUB ID o Club ID del webhook (priorizar competition_id/hub_id del payload para evitar usar el ID del organizador o el Match ID)
  let webhookHubId = event.payload?.competition_id || event.payload?.hub_id || event.entity?.id || event.payload?.id;

  // Si el ID obtenido parece ser un ID de partida (comienza con "1-") y no un Hub/Leaderboard ID, resolverlo a través de la API
  if (webhookHubId && webhookHubId.startsWith('1-')) {
    try {
      const matchRes = await fetch(`https://open.faceit.com/data/v4/matches/${webhookHubId}`, {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        if (matchData.competition_id) {
          webhookHubId = matchData.competition_id;
        }
      }
    } catch (err) {
      logger.error(`Error al resolver el competition_id para la partida ${webhookHubId}:`, err.message);
    }
  }

  const guildIds = await db.getGuildIdsByHubId(webhookHubId);
  
  if (!guildIds || guildIds.length === 0) {
    logger.info(`Webhook ignorado. No se encontró ningún servidor de Discord (guild) configurado para el Hub/Club ID: ${webhookHubId}`);
    return;
  }

  for (const guildId of guildIds) {
    try {
      const config = await getEffectiveConfigForGuild(guildId);

      if (isRoleEvent) {
        await handleRoleEvent(event, client, db, config);
      } else if (isHubUserRemoved) {
        await handleHubUserRemoved(event, client, db, config, guildId);
      } else if (isHubUserAdded) {
        await handleHubUserAdded(event, client, db, config, guildId);
      } else if (isConfigure || isStart || isFinish || isCancel) {
        await handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config, guildId, webhookHubId);
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
  if (!(await isFeatureEnabled('autoRoleSync', config.discordGuildId))) {
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

async function handleMatchEvent(event, client, db, isConfigure, isStart, isFinish, isCancel, config, guildId, webhookHubId) {
  let matchData = event.payload || {};
  const rawMatchId = matchData.id || matchData.match_id || matchData.matchId ||
    event.payload?.id || event.payload?.match_id || event.payload?.matchId ||
    (event.payload?.entity?.type === 'match' ? event.payload?.entity?.id : null) ||
    (event.entity?.type === 'match' ? event.entity?.id : null);

  if (rawMatchId) {
    matchData.id = rawMatchId;
    let attempts = 0;
    const maxAttempts = 10; // Intentará hasta por 15 segundos para dar suficiente margen
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      try {
        const matchRes = await fetch(`https://open.faceit.com/data/v4/matches/${rawMatchId}`, {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        });
        if (matchRes.ok) {
          const freshMatch = await matchRes.json();
          if (freshMatch && freshMatch.teams) {
            const f1Roster = freshMatch.teams.faction1?.roster || [];
            const f2Roster = freshMatch.teams.faction2?.roster || [];
            
            freshMatch.id = freshMatch.id || freshMatch.match_id || rawMatchId;
            matchData = { ...freshMatch, ...event.payload };
            for (const key of Object.keys(event.payload || {})) {
              if (event.payload[key] !== undefined && event.payload[key] !== null) {
                matchData[key] = event.payload[key];
              }
            }
            matchData.id = matchData.id || rawMatchId;
            
            // Si ya tenemos rosters poblados (o es una partida que no requiere rosters y es el último intento), salimos del bucle
            if (f1Roster.length > 0 && f2Roster.length > 0) {
              logger.info(`Detalles de partida ${matchData.id} obtenidos con éxito de Faceit API (Intento ${attempts + 1}).`);
              break;
            } else {
              logger.warn(`Faceit API retornó la partida ${matchData.id} pero con rosters vacíos (Intento ${attempts + 1}).`);
            }
          }
        } else {
          const errText = await matchRes.text().catch(() => '');
          logger.error(`Error al obtener detalles de la partida ${rawMatchId} (Intento ${attempts + 1}). Status: ${matchRes.status}. Respuesta: ${errText}`);
          if (matchRes.status === 404) {
            break;
          }
        }
      } catch (err) {
        logger.error(`Excepción al obtener detalles de partida ${rawMatchId} (Intento ${attempts + 1}):`, err.message);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        logger.info(`Esperando 1.5 segundos antes de reintentar obtener detalles de la partida...`);
        await delay(1500);
      }
    }
  }

  if (matchData) {
    matchData.id = matchData.id || matchData.match_id || rawMatchId;
  }

  if (!matchData || !matchData.id) {
    logger.warn('Evento de partida ignorado: No se pudo identificar el Match ID en el payload del webhook.');
    return;
  }

  let isMatchingHub = webhookHubId === config.faceitHubId || webhookHubId === config.faceitLeaderboardId;

  if (!isMatchingHub && Array.isArray(config.queues)) {
    isMatchingHub = config.queues.some(q => 
      (q.id && q.id.toLowerCase() === webhookHubId?.toLowerCase()) ||
      (q.queueId && q.queueId.toLowerCase() === webhookHubId?.toLowerCase())
    );
  }

  if (!isMatchingHub && config.faceitHubId && webhookHubId && !webhookHubId.startsWith('1-')) {
    try {
      const hubRes = await fetch(`https://open.faceit.com/data/v4/hubs/${webhookHubId}`, {
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
      logger.error(`Error al validar parentesco de Hub ${webhookHubId} con Club/Organizador ${config.faceitHubId}:`, err.message);
    }
  }

  if (config.faceitHubId && !isMatchingHub) {
    logger.info(`Partida ignorada. No coincide con el HUB ni el Club (ID recibido: ${webhookHubId}).`);
    return;
  }

  const queueConfig = resolveQueueConfig(config, matchData, event);
  let matchesChannelId = queueConfig.discordMatchesChannelId;
  let channel = null;

  if (matchesChannelId) {
    const ids = matchesChannelId.split(',').map(id => id.trim());
    for (const id of ids) {
      const ch = await client.channels.fetch(id).catch(() => null);
      if (ch && ch.guild?.id === guildId) {
        channel = ch;
        matchesChannelId = id;
        break;
      }
    }
  }

  const mixtonChannelId = queueConfig.discordMixtonChannelId || matchesChannelId;
  const announcementsEnabled = await isFeatureEnabled('matchAnnouncements', guildId);
  const canPostAnnouncement = Boolean(channel && announcementsEnabled);

  if (!channel || !matchesChannelId) {
    logger.warn('discordMatchesChannelId no configurado o canal no encontrado. Notificaciones en Discord omitidas.');
  }

  if (!announcementsEnabled) {
    logger.info('matchAnnouncements desactivado. Notificaciones en Discord omitidas.');
  }

  try {
    const guild = channel?.guild || (await client.guilds.fetch(guildId).catch(() => null));

    if (canPostAnnouncement && channel.guild && channel.permissionsFor) {
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

    const rawTeams = matchData.teams || event.payload?.teams || {};
    let faction1 = { roster: [] };
    let faction2 = { roster: [] };
    if (Array.isArray(rawTeams)) {
      faction1 = rawTeams[0] || { roster: [] };
      faction2 = rawTeams[1] || { roster: [] };
    } else if (rawTeams && typeof rawTeams === 'object') {
      faction1 = rawTeams.faction1 || { roster: [] };
      faction2 = rawTeams.faction2 || { roster: [] };
    }

    if ((!faction1.roster || faction1.roster.length === 0) && event.payload?.teams) {
      const pTeams = event.payload.teams;
      if (Array.isArray(pTeams)) {
        faction1 = pTeams[0] || faction1;
      } else if (pTeams.faction1) {
        faction1 = pTeams.faction1;
      }
    }
    if ((!faction2.roster || faction2.roster.length === 0) && event.payload?.teams) {
      const pTeams = event.payload.teams;
      if (Array.isArray(pTeams)) {
        faction2 = pTeams[1] || faction2;
      } else if (pTeams.faction2) {
        faction2 = pTeams.faction2;
      }
    }
    const location = matchData.voting?.location?.pick?.[0] || 'Desconocido';
    const mapName = matchData.voting?.map?.pick?.[0] || 'Votando...';

    if (isConfigure) {
      let msg = null;
      if (canPostAnnouncement) {
        const embed = createMatchEmbed(matchData, 'configuring', queueConfig);
        const team1List = await buildTeamList(faction1, db, guildId);
        const team2List = await buildTeamList(faction2, db, guildId);

        embed.addFields(
          { name: `👥 ${faction1.name || 'Equipo A'}`, value: team1List, inline: true },
          { name: `👥 ${faction2.name || 'Equipo B'}`, value: team2List, inline: true }
        );

        msg = await channel.send({ embeds: [embed] }).catch(err => {
          logger.error('Error enviando anuncio de lobby configurando:', err);
          return null;
        });
      }

      const targetGuildId = (await db.getGuildIdByHubId(webhookHubId)) || guildId;
      await db.addActiveMatch(
        matchData.id,
        matchData,
        null,
        null,
        msg?.id || null,
        faction1.roster,
        faction2.roster,
        {},
        targetGuildId,
        queueConfig.queueId,
        queueConfig.queueName,
        matchesChannelId,
        queueConfig.discordWaitingRoomChannelId
      );
      
      const historyData = { ...matchData, queue_id: queueConfig.queueId, queue_name: queueConfig.queueName };
      await db.addMatchToHistory(
        matchData.id,
        historyData,
        'TBD',
        0,
        0,
        faction1.roster || [],
        faction2.roster || [],
        targetGuildId,
        'configuring'
      ).catch(err => logger.error('Error al guardar historial de partida en configuración:', err));

      if (canPostAnnouncement && mixtonChannelId) {
        await updateLivePanel(client, mixtonChannelId, db);
      }
      logger.info(`Mensaje de Lobby Creado (Configuración) procesado.${queueConfig.queueName ? ` [Cola: ${queueConfig.queueName}]` : ''}`);
      await db.addLogEntry('info', `Partida ${matchData.id} detectada en configuración${queueConfig.queueName ? ` (${queueConfig.queueName})` : ''}.`, 'bot');
      return;
    }

    if (isStart) {
      // Sincronizar apodos en Discord para usuarios verificados en la partida
      if (guild) {
        const autoNickSync = await isFeatureEnabled('autoNickSync', guildId);
        if (autoNickSync !== false) {
          const allPlayers = [...(faction1.roster || []), ...(faction2.roster || [])];
          await syncPlayerNicknames(guild, allPlayers, db, guildId);
        }

        // Asignar rol del Hub a los jugadores en su primera partida de la season para esta cola
        if (queueConfig.discordHubRoleId) {
          const allPlayers = [...(faction1.roster || []), ...(faction2.roster || [])];
          await assignHubSeasonRoleIfFirstMatch(guild, allPlayers, queueConfig, config, db);
        }
      }

      let vc1Id = null;
      let vc2Id = null;

      const autoVoice = await isFeatureEnabled('autoVoiceChannels', guildId);
      const autoMove = await isFeatureEnabled('autoMovePlayers', guildId);
      let waitingRoomId = null;
      if (guild && queueConfig.discordWaitingRoomChannelId) {
        const ids = queueConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (guild && autoVoice && waitingRoomId && !waitingRoomId.startsWith('ID_')) {
        const vcResult = await createMatchVoiceChannels(guild, waitingRoomId, faction1, faction2, db);
        vc1Id = vcResult.vc1Id;
        vc2Id = vcResult.vc2Id;
      }

      if (guild && waitingRoomId && !waitingRoomId.startsWith('ID_')) {
        const cap1Name = await getFactionCaptainName(faction1, db, guild, guildId);
        const cap2Name = await getFactionCaptainName(faction2, db, guild, guildId);
        const textToSpeak = `La partida entre ${cap1Name} en contra de ${cap2Name} iniciará en 5, 4, 3, 2, 1`;
        try {
          await playTTSCountdown(guild, waitingRoomId, textToSpeak);
        } catch (err) {
          logger.error('Error al reproducir el anuncio de voz en Faceit:', err);
        }
      }

      let originalVoiceStates = {};
      if (guild && autoMove && vc1Id) {
        const states1 = await movePlayersToVoice(guild, faction1.roster, vc1Id, db);
        Object.assign(originalVoiceStates, states1);
      }
      if (guild && autoMove && vc2Id) {
        const states2 = await movePlayersToVoice(guild, faction2.roster, vc2Id, db);
        Object.assign(originalVoiceStates, states2);
      }

      const activeMatch = await db.getActiveMatch(matchData.id);
      let finalMsgId = null;

      if (canPostAnnouncement) {
        const startedEmbed = createMatchEmbed(matchData, 'started', queueConfig);
        const team1List = await buildTeamList(faction1, db, guildId);
        const team2List = await buildTeamList(faction2, db, guildId);

        startedEmbed.addFields(
          { name: `⚔️ ${faction1.name || 'Equipo A'}`, value: team1List, inline: true },
          { name: `⚔️ ${faction2.name || 'Equipo B'}`, value: team2List, inline: true }
        );

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
          const newMsg = await channel.send({ embeds: [startedEmbed] }).catch(() => null);
          if (newMsg) finalMsgId = newMsg.id;
        }
      }

      const targetGuildId = (await db.getGuildIdByHubId(webhookHubId)) || guildId;
      await db.addActiveMatch(
        matchData.id,
        matchData,
        vc1Id,
        vc2Id,
        finalMsgId,
        faction1.roster,
        faction2.roster,
        originalVoiceStates,
        targetGuildId,
        queueConfig.queueId,
        queueConfig.queueName,
        matchesChannelId,
        waitingRoomId
      );

      const historyData = { ...matchData, queue_id: queueConfig.queueId, queue_name: queueConfig.queueName };
      await db.addMatchToHistory(
        matchData.id,
        historyData,
        'TBD',
        0,
        0,
        faction1.roster || [],
        faction2.roster || [],
        targetGuildId,
        'started'
      ).catch(err => logger.error('Error al guardar historial de partida iniciada:', err));

      if (canPostAnnouncement && mixtonChannelId) {
        await updateLivePanel(client, mixtonChannelId, db);
      }
      await db.addLogEntry('success', `Partida ${matchData.id} iniciada en mapa ${mapName}${queueConfig.queueName ? ` (${queueConfig.queueName})` : ''}.`, 'bot');

      // Enviar/Actualizar estado de servidores
      const serverStatusEnabled = await isFeatureEnabled('serverStatusAnnouncements', guildId);
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
      let waitingRoomId = activeMatch?.waiting_room_id || null;

      if (!waitingRoomId && guild && guild.channels && queueConfig.discordWaitingRoomChannelId) {
        const ids = queueConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      // Si activeMatch guardó un matches_channel_id específico de su cola, aseguramos usarlo
      if (activeMatch?.matches_channel_id && (!channel || channel.id !== activeMatch.matches_channel_id)) {
        const specificCh = await client.channels.fetch(activeMatch.matches_channel_id).catch(() => null);
        if (specificCh && specificCh.guild?.id === guildId) {
          channel = specificCh;
          matchesChannelId = activeMatch.matches_channel_id;
        }
      }

      // Remover de partidas activas ANTES de mover jugadores para evitar condiciones de carrera en voiceStateUpdate
      await db.removeActiveMatch(matchData.id);

      if (guild && activeMatch) {
        const originalStates = activeMatch.original_voice_states || {};
        const reason = isCancel ? 'Partida cancelada' : 'Partida terminada';
        await cleanupVoiceChannel(guild, activeMatch.faction1_vc_id, waitingRoomId, originalStates, reason, isCancel);
        await cleanupVoiceChannel(guild, activeMatch.faction2_vc_id, waitingRoomId, originalStates, reason, isCancel);
      } else if (guild && isCancel) {
        // Fallback: Si la partida fue cancelada y no hay registro en DB, limpiar solo canales realmente huérfanos
        const activeMatches = await db.getActiveMatches().catch(() => []);
        const activeVcIds = new Set();
        for (const m of activeMatches) {
          if (m.faction1_vc_id) activeVcIds.add(m.faction1_vc_id);
          if (m.faction2_vc_id) activeVcIds.add(m.faction2_vc_id);
        }
        const channels = guild.channels ? await guild.channels.fetch().catch(() => null) : null;
        if (channels) {
          const orphanVCs = channels.filter(c => c.type === 2 && c.name.startsWith('🔊') && !activeVcIds.has(c.id));
          for (const [_, vc] of orphanVCs) {
            await cleanupVoiceChannel(guild, vc.id, waitingRoomId, {}, 'Partida cancelada', true);
          }
        }
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

      if (canPostAnnouncement) {
        const team1List = await buildTeamList(fact1, db, guildId);
        const team2List = await buildTeamList(fact2, db, guildId);

        let finalEmbed = null;
        if (isFinish) {
          finalEmbed = createMatchEmbed(matchData, 'finished', queueConfig);
        } else if (isCancel) {
          finalEmbed = createMatchEmbed(matchData, 'cancelled', queueConfig);
        }

        if (finalEmbed) {
          const results = matchData.results || {};
          const winnerFaction = results.winner;
          const score = results.score || {};

          let t1Header = `👥 ${fact1.name || 'Equipo A'}`;
          let t2Header = `👥 ${fact2.name || 'Equipo B'}`;

          if (isFinish) {
            if (winnerFaction === 'faction1') {
              t1Header = `🏆 ${fact1.name || 'Equipo A'} ${score.faction1 !== undefined ? `(${score.faction1})` : ''}`;
              t2Header = `👥 ${fact2.name || 'Equipo B'} ${score.faction2 !== undefined ? `(${score.faction2})` : ''}`;
            } else if (winnerFaction === 'faction2') {
              t1Header = `👥 ${fact1.name || 'Equipo A'} ${score.faction1 !== undefined ? `(${score.faction1})` : ''}`;
              t2Header = `🏆 ${fact2.name || 'Equipo B'} ${score.faction2 !== undefined ? `(${score.faction2})` : ''}`;
            } else if (score.faction1 !== undefined && score.faction2 !== undefined) {
              t1Header = `👥 ${fact1.name || 'Equipo A'} (${score.faction1})`;
              t2Header = `👥 ${fact2.name || 'Equipo B'} (${score.faction2})`;
            }
          }

          finalEmbed.addFields(
            { name: t1Header, value: team1List, inline: true },
            { name: t2Header, value: team2List, inline: true }
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

        if (mixtonChannelId) {
          await updateLivePanel(client, mixtonChannelId, db);
        }
      }

      const targetGuildId = (await db.getGuildIdByHubId(webhookHubId)) || guildId;
      const historyData = { ...matchData, queue_id: queueConfig.queueId, queue_name: queueConfig.queueName };

      if (isFinish) {
        const results = matchData.results || {};
        const winner = results.winner || 'TBD';
        const score = results.score || {};
        await db.addMatchToHistory(
          matchData.id,
          historyData,
          winner,
          score.faction1 || 0,
          score.faction2 || 0,
          fact1.roster,
          fact2.roster,
          targetGuildId,
          'finished'
        ).catch(err => logger.error('Error al guardar historial de partida:', err));

        // One FACEIT request occurs only once, when the match closes. The
        // normalized result is stored separately from the lightweight history
        // summary so neither the Mixtón nor the list needs this API call.
        const faceitStats = await fetchFaceitStatsForHistory(matchData.id);
        if (faceitStats) {
          await db.saveMatchStats(matchData.id, faceitStats);
        }

        await db.addLogEntry('success', `Partida ${matchData.id} finalizada exitosamente${queueConfig.queueName ? ` (${queueConfig.queueName})` : ''}.`, 'bot');

        // Sincronizar niveles
        if (guild) {
          const autoRoleSync = await isFeatureEnabled('autoRoleSync', guild.id);
          if (autoRoleSync) {
            const allPlayers = [...fact1.roster, ...fact2.roster];
            await syncPlayerLevels(guild, allPlayers, db, queueConfig, config);
          }
        }
      } else if (isCancel) {
        await db.addMatchToHistory(
          matchData.id,
          historyData,
          'CANCELLED',
          0,
          0,
          fact1.roster,
          fact2.roster,
          targetGuildId,
          'cancelled'
        ).catch(err => logger.error('Error al guardar historial de partida cancelada:', err));
        await db.addLogEntry('warn', `Partida ${matchData.id} cancelada/abortada${queueConfig.queueName ? ` (${queueConfig.queueName})` : ''}.`, 'bot');

        // Sincronizar niveles
        if (guild) {
          const autoRoleSync = await isFeatureEnabled('autoRoleSync', guild.id);
          if (autoRoleSync) {
            const allPlayers = [...fact1.roster, ...fact2.roster];
            await syncPlayerLevels(guild, allPlayers, db, queueConfig, config);
          }
        }
      } else if (isCancel) {
        await db.addMatchToHistory(
          matchData.id,
          matchData,
          'CANCELLED',
          0,
          0,
          fact1.roster,
          fact2.roster,
          targetGuildId,
          'cancelled'
        ).catch(err => logger.error('Error al guardar historial de partida cancelada:', err));
        await db.addLogEntry('warn', `Partida ${matchData.id} cancelada/abortada.`, 'bot');

        const reasonCode = (matchData.reason || matchData.cancel_reason || matchData.status_reason || event.payload?.reason || event.payload?.cancel_reason || event.payload?.status_reason || '').toLowerCase();
        const isCheckinFailed = reasonCode.includes('checkin_failed') || reasonCode.includes('checkin') || reasonCode.includes('no_accept') || reasonCode.includes('not_ready') || Boolean(event.payload?.checkin_failed_players && event.payload.checkin_failed_players.length > 0) || Boolean(matchData.checkin_failed_players && matchData.checkin_failed_players.length > 0);
        const isAfk = reasonCode.includes('afk') || reasonCode.includes('leaver') || reasonCode.includes('afk_player') || reasonCode.includes('no_show') || Boolean(event.payload?.afk_players && event.payload.afk_players.length > 0) || Boolean(matchData.afk_players && matchData.afk_players.length > 0);
        const isCancelledByUser = reasonCode.includes('cancelled_by_user') || reasonCode.includes('veto_aborted') || reasonCode.includes('captain_cancel');

        if (isCheckinFailed || isAfk || isCancelledByUser || matchData.status === 'CANCELLED' || event.event === 'match_status_cancelled' || event.event === 'match_status_aborted') {
          const sanctionsChannelId = config.discordSanctionsChannelId;
          if (sanctionsChannelId && !sanctionsChannelId.startsWith('ID_')) {
            try {
              const sanctionsChannel = await client.channels.fetch(sanctionsChannelId);
              if (sanctionsChannel && sanctionsChannel.guild?.id === guildId) {
                let cause = 'No aceptó la partida';
                if (isCheckinFailed) cause = 'No aceptó la partida';
                else if (isAfk) cause = 'Jugador AFK / No se conectó';
                else if (isCancelledByUser) cause = 'Cancelado por usuario / Veto Abortado';

                const combinedRoster = [];
                const addRosterPlayers = (r) => {
                  if (Array.isArray(r)) {
                    for (const p of r) {
                      if (p && !combinedRoster.some(existing => (existing.player_id || existing.id) === (p.player_id || p.id))) {
                        combinedRoster.push(p);
                      }
                    }
                  }
                };

                addRosterPlayers(fact1?.roster);
                addRosterPlayers(fact2?.roster);
                addRosterPlayers(faction1?.roster);
                addRosterPlayers(faction2?.roster);
                if (matchData.teams) {
                  if (Array.isArray(matchData.teams)) {
                    matchData.teams.forEach(t => addRosterPlayers(t?.roster));
                  } else {
                    addRosterPlayers(matchData.teams.faction1?.roster);
                    addRosterPlayers(matchData.teams.faction2?.roster);
                  }
                }
                if (event.payload?.teams) {
                  if (Array.isArray(event.payload.teams)) {
                    event.payload.teams.forEach(t => addRosterPlayers(t?.roster));
                  } else {
                    addRosterPlayers(event.payload.teams.faction1?.roster);
                    addRosterPlayers(event.payload.teams.faction2?.roster);
                  }
                }
                if (activeMatch) {
                  addRosterPlayers(activeMatch.faction1_roster);
                  addRosterPlayers(activeMatch.faction2_roster);
                }

                const rawCandidates = [];

                const addCandidate = (val) => {
                  if (!val) return;
                  if (Array.isArray(val)) {
                    val.forEach(v => v && rawCandidates.push(v));
                  } else {
                    rawCandidates.push(val);
                  }
                };

                addCandidate(event.payload?.checkin_failed_players);
                addCandidate(matchData?.checkin_failed_players);
                addCandidate(event.payload?.checkin_failed);
                addCandidate(matchData?.checkin_failed);
                addCandidate(event.payload?.afk_players);
                addCandidate(matchData?.afk_players);
                addCandidate(event.payload?.afk_player);
                addCandidate(matchData?.afk_player);
                addCandidate(event.payload?.responsible_player || event.payload?.responsible_players || event.payload?.responsible);
                addCandidate(matchData?.responsible_player || matchData?.responsible_players || matchData?.responsible);
                addCandidate(event.payload?.banned_players || event.payload?.banned_player || event.payload?.bans);
                addCandidate(matchData?.banned_players || matchData?.banned_player || matchData?.bans);
                addCandidate(event.payload?.cancelled_by || event.payload?.cancelled_by_user || event.payload?.cancelled_by_player);
                addCandidate(matchData?.cancelled_by || matchData?.cancelled_by_user || matchData?.cancelled_by_player);

                if (event.payload?.user_id || event.payload?.player_id) {
                  addCandidate({ id: event.payload.user_id || event.payload.player_id, nickname: event.payload.nickname });
                }
                if (matchData?.user_id || matchData?.player_id) {
                  addCandidate({ id: matchData.user_id || matchData.player_id, nickname: matchData.nickname });
                }
                if (event.payload?.nickname) addCandidate(event.payload.nickname);

                // Buscar mención de nickname o ID en el texto de la razón
                const reasonText = `${matchData.reason || ''} ${matchData.status_reason || ''} ${matchData.cancel_reason || ''} ${event.payload?.reason || ''} ${event.payload?.status_reason || ''} ${event.payload?.cancel_reason || ''}`;
                if (reasonText.trim().length > 0) {
                  for (const p of combinedRoster) {
                    if (!p) continue;
                    const pNick = p.nickname || p.name || p.game_player_name;
                    const pId = p.player_id || p.id || p.user_id;
                    if (pNick && reasonText.toLowerCase().includes(pNick.toLowerCase())) {
                      addCandidate(p);
                    } else if (pId && reasonText.toLowerCase().includes(pId.toLowerCase())) {
                      addCandidate(p);
                    }
                  }
                }

                // Escanear rosters por estado individual de jugador (state, status, checkin, ready: false, afk: true)
                for (const p of combinedRoster) {
                  if (!p) continue;
                  const statusStr = (p.state || p.status || p.checkin || p.checkin_status || p.presence || '').toString().toLowerCase();
                  const isFailed =
                    statusStr.includes('fail') ||
                    statusStr.includes('afk') ||
                    statusStr.includes('declin') ||
                    statusStr.includes('no_show') ||
                    statusStr.includes('not_ready') ||
                    statusStr.includes('cancel') ||
                    statusStr.includes('ban') ||
                    statusStr.includes('off') ||
                    statusStr.includes('absent') ||
                    p.ready === false ||
                    p.checked_in === false ||
                    p.checkin === false ||
                    p.afk === true ||
                    p.checkin_failed === true;
                  if (isFailed) {
                    addCandidate(p);
                  }
                }

                // Si aún no tenemos candidatos, revisar el cache de baneos recientes del hub (últimos 10 min)
                if (rawCandidates.length === 0) {
                  try {
                    const hubId = webhookHubId || config.faceitHubId;
                    if (hubId) {
                      const cachedBans = await db.getHubBansCache(hubId).catch(() => []);
                      const now = Date.now();
                      const recentBans = cachedBans.filter(b => b.timestamp && (now - b.timestamp) < 10 * 60 * 1000);
                      for (const ban of recentBans) {
                        const inRoster = combinedRoster.find(p => (p.player_id || p.id) === ban.userId || p.nickname === ban.nickname);
                        if (inRoster) {
                          addCandidate(inRoster);
                        }
                      }
                    }
                  } catch (e) {
                    // ignorar fallo secundario
                  }
                }

                const resolvedList = [];
                for (const cand of rawCandidates) {
                  const display = await resolvePlayerDisplay(cand, combinedRoster, db, guildId);
                  if (display && !resolvedList.includes(display)) {
                    resolvedList.push(display);
                  }
                }

                const matchId = matchData.id || event.payload?.id || 'N/A';
                const faceitRoomUrl = matchData.faceit_url || (matchId !== 'N/A' ? `https://www.faceit.com/es/cs2/room/${matchId}` : null);
                const competitionName = matchData.competition_name || event.payload?.entity?.name || 'Club FACEIT';

                let causeText = 'No aceptó la partida';
                let causeEmoji = '❌';
                if (isCheckinFailed) {
                  causeText = 'No aceptó la partida (Check-in Failed)';
                  causeEmoji = '❌';
                } else if (isAfk) {
                  causeText = 'Jugador AFK / No se conectó a tiempo';
                  causeEmoji = '💤';
                } else if (isCancelledByUser) {
                  causeText = 'Cancelado por usuario / Veto Abortado';
                  causeEmoji = '🚫';
                }

                let responsibleFormatted = 'No especificado';
                if (resolvedList.length > 0) {
                  if (resolvedList.length === 1) {
                    responsibleFormatted = resolvedList[0];
                  } else {
                    responsibleFormatted = resolvedList.map(r => `• ${r}`).join('\n');
                  }
                }

                let thumbnailAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';
                if (rawCandidates.length > 0) {
                  const firstCandId = typeof rawCandidates[0] === 'object'
                    ? rawCandidates[0].player_id || rawCandidates[0].id || rawCandidates[0].user_id
                    : (isUuidString(rawCandidates[0]) ? rawCandidates[0] : null);
                  if (firstCandId) {
                    const playerObj = await fetchFaceitPlayerById(firstCandId).catch(() => null);
                    if (playerObj?.avatar) {
                      thumbnailAvatar = playerObj.avatar;
                    }
                  }
                }

                const queueEmbed = new EmbedBuilder()
                  .setTitle('⚠️ Sanción de Cola Aplicada (Queue Ban)')
                  .setDescription('Se ha registrado una sanción de cola automáticamente por incumplimiento en el matchmaking de FACEIT.')
                  .setColor(0xFF5722) // Naranja Intenso
                  .setThumbnail(thumbnailAvatar)
                  .addFields(
                    { name: `${causeEmoji} Causa de Sanción`, value: `**${causeText}**`, inline: true },
                    { name: '🏆 Club / Cola', value: `**${competitionName}**`, inline: true },
                    { name: '👤 Jugador / Responsable', value: responsibleFormatted, inline: false },
                    {
                      name: '🎮 Sala de Partida',
                      value: faceitRoomUrl
                        ? `[🔗 Ver Detalles de la Sala en FACEIT](${faceitRoomUrl})\n\`ID: ${matchId}\``
                        : `\`ID: ${matchId}\``,
                      inline: false
                    }
                  )
                  .setFooter({
                    text: 'FACEIT Match System • Sanciones Automáticas de Cola',
                    iconURL: 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png'
                  })
                  .setTimestamp();

                await sanctionsChannel.send({ embeds: [queueEmbed] });
                logger.success(`Notificación de Sanción de Cola (Queue Ban) enviada para la partida ${matchData.id}. Responsable(s): ${responsibleFormatted}`);
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

function isUuidString(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

async function resolvePlayerDisplay(item, roster, db, guildId) {
  if (!item) return null;

  let playerId = null;
  let nickname = null;

  if (typeof item === 'object') {
    playerId = item.player_id || item.id || item.user_id || item.guid || item.userId || item.playerId || null;
    nickname = item.nickname || item.name || item.username || item.player_name || item.faceit_name || item.game_player_name || null;
  } else if (typeof item === 'string') {
    const trimmed = item.trim();
    if (isUuidString(trimmed)) {
      playerId = trimmed;
    } else {
      nickname = trimmed;
    }
  }

  // 1. Si tenemos playerId pero no nickname, buscar en el roster
  if (playerId && !nickname && Array.isArray(roster)) {
    const foundInRoster = roster.find(p => (p.player_id || p.id || p.user_id || p.guid) === playerId);
    if (foundInRoster && (foundInRoster.nickname || foundInRoster.name || foundInRoster.game_player_name)) {
      nickname = foundInRoster.nickname || foundInRoster.name || foundInRoster.game_player_name;
    }
  }

  // 2. Si tenemos nickname pero no playerId, buscar en el roster
  if (nickname && !playerId && Array.isArray(roster)) {
    const foundInRoster = roster.find(p =>
      (p.nickname && p.nickname.toLowerCase() === nickname.toLowerCase()) ||
      (p.game_player_name && p.game_player_name.toLowerCase() === nickname.toLowerCase())
    );
    if (foundInRoster) {
      playerId = foundInRoster.player_id || foundInRoster.id || foundInRoster.user_id;
    }
  }

  // 3. Si tenemos playerId pero aún no tenemos nickname, consultar API de FACEIT
  if (playerId && !nickname && isUuidString(playerId)) {
    try {
      const faceitUser = await fetchFaceitPlayerById(playerId);
      if (faceitUser && faceitUser.nickname) {
        nickname = faceitUser.nickname;
      }
    } catch (e) {
      // Ignorar fallo de API
    }
  }

  let discordId = null;
  if (playerId) {
    discordId = await db.getDiscordIdByFaceitId(playerId, guildId).catch(() => null);
  }
  if (!discordId && nickname) {
    discordId = await db.getDiscordIdByNickname(nickname, guildId).catch(() => null);
  }

  if (discordId && nickname) {
    return `<@${discordId}> (\`${nickname}\`)`;
  } else if (discordId) {
    return `<@${discordId}>`;
  } else if (nickname) {
    return `\`${nickname}\``;
  } else if (playerId) {
    return `\`${playerId}\``;
  }

  return null;
}

async function getFactionCaptainName(faction, db, guild, guildId) {
  const leaderId = faction.leader;
  let captainNickname = null;
  let captainDiscordId = null;

  if (leaderId) {
    const leaderPlayer = faction.roster.find(p => (p.player_id || p.id) === leaderId);
    if (leaderPlayer) {
      captainNickname = leaderPlayer.nickname;
    }
    captainDiscordId = await db.getDiscordIdByFaceitId(leaderId, guildId);
  }

  // Si no se encuentra por leaderId, intentar con el primer jugador de la lista
  if (!captainNickname && faction.roster && faction.roster.length > 0) {
    captainNickname = faction.roster[0].nickname;
    const firstPlayerId = faction.roster[0].player_id || faction.roster[0].id;
    if (firstPlayerId) {
      captainDiscordId = await db.getDiscordIdByFaceitId(firstPlayerId, guildId);
    }
  }

  if (captainDiscordId) {
    const member = await guild.members.fetch(captainDiscordId).catch(() => null);
    if (member) {
      return member.displayName;
    }
  }

  return captainNickname || faction.name || 'Desconocido';
}

async function buildTeamList(faction, db, guildId = null) {
  if (!faction || !faction.roster || faction.roster.length === 0) {
    return '*Sin jugadores*';
  }

  const leaderId = faction.leader;

  const mentions = await Promise.all(
    faction.roster.map(async (p, index) => {
      const playerId = p.player_id || p.id;
      const isCaptain = leaderId && playerId === leaderId;
      const captainBadge = isCaptain ? '👑 ' : '';
      
      const discordId = (await db.getDiscordIdByFaceitId(playerId, guildId)) || (await db.getDiscordIdByNickname(p.nickname, guildId));
      const nameStr = discordId ? `<@${discordId}>` : `\`${p.nickname}\``;
      
      const skillLevel = p.skill_level || p.game_skill_level;
      const levelTag = skillLevel ? ` \`[Lvl ${skillLevel}]\`` : '';
      
      return `${index + 1}. ${captainBadge}${nameStr}${levelTag}`;
    })
  );
  return mentions.join('\n');
}

async function assignHubSeasonRoleIfFirstMatch(guild, players, queueConfig, config, db) {
  if (!guild || !players || players.length === 0 || !queueConfig.discordHubRoleId) return;

  const hubRoleId = queueConfig.discordHubRoleId;
  const queueId = queueConfig.queueId || 'default';

  // Obtener temporada actual para esta cola o el Hub
  const currentSeason = await fetchCurrentHubSeason(queueConfig.queueId, config?.faceitLeaderboardId || config?.faceitHubId);
  if (!currentSeason) {
    logger.warn(`[HUB ROLE] No se pudo determinar la season actual para la cola ${queueConfig.queueName || queueId}. Asignación omitida.`);
    return;
  }

  logger.info(`[HUB ROLE] Verificando rol de season ${currentSeason} para cola '${queueConfig.queueName || queueId}' en ${players.length} jugadores...`);

  for (const p of players) {
    try {
      const playerId = p.player_id || p.id;
      const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
      if (!discordId) continue;

      const hasPlayed = await db.hasPlayerPlayedHubSeason(discordId, queueId, currentSeason, guild.id);
      if (hasPlayed) {
        continue;
      }

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) continue;

      const role = guild.roles.cache.get(hubRoleId)
        || (hubRoleId.match(/^\d+$/) ? await guild.roles.fetch(hubRoleId).catch(() => null) : null)
        || guild.roles.cache.find(r => r.name.toLowerCase() === hubRoleId.toLowerCase());
      if (role) {
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          logger.success(`[HUB ROLE] Rol '${role.name}' asignado a ${member.user.tag} por iniciar su primera partida en Season ${currentSeason} [Cola: ${queueConfig.queueName || queueId}]`);
          await db.addLogEntry('success', `Rol de Hub '${role.name}' asignado a ${member.user.tag} (primera partida en Season ${currentSeason}, cola: ${queueConfig.queueName || queueId}).`, 'bot', guild.id);
        }
      } else {
        logger.warn(`[HUB ROLE] Rol con ID o Nombre "${hubRoleId}" no encontrado en el servidor Discord ${guild.name}.`);
      }

      // Registrar en Firestore que ya jugó en esta season
      await db.recordPlayerHubSeason(discordId, queueId, currentSeason, guild.id);
    } catch (err) {
      logger.error(`[HUB ROLE] Error al procesar rol de hub para ${p.nickname || 'jugador'}:`, err.message);
    }
  }
}

async function syncPlayerLevels(guild, players, db, queueConfig = null, config = null) {
  let currentSeason = null;
  try {
    currentSeason = await fetchCurrentHubSeason(queueConfig?.queueId, config?.faceitLeaderboardId || config?.faceitHubId);
  } catch (e) {
    logger.warn('No se pudo obtener la season actual para sincronizar stats:', e.message);
  }

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
        await db.updatePlayerStats(discordId, updatedLevel, elo, guild.id, currentSeason);
      }
    } catch (apiErr) {
      logger.error(`Error al actualizar nivel para ${p.nickname}:`, apiErr.message);
    }
  });

  await Promise.allSettled(syncPromises);
}

async function syncPlayerNicknames(guild, players, db, guildId = null) {
  if (!guild || !players || players.length === 0) return;

  const syncPromises = players.map(async (p) => {
    try {
      const playerId = p.player_id || p.id;
      const faceitNickname = p.nickname;
      if (!faceitNickname) return;

      const discordId = (await db.getDiscordIdByFaceitId(playerId, guildId)) || (await db.getDiscordIdByNickname(faceitNickname, guildId));
      if (!discordId) return;

      await syncMemberNickname(guild, discordId, faceitNickname);
    } catch (err) {
      logger.error(`Error al sincronizar apodo para ${p.nickname}:`, err.message);
    }
  });

  await Promise.allSettled(syncPromises);
}

export async function handleHubUserRemoved(event, client, db, config, guildId) {
  const payload = event.payload || {};
  const hubId = payload.hub_id || payload.hub?.id || event.entity?.id;
  const userId = payload.user_id || payload.user?.user_id || payload.user?.id;

  if (!hubId || !userId) {
    logger.warn('Hub user removed recibido sin hub_id o user_id');
    return;
  }

  const rawRemovedBy = payload.removed_by || payload.admin_id || payload.operator;
  const removedBy = typeof rawRemovedBy === 'object'
    ? rawRemovedBy.user_id || rawRemovedBy.id
    : rawRemovedBy;
  const hasModerationSignal = Boolean(payload.reason || (removedBy && removedBy !== userId));
  const classification = hasModerationSignal ? 'possible_ban' : 'removed_unknown';
  const nickname = payload.nickname || payload.user?.nickname || userId;
  const reason = payload.reason || (hasModerationSignal
    ? 'Acción de moderación (expulsión o posible baneo) en el Club'
    : 'FACEIT no indicó si fue salida voluntaria, expulsión o baneo');

  logger.info(
    `hub_user_removed: hub=${hubId} user=${userId} classification=${classification}` +
    `${removedBy ? ` removed_by=${removedBy}` : ''}`
  );

  // Guardamos toda remoción. Un hub_user_added posterior permitirá detectar el reingreso.
  await db.addHubBanToCache(hubId, userId, {
    nickname,
    reason,
    endsAt: null,
    classification,
    removedBy: removedBy || null,
    sourceEvent: 'hub_user_removed'
  });

  // Notificamos la remoción al canal de sanciones si está configurado.
  const sanctionsChannelId = config.discordSanctionsChannelId;
  if (!sanctionsChannelId || sanctionsChannelId.startsWith('ID_')) {
    logger.info('discordSanctionsChannelId no configurado o inválido. La remoción fue registrada sin enviar notificación.');
    return;
  }

  try {
    const channel = await client.channels.fetch(sanctionsChannelId);
    if (!channel || channel.guild?.id !== guildId) return;

    // Obtener avatar del jugador para un embed súper estético
    const playerDetails = await fetchFaceitPlayerById(userId).catch(() => null);
    const playerAvatar = playerDetails?.avatar || 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';
    const hubAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

    let durationStr = 'No disponible en el webhook';
    let dateStr = '';
    const endsAt = payload.ends_at || payload.ban_end || null;
    if (endsAt) {
      const endsDate = new Date(endsAt);
      const unixSeconds = Math.floor(endsDate.getTime() / 1000);
      durationStr = `Expira <t:${unixSeconds}:R>`;
      
      const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      dateStr = `\n(${endsDate.toLocaleString('es-ES', options).replace(',', '')})`;
    }

    const discordId = await db.getDiscordIdByFaceitId(userId, guildId).catch(() => null);
    const userMentionStr = discordId ? `<@${discordId}> (**[${nickname}](https://www.faceit.com/es/players/${nickname})**)` : `**[${nickname}](https://www.faceit.com/es/players/${nickname})**\n\`ID: ${userId}\``;

    const embed = new EmbedBuilder()
      .setTitle(hasModerationSignal ? '🚫 Sanción Aplicada (Baneo / Expulsión del Club)' : '↪️ Usuario Removido del Club')
      .setDescription(hasModerationSignal
        ? 'Se ha registrado una acción de moderación o baneo en el Club / Hub de FACEIT.'
        : 'FACEIT notificó una remoción o salida de usuario del Club / Hub.')
      .setColor(hasModerationSignal ? 0xFF0033 : 0xFFAA00)
      .setThumbnail(playerAvatar)
      .addFields(
        { name: '👤 Jugador Sancionado', value: userMentionStr, inline: true },
        { name: '👮 Moderación', value: removedBy ? (isUuidString(removedBy) ? `\`ID: ${removedBy}\`` : `**${removedBy}**`) : 'FACEIT System', inline: true },
        { name: '❗ Razón / Motivo', value: reason, inline: false },
        { name: '🕒 Duración / Expiración', value: `${durationStr}${dateStr}`, inline: false }
      )
      .setFooter({ 
        text: 'FACEIT Hub System • Registro de Sanciones', 
        iconURL: 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png' 
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    logger.success(`Notificación de remoción del Club enviada para el jugador ${nickname}.`);
    await db.addLogEntry('warn', `Remoción registrada para ${nickname}: ${reason}`, 'bot');
  } catch (err) {
    logger.error('Error al enviar notificación de remoción del Club:', err);
  }
}


export async function handleHubUserAdded(event, client, db, config, guildId) {
  const payload = event.payload || {};
  const hubId = payload.hub_id || payload.hub?.id || event.entity?.id;
  const userId = payload.user_id || payload.user?.user_id || payload.user?.id;

  if (!hubId || !userId) {
    logger.warn('Hub user added recibido sin hub_id o user_id');
    return;
  }

  const cachedRemovals = await db.getHubBansCache(hubId);
  const previousRemoval = cachedRemovals.find(item => item.userId === userId);
  const nickname = payload.nickname || payload.user?.nickname || previousRemoval?.nickname || userId;

  logger.info(
    `hub_user_added: hub=${hubId} user=${userId} previous_removal=${Boolean(previousRemoval)}`
  );

  if (!previousRemoval) {
    logger.info(`Usuario ${nickname} añadido al Club sin una remoción previa registrada.`);
    return;
  }

  const sanctionsChannelId = config.discordSanctionsChannelId;
  if (sanctionsChannelId && !sanctionsChannelId.startsWith('ID_')) {
    try {
      const channel = await client.channels.fetch(sanctionsChannelId);
      if (channel?.guild?.id === guildId) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Usuario reincorporado al Club')
          .setDescription('FACEIT notificó que el usuario volvió a ser añadido. Esto es compatible con un desbaneo, pero el webhook no confirma la acción administrativa exacta.')
          .setColor(0x00FF00)
          .addFields(
            { name: '👤 Jugador', value: `**[${nickname}](https://www.faceit.com/en/players/${nickname})**\nID: ${userId}`, inline: false },
            { name: '📋 Estado anterior', value: previousRemoval.reason || 'Remoción sin motivo informado', inline: false }
          )
          .setFooter({ text: 'FACEIT Club Webhook' })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error('Error al enviar notificación de reincorporación al Club:', err);
    }
  }

  await db.removeHubBanFromCache(hubId, userId);
  await db.addLogEntry('info', `Reincorporación registrada para ${nickname}; posible desbaneo.`, 'bot');
}
