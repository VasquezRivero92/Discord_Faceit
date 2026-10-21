import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { verifyUserToken, optionalUserToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfig, getEffectiveConfigForGuild, env } from '../config/index.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { updateMixtonReadyPanel } from '../services/mixtonPanel.js';
import { invalidateSettingsCache, isFeatureEnabled } from '../utils/featureFlags.js';
import { EventEmitter } from 'events';
import { fetchFaceitPlayer, fetchFaceitPlayerById, fetchFaceitPlayerBySteamId, fetchFaceitHubQueues, fetchCurrentHubSeason } from '../services/faceitApi.js';
import { syncMemberLevelRole, syncMemberNickname, getPlayerSkillLevel } from '../services/roles.js';
import { cs2ServerManager } from '../services/cs2ServerManager.js';
import { playTTSCountdown } from '../utils/voiceAnnouncer.js';
import { yapeTransactionService } from '../services/yapeTransactionService.js';

export const mixtonEvents = new EventEmitter();

/**
 * Catálogo completo de mapas oficiales y competitivos de CS2.
 * Por defecto, los 7 mapas del Premier activo están en active: true.
 * Los demás (Train, Overpass, Cache, Office, Italy, Thera, Mills) están disponibles para activar/desactivar.
 */
export const CS2_CATALOG_MAPS = [
  {
    id: 'de_mirage',
    name: 'Mirage',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mirage.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_inferno',
    name: 'Inferno',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_inferno.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_inferno.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_dust2',
    name: 'Dust II',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_dust2.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_dust2.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_nuke',
    name: 'Nuke',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_nuke.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_nuke.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_ancient',
    name: 'Ancient',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_ancient.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_ancient.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_anubis',
    name: 'Anubis',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_anubis.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_anubis.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_vertigo',
    name: 'Vertigo',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_vertigo.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_vertigo.png',
    active: true,
    isOfficialPremier: true
  },
  {
    id: 'de_train',
    name: 'Train',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_train.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_train.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'de_overpass',
    name: 'Overpass',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_overpass.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_overpass.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'de_cache',
    name: 'Cache',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_cache.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_cache.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'cs_office',
    name: 'Office',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/cs_office.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/cs_office.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'cs_italy',
    name: 'Italy',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/cs_italy.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/cs_italy.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'de_thera',
    name: 'Thera',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_thera.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_thera.png',
    active: false,
    isOfficialPremier: false
  },
  {
    id: 'de_mills',
    name: 'Mills',
    image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mills.png',
    icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mills.png',
    active: false,
    isOfficialPremier: false
  }
];

export const CS2_OFFICIAL_MAP_POOL = CS2_CATALOG_MAPS.filter(m => m.isOfficialPremier);

/**
 * Obtiene el catálogo efectivo de mapas fusionando la base con la configuración guardada del lobby/servidor.
 */
export function getEffectiveMapCatalog(state) {
  if (!state || !Array.isArray(state.mapCatalog) || state.mapCatalog.length === 0) {
    return JSON.parse(JSON.stringify(CS2_CATALOG_MAPS));
  }
  const storedMapById = new Map();
  state.mapCatalog.forEach(m => {
    if (m && m.id) storedMapById.set(m.id, m);
  });

  const merged = CS2_CATALOG_MAPS.map(baseMap => {
    const stored = storedMapById.get(baseMap.id);
    if (stored) {
      return {
        ...baseMap,
        ...stored,
        active: typeof stored.active === 'boolean' ? stored.active : baseMap.active
      };
    }
    return { ...baseMap };
  });

  // Agregar mapas personalizados que haya añadido el admin
  state.mapCatalog.forEach(m => {
    if (m && m.id && !CS2_CATALOG_MAPS.some(b => b.id === m.id)) {
      merged.push({
        id: m.id,
        name: m.name || m.id,
        image: m.image || 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mirage.png',
        icon: m.icon || 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png',
        active: typeof m.active === 'boolean' ? m.active : true,
        isCustom: true
      });
    }
  });

  return merged;
}

/**
 * Obtiene la lista de mapas activos (que se verán en el veto).
 */
export function getActiveMaps(state) {
  const catalog = getEffectiveMapCatalog(state);
  const active = catalog.filter(m => m.active === true);
  if (active.length >= 2) return active;
  // Fallback de seguridad al pool Premier oficial si todos fueron desactivados
  return CS2_CATALOG_MAPS.filter(m => m.isOfficialPremier);
}

export function createLobbyRouter(client, db, config, wss) {
  const router = Router();
  const { ADMIN_JWT_SECRET, DISCORD_GUILD_ID } = config;
  const requireAuth = verifyUserToken(ADMIN_JWT_SECRET);
  const optionalAuth = optionalUserToken(ADMIN_JWT_SECRET);
  const yapeRechargeAccountLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => `yape-user:${req.user?.userId || req.user?.discordId || req.user?.id || req.ip}`,
    handler: (req, res) => res.status(429).json({ error: 'Demasiados intentos de recarga. Espera unos minutos antes de volver a intentar.' })
  });
  const yapeRechargeIpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => `yape-ip:${req.ip}`,
    handler: (req, res) => res.status(429).json({ error: 'Demasiados intentos desde esta conexión. Espera unos minutos.' })
  });

  // Middleware to attach guildId to req
  router.use((req, res, next) => {
    req.guildId = req.query.guildId || req.body.guildId || req.headers['x-guild-id'] || null;
    next();
  });

  const verifyGuildAdmin = (req, res, next) => {
    const isAllowedAdmin = req.user?.role === 'global_admin' || req.user?.role === 'admin' || req.user?.isAdmin === true;
    if (!isAllowedAdmin) {
      return res.status(403).json({ error: 'Se requieren permisos de administrador.' });
    }

    if (req.user?.role === 'admin') {
      if (req.guildId && req.guildId !== req.user.servidor) {
        return res.status(403).json({ error: 'No tienes permisos para gestionar este servidor.' });
      }
      req.guildId = req.user.servidor;
    }
    next();
  };

  const verifyGuildAccess = (req, res, next) => {
    if (req.user?.role === 'admin') {
      if (req.guildId && req.guildId !== req.user.servidor) {
        return res.status(403).json({ error: 'No tienes permisos para acceder a este servidor.' });
      }
      req.guildId = req.user.servidor;
    }
    next();
  };

  // In-memory cache for Discord user details to avoid slow API round-trips
  const discordUserCache = new Map();

  let cachedGuild = null;
  async function getGuild() {
    if (cachedGuild) return cachedGuild;
    cachedGuild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!cachedGuild) {
      cachedGuild = await client.guilds.fetch(DISCORD_GUILD_ID).catch(() => null);
    }
    return cachedGuild;
  }

  async function getDiscordUserDetails(guild, discordId) {
    if (!discordId) return null;
    if (discordUserCache.has(discordId)) {
      return discordUserCache.get(discordId);
    }
    if (!guild) return null;
    try {
      let member = guild.members.cache.get(discordId);
      if (member) {
        const details = {
          username: member.user.username,
          displayName: member.displayName,
          avatarURL: member.user.displayAvatarURL({ size: 128 })
        };
        discordUserCache.set(discordId, details);
        db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
        return details;
      }

      // No está en caché local de Discord. Lanzamos el fetch en segundo plano.
      const backgroundFetch = guild.members.fetch(discordId)
        .then(m => {
          if (m) {
            const details = {
              username: m.user.username,
              displayName: m.displayName,
              avatarURL: m.user.displayAvatarURL({ size: 128 })
            };
            discordUserCache.set(discordId, details);
            db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
            return details;
          }
          return null;
        })
        .catch(() => {
          discordUserCache.set(discordId, null);
          return null;
        });

      // Carrera de 800ms para no congelar la petición al usuario
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 800));
      const details = await Promise.race([backgroundFetch, timeoutPromise]);
      if (details) {
        return details;
      }

      // Si tardó más de 800ms, intentamos con la caché del cliente Discord
      const globalUser = client.users.cache.get(discordId);
      if (globalUser) {
        const details = {
          username: globalUser.username,
          displayName: globalUser.globalName || globalUser.username,
          avatarURL: globalUser.displayAvatarURL({ size: 128 })
        };
        discordUserCache.set(discordId, details);
        db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
        return details;
      }

      // Retornar datos temporales mientras la promesa en segundo plano sigue descargando
      return {
        username: 'usuario_discord',
        displayName: 'Usuario Discord',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    } catch (err) {
      logger.warn(`Error fetching Discord details for user ${discordId}: ${err.message}`);
      discordUserCache.set(discordId, null);
    }
    return null;
  }

  const MACHUPEEK_GUILD_ID = '1274598531759345674';

  async function getLobbyData(guildId = null) {
    const effectiveGuildId = guildId || (DISCORD_GUILD_ID && DISCORD_GUILD_ID !== '1472731390675255410' ? DISCORD_GUILD_ID : MACHUPEEK_GUILD_ID);
    const state = await db.getMixtonLobbyState(effectiveGuildId);
    state.mapCatalog = getEffectiveMapCatalog(state);
    const settings = await db.getGuildSettings(effectiveGuildId).catch(() => ({}));
    const commandEnabled = settings.command_mixton_listo !== false;

    const readyPlayers = await db.getReadyPlayers(effectiveGuildId);

    const guild = client.guilds.cache.get(effectiveGuildId) || await client.guilds.fetch(effectiveGuildId).catch(() => null);
    const guildName = 'MachuPeek';

    // Encontrar todos los discordIds ocupados
    const occupiedIds = new Set();
    state.teams.forEach(team => {
      if (team.captain && team.captain.discordId) {
        occupiedIds.add(team.captain.discordId);
      }
      if (Array.isArray(team.players)) {
        team.players.forEach(p => {
          if (p && p.discordId) {
            occupiedIds.add(p.discordId);
          }
        });
      }
    });

    const availablePlayers = { S: [], A: [], B: [], C: [] };

    const playerPromises = readyPlayers.map(async (player) => {
      const discordId = player.discordId;
      if (occupiedIds.has(discordId)) return null;

      let discordUser = null;
      const playerGuildId = player.mixton_guild_id || DISCORD_GUILD_ID;
      let playerGuild = null;
      if (playerGuildId && typeof playerGuildId === 'string' && playerGuildId.trim() !== '') {
        playerGuild = client.guilds.cache.get(playerGuildId) || await client.guilds.fetch(playerGuildId).catch(() => null);
      }
      if (playerGuild) {
        discordUser = await getDiscordUserDetails(playerGuild, discordId);
      }
      if ((!discordUser || discordUser.username === 'usuario_discord') && player.discord_avatar) {
        discordUser = {
          username: player.discord_username || 'usuario_discord',
          displayName: player.discord_displayName || player.faceit_nickname || 'Usuario Discord',
          avatarURL: player.discord_avatar
        };
      }

      return {
        ...player,
        discordUser
      };
    });

    const resolvedPlayers = (await Promise.all(playerPromises)).filter(Boolean);

    resolvedPlayers.forEach(playerObj => {
      const overrideTier = playerObj.mixton_tier_override;
      if (overrideTier === 'S' || overrideTier === 'A' || overrideTier === 'B' || overrideTier === 'C') {
        availablePlayers[overrideTier].push(playerObj);
      } else {
        const lvl = parseInt(playerObj.faceit_level) || 1;
        if (lvl === 10) {
          availablePlayers.S.push(playerObj);
        } else if (lvl === 8 || lvl === 9) {
          availablePlayers.A.push(playerObj);
        } else if (lvl >= 5 && lvl <= 7) {
          availablePlayers.B.push(playerObj);
        } else {
          availablePlayers.C.push(playerObj);
        }
      }
    });

    // Ordenar por ELO desc
    Object.keys(availablePlayers).forEach(tier => {
      availablePlayers[tier].sort((a, b) => (b.faceit_elo || 1000) - (a.faceit_elo || 1000));
    });

    return { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId };
  }

  async function broadcastLobbyState(guildId = null) {
    if (!wss) return;
    try {
      const { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId } = await getLobbyData(guildId);
      const payload = JSON.stringify({
        type: 'state_update',
        data: {
          state,
          availablePlayers,
          commandEnabled,
          guildName,
          guildId: effectiveGuildId
        }
      });

      let sentCount = 0;
      wss.clients.forEach(c => {
        if (c.readyState === 1 && (c.guildId === effectiveGuildId || (!c.guildId && effectiveGuildId === DISCORD_GUILD_ID))) {
          c.send(payload);
          sentCount++;
        }
      });
      logger.info(`Estado mixton actualizado en tiempo real para guild ${effectiveGuildId}. Clientes notificados: ${sentCount}.`);
    } catch (err) {
      logger.error('Error al difundir el estado mixton a través de WebSockets:', err);
    }
  }

  // Escuchar actualizaciones internas del lobby para relanzar la difusión
  mixtonEvents.on('update', (guildId) => {
    broadcastLobbyState(guildId).catch(() => {});
    updateMixtonReadyPanel(client, guildId, db).catch(() => {});
  });

  if (wss) {
    wss.on('connection', async (ws, req) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const guildId = url.searchParams.get('guildId') || null;
        ws.guildId = guildId;

        const { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId } = await getLobbyData(guildId);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'state_update',
            data: { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId }
          }));
        }
      } catch (err) {
        logger.error('Error al enviar estado inicial de WebSocket:', err);
      }
    });
  }

  // --- Información del usuario autenticado ---
  router.get('/me', optionalAuth, async (req, res) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    let hasSavedPhone = false;
    let balance = 0;
    let fullUser = null;
    try {
      if (req.user?.userId) {
        fullUser = await db.getFullUser(req.user.userId, req.guildId);
        if (fullUser?.phoneNumber) hasSavedPhone = true;
        balance = await db.getUserBalance(req.user.userId, req.guildId);

        // Si tiene Faceit vinculado pero aún no tiene steam_id_64 o avatar en la BD, consultamos la API de Faceit
        if (fullUser?.faceit_player_id && (!fullUser.steam_id_64 || !fullUser.faceit_avatar)) {
          try {
            const faceitProfile = await fetchFaceitPlayerById(fullUser.faceit_player_id);
            const steamId = faceitProfile.steam_id_64 || faceitProfile.platforms?.steam || null;
            const steamNick = faceitProfile.steam_nickname || null;
            const avatar = faceitProfile.avatar || null;
            if (steamId && !fullUser.steam_id_64) fullUser.steam_id_64 = steamId;
            if (steamNick && !fullUser.steam_nickname) fullUser.steam_nickname = steamNick;
            if (avatar && !fullUser.faceit_avatar) fullUser.faceit_avatar = avatar;

            db.updateUserFields(req.user.userId, {
              ...(steamId ? { steam_id_64: steamId } : {}),
              ...(steamNick ? { steam_nickname: steamNick } : {}),
              ...(avatar ? { faceit_avatar: avatar } : {})
            }, req.guildId).catch(() => {});
          } catch (fErr) {
            // Silencioso si falla la consulta externa
          }
        }

        // Si tiene Steam vinculado pero aún no tiene Faceit en la BD, consultamos la API de Faceit por SteamID
        if (fullUser?.steam_id_64 && (!fullUser.faceit_player_id || !fullUser.faceit_nickname)) {
          try {
            const faceitProfile = await fetchFaceitPlayerBySteamId(fullUser.steam_id_64);
            if (faceitProfile && faceitProfile.player_id) {
              const existingDiscordId = await db.getDiscordIdByFaceitId(faceitProfile.player_id, req.guildId);
              if (!existingDiscordId || existingDiscordId === req.user.userId) {
                const skillLevel = getPlayerSkillLevel(faceitProfile);
                const elo = faceitProfile.games?.cs2?.faceit_elo || faceitProfile.games?.csgo?.faceit_elo || 0;
                const avatar = faceitProfile.avatar || null;

                fullUser.faceit_player_id = faceitProfile.player_id;
                fullUser.faceit_nickname = faceitProfile.nickname;
                fullUser.faceit_level = skillLevel;
                fullUser.faceit_elo = elo;
                fullUser.faceit_avatar = avatar;

                db.linkAccounts(
                  req.user.userId,
                  faceitProfile.player_id,
                  faceitProfile.nickname,
                  skillLevel,
                  elo,
                  req.guildId,
                  null,
                  null,
                  fullUser.steam_id_64,
                  fullUser.steam_nickname || null,
                  avatar
                ).catch(() => {});
              }
            }
          } catch (fErr) {
            // Silencioso si falla la consulta externa
          }
        }
      }
    } catch (err) {
      logger.warn('Error al obtener perfil completo en /me:', err.message);
    }
    res.json({ 
      user: { 
        ...req.user, 
        hasSavedPhone,
        balance,
        faceit_nickname: fullUser?.faceit_nickname || null,
        faceit_player_id: fullUser?.faceit_player_id || null,
        faceit_avatar: fullUser?.faceit_avatar || null,
        skillLevel: fullUser?.faceit_level || fullUser?.skillLevel || null,
        elo: fullUser?.faceit_elo || fullUser?.elo || null,
        tier: fullUser?.mixton_tier_override || fullUser?.mixton_tier || null,
        phoneNumber: hasSavedPhone ? fullUser.phoneNumber : null,
        steam_id_64: fullUser?.steam_id_64 || null,
        steam_nickname: fullUser?.steam_nickname || null
      } 
    });
  });

  // --- Verificar / Vincular cuenta de FACEIT desde el panel web ---
  router.post('/verify-faceit', requireAuth, async (req, res) => {
    const { nickname } = req.body || {};
    const discordId = req.user?.userId;

    if (!discordId) {
      return res.status(401).json({ error: 'Debes iniciar sesión con tu cuenta de Discord.' });
    }

    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return res.status(400).json({ error: 'Ingresa un nickname de FACEIT válido.' });
    }

    const cleanNick = nickname.trim();

    try {
      if (!env.FACEIT_API_KEY || env.FACEIT_API_KEY.startsWith('TU_')) {
        return res.status(500).json({ error: 'La API Key de FACEIT no está configurada en el servidor.' });
      }

      const player = await fetchFaceitPlayer(cleanNick);
      if (!player || !player.player_id) {
        return res.status(404).json({ error: `No se encontró ningún jugador en FACEIT con el nickname "${cleanNick}".` });
      }

      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const guildConfig = await getEffectiveConfigForGuild(targetGuildId);
      const currentSeason = await fetchCurrentHubSeason(guildConfig.faceitLeaderboardId || guildConfig.faceitHubId).catch(() => null);

      // Verificar si este perfil de Faceit ya está vinculado a otro Discord
      const existingDiscordId = await db.getDiscordIdByFaceitId(player.player_id, targetGuildId);
      if (existingDiscordId && existingDiscordId !== discordId) {
        return res.status(409).json({
          error: `El perfil de FACEIT "${player.nickname}" ya se encuentra vinculado a otra cuenta de Discord.`
        });
      }

      const skillLevel = getPlayerSkillLevel(player);
      const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;
      const steamId64 = player.steam_id_64 || player.platforms?.steam || null;
      const steamNickname = player.steam_nickname || null;
      const avatar = player.avatar || null;

      // Guardar o actualizar en base de datos
      await db.linkAccounts(
        discordId,
        player.player_id,
        player.nickname,
        skillLevel,
        elo,
        targetGuildId,
        currentSeason,
        null,
        steamId64,
        steamNickname,
        avatar
      );

      // Si el bot de Discord está activo y el usuario está en el servidor, sincronizar roles y apodo
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      if (guild) {
        const autoRoleSync = await isFeatureEnabled('autoRoleSync', targetGuildId);
        if (autoRoleSync && skillLevel) {
          await syncMemberLevelRole(guild, discordId, skillLevel).catch(() => {});
        }
        const autoNickSync = await isFeatureEnabled('autoNickSync', targetGuildId);
        if (autoNickSync !== false) {
          await syncMemberNickname(guild, discordId, player.nickname).catch(() => {});
        }
      }

      await db.addLogEntry('success', `Usuario ${req.user.username} (${discordId}) vinculó FACEIT ${player.nickname} desde la web`, 'web_panel', targetGuildId);

      return res.json({
        success: true,
        message: `¡Cuenta de FACEIT ${player.nickname} verificada y vinculada exitosamente!`,
        faceit: {
          nickname: player.nickname,
          playerId: player.player_id,
          level: skillLevel,
          elo: elo,
          avatar: avatar
        },
        steam: steamId64 ? {
          steam_id_64: steamId64,
          steam_nickname: steamNickname
        } : null
      });
    } catch (err) {
      logger.error('Error al verificar Faceit desde la web:', err);
      if (err.message === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ error: `El jugador "${cleanNick}" no existe en FACEIT.` });
      }
      return res.status(500).json({ error: err.message || 'Error al comunicarse con la API de FACEIT.' });
    }
  });

  // --- Conectar cuenta de STEAM (SteamID64) desde el panel web ---
  router.post(['/link-steam', '/sync-steam'], requireAuth, async (req, res) => {
    const { steamInput } = req.body || {};
    const discordId = req.user?.userId;

    if (!discordId) {
      return res.status(401).json({ error: 'Debes iniciar sesión con tu cuenta de Discord.' });
    }

    const input = (steamInput || 'detect_faceit').trim();
    const targetGuildId = req.guildId || DISCORD_GUILD_ID;

    let steamId64 = null;
    let steamNickname = null;

    if (input === 'detect_faceit') {
      const fullUser = await db.getFullUser(discordId, targetGuildId);
      if (!fullUser || !fullUser.faceit_player_id) {
        return res.status(400).json({ error: 'Primero debes vincular tu cuenta de FACEIT para consultar tu Steam en la API.' });
      }
      try {
        const faceitPlayer = await fetchFaceitPlayerById(fullUser.faceit_player_id);
        steamId64 = faceitPlayer.steam_id_64 || faceitPlayer.platforms?.steam || null;
        steamNickname = faceitPlayer.steam_nickname || null;
        if (!steamId64) {
          return res.status(404).json({ error: 'Tu perfil de FACEIT no tiene una cuenta de Steam vinculada públicamente.' });
        }
      } catch (fErr) {
        return res.status(500).json({ error: 'Error al consultar datos de Steam en FACEIT.' });
      }
    } else {
      // Extraer SteamID64 de 17 dígitos
      const match = input.match(/7656119\d{10}/);
      if (!match) {
        return res.status(400).json({ 
          error: 'Formato inválido. Ingresa un SteamID64 válido de 17 dígitos (ej: 76561198012345678) o el link a tu perfil (steamcommunity.com/profiles/...).' 
        });
      }
      steamId64 = match[0];
    }

    try {
      const success = await db.setSteamId(discordId, steamId64, steamNickname, targetGuildId);
      if (!success) {
        return res.status(500).json({ error: 'No se pudo guardar el SteamID64 en la base de datos.' });
      }

      await db.addLogEntry('info', `Usuario ${req.user.username} (${discordId}) conectó SteamID64 ${steamId64}`, 'web_panel', targetGuildId);

      return res.json({
        success: true,
        message: `¡Cuenta de Steam conectada exitosamente! SteamID64: ${steamId64}`,
        steam_id_64: steamId64,
        steam_nickname: steamNickname
      });
    } catch (err) {
      logger.error('Error al conectar Steam desde la web:', err);
      return res.status(500).json({ error: 'Error interno al guardar SteamID64.' });
    }
  });

  // --- Sincronizar FACEIT desde la cuenta de Steam conectada ---
  router.post('/sync-faceit-from-steam', requireAuth, async (req, res) => {
    const discordId = req.user?.userId;
    if (!discordId) {
      return res.status(401).json({ error: 'Debes iniciar sesión con tu cuenta de Discord.' });
    }

    const targetGuildId = req.guildId || DISCORD_GUILD_ID;
    const fullUser = await db.getFullUser(discordId, targetGuildId);

    if (!fullUser || !fullUser.steam_id_64) {
      return res.status(400).json({
        error: 'No tienes una cuenta de Steam conectada. Primero conecta tu cuenta de Steam con el botón de Steam.'
      });
    }

    try {
      const faceitProfile = await fetchFaceitPlayerBySteamId(fullUser.steam_id_64);
      if (!faceitProfile || !faceitProfile.player_id) {
        return res.status(404).json({
          error: `No se encontró ninguna cuenta de FACEIT vinculada al SteamID64 ${fullUser.steam_id_64} en CS2 ni CSGO. Asegúrate de haber jugado en FACEIT con esta cuenta de Steam.`
        });
      }

      // Verificar si ya está vinculado a otro Discord
      const existingDiscordId = await db.getDiscordIdByFaceitId(faceitProfile.player_id, targetGuildId);
      if (existingDiscordId && existingDiscordId !== discordId) {
        return res.status(409).json({
          error: `El perfil de FACEIT "${faceitProfile.nickname}" ya se encuentra vinculado a otra cuenta de Discord.`
        });
      }

      const skillLevel = getPlayerSkillLevel(faceitProfile);
      const elo = faceitProfile.games?.cs2?.faceit_elo || faceitProfile.games?.csgo?.faceit_elo || 0;
      const avatar = faceitProfile.avatar || null;

      let currentSeason = null;
      try {
        const guildConfig = await getEffectiveConfigForGuild(targetGuildId);
        currentSeason = await fetchCurrentHubSeason(guildConfig.faceitLeaderboardId || guildConfig.faceitHubId).catch(() => null);
      } catch {
        // Season opcional
      }

      await db.linkAccounts(
        discordId,
        faceitProfile.player_id,
        faceitProfile.nickname,
        skillLevel,
        elo,
        targetGuildId,
        currentSeason,
        null,
        fullUser.steam_id_64,
        fullUser.steam_nickname || null,
        avatar
      );

      // Sincronizar roles y apodo en Discord si el bot está en el servidor
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      if (guild) {
        const autoRoleSync = await isFeatureEnabled('autoRoleSync', targetGuildId);
        if (autoRoleSync && skillLevel) {
          await syncMemberLevelRole(guild, discordId, skillLevel).catch(() => {});
        }
        const autoNickSync = await isFeatureEnabled('autoNickSync', targetGuildId);
        if (autoNickSync !== false) {
          await syncMemberNickname(guild, discordId, faceitProfile.nickname).catch(() => {});
        }
      }

      await db.addLogEntry(
        'success',
        `Usuario ${req.user.username} (${discordId}) detectó y vinculó FACEIT ${faceitProfile.nickname} desde SteamID64 ${fullUser.steam_id_64}`,
        'web_panel',
        targetGuildId
      );

      return res.json({
        success: true,
        message: `¡Perfil de FACEIT "${faceitProfile.nickname}" detectado y vinculado exitosamente desde tu cuenta de Steam!`,
        faceit: {
          nickname: faceitProfile.nickname,
          playerId: faceitProfile.player_id,
          level: skillLevel,
          elo: elo,
          avatar: avatar
        },
        steam: {
          steam_id_64: fullUser.steam_id_64,
          steam_nickname: fullUser.steam_nickname || null
        }
      });
    } catch (err) {
      logger.error('Error al sincronizar FACEIT desde Steam en /sync-faceit-from-steam:', err);
      return res.status(500).json({ error: err.message || 'Error al comunicarse con la API de FACEIT.' });
    }
  });

  // --- Lista de servidores (Guilds) para administrador ---
  router.get('/guilds', requireAuth, async (req, res) => {
    try {
      const isAllowed = req.user?.role === 'global_admin' || req.user?.role === 'admin' || req.user?.isAdmin === true;
      if (!isAllowed) {
        return res.status(403).json({ error: 'Se requieren permisos de administrador.' });
      }
      let guilds = [{
        id: (DISCORD_GUILD_ID && DISCORD_GUILD_ID !== '1472731390675255410') ? DISCORD_GUILD_ID : MACHUPEEK_GUILD_ID,
        name: 'MachuPeek'
      }];

      res.json({ guilds });
    } catch (err) {
      logger.error('Error al obtener servidores:', err);
      res.status(500).json({ error: 'Error al obtener servidores.' });
    }
  });

  // --- Lista de todos los usuarios verificados (con datos de Discord y caché de 30s) ---
  const lobbyUsersCache = new Map();
  const LOBBY_USERS_CACHE_TTL = 30 * 1000;

  router.get('/users', requireAuth, async (req, res) => {
    try {
      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : DISCORD_GUILD_ID;
      const cacheKey = targetGuildId || 'global';
      const cached = lobbyUsersCache.get(cacheKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp < LOBBY_USERS_CACHE_TTL)) {
        return res.json({ users: cached.users });
      }

      const snapshot = await db._firestore.collection('faceit_users').get();
      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      if (guild) {
        await guild.members.fetch().catch(() => null);
      }

      const users = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (req.user?.role === 'admin') {
          const userGuild = data.servidor || data.mixton_guild_id || null;
          if (userGuild !== req.user.servidor) {
            return;
          }
        }

        let discordUser = null;
        if (guild) {
          const member = guild.members.cache.get(doc.id);
          if (member) {
            discordUser = {
              username: member.user.username,
              displayName: member.displayName,
              avatarURL: member.user.displayAvatarURL({ size: 128 })
            };
          }
        }

        users.push({
          discordId: doc.id,
          faceit_player_id: data.faceit_player_id || '',
          faceit_nickname: data.faceit_nickname || '',
          faceit_level: data.faceit_level || 1,
          faceit_elo: data.faceit_elo || 1000,
          discordUser
        });
      });

      lobbyUsersCache.set(cacheKey, { users, timestamp: now });
      res.json({ users });
    } catch (err) {
      logger.error('Error al obtener usuarios para el lobby:', err);
      res.status(500).json({ error: 'Error al obtener usuarios verificados.' });
    }
  });

  // --- Crear partida manual desde la web ---
  router.post('/create-match', requireAuth, async (req, res) => {
    try {
      const { teamA, teamB } = req.body;

      if (!Array.isArray(teamA) || teamA.length !== 5 || !Array.isArray(teamB) || teamB.length !== 5) {
        return res.status(400).json({ error: 'Debes proporcionar exactamente dos equipos de 5 jugadores cada uno.' });
      }

      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : (req.guildId || DISCORD_GUILD_ID);
      const effectiveConfig = await getEffectiveConfigForGuild(targetGuildId);
      const matchesChannelId = effectiveConfig.discordMatchesChannelId;
      if (!matchesChannelId || matchesChannelId.startsWith('ID_')) {
        return res.status(500).json({ error: 'El canal de anuncios de partidas no está configurado.' });
      }

      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      if (!guild) {
        return res.status(500).json({ error: 'No se pudo acceder al servidor de Discord.' });
      }

      // Validar y obtener perfiles de todos los jugadores en la base de datos
      const allPlayerIds = [...teamA, ...teamB];
      const playerProfiles = {};

      for (const discordId of allPlayerIds) {
        const data = await db.getFullUser(discordId, req.guildId);
        if (!data) {
          return res.status(400).json({ error: `El jugador con Discord ID ${discordId} no está registrado/verificado.` });
        }
        if (req.user?.role === 'admin') {
          const playerGuild = data.servidor || data.mixton_guild_id || null;
          if (playerGuild !== req.user.servidor) {
            return res.status(400).json({ error: `El jugador con Discord ID ${discordId} no pertenece a tu servidor de Discord.` });
          }
        }
        playerProfiles[discordId] = data;
      }

      // Definir los roster correspondientes
      const teamAPlayerData = teamA.map(id => ({
        discordId: id,
        faceit_player_id: playerProfiles[id].faceit_player_id,
        faceit_nickname: playerProfiles[id].faceit_nickname,
        faceit_level: playerProfiles[id].faceit_level || 3,
        faceit_elo: playerProfiles[id].faceit_elo || 1000
      }));

      const teamBPlayerData = teamB.map(id => ({
        discordId: id,
        faceit_player_id: playerProfiles[id].faceit_player_id,
        faceit_nickname: playerProfiles[id].faceit_nickname,
        faceit_level: playerProfiles[id].faceit_level || 3,
        faceit_elo: playerProfiles[id].faceit_elo || 1000
      }));

      // 1. Canales de voz temporales
      let waitingRoomId = null;
      if (effectiveConfig.discordWaitingRoomChannelId) {
        const ids = effectiveConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (!waitingRoomId) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackVC = channels.find(ch => ch.type === 2 && (ch.name.toLowerCase() === 'sala-de-espera' || ch.name.toLowerCase() === 'waiting-room' || ch.name.toLowerCase() === 'general'));
          if (fallbackVC) {
            waitingRoomId = fallbackVC.id;
          }
        }
      }

      let parentId = null;
      if (waitingRoomId) {
        const waitingRoom = await guild.channels.fetch(waitingRoomId).catch(() => null);
        if (waitingRoom) parentId = waitingRoom.parentId;
      }

      const botId = client.user.id;
      const permissionOverwrites1 = [
        { id: guild.id, type: 0, deny: ['Connect'] },
        { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];
      const permissionOverwrites2 = [
        { id: guild.id, type: 0, deny: ['Connect'] },
        { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];

      if (effectiveConfig?.discordMatchAccessRoleId && typeof effectiveConfig.discordMatchAccessRoleId === 'string' && effectiveConfig.discordMatchAccessRoleId.trim()) {
        const roleId = effectiveConfig.discordMatchAccessRoleId.trim();
        permissionOverwrites1.push({ id: roleId, type: 0, allow: ['ViewChannel', 'Connect', 'Speak'] });
        permissionOverwrites2.push({ id: roleId, type: 0, allow: ['ViewChannel', 'Connect', 'Speak'] });
      }

      const allManualPlayerIds = [...(teamA || []), ...(teamB || [])].filter(id => id && typeof id === 'string');
      await Promise.all(allManualPlayerIds.map(id => guild.members.fetch(id).catch(() => null)));

      for (const id of teamA || []) {
        if (id && typeof id === 'string' && id.trim()) {
          permissionOverwrites1.push({ id: id.trim(), type: 1, allow: ['Connect', 'Speak', 'ViewChannel'] });
        }
      }
      for (const id of teamB || []) {
        if (id && typeof id === 'string' && id.trim()) {
          permissionOverwrites2.push({ id: id.trim(), type: 1, allow: ['Connect', 'Speak', 'ViewChannel'] });
        }
      }

      let vc1 = null;
      try {
        vc1 = await guild.channels.create({
          name: `🔊 Equipo A (Web)`,
          type: 2,
          parent: parentId,
          permissionOverwrites: permissionOverwrites1,
          reason: 'Partida manual iniciada desde el Panel Web'
        });
      } catch (vc1Err) {
        logger.warn(`Error creando VC1 manual con permisos específicos (${vc1Err.message}). Creando con permisos estándar...`);
        vc1 = await guild.channels.create({
          name: `🔊 Equipo A (Web)`,
          type: 2,
          parent: parentId,
          reason: 'Partida manual iniciada desde el Panel Web'
        });
      }

      let vc2 = null;
      try {
        vc2 = await guild.channels.create({
          name: `🔊 Equipo B (Web)`,
          type: 2,
          parent: parentId,
          permissionOverwrites: permissionOverwrites2,
          reason: 'Partida manual iniciada desde el Panel Web'
        });
      } catch (vc2Err) {
        logger.warn(`Error creando VC2 manual con permisos específicos (${vc2Err.message}). Creando con permisos estándar...`);
        vc2 = await guild.channels.create({
          name: `🔊 Equipo B (Web)`,
          type: 2,
          parent: parentId,
          reason: 'Partida manual iniciada desde el Panel Web'
        });
      }

      // A. Reproducir anuncio por voz con IA antes de mover a los jugadores
      if (waitingRoomId) {
        const textToSpeak = `La partida entre el Equipo A en contra de el Equipo B iniciará en 5, 4, 3, 2, 1`;
        try {
          await playTTSCountdown(guild, waitingRoomId, textToSpeak);
        } catch (err) {
          logger.error('Error al reproducir el anuncio de voz en partida manual:', err);
        }
      }

      // 2. Mover a los jugadores a sus respectivos VCs
      const originalVoiceStates = {};

      for (const id of teamA) {
        const member = await guild.members.fetch(id).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[id] = member.voice.channel.id;
          await member.voice.setChannel(vc1).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      for (const id of teamB) {
        const member = await guild.members.fetch(id).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[id] = member.voice.channel.id;
          await member.voice.setChannel(vc2).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      // Generar ID único para la partida manual
      const matchId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 3. Crear anuncio con botones en Discord
      const matchesChannel = await client.channels.fetch(matchesChannelId).catch(() => null);
      let messageId = null;

      if (matchesChannel) {
        const team1List = teamAPlayerData.map(p => `• <@${p.discordId}> [${p.faceit_nickname}] (Lvl ${p.faceit_level})`).join('\n');
        const team2List = teamBPlayerData.map(p => `• <@${p.discordId}> [${p.faceit_nickname}] (Lvl ${p.faceit_level})`).join('\n');

        const startedEmbed = new EmbedBuilder()
          .setTitle('🎮 ¡Partida Manual Iniciada!')
          .setColor(0x00FF55)
          .setDescription(`Iniciada por <@${req.user.userId}> desde el panel web.`)
          .addFields(
            { name: '🌐 Origen', value: 'Panel Web', inline: true },
            { name: '🗺️ Mapa', value: '`Manual`', inline: true },
            { name: '📍 Servidor', value: '`Manual`', inline: true },
            { name: '👥 Equipo A', value: team1List, inline: true },
            { name: '👥 Equipo B', value: team2List, inline: true }
          )
          .setFooter({ text: 'Usa los botones para reportar el resultado de la partida' })
          .setTimestamp();

        const winA = new ButtonBuilder()
          .setCustomId(`manual_match_win_a_${matchId}`)
          .setLabel('Ganó Equipo A')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const winB = new ButtonBuilder()
          .setCustomId(`manual_match_win_b_${matchId}`)
          .setLabel('Ganó Equipo B')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const cancel = new ButtonBuilder()
          .setCustomId(`manual_match_cancel_${matchId}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(winA, winB, cancel);

        const msg = await matchesChannel.send({ embeds: [startedEmbed], components: [row] }).catch(err => logger.error('Error enviando anuncio de partida:', err));
        if (msg) messageId = msg.id;
      }

      if (messageId) {
        const messageUrl = `https://discord.com/channels/${guild.id}/${matchesChannelId}/${messageId}`;

        // Enviar DMs a los jugadores del Equipo A
        for (const id of teamA) {
          try {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member) {
              const dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Tu partida ha comenzado!')
                .setDescription(`Has sido asignado al **Equipo A** para esta partida manual.`)
                .setColor(0x15C253)
                .addFields(
                  { name: '🔊 Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
                )
                .setTimestamp();
              await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          } catch (e) {
            logger.warn(`No se pudo enviar DM al jugador ${id}: ${e.message}`);
          }
        }

        // Enviar DMs a los jugadores del Equipo B
        for (const id of teamB) {
          try {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member) {
              const dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Tu partida ha comenzado!')
                .setDescription(`Has sido asignado al **Equipo B** para esta partida manual.`)
                .setColor(0xFF3E3E)
                .addFields(
                  { name: '🔊 Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
                )
                .setTimestamp();
              await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          } catch (e) {
            logger.warn(`No se pudo enviar DM al jugador ${id}: ${e.message}`);
          }
        }
      }

      // 4. Guardar en base de datos de partidas activas
      const matchData = {
        entity_custom_name: 'Manual / Web',
        game: 'cs2',
        voting: { map: { pick: ['Manual'] }, location: { pick: ['Manual'] } },
        teams: { faction1: { name: 'Equipo A' }, faction2: { name: 'Equipo B' } },
        creator_id: req.user.userId
      };

      const rosterA = teamAPlayerData.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));
      const rosterB = teamBPlayerData.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));

      await db.addActiveMatch(matchId, matchData, vc1.id, vc2.id, messageId, rosterA, rosterB, originalVoiceStates, req.guildId || DISCORD_GUILD_ID);
      await db.addMatchToHistory(matchId, matchData, 'TBD', 0, 0, rosterA, rosterB, req.guildId || DISCORD_GUILD_ID, 'started').catch(err => logger.error('Error al guardar historial de partida manual:', err));
      
      // 5. Actualizar el panel en vivo
      await updateLivePanel(client, matchesChannelId, db);

      logger.success(`Partida manual ${matchId} iniciada desde web por ${req.user.username}`);
      res.json({ success: true, matchId });
    } catch (err) {
      logger.error('Error al crear partida manual desde web:', err);
      res.status(500).json({ error: 'Error al iniciar la partida en el servidor.' });
    }
  });

  // ==========================================
  // --- ENDPOINTS MIXTON COMPETITIVO ---
  // ==========================================

  // 1. Obtener estado del lobby mixton, jugadores disponibles y Tiers (Público / Espectadores y Jugadores)
  router.get('/mixton-state', optionalAuth, async (req, res) => {
    try {
      const { state, availablePlayers, commandEnabled, guildName, guildId } = await getLobbyData(req.guildId);
      
      res.json({
        state,
        availablePlayers,
        commandEnabled,
        guildName,
        guildId,
        currentUser: req.user ? {
          userId: req.user.userId,
          username: req.user.username,
          avatar: req.user.avatar || null,
          isAdmin: req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.isAdmin === true
        } : null
      });
    } catch (err) {
      logger.error('Error al obtener estado mixton:', err);
      res.status(500).json({ error: 'Error al obtener estado de mixton.' });
    }
  });

  // 2. Configurar cantidad de equipos (Admin)
  router.post('/mixton-setup', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { numTeams } = req.body;
      const count = parseInt(numTeams);
      if (isNaN(count) || count < 2 || count > 6) {
        return res.status(400).json({ error: 'El número de equipos debe ser entre 2 y 6.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      
      const newTeams = [];
      for (let i = 1; i <= count; i++) {
        newTeams.push({
          id: `team_${i}`,
          name: `Equipo ${i}`,
          captain: null,
          players: []
        });
      }

      state.teams = newTeams;
      state.pickOrder = [];
      state.pickSequence = [];
      state.currentPickIndex = 0;
      state.draftStarted = false;
      state.draftFinished = false;
      state.mapVeto = null;

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-setup:', err);
      res.status(500).json({ error: 'Error al configurar equipos.' });
    }
  });

  // 3. Asignar capitán de un equipo (Admin)
  router.post('/mixton-assign-captain', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      const state = await db.getMixtonLobbyState(req.guildId);

      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      if (!discordId) {
        team.captain = null;
      } else {
        const data = await db.getFullUser(discordId, req.guildId);
        if (!data) {
          return res.status(404).json({ error: 'Jugador no registrado.' });
        }

        // Los capitanes solo pueden ser de Tier S o Tier A
        const overrideTier = data.mixton_tier_override;
        let isAllowedTier = false;
        if (overrideTier) {
          isAllowedTier = (overrideTier === 'S' || overrideTier === 'A');
        } else {
          const lvl = parseInt(data.faceit_level) || 1;
          isAllowedTier = (lvl === 10 || lvl === 8 || lvl === 9);
        }

        if (!isAllowedTier) {
          return res.status(400).json({ error: 'Los capitanes solo pueden ser de Tier S o Tier A.' });
        }

        const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
        const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
        let discordUser = null;
        if (guild) {
          discordUser = await getDiscordUserDetails(guild, discordId);
        }

        team.captain = {
          discordId,
          faceit_player_id: data.faceit_player_id || '',
          faceit_nickname: data.faceit_nickname || '',
          faceit_level: data.faceit_level || 1,
          faceit_elo: data.faceit_elo || 1000,
          mixton_guild_id: data.mixton_guild_id || null,
          discordUser
        };

        // Enviar mensaje privado amigable al capitán asignado
        try {
          const userObj = await client.users.fetch(discordId).catch(() => null);
          if (userObj) {
            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
            const loginUrl = `${baseUrl}/?guild=${targetGuildId}`;
            const embed = new EmbedBuilder()
              .setTitle('👑 ¡Has sido elegido como Capitán de Mixton!')
              .setDescription(`¡Hola, **${data.faceit_nickname || userObj.username}**!\n\nHas sido seleccionado como **Capitán de Equipo** en el lobby de Mixton.\nTu rol ahora es iniciar sesión en la web para elegir a tus compañeros de equipo y armar la partida.`)
              .addFields(
                { name: '🔗 Enlace de Acceso', value: `[Iniciar Sesión e Ir al Lobby](${loginUrl})` },
                { name: '📌 Instrucciones', value: '1. Haz clic en el enlace de arriba.\n2. Inicia sesión con tu cuenta de Discord.\n3. Espera tu turno y selecciona a los jugadores de la lista.' }
              )
              .setColor('#FF5500')
              .setTimestamp()
              .setFooter({ text: 'Mixton Matchmaking System', iconURL: client.user.avatarURL() });

            await userObj.send({ embeds: [embed] }).catch((e) => {
              logger.warn(`No se pudo enviar MD al capitán ${discordId}: ${e.message}`);
            });
          }
        } catch (dmErr) {
          logger.error('Error al intentar enviar mensaje privado al capitán:', dmErr);
        }

        // Quitar de elegidos de otros equipos si existía
        state.teams.forEach(t => {
          t.players = (t.players || []).filter(p => p.discordId !== discordId);
        });

        // Quitar de capitán de otros equipos si existía
        state.teams.forEach(t => {
          if (t.id !== teamId && t.captain && t.captain.discordId === discordId) {
            t.captain = null;
          }
        });
      }

      // Sincronizar pickOrder
      state.pickOrder = state.teams.filter(t => t.captain !== null).map(t => t.id);

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-assign-captain:', err);
      res.status(500).json({ error: 'Error al asignar capitán.' });
    }
  });

  // 4. Guardar orden de elección (Admin)
  router.post('/mixton-pick-order', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { pickOrder } = req.body;
      if (!Array.isArray(pickOrder)) {
        return res.status(400).json({ error: 'El orden debe ser un array.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      
      for (const teamId of pickOrder) {
        const team = state.teams.find(t => t.id === teamId);
        if (!team || !team.captain) {
          return res.status(400).json({ error: `El equipo ${teamId} no tiene un capitán asignado.` });
        }
      }

      state.pickOrder = pickOrder;
      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-pick-order:', err);
      res.status(500).json({ error: 'Error al guardar el orden de elección.' });
    }
  });



  /**
   * Genera la secuencia exacta de elecciones de jugadores por equipo.
   * Regla solicitada:
   * - El 1er equipo pickea 1
   * - El 2do equipo pickea 2
   * - Luego el 1er equipo pickea 2
   * - Y al último el 2do equipo pickea 1 (o lo necesario hasta completar 4 c/u).
   * Si hay 4 equipos: el 3ro pickea 1, el 4to pickea 2, etc.
   */
  function generateDraftPickSequence(teamIds, targetPlayersPerTeam = 4) {
    if (!Array.isArray(teamIds) || teamIds.length === 0) return [];
    const counts = {};
    teamIds.forEach(id => { counts[id] = 0; });
    const sequence = [];

    // Ronda 1: Impares (idx 0, 2...) 1 pick, Pares (idx 1, 3...) 2 picks
    teamIds.forEach((id, idx) => {
      const toPick = (idx % 2 === 0) ? 1 : 2;
      for (let i = 0; i < toPick && counts[id] < targetPlayersPerTeam; i++) {
        sequence.push(id);
        counts[id]++;
      }
    });

    // Ronda 2: Impares (idx 0, 2...) 2 picks, Pares (idx 1, 3...) 1 pick
    teamIds.forEach((id, idx) => {
      const toPick = (idx % 2 === 0) ? 2 : 1;
      for (let i = 0; i < toPick && counts[id] < targetPlayersPerTeam; i++) {
        sequence.push(id);
        counts[id]++;
      }
    });

    // Rondas subsiguientes: 1 pick por equipo hasta que todos tengan targetPlayersPerTeam
    let remainingNeeded = true;
    while (remainingNeeded) {
      remainingNeeded = false;
      for (const id of teamIds) {
        if (counts[id] < targetPlayersPerTeam) {
          sequence.push(id);
          counts[id]++;
          remainingNeeded = true;
        }
      }
    }

    return sequence;
  }

  /**
   * Genera la secuencia de turnos para el baneo de mapas entre 2 equipos.
   * Regla:
   * El 1er capitán banea 1, luego el 2do banea 2, luego el 1ero banea 2,
   * y así sucesivamente hasta que solo quede exactamente 1 mapa.
   */
  function generateMapBanSequence(teamAId, teamBId, totalMaps = 7) {
    const bansNeeded = Math.max(0, totalMaps - 1);
    const sequence = [];
    let remaining = bansNeeded;
    let turn = 0;

    while (remaining > 0) {
      const isTeamA = (turn % 2 === 0);
      const teamId = isTeamA ? teamAId : teamBId;
      const targetBans = (turn === 0) ? 1 : 2;
      const bansThisTurn = Math.min(targetBans, remaining);

      for (let i = 0; i < bansThisTurn; i++) {
        sequence.push(teamId);
        remaining--;
      }
      turn++;
    }

    return sequence;
  }

  // 5. Iniciar draft (Admin)
  router.post('/mixton-start', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const state = await db.getMixtonLobbyState(req.guildId);

      if (state.teams.length < 2) {
        return res.status(400).json({ error: 'Se requieren al menos 2 equipos para iniciar.' });
      }
      
      const missingCaptains = state.teams.some(t => !t.captain);
      if (missingCaptains) {
        return res.status(400).json({ error: 'Todos los equipos creados deben tener un capitán asignado.' });
      }

      if (!state.pickOrder || state.pickOrder.length !== state.teams.length) {
        state.pickOrder = state.teams.map(t => t.id);
      }

      state.pickSequence = generateDraftPickSequence(state.pickOrder, 4);
      state.draftStarted = true;
      state.draftFinished = false;
      state.currentPickIndex = 0;

      // Limpiar jugadores elegidos previos
      state.teams.forEach(t => {
        t.players = [];
      });

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-start:', err);
      res.status(500).json({ error: 'Error al iniciar la selección.' });
    }
  });

  // 6. Realizar una elección de jugador (Capitanes o Admin)
  router.post('/mixton-pick', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { playerDiscordId } = req.body;
      const state = await db.getMixtonLobbyState(req.guildId);

      if (!state.draftStarted || state.draftFinished) {
        return res.status(400).json({ error: 'La selección de jugadores no está activa.' });
      }

      if (!state.pickSequence || state.pickSequence.length === 0) {
        state.pickSequence = generateDraftPickSequence(state.pickOrder, 4);
      }

      const currentTeamId = state.pickSequence[state.currentPickIndex] || state.pickOrder[state.currentPickIndex % state.pickOrder.length];
      const currentTeam = state.teams.find(t => t.id === currentTeamId);
      
      if (!currentTeam || !currentTeam.captain) {
        return res.status(500).json({ error: 'Equipo o capitán actual no definido.' });
      }

      const isCaptain = currentTeam.captain.discordId === req.user.userId;
      const isAdmin = req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.isAdmin === true;

      if (!isCaptain && !isAdmin) {
        return res.status(403).json({ error: `No es tu turno. Es turno del capitán de ${currentTeam.name}.` });
      }

      // Validar si el jugador ya está en algún equipo
      const alreadyOccupied = state.teams.some(t => 
         (t.captain && t.captain.discordId === playerDiscordId) || 
         (t.players || []).some(p => p.discordId === playerDiscordId)
      );

      if (alreadyOccupied) {
        return res.status(400).json({ error: 'Este jugador ya ha sido elegido.' });
      }

      const data = await db.getFullUser(playerDiscordId, req.guildId);
      if (!data) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      if (data.mixton_ready !== true) {
        return res.status(400).json({ error: 'El jugador seleccionado no está disponible (/mixton_listo).' });
      }

      const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      let discordUser = null;
      if (guild) {
        discordUser = await getDiscordUserDetails(guild, playerDiscordId);
      }

      const playerObj = {
        discordId: playerDiscordId,
        faceit_player_id: data.faceit_player_id || '',
        faceit_nickname: data.faceit_nickname || '',
        faceit_level: data.faceit_level || 1,
        faceit_elo: data.faceit_elo || 1000,
        mixton_guild_id: data.mixton_guild_id || null,
        discordUser
      };

      if (!currentTeam.players) currentTeam.players = [];
      if (currentTeam.players.length >= 4) {
        return res.status(400).json({ error: `${currentTeam.name} ya está completo (4 jugadores elegidos + 1 capitán).` });
      }

      currentTeam.players.push(playerObj);

      // Avanzar al siguiente pick en la secuencia
      state.currentPickIndex++;

      // Verificar si terminó el draft
      const allDone = state.teams.every(t => (t.players || []).length === 4);
      if (allDone || state.currentPickIndex >= state.pickSequence.length) {
        state.draftFinished = true;
        state.draftStarted = false;
      }

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-pick:', err);
      res.status(500).json({ error: 'Error al seleccionar jugador.' });
    }
  });

  // 6.5. Asignar automáticamente y balancear jugadores (Admin)
  router.post('/mixton-auto-assign', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const state = await db.getMixtonLobbyState(req.guildId);

      if (!state.teams || state.teams.length < 2) {
        return res.status(400).json({ error: 'Se requieren al menos 2 equipos configurados.' });
      }

      const missingCaptains = state.teams.some(t => !t.captain);
      if (missingCaptains) {
        return res.status(400).json({ error: 'Debes asignar manualmente los capitanes a todos los equipos antes de autocompletar.' });
      }

      // Obtener todos los jugadores listos
      const readyPlayers = await db.getReadyPlayers(req.guildId);

      // Filtrar los que ya están como capitanes o ya en algún equipo
      const occupiedDiscordIds = new Set();
      state.teams.forEach(t => {
        if (t.captain) occupiedDiscordIds.add(t.captain.discordId);
        (t.players || []).forEach(p => occupiedDiscordIds.add(p.discordId));
      });

      const pool = readyPlayers.filter(p => !occupiedDiscordIds.has(p.discordId));
      const totalNeeded = state.teams.reduce((acc, t) => acc + (4 - (t.players ? t.players.length : 0)), 0);

      if (pool.length < totalNeeded) {
        return res.status(400).json({ 
          error: `No hay suficientes jugadores disponibles en la cola. Se necesitan ${totalNeeded} jugadores más, pero solo hay ${pool.length} disponibles.` 
        });
      }

      // Ordenar pool de mayor a menor nivel/habilidad (Tier -> ELO -> Nivel)
      const tierRank = { S: 4, A: 3, B: 2, C: 1 };
      const getPlayerTierValue = (p) => {
        const t = p.mixton_tier_override || (p.faceit_level >= 10 ? 'S' : (p.faceit_level >= 8 ? 'A' : (p.faceit_level >= 5 ? 'B' : 'C')));
        return tierRank[t] || 1;
      };

      pool.sort((a, b) => {
        const tierDiff = getPlayerTierValue(b) - getPlayerTierValue(a);
        if (tierDiff !== 0) return tierDiff;
        const eloDiff = (b.faceit_elo || 1000) - (a.faceit_elo || 1000);
        if (eloDiff !== 0) return eloDiff;
        return (b.faceit_level || 1) - (a.faceit_level || 1);
      });

      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);

      // Repartición balanceada: el equipo incompleto con menor ELO acumulado recibe al mejor jugador restante
      for (const p of pool) {
        const incompleteTeams = state.teams.filter(t => (t.players || []).length < 4);
        if (incompleteTeams.length === 0) break;

        incompleteTeams.sort((a, b) => {
          const eloA = (a.captain?.faceit_elo || 1000) + (a.players || []).reduce((sum, pl) => sum + (pl.faceit_elo || 1000), 0);
          const eloB = (b.captain?.faceit_elo || 1000) + (b.players || []).reduce((sum, pl) => sum + (pl.faceit_elo || 1000), 0);
          return eloA - eloB;
        });

        const targetTeam = incompleteTeams[0];
        const discordId = p.discordId;
        let discordUser = null;
        if (guild) {
          discordUser = await getDiscordUserDetails(guild, discordId);
        }

        const playerObj = {
          discordId,
          faceit_player_id: p.faceit_player_id || '',
          faceit_nickname: p.faceit_nickname || '',
          faceit_level: p.faceit_level || 1,
          faceit_elo: p.faceit_elo || 1000,
          mixton_tier_override: p.mixton_tier_override || null,
          mixton_guild_id: p.mixton_guild_id || null,
          discordUser
        };

        if (!targetTeam.players) targetTeam.players = [];
        targetTeam.players.push(playerObj);
      }

      state.draftFinished = true;
      state.draftStarted = false;
      state.currentPickIndex = 0;

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      await db.addLogEntry('info', `El administrador ${req.user.username} autocompletó los equipos de Mixton de forma balanceada.`, 'system');

      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-auto-assign:', err);
      res.status(500).json({ error: 'Error al auto-asignar jugadores: ' + err.message });
    }
  });

  // 7. Reiniciar lobby mixton (Admin)
  router.post('/mixton-reset', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const defaultState = {
        teams: [
          { id: 'team_1', name: 'Equipo 1', captain: null, players: [] },
          { id: 'team_2', name: 'Equipo 2', captain: null, players: [] }
        ],
        pickOrder: [],
        pickSequence: [],
        currentPickIndex: 0,
        draftStarted: false,
        draftFinished: false,
        mapVeto: null,
        updatedAt: Date.now()
      };

      await db.saveMixtonLobbyState(defaultState, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state: defaultState });
    } catch (err) {
      logger.error('Error en mixton-reset:', err);
      res.status(500).json({ error: 'Error al reiniciar el lobby.' });
    }
  });

  // 7.1. Iniciar fase de veto de mapas al pulsar Lanzar Encuentro (Admin)
  router.post('/mixton-start-veto', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamIdA, teamIdB, betAmount = 0, queueId = 'auto', matchMode = 'faceit' } = req.body;
      if (!teamIdA || !teamIdB) {
        return res.status(400).json({ error: 'Debes seleccionar dos equipos para el encuentro.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const teamA = state.teams.find(t => t.id === teamIdA);
      const teamB = state.teams.find(t => t.id === teamIdB);

      if (!teamA || !teamB) {
        return res.status(404).json({ error: 'Equipos no encontrados.' });
      }

      if (!teamA.captain || teamA.players.length !== 4 || !teamB.captain || teamB.players.length !== 4) {
        return res.status(400).json({ error: 'Ambos equipos deben estar completos (5 jugadores c/u).' });
      }

      if (matchMode === 'steam') {
        const rosterA = [teamA.captain, ...teamA.players];
        const rosterB = [teamB.captain, ...teamB.players];
        const allPlayerIds = [...rosterA, ...rosterB].map(p => p.discordId).filter(Boolean);
        const usersDataMap = await db.getFullUsersMap(allPlayerIds, req.guildId);
        const missingSteam = [];

        for (const p of [...rosterA, ...rosterB]) {
          let s64 = String(p.steam_id_64 || usersDataMap[p.discordId]?.steam_id_64 || '').trim();
          if (!/^\d{17}$/.test(s64) && (p.faceit_player_id || p.faceit_nickname)) {
            try {
              const fcPlayer = p.faceit_player_id
                ? await fetchFaceitPlayerById(p.faceit_player_id).catch(() => null)
                : await fetchFaceitPlayer(p.faceit_nickname).catch(() => null);
              const foundS64 = fcPlayer?.games?.cs2?.game_player_id || fcPlayer?.games?.csgo?.game_player_id || fcPlayer?.steam_id_64;
              if (foundS64 && /^\d{17}$/.test(String(foundS64).trim())) {
                s64 = String(foundS64).trim();
                p.steam_id_64 = s64;
                await db.saveUser(p.discordId, { steam_id_64: s64 }, req.guildId).catch(() => {});
              }
            } catch {}
          } else if (/^\d{17}$/.test(s64)) {
            p.steam_id_64 = s64;
          }

          if (!s64 || !/^\d{17}$/.test(s64)) {
            missingSteam.push(p.faceit_nickname || p.discordUser?.displayName || p.nickname || p.discordId);
          }
        }

        if (missingSteam.length > 0) {
          return res.status(400).json({
            error: `No se puede lanzar la partida. Los 10 jugadores deben tener su SteamID vinculado para ingresar al servidor CS2. Falta vincular el Steam ID de: ${missingSteam.join(', ')}.`
          });
        }
      }

      const mapPool = getActiveMaps(state);
      if (mapPool.length < 2) {
        return res.status(400).json({ error: 'Se requieren al menos 2 mapas activos para iniciar el veto. Configura los mapas en el panel administrativo.' });
      }
      const banSequence = generateMapBanSequence(teamIdA, teamIdB, mapPool.length);

      state.mapVeto = {
        active: true,
        completed: false,
        teamIdA,
        teamIdB,
        pool: mapPool,
        bannedMaps: [],
        banHistory: [],
        banSequence,
        currentBanIndex: 0,
        chosenMap: null,
        betAmount: Math.max(0, parseFloat(betAmount) || 0),
        queueId,
        matchMode,
        startedAt: Date.now()
      };

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, mapVeto: state.mapVeto });
    } catch (err) {
      logger.error('Error en mixton-start-veto:', err);
      res.status(500).json({ error: 'Error al iniciar veto de mapas: ' + err.message });
    }
  });

  // 7.2. Banear un mapa (Capitán del equipo en turno o Admin)
  router.post('/mixton-ban-map', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { mapId } = req.body;
      if (!mapId) {
        return res.status(400).json({ error: 'Debes indicar el mapa a banear.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const veto = state.mapVeto;

      if (!veto || !veto.active || veto.completed) {
        return res.status(400).json({ error: 'No hay una fase de veto de mapas activa.' });
      }

      if (veto.bannedMaps && veto.bannedMaps.includes(mapId)) {
        return res.status(400).json({ error: 'Este mapa ya fue baneado.' });
      }

      const mapItem = (veto.pool || getActiveMaps(state)).find(m => m.id === mapId);
      if (!mapItem) {
        return res.status(404).json({ error: 'Mapa no válido en el pool.' });
      }

      const currentTurnTeamId = veto.banSequence[veto.currentBanIndex];
      const teamInTurn = state.teams.find(t => t.id === currentTurnTeamId);

      if (!teamInTurn || !teamInTurn.captain) {
        return res.status(500).json({ error: 'Equipo o capitán en turno no encontrado.' });
      }

      const isCaptain = teamInTurn.captain.discordId === req.user.userId;
      const isAdmin = req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.isAdmin === true;

      if (!isCaptain && !isAdmin) {
        return res.status(403).json({ error: `No es tu turno para banear. Es turno del capitán de ${teamInTurn.name}.` });
      }

      if (!veto.bannedMaps) veto.bannedMaps = [];
      if (!veto.banHistory) veto.banHistory = [];

      veto.bannedMaps.push(mapId);
      veto.banHistory.push({
        mapId,
        mapName: mapItem.name,
        teamId: currentTurnTeamId,
        teamName: teamInTurn.name,
        bannedByNickname: isCaptain ? teamInTurn.captain.faceit_nickname : `Admin (${req.user.username})`,
        timestamp: Date.now()
      });

      veto.currentBanIndex++;

      // Verificar si solo queda 1 mapa sin banear
      const remainingMaps = (veto.pool || getActiveMaps(state)).filter(m => !veto.bannedMaps.includes(m.id));
      if (remainingMaps.length === 1) {
        veto.chosenMap = remainingMaps[0];
        veto.active = false;
        veto.completed = true;
      }

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, mapVeto: veto });
    } catch (err) {
      logger.error('Error en mixton-ban-map:', err);
      res.status(500).json({ error: 'Error al banear mapa: ' + err.message });
    }
  });

  // 7.3. Cancelar veto de mapas (Admin)
  router.post('/mixton-cancel-veto', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const state = await db.getMixtonLobbyState(req.guildId);
      state.mapVeto = null;
      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-cancel-veto:', err);
      res.status(500).json({ error: 'Error al cancelar veto.' });
    }
  });

  // 7.4. Obtener catálogo completo de mapas CS2 y estado de activación
  router.get('/map-catalog', async (req, res) => {
    try {
      const state = await db.getMixtonLobbyState(req.guildId);
      const catalog = getEffectiveMapCatalog(state);
      const active = getActiveMaps(state);
      res.json({ success: true, catalog, activeCount: active.length });
    } catch (err) {
      logger.error('Error al obtener catálogo de mapas:', err);
      res.status(500).json({ error: 'Error al consultar catálogo de mapas.' });
    }
  });

  // 7.5. Configurar qué mapas se ven/usan en el veto (Admin)
  router.post('/map-catalog', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { catalog } = req.body;
      if (!Array.isArray(catalog)) {
        return res.status(400).json({ error: 'El catálogo debe ser un array de mapas.' });
      }

      const activeCount = catalog.filter(m => m && m.active === true).length;
      if (activeCount < 2) {
        return res.status(400).json({ error: 'Debes mantener al menos 2 mapas activos para el sistema de veto.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      state.mapCatalog = catalog;
      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      const effective = getEffectiveMapCatalog(state);
      const active = getActiveMaps(state);
      res.json({ success: true, catalog: effective, activeCount: active.length });
    } catch (err) {
      logger.error('Error en POST /map-catalog:', err);
      res.status(500).json({ error: 'Error al guardar catálogo de mapas: ' + err.message });
    }
  });

  // 7.5. Verificar cuotas y saldos de los 10 jugadores antes de lanzar (Apuestas)
  router.post('/mixton-check-bet-status', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { teamIdA, teamIdB, betAmount = 0 } = req.body;
      if (!teamIdA || !teamIdB) {
        return res.status(400).json({ error: 'Debes seleccionar dos equipos.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const teamA = state.teams.find(t => t.id === teamIdA);
      const teamB = state.teams.find(t => t.id === teamIdB);

      if (!teamA || !teamB) {
        return res.status(404).json({ error: 'Equipos no encontrados.' });
      }

      if (!teamA.captain || teamA.players.length !== 4 || !teamB.captain || teamB.players.length !== 4) {
        return res.status(400).json({ error: 'Ambos equipos deben estar completos (5 jugadores c/u).' });
      }

      const rosterA = [teamA.captain, ...teamA.players];
      const rosterB = [teamB.captain, ...teamB.players];
      const parsedBetAmount = Math.max(0, parseFloat(betAmount) || 0);

      let targetGuildId = null;
      for (const p of [...rosterA, ...rosterB]) {
        if (p.mixton_guild_id) {
          targetGuildId = p.mixton_guild_id;
          break;
        }
      }
      const guildIdToUse = targetGuildId || req.guildId || DISCORD_GUILD_ID;

      // Realizar una sola consulta a la base de datos por los 10 jugadores
      const allPlayerIds = [...rosterA, ...rosterB].map(p => p.discordId).filter(Boolean);
      const usersDataMap = await db.getFullUsersMap(allPlayerIds, guildIdToUse);

      const buildPlayerStatus = async (p, teamLetter, teamObj) => {
        const u = usersDataMap[p.discordId] || {};
        const balance = Number(u.wallet_balance || 0);
        const hasSavedPhone = Boolean(u.phoneNumber);
        let steam_id_64 = String(p.steam_id_64 || u.steam_id_64 || '').trim();

        if (!steam_id_64 && (p.faceit_player_id || p.faceit_nickname)) {
          try {
            const fc = p.faceit_player_id
              ? await fetchFaceitPlayerById(p.faceit_player_id).catch(() => null)
              : await fetchFaceitPlayer(p.faceit_nickname).catch(() => null);
            const found = fc?.games?.cs2?.game_player_id || fc?.games?.csgo?.game_player_id || fc?.steam_id_64;
            if (found && /^\d{17}$/.test(String(found).trim())) {
              steam_id_64 = String(found).trim();
              p.steam_id_64 = steam_id_64;
              await db.saveUser(p.discordId, { steam_id_64 }, guildIdToUse).catch(() => {});
            }
          } catch (_) {}
        } else if (/^\d{17}$/.test(steam_id_64)) {
          p.steam_id_64 = steam_id_64;
        }

        const hasSteam = Boolean(steam_id_64 && /^\d{17}$/.test(steam_id_64));

        return {
          discordId: p.discordId,
          faceit_nickname: p.faceit_nickname,
          displayName: p.discordUser?.displayName || p.discordUser?.username || p.faceit_nickname,
          avatarURL: p.discordUser?.avatarURL || null,
          hasSavedPhone,
          hasSteam,
          steam_id_64: hasSteam ? steam_id_64 : null,
          team: teamLetter,
          teamName: teamObj.name,
          isCaptain: p.discordId === teamObj.captain?.discordId,
          balance,
          hasEnough: parsedBetAmount === 0 || balance >= parsedBetAmount,
          deficit: Math.max(0, parseFloat((parsedBetAmount - balance).toFixed(2)))
        };
      };

      const playerStatusList = await Promise.all([
        ...rosterA.map(p => buildPlayerStatus(p, 'A', teamA)),
        ...rosterB.map(p => buildPlayerStatus(p, 'B', teamB))
      ]);

      const totalPot = parseFloat((parsedBetAmount * 10).toFixed(2));
      const allReady = playerStatusList.every(p => p.hasEnough);
      const missingSteamPlayers = playerStatusList.filter(p => !p.hasSteam).map(p => ({
        discordId: p.discordId,
        faceit_nickname: p.faceit_nickname,
        displayName: p.displayName
      }));

      res.json({
        betAmount: parsedBetAmount,
        totalPot,
        allReady,
        teamA: { id: teamA.id, name: teamA.name },
        teamB: { id: teamB.id, name: teamB.name },
        players: playerStatusList,
        missingSteamPlayers
      });
    } catch (err) {
      logger.error('Error al verificar estado de apuestas:', err);
      res.status(500).json({ error: 'Error al verificar saldos de los jugadores.' });
    }
  });

  // 7.6. Recarga rápida de saldo manual por admin (ej: pago directo Yape en efectivo)
  router.post('/quick-add-balance', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { discordId, amount, reason } = req.body;
      if (!discordId || amount === undefined) {
        return res.status(400).json({ error: 'Faltan discordId o monto.' });
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número positivo.' });
      }

      const newBalance = await db.updateUserBalance(
        discordId, 
        numAmount, 
        req.guildId, 
        reason || `Recarga manual por admin ${req.user.username}`
      );

      // Notificar a los paneles web en tiempo real sobre la recarga de este jugador específico
      if (wss) {
        const payload = JSON.stringify({
          type: 'player_balance_update',
          data: { discordId, newBalance, guildId: req.guildId }
        });
        wss.clients.forEach(c => {
          if (c.readyState === 1) c.send(payload);
        });
      }

      res.json({ success: true, discordId, newBalance });
    } catch (err) {
      logger.error('Error al recargar saldo manual:', err);
      res.status(500).json({ error: 'Error al recargar saldo.' });
    }
  });

  // 7.6.1. Consultar únicamente el saldo de un jugador individual en la base de datos
  router.get('/player-balance/:discordId', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { discordId } = req.params;
      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const balance = await db.getUserBalance(discordId, targetGuildId);
      res.json({ success: true, discordId, balance });
    } catch (err) {
      logger.error(`Error al consultar saldo de jugador ${req.params.discordId}:`, err);
      res.status(500).json({ error: 'Error al consultar saldo.' });
    }
  });

  // 7.7. Recargar saldo verificando el depósito en el monitor Yape local.
  router.post('/wallet/recharge-yape', requireAuth, yapeRechargeAccountLimiter, yapeRechargeIpLimiter, async (req, res) => {
    try {
      const { phoneNumber, operationNumber, amount, targetDiscordId } = req.body;
      const discordId = (req.user?.isAdmin && targetDiscordId) ? targetDiscordId : req.user.userId;

      const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
      if (!operationNumber || amount === undefined || cleanPhone.length !== 9) {
        return res.status(400).json({ error: 'Debes proporcionar monto, código de aprobación y celular Yape válido para recibir premios.' });
      }

      let payment;
      try {
        payment = await yapeTransactionService.findIncomingTransaction({
          db,
          operationNumber,
          expectedAmount: amount
        });
      } catch (err) {
        const isMissingOperation = String(err.message || '').startsWith('No encontramos ese depósito');
        if (!isMissingOperation) throw err;

        // Un código que aún no llegó desde el escáner queda reservado en una
        // transacción. Así dos usuarios no pueden dejar pendiente el mismo código.
        const reservation = await db.reserveYapeOperation({
          operationNumber,
          discordId,
          guildId: req.guildId,
          amount,
          phoneNumber: cleanPhone,
          auditContext: { source: 'web', ip: req.ip }
        });
        if (reservation.rateLimited) {
          return res.status(429).json({ error: 'Alcanzaste el límite de códigos pendientes. Espera 10 minutos antes de intentar otro código.' });
        }
        if (!reservation.reserved) {
          const error = reservation.alreadyProcessed
            ? (reservation.belongsToUser
              ? 'Esta operación ya fue acreditada en tu billetera.'
              : 'Esta operación ya fue utilizada para acreditar otra cuenta.')
            : (reservation.belongsToUser
              ? 'Este código de aprobación ya está en proceso de verificación.'
              : 'Este código de aprobación ya está siendo usado por otra cuenta.');
          return res.status(409).json({ error });
        }

        return res.status(202).json({
          pending: true,
          message: 'Aún no vemos el depósito. El código quedó reservado para tu cuenta; inténtalo nuevamente cuando aparezca en unos segundos.'
        });
      }
      const result = await db.creditYapeOperation({
        operationNumber: payment.operationNumber,
        discordId,
        guildId: req.guildId,
        amount: payment.amount,
        phoneNumber: cleanPhone,
        details: { receivedAt: payment.receivedAt },
        auditContext: { source: 'web', ip: req.ip }
      });

      if (result.alreadyProcessed) {
        return res.status(409).json({ error: result.belongsToUser
          ? 'Esta operación ya fue acreditada en tu billetera.'
          : 'Esta operación ya fue utilizada para acreditar otra cuenta.' });
      }
      if (result.alreadyReserved) {
        return res.status(409).json({ error: 'Este código de aprobación ya está siendo usado por otra cuenta.' });
      }

      mixtonEvents.emit('update', req.guildId);

      // Notificar a los paneles web en tiempo real sobre la recarga Yape de este jugador
      if (wss) {
        const payload = JSON.stringify({
          type: 'player_balance_update',
          data: { discordId, newBalance: result.newBalance, guildId: req.guildId }
        });
        wss.clients.forEach(c => {
          if (c.readyState === 1) c.send(payload);
        });
      }

      res.json({
        success: true,
        message: `¡Recarga de S/ ${payment.amount.toFixed(2)} acreditada exitosamente con Yape!`,
        amount: payment.amount,
        newBalance: result.newBalance,
        operationNumber: payment.operationNumber
      });
    } catch (err) {
      logger.error('Error al procesar recarga con Yape en endpoint:', err.message);
      const isMissingOperation = String(err.message || '').startsWith('No encontramos ese depósito');
      res.status(400).json({ error: isMissingOperation
        ? 'No encontramos ese código de aprobación. Vuelve a verificar el código en tu comprobante Yape.'
        : (err.message || 'Error al verificar el depósito Yape.') });
    }
  });

  /**
   * Helper para obtener las colas y su estado de ocupación (free/busy)
   */
  async function getQueuesWithStatus(guildId, effectiveConfig) {
    let queues = [];
    if (Array.isArray(effectiveConfig.queues) && effectiveConfig.queues.length > 0) {
      queues = effectiveConfig.queues.map((q, idx) => ({
        id: q.queueId || q.id || `queue_${idx + 1}`,
        queueId: q.queueId || q.id || `queue_${idx + 1}`,
        name: q.name || `Cola ${idx + 1}`,
        hubId: q.hubId || effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db',
        hubName: q.hubName || q.name,
        discordMatchesChannelId: q.discordMatchesChannelId || null,
        discordWaitingRoomChannelId: q.discordWaitingRoomChannelId || null,
        discordMatchAccessRoleId: q.discordMatchAccessRoleId || null,
        hubRoleId: q.hubRoleId || null,
        open: true
      }));
    } else {
      // Si no hay colas manuales en la config, autodetectar desde Faceit
      const detected = await fetchFaceitHubQueues(effectiveConfig.faceitHubId).catch(() => []);
      if (detected && detected.length > 0) {
        queues = detected.map((q, idx) => ({
          id: q.id || q.queueId || `cola_${idx + 1}`,
          queueId: q.queueId || q.id,
          name: q.name || `Sala ${idx + 1}`,
          hubId: q.hubId || effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db',
          hubName: q.hubName || q.name,
          open: q.open !== false
        }));
      } else {
        // Fallback genérico si no se encuentran colas en Faceit
        queues = [
          {
            id: 'sala_a',
            queueId: 'sala_a',
            name: 'Sala A (Cola 1)',
            hubId: effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db',
            hubName: 'Mixtones',
            open: true
          },
          {
            id: 'sala_b',
            queueId: 'sala_b',
            name: 'Sala B (Cola 2)',
            hubId: effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db',
            hubName: 'Mixtones',
            open: true
          }
        ];
      }
    }

    // Comprobar estado de ocupación con las partidas activas
    const activeMatches = await db.getActiveMatches().catch(() => []);
    const queuesWithStatus = queues.map(q => {
      const qId = String(q.queueId || q.id || '').trim();
      const qName = String(q.name || '').trim().toLowerCase();

      const busyMatch = activeMatches.find(m => {
        const matchQId = String(m.queue_id || '').trim();
        const matchQName = String(m.queue_name || '').trim().toLowerCase();
        if (qId && matchQId && qId === matchQId) return true;
        if (qName && matchQName && qName === matchQName) return true;
        return false;
      });

      return {
        ...q,
        status: busyMatch ? 'busy' : 'free',
        activeMatch: busyMatch ? {
          id: busyMatch.id,
          teamA: busyMatch.faction1_name || 'Equipo A',
          teamB: busyMatch.faction2_name || 'Equipo B',
          startedAt: busyMatch.startedAt || null
        } : null
      };
    });

    // Encontrar la primera libre
    const firstFree = queuesWithStatus.find(q => q.status === 'free');
    const autoSelectedQueueId = firstFree ? (firstFree.queueId || firstFree.id) : (queuesWithStatus[0]?.queueId || queuesWithStatus[0]?.id || 'default');

    return { queues: queuesWithStatus, autoSelectedQueueId };
  }

  // 7.5 Obtener estado en vivo de las colas/salas (para selector web)
  router.get('/mixton-queues', requireAuth, async (req, res) => {
    try {
      const effectiveConfig = await getEffectiveConfigForGuild(req.guildId);
      const result = await getQueuesWithStatus(req.guildId, effectiveConfig);
      res.json(result);
    } catch (err) {
      logger.error('Error al obtener colas de mixton:', err);
      res.status(500).json({ error: 'Error al consultar estado de las colas.' });
    }
  });

  // 8. Crear partida mixton en Discord (Admin)
  router.post('/mixton-create-match', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamIdA, teamIdB, betAmount = 0, manualPaidDiscordIds = [], queueId = 'auto', matchMode = 'faceit', chosenMap = null } = req.body;
      if (!teamIdA || !teamIdB) {
        return res.status(400).json({ error: 'Debes seleccionar dos equipos.' });
      }

      if (!['faceit', 'steam'].includes(matchMode)) {
        return res.status(400).json({ error: 'El modo de partida debe ser FACEIT o STEAM.' });
      }

      const parsedBetAmount = Math.max(0, parseFloat(betAmount) || 0);
      const manualPaidSet = new Set(Array.isArray(manualPaidDiscordIds) ? manualPaidDiscordIds : []);

      const state = await db.getMixtonLobbyState(req.guildId);
      const teamA = state.teams.find(t => t.id === teamIdA);
      const teamB = state.teams.find(t => t.id === teamIdB);

      if (!teamA || !teamB) {
        return res.status(404).json({ error: 'Equipos no encontrados.' });
      }

      if (!teamA.captain || teamA.players.length !== 4 || !teamB.captain || teamB.players.length !== 4) {
        return res.status(400).json({ error: 'Ambos equipos deben estar completos (5 jugadores c/u).' });
      }

      // Nombre oficial de equipos basado en su Capitán (ej. "Equipo Eloiky")
      const capAName = teamA.captain?.faceit_nickname || teamA.captain?.discordUser?.displayName || teamA.captain?.nickname || 'Capitán A';
      teamA.name = `Equipo ${capAName}`;
      const teamATag = capAName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'EQ1';

      const capBName = teamB.captain?.faceit_nickname || teamB.captain?.discordUser?.displayName || teamB.captain?.nickname || 'Capitán B';
      teamB.name = `Equipo ${capBName}`;
      const teamBTag = capBName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'EQ2';

      const finalChosenMap = chosenMap || state.mapVeto?.chosenMap || null;
      const mapDisplayName = finalChosenMap?.name || 'Elección de Capitanes';

      const rosterA = [teamA.captain, ...teamA.players];
      const rosterB = [teamB.captain, ...teamB.players];

      // Determinar la guild correcta de la partida
      let targetGuildId = null;
      for (const p of [...rosterA, ...rosterB]) {
        if (p.mixton_guild_id) {
          targetGuildId = p.mixton_guild_id;
          break;
        }
      }

      const guildIdToUse = targetGuildId || req.guildId || DISCORD_GUILD_ID;

      // Realizar una sola consulta a la base de datos por los 10 jugadores
      const allPlayerIds = [...rosterA, ...rosterB].map(p => p.discordId).filter(Boolean);
      const usersDataMap = await db.getFullUsersMap(allPlayerIds, guildIdToUse);

      if (matchMode === 'steam') {
        const missingSteam = [];
        for (const p of [...rosterA, ...rosterB]) {
          let s64 = String(p.steam_id_64 || usersDataMap[p.discordId]?.steam_id_64 || '').trim();
          if (!/^\d{17}$/.test(s64) && (p.faceit_player_id || p.faceit_nickname)) {
            try {
              const fcPlayer = p.faceit_player_id
                ? await fetchFaceitPlayerById(p.faceit_player_id).catch(() => null)
                : await fetchFaceitPlayer(p.faceit_nickname).catch(() => null);
              const foundS64 = fcPlayer?.games?.cs2?.game_player_id || fcPlayer?.games?.csgo?.game_player_id || fcPlayer?.steam_id_64;
              if (foundS64 && /^\d{17}$/.test(String(foundS64).trim())) {
                s64 = String(foundS64).trim();
                p.steam_id_64 = s64;
                await db.saveUser(p.discordId, { steam_id_64: s64 }, guildIdToUse).catch(() => {});
              }
            } catch (fcErr) {
              logger.warn(`No se pudo obtener SteamID64 desde FACEIT para ${p.faceit_nickname}: ${fcErr.message}`);
            }
          } else if (/^\d{17}$/.test(s64)) {
            p.steam_id_64 = s64;
          }

          if (!s64 || !/^\d{17}$/.test(s64)) {
            missingSteam.push(p.faceit_nickname || p.discordUser?.displayName || p.nickname || p.discordId);
          }
        }

        if (missingSteam.length > 0) {
          logger.warn(`[Lobby] Intento de iniciar partida CS2 local pero faltan SteamID64: ${missingSteam.join(', ')}`);
          return res.status(400).json({
            error: `No se puede lanzar la partida. Los 10 jugadores deben tener su SteamID vinculado para ingresar al servidor CS2. Falta vincular el Steam ID de: ${missingSteam.join(', ')}.`
          });
        }
      }

      // Validación estricta de saldo/cuota si hay apuesta usando la misma consulta previa
      const unpaidPlayers = [];
      const playersToDeduct = [];

      if (parsedBetAmount > 0) {
        for (const p of [...rosterA, ...rosterB]) {
          const isManual = manualPaidSet.has(p.discordId);
          if (isManual) continue;

          const uData = usersDataMap[p.discordId];
          const balance = Number(uData?.wallet_balance || 0);
          if (balance < parsedBetAmount) {
            unpaidPlayers.push({
              discordId: p.discordId,
              nickname: p.faceit_nickname || p.discordUser?.displayName || 'Jugador',
              balance,
              deficit: parseFloat((parsedBetAmount - balance).toFixed(2))
            });
          } else {
            playersToDeduct.push(p.discordId);
          }
        }

        if (unpaidPlayers.length > 0) {
          const names = unpaidPlayers.map(u => `${u.nickname} (Saldo: S/ ${u.balance.toFixed(2)}, Falta: S/ ${u.deficit.toFixed(2)})`).join(', ');
          return res.status(400).json({ 
            error: `No se puede lanzar el encuentro: Faltan ${unpaidPlayers.length} jugador(es) por completar su cuota: ${names}`,
            unpaidPlayers 
          });
        }

        // Deducir saldo de los jugadores con balance suficiente
        for (const discordId of playersToDeduct) {
          await db.updateUserBalance(
            discordId, 
            -parsedBetAmount, 
            guildIdToUse, 
            `Entrada cuota de apuesta mixton: ${teamA.name} vs ${teamB.name}`
          );
        }
      }

      const effectiveConfig = await getEffectiveConfigForGuild(guildIdToUse);
      const guild = await client.guilds.fetch(guildIdToUse).catch(() => null);
      if (!guild) {
        return res.status(500).json({ error: `No se pudo conectar a Discord para la Guild ${guildIdToUse}.` });
      }

      // FACEIT conserva sus colas; STEAM usa lobbies privados creados por los capitanes.
      let assignedQueue;
      let faceitHubUrl = null;
      if (matchMode === 'faceit') {
        const { queues: currentQueues, autoSelectedQueueId } = await getQueuesWithStatus(guildIdToUse, effectiveConfig);
        if (queueId && queueId !== 'auto') {
          assignedQueue = currentQueues.find(q => String(q.queueId || q.id) === String(queueId));
        }
        if (!assignedQueue) {
          assignedQueue = currentQueues.find(q => String(q.queueId || q.id) === String(autoSelectedQueueId)) || currentQueues[0];
        }
        if (!assignedQueue) {
          assignedQueue = {
            id: 'default',
            queueId: 'default',
            name: 'Sala Principal',
            hubId: effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db',
            hubName: 'Mixtones'
          };
        }

        const activeHubId = assignedQueue.hubId || effectiveConfig.faceitHubId || 'e72c25e6-74e5-415b-97da-e541296ff1db';
        const cleanHubSlug = encodeURIComponent(assignedQueue.hubName || assignedQueue.name || 'Mixtones');
        const queueQuery = (assignedQueue.queueId && assignedQueue.queueId !== 'default' && assignedQueue.queueId !== 'sala_a' && assignedQueue.queueId !== 'sala_b')
          ? `?queue=${assignedQueue.queueId}`
          : '';
        faceitHubUrl = `https://www.faceit.com/es/hub/${activeHubId}/${cleanHubSlug}${queueQuery}`;
      } else {
        assignedQueue = { id: 'steam', queueId: 'steam', name: 'Lobby privado de Steam' };
      }

      let matchesChannelId = null;
      // Priorizar canal de texto específico de la cola si está configurado
      if (assignedQueue.discordMatchesChannelId) {
        const qCh = await guild.channels.fetch(assignedQueue.discordMatchesChannelId).catch(() => null);
        if (qCh && qCh.guild.id === guild.id) {
          matchesChannelId = qCh.id;
        }
      }

      if (!matchesChannelId && effectiveConfig.discordMatchesChannelId) {
        const ids = effectiveConfig.discordMatchesChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            matchesChannelId = id;
            break;
          }
        }
      }

      if (!matchesChannelId) {
        // Fallback: Buscar un canal de texto llamado 'partidas' o 'mixton' en la guild
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackCh = channels.find(ch => ch.type === 0 && (ch.name.toLowerCase() === 'partidas' || ch.name.toLowerCase() === 'mixton' || ch.name.toLowerCase() === 'mixton-partidas'));
          if (fallbackCh) {
            matchesChannelId = fallbackCh.id;
          }
        }
      }

      if (!matchesChannelId && effectiveConfig.discordMatchesChannelId) {
        // Usar la primera por defecto
        matchesChannelId = effectiveConfig.discordMatchesChannelId.split(',')[0].trim();
      }

      if (!matchesChannelId) {
        return res.status(500).json({ error: 'Canal de anuncios no configurado y no se encontró canal fallback.' });
      }

      // 1. Canales de voz temporales
      let waitingRoomId = null;
      // Priorizar sala de espera específica de la cola si está configurada
      if (assignedQueue.discordWaitingRoomChannelId) {
        const qVc = await guild.channels.fetch(assignedQueue.discordWaitingRoomChannelId).catch(() => null);
        if (qVc && qVc.guild.id === guild.id) {
          waitingRoomId = qVc.id;
        }
      }

      if (!waitingRoomId && effectiveConfig.discordWaitingRoomChannelId) {
        const ids = effectiveConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (!waitingRoomId) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackVC = channels.find(ch => ch.type === 2 && (ch.name.toLowerCase() === 'sala-de-espera' || ch.name.toLowerCase() === 'waiting-room' || ch.name.toLowerCase() === 'general'));
          if (fallbackVC) {
            waitingRoomId = fallbackVC.id;
          }
        }
      }

      let parentId = null;
      if (waitingRoomId) {
        const waitingRoom = await guild.channels.fetch(waitingRoomId).catch(() => null);
        if (waitingRoom) parentId = waitingRoom.parentId;
      }

      const botId = client.user.id;
      const permissionOverwrites1 = [
        { id: guild.id, type: 0, deny: ['Connect'] },
        { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];
      const permissionOverwrites2 = [
        { id: guild.id, type: 0, deny: ['Connect'] },
        { id: botId, type: 1, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];

      if (effectiveConfig?.discordMatchAccessRoleId && typeof effectiveConfig.discordMatchAccessRoleId === 'string' && effectiveConfig.discordMatchAccessRoleId.trim()) {
        const roleId = effectiveConfig.discordMatchAccessRoleId.trim();
        permissionOverwrites1.push({ id: roleId, type: 0, allow: ['ViewChannel', 'Connect', 'Speak'] });
        permissionOverwrites2.push({ id: roleId, type: 0, allow: ['ViewChannel', 'Connect', 'Speak'] });
      }

      // Pre-cargar miembros en caché para evitar errores de Discord.js
      await Promise.all(allPlayerIds.map(id => guild.members.fetch(id).catch(() => null)));

      for (const p of rosterA) {
        if (p?.discordId && typeof p.discordId === 'string' && p.discordId.trim()) {
          permissionOverwrites1.push({ id: p.discordId.trim(), type: 1, allow: ['Connect', 'Speak', 'ViewChannel'] });
        }
      }
      for (const p of rosterB) {
        if (p?.discordId && typeof p.discordId === 'string' && p.discordId.trim()) {
          permissionOverwrites2.push({ id: p.discordId.trim(), type: 1, allow: ['Connect', 'Speak', 'ViewChannel'] });
        }
      }

      let vc1 = null;
      try {
        vc1 = await guild.channels.create({
          name: `🔊 Team ${capAName}`,
          type: 2,
          parent: parentId,
          permissionOverwrites: permissionOverwrites1,
          reason: 'Partida Mixton iniciada desde la web'
        });
      } catch (vc1Err) {
        logger.warn(`Error al crear VC1 con permisos específicos (${vc1Err.message}). Creando con permisos estándar...`);
        vc1 = await guild.channels.create({
          name: `🔊 Team ${capAName}`,
          type: 2,
          parent: parentId,
          reason: 'Partida Mixton iniciada desde la web'
        });
      }

      let vc2 = null;
      try {
        vc2 = await guild.channels.create({
          name: `🔊 Team ${capBName}`,
          type: 2,
          parent: parentId,
          permissionOverwrites: permissionOverwrites2,
          reason: 'Partida Mixton iniciada desde la web'
        });
      } catch (vc2Err) {
        logger.warn(`Error al crear VC2 con permisos específicos (${vc2Err.message}). Creando con permisos estándar...`);
        vc2 = await guild.channels.create({
          name: `🔊 Team ${capBName}`,
          type: 2,
          parent: parentId,
          reason: 'Partida Mixton iniciada desde la web'
        });
      }

      // A. Reproducir anuncio por voz con IA antes de mover a los jugadores
      if (waitingRoomId) {
        const textToSpeak = `La partida entre ${capAName} en contra de ${capBName} iniciará en 5, 4, 3, 2, 1`;
        try {
          await playTTSCountdown(guild, waitingRoomId, textToSpeak);
        } catch (err) {
          logger.error('Error al reproducir el anuncio de voz en Mixton:', err);
        }
      }

      // 2. Mover a los jugadores a los VCs
      const originalVoiceStates = {};

      for (const p of rosterA) {
        const member = await guild.members.fetch(p.discordId).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[p.discordId] = member.voice.channel.id;
          await member.voice.setChannel(vc1).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      for (const p of rosterB) {
        const member = await guild.members.fetch(p.discordId).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[p.discordId] = member.voice.channel.id;
          await member.voice.setChannel(vc2).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      const matchId = `mixton_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 3. Anuncio en Discord
      const matchesChannel = await client.channels.fetch(matchesChannelId).catch(() => null);
      let messageId = null;

      if (matchesChannel) {
        const getLvlEmoji = (lvl) => {
          const l = parseInt(lvl) || 1;
          if (l === 10) return '🔴';
          if (l >= 8) return 'orange_circle'; // we can use standard discord emojis
          // Actually standard discord emojis are :red_circle: :orange_circle: :blue_circle: :white_circle:
          // In raw text: 🔴, 🟠, 🔵, ⚪
          if (l >= 8) return '🟠';
          if (l >= 5) return '🔵';
          return '⚪';
        };

        const avgEloA = Math.round(rosterA.reduce((sum, p) => sum + (p.faceit_elo || 1000), 0) / rosterA.length);
        const avgEloB = Math.round(rosterB.reduce((sum, p) => sum + (p.faceit_elo || 1000), 0) / rosterB.length);

        const team1List = rosterA.map(p => {
          const isCap = p.discordId === teamA.captain.discordId;
          return `${isCap ? '👑 **Capitán**' : '•'} ${getLvlEmoji(p.faceit_level)} <@${p.discordId}> (\`${p.faceit_nickname}\` - ELO: ${p.faceit_elo || 1000})`;
        }).join('\n');

        const team2List = rosterB.map(p => {
          const isCap = p.discordId === teamB.captain.discordId;
          return `${isCap ? '👑 **Capitán**' : '•'} ${getLvlEmoji(p.faceit_level)} <@${p.discordId}> (\`${p.faceit_nickname}\` - ELO: ${p.faceit_elo || 1000})`;
        }).join('\n');

        const embedFields = [
          { name: '🌐 Modo de Juego', value: matchMode === 'steam' ? 'Servidor CS2 Dedicado' : 'Mixton competitivo por FACEIT', inline: true },
          { name: '🗺️ Mapa', value: `\`${mapDisplayName}\``, inline: true },
          { name: '📍 Canales de Voz', value: `🔊 <#${vc1.id}>\n🔊 <#${vc2.id}>`, inline: true }
        ];

        if (parsedBetAmount > 0) {
          embedFields.push({
            name: '💰 Apuesta y Pozo',
            value: `💵 **Cuota:** S/ ${parsedBetAmount.toFixed(2)} c/u\n🏆 **Pozo Total:** S/ ${(parsedBetAmount * 10).toFixed(2)}`,
            inline: true
          });
        }

        const officialCs2ServerIp = (cs2ServerManager.serverIp && !cs2ServerManager.serverIp.includes('ply.gg')) ? cs2ServerManager.serverIp : '38.25.72.56:27015';

        if (matchMode === 'faceit') {
          embedFields.push({ name: '🎯 Sala FACEIT asignada', value: `🟢 **${assignedQueue.name}**\n[Entrar a la cola de ${assignedQueue.name}](${faceitHubUrl})`, inline: false });
        } else {
          embedFields.push({
            name: '🖥️ Servidor CS2 Dedicado',
            value: `⚡ **Comando de Conexión:**\n\`\`\`connect ${officialCs2ServerIp}\`\`\`\n👉 Abre tu consola en CS2 (\`~\`) y ejecuta el comando anterior.\n🗺️ **Mapa Oficial:** \`${mapDisplayName}\``,
            inline: false
          });
        }

        embedFields.push(
          { name: `👥 Roster A (${teamA.name}) [Promedio ELO: ${avgEloA}]`, value: team1List, inline: false },
          { name: `👥 Roster B (${teamB.name}) [Promedio ELO: ${avgEloB}]`, value: team2List, inline: false }
        );

        const startedEmbed = new EmbedBuilder()
          .setTitle(parsedBetAmount > 0 ? `🎮 ¡Partida Mixton con Apuesta (S/ ${parsedBetAmount.toFixed(2)})!` : '🎮 ¡Partida Mixton Competitiva!')
          .setColor(parsedBetAmount > 0 ? 0x15C253 : 0xFF5500)
          .setDescription(matchMode === 'steam'
            ? `Lanzada por el Administrador **${req.user.username}** desde el panel web.\n🖥️ **Servidor CS2:** \`connect ${officialCs2ServerIp}\`\n🗺️ **Mapa:** **${mapDisplayName}**\n⚡ Servidor dedicado iniciado y configurado 5v5.`
            : `Lanzada por el Administrador **${req.user.username}** desde el panel web.\n🎯 **Sala asignada en FACEIT:** **${assignedQueue.name}**\n🗺️ **Mapa:** **${mapDisplayName}**`)
          .addFields(embedFields)
          .setFooter({ text: 'Usa los botones para reportar el resultado de la partida' })
          .setTimestamp();

        if (finalChosenMap?.icon || finalChosenMap?.image) {
          startedEmbed.setThumbnail(finalChosenMap.icon || finalChosenMap.image);
        }

        const winA = new ButtonBuilder()
          .setCustomId(`manual_match_win_a_${matchId}`)
          .setLabel(`Ganó ${teamA.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const winB = new ButtonBuilder()
          .setCustomId(`manual_match_win_b_${matchId}`)
          .setLabel(`Ganó ${teamB.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const cancel = new ButtonBuilder()
          .setCustomId(`manual_match_cancel_${matchId}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(winA, winB, cancel);
        if (matchMode === 'faceit') {
          row.addComponents(new ButtonBuilder()
            .setLabel(`Entrar a ${assignedQueue.name.substring(0, 20)}`)
            .setStyle(ButtonStyle.Link)
            .setURL(faceitHubUrl)
            .setEmoji('🟠'));
        }

        const playerPings = [...rosterA, ...rosterB].map(p => `<@${p.discordId}>`).join(' ');
        const msg = await matchesChannel.send({ 
          content: `📢 **¡Partida Mixtón Iniciada!** (${matchMode === 'steam' ? 'Modo: **SERVIDOR CS2 DEDICADO**' : `Sala: **${assignedQueue.name}**`})\nJugadores: ${playerPings}${matchMode === 'steam' ? `\n⚡ **Conexión CS2:** \`connect ${officialCs2ServerIp}\` (Abre consola en CS2 con \`~\`)` : ''}`,
          embeds: [startedEmbed], 
          components: [row] 
        }).catch(err => logger.error('Error enviando anuncio mixton:', err));
        if (msg) messageId = msg.id;
      }

      if (messageId) {
        const messageUrl = `https://discord.com/channels/${guild.id}/${matchesChannelId}/${messageId}`;

        if (matchMode === 'steam') {
          const officialCs2ServerIp = (cs2ServerManager.serverIp && !cs2ServerManager.serverIp.includes('ply.gg')) ? cs2ServerManager.serverIp : '38.25.72.56:27015';
          const sendSteamTeamInstructions = async (team, roster, voiceChannel) => {
            const captain = team.captain;
            const captainName = captain.faceit_nickname || captain.discordUser?.displayName || 'Capitán';

            for (const player of roster) {
              const member = await guild.members.fetch(player.discordId).catch(() => null);
              if (!member) continue;
              const isCap = (player.discordId === captain.discordId);
              const playerEmbed = new EmbedBuilder()
                .setTitle(`🎮 ¡Partida CS2 Lista — ${team.name}!`)
                .setDescription(`${isCap ? '👑 Eres el **Capitán** de tu equipo.' : `👑 Tu capitán es **${captainName}**.`}\n\nEl servidor dedicado CS2 se encuentra encendido y configurado 5v5 para este encuentro.\n\n🗺️ **Mapa Oficial:** \`${mapDisplayName}\`\n\n⚡ **Conexión al Servidor:**\nAbre la consola de CS2 (\`~\`) y ejecuta:\n\`\`\`connect ${officialCs2ServerIp}\`\`\``)
                .setColor(0x15C253)
                .addFields(
                  { name: '🔊 Tu Canal de Voz', value: `<#${voiceChannel.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
                )
                .setFooter({ text: 'Al finalizar la partida, los jugadores serán kickeados y el servidor se apagará automáticamente.' })
                .setTimestamp();
              await member.send({ content: `connect ${officialCs2ServerIp}`, embeds: [playerEmbed] }).catch(() => {});
            }
          };

          await sendSteamTeamInstructions(teamA, rosterA, vc1);
          await sendSteamTeamInstructions(teamB, rosterB, vc2);
        } else {

        // Notificaciones personalizadas para Roster A
        for (const p of rosterA) {
          try {
            const isCap = (p.discordId === teamA.captain?.discordId);
            let dmEmbed;

            if (isCap) {
              const matesList = (teamA.players || []).map(t => `• [${t.faceit_nickname || 'Jugador'}](https://www.faceit.com/es/players/${t.faceit_nickname || ''}) (<@${t.discordId}>)`).join('\n') || 'Sin compañeros asignados';
              dmEmbed = new EmbedBuilder()
                .setTitle(`👑 ¡Capitán de ${teamA.name} - Sala: ${assignedQueue.name}!`)
                .setDescription(`Has sido elegido Capitán de **${teamA.name}**.\n\n🎯 **SALA FACEIT ASIGNADA: ${assignedQueue.name.toUpperCase()}**\n\n👉 **Invita a tus 4 compañeros a tu Grupo (Party) en FACEIT** y luego dale a **JUGAR** únicamente en esta sala asignada:\n${faceitHubUrl}`)
                .setColor(0xFF5500)
                .addFields(
                  { name: '👥 Tus Compañeros (Haz clic para invitar en Faceit)', value: matesList, inline: false },
                  { name: '🔊 Tu Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true },
                  { name: `🟠 Cola Faceit: ${assignedQueue.name}`, value: `[👉 Abrir ${assignedQueue.name} para Jugar](${faceitHubUrl})`, inline: false }
                )
                .setFooter({ text: `Asegúrate de que los 5 estén en el grupo antes de darle a Jugar en ${assignedQueue.name}` })
                .setTimestamp();
            } else {
              const capNick = teamA.captain?.faceit_nickname || 'Capitán';
              const capUrl = `https://www.faceit.com/es/players/${capNick}`;
              dmEmbed = new EmbedBuilder()
                .setTitle(`🎮 ¡Invitación de Equipo Mixton - Sala: ${assignedQueue.name}!`)
                .setDescription(`Has sido asignado a **${teamA.name}**.\n\n👑 Tu Capitán y líder de grupo en Faceit es: **[${capNick}](${capUrl})** (<@${teamA.captain?.discordId}>).\n\n🎯 **SALA FACEIT ASIGNADA: ${assignedQueue.name.toUpperCase()}**\n\n👉 **Acepta la invitación de grupo de tu Capitán en Faceit** o agrégalo como amigo para unirte a su grupo antes de iniciar la partida.`)
                .setColor(0x15C253)
                .addFields(
                  { name: '👑 Tu Capitán en Faceit', value: `[Perfil de ${capNick}](${capUrl})`, inline: true },
                  { name: '🔊 Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: `🟠 Sala: ${assignedQueue.name}`, value: `[Ir al Hub](${faceitHubUrl})`, inline: true }
                )
                .setFooter({ text: 'Ten abierto Faceit y el Anti-Cheat' })
                .setTimestamp();
            }

            const member = await guild.members.fetch(p.discordId).catch(() => null);
            if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch (e) {
            logger.warn(`No se pudo enviar DM a ${p.discordId}: ${e.message}`);
          }
        }

        // Notificaciones personalizadas para Roster B
        for (const p of rosterB) {
          try {
            const isCap = (p.discordId === teamB.captain?.discordId);
            let dmEmbed;

            if (isCap) {
              const matesList = (teamB.players || []).map(t => `• [${t.faceit_nickname || 'Jugador'}](https://www.faceit.com/es/players/${t.faceit_nickname || ''}) (<@${t.discordId}>)`).join('\n') || 'Sin compañeros asignados';
              dmEmbed = new EmbedBuilder()
                .setTitle(`👑 ¡Capitán de ${teamB.name} - Sala: ${assignedQueue.name}!`)
                .setDescription(`Has sido elegido Capitán de **${teamB.name}**.\n\n🎯 **SALA FACEIT ASIGNADA: ${assignedQueue.name.toUpperCase()}**\n\n👉 **Invita a tus 4 compañeros a tu Grupo (Party) en FACEIT** y luego dale a **JUGAR** únicamente en esta sala asignada:\n${faceitHubUrl}`)
                .setColor(0xFF5500)
                .addFields(
                  { name: '👥 Tus Compañeros (Haz clic para invitar en Faceit)', value: matesList, inline: false },
                  { name: '🔊 Tu Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true },
                  { name: `🟠 Cola Faceit: ${assignedQueue.name}`, value: `[👉 Abrir ${assignedQueue.name} para Jugar](${faceitHubUrl})`, inline: false }
                )
                .setFooter({ text: `Asegúrate de que los 5 estén en el grupo antes de darle a Jugar en ${assignedQueue.name}` })
                .setTimestamp();
            } else {
              const capNick = teamB.captain?.faceit_nickname || 'Capitán';
              const capUrl = `https://www.faceit.com/es/players/${capNick}`;
              dmEmbed = new EmbedBuilder()
                .setTitle(`🎮 ¡Invitación de Equipo Mixton - Sala: ${assignedQueue.name}!`)
                .setDescription(`Has sido asignado a **${teamB.name}**.\n\n👑 Tu Capitán y líder de grupo en Faceit es: **[${capNick}](${capUrl})** (<@${teamB.captain?.discordId}>).\n\n🎯 **SALA FACEIT ASIGNADA: ${assignedQueue.name.toUpperCase()}**\n\n👉 **Acepta la invitación de grupo de tu Capitán en Faceit** o agrégalo como amigo para unirte a su grupo antes de iniciar la partida.`)
                .setColor(0xFF3E3E)
                .addFields(
                  { name: '👑 Tu Capitán en Faceit', value: `[Perfil de ${capNick}](${capUrl})`, inline: true },
                  { name: '🔊 Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: `🟠 Sala: ${assignedQueue.name}`, value: `[Ir al Hub](${faceitHubUrl})`, inline: true }
                )
                .setFooter({ text: 'Ten abierto Faceit y el Anti-Cheat' })
                .setTimestamp();
            }

            const member = await guild.members.fetch(p.discordId).catch(() => null);
            if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch (e) {
            logger.warn(`No se pudo enviar DM a ${p.discordId}: ${e.message}`);
          }
        }
        }
      }

      // Guardar partida activa
      const matchData = {
        entity_custom_name: parsedBetAmount > 0 ? `Mixton Apuesta (S/ ${parsedBetAmount.toFixed(2)})` : 'Mixton / Web',
        game: 'cs2',
        voting: { map: { pick: [mapDisplayName] }, location: { pick: ['Mixton'] } },
        chosen_map: finalChosenMap,
        teams: { faction1: { name: teamA.name }, faction2: { name: teamB.name } },
        creator_id: req.user.userId,
        bet_amount_per_player: parsedBetAmount,
        total_pot: parseFloat((parsedBetAmount * 10).toFixed(2)),
        manual_paid_players: Array.from(manualPaidSet),
        launch_mode: matchMode,
        queue_id: assignedQueue.queueId || assignedQueue.id,
        queue_name: assignedQueue.name
      };

      const dbRosterA = rosterA.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId, steam_id_64: p.steam_id_64 || null }));
      const dbRosterB = rosterB.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId, steam_id_64: p.steam_id_64 || null }));

      await db.addActiveMatch(
        matchId, 
        matchData, 
        vc1.id, 
        vc2.id, 
        messageId, 
        dbRosterA, 
        dbRosterB, 
        originalVoiceStates, 
        guildIdToUse,
        assignedQueue.queueId || assignedQueue.id,
        assignedQueue.name,
        matchesChannelId,
        waitingRoomId
      );

      if (matchMode === 'steam') {
        // 0. Publicar el partido en memoria y Firestore para que el servidor local de CS2 consulte la API
        const cs2Payload = {
          matchId,
          game: 'cs2',
          map: {
            id: finalChosenMap?.id || 'de_mirage',
            name: finalChosenMap?.name || mapDisplayName || 'Mirage',
            cs2MapId: finalChosenMap?.cs2MapId || finalChosenMap?.id || 'de_mirage'
          },
          team1: {
            name: teamA.name,
            tag: teamATag,
            captain: teamA.captain,
            players: rosterA.map((p, idx) => ({
              steam_id_64: String(p.steam_id_64 || '').trim(),
              faceit_player_id: p.faceit_player_id || null,
              nickname: p.faceit_nickname || p.discordUser?.displayName || `Jugador A${idx + 1}`,
              discordId: p.discordId
            }))
          },
          team2: {
            name: teamB.name,
            tag: teamBTag,
            captain: teamB.captain,
            players: rosterB.map((p, idx) => ({
              steam_id_64: String(p.steam_id_64 || '').trim(),
              faceit_player_id: p.faceit_player_id || null,
              nickname: p.faceit_nickname || p.discordUser?.displayName || `Jugador B${idx + 1}`,
              discordId: p.discordId
            }))
          },
          spectators: [
            '76561198675781576',
            '76561198042296985'
          ],
          serverIp: officialCs2ServerIp,
          bet_amount_per_player: parsedBetAmount,
          total_pot: parseFloat((parsedBetAmount * 10).toFixed(2)),
          createdAt: Date.now()
        };

        await cs2ServerManager.publishMatch(cs2Payload, db);

        // Fallback local directo (si el bot corre en la misma máquina que D:\ServerCS2)
        await cs2ServerManager.configureMatch({
          matchId,
          chosenMap: finalChosenMap,
          teamA,
          rosterA,
          teamB,
          rosterB
        }).catch(err => {
          logger.info('[Lobby] Configuración local directa no requerida (esperando agente local):', err.message);
        });

        await cs2ServerManager.startServer().catch(err => {
          logger.info('[Lobby] Inicio local directo no requerido (esperando agente local):', err.message);
        });

        logger.info(`[Lobby] Partida CS2 ${matchId} lista y anunciada. IP del servidor (${officialCs2ServerIp}) enviada a los 10 jugadores por Discord.`);
      }
      await updateLivePanel(client, matchesChannelId, db);

      // Quitar estado mixton_ready
      const usersToResetReady = [...rosterA.map(p => p.discordId), ...rosterB.map(p => p.discordId)];
      await db.resetPlayersReadyStatus(usersToResetReady, guildIdToUse);

      // Vaciar estos dos equipos en el lobby mixton
      teamA.captain = null;
      teamA.players = [];
      teamB.captain = null;
      teamB.players = [];
      state.currentPickIndex = 0;
      state.draftStarted = false;
      state.draftFinished = false;
      state.pickOrder = state.teams.filter(t => t.captain !== null).map(t => t.id);
      state.pickSequence = [];
      state.mapVeto = null;

      await db.saveMixtonLobbyState(state, guildIdToUse);
      mixtonEvents.emit('update', guildIdToUse);

      logger.success(`Partida mixton ${matchId} (${matchMode.toUpperCase()}) iniciada desde web por ${req.user.username}`);
      res.json({ success: true, matchId, faceitHubUrl, assignedQueue });
    } catch (err) {
      logger.error('Error al crear partida mixton desde web:', err);
      res.status(500).json({ error: 'Error al iniciar la partida en el servidor.' });
    }
  });

  // --- Obtener historial de partidas para el lobby mixton (Público / Espectadores y Jugadores) ---
  router.get('/matches-history', optionalAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const history = await db.getMatchHistory(limit, targetGuildId);
      res.json({ history });
    } catch (err) {
      logger.error('Error al obtener historial en lobby:', err);
      res.status(500).json({ error: 'Error al obtener historial.' });
    }
  });

  // The list intentionally contains only compact match summaries. Full FACEIT
  // player statistics are fetched from Firestore only when this detail route
  // is opened by the visitor.
  router.get('/matches-history/:matchId', optionalAuth, async (req, res) => {
    try {
      const history = await db.getMatchHistoryById(req.params.matchId);
      if (!history) return res.status(404).json({ error: 'Partida no encontrada.' });
      let stats = await db.getMatchStats(req.params.matchId);
      if (!stats && history.stats) {
        stats = history.stats;
      }
      res.json({ history, stats });
    } catch (err) {
      logger.error('Error al obtener detalle del historial:', err);
      res.status(500).json({ error: 'Error al obtener el detalle de la partida.' });
    }
  });

  // --- Cargar roster completo a un equipo en el lobby mixton (Admin) ---
  router.post('/mixton-load-team', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, captainDiscordId, playerDiscordIds } = req.body;
      
      if (!teamId || !captainDiscordId || !Array.isArray(playerDiscordIds)) {
        return res.status(400).json({ error: 'Faltan parámetros (teamId, captainDiscordId, playerDiscordIds).' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);

      // Obtener perfiles de Firestore para todos los jugadores en paralelo.
      // Ya que las partidas de Faceit normales pueden no tener discord_id en la historia
      // y mandan el UUID de Faceit, resolvemos el ID de Discord dinámicamente si es necesario.
      const allIdsInput = [captainDiscordId, ...playerDiscordIds];
      
      const resolveProfilePromises = allIdsInput.map(async (inputId) => {
        let user = await db.getFullUser(inputId, req.guildId);
        if (!user) {
          const resolvedDiscordId = await db.getDiscordIdByFaceitId(inputId, req.guildId);
          if (resolvedDiscordId) {
            user = await db.getFullUser(resolvedDiscordId, req.guildId);
          }
        }
        return { inputId, user };
      });
      
      const resolvedResults = await Promise.all(resolveProfilePromises);
      
      const profiles = {};
      let finalCapDiscordId = null;
      const finalPlayerDiscordIds = [];
      
      for (const resItem of resolvedResults) {
        const { inputId, user } = resItem;
        if (!user) {
          return res.status(400).json({ error: `El jugador con ID o Faceit ID '${inputId}' no está registrado en la base de datos.` });
        }
        
        const finalDiscordId = user.discordId || user.id;
        profiles[finalDiscordId] = user;
        
        if (inputId === captainDiscordId) {
          finalCapDiscordId = finalDiscordId;
        } else {
          finalPlayerDiscordIds.push(finalDiscordId);
        }
      }

      // Quitar a todos estos jugadores de otros equipos/capitanías para evitar duplicados
      const allIdsSet = new Set([finalCapDiscordId, ...finalPlayerDiscordIds]);
      state.teams.forEach(t => {
        if (t.captain && allIdsSet.has(t.captain.discordId)) {
          t.captain = null;
        }
        t.players = (t.players || []).filter(p => !allIdsSet.has(p.discordId));
      });

      // Asignar Capitán
      const capData = profiles[finalCapDiscordId];
      
      // Resolve both captain and players' Discord user details in parallel!
      const userDetailsPromises = [
        getDiscordUserDetails(guild, finalCapDiscordId),
        ...finalPlayerDiscordIds.map(dId => getDiscordUserDetails(guild, dId))
      ];
      
      const [discordUserCap, ...discordUsersPlayers] = await Promise.all(userDetailsPromises);

      let finalCapUser = discordUserCap;
      if ((!finalCapUser || finalCapUser.username === 'usuario_discord') && capData.discord_avatar) {
        finalCapUser = {
          username: capData.discord_username || 'usuario_discord',
          displayName: capData.discord_displayName || capData.faceit_nickname || 'Usuario Discord',
          avatarURL: capData.discord_avatar
        };
      }

      team.captain = {
        discordId: finalCapDiscordId,
        faceit_player_id: capData.faceit_player_id || '',
        faceit_nickname: capData.faceit_nickname || '',
        faceit_level: capData.faceit_level || 1,
        faceit_elo: capData.faceit_elo || 1000,
        mixton_guild_id: targetGuildId,
        discordUser: finalCapUser || null
      };

      // Asignar Jugadores
      team.players = [];
      finalPlayerDiscordIds.forEach((dId, idx) => {
        const pData = profiles[dId];
        let finalPUser = discordUsersPlayers[idx];
        if ((!finalPUser || finalPUser.username === 'usuario_discord') && pData.discord_avatar) {
          finalPUser = {
            username: pData.discord_username || 'usuario_discord',
            displayName: pData.discord_displayName || pData.faceit_nickname || 'Usuario Discord',
            avatarURL: pData.discord_avatar
          };
        }
        team.players.push({
          discordId: dId,
          faceit_player_id: pData.faceit_player_id || '',
          faceit_nickname: pData.faceit_nickname || '',
          faceit_level: pData.faceit_level || 1,
          faceit_elo: pData.faceit_elo || 1000,
          mixton_guild_id: targetGuildId,
          discordUser: finalPUser || null
        });
      });

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-load-team:', err);
      res.status(500).json({ error: 'Error al cargar el equipo.' });
    }
  });

  // Vaciar/Limpiar un equipo completo en el lobby mixton (Admin)
  router.post('/mixton-clear-team', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId } = req.body;
      if (!teamId) {
        return res.status(400).json({ error: 'Falta el teamId.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      // Vaciar capitán y jugadores
      team.captain = null;
      team.players = [];

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      
      logger.success(`El administrador ${req.user.username} vació el equipo ${teamId}.`);
      await db.addLogEntry('info', `El administrador ${req.user.username} vació el equipo ${teamId} (${team.name}) en el lobby.`, 'system');

      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-clear-team:', err);
      res.status(500).json({ error: 'Error al vaciar el equipo.' });
    }
  });

  // 9. Poner a todos los usuarios listos como no listos (Admin)
  router.post('/mixton-reset-players', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const resetCount = await db.resetAllReadyPlayers(req.guildId);
      
      if (resetCount === 0) {
        return res.json({ success: true, message: 'No hay usuarios listos en la lista.' });
      }

      logger.success(`Se marcaron ${resetCount} usuarios como no listos.`);
      await db.addLogEntry('info', `El administrador ${req.user.username} marcó a todos los jugadores (${resetCount}) como no listos.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, count: resetCount });
    } catch (err) {
      logger.error('Error al restablecer disponibilidad de jugadores:', err);
      res.status(500).json({ error: 'Error al vaciar la lista de listos.' });
    }
  });

  // Quitar a un jugador de la cola de listos o de un equipo (Admin)
  router.post('/mixton-remove-player', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      if (!discordId) {
        return res.status(400).json({ error: 'Falta el discordId del jugador.' });
      }

      if (teamId) {
        // Lógica de quitar de un equipo
        const state = await db.getMixtonLobbyState(req.guildId);
        const team = state.teams.find(t => t.id === teamId);
        if (!team) {
          return res.status(404).json({ error: 'Equipo no encontrado.' });
        }

        if (team.players) {
          team.players = team.players.filter(p => p.discordId !== discordId);
        }

        await db.saveMixtonLobbyState(state, req.guildId);
        mixtonEvents.emit('update', req.guildId);

        logger.success(`Administrador ${req.user.username} removió al jugador ${discordId} del equipo ${team.name}`);
        await db.addLogEntry('info', `El administrador ${req.user.username} removió a un jugador del equipo ${team.name}.`, 'system');

        return res.json({ success: true, state });
      } else {
        // Lógica de quitar de la cola de listos
        const success = await db.setPlayerReadyStatus(discordId, false, req.guildId);
        if (success) {
          logger.success(`El administrador ${req.user.username} removió al jugador ${discordId} de la cola de listos.`);
          await db.addLogEntry('info', `El administrador ${req.user.username} removió al jugador con Discord ID ${discordId} de la cola de listos.`, 'system');
          mixtonEvents.emit('update', req.guildId);
          return res.json({ success: true });
        } else {
          return res.status(500).json({ error: 'No se pudo remover al jugador.' });
        }
      }
    } catch (err) {
      logger.error('Error al remover jugador:', err);
      res.status(500).json({ error: 'Error al remover al jugador en el servidor.' });
    }
  });

  // 10. Activar/Desactivar comandos mixton en Discord (Admin)
  router.post('/mixton-toggle-command', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'El valor de "enabled" debe ser un booleano.' });
      }

      const settings = await db.getGuildSettings(req.guildId).catch(() => ({}));
      settings.command_mixton_listo = enabled;
      settings.command_mixton_no_listo = enabled;
      await db.setGuildSettings(req.guildId, settings);

      // Invalidar cache de settings en memoria
      invalidateSettingsCache();

      logger.success(`Comandos mixton actualizados a: ${enabled ? 'ACTIVADOS' : 'DESACTIVADOS'}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} cambió el estado de los comandos mixton a: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, commandEnabled: enabled });
    } catch (err) {
      logger.error('Error al cambiar estado de comandos mixton:', err);
      res.status(500).json({ error: 'Error al actualizar el estado de los comandos.' });
    }
  });

  // 11. Cambiar/Override el Tier de un jugador (Admin)
  router.post('/mixton-override-tier', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { playerDiscordId, tier } = req.body;
      if (!playerDiscordId) {
        return res.status(400).json({ error: 'Falta el ID del jugador.' });
      }

      if (tier !== null && tier !== 'S' && tier !== 'A' && tier !== 'B' && tier !== 'C') {
        return res.status(400).json({ error: 'Tier inválido. Debe ser S, A, B, C o null.' });
      }

      const userData = await db.getFullUser(playerDiscordId, req.guildId);
      if (!userData) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      await db.overridePlayerTier(playerDiscordId, tier, req.guildId);

      logger.success(`Administrador ${req.user.username} cambió el tier de ${playerDiscordId} a: ${tier || 'Por defecto (Nivel)'}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} cambió el tier de ${userData.faceit_nickname || playerDiscordId} a: ${tier || 'Por defecto (Nivel)'}.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, tier });
    } catch (err) {
      logger.error('Error al cambiar tier de jugador:', err);
      res.status(500).json({ error: 'Error al cambiar el tier del jugador.' });
    }
  });

  // 12. Asignar un jugador a un equipo directamente sin esperar turno (Admin)
  router.post('/mixton-assign-player', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      if (!teamId || !discordId) {
        return res.status(400).json({ error: 'Faltan parámetros (teamId, discordId).' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      if (team.players && team.players.length >= 4) {
        return res.status(400).json({ error: 'El equipo ya tiene el máximo de 4 jugadores elegidos.' });
      }

      // Buscar al jugador en Firestore
      const data = await db.getFullUser(discordId, req.guildId);
      if (!data) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      // Resolver detalles de Discord
      const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      let discordUser = null;
      if (guild) {
        discordUser = await getDiscordUserDetails(guild, discordId);
      }

      const playerObj = {
        discordId,
        faceit_player_id: data.faceit_player_id || '',
        faceit_nickname: data.faceit_nickname || '',
        faceit_level: data.faceit_level || 1,
        faceit_elo: data.faceit_elo || 1000,
        mixton_tier_override: data.mixton_tier_override || null,
        mixton_guild_id: data.mixton_guild_id || null,
        discordUser
      };

      // Quitar de elegidos de otros equipos si existía
      state.teams.forEach(t => {
        t.players = (t.players || []).filter(p => p.discordId !== discordId);
      });

      // Quitar de capitán si existía
      state.teams.forEach(t => {
        if (t.captain && t.captain.discordId === discordId) {
          t.captain = null;
        }
      });

      if (!team.players) team.players = [];
      team.players.push(playerObj);

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      logger.success(`Administrador ${req.user.username} asignó manualmente a ${playerObj.faceit_nickname} al equipo ${team.name}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} asignó manualmente a ${playerObj.faceit_nickname} al equipo ${team.name}.`, 'system');

      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error al asignar jugador manualmente:', err);
      res.status(500).json({ error: 'Error al asignar jugador.' });
    }
  });



  return router;
}

