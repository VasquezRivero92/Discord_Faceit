import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

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


