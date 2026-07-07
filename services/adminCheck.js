import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function checkIsAdmin(member, guild) {
  if (!member) return false;

  const adminRoleName = env.ADMIN_ROLE_NAME.toUpperCase();
  const hasAdminRole = member.roles.cache.some(role => role.name.toUpperCase() === adminRoleName);
  const hasAdminPermission = member.permissions.has('Administrator');

  return hasAdminRole || hasAdminPermission;
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
