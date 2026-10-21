import { logger } from '../utils/logger.js';

// Cache en memoria para avatares de Steam con TTL de 2 horas
const steamAvatarCache = new Map();
const STEAM_AVATAR_TTL = 2 * 60 * 60 * 1000;

export async function fetchSteamAvatar(steamId) {
  if (!steamId) return null;
  const cleanId = String(steamId).trim();
  if (!/^\d{17}$/.test(cleanId)) return null;

  const cached = steamAvatarCache.get(cleanId);
  if (cached && (Date.now() - cached.timestamp < STEAM_AVATAR_TTL)) {
    return cached.url;
  }

  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${cleanId}/?xml=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
      return null;
    }

    const xml = await res.text();
    const match = xml.match(/<avatarMedium><!\[CDATA\[(.*?)\]\]><\/avatarMedium>/) ||
                  xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) ||
                  xml.match(/<avatarIcon><!\[CDATA\[(.*?)\]\]><\/avatarIcon>/);

    const avatarUrl = match ? match[1].trim() : null;
    if (avatarUrl) {
      steamAvatarCache.set(cleanId, { url: avatarUrl, timestamp: Date.now() });
      return avatarUrl;
    }
  } catch (err) {
    logger.warn(`[SteamAvatarService] Error al consultar avatar de Steam para ${cleanId}: ${err.message}`);
  }

  return null;
}

export async function fetchMultipleSteamAvatars(steamIds) {
  if (!Array.isArray(steamIds) || steamIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(steamIds.map(id => String(id).trim()).filter(id => /^\d{17}$/.test(id))));

  const results = await Promise.allSettled(uniqueIds.map(async id => ({
    id,
    avatar: await fetchSteamAvatar(id)
  })));

  const map = {};
  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value.avatar) {
      map[res.value.id] = res.value.avatar;
    }
  });

  return map;
}

/**
 * Enriquece la información de jugadores del historial y estadísticas con su foto de perfil directamente de Steam.
 */
export async function enrichMatchWithSteamAvatars(history, stats, db) {
  if (!history && !stats) return { history, stats };

  try {
    const roster = [
      ...(history?.faction1_roster || []),
      ...(history?.faction2_roster || [])
    ];

    // Mapeo auxiliar de jugadores por nickname, ID y discord_id
    const playerLookup = new Map();

    // 1. Resolver steam_id_64 desde la BD o roster
    await Promise.all(roster.map(async p => {
      let s64 = p.steam_id_64 || (/^\d{17}$/.test(String(p.id)) ? String(p.id) : null);
      let u = null;

      if (!s64 && p.discord_id && db) {
        try {
          u = await db.getFullUser(p.discord_id);
          if (u?.steam_id_64 && /^\d{17}$/.test(String(u.steam_id_64))) {
            s64 = String(u.steam_id_64);
          }
        } catch {}
      }

      const info = { s64, user: u, p };
      if (p.nickname) playerLookup.set(String(p.nickname).toLowerCase().trim(), info);
      if (p.id) playerLookup.set(String(p.id).toLowerCase().trim(), info);
      if (p.discord_id) playerLookup.set(String(p.discord_id).trim(), info);
    }));

    // 2. Extraer todos los Steam IDs presentes en los equipos de stats y roster
    const steamIdsToFetch = new Set();

    if (stats?.teams) {
      stats.teams.forEach(team => {
        (team.players || []).forEach(player => {
          let s64 = /^\d{17}$/.test(String(player.playerId)) ? String(player.playerId) : null;
          if (!s64) {
            const matched = playerLookup.get(String(player.playerId || '').toLowerCase().trim()) ||
                            playerLookup.get(String(player.nickname || '').toLowerCase().trim());
            if (matched?.s64) s64 = matched.s64;
          }
          if (s64) steamIdsToFetch.add(s64);
        });
      });
    }

    roster.forEach(p => {
      let s64 = p.steam_id_64 || (/^\d{17}$/.test(String(p.id)) ? String(p.id) : null);
      if (!s64) {
        const matched = playerLookup.get(String(p.nickname || '').toLowerCase().trim());
        if (matched?.s64) s64 = matched.s64;
      }
      if (s64) steamIdsToFetch.add(s64);
    });

    // 3. Consultar los avatares directamente de Steam en paralelo
    const avatarsMap = await fetchMultipleSteamAvatars(Array.from(steamIdsToFetch));

    // 4. Inyectar avatar y steam_id_64 en stats.teams
    if (stats?.teams) {
      stats.teams.forEach(team => {
        (team.players || []).forEach(player => {
          let s64 = /^\d{17}$/.test(String(player.playerId)) ? String(player.playerId) : null;
          const matched = playerLookup.get(String(player.playerId || '').toLowerCase().trim()) ||
                          playerLookup.get(String(player.nickname || '').toLowerCase().trim());

          if (!s64 && matched?.s64) {
            s64 = matched.s64;
          }

          player.steam_id_64 = s64 || null;
          player.avatar = (s64 && avatarsMap[s64]) ||
                          player.avatar ||
                          matched?.user?.discord_avatar ||
                          matched?.user?.faceit_avatar ||
                          null;
        });
      });
    }

    // 5. Inyectar avatar y steam_id_64 en history rosters
    if (history?.faction1_roster) {
      history.faction1_roster.forEach(p => {
        const matched = playerLookup.get(String(p.nickname || '').toLowerCase().trim()) ||
                        playerLookup.get(String(p.id || '').toLowerCase().trim());
        const s64 = p.steam_id_64 || matched?.s64 || null;
        p.steam_id_64 = s64;
        p.avatar = (s64 && avatarsMap[s64]) || p.avatar || matched?.user?.discord_avatar || matched?.user?.faceit_avatar || null;
      });
    }

    if (history?.faction2_roster) {
      history.faction2_roster.forEach(p => {
        const matched = playerLookup.get(String(p.nickname || '').toLowerCase().trim()) ||
                        playerLookup.get(String(p.id || '').toLowerCase().trim());
        const s64 = p.steam_id_64 || matched?.s64 || null;
        p.steam_id_64 = s64;
        p.avatar = (s64 && avatarsMap[s64]) || p.avatar || matched?.user?.discord_avatar || matched?.user?.faceit_avatar || null;
      });
    }
  } catch (err) {
    logger.error('[SteamAvatarService] Error al enriquecer match con avatares de Steam:', err);
  }

  return { history, stats };
}
