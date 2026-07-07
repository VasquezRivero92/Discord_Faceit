import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { env } from '../config/index.js';

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
  const autoMove = await isFeatureEnabled('autoMovePlayers');
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

    // 4. Obtener canal de espera (Waiting Room) actual
    const settings = await db.getSettings().catch(() => ({}));
    const waitingRoomId = settings.discordWaitingRoomChannelId || env.DISCORD_WAITING_ROOM_CHANNEL_ID;

    // Mover si se conecta de cero (oldChannelId === null) O entra a la sala de espera
    const isConnecting = oldChannelId === null;
    const isEnteringWaitingRoom = waitingRoomId && newChannelId === waitingRoomId;

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
