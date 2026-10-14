import { Router } from 'express';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { verifyAdminToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getSettings, invalidateSettingsCache } from '../utils/featureFlags.js';
import { syncMemberLevelRole, getOrCreateSpecialRole, getOrCreateLevelRole, getPlayerSkillLevel, syncMemberNickname } from '../services/roles.js';
import { fetchFaceitPlayer, fetchFaceitPlayerById } from '../services/faceitApi.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { cleanupVoiceChannel } from '../services/voice.js';
import { env } from '../config/index.js';
import { fetchFaceitStats, fetchPlayerHistory, fetchHubInfo, fetchLeaderboard, fetchLatestSeasonPoints, fetchCurrentHubSeason } from '../services/faceitApi.js';
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

  const getHistoryMatchById = async (matchId, guildId = null) => {
    let query = db._firestore.collection('faceit_matches_history').where('id', '==', matchId);
    if (guildId) query = query.where('guild_id', '==', guildId);
    const snapshot = await query.limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  };

  const resolveMatchesChannel = async (guildId) => {
    const effectiveConfig = guildId ? await getEffectiveConfigForGuild(guildId) : await getEffectiveConfig();
    const channelIds = (effectiveConfig.discordMatchesChannelId || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    for (const channelId of channelIds) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel && (!guildId || channel.guild?.id === guildId)) {
        return { channel, channelId };
      }
    }

    return { channel: null, channelId: null };
  };

  const rosterLine = (player, index) => {
    const mention = player.discord_id ? `<@${player.discord_id}>` : `\`${player.nickname || `Jugador ${index + 1}`}\``;
    return `${index + 1}. ${mention}${player.nickname ? ` (${player.nickname})` : ''}`;
  };

  const buildMixtonAnnouncement = (match, { includeResultButtons = true } = {}) => {
    const rosterA = match.faction1_roster || [];
    const rosterB = match.faction2_roster || [];
    const isMixton = typeof match.id === 'string' && match.id.startsWith('mixton_');
    const title = isMixton ? 'Partida Mixton Iniciada' : 'Partida Manual Iniciada';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(isMixton ? 0xFF5500 : 0x00FF55)
      .setDescription('Anuncio enviado manualmente desde el panel admin.')
      .addFields(
        { name: 'Modo', value: `\`${match.entity_custom_name || (isMixton ? 'Mixton / Web' : 'Manual / Web')}\``, inline: true },
        { name: 'Mapa', value: `\`${match.map || 'Mixton'}\``, inline: true },
        { name: 'Servidor', value: `\`${match.location || 'Mixton'}\``, inline: true },
        { name: match.faction1_name || 'Equipo A', value: rosterA.map(rosterLine).join('\n') || 'Sin jugadores', inline: false },
        { name: match.faction2_name || 'Equipo B', value: rosterB.map(rosterLine).join('\n') || 'Sin jugadores', inline: false }
      )
      .setFooter({ text: includeResultButtons ? 'Usa los botones para reportar el resultado de la partida' : 'Partida ya registrada en historial' })
      .setTimestamp();

    if (!includeResultButtons) {
      const winnerName = match.winner === 'faction1'
        ? match.faction1_name
        : match.winner === 'faction2'
          ? match.faction2_name
          : 'Sin ganador registrado';
      embed.addFields({ name: 'Resultado', value: `${match.faction1_score ?? '-'} - ${match.faction2_score ?? '-'} | Ganador: **${winnerName}**`, inline: false });
      return { embed, components: [] };
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`manual_match_win_a_${match.id}`)
        .setLabel(`Gano ${match.faction1_name || 'Equipo A'}`.slice(0, 80))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`manual_match_win_b_${match.id}`)
        .setLabel(`Gano ${match.faction2_name || 'Equipo B'}`.slice(0, 80))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`manual_match_cancel_${match.id}`)
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Danger)
    );

    return { embed, components: [row] };
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
      const targetGuildId = resolveTargetGuildId(req);
      const snapshot = await db._firestore.collection('faceit_users').get();
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const userGuild = data.guild_id || data.servidor || data.mixton_guild_id || null;
        if (targetGuildId && userGuild !== targetGuildId) {
          return;
        }
        users.push({ discordId: data.discordId || doc.id, ...data });
      });

      if (users.length === 0) {
        return res.json({ success: true, message: 'No hay usuarios para sincronizar.' });
      }

      const syncGuildId = targetGuildId || DISCORD_GUILD_ID;
      res.json({ success: true, message: `Sincronización iniciada en segundo plano para ${users.length} usuarios.` });

      (async () => {
        logger.info(`Iniciando sincronización de roles para ${users.length} usuarios en guild ${syncGuildId}...`);
        const guild = await client.guilds.fetch(syncGuildId).catch(() => null);
        if (!guild) {
          logger.error(`No se pudo obtener la guild ${syncGuildId} para la sincronización.`);
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        const effectiveConfig = await getEffectiveConfigForGuild(targetGuildId);
        const currentSeason = await fetchCurrentHubSeason(effectiveConfig.faceitLeaderboardId || effectiveConfig.faceitHubId).catch(() => null);

        for (const user of users) {
          try {
            await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay to respect API limits

            if (!user.faceit_player_id) continue;
            const playerData = await fetchFaceitPlayerById(user.faceit_player_id);
            const currentLevel = getPlayerSkillLevel(playerData);
            const elo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;

            if (currentLevel) {
              await syncMemberLevelRole(guild, user.discordId, currentLevel);
              await db.updatePlayerStats(user.discordId, currentLevel, elo, targetGuildId, currentSeason);
            }
            const faceitNick = playerData.nickname || user.faceit_nickname || user.nickname;
            if (faceitNick) {
              await syncMemberNickname(guild, user.discordId, faceitNick);
            }
            successCount++;
          } catch (err) {
            errorCount++;
            logger.error(`Error al sincronizar usuario ${user.faceit_nickname} (${user.discordId}) en sync-all:`, err.message);
          }
        }

        logger.success(`Sincronización completada. Éxito: ${successCount}, Errores: ${errorCount}`);
        await db.addLogEntry('success', `Sincronización completada. Éxito: ${successCount}, Errores: ${errorCount}`, 'system', targetGuildId);
      })();
    } catch (err) {
      logger.error('Error en POST /users/sync-all:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al iniciar la sincronización' });
      }
    }
  });

  // --- Sincronizar únicamente apodos de todos los usuarios ---
  router.post('/users/sync-nicks', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const snapshot = await db._firestore.collection('faceit_users').get();
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const userGuild = data.guild_id || data.servidor || data.mixton_guild_id || null;
        if (targetGuildId && userGuild !== targetGuildId) {
          return;
        }
        users.push({ discordId: data.discordId || doc.id, ...data });
      });

      if (users.length === 0) {
        return res.json({ success: true, message: 'No hay usuarios para sincronizar.' });
      }

      const syncGuildId = targetGuildId || DISCORD_GUILD_ID;
      res.json({ success: true, message: `Sincronización de apodos iniciada en segundo plano para ${users.length} usuarios.` });

      (async () => {
        logger.info(`Iniciando sincronización de apodos para ${users.length} usuarios en guild ${syncGuildId}...`);
        const guild = await client.guilds.fetch(syncGuildId).catch(() => null);
        if (!guild) {
          logger.error(`No se pudo obtener la guild ${syncGuildId} para la sincronización de apodos.`);
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
          try {
            await new Promise(resolve => setTimeout(resolve, 150));
            const faceitNick = user.faceit_nickname || user.nickname;
            if (faceitNick) {
              const ok = await syncMemberNickname(guild, user.discordId, faceitNick);
              if (ok) successCount++;
              else errorCount++;
            }
          } catch (err) {
            errorCount++;
            logger.error(`Error al sincronizar apodo para ${user.faceit_nickname || user.discordId}:`, err.message);
          }
        }

        logger.success(`Sincronización de apodos completada. Éxito: ${successCount}, Errores: ${errorCount}`);
        await db.addLogEntry('success', `Sincronización de apodos completada. Éxito: ${successCount}, Errores: ${errorCount}`, 'system', targetGuildId);
      })();
    } catch (err) {
      logger.error('Error en POST /users/sync-nicks:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al iniciar la sincronización de apodos' });
      }
    }
  });

  // --- Sincronizar apodo de un usuario específico ---
  router.post('/users/:id/sync-nick', requireAuth, async (req, res) => {
    try {
      const discordId = req.params.id;
      const user = await db.getFullUser(discordId);
      if (!user || (!user.faceit_nickname && !user.nickname)) {
        return res.status(404).json({ error: 'Usuario no encontrado o sin apodo de Faceit vinculado.' });
      }

      const targetGuildId = resolveTargetGuildId(req);
      const guildIdToUse = targetGuildId || user.guild_id || user.servidor || DISCORD_GUILD_ID;
      const guild = await client.guilds.fetch(guildIdToUse).catch(() => null);

      if (!guild) {
        return res.status(500).json({ error: 'No se pudo acceder al servidor de Discord.' });
      }

      const faceitNick = user.faceit_nickname || user.nickname;
      const success = await syncMemberNickname(guild, discordId, faceitNick);

      if (success) {
        return res.json({ success: true, message: `Apodo de <@${discordId}> sincronizado a '${faceitNick}'` });
      } else {
        return res.status(400).json({ error: 'No se pudo actualizar el apodo. Verifica que el bot tenga permisos superiores al usuario.' });
      }
    } catch (err) {
      logger.error('Error en POST /users/:id/sync-nick:', err);
      res.status(500).json({ error: 'Error al sincronizar apodo' });
    }
  });

  // --- Exportar copia de seguridad de usuarios ---
  router.get('/users/backup', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const snapshot = await db._firestore.collection('faceit_users').get();
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const userGuild = data.guild_id || data.servidor || data.mixton_guild_id || null;
        if (targetGuildId && userGuild !== targetGuildId) {
          return;
        }
        users.push({
          discordId: data.discordId || doc.id,
          ...data
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

      const targetGuildId = resolveTargetGuildId(req);
      const batch = db._firestore.batch();
      const usersCol = db._firestore.collection('faceit_users');
      let restoredCount = 0;

      for (const u of users) {
        if (!u.discordId) continue;
        
        const rawDiscordId = u.discordId.includes('_') ? u.discordId.split('_').pop() : u.discordId;
        let docId;
        const data = { ...u };
        delete data.discordId;

        if (targetGuildId) {
          docId = `${targetGuildId}_${rawDiscordId}`;
          data.guild_id = targetGuildId;
          if (data.servidor) data.servidor = targetGuildId;
          if (data.mixton_guild_id) data.mixton_guild_id = targetGuildId;
        } else {
          docId = u.discordId;
        }

        const docRef = usersCol.doc(docId);

        // Convertir strings de tiempo o estructuras serializadas a timestamp de Firestore
        if (data.linkedAt && data.linkedAt._seconds) {
          data.linkedAt = new admin.firestore.Timestamp(data.linkedAt._seconds, data.linkedAt._nanoseconds || 0);
        } else if (data.linkedAt) {
          data.linkedAt = new Date(data.linkedAt);
        }
        
        batch.set(docRef, data, { merge: true });
        restoredCount++;
      }

      await batch.commit();
      await db.addLogEntry('info', `Backup de usuarios importado: ${restoredCount} vinculaciones actualizadas.`, 'system', targetGuildId);
      res.json({ success: true, message: `Backup importado con éxito: ${restoredCount} vinculaciones restauradas.` });
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
      const effectiveConfig = await getEffectiveConfigForGuild(targetGuildId || req.guildId);
      const currentSeason = await fetchCurrentHubSeason(effectiveConfig.faceitLeaderboardId || effectiveConfig.faceitHubId).catch(() => null);
      await db.linkAccounts(discordId, player.player_id, player.nickname, skillLevel, elo, targetGuildId || req.guildId, currentSeason);
      
      // Asignar el servidor y rol por defecto 'usuario'
      await db.setUserRoleAndGuild(discordId, 'usuario', targetGuildId);

      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      if (guild) {
        if (skillLevel) {
          await syncMemberLevelRole(guild, discordId, skillLevel);
        }
        await syncMemberNickname(guild, discordId, player.nickname);
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

  // --- Listar roles del servidor de Discord ---
  router.get('/discord/roles', requireAuth, async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const guildIdToUse = targetGuildId || (env.DISCORD_GUILD_ID || DISCORD_GUILD_ID);
      const guild = guildIdToUse ? await client.guilds.fetch(guildIdToUse).catch(() => null) : null;
      if (!guild) return res.json({ roles: [] });
      await guild.roles.fetch().catch(() => null);
      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ roles });
    } catch (err) {
      logger.error('Error al listar roles de Discord:', err);
      res.status(500).json({ error: 'Error al obtener roles de Discord' });
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

  router.post('/matches/:id/announce-mixton', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      const targetGuildId = resolveTargetGuildId(req);
      let match = await db.getActiveMatch(matchId);
      let isActive = true;

      if (!match) {
        match = await getHistoryMatchById(matchId, targetGuildId);
        isActive = false;
      }

      if (!match) {
        return res.status(404).json({ error: 'No se encontro la partida en activas ni en historial.' });
      }

      const matchGuildId = match.guild_id || targetGuildId || DISCORD_GUILD_ID;
      if (targetGuildId && match.guild_id && match.guild_id !== targetGuildId) {
        return res.status(403).json({ error: 'No autorizado para anunciar partidas de otros servidores.' });
      }

      if (!String(match.id || matchId).startsWith('mixton_') && !String(match.id || matchId).startsWith('manual_')) {
        return res.status(400).json({ error: 'Esta accion solo aplica a partidas mixton o manuales.' });
      }

      const { channel, channelId } = await resolveMatchesChannel(matchGuildId);
      if (!channel) {
        return res.status(400).json({ error: 'No se encontro un canal de partidas configurado para este servidor.' });
      }

      const { embed, components } = buildMixtonAnnouncement(match, { includeResultButtons: isActive });
      const mentions = [...(match.faction1_roster || []), ...(match.faction2_roster || [])]
        .map(p => p.discord_id ? `<@${p.discord_id}>` : null)
        .filter(Boolean)
        .join(' ');
      const content = isActive
        ? `Partida mixton iniciada. ${mentions}`.trim()
        : `Resumen de partida mixton registrada en historial.`;

      const msg = await channel.send({ content, embeds: [embed], components });
      if (isActive) {
        await db.updateActiveMatchVoiceAndMessage(
          match.id,
          match.faction1_vc_id || null,
          match.faction2_vc_id || null,
          msg.id
        ).catch(err => logger.warn('No se pudo actualizar message_id de la partida anunciada:', err.message));
        await updateLivePanel(client, channelId, db).catch(err => logger.warn('No se pudo refrescar panel tras anuncio manual:', err.message));
      }

      await db.addLogEntry('info', `Anuncio manual de partida ${match.id || matchId} enviado desde panel admin por ${req.user?.username}.`, 'system', matchGuildId);
      return res.json({ success: true, messageId: msg.id, channelId, isActive });
    } catch (err) {
      logger.error('Error en POST /matches/:id/announce-mixton:', err);
      return res.status(500).json({ error: 'Error al enviar el anuncio manual de mixton.' });
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
        await db.removeActiveMatch(matchId);
        const effectiveConfig = await getEffectiveConfigForGuild(guildIdToUse);
        const waitingRoomId = effectiveConfig.discordWaitingRoomChannelId;
        const originalStates = match.original_voice_states || {};
        for (const vcId of [match.faction1_vc_id, match.faction2_vc_id]) {
          if (vcId) {
            await cleanupVoiceChannel(guild, vcId, waitingRoomId, originalStates, 'Cleanup forzado desde Admin Panel', true);
          }
        }
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

  router.all(['/points', '/club/points'], async (req, res) => {
    try {
      const targetGuildId = resolveTargetGuildId(req);
      const effectiveConfig = targetGuildId
        ? await getEffectiveConfigForGuild(targetGuildId)
        : await getEffectiveConfig();

      const clubId = req.query.club_id || req.query.clubId || req.body?.club_id || req.body?.clubId || effectiveConfig.faceitHubId || env.FACEIT_HUB_ID;
      const queueId = req.query.queue_id || req.query.queueId || req.body?.queue_id || req.body?.queueId || effectiveConfig.faceitLeaderboardId || env.FACEIT_LEADERBOARD_ID;
      const nickname = req.query.nickname || req.query.player || req.body?.nickname || req.body?.player;
      const playerId = req.query.player_id || req.query.playerId || req.body?.player_id || req.body?.playerId;
      const limit = req.query.limit || req.body?.limit;
      const offset = req.query.offset || req.body?.offset;

      const result = await fetchLatestSeasonPoints(clubId, queueId, {
        limit,
        offset,
        nickname,
        playerId
      });

      res.json(result);
    } catch (err) {
      logger.error('Error en GET /api/admin/points:', err);
      if (err.message === 'NO_LEADERBOARD_FOUND') {
        return res.status(404).json({ error: 'No se encontró la tabla de posiciones para la última temporada.' });
      }
      res.status(500).json({ error: 'Error al consultar los puntos de la tabla.' });
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
        discordMixtonChannelId: settings.discordMixtonChannelId || process.env.DISCORD_MIXTON_CHANNEL_ID || env.DISCORD_MIXTON_CHANNEL_ID || '',
        discordRolesChannelId: settings.discordRolesChannelId || process.env.DISCORD_ROLES_CHANNEL_ID || env.DISCORD_ROLES_CHANNEL_ID,
        discordStatusChannelId: settings.discordStatusChannelId || process.env.DISCORD_STATUS_CHANNEL_ID || env.DISCORD_STATUS_CHANNEL_ID,
        discordWaitingRoomChannelId: settings.discordWaitingRoomChannelId || process.env.DISCORD_WAITING_ROOM_CHANNEL_ID || env.DISCORD_WAITING_ROOM_CHANNEL_ID,
        discordAdminAlertsChannelId: settings.discordAdminAlertsChannelId || process.env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || env.DISCORD_ADMIN_ALERTS_CHANNEL_ID || '',
        discordSanctionsChannelId: settings.discordSanctionsChannelId || process.env.DISCORD_SANCTIONS_CHANNEL_ID || env.DISCORD_SANCTIONS_CHANNEL_ID || '',
        discordSupportChannelId: settings.discordSupportChannelId || process.env.DISCORD_SUPPORT_CHANNEL_ID || env.DISCORD_SUPPORT_CHANNEL_ID || '',
        discordMusicChannelId: settings.discordMusicChannelId || process.env.DISCORD_MUSIC_CHANNEL_ID || env.DISCORD_MUSIC_CHANNEL_ID || '',
        discordMatchAccessRoleId: settings.discordMatchAccessRoleId || process.env.DISCORD_MATCH_ACCESS_ROLE_ID || env.DISCORD_MATCH_ACCESS_ROLE_ID || '',
        hubRoleId: settings.hubRoleId || process.env.FACEIT_HUB_ROLE_ID || env.FACEIT_HUB_ROLE_ID || '',
        discordHubRoleId: settings.discordHubRoleId || process.env.DISCORD_HUB_ROLE_ID || env.DISCORD_HUB_ROLE_ID || '',
        faceitHubId: settings.faceitHubId || process.env.FACEIT_HUB_ID || env.FACEIT_HUB_ID,
        faceitLeaderboardId: settings.faceitLeaderboardId || process.env.FACEIT_LEADERBOARD_ID || env.FACEIT_LEADERBOARD_ID || '',
        adminRoleId: settings.adminRoleId || settings.adminRoleName || process.env.ADMIN_ROLE_ID || env.ADMIN_ROLE_ID || '',
        matchTimeoutMinutes: settings.matchTimeoutMinutes || parseInt(process.env.MATCH_TIMEOUT_MINUTES || '120', 10),
        queues: settings.queues || [],
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
        DISCORD_MIXTON_CHANNEL_ID: newSettings.discordMixtonChannelId,
        DISCORD_ROLES_CHANNEL_ID: newSettings.discordRolesChannelId,
        DISCORD_STATUS_CHANNEL_ID: newSettings.discordStatusChannelId,
        DISCORD_WAITING_ROOM_CHANNEL_ID: newSettings.discordWaitingRoomChannelId,
        DISCORD_ADMIN_ALERTS_CHANNEL_ID: newSettings.discordAdminAlertsChannelId,
        DISCORD_SANCTIONS_CHANNEL_ID: newSettings.discordSanctionsChannelId,
        DISCORD_SUPPORT_CHANNEL_ID: newSettings.discordSupportChannelId,
        DISCORD_MUSIC_CHANNEL_ID: newSettings.discordMusicChannelId,
        DISCORD_MATCH_ACCESS_ROLE_ID: newSettings.discordMatchAccessRoleId,
        FACEIT_HUB_ROLE_ID: newSettings.hubRoleId,
        DISCORD_HUB_ROLE_ID: newSettings.discordHubRoleId,
        FACEIT_HUB_ID: newSettings.faceitHubId,
        FACEIT_LEADERBOARD_ID: newSettings.faceitLeaderboardId,
        ADMIN_ROLE_ID: newSettings.adminRoleId ?? newSettings.adminRoleName,
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

      const firestoreUpdates = {};
      if (newSettings.queues !== undefined) firestoreUpdates.queues = newSettings.queues;
      if (newSettings.hubRoleId !== undefined) firestoreUpdates.hubRoleId = newSettings.hubRoleId;
      if (newSettings.discordHubRoleId !== undefined) firestoreUpdates.discordHubRoleId = newSettings.discordHubRoleId;
      if (newSettings.discordMatchAccessRoleId !== undefined) firestoreUpdates.discordMatchAccessRoleId = newSettings.discordMatchAccessRoleId;

      if (Object.keys(firestoreUpdates).length > 0) {
        await db.setSettings(firestoreUpdates);
        db.invalidateSettingsCache();
        invalidateSettingsCache();
      }

      await db.addLogEntry('info', 'La configuración del bot (.env y queues) fue actualizada desde el panel web.', 'system');

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
        db.invalidateSettingsCache();
        invalidateSettingsCache();
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
        db.invalidateSettingsCache();
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
      const targetGuildId = resolveTargetGuildId(req);
      const history = await db.getMatchHistory(limit, targetGuildId);
      res.json({ history });
    } catch (err) {
      logger.error('Error en GET /matches/history:', err);
      res.status(500).json({ error: 'Error al obtener el historial de partidas' });
    }
  });

  router.delete('/matches/history/:id', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      const success = await db.deleteMatchFromHistory(matchId);
      if (success) {
        await db.addLogEntry('info', `La partida ${matchId} fue eliminada del historial desde el panel.`, 'system');
        res.json({ success: true, message: 'Partida eliminada del historial con éxito' });
      } else {
        res.status(404).json({ error: 'No se encontró la partida en el historial o no pudo eliminarse' });
      }
    } catch (err) {
      logger.error('Error en DELETE /matches/history/:id:', err);
      res.status(500).json({ error: 'Error al eliminar la partida del historial' });
    }
  });

  router.get('/matches/:id/demo', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      if (matchId.startsWith('mixton_') || matchId.startsWith('manual_')) {
        const match = await db.getActiveMatch(matchId);
        return res.json({ demo_url: match?.demo_url || null });
      }

      if (env.FACEIT_API_KEY) {
        const fRes = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        });
        if (fRes.ok) {
          const data = await fRes.json();
          const demoUrl = Array.isArray(data.demo_url) ? data.demo_url[0] : (data.demo_url || null);
          return res.json({
            demo_url: demoUrl,
            faceit_url: data.faceit_url || `https://www.faceit.com/en/cs2/room/${matchId}`
          });
        }
      }
      res.json({ demo_url: null });
    } catch (err) {
      logger.error('Error en GET /matches/:id/demo:', err);
      res.status(500).json({ error: 'Error al obtener la demo de la partida' });
    }
  });

  router.get('/matches/:id/stats', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      if (!matchId.startsWith('mixton_') && !matchId.startsWith('manual_') && env.FACEIT_API_KEY) {
        const fRes = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}/stats`, {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        });
        if (fRes.ok) {
          const statsData = await fRes.json();
          return res.json({ success: true, stats: statsData });
        }
      }
      res.json({ success: false, stats: null });
    } catch (err) {
      logger.error('Error en GET /matches/:id/stats:', err);
      res.status(500).json({ error: 'Error al obtener estadísticas de la partida' });
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
      const targetGuildId = resolveTargetGuildId(req);
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
        channelId = guildConfig.discordMixtonChannelId || guildConfig.discordMatchesChannelId;
      } else {
        const settings = await getSettings();
        channelId = settings.discordMixtonChannelId || process.env.DISCORD_MIXTON_CHANNEL_ID || settings.discordMatchesChannelId || process.env.DISCORD_MATCHES_CHANNEL_ID;
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
      const { message, discordId, imageUrl } = req.body;
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      }

      // Preparar objeto de envío
      const sendOptions = { content: message };
      if (imageUrl && imageUrl.trim() !== '') {
        sendOptions.embeds = [{
          image: { url: imageUrl.trim() }
        }];
      }

      // --- Envío individual ---
      if (discordId) {
        try {
          const user = await client.users.fetch(discordId).catch(() => null);
          if (!user) {
            return res.status(404).json({ error: 'No se encontró el usuario de Discord.' });
          }
          await user.send(sendOptions);
          await db.addLogEntry('info', `Mensaje directo enviado al usuario ${discordId}.`, 'bot');
          return res.json({ success: true, message: `Mensaje enviado correctamente a ${user.username}.` });
        } catch (e) {
          return res.status(500).json({ error: 'No se pudo enviar el mensaje. El usuario puede tener los DMs desactivados o el formato de imagen es incorrecto.' });
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
              await user.send(sendOptions);
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (e) {
            failedCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await db.addLogEntry('info', `Broadcast finalizado con imágenes. Enviados: ${sentCount}, Fallidos: ${failedCount}`, 'bot');
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
      const targetGuildId = resolveTargetGuildId(req);
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
        db.invalidateSettingsCache();
        invalidateSettingsCache();
        await db.addLogEntry('info', `Configuración del servidor ${guildId} actualizada desde el panel web.`, 'system', guildId);
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

