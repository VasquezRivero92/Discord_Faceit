import { LEVEL_ROLE_COLORS, SPECIAL_ROLE_COLORS } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function getOrCreateLevelRole(guild, level) {
  const roleName = `Faceit Level ${level}`;
  let role = guild.roles.cache.find(r => r.name === roleName);

  if (!role) {
    try {
      role = await guild.roles.create({
        name: roleName,
        color: LEVEL_ROLE_COLORS[level] || '#FFFFFF',
        reason: 'Bot de Faceit - Roles de Nivel',
      });
      logger.success(`Rol creado: ${roleName}`);
    } catch (err) {
      logger.error(`No se pudo crear el rol ${roleName}:`, err.message);
    }
  }
  return role;
}

export async function syncMemberLevelRole(guild, memberId, level) {
  if (!level) return;
  try {
    const member = await guild.members.fetch(memberId);
    if (!member) return;

    const targetRole = await getOrCreateLevelRole(guild, level);
    if (!targetRole) return;

    const rolesToRemove = [];
    for (let l = 1; l <= 10; l++) {
      if (l === level) continue;
      const r = guild.roles.cache.find(role => role.name === `Faceit Level ${l}`);
      if (r && member.roles.cache.has(r.id)) rolesToRemove.push(r);
    }

    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }

    if (!member.roles.cache.has(targetRole.id)) {
      await member.roles.add(targetRole);
      logger.success(`Rol ${targetRole.name} asignado a ${member.user.tag}`);
    }
  } catch (error) {
    logger.error(`Error al sincronizar roles de nivel para ${memberId}:`, error.message);
  }
}

export function getPlayerSkillLevel(playerData) {
  return playerData.games?.cs2?.skill_level || playerData.games?.csgo?.skill_level || null;
}

export async function getOrCreateSpecialRole(guild, roleName) {
  const normalized = roleName.toUpperCase();
  let role = guild.roles.cache.find(r => r.name.toUpperCase() === normalized);

  if (!role) {
    try {
      role = await guild.roles.create({
        name: normalized,
        color: SPECIAL_ROLE_COLORS[normalized] || '#FFFFFF',
        reason: 'Bot de Faceit - Roles Especiales de Club',
      });
      logger.success(`Rol Especial creado: ${normalized}`);
    } catch (err) {
      logger.error(`No se pudo crear el rol especial ${normalized}:`, err.message);
    }
  }
  return role;
}

export async function removeAllFaceitRoles(member, guild) {
  const rolesToRemove = [];
  for (let l = 1; l <= 10; l++) {
    const role = guild.roles.cache.find(r => r.name === `Faceit Level ${l}`);
    if (role && member.roles.cache.has(role.id)) rolesToRemove.push(role);
  }
  for (const name of ['EXTREME', 'EXTREME BAJOS', 'PREMIUM', 'PLUS']) {
    const role = guild.roles.cache.find(r => r.name.toUpperCase() === name);
    if (role && member.roles.cache.has(role.id)) rolesToRemove.push(role);
  }
  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove);
  }
  return rolesToRemove.length;
}

export async function syncMemberNickname(guild, memberId, faceitNickname) {
  if (!guild || !memberId || !faceitNickname) {
    logger.warn(`[NICK SYNC] Parámetros insuficientes: guild=${!!guild}, memberId=${memberId}, faceitNickname=${faceitNickname}`);
    return false;
  }
  try {
    const member = await guild.members.fetch(memberId).catch(() => null);
    if (!member) {
      logger.warn(`[NICK SYNC] No se pudo encontrar al miembro ${memberId} en el servidor ${guild.name}`);
      return false;
    }

    if (member.nickname === faceitNickname) {
      logger.info(`[NICK SYNC] El apodo de ${member.user.tag} ya es exactamente '${faceitNickname}' en ${guild.name}`);
      return true;
    }

    logger.info(`[NICK SYNC] Intentando cambiar apodo de ${member.user.tag} (${member.nickname || member.displayName}) -> '${faceitNickname}'...`);
    await member.setNickname(faceitNickname, 'Sincronización de apodo con Faceit');
    logger.success(`[NICK SYNC] Apodo de ${member.user.tag} actualizado a '${faceitNickname}' en ${guild.name}`);
    return true;
  } catch (err) {
    if (err.code === 50013) {
      logger.warn(`[NICK SYNC] No se pudo cambiar el apodo de ${memberId}: El bot no tiene permisos suficientes en Discord (el usuario puede ser el dueño del servidor o poseer un rol superior al rol del bot).`);
    } else {
      logger.error(`[NICK SYNC] Error al cambiar apodo de ${memberId}:`, err.message);
    }
    return false;
  }
}

