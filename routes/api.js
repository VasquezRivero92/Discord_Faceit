import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { verifyAdminToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getSettings, invalidateSettingsCache } from '../utils/featureFlags.js';
import { syncMemberLevelRole, getOrCreateSpecialRole, getOrCreateLevelRole, getPlayerSkillLevel } from '../services/roles.js';
import { fetchFaceitPlayer, fetchFaceitPlayerById } from '../services/faceitApi.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { env } from '../config/index.js';
import { fetchFaceitStats, fetchPlayerHistory, fetchHubInfo, fetchLeaderboard } from '../services/faceitApi.js';
import { getEffectiveConfig, getEffectiveConfigForGuild, CLUB_ROLES_MAP } from '../config/index.js';

export function createApiRouter(client, db, config) {
  const router = Router();
  const { ADMIN_JWT_SECRET, DISCORD_GUILD_ID } = config;
  const requireAuth = verifyAdminToken(ADMIN_JWT_SECRET);

  // Middleware to attach guildId to req
  router.use((req, res, next) => {
    req.guildId = req.query.guildId || req.body.guildId || req.headers['x-guild-id'] || null;
    next();
  });

  const resolveTargetGuildId = (req) => {
    if (req.user?.role === 'admin') {
      return req.user.servidor;
    }
    return req.guildId || null;
  };

  // --- Información del usuario logueado ---
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // --- Información del Sistema (Uptime y Hub) ---
  router.get('/system', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const effectiveConfig = targetGuildId
        ? await getEffectiveConfigForGuild(targetGuildId)
        : await getEffectiveConfig();
      let region = 'Desconocida';
      if (effectiveConfig.faceitHubId) {
        const hubInfo = await fetchHubInfo(effectiveConfig.faceitHubId);
        if (hubInfo && hubInfo.region) {
          region = hubInfo.region.toUpperCase();
        }
      }
      res.json({
        uptimeSeconds: process.uptime(),
        hubRegion: region
      });
    } catch(e) {
      res.json({ uptimeSeconds: process.uptime(), hubRegion: 'ERROR' });
    }
  });

  // --- Estadísticas ---
  router.get('/stats', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const usersSnapshot = await db._firestore.collection('faceit_users').get();
      const matchesSnapshot = await db._firestore.collection('faceit_active_matches').get();
      const settings = await getSettings();

      let totalUsers = 0;
      let totalMatches = 0;

      if (targetGuildId) {
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          if ((data.servidor || data.mixton_guild_id) === targetGuildId) totalUsers++;
        });
        matchesSnapshot.forEach(doc => {
          if (doc.data().guild_id === targetGuildId) totalMatches++;
        });
      } else {
        totalUsers = usersSnapshot.size;
        totalMatches = matchesSnapshot.size;
      }

      const levelDistribution = {};
      for (let i = 1; i <= 10; i++) levelDistribution[i] = 0;

      res.json({
        totalUsers,
        totalMatches,
        levelDistribution,
        features: {
          autoWelcomeDm: settings.autoWelcomeDm,
          autoRoleSync: settings.autoRoleSync,
          autoVoiceChannels: settings.autoVoiceChannels,
          autoMovePlayers: settings.autoMovePlayers,
          matchAnnouncements: settings.matchAnnouncements,
          liveMatchPanel: settings.liveMatchPanel,
        }
      });
    } catch (err) {
      logger.error('Error en /stats:', err);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  // --- Lista de usuarios vinculados ---
  router.get('/users', requireAuth, async (req, res) => {
    try {
      const snapshot = await db._firestore.collection('faceit_users').get();
      
      const targetGuildId = resolveTargetGuildId(req);
      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      if (guild) await guild.members.fetch().catch(() => null);
      
      const clubRoleNames = Object.values(CLUB_ROLES_MAP);
      const users = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const userGuild = data.guild_id || data.servidor || data.mixton_guild_id || null;
        if (targetGuildId) {
          if (userGuild !== targetGuildId) {
            return;
          }
        }

        const actualDiscordId = data.discordId || doc.id;
        let clubRole = null;
        if (guild) {
          const member = guild.members.cache.get(actualDiscordId);
          if (member) {
            const foundRole = member.roles.cache.find(r => clubRoleNames.includes(r.name.toUpperCase()));
            if (foundRole) clubRole = foundRole.name.toUpperCase();
          }
        }
        users.push({
          discordId: actualDiscordId,
          clubRole,
          ...data
        });
      });
      res.json({ users });
    } catch (err) {
      logger.error('Error en /users:', err);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  });

  // --- Desvincular usuario ---
  router.post('/users/:id/unlink', requireAuth, async (req, res) => {
    try {
      const discordId = req.params.id;
      const targetGuildId = resolveTargetGuildId(req);
      const data = await db.getFullUser(discordId, targetGuildId || req.guildId);
      if (targetGuildId && data) {
        const userGuild = data.guild_id || data.servidor || data.mixton_guild_id || null;
        if (userGuild !== targetGuildId) {
          return res.status(403).json({ error: 'No autorizado para modificar usuarios de otros servidores.' });
        }
      }

      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      const member = guild ? await guild.members.fetch(discordId).catch(() => null) : null;

      if (member && guild) {
        const rolesToRemove = [];
        for (let l = 1; l <= 10; l++) {
          const role = guild.roles.cache.find(r => r.name === `Faceit Level ${l}`);
          if (role && member.roles.cache.has(role.id)) rolesToRemove.push(role);
        }
        for (const name of ['EXTREME', 'EXTREME BAJOS', 'PREMIUM', 'PLUS']) {
          const role = guild.roles.cache.find(r => r.name.toUpperCase() === name);
          if (role && member.roles.cache.has(role.id)) rolesToRemove.push(role);
        }
        if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);
      }

      await db.unlinkAccount(discordId, targetGuildId || req.guildId);
      res.json({ success: true });
    } catch (err) {
      logger.error('Error en /users/:id/unlink:', err);
      res.status(500).json({ error: 'Error al desvincular usuario' });
    }
  });

  // --- Sincronizar todos los usuarios globalmente ---
  router.post('/users/sync-all', requireAuth, async (req, res) => {
    try {
      const snapshot = await db._firestore.collection('faceit_users').get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ discordId: doc.id, ...doc.data() });
      });

      if (users.length === 0) {
        return res.json({ success: true, message: 'No hay usuarios para sincronizar.' });
      }

      res.json({ success: true, message: `Sincronización global iniciada en segundo plano para ${users.length} usuarios.` });

      const syncGuildId = resolveTargetGuildId(req) || DISCORD_GUILD_ID;
      (async () => {
        logger.info(`Iniciando sincronización de roles para ${users.length} usuarios en guild ${syncGuildId}...`);
        const guild = await client.guilds.fetch(syncGuildId).catch(() => null);
        if (!guild) {
          logger.error(`No se pudo obtener la guild ${syncGuildId} para la sincronización.`);
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
          try {
            await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay to respect API limits

            if (!user.faceit_player_id) continue;
            const playerData = await fetchFaceitPlayerById(user.faceit_player_id);
            const currentLevel = getPlayerSkillLevel(playerData);

            if (currentLevel) {
              await syncMemberLevelRole(guild, user.discordId, currentLevel);
              successCount++;
            }
          } catch (err) {
            errorCount++;
            logger.error(`Error al sincronizar usuario ${user.faceit_nickname} (${user.discordId}) en sync-all:`, err.message);
          }
        }

        logger.success(`Sincronización global completada. Éxito: ${successCount}, Errores: ${errorCount}`);
        await db.addLogEntry('success', `Sincronización global completada. Éxito: ${successCount}, Errores: ${errorCount}`, 'system');
      })();
    } catch (err) {
      logger.error('Error en POST /users/sync-all:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al iniciar la sincronización' });
      }
    }
  });

  // --- Exportar copia de seguridad de usuarios ---
  router.get('/users/backup', requireAuth, async (req, res) => {
    try {
      const snapshot = await db._firestore.collection('faceit_users').get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({
          discordId: doc.id,
          ...doc.data()
        });
      });
      res.json(users);
    } catch (err) {
      logger.error('Error al generar backup de usuarios:', err);
      res.status(500).json({ error: 'Error al generar backup' });
    }
  });

  // --- Importar copia de seguridad de usuarios ---
  router.post('/users/restore', requireAuth, async (req, res) => {
    try {
      const { users } = req.body;
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'El formato de datos de backup no es válido' });
      }

      const batch = db._firestore.batch();
      const usersCol = db._firestore.collection('faceit_users');

      for (const u of users) {
        if (!u.discordId) continue;
        const docRef = usersCol.doc(u.discordId);
        const data = { ...u };
        delete data.discordId;

        // Convertir strings de tiempo o estructuras serializadas a timestamp de Firestore
        if (data.linkedAt && data.linkedAt._seconds) {
          data.linkedAt = new admin.firestore.Timestamp(data.linkedAt._seconds, data.linkedAt._nanoseconds || 0);
        } else if (data.linkedAt) {
          data.linkedAt = new Date(data.linkedAt);
        }
        
        batch.set(docRef, data, { merge: true });
      }

      await batch.commit();
      await db.addLogEntry('info', `Backup de usuarios importado: ${users.length} vinculaciones actualizadas.`, 'system');
      res.json({ success: true, message: `Backup importado con éxito: ${users.length} vinculaciones restauradas.` });
    } catch (err) {
      logger.error('Error al restaurar backup:', err);
      res.status(500).json({ error: 'Error al restaurar backup' });
    }
  });

  // --- Verificar usuario manualmente ---
  router.post('/users/verify', requireAuth, async (req, res) => {
    try {
      const { discordId, faceitNickname } = req.body;
      if (!discordId || !faceitNickname) {
        return res.status(400).json({ error: 'discordId y faceitNickname son requeridos' });
      }

      const targetGuildId = resolveTargetGuildId(req);
      const player = await fetchFaceitPlayer(faceitNickname);
      const existing = await db.getDiscordIdByFaceitId(player.player_id, targetGuildId || req.guildId);
      if (existing && existing !== discordId) {
        return res.status(409).json({ error: 'Esa cuenta Faceit ya está vinculada a otro usuario' });
      }

      const skillLevel = player.games?.cs2?.skill_level || player.games?.csgo?.skill_level || null;
      const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;
      await db.linkAccounts(discordId, player.player_id, player.nickname, skillLevel, elo, targetGuildId || req.guildId);
      
      // Asignar el servidor y rol por defecto 'usuario'
      await db.setUserRoleAndGuild(discordId, 'usuario', targetGuildId);

      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      if (skillLevel && guild) {
        await syncMemberLevelRole(guild, discordId, skillLevel);
      }

      res.json({ success: true, player: { id: player.player_id, nickname: player.nickname, level: skillLevel } });
    } catch (err) {
      logger.error('Error en /users/verify:', err);
      if (err.message === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ error: 'Jugador no encontrado en Faceit' });
      }
      res.status(500).json({ error: 'Error al verificar usuario' });
    }
  });

  // --- Asignar rol manualmente ---
  router.post('/users/:id/roles', requireAuth, async (req, res) => {
    try {
      const { roleType, roleValue } = req.body; // roleType: 'level' | 'special', roleValue: number | string
      const discordId = req.params.id;
      
      const targetGuildId = resolveTargetGuildId(req);
      if (targetGuildId) {
        const data = await db.getFullUser(discordId);
        if (data) {
          const userGuild = data.servidor || data.mixton_guild_id || null;
          if (userGuild !== targetGuildId) {
            return res.status(403).json({ error: 'No autorizado para asignar roles a usuarios de otros servidores.' });
          }
        }
      }

      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      if (!guild) return res.status(500).json({ error: 'Servidor de Discord no disponible.' });

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Miembro no encontrado.' });

      if (roleType === 'level') {
        const level = parseInt(roleValue, 10);
        await syncMemberLevelRole(guild, discordId, level);
      } else if (roleType === 'special') {
        const role = await getOrCreateSpecialRole(guild, roleValue);
        if (role) await member.roles.add(role);
      }

      res.json({ success: true });
    } catch (err) {
      logger.error('Error en /users/:id/roles:', err);
      res.status(500).json({ error: 'Error al asignar rol' });
    }
  });

  // --- Asignar rol administrativo en la web ---
  router.post('/users/:id/admin-role', requireAuth, async (req, res) => {
    try {
      const targetDiscordId = req.params.id;
      const { role, guildId } = req.body;

      const isGlobalAdmin = req.user?.role === 'global_admin';
      const isServerAdmin = req.user?.role === 'admin';

      if (!isGlobalAdmin && !isServerAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para asignar roles administrativos.' });
      }

      if (role !== 'usuario' && role !== 'admin' && role !== 'global_admin') {
        return res.status(400).json({ error: 'Rol inválido. Debe ser usuario, admin o global_admin.' });
      }

      // Restricciones para administradores de servidor
      if (isServerAdmin) {
        if (role === 'global_admin') {
          return res.status(403).json({ error: 'No tienes permisos para asignar el rol de Administrador Global.' });
        }
        
        // Obtener el usuario objetivo para validar si pertenece a su servidor
        const targetUserData = await db.getFullUser(targetDiscordId);
        const targetUserGuild = targetUserData?.guild_id || targetUserData?.servidor || targetUserData?.mixton_guild_id;
        
        if (targetUserGuild !== req.user.servidor) {
          return res.status(403).json({ error: 'No puedes gestionar los permisos de usuarios de otros servidores.' });
        }

        if (role === 'admin' && guildId !== req.user.servidor) {
          return res.status(403).json({ error: 'Solo puedes asignar el rol de administrador para tu propio servidor.' });
        }
      }

      if (role === 'admin' && !guildId) {
        return res.status(400).json({ error: 'Debe especificar el servidor (guildId) para el rol de admin.' });
      }

      const targetGuildId = role === 'admin' ? guildId : null;
      await db.setUserRoleAndGuild(targetDiscordId, role, targetGuildId);
      logger.success(`Administrador (${req.user?.role}) ${req.user?.username} asignó el rol web '${role}' al usuario ${targetDiscordId} (Servidor: ${targetGuildId || 'Global'})`);
      res.json({ success: true });
    } catch (err) {
      logger.error('Error en /users/:id/admin-role:', err);
      res.status(500).json({ error: 'Error interno al asignar rol administrativo.' });
    }
  });

  // --- Partidas activas ---
  router.get('/matches', requireAuth, async (req, res) => {
    try {
      let matches = await db.getActiveMatches();
      const targetGuildId = resolveTargetGuildId(req);
      
      if (targetGuildId) {
        matches = matches.filter(m => m.guild_id === targetGuildId);
      }

      let serverLoad = 0;
      let avgDurationStr = '0m 0s';
      let failedCleanups = 0;

      // 1. Carga de servidores (basada en partidas activas / capacidad max, e.g. 10 de capacidad)
      const maxCapacity = 10;
      serverLoad = Math.min(100, Math.round((matches.length / maxCapacity) * 100 * 10) / 10);

      // 2. Duración promedio
      if (matches.length > 0) {
        const totalDurationMs = matches.reduce((sum, m) => {
          const start = m.startedAt || Date.now();
          return sum + (Date.now() - start);
        }, 0);
        const avgMs = totalDurationMs / matches.length;
        const avgSec = Math.floor(avgMs / 1000);
        const mins = Math.floor(avgSec / 60);
        const secs = avgSec % 60;
        avgDurationStr = `${mins}m ${secs}s`;
      }

      // 3. Limpiezas fallidas (canales de voz huérfanos con prefijo 🔊 que no corresponden a partidas activas)
      try {
        const guildIdToUse = targetGuildId || DISCORD_GUILD_ID;
        const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
        if (guild) {
          const channels = await guild.channels.fetch().catch(() => null);
          if (channels) {
            const activeVcIds = new Set();
            matches.forEach(m => {
              if (m.faction1_vc_id) activeVcIds.add(m.faction1_vc_id);
              if (m.faction2_vc_id) activeVcIds.add(m.faction2_vc_id);
            });
            const orphanVCs = channels.filter(c => c.type === 2 && c.name.startsWith('🔊') && !activeVcIds.has(c.id));
            failedCleanups = orphanVCs.size;
          }
        }
      } catch (err) {
        logger.error('Error al calcular limpiezas fallidas en /matches:', err.message);
      }

      res.json({
        matches,
        stats: {
          serverLoad,
          avgDurationStr,
          failedCleanups
        }
      });
    } catch (err) {
      logger.error('Error en /matches:', err);
      res.status(500).json({ error: 'Error al obtener partidas' });
    }
  });

  // --- Forzar cleanup de una partida ---
  router.post('/matches/:id/cleanup', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      const match = await db.getActiveMatch(matchId);
      
      const targetGuildId = resolveTargetGuildId(req);
      if (targetGuildId && match && match.guild_id !== targetGuildId) {
        return res.status(403).json({ error: 'No autorizado para limpiar partidas de otros servidores.' });
      }

      const guildIdToUse = (match && match.guild_id) || targetGuildId || DISCORD_GUILD_ID;
      const guild = await client.guilds.fetch(guildIdToUse);

      if (match) {
        for (const vcId of [match.faction1_vc_id, match.faction2_vc_id]) {
          if (vcId) {
            try {
              const vc = await guild.channels.fetch(vcId);
              if (vc) {
                const waitingRoomId = process.env.DISCORD_WAITING_ROOM_CHANNEL_ID;
                if (waitingRoomId && !waitingRoomId.startsWith('ID_')) {
                  const waitingRoom = await guild.channels.fetch(waitingRoomId).catch(() => null);
                  if (waitingRoom) {
                    for (const [_, member] of vc.members) {
                      try {
                        await member.voice.setChannel(waitingRoom, 'Cleanup forzado desde Admin Panel');
                      } catch (e) { /* ignore */ }
                    }
                  }
                }
                await vc.delete('Cleanup forzado desde Admin Panel');
              }
            } catch (e) {
              logger.warn('No se pudo limpiar VC:', e.message);
            }
          }
        }
        await db.removeActiveMatch(matchId);
      }

      res.json({ success: true });
    } catch (err) {
      logger.error('Error en /matches/:id/cleanup:', err);
      res.status(500).json({ error: 'Error al limpiar partida' });
    }
  });

  // --- Leaderboard ---
  router.get('/leaderboard', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const effectiveConfig = targetGuildId
        ? await getEffectiveConfigForGuild(targetGuildId)
        : await getEffectiveConfig();
      if (!effectiveConfig.faceitLeaderboardId) {
        return res.json({ leaderboard: [] });
      }

      const snapshot = await db._firestore.collection('faceit_users').get();
      const nicknameToDiscord = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.faceit_nickname) {
          nicknameToDiscord[data.faceit_nickname.toLowerCase()] = doc.id;
        }
      });

      const leaderboardData = await fetchLeaderboard(effectiveConfig.faceitLeaderboardId);
      if (!leaderboardData || !leaderboardData.items) {
        return res.json({ leaderboard: [] });
      }

      const leaderboardEntries = leaderboardData.items.map(item => ({
        id: item.player.user_id,
        discord_id: nicknameToDiscord[item.player.nickname.toLowerCase()] || 'N/A',
        faceit_nickname: item.player.nickname,
        faceit_level: item.player.skill_level || 0,
        faceit_elo: item.points || 0
      }));

      res.json({ leaderboard: leaderboardEntries });
    } catch (err) {
      logger.error('Error en /leaderboard:', err);
      res.status(500).json({ error: 'Error al obtener leaderboard' });
    }
  });

  // --- Stats Player ---
  router.get('/stats/:nickname', requireAuth, async (req, res) => {
    try {
      const nickname = req.params.nickname;
      const player = await fetchFaceitPlayer(nickname);
      const level = player.games?.cs2?.skill_level || player.games?.csgo?.skill_level || 0;
      const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;
      
      const stats = await fetchFaceitStats(player.player_id);
      const history = await fetchPlayerHistory(player.player_id, 'cs2', 10);

      let role = 'LVL ' + level;
      try {
        const targetGuildId = resolveTargetGuildId(req);
        let query = db._firestore.collection('faceit_users').where('faceit_player_id', '==', player.player_id);
        if (targetGuildId) {
          query = query.where('guild_id', '==', targetGuildId);
        }
        const snapshot = await query.get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          role = doc.data().role_value || doc.data().roleType || role;
        }
      } catch (e) {}

      res.json({
        player: {
          player_id: player.player_id,
          nickname: player.nickname,
          avatar: player.avatar,
          country: player.country,
          level: level,
          elo: elo,
          role: role
        },
        stats,
        history
      });
    } catch (err) {
      logger.error('Error en /stats/:nickname:', err);
      if (err.message === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ error: 'Jugador no encontrado en Faceit' });
      }
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  // --- Settings / Configuración ---
  router.get('/settings', requireAuth, async (req, res) => {
    if (req.user?.role !== 'global_admin') {
      return res.status(403).json({ error: 'Solo el administrador global tiene acceso a la configuración global.' });
    }
    try {
      const settings = await getSettings(true);
      const effectiveSettings = {
        ...settings,
        discordLinkChannelId: settings.discordLinkChannelId || process.env.DISCORD_LINK_CHANNEL_ID || env.DISCORD_LINK_CHANNEL_ID,
        discordMatchesChannelId: settings.discordMatchesChannelId || process.env.DISCORD_MATCHES_CHANNEL_ID || env.DISCORD_MATCHES_CHANNEL_ID,
        discordRolesChannelId: settings.discordRolesChannelId || process.env.DISCORD_ROLES_CHANNEL_ID || env.DISCORD_ROLES_CHANNEL_ID,
        discordStatusChannelId: settings.discordStatusChannelId || process.env.DISCORD_STATUS_CHANNEL_ID || env.DISCORD_STATUS_CHANNEL_ID,
        discordWaitingRoomChannelId: settings.discordWaitingRoomChannelId || process.env.DISCORD_WAITING_ROOM_CHANNEL_ID || env.DISCORD_WAITING_ROOM_CHANNEL_ID,
        discordAdminAlertsChannelId: settings.discordAdminAlertsChannelId || process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || '',
        discordSupportChannelId: settings.discordSupportChannelId || process.env.DISCORD_SUPPORT_CHANNEL_ID || env.DISCORD_SUPPORT_CHANNEL_ID || '',
        faceitHubId: settings.faceitHubId || process.env.FACEIT_HUB_ID || env.FACEIT_HUB_ID,
        faceitLeaderboardId: settings.faceitLeaderboardId || process.env.FACEIT_LEADERBOARD_ID || env.FACEIT_LEADERBOARD_ID || '',
        adminRoleName: settings.adminRoleName || process.env.ADMIN_ROLE_NAME || env.ADMIN_ROLE_NAME,
        matchTimeoutMinutes: settings.matchTimeoutMinutes || parseInt(process.env.MATCH_TIMEOUT_MINUTES || '120', 10),
      };
      res.json({ settings: effectiveSettings });
    } catch (err) {
      logger.error('Error en /settings:', err);
      res.status(500).json({ error: 'Error al obtener settings' });
    }
  });

  router.post('/settings', requireAuth, async (req, res) => {
    if (req.user?.role !== 'global_admin') {
      return res.status(403).json({ error: 'Solo el administrador global tiene acceso a la configuración global.' });
    }
    try {
      const newSettings = req.body;
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      const updates = {
        DISCORD_GUILD_ID: newSettings.discordGuildId,
        DISCORD_LINK_CHANNEL_ID: newSettings.discordLinkChannelId,
        DISCORD_MATCHES_CHANNEL_ID: newSettings.discordMatchesChannelId,
        DISCORD_ROLES_CHANNEL_ID: newSettings.discordRolesChannelId,
        DISCORD_STATUS_CHANNEL_ID: newSettings.discordStatusChannelId,
        DISCORD_WAITING_ROOM_CHANNEL_ID: newSettings.discordWaitingRoomChannelId,
        DISCORD_ADMIN_ALERTS_CHANNEL_ID: newSettings.discordAdminAlertsChannelId,
        DISCORD_SUPPORT_CHANNEL_ID: newSettings.discordSupportChannelId,
        FACEIT_HUB_ID: newSettings.faceitHubId,
        FACEIT_LEADERBOARD_ID: newSettings.faceitLeaderboardId,
        ADMIN_ROLE_NAME: newSettings.adminRoleName,
        MATCH_TIMEOUT_MINUTES: newSettings.matchTimeoutMinutes,
      };

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
          process.env[key] = value;
          env[key] = value;
        }
      }

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
      await db.addLogEntry('info', 'La configuración del bot (.env) fue actualizada desde el panel web.', 'system');

      try {
        const { checkAndDeploySupportPanel } = await import('../events/ready.js');
        checkAndDeploySupportPanel(client, db).catch(e => logger.error('Error al autodesplegar panel desde API:', e.message));
      } catch (err) {
        logger.error('Error al importar checkAndDeploySupportPanel en API:', err.message);
      }

      res.json({ success: true, settings: newSettings });
    } catch (err) {
      logger.error('Error en POST /settings:', err);
      res.status(500).json({ error: 'Error al guardar settings en .env' });
    }
  });

  // --- Feature Flags (toggle individual, soporta per-guild) ---
  router.post('/features/:key', requireAuth, async (req, res) => {
    try {
      const key = req.params.key;
      const { enabled } = req.body;
      const targetGuildId = resolveTargetGuildId(req);

      if (targetGuildId) {
        // Per-guild feature toggle
        const guildSettings = await db.getGuildSettings(targetGuildId);
        guildSettings[key] = enabled === true;
        await db.setGuildSettings(targetGuildId, guildSettings);
        const statusStr = guildSettings[key] ? 'activado' : 'desactivado';
        await db.addLogEntry(guildSettings[key] ? 'success' : 'warn', `El servicio "${key}" fue ${statusStr} para el servidor ${targetGuildId} desde el panel web.`, 'system', targetGuildId);
        res.json({ success: true, key, enabled: guildSettings[key] });
      } else {
        // Global feature toggle (solo global_admin)
        if (req.user?.role !== 'global_admin') {
          return res.status(403).json({ error: 'Solo el administrador global puede modificar la configuración global.' });
        }
        const settings = await getSettings(true);
        settings[key] = enabled === true;
        await db.setSettings(settings);
        invalidateSettingsCache();
        const statusStr = settings[key] ? 'activado' : 'desactivado';
        await db.addLogEntry(settings[key] ? 'success' : 'warn', `El servicio "${key}" fue ${statusStr} desde el panel web.`, 'system');
        res.json({ success: true, key, enabled: settings[key] });
      }
    } catch (err) {
      logger.error('Error en /features/:key:', err);
      res.status(500).json({ error: 'Error al actualizar feature flag' });
    }
  });

  // --- Historial de Partidas ---
  router.get('/matches/history', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : null;
      const history = await db.getMatchHistory(limit, targetGuildId);
      res.json({ history });
    } catch (err) {
      logger.error('Error en GET /matches/history:', err);
      res.status(500).json({ error: 'Error al obtener el historial de partidas' });
    }
  });

  // --- Simular Webhook de Faceit ---
  router.post('/simulate-webhook', requireAuth, async (req, res) => {
    if (req.user?.role !== 'global_admin') {
      return res.status(403).json({ error: 'Solo el administrador global tiene acceso a esta acción.' });
    }
    try {
      const payload = req.body;
      const { handleFaceitWebhook } = await import('../webhooks/faceit.js');
      
      // Procesar de manera asíncrona para no demorar la respuesta de la API
      handleFaceitWebhook(payload, client, db)
        .then(() => logger.success(`Webhook simulado ${payload.event} procesado exitosamente.`))
        .catch(err => logger.error(`Error procesando Webhook simulado: ${err.message}`));

      res.json({ success: true, message: `Evento ${payload.event} enviado al bot para procesamiento.` });
    } catch (err) {
      logger.error('Error en /simulate-webhook:', err);
      res.status(500).json({ error: 'Error interno al simular el webhook' });
    }
  });

  // --- Logs del bot ---
  router.get('/logs', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : null;
      const logs = await db.getRecentLogs(limit, targetGuildId);
      res.json({ logs });
    } catch (err) {
      logger.error('Error en /logs:', err);
      res.status(500).json({ error: 'Error al obtener logs' });
    }
  });

  // --- Forzar actualización del panel de partidas ---
  router.post('/panel/refresh', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      let channelId;
      if (targetGuildId) {
        const guildConfig = await getEffectiveConfigForGuild(targetGuildId);
        channelId = guildConfig.discordMatchesChannelId;
      } else {
        const settings = await getSettings();
        channelId = settings.discordMatchesChannelId || process.env.DISCORD_MATCHES_CHANNEL_ID;
      }
      if (channelId) {
        await updateLivePanel(client, channelId, db);
        res.json({ success: true, message: 'Panel actualizado' });
      } else {
        res.status(400).json({ error: 'Canal de partidas no configurado para este servidor' });
      }
    } catch (err) {
      logger.error('Error en /panel/refresh:', err);
      res.status(500).json({ error: 'Error al actualizar panel' });
    }
  });

  // --- Estado del bot ---
  router.get('/status', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req) || DISCORD_GUILD_ID;
      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      res.json({
        discordConnected: client.readyAt ? true : false,
        guildName: guild?.name || null,
        guildMemberCount: guild?.memberCount || null,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (err) {
      logger.error('Error en /status:', err);
      res.status(500).json({ error: 'Error al obtener estado' });
    }
  });

  // --- Mensajes Masivos (Mass DM) ---
  router.post('/broadcast', requireAuth, async (req, res) => {
    if (req.user?.role !== 'global_admin') {
      return res.status(403).json({ error: 'Solo el administrador global tiene acceso a esta acción.' });
    }
    try {
      const { message, discordId } = req.body;
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      }

      // --- Envío individual ---
      if (discordId) {
        try {
          const user = await client.users.fetch(discordId).catch(() => null);
          if (!user) {
            return res.status(404).json({ error: 'No se encontró el usuario de Discord.' });
          }
          await user.send(message);
          await db.addLogEntry('info', `Mensaje directo enviado al usuario ${discordId}.`, 'bot');
          return res.json({ success: true, message: `Mensaje enviado correctamente a ${user.username}.` });
        } catch (e) {
          return res.status(500).json({ error: 'No se pudo enviar el mensaje. El usuario puede tener los DMs desactivados.' });
        }
      }

      // --- Envío masivo ---
      const snapshot = await db._firestore.collection('faceit_users').get();
      if (snapshot.empty) {
        return res.json({ success: true, message: 'No hay usuarios verificados en la base de datos.' });
      }

      const discordIds = snapshot.docs.map(doc => doc.id);
      let sentCount = 0;
      let failedCount = 0;

      res.json({ success: true, message: `Iniciando envío a ${discordIds.length} usuarios en segundo plano.` });

      (async () => {
        for (const id of discordIds) {
          try {
            const user = await client.users.fetch(id).catch(() => null);
            if (user) {
              await user.send(message);
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (e) {
            failedCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await db.addLogEntry('info', `Broadcast finalizado. Enviados: ${sentCount}, Fallidos: ${failedCount}`, 'bot');
      })();

    } catch (err) {
      logger.error('Error en /broadcast:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al iniciar el envío de mensajes' });
      }
    }
  });

  // --- Llamadas de soporte ---
  router.get('/support-calls', requireAuth, async (req, res) => {
    try {
      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : null;
      const calls = await db.getSupportCalls(50, targetGuildId);
      res.json({ calls });
    } catch (err) {
      logger.error('Error en GET /support-calls:', err);
      res.status(500).json({ error: 'Error al obtener llamadas de soporte' });
    }
  });

  router.post('/support-calls/:id/resolve', requireAuth, async (req, res) => {
    try {
      const supportId = req.params.id;
      const callData = await db.getSupportCall(supportId);
      if (!callData) {
        return res.status(404).json({ error: 'No se encontró la solicitud de soporte' });
      }

      if (req.user?.role === 'admin' && callData.guild_id !== req.user.servidor) {
        return res.status(403).json({ error: 'No autorizado para resolver solicitudes de otros servidores.' });
      }

      if (callData.status === 'atendida') {
        return res.status(400).json({ error: 'La solicitud ya está atendida' });
      }

      // Marcar como atendida en Firebase indicando que fue resuelta desde el Panel Web
      const adminName = req.user?.username || 'Panel Web Admin';
      await db.claimSupportCall(supportId, `WebAdmin (${adminName})`);

      // Notificar al jugador por DM
      try {
        const playerUser = await client.users.fetch(callData.discord_id).catch(() => null);
        if (playerUser) {
          await playerUser.send(
            `✅ **Tu solicitud de soporte ha sido aceptada** por el administrador **${adminName}** desde el panel web.\n` +
            `Se pondrá en contacto contigo o ingresará a tu canal de voz a la brevedad.`
          ).catch(() => {});
        }
      } catch (dmErr) {
        logger.warn('No se pudo enviar notificación DM al jugador desde API:', dmErr.message);
      }

      // Intentar buscar el mensaje en Discord para eliminarlo de las alertas
      try {
        const adminAlertsChannelId = env.DISCORD_ADMIN_ALERTS_CHANNEL_ID;
        if (adminAlertsChannelId) {
          const alertsChannel = await client.channels.fetch(adminAlertsChannelId).catch(() => null);
          if (alertsChannel) {
            // Buscar en los últimos 50 mensajes del canal el mensaje correspondiente al embed con este supportId
            const messages = await alertsChannel.messages.fetch({ limit: 50 }).catch(() => []);
            const targetMsg = messages.find(m => 
              m.components?.[0]?.components?.[0]?.customId === `admin_respond_btn_${supportId}`
            );
            if (targetMsg) {
              await targetMsg.delete().catch(() => {});
            }
          }
        }
      } catch (err) {
        logger.warn('No se pudo borrar el mensaje de alerta en Discord:', err.message);
      }

      await db.addLogEntry('info', `Solicitud de soporte ${supportId} marcada como atendida desde el panel web.`, 'system');
      res.json({ success: true });
    } catch (err) {
      logger.error('Error en POST /support-calls/:id/resolve:', err);
      res.status(500).json({ error: 'Error al resolver la solicitud de soporte' });
    }
  });

  // --- Plantillas de mensajes ---
  router.get('/messages', requireAuth, async (req, res) => {
    try {
      const templates = await db.getMessageTemplates();
      res.json({ templates });
    } catch (err) {
      logger.error('Error en GET /messages:', err);
      res.status(500).json({ error: 'Error al obtener plantillas de mensajes' });
    }
  });

  router.post('/messages', requireAuth, async (req, res) => {
    if (req.user?.role !== 'global_admin') {
      return res.status(403).json({ error: 'Solo el administrador global tiene acceso a las plantillas de mensajes.' });
    }
    try {
      const newTemplates = req.body;
      await db.setMessageTemplates(newTemplates);
      await db.addLogEntry('info', 'Plantillas de mensajes actualizadas desde el panel web.', 'system');
      res.json({ success: true, templates: newTemplates });
    } catch (err) {
      logger.error('Error en POST /messages:', err);
      res.status(500).json({ error: 'Error al guardar plantillas de mensajes' });
    }
  });

  // --- Servidores (Guilds) ---
  router.get('/guilds', requireAuth, async (req, res) => {
    try {
      let guilds = client.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || null,
        memberCount: g.memberCount
      }));

      if (req.user?.role === 'admin') {
        guilds = guilds.filter(g => g.id === req.user.servidor);
      }

      res.json({ guilds });
    } catch (err) {
      logger.error('Error en GET /guilds:', err);
      res.status(500).json({ error: 'Error al obtener servidores' });
    }
  });

  // --- Obtener configuración de un servidor específico ---
  router.get('/guilds/:guildId/settings', requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      if (req.user?.role === 'admin' && req.user.servidor !== guildId) {
        return res.status(403).json({ error: 'No autorizado para gestionar este servidor.' });
      }
      const { getEffectiveConfigForGuild } = await import('../config/index.js');
      const settings = await getEffectiveConfigForGuild(guildId);
      res.json({ settings });
    } catch (err) {
      logger.error(`Error en GET /guilds/${req.params.guildId}/settings:`, err);
      res.status(500).json({ error: 'Error al obtener la configuración del servidor' });
    }
  });

  // --- Actualizar configuración de un servidor específico ---
  router.post('/guilds/:guildId/settings', requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      if (req.user?.role === 'admin' && req.user.servidor !== guildId) {
        return res.status(403).json({ error: 'No autorizado para gestionar este servidor.' });
      }
      const newSettings = req.body;
      
      const success = await db.setGuildSettings(guildId, newSettings);
      if (success) {
        await db.addLogEntry('info', `Configuración del servidor ${guildId} actualizada desde el panel web.`, 'system');
        res.json({ success: true, settings: newSettings });
      } else {
        res.status(500).json({ error: 'No se pudo guardar la configuración del servidor' });
      }
    } catch (err) {
      logger.error(`Error en POST /guilds/${req.params.guildId}/settings:`, err);
      res.status(500).json({ error: 'Error al guardar la configuración del servidor' });
    }
  });

  return router;
}
