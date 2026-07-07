import { logger } from '../utils/logger.js';
import { db } from '../database.js';

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

    const botId = guild.members.me?.id || guild.client.user.id;
    const permissionOverwrites1 = [
      { id: guild.id, deny: ['Connect'] },
      { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];
    const permissionOverwrites2 = [
      { id: guild.id, deny: ['Connect'] },
      { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];

    if (db) {
      // Agregar permisos de Connect y Speak para los jugadores de Faction 1
      for (const p of faction1.roster || []) {
        const playerId = p.player_id || p.id;
        const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
        if (discordId) {
          permissionOverwrites1.push({
            id: discordId,
            allow: ['Connect', 'Speak']
          });
        }
      }
      // Agregar permisos de Connect y Speak para los jugadores de Faction 2
      for (const p of faction2.roster || []) {
        const playerId = p.player_id || p.id;
        const discordId = (await db.getDiscordIdByFaceitId(playerId, guild.id)) || (await db.getDiscordIdByNickname(p.nickname, guild.id));
        if (discordId) {
          permissionOverwrites2.push({
            id: discordId,
            allow: ['Connect', 'Speak']
          });
        }
      }
    }

    const vc1 = await guild.channels.create({
      name: `🔊 ${faction1.name || 'Equipo A'}`,
      type: 2,
      parent: parentId,
      permissionOverwrites: permissionOverwrites1,
      reason: `Partida iniciada - Faceit`,
    });
    vcIds.vc1Id = vc1.id;

    const vc2 = await guild.channels.create({
      name: `🔊 ${faction2.name || 'Equipo B'}`,
      type: 2,
      parent: parentId,
      permissionOverwrites: permissionOverwrites2,
      reason: `Partida iniciada - Faceit`,
    });
    vcIds.vc2Id = vc2.id;

    logger.success(`Canales de voz creados: ${vc1.name} y ${vc2.name}`);
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
 * Devuelve jugadores a su canal original o sala de espera y elimina el canal de voz temporal.
 */
export async function cleanupVoiceChannel(guild, vcId, waitingRoomId, originalVoiceStates = {}, reason = 'Partida terminada') {
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

    const waitingRoom = waitingRoomId ? await guild.channels.fetch(waitingRoomId).catch(() => null) : null;

    for (const [_, member] of vc.members) {
      try {
        let targetChannel = waitingRoom;
        const originalChannelId = originalVoiceStates?.[member.id];

        if (originalChannelId) {
          const origChannel = await guild.channels.fetch(originalChannelId).catch(() => null);
          if (origChannel) {
            targetChannel = origChannel;
          }
        }

        if (targetChannel) {
          await member.voice.setChannel(targetChannel, `${reason} - Regreso a canal original`);
          logger.info(`Movido de vuelta ${member.user.tag} a ${targetChannel.name}`);
        } else {
          logger.info(`No hay canal de destino para mover de vuelta a ${member.user.tag}.`);
        }
      } catch (err) {
        logger.warn(`No se pudo mover a ${member.user.tag} al finalizar partida:`, err.message);
        await db.addLogEntry('warn', `No se pudo mover a ${member.user.tag} de vuelta a sala de espera/canal original: ${err.message}`, 'bot').catch(() => {});
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
 * Limpia todos los canales de voz temporales que contengan el prefijo 🔊 al iniciar el bot.
 */
export async function cleanupOrphanVoiceChannels(guild, waitingRoomId) {
  try {
    const channels = await guild.channels.fetch();
    const orphanVCs = channels.filter(c => c.type === 2 && c.name.startsWith('🔊'));

    for (const [_, vc] of orphanVCs) {
      await cleanupVoiceChannel(guild, vc.id, waitingRoomId, 'Cleanup al iniciar el bot');
    }

    if (orphanVCs.size > 0) {
      logger.success(`Cleanup de ${orphanVCs.size} canales de voz huérfanos completado.`);
    }
  } catch (err) {
    logger.error('Error en cleanup de VCs huérfanos:', err.message);
  }
}
