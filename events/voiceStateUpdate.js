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

  // Comprobar feature flag (desde memoria)
  const autoMove = await isFeatureEnabled('autoMovePlayers', member.guild?.id);
  if (!autoMove) return;

  // 1. Obtener canales de espera (Waiting Rooms) de la configuración en memoria
  const guildConfig = await getEffectiveConfigForGuild(member.guild.id).catch(() => ({}));
  const waitingRoomIds = getAllWaitingRoomIds(guildConfig);

  const isConnecting = oldChannelId === null;
  const isEnteringWaitingRoom = waitingRoomIds.includes(newChannelId);

  // Si el usuario no se está conectando de cero ni entra a una sala de espera, descartar de inmediato
  if (!isConnecting && !isEnteringWaitingRoom) return;

  try {
    // 2. Comprobar si hay partidas activas en el bot (usando caché de partidas)
    // Si no hay ninguna partida activa, es imposible que el usuario deba ser movido
    const hasMatches = await db.hasActiveMatches(member.guild.id);
    if (!hasMatches) return;

    // 3. Buscar si el miembro pertenece a una partida activa (primero por Discord ID en roster, luego Faceit ID con caché negativo)
    const activeMatch = await db.getActiveMatchForMember(member.id, member.guild.id);
    if (!activeMatch) return;

    // 4. Obtener canal destino del equipo
    let targetVcId = null;
    const userData = await db.getFaceitIdByDiscordId(member.id, member.guild.id);
    const faceitPlayerId = userData?.faceit_player_id;

    const isFaction1 = (activeMatch.faction1_roster || []).some(p => 
      (p.discord_id && p.discord_id === member.id) || 
      (faceitPlayerId && (p.id === faceitPlayerId || p.player_id === faceitPlayerId))
    );
    const isFaction2 = (activeMatch.faction2_roster || []).some(p => 
      (p.discord_id && p.discord_id === member.id) || 
      (faceitPlayerId && (p.id === faceitPlayerId || p.player_id === faceitPlayerId))
    );

    if (isFaction1) {
      targetVcId = activeMatch.faction1_vc_id;
    } else if (isFaction2) {
      targetVcId = activeMatch.faction2_vc_id;
    }

    if (!targetVcId) return;

    // Si el jugador viene de su canal de partida activa (se está saliendo o fue movido por cleanup), no auto-mover de vuelta
    if (oldChannelId === targetVcId) return;

    // Si ya está en su canal destino, no hacer nada
    if (newChannelId === targetVcId) return;

    const targetChannel = await member.guild.channels.fetch(targetVcId).catch(() => null);
    if (targetChannel) {
      await member.voice.setChannel(targetChannel, 'Auto-mover a canal de partida activa Faceit');
      logger.info(`Auto-movido ${member.user.tag} al canal de partida activa: ${targetChannel.name}`);
      await db.addLogEntry('info', `Auto-movido ${member.user.tag} al canal de partida activa ${targetChannel.name} en reconexión.`, 'bot');
    }
  } catch (err) {
    logger.error(`Error en onVoiceStateUpdate para ${member.user.tag}:`, err.message);
  }
}
