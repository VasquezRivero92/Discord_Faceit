import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { env, getEffectiveConfigForGuild, getAllWaitingRoomIds } from '../config/index.js';

/**
 * Maneja el evento voiceStateUpdate para auto-mover jugadores a sus canales de partida activos
 * si se acaban de conectar a voz o si entran a la Sala de Espera.
 */
export async function onVoiceStateUpdate(oldState, newState, db) {
  const member = newState.member;
  if (!member || member.user.bot) return;

  const newChannelId = newState.channelId;
  const oldChannelId = oldState.channelId;

  // Si no se cambió de canal (sordera, mutar, etc.), ignorar
  if (oldChannelId === newChannelId) return;

  // Si se desconectó de la llamada por completo, ignorar
  if (!newChannelId) return;

  // Comprobar feature flag
  const autoMove = await isFeatureEnabled('autoMovePlayers', member.guild?.id);
  if (!autoMove) return;

  try {
    // 1. Obtener datos de Faceit vinculados
    const userData = await db.getFaceitIdByDiscordId(member.id, member.guild.id);
    if (!userData || !userData.faceit_player_id) return;

    // 2. Comprobar si tiene una partida activa
    const activeMatch = await db.getActiveMatchByPlayerId(userData.faceit_player_id);
    if (!activeMatch) return;

    // 3. Obtener canal destino del equipo
    let targetVcId = null;
    const isFaction1 = (activeMatch.faction1_roster || []).some(p => p.id === userData.faceit_player_id);
    const isFaction2 = (activeMatch.faction2_roster || []).some(p => p.id === userData.faceit_player_id);

    if (isFaction1) {
      targetVcId = activeMatch.faction1_vc_id;
    } else if (isFaction2) {
      targetVcId = activeMatch.faction2_vc_id;
    }

    if (!targetVcId) return;

    // Si el jugador viene de su canal de partida activa (se está saliendo o fue movido por cleanup), no auto-mover de vuelta
    if (oldChannelId === targetVcId) return;

    // 4. Obtener canales de espera (Waiting Rooms) de todas las colas configuradas
    const guildConfig = await getEffectiveConfigForGuild(member.guild.id).catch(() => ({}));
    const waitingRoomIds = getAllWaitingRoomIds(guildConfig);
    if (activeMatch.waiting_room_id && !waitingRoomIds.includes(activeMatch.waiting_room_id)) {
      waitingRoomIds.push(activeMatch.waiting_room_id);
    }

    // Mover si se conecta de cero (oldChannelId === null) O entra a cualquiera de las salas de espera
    const isConnecting = oldChannelId === null;
    const isEnteringWaitingRoom = waitingRoomIds.includes(newChannelId);

    if ((isConnecting || isEnteringWaitingRoom) && newChannelId !== targetVcId) {
      const targetChannel = await member.guild.channels.fetch(targetVcId).catch(() => null);
      if (targetChannel) {
        await member.voice.setChannel(targetChannel, 'Auto-mover a canal de partida activa Faceit');
        logger.info(`Auto-movido ${member.user.tag} al canal de partida activa: ${targetChannel.name}`);
        await db.addLogEntry('info', `Auto-movido ${member.user.tag} al canal de partida activa ${targetChannel.name} en reconexión.`, 'bot');
      }
    }
  } catch (err) {
    logger.error(`Error en onVoiceStateUpdate para ${member.user.tag}:`, err.message);
  }
}
