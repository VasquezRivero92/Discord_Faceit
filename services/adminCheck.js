import { PermissionFlagsBits } from 'discord.js';
import { env, getEffectiveConfigForGuild, getEffectiveConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function checkIsAdmin(member, guild) {
  if (!member) return false;

  // Administrador global de Discord siempre tiene permiso
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const guildId = guild?.id || member.guild?.id;
  const config = guildId 
    ? await getEffectiveConfigForGuild(guildId).catch(() => ({}))
    : await getEffectiveConfig().catch(() => ({}));

  const adminRoleId = config?.adminRoleId || env.ADMIN_ROLE_ID;

  if (!adminRoleId) return false;

  // Verificar si tiene el rol por ID o por nombre como respaldo
  const hasAdminRole = member.roles?.cache?.has(adminRoleId) ||
    member.roles?.cache?.some(r => r.id === adminRoleId || (r.name && r.name.toUpperCase() === adminRoleId.toUpperCase()));

  return Boolean(hasAdminRole);
}

export async function checkDiscordAdmin(client, guildId, userId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return checkIsAdmin(member, guild);
  } catch (err) {
    logger.error('Error verificando admin en Discord:', err.message);
    return false;
  }
}


