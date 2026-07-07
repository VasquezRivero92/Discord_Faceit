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
        }
      }
    }

    if (!res.ok) return null;
    return await res.json();
  } catch(e) {
    return null;
  }
}
