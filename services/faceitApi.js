import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * fetch con reintentos automáticos ante errores de red transitorios (ECONNRESET, etc.)
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} retries - número máximo de reintentos (default 3)
 * @param {number} baseDelayMs - retraso base en ms para backoff exponencial (default 500)
 */
async function fetchWithRetry(url, options = {}, retries = 3, baseDelayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      const isNetworkError = err.cause?.code === 'ECONNRESET'
        || err.cause?.code === 'ECONNREFUSED'
        || err.cause?.code === 'ETIMEDOUT'
        || err.message === 'fetch failed';

      if (isNetworkError && attempt < retries) {
        const delay = baseDelayMs * 2 ** (attempt - 1); // 500ms, 1000ms, 2000ms…
        logger.warn(`[fetchWithRetry] Intento ${attempt}/${retries} fallido (${err.cause?.code ?? err.message}). Reintentando en ${delay}ms… URL: ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

export async function fetchFaceitPlayer(nickname) {
  const res = await fetch(
    `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
    {
      headers: {
        Authorization: `Bearer ${env.FACEIT_API_KEY}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('PLAYER_NOT_FOUND');
    throw new Error(`API Faceit status ${res.status}`);
  }
  return res.json();
}

export async function fetchFaceitPlayerById(playerId) {
  const res = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
    headers: {
      Authorization: `Bearer ${env.FACEIT_API_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`API Faceit status ${res.status}`);
  return res.json();
}

export async function fetchFaceitStats(playerId, game = 'cs2') {
  const res = await fetch(
    `https://open.faceit.com/data/v4/players/${playerId}/stats/${game}`,
    {
      headers: {
        Authorization: `Bearer ${env.FACEIT_API_KEY}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPlayerHistory(playerId, game = 'cs2', limit = 20) {
  const res = await fetch(
    `https://open.faceit.com/data/v4/players/${playerId}/history?game=${game}&offset=0&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${env.FACEIT_API_KEY}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchHubInfo(hubId) {
  try {
    const res = await fetch(`https://open.faceit.com/data/v4/hubs/${hubId}`, {
      headers: {
        Authorization: `Bearer ${env.FACEIT_API_KEY}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch(e) {
    return null;
  }
}

export async function fetchLeaderboard(id) {
  try {
    // Attempt 1: Fetch directly assuming it's a leaderboard ID
    let res = await fetch(`https://open.faceit.com/data/v4/leaderboards/${id}?offset=0&limit=50`, {
      headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
    });
    
    let leaderboardData = null;

    // Attempt 2: If 404, it might be a Hub ID. Let's find the latest season leaderboard for this hub.
    if (res.status === 404) {
      const hubRes = await fetch(`https://open.faceit.com/data/v4/leaderboards/hubs/${id}`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
      });
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        if (hubData.items && hubData.items.length > 0) {
          const seasons = hubData.items.filter(i => i.leaderboard_type === 'hub_season');
          seasons.sort((a, b) => b.season - a.season);
          const latestLeaderboardId = seasons.length > 0 ? seasons[0].leaderboard_id : hubData.items[0].leaderboard_id;
          
          res = await fetch(`https://open.faceit.com/data/v4/leaderboards/${latestLeaderboardId}?offset=0&limit=50`, {
            headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
          });
          if (res.ok) {
            leaderboardData = await res.json();
          }
        }
      }
    } else if (res.ok) {
      leaderboardData = await res.json();
      
      // If it's a valid leaderboard, check if it belongs to a Hub and auto-resolve to the latest season
      if (leaderboardData && leaderboardData.leaderboard && leaderboardData.leaderboard.competition_type === 'hub') {
        const hubId = leaderboardData.leaderboard.competition_id;
        if (hubId) {
          const hubRes = await fetch(`https://open.faceit.com/data/v4/leaderboards/hubs/${hubId}`, {
            headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
          });
          if (hubRes.ok) {
            const hubData = await hubRes.json();
            if (hubData.items && hubData.items.length > 0) {
              const seasons = hubData.items.filter(i => i.leaderboard_type === 'hub_season');
              seasons.sort((a, b) => b.season - a.season);
              
              if (seasons.length > 0) {
                const latestLeaderboardId = seasons[0].leaderboard_id;
                if (latestLeaderboardId !== id) {
                  const latestRes = await fetch(`https://open.faceit.com/data/v4/leaderboards/${latestLeaderboardId}?offset=0&limit=50`, {
                    headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
                  });
                  if (latestRes.ok) {
                    leaderboardData = await latestRes.json();
                  }
                }
              }
            }
          }
        }
      }
    }

    return leaderboardData;
  } catch(e) {
    logger.error('Error in fetchLeaderboard:', e);
    return null;
  }
}

export async function checkHubBanStatus(hubId, userId) {
  const limit = 50;
  let offset = 0;
  let hasMore = true;

  try {
    const res = await fetch(
      `https://open.faceit.com/data/v4/hubs/${hubId}/bans?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    if (res.status === 404) {
      const hubCheckRes = await fetch(`https://open.faceit.com/data/v4/hubs/${hubId}`, {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      });
      if (hubCheckRes.ok) {
        logger.warn(`El Hub con ID ${hubId} existe, pero su endpoint de baneos retornó 404. Esto suele ocurrir si la API Key no tiene permisos de administrador/organizador en este Hub o si el recurso no está disponible.`);
        return null;
      }

      logger.info(`Bans del Hub ${hubId} retornó 404. Intentando buscar hubs del Organizador/Club...`);
      const orgRes = await fetch(
        `https://open.faceit.com/data/v4/organizers/${hubId}/hubs`,
        {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        }
      );

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        if (orgData.items && orgData.items.length > 0) {
          for (const hubItem of orgData.items) {
            const childHubId = hubItem.hub_id;
            const ban = await checkHubBanStatus(childHubId, userId);
            if (ban) return ban;
          }
        }
      }

      logger.warn(`El Hub con ID ${hubId} no existe o no es accesible (404). Verifica que el ID sea correcto.`);
      return null;
    }

    if (!res.ok) {
      throw new Error(`API Faceit status ${res.status} al consultar baneos del Hub`);
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const ban = data.items.find(item => item.user?.user_id === userId);
      if (ban) return ban;

      if (data.items.length === limit) {
        offset += limit;
        while (hasMore) {
          const pageRes = await fetch(
            `https://open.faceit.com/data/v4/hubs/${hubId}/bans?offset=${offset}&limit=${limit}`,
            {
              headers: {
                Authorization: `Bearer ${env.FACEIT_API_KEY}`,
                Accept: 'application/json',
              },
            }
          );
          if (!pageRes.ok) break;
          const pageData = await pageRes.json();
          if (!pageData.items || pageData.items.length === 0) break;
          const found = pageData.items.find(item => item.user?.user_id === userId);
          if (found) return found;
          if (pageData.items.length < limit) break;
          offset += limit;
        }
      }
    }
  } catch (error) {
    logger.error(`Error en checkHubBanStatus para el Hub ${hubId} y usuario ${userId}:`, error.message);
  }

  return null;
}

export async function fetchAllHubBans(hubId) {
  const limit = 50;
  let offset = 0;
  let hasMore = true;
  const allBans = [];

  try {
    const res = await fetch(
      `https://open.faceit.com/data/v4/hubs/${hubId}/bans?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    if (res.status === 404) {
      const hubCheckRes = await fetch(`https://open.faceit.com/data/v4/hubs/${hubId}`, {
        headers: {
          Authorization: `Bearer ${env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
      });
      if (hubCheckRes.ok) {
        return null;
      }

      logger.info(`Bans del Hub ${hubId} retornó 404. Intentando buscar hubs del Organizador/Club...`);
      const orgRes = await fetch(
        `https://open.faceit.com/data/v4/organizers/${hubId}/hubs`,
        {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        }
      );

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        if (orgData.items && orgData.items.length > 0) {
          logger.success(`Se encontraron ${orgData.items.length} Hubs para el Organizador/Club ${hubId}. Consultando baneos de cada uno...`);
          for (const hubItem of orgData.items) {
            const childHubId = hubItem.hub_id;
            const childBans = await fetchAllHubBans(childHubId);
            allBans.push(...childBans);
          }
          return allBans;
        }
      }

      logger.warn(`El Hub o Club con ID ${hubId} no existe o no es accesible (404). Verifica que el ID sea correcto.`);
      return [];
    }

    if (!res.ok) {
      throw new Error(`API Faceit status ${res.status} al consultar todos los baneos del Hub`);
    }

    const data = await res.json();
    allBans.push(...(data.items || []));

    if (data.items && data.items.length === limit) {
      offset += limit;
      while (hasMore) {
        const pageRes = await fetch(
          `https://open.faceit.com/data/v4/hubs/${hubId}/bans?offset=${offset}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${env.FACEIT_API_KEY}`,
              Accept: 'application/json',
            },
          }
        );
        if (!pageRes.ok) break;
        const pageData = await pageRes.json();
        if (!pageData.items || pageData.items.length === 0) break;
        allBans.push(...pageData.items);
        if (pageData.items.length < limit) break;
        offset += limit;
      }
    }
  } catch (error) {
    logger.error(`Error en fetchAllHubBans para el Hub ${hubId}:`, error.message);
  }

  return allBans;
}

/**
 * Obtiene los puntos y la tabla de posiciones de la última temporada para un Club/Hub y Cola de FACEIT.
 * @param {string} clubId - ID del Club u Organizador/Hub (opcional si se provee queueId)
 * @param {string} queueId - ID de la Cola o Hub (opcional si se provee clubId)
 * @param {Object} options - { offset, limit, nickname, playerId }
 */
export async function fetchLatestSeasonPoints(clubId, queueId, options = {}) {
  const limit = Math.min(parseInt(options.limit) || 50, 100);
  const offset = parseInt(options.offset) || 0;
  const targetNickname = (options.nickname || options.player || '').toLowerCase().trim();
  const targetPlayerId = (options.playerId || options.player_id || '').trim();

  let hubId = queueId || clubId;
  let leaderboardsData = null;

  // 1. Intentar consultar leaderboards usando queueId como ID de Hub
  if (queueId) {
    try {
      const res = await fetchWithRetry(`https://open.faceit.com/data/v4/leaderboards/hubs/${queueId}`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
      });
      if (res.ok) {
        leaderboardsData = await res.json();
      }
    } catch (e) {
      logger.error('Error al consultar leaderboards por queueId:', e);
    }
  }

  // 2. Si no se obtuvieron resultados con queueId, intentar con clubId
  if ((!leaderboardsData || !leaderboardsData.items || leaderboardsData.items.length === 0) && clubId) {
    try {
      const res = await fetchWithRetry(`https://open.faceit.com/data/v4/leaderboards/hubs/${clubId}`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
      });
      if (res.ok) {
        leaderboardsData = await res.json();
        if (leaderboardsData && leaderboardsData.items && leaderboardsData.items.length > 0) {
          hubId = clubId;
        }
      }
    } catch (e) {
      logger.error('Error al consultar leaderboards por clubId:', e);
    }
  }

  let latestLeaderboard = null;

  if (leaderboardsData && leaderboardsData.items && leaderboardsData.items.length > 0) {
    // Filtrar por 'hub_season' si están definidos
    const hubSeasons = leaderboardsData.items.filter(i => i.leaderboard_type === 'hub_season');
    const itemsToEvaluate = hubSeasons.length > 0 ? hubSeasons : leaderboardsData.items;

    // Ordenar descendente por número de temporada (la mayor temporada es la más reciente/última)
    itemsToEvaluate.sort((a, b) => (b.season || 0) - (a.season || 0));
    latestLeaderboard = itemsToEvaluate[0];
  } else if (queueId || clubId) {
    // Fallback: intentar consultar como ID directo de leaderboard
    const targetId = queueId || clubId;
    try {
      const res = await fetch(`https://open.faceit.com/data/v4/leaderboards/${targetId}?offset=0&limit=1`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const directData = await res.json();
        if (directData && directData.leaderboard) {
          latestLeaderboard = directData.leaderboard;
        }
      }
    } catch (e) {
      logger.error('Error en fallback de leaderboard directo:', e);
    }
  }

  if (!latestLeaderboard || !latestLeaderboard.leaderboard_id) {
    throw new Error('NO_LEADERBOARD_FOUND');
  }

  // 3. Consultar los puntos/posiciones de la última temporada
  const targetLbId = latestLeaderboard.leaderboard_id;
  const lbRes = await fetch(`https://open.faceit.com/data/v4/leaderboards/${targetLbId}?offset=${offset}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
  });

  if (!lbRes.ok) {
    throw new Error(`API Faceit error status ${lbRes.status}`);
  }

  const lbData = await lbRes.json();
  const rawItems = lbData.items || [];

  const formattedLeaderboard = rawItems.map(item => {
    const player = item.player || {};
    const played = item.played ?? 0;
    const won = item.won ?? 0;
    const lost = item.lost ?? 0;
    const winRateNum = played > 0 ? (won / played) * 100 : 0;

    const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';
    const avatarUrl = player.avatar || DEFAULT_AVATAR;

    return {
      position: item.position,
      player_id: player.user_id,
      nickname: player.nickname,
      avatar: avatarUrl,
      skill_level: player.skill_level,
      faceit_url: player.faceit_url || (player.nickname ? `https://www.faceit.com/en/players/${player.nickname}` : ''),
      points: item.points ?? 0,
      played,
      won,
      lost,
      win_rate: `${winRateNum.toFixed(2)}%`
    };
  });

  // 4. Si se especificó un jugador particular para consultar sus puntos
  let playerStats = null;
  if (targetNickname || targetPlayerId) {
    playerStats = formattedLeaderboard.find(p =>
      (targetNickname && p.nickname?.toLowerCase() === targetNickname) ||
      (targetPlayerId && p.player_id === targetPlayerId)
    ) || null;

    // Si no se encuentra en el primer tramo paginado, buscar en el tramo completo de hasta 100 si offset era 0
    if (!playerStats && offset === 0 && limit < 100 && rawItems.length >= limit) {
      try {
        const fullRes = await fetch(`https://open.faceit.com/data/v4/leaderboards/${targetLbId}?offset=0&limit=100`, {
          headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
        });
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          const fullItems = fullData.items || [];
          const found = fullItems.find(item =>
            (targetNickname && item.player?.nickname?.toLowerCase() === targetNickname) ||
            (targetPlayerId && item.player?.user_id === targetPlayerId)
          );
          if (found) {
            const played = found.played ?? 0;
            const won = found.won ?? 0;
            const lost = found.lost ?? 0;
            const winRateNum = played > 0 ? (won / played) * 100 : 0;
            playerStats = {
              position: found.position,
              player_id: found.player?.user_id,
              nickname: found.player?.nickname,
              avatar: found.player?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
              skill_level: found.player?.skill_level,
              faceit_url: found.player?.faceit_url || (found.player?.nickname ? `https://www.faceit.com/en/players/${found.player.nickname}` : ''),
              points: found.points ?? 0,
              played,
              won,
              lost,
              win_rate: `${winRateNum.toFixed(2)}%`
            };
          }
        }
      } catch (e) {
        // Ignorar error secundario de búsqueda
      }
    }
  }

  const seasonInfo = {
    leaderboard_id: latestLeaderboard.leaderboard_id,
    leaderboard_name: latestLeaderboard.leaderboard_name || lbData.leaderboard?.leaderboard_name,
    season: latestLeaderboard.season || lbData.leaderboard?.season || 1,
    status: latestLeaderboard.status || lbData.leaderboard?.status,
    points_per_win: latestLeaderboard.points_per_win,
    points_per_loss: latestLeaderboard.points_per_loss,
    starting_points: latestLeaderboard.starting_points
  };

  return {
    success: true,
    club_id: clubId || hubId,
    queue_id: queueId || hubId,
    season: seasonInfo,
    total_players: formattedLeaderboard.length,
    player_stats: playerStats,
    leaderboard: formattedLeaderboard
  };
}

const seasonMemoryCache = new Map(); // id -> { season, expiresAt }

/**
 * Obtiene la temporada (season) actual de un Hub o Cola de Faceit.
 * Utiliza caché en memoria de 5 minutos y soporte para fallbackId si targetId no tiene leaderboards.
 * @param {string} targetId - ID de la cola o hub
 * @param {string|null} fallbackId - ID de respaldo (ej: FACEIT_LEADERBOARD_ID o FACEIT_HUB_ID)
 * @returns {Promise<number|null>}
 */
export async function fetchCurrentHubSeason(targetId, fallbackId = null) {
  const candidateIds = [targetId, fallbackId].filter(id => id && typeof id === 'string' && !id.startsWith('ID_') && !id.startsWith('TU_'));
  if (candidateIds.length === 0 || !env.FACEIT_API_KEY || env.FACEIT_API_KEY.startsWith('TU_')) {
    return null;
  }

  const now = Date.now();
  for (const id of candidateIds) {
    const cached = seasonMemoryCache.get(id);
    if (cached && cached.expiresAt > now) {
      return cached.season;
    }
  }

  for (const id of candidateIds) {
    try {
      const res = await fetchWithRetry(`https://open.faceit.com/data/v4/leaderboards/hubs/${id}`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}`, Accept: 'application/json' },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const hubSeasons = data.items.filter(i => i.leaderboard_type === 'hub_season');
          const items = hubSeasons.length > 0 ? hubSeasons : data.items;

          // 1. Priorizar la que esté en curso ("ONGOING")
          const ongoing = items.find(i => (i.status || '').toUpperCase() === 'ONGOING' && typeof i.season === 'number');
          if (ongoing) {
            seasonMemoryCache.set(id, { season: ongoing.season, expiresAt: now + 5 * 60 * 1000 });
            return ongoing.season;
          }

          // 2. Si no hay ONGOING, tomar la mayor/más reciente
          items.sort((a, b) => (b.season || 0) - (a.season || 0));
          if (items[0] && typeof items[0].season === 'number') {
            seasonMemoryCache.set(id, { season: items[0].season, expiresAt: now + 5 * 60 * 1000 });
            return items[0].season;
          }
        }
      }
    } catch (err) {
      logger.error(`Error al consultar temporada para ${id}:`, err.message);
    }
  }

  return null;
}

const faceitQueuesCache = new Map();

/**
 * Consulta y autodetecta las colas y salas asociadas a un Hub o Club de Faceit.
 * Soporta Clubs con divisiones (children) y Hubs individuales con colas directas.
 * @param {string} hubId
 * @returns {Promise<Array<{ id: string, queueId: string, name: string, hubId: string, hubName: string, open: boolean }>>}
 */
export async function fetchFaceitHubQueues(hubId) {
  const targetHubId = hubId || env.FACEIT_HUB_ID || 'e72c25e6-74e5-415b-97da-e541296ff1db';
  if (!targetHubId) return [];

  const now = Date.now();
  const cached = faceitQueuesCache.get(targetHubId);
  if (cached && cached.expiresAt > now) {
    return cached.queues;
  }

  const detectedQueues = [];

  try {
    const hubRes = await fetch(`https://api.faceit.com/hubs/v1/hub/${targetHubId}`, {
      headers: { Accept: 'application/json' }
    });

    if (hubRes.ok) {
      const hubData = await hubRes.json();
      const children = hubData.payload?.children || [];

      // Si el Hub es un Club con salas/divisiones secundarias
      if (children.length > 0) {
        for (const child of children) {
          try {
            const qRes = await fetch(`https://api.faceit.com/queue/v1/queue/hub/${child.guid}`, {
              headers: { Accept: 'application/json' }
            });
            if (qRes.ok) {
              const qData = await qRes.json();
              for (const q of (qData.payload || [])) {
                detectedQueues.push({
                  id: q.id,
                  queueId: q.id,
                  name: child.name || q.queueName || 'Sala Faceit',
                  hubId: child.guid,
                  hubName: child.name || 'Mixtones',
                  open: q.open !== false
                });
              }
            }
          } catch (childErr) {
            logger.warn(`Error al consultar colas para child hub ${child.guid}:`, childErr.message);
          }
        }
      }

      // Si no tiene children o no encontramos colas secundarias, buscar en el Hub principal
      if (detectedQueues.length === 0) {
        const directQRes = await fetch(`https://api.faceit.com/queue/v1/queue/hub/${targetHubId}`, {
          headers: { Accept: 'application/json' }
        });
        if (directQRes.ok) {
          const directQData = await directQRes.json();
          for (const q of (directQData.payload || [])) {
            detectedQueues.push({
              id: q.id,
              queueId: q.id,
              name: q.queueName || hubData.payload?.name || 'Sala Principal',
              hubId: targetHubId,
              hubName: hubData.payload?.name || 'Mixtones',
              open: q.open !== false
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Error al consultar colas de Faceit para Hub ${targetHubId}:`, err.message);
  }

  // Guardar en cache por 3 minutos
  faceitQueuesCache.set(targetHubId, {
    queues: detectedQueues,
    expiresAt: now + 3 * 60 * 1000
  });

  return detectedQueues;
}
