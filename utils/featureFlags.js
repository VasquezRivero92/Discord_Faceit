/**
 * Feature Flags + Settings del bot.
 * Lee desde Firestore y cachea en memoria con TTL.
 */
import { db } from '../database.js';
import { logger } from './logger.js';

export async function getSettings(forceRefresh = false) {
  try {
    return await db.getSettings(forceRefresh);
  } catch (err) {
    logger.error('Error cargando settings:', err.message);
    return getDefaultSettings();
  }
}

export async function isFeatureEnabled(featureKey, guildId = null) {
  // 1. Si se proporcionó un guildId, buscar primero en guild_settings
  if (guildId) {
    try {
      const guildSettings = await db.getGuildSettings(guildId);
      if (guildSettings && guildSettings[featureKey] !== undefined) {
        return guildSettings[featureKey] === true;
      }
    } catch (err) {
      logger.error(`Error cargando guild settings para ${guildId}:`, err.message);
    }
  }

  // 2. Fallback a settings globales
  const settings = await getSettings();
  if (settings && settings[featureKey] !== undefined) {
    return settings[featureKey] === true;
  }

  // 3. Fallback a valores por defecto del sistema
  const defaults = getDefaultSettings();
  if (defaults[featureKey] !== undefined) {
    return defaults[featureKey] === true;
  }

  if (featureKey.startsWith('command_')) {
    return true;
  }
  return false;
}

export async function requireFeature(featureKey, res, next) {
  if (await isFeatureEnabled(featureKey)) {
    return next();
  }
  return res.status(403).json({ error: `La función ${featureKey} está desactivada.` });
}

export function getDefaultSettings() {
  return {
    autoWelcomeDm: true,
    autoRoleSync: true,
    autoNickSync: true,
    autoVoiceChannels: true,
    autoMovePlayers: true,
    matchAnnouncements: true,
    serverStatusAnnouncements: true,
    liveMatchPanel: true,
    webhookValidation: false,
    adminCallNotifications: true,
    hubBansNotifications: true,
    musicBot: true,
    rechargeWalletSystem: true,
    mixtonReadyPanel: true,
    adminRoleId: '',
    matchTimeoutMinutes: 120,
    command_verificar: true,
    command_desvincular: true,
    command_leaderboard: true,
    command_stats: true,
    command_info: true,
    command_sincronizar: true,
    command_partidas: true,
    command_crear_sala: true,
    command_mixton_listo: true,
    command_mixton_no_listo: true,
    command_cs2_play: true,
    command_sancionar: true,
    command_desancionar: true,
    command_say: true,
    command_recargar: true,
    command_setup_recargas: true,
    command_setup_soporte: true,
    command_llamar_admin: true,
  };
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}
