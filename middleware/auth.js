import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { checkIsAdmin } from '../services/adminCheck.js';

export function verifyAdminToken(secret) {
  return (req, res, next) => {
    const token = req.cookies?.auth_token || req.cookies?.admin_token;
    if (!token) {
      logger.warn(`[AUTH] No se encontró token para ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'No autenticado' });
    }

    try {
      const decoded = jwt.verify(token, secret);
      const isAllowed = decoded.role === 'global_admin' || decoded.role === 'admin' || decoded.isAdmin === true;
      if (!isAllowed) {
        logger.warn(`[AUTH] Intento de acceso no autorizado a ruta admin por ${decoded.username}`);
        return res.status(403).json({ error: 'No autorizado. Se requieren permisos de administrador.' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      logger.error(`[AUTH] Error al verificar token para ${req.method} ${req.url}: ${err.message}`);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

export function verifyUserToken(secret) {
  return (req, res, next) => {
    const token = req.cookies?.auth_token || req.cookies?.admin_token;
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch (err) {
      logger.error(`[AUTH] Error al verificar token de usuario para ${req.method} ${req.url}: ${err.message}`);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
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
