import { logger } from '../utils/logger.js';
import { db } from '../database.js';
import { getEffectiveConfigForGuild } from '../config/index.js';

/**
 * Crea canales de voz temporales para una partida y mueve jugadores.
 */
export async function createMatchVoiceChannels(guild, waitingRoomId, faction1, faction2, db = null) {
  const vcIds = { vc1Id: null, vc2Id: null };

  if (!waitingRoomId) return vcIds;

  try {
    const waitingRoom = await guild.channels.fetch(waitingRoomId);
    if (!waitingRoom || waitingRoom.type !== 2) return vcIds;

    const parentId = waitingRoom.parentId;

    const botId = guild.members?.me?.id || guild.client?.user?.id || 'bot-id';
    const permissionOverwrites1 = [
      { id: guild.id, type: 0, deny: ['Connect'] },
      { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];
    const permissionOverwrites2 = [
      { id: guild.id, type: 0, deny: ['Connect'] },
      { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];

    const config = await getEffectiveConfigForGuild(guild.id).catch(() => ({}));
    if (config?.discordMatchAccessRoleId && typeof config.discordMatchAccessRoleId === 'string' && config.discordMatchAccessRoleId.trim()) {
      const roleId = config.discordMatchAccessRoleId.trim();
      permissionOverwrites1.push({
        id: roleId,
        type: 0,
        allow: ['ViewChannel', 'Connect', 'Speak']
      });
      permissionOverwrites2.push({
        id: roleId,
        type: 0,
        allow: ['ViewChannel', 'Connect', 'Speak']
      });
    }

    if (db) {
      // Agregar permisos de Connect y Speak para los jugadores de Faction 1
      for (const p of faction1.roster || []) {
        const playerId = p.player_id || p.id;
        const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
        if (discordId && typeof discordId === 'string' && discordId.trim()) {
          permissionOverwrites1.push({
            id: discordId.trim(),
            type: 1,
            allow: ['Connect', 'Speak']
          });
        }
      }
      // Agregar permisos de Connect y Speak para los jugadores de Faction 2
      for (const p of faction2.roster || []) {
        const playerId = p.player_id || p.id;
        const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
        if (discordId && typeof discordId === 'string' && discordId.trim()) {
          permissionOverwrites2.push({
            id: discordId.trim(),
            type: 1,
            allow: ['Connect', 'Speak']
          });
        }
      }
    }

    let cap1Name = faction1.name || 'Equipo A';
    let cap2Name = faction2.name || 'Equipo B';

    if (db) {
      const getCapName = async (faction) => {
        const leaderId = faction.leader;
        let captainNickname = null;
        let captainDiscordId = null;

        if (leaderId) {
          const leaderPlayer = (faction.roster || []).find(p => (p.player_id || p.id) === leaderId);
          if (leaderPlayer) {
            captainNickname = leaderPlayer.nickname;
          }
          captainDiscordId = await db.getDiscordIdByFaceitId(leaderId, guild.id);
        }

        if (!captainNickname && faction.roster && faction.roster.length > 0) {
          captainNickname = faction.roster[0].nickname;
          const firstPlayerId = faction.roster[0].player_id || faction.roster[0].id;
          if (firstPlayerId) {
            captainDiscordId = await db.getDiscordIdByFaceitId(firstPlayerId, guild.id);
          }
        }

        if (captainDiscordId) {
          const member = await guild.members.fetch(captainDiscordId).catch(() => null);
          if (member) {
            return member.displayName;
          }
        }

        return captainNickname || faction.name || 'Desconocido';
      };

      const nameA = await getCapName(faction1);
      const nameB = await getCapName(faction2);
      cap1Name = `Team ${nameA}`;
      cap2Name = `Team ${nameB}`;
    }

    let vc1 = null;
    try {
      vc1 = await guild.channels.create({
        name: `🔊 ${cap1Name}`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites1,
        reason: `Partida iniciada - Faceit`,
      });
    } catch (vc1Err) {
      logger.warn(`Error creando VC1 con permisos específicos (${vc1Err.message}). Reintentando con permisos estándar...`);
      vc1 = await guild.channels.create({
        name: `🔊 ${cap1Name}`,
        type: 2,
        parent: parentId,
        reason: `Partida iniciada - Faceit`,
      });
    }
    vcIds.vc1Id = vc1?.id || null;

    let vc2 = null;
    try {
      vc2 = await guild.channels.create({
        name: `🔊 ${cap2Name}`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites2,
        reason: `Partida iniciada - Faceit`,
      });
    } catch (vc2Err) {
      logger.warn(`Error creando VC2 con permisos específicos (${vc2Err.message}). Reintentando con permisos estándar...`);
      vc2 = await guild.channels.create({
        name: `🔊 ${cap2Name}`,
        type: 2,
        parent: parentId,
        reason: `Partida iniciada - Faceit`,
      });
    }
    vcIds.vc2Id = vc2?.id || null;

    logger.success(`Canales de voz creados: ${vc1?.name || 'VC1'} y ${vc2?.name || 'VC2'}`);
  } catch (err) {
    logger.error('Error al crear canales de voz temporales:', err.message);
  }

  return vcIds;
}

/**
 * Mueve jugadores a sus canales de voz. Si no están en voz, no hace nada.
 * Retorna un objeto con los IDs de canal de voz previos de los jugadores movidos.
 */
export async function movePlayersToVoice(guild, players, voiceChannelId, db, reason = 'Mover al canal de voz de su equipo Faceit') {
  const originalStates = {};
  for (const p of players) {
    const playerId = p.player_id || p.id;
    const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
    if (!discordId) continue;

    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (member && member.voice.channel) {
        originalStates[discordId] = member.voice.channel.id;
        await member.voice.setChannel(voiceChannelId, reason);
        logger.info(`Movido ${member.user.tag} al canal de voz temporal`);
      }
    } catch (err) {
      logger.warn(`No se pudo mover a ${p.nickname} al canal de voz:`, err.message);
    }
  }
  return originalStates;
}

/**
 * Devuelve jugadores a su canal original o a la sala de espera / canal General y elimina el canal de voz temporal.
 * @param {Guild} guild - Servidor de Discord.
 * @param {string} vcId - ID del canal de voz temporal a eliminar.
 * @param {string} waitingRoomId - ID de la sala de espera / general.
 * @param {Object|string} originalVoiceStates - Mapa de canales previos por usuario.
 * @param {string} reason - Razón del cleanup.
 * @param {boolean} forceGeneral - Si es true (por ej. en cancelación de partida), mueve a TODOS al canal General / Sala de Espera sin importar su canal original.
 */
export async function cleanupVoiceChannel(guild, vcId, waitingRoomId, originalVoiceStates = {}, reason = 'Partida terminada', forceGeneral = false) {
  if (!vcId) return;

  // Manejo de compatibilidad si el cuarto parámetro es un string de razón (llamadas antiguas)
  if (typeof originalVoiceStates === 'string') {
    reason = originalVoiceStates;
    originalVoiceStates = {};
  }

  try {
    const vc = await guild.channels.fetch(vcId).catch(() => null);
    if (!vc) {
      logger.warn(`Canal de voz temporal ID ${vcId} no encontrado al intentar limpiar.`);
      return;
    }

    let waitingRoom = waitingRoomId ? await guild.channels.fetch(waitingRoomId).catch(() => null) : null;

    // Fallback: Si no se configuró o no se encontró el canal de espera, buscar canal de voz "General", "Sala de Espera", "Lobby" o cualquier canal de voz en la guild
    if (!waitingRoom || waitingRoom.type !== 2) {
      const channels = await guild.channels.fetch().catch(() => null);
      if (channels) {
        waitingRoom = channels.find(c => c.type === 2 && (
          c.name.toLowerCase().includes('general') ||
          c.name.toLowerCase().includes('espera') ||
          c.name.toLowerCase().includes('lobby')
        )) || channels.find(c => c.type === 2) || null;
      }
    }

    for (const [_, member] of vc.members) {
      try {
        let targetChannel = waitingRoom;
        const originalChannelId = originalVoiceStates?.[member.id];

        if (originalChannelId && !forceGeneral) {
          const origChannel = await guild.channels.fetch(originalChannelId).catch(() => null);
          if (origChannel) {
            targetChannel = origChannel;
          }
        }

        if (targetChannel) {
          await member.voice.setChannel(targetChannel, `${reason} - Regreso a ${forceGeneral ? 'canal General' : 'canal original'}`);
          logger.info(`Movido ${member.user.tag} a ${targetChannel.name} (${reason})`);
        } else {
          logger.info(`No hay canal de destino (General/Espera) para mover a ${member.user.tag}.`);
        }
      } catch (err) {
        logger.warn(`No se pudo mover a ${member.user.tag} al limpiar canal de voz:`, err.message);
        await db.addLogEntry('warn', `No se pudo mover a ${member.user.tag} al canal general/espera: ${err.message}`, 'bot').catch(() => {});
      }
    }

    try {
      await vc.delete(reason);
      logger.success(`Canal de voz temporal ${vc.name} eliminado.`);
      await db.addLogEntry('success', `Canal de voz temporal ${vc.name} eliminado.`, 'bot').catch(() => {});
    } catch (deleteErr) {
      logger.error(`No se pudo eliminar el canal de voz temporal ${vc.name || vcId}:`, deleteErr.message);
      await db.addLogEntry('error', `No se pudo eliminar el canal de voz temporal ${vc.name || vcId}: ${deleteErr.message}`, 'bot').catch(() => {});
    }
  } catch (err) {
    logger.warn(`No se pudo limpiar el canal de voz:`, err.message);
    await db.addLogEntry('error', `Error inesperado al limpiar el canal de voz ${vcId}: ${err.message}`, 'bot').catch(() => {});
  }
}

/**
 * Limpia todos los canales de voz temporales que contengan el prefijo 🔊 al iniciar el bot o en mantenimientos,
 * excluyendo explícitamente los canales de partidas que continúan activas.
 */
export async function cleanupOrphanVoiceChannels(guild, waitingRoomId, db = null) {
  try {
    const channels = await guild.channels.fetch();
    const activeVcIds = new Set();

    if (db) {
      const activeMatches = await db.getActiveMatches().catch(() => []);
      for (const m of activeMatches) {
        if (m.faction1_vc_id) activeVcIds.add(m.faction1_vc_id);
        if (m.faction2_vc_id) activeVcIds.add(m.faction2_vc_id);
      }
    }

    const orphanVCs = channels.filter(c => c.type === 2 && c.name.startsWith('🔊') && !activeVcIds.has(c.id));

    for (const [_, vc] of orphanVCs) {
      await cleanupVoiceChannel(guild, vc.id, waitingRoomId, {}, 'Cleanup de canal huérfano', true);
    }

    if (orphanVCs.size > 0) {
      logger.success(`Cleanup de ${orphanVCs.size} canales de voz huérfanos completado.`);
    }
  } catch (err) {
    logger.error('Error en cleanup de VCs huérfanos:', err.message);
  }
}
