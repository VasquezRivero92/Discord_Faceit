import dotenv from 'dotenv';
import { getSettings } from '../utils/featureFlags.js';
import { db } from '../database.js';

dotenv.config();

export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET,
  DISCORD_LINK_CHANNEL_ID: process.env.DISCORD_LINK_CHANNEL_ID,
  DISCORD_MATCHES_CHANNEL_ID: process.env.DISCORD_MATCHES_CHANNEL_ID,
  DISCORD_ROLES_CHANNEL_ID: process.env.DISCORD_ROLES_CHANNEL_ID,
  DISCORD_STATUS_CHANNEL_ID: process.env.DISCORD_STATUS_CHANNEL_ID,
  DISCORD_ADMIN_ALERTS_CHANNEL_ID: process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID,
  DISCORD_WAITING_ROOM_CHANNEL_ID: process.env.DISCORD_WAITING_ROOM_CHANNEL_ID,
  FACEIT_API_KEY: process.env.FACEIT_API_KEY,
  FACEIT_HUB_ID: process.env.FACEIT_HUB_ID,
  FACEIT_LEADERBOARD_ID: process.env.FACEIT_LEADERBOARD_ID,
  FACEIT_WEBHOOK_SECRET: process.env.FACEIT_WEBHOOK_SECRET,
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  ADMIN_ROLE_NAME: process.env.ADMIN_ROLE_NAME || 'ADMIN',
  DISCORD_SUPPORT_CHANNEL_ID: process.env.DISCORD_SUPPORT_CHANNEL_ID,
};

export function validateConfig() {
  if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_TOKEN y DISCORD_CLIENT_ID son obligatorios');
  }
}

/**
 * Devuelve la configuración efectiva mezclando env + settings de Firestore.
 * Los settings de Firestore tienen prioridad sobre env.
 */
export async function getEffectiveConfig() {
  const settings = await getSettings().catch(() => ({}));
  return {
    discordGuildId: settings.discordGuildId || process.env.DISCORD_GUILD_ID || env.DISCORD_GUILD_ID,
    discordLinkChannelId: settings.discordLinkChannelId || process.env.DISCORD_LINK_CHANNEL_ID || env.DISCORD_LINK_CHANNEL_ID,
    discordMatchesChannelId: settings.discordMatchesChannelId || process.env.DISCORD_MATCHES_CHANNEL_ID || env.DISCORD_MATCHES_CHANNEL_ID,
    discordRolesChannelId: settings.discordRolesChannelId || process.env.DISCORD_ROLES_CHANNEL_ID || env.DISCORD_ROLES_CHANNEL_ID,
    discordStatusChannelId: settings.discordStatusChannelId || process.env.DISCORD_STATUS_CHANNEL_ID || env.DISCORD_STATUS_CHANNEL_ID,
    discordAdminAlertsChannelId: settings.discordAdminAlertsChannelId || process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || env.DISCORD_ADMIN_ALERTS_CHANNEL_ID,
    discordWaitingRoomChannelId: settings.discordWaitingRoomChannelId || process.env.DISCORD_WAITING_ROOM_CHANNEL_ID || env.DISCORD_WAITING_ROOM_CHANNEL_ID,
    discordSupportChannelId: settings.discordSupportChannelId || process.env.DISCORD_SUPPORT_CHANNEL_ID || env.DISCORD_SUPPORT_CHANNEL_ID,
    faceitHubId: settings.faceitHubId || process.env.FACEIT_HUB_ID || env.FACEIT_HUB_ID,
    faceitLeaderboardId: settings.faceitLeaderboardId || process.env.FACEIT_LEADERBOARD_ID || env.FACEIT_LEADERBOARD_ID,
    adminRoleName: settings.adminRoleName || process.env.ADMIN_ROLE_NAME || env.ADMIN_ROLE_NAME,
    matchTimeoutMinutes: parseInt(settings.matchTimeoutMinutes || process.env.MATCH_TIMEOUT_MINUTES || '120', 10),
  };
}

export async function getEffectiveConfigForGuild(guildId) {
  const globalConfig = await getEffectiveConfig();
  if (!guildId) return globalConfig;

  const guildSettings = await db.getGuildSettings(guildId).catch(() => ({}));
  return {
    ...globalConfig,
    discordGuildId: guildId,
    discordLinkChannelId: guildSettings.discordLinkChannelId || globalConfig.discordLinkChannelId,
    discordMatchesChannelId: guildSettings.discordMatchesChannelId || globalConfig.discordMatchesChannelId,
    discordRolesChannelId: guildSettings.discordRolesChannelId || globalConfig.discordRolesChannelId,
    discordStatusChannelId: guildSettings.discordStatusChannelId || globalConfig.discordStatusChannelId,
    discordAdminAlertsChannelId: guildSettings.discordAdminAlertsChannelId || globalConfig.discordAdminAlertsChannelId,
    discordWaitingRoomChannelId: guildSettings.discordWaitingRoomChannelId || globalConfig.discordWaitingRoomChannelId,
    discordSupportChannelId: guildSettings.discordSupportChannelId || globalConfig.discordSupportChannelId,
    faceitHubId: guildSettings.faceitHubId || globalConfig.faceitHubId,
    faceitLeaderboardId: guildSettings.faceitLeaderboardId || globalConfig.faceitLeaderboardId,
    adminRoleName: guildSettings.adminRoleName || globalConfig.adminRoleName,
    matchTimeoutMinutes: guildSettings.matchTimeoutMinutes !== undefined ? parseInt(guildSettings.matchTimeoutMinutes, 10) : globalConfig.matchTimeoutMinutes,
  };
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
