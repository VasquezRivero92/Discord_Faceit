/**
 * Feature Flags + Settings del bot.
 * Lee desde Firestore y cachea en memoria con TTL.
 */
import { db } from '../database.js';
import { logger } from './logger.js';

let cachedSettings = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

export async function getSettings(forceRefresh = false) {
  if (!forceRefresh && cachedSettings && Date.now() - lastFetch < CACHE_TTL_MS) {
    return cachedSettings;
  }
  try {
    cachedSettings = await db.getSettings();
    lastFetch = Date.now();
    return cachedSettings;
  } catch (err) {
    logger.error('Error cargando settings:', err.message);
    return cachedSettings || getDefaultSettings();
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
  if (featureKey.startsWith('command_') && settings[featureKey] === undefined) {
    return true;
  }
  return settings[featureKey] === true;
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
    autoVoiceChannels: true,
    autoMovePlayers: true,
    matchAnnouncements: true,
    serverStatusAnnouncements: true,
    liveMatchPanel: true,
    webhookValidation: false,
    adminCallNotifications: true,
    adminRoleName: 'ADMIN',
    matchTimeoutMinutes: 120,
    command_mixton_listo: true,
    command_mixton_no_listo: true,
  };
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}
