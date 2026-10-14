import dotenv from 'dotenv';
import { getSettings } from '../utils/featureFlags.js';
import { db } from '../database.js';

dotenv.config();

export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'mixton-default-dev-jwt-secret-key-321',
  DISCORD_LINK_CHANNEL_ID: process.env.DISCORD_LINK_CHANNEL_ID,
  DISCORD_MATCHES_CHANNEL_ID: process.env.DISCORD_MATCHES_CHANNEL_ID,
  DISCORD_ROLES_CHANNEL_ID: process.env.DISCORD_ROLES_CHANNEL_ID,
  DISCORD_STATUS_CHANNEL_ID: process.env.DISCORD_STATUS_CHANNEL_ID,
  DISCORD_ADMIN_ALERTS_CHANNEL_ID: process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID,
  DISCORD_WAITING_ROOM_CHANNEL_ID: process.env.DISCORD_WAITING_ROOM_CHANNEL_ID,
  DISCORD_SANCTIONS_CHANNEL_ID: process.env.DISCORD_SANCTIONS_CHANNEL_ID,
  FACEIT_API_KEY: process.env.FACEIT_API_KEY,
  FACEIT_CLUB_ID: process.env.FACEIT_CLUB_ID,
  FACEIT_HUB_ID: process.env.FACEIT_HUB_ID,
  FACEIT_LEADERBOARD_ID: process.env.FACEIT_LEADERBOARD_ID,
  FACEIT_WEBHOOK_SECRET: process.env.FACEIT_WEBHOOK_SECRET,
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID || process.env.ADMIN_ROLE_NAME || '',
  DISCORD_SUPPORT_CHANNEL_ID: process.env.DISCORD_SUPPORT_CHANNEL_ID,
  DISCORD_MUSIC_CHANNEL_ID: process.env.DISCORD_MUSIC_CHANNEL_ID,
  DISCORD_MATCH_ACCESS_ROLE_ID: process.env.DISCORD_MATCH_ACCESS_ROLE_ID,
  CULQI_SECRET_KEY: process.env.CULQI_SECRET_KEY || '',
  CULQI_PUBLIC_KEY: process.env.CULQI_PUBLIC_KEY || '',
};


export function validateConfig() {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET es obligatorio en produccion para proteger el panel web.');
  }

  if (env.ADMIN_JWT_SECRET.length < 32) {
    console.warn('ADVERTENCIA: ADMIN_JWT_SECRET deberia tener al menos 32 caracteres.');
  }

  try {
    new URL(env.BASE_URL);
  } catch {
    throw new Error(`BASE_URL no es una URL valida: ${env.BASE_URL}`);
  }

  if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) {
    console.warn('ADVERTENCIA: DISCORD_TOKEN o DISCORD_CLIENT_ID no estan configurados. El bot de Discord se iniciara en modo offline/desactivado.');
    return false;
  }

  return true;
}

export function getQueuesFromEnv() {
  const queues = [];

  // 1. Soporte explícito para variables QUEUE1 / QUEUE2 / etc.
  for (let i = 1; i <= 10; i++) {
    const queueId = process.env[`FACEIT_QUEUE${i}_ID`] || process.env[`FACEIT_QUEUE_${i}_ID`];
    const name = process.env[`DISCORD_QUEUE${i}_NAME`] || process.env[`FACEIT_QUEUE${i}_NAME`] || `Cola ${i}`;
    const matchesChannel = process.env[`DISCORD_QUEUE${i}_MATCHES_CHANNEL_ID`] || process.env[`DISCORD_QUEUE_${i}_MATCHES_CHANNEL_ID`];
    const waitingRoom = process.env[`DISCORD_QUEUE${i}_WAITING_ROOM_CHANNEL_ID`] || process.env[`DISCORD_QUEUE_${i}_WAITING_ROOM_CHANNEL_ID`];
    const mixtonChannel = process.env[`DISCORD_QUEUE${i}_MIXTON_CHANNEL_ID`] || process.env[`DISCORD_QUEUE_${i}_MIXTON_CHANNEL_ID`];
    const accessRole = process.env[`DISCORD_QUEUE${i}_MATCH_ACCESS_ROLE_ID`] || process.env[`DISCORD_QUEUE_${i}_MATCH_ACCESS_ROLE_ID`];
    const hubRole = process.env[`FACEIT_QUEUE${i}_HUB_ROLE_ID`] || process.env[`FACEIT_QUEUE_${i}_HUB_ROLE_ID`] || process.env[`QUEUE${i}_HUB_ROLE_ID`] || process.env[`QUEUE_${i}_HUB_ROLE_ID`];
    const discordHubRole = process.env[`DISCORD_QUEUE${i}_HUB_ROLE_ID`] || process.env[`DISCORD_QUEUE_${i}_HUB_ROLE_ID`];

    if (queueId || matchesChannel || waitingRoom) {
      queues.push({
        id: queueId || `queue_${i}`,
        queueId: queueId || `queue_${i}`,
        name,
        discordMatchesChannelId: matchesChannel || '',
        discordWaitingRoomChannelId: waitingRoom || '',
        discordMixtonChannelId: mixtonChannel || '',
        discordMatchAccessRoleId: accessRole || '',
        hubRoleId: hubRole || '',
        discordHubRoleId: discordHubRole || '',
      });
    }
  }

  // 2. Soporte por listas separadas por coma en variables base si no se definieron colas numeradas
  if (queues.length === 0) {
    const matchChannels = (process.env.DISCORD_MATCHES_CHANNEL_ID || '').split(',').map(s => s.trim()).filter(Boolean);
    const waitingRooms = (process.env.DISCORD_WAITING_ROOM_CHANNEL_ID || '').split(',').map(s => s.trim()).filter(Boolean);
    const mixtonChannels = (process.env.DISCORD_MIXTON_CHANNEL_ID || '').split(',').map(s => s.trim()).filter(Boolean);
    const queueIds = (process.env.FACEIT_QUEUE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

    const maxLen = Math.max(matchChannels.length, waitingRooms.length, queueIds.length);
    if (maxLen > 1) {
      for (let i = 0; i < maxLen; i++) {
        queues.push({
          id: queueIds[i] || `queue_${i + 1}`,
          queueId: queueIds[i] || `queue_${i + 1}`,
          name: `Cola ${i + 1}`,
          discordMatchesChannelId: matchChannels[i] || matchChannels[0] || '',
          discordWaitingRoomChannelId: waitingRooms[i] || waitingRooms[0] || '',
          discordMixtonChannelId: mixtonChannels[i] || mixtonChannels[0] || '',
          discordMatchAccessRoleId: process.env.DISCORD_MATCH_ACCESS_ROLE_ID || '',
          discordHubRoleId: process.env.DISCORD_HUB_ROLE_ID || '',
        });
      }
    }
  }

  return queues;
}

/**
 * Devuelve la configuración efectiva mezclando env + settings de Firestore.
 * Los settings de Firestore tienen prioridad sobre env.
 */
export async function getEffectiveConfig() {
  const settings = await getSettings().catch(() => ({}));
  const envQueues = getQueuesFromEnv();
  const rawQueues = Array.isArray(settings.queues) && settings.queues.length > 0 ? settings.queues : envQueues;

  return {
    ...settings,
    discordGuildId: settings.discordGuildId || process.env.DISCORD_GUILD_ID || env.DISCORD_GUILD_ID,
    discordLinkChannelId: settings.discordLinkChannelId || process.env.DISCORD_LINK_CHANNEL_ID || env.DISCORD_LINK_CHANNEL_ID,
    discordMatchesChannelId: settings.discordMatchesChannelId || process.env.DISCORD_MATCHES_CHANNEL_ID || env.DISCORD_MATCHES_CHANNEL_ID,
    discordMixtonChannelId: settings.discordMixtonChannelId || process.env.DISCORD_MIXTON_CHANNEL_ID || env.DISCORD_MIXTON_CHANNEL_ID || '',
    discordRolesChannelId: settings.discordRolesChannelId || process.env.DISCORD_ROLES_CHANNEL_ID || env.DISCORD_ROLES_CHANNEL_ID,
    discordStatusChannelId: settings.discordStatusChannelId || process.env.DISCORD_STATUS_CHANNEL_ID || env.DISCORD_STATUS_CHANNEL_ID,
    discordAdminAlertsChannelId: settings.discordAdminAlertsChannelId || process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || env.DISCORD_ADMIN_ALERTS_CHANNEL_ID,
    discordWaitingRoomChannelId: settings.discordWaitingRoomChannelId || process.env.DISCORD_WAITING_ROOM_CHANNEL_ID || env.DISCORD_WAITING_ROOM_CHANNEL_ID,
    discordSanctionsChannelId: settings.discordSanctionsChannelId || process.env.DISCORD_SANCTIONS_CHANNEL_ID || env.DISCORD_SANCTIONS_CHANNEL_ID,
    discordSupportChannelId: settings.discordSupportChannelId || process.env.DISCORD_SUPPORT_CHANNEL_ID || env.DISCORD_SUPPORT_CHANNEL_ID,
    discordMusicChannelId: settings.discordMusicChannelId || process.env.DISCORD_MUSIC_CHANNEL_ID || env.DISCORD_MUSIC_CHANNEL_ID,
    discordMatchAccessRoleId: settings.discordMatchAccessRoleId || process.env.DISCORD_MATCH_ACCESS_ROLE_ID || env.DISCORD_MATCH_ACCESS_ROLE_ID || '',
    hubRoleId: settings.hubRoleId || process.env.FACEIT_HUB_ROLE_ID || env.FACEIT_HUB_ROLE_ID || '',
    discordHubRoleId: settings.discordHubRoleId || process.env.DISCORD_HUB_ROLE_ID || env.DISCORD_HUB_ROLE_ID || '',
    faceitClubId: settings.faceitClubId || process.env.FACEIT_CLUB_ID || env.FACEIT_CLUB_ID || '',
    faceitHubId: settings.faceitHubId || process.env.FACEIT_HUB_ID || env.FACEIT_HUB_ID,
    faceitLeaderboardId: settings.faceitLeaderboardId || process.env.FACEIT_LEADERBOARD_ID || env.FACEIT_LEADERBOARD_ID,
    adminRoleId: settings.adminRoleId || settings.adminRoleName || process.env.ADMIN_ROLE_ID || env.ADMIN_ROLE_ID || '',
    matchTimeoutMinutes: parseInt(settings.matchTimeoutMinutes || process.env.MATCH_TIMEOUT_MINUTES || '120', 10),
    queues: rawQueues,
  };
}

export async function getEffectiveConfigForGuild(guildId) {
  const globalConfig = await getEffectiveConfig();
  if (!guildId) return globalConfig;

  const guildSettings = await db.getGuildSettings(guildId).catch(() => ({}));
  const rawQueues = Array.isArray(guildSettings.queues) && guildSettings.queues.length > 0
    ? guildSettings.queues
    : globalConfig.queues;

  return {
    ...globalConfig,
    ...guildSettings,
    discordGuildId: guildId,
    discordLinkChannelId: guildSettings.discordLinkChannelId || globalConfig.discordLinkChannelId,
    discordMatchesChannelId: guildSettings.discordMatchesChannelId || globalConfig.discordMatchesChannelId,
    discordMixtonChannelId: guildSettings.discordMixtonChannelId || globalConfig.discordMixtonChannelId,
    discordRolesChannelId: guildSettings.discordRolesChannelId || globalConfig.discordRolesChannelId,
    discordStatusChannelId: guildSettings.discordStatusChannelId || globalConfig.discordStatusChannelId,
    discordAdminAlertsChannelId: guildSettings.discordAdminAlertsChannelId || globalConfig.discordAdminAlertsChannelId,
    discordWaitingRoomChannelId: guildSettings.discordWaitingRoomChannelId || globalConfig.discordWaitingRoomChannelId,
    discordSanctionsChannelId: guildSettings.discordSanctionsChannelId || globalConfig.discordSanctionsChannelId,
    discordSupportChannelId: guildSettings.discordSupportChannelId || globalConfig.discordSupportChannelId,
    discordMusicChannelId: guildSettings.discordMusicChannelId || globalConfig.discordMusicChannelId,
    discordMatchAccessRoleId: guildSettings.discordMatchAccessRoleId || globalConfig.discordMatchAccessRoleId,
    hubRoleId: guildSettings.hubRoleId || globalConfig.hubRoleId,
    discordHubRoleId: guildSettings.discordHubRoleId || globalConfig.discordHubRoleId,
    faceitClubId: guildSettings.faceitClubId || globalConfig.faceitClubId,
    faceitHubId: guildSettings.faceitHubId || globalConfig.faceitHubId,
    faceitLeaderboardId: guildSettings.faceitLeaderboardId || globalConfig.faceitLeaderboardId,
    adminRoleId: guildSettings.adminRoleId || guildSettings.adminRoleName || globalConfig.adminRoleId || '',
    matchTimeoutMinutes: guildSettings.matchTimeoutMinutes !== undefined ? parseInt(guildSettings.matchTimeoutMinutes, 10) : globalConfig.matchTimeoutMinutes,
    queues: rawQueues,
  };
}

/**
 * Resuelve la configuración de la cola específica para una partida dada.
 * Si no se encuentra una cola específica, hace fallback a los canales predeterminados del servidor.
 */
export function resolveQueueConfig(config, matchData = {}, eventPayload = {}) {
  const queues = Array.isArray(config?.queues) ? config.queues : [];

  const rawQueueId =
    matchData.queue_id ||
    eventPayload.queue_id ||
    eventPayload.payload?.queue_id ||
    (matchData.entity_id && matchData.entity_id !== config.faceitHubId ? matchData.entity_id : null) ||
    (eventPayload.entity?.id && eventPayload.entity?.id !== config.faceitHubId ? eventPayload.entity?.id : null) ||
    (eventPayload.payload?.entity?.id && eventPayload.payload?.entity?.id !== config.faceitHubId ? eventPayload.payload?.entity?.id : null);

  const rawQueueName =
    matchData.queue_name ||
    eventPayload.queue_name ||
    eventPayload.payload?.queue_name ||
    matchData.entity_custom_name ||
    eventPayload.payload?.entity_custom_name ||
    eventPayload.entity?.name ||
    null;

  let matchedQueue = null;

  if (queues.length > 0) {
    if (rawQueueId) {
      matchedQueue = queues.find(
        q => (q.id && q.id.toLowerCase() === rawQueueId.toLowerCase()) ||
             (q.queueId && q.queueId.toLowerCase() === rawQueueId.toLowerCase())
      );
    }
    if (!matchedQueue && rawQueueName) {
      matchedQueue = queues.find(
        q => q.name && rawQueueName.toLowerCase().includes(q.name.toLowerCase())
      );
    }
  }

  // Canales por defecto de la guild
  const defaultMatchesChannelId = (config?.discordMatchesChannelId || '').split(',')[0]?.trim() || null;
  const defaultWaitingRoomId = (config?.discordWaitingRoomChannelId || '').split(',')[0]?.trim() || null;
  const defaultMixtonChannelId = config?.discordMixtonChannelId || defaultMatchesChannelId;
  const defaultAccessRole = config?.discordMatchAccessRoleId || '';
  const defaultFaceitHubRole = config?.hubRoleId || '';
  const defaultHubRole = config?.discordHubRoleId || '';
  const defaultSanctionsChannelId = config?.discordSanctionsChannelId || null;

  if (matchedQueue) {
    return {
      queueId: matchedQueue.queueId || matchedQueue.id || rawQueueId || null,
      queueName: matchedQueue.name || rawQueueName || 'Cola',
      discordMatchesChannelId: matchedQueue.discordMatchesChannelId || defaultMatchesChannelId,
      discordWaitingRoomChannelId: matchedQueue.discordWaitingRoomChannelId || defaultWaitingRoomId,
      discordMixtonChannelId: matchedQueue.discordMixtonChannelId || defaultMixtonChannelId,
      discordMatchAccessRoleId: matchedQueue.discordMatchAccessRoleId || defaultAccessRole,
      hubRoleId: matchedQueue.hubRoleId || defaultFaceitHubRole,
      discordHubRoleId: matchedQueue.discordHubRoleId || defaultHubRole,
      discordSanctionsChannelId: matchedQueue.discordSanctionsChannelId || defaultSanctionsChannelId,
      isSpecificQueue: true,
    };
  }

  return {
    queueId: rawQueueId || null,
    queueName: rawQueueName || null,
    discordMatchesChannelId: defaultMatchesChannelId,
    discordWaitingRoomChannelId: defaultWaitingRoomId,
    discordMixtonChannelId: defaultMixtonChannelId,
    discordMatchAccessRoleId: defaultAccessRole,
    hubRoleId: defaultFaceitHubRole,
    discordHubRoleId: defaultHubRole,
    discordSanctionsChannelId: defaultSanctionsChannelId,
    isSpecificQueue: false,
  };
}

/**
 * Obtiene todos los IDs de salas de espera configuradas (global + colas).
 */
export function getAllWaitingRoomIds(config) {
  const ids = new Set();
  if (config.discordWaitingRoomChannelId && !config.discordWaitingRoomChannelId.startsWith('ID_')) {
    config.discordWaitingRoomChannelId.split(',').forEach(id => {
      const clean = id.trim();
      if (clean) ids.add(clean);
    });
  }
  if (Array.isArray(config.queues)) {
    for (const q of config.queues) {
      if (q.discordWaitingRoomChannelId && !q.discordWaitingRoomChannelId.startsWith('ID_')) {
        ids.add(q.discordWaitingRoomChannelId.trim());
      }
    }
  }
  return Array.from(ids);
}

/**
 * Obtiene todos los IDs de canales de anuncios de partidas configurados (global + colas).
 */
export function getAllMatchesChannelIds(config) {
  const ids = new Set();
  if (config.discordMatchesChannelId && !config.discordMatchesChannelId.startsWith('ID_')) {
    config.discordMatchesChannelId.split(',').forEach(id => {
      const clean = id.trim();
      if (clean) ids.add(clean);
    });
  }
  if (Array.isArray(config.queues)) {
    for (const q of config.queues) {
      if (q.discordMatchesChannelId && !q.discordMatchesChannelId.startsWith('ID_')) {
        ids.add(q.discordMatchesChannelId.trim());
      }
    }
  }
  return Array.from(ids);
}

/**
 * Obtiene todos los IDs de canales de mixton / panel configurados (global + colas).
 */
export function getAllMixtonChannelIds(config) {
  const ids = new Set();
  if (config.discordMixtonChannelId && !config.discordMixtonChannelId.startsWith('ID_')) {
    config.discordMixtonChannelId.split(',').forEach(id => {
      const clean = id.trim();
      if (clean) ids.add(clean);
    });
  }
  if (Array.isArray(config.queues)) {
    for (const q of config.queues) {
      if (q.discordMixtonChannelId && !q.discordMixtonChannelId.startsWith('ID_')) {
        ids.add(q.discordMixtonChannelId.trim());
      }
    }
  }
  return Array.from(ids);
}

// Mapeo de IDs de Faceit Club a roles de Discord
export const CLUB_ROLES_MAP = {
  'd79607e7-77b8-4db0-9abf-c2592820066c': 'EXTREME',
  'f6b04720-3908-4933-9555-f61e63bf420b': 'EXTREME BAJOS',
  'dfb94a9b-b17f-4f8e-ace7-6d4863b2ea69': 'PREMIUM',
  '38d0142f-04da-4130-8df6-c5d801ff5c3e': 'PLUS',
};

export const LEVEL_ROLE_COLORS = {
  1: '#8C8C8C', 2: '#8C8C8C', 3: '#8C8C8C',
  4: '#15C253', 5: '#15C253', 6: '#15C253', 7: '#15C253',
  8: '#FF9E00', 9: '#FF9E00',
  10: '#FF3E3E',
};

export const SPECIAL_ROLE_COLORS = {
  'EXTREME': '#FF0000',
  'EXTREME BAJOS': '#D35400',
  'PREMIUM': '#FFD700',
  'PLUS': '#00BFFF',
};


