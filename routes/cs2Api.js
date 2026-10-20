import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { cs2ServerManager, resolveMixtonMatchEnd } from '../services/cs2ServerManager.js';
import { fetchFaceitPlayer, fetchFaceitPlayerById } from '../services/faceitApi.js';

export function createCs2ApiRouter(client, db) {
  const router = Router();
  let hasCheckedDbOnInit = false;

  /**
   * GET /api/cs2/current-match
   * El agente del servidor CS2 local consulta este endpoint periódicamente (en memoria RAM, 0 consultas a Firebase).
   * Si hay un match activo pendiente, devuelve el JSON con el matchId, los 10 jugadores y el mapa.
   * Si ya finalizó o no hay partida, devuelve { active: false, match: null }.
   */
  router.get('/current-match', async (req, res) => {
    try {
      let current = cs2ServerManager.getCurrentMatch();

      // Solo consultar Firestore una única vez al arrancar el bot (cold start) si la RAM estaba vacía
      if (!hasCheckedDbOnInit && !current.active && db && typeof db.getCs2PendingMatch === 'function') {
        hasCheckedDbOnInit = true;
        const pending = await db.getCs2PendingMatch().catch(() => null);
        if (pending && pending.matchId) {
          await cs2ServerManager.publishMatch(pending);
          current = { active: true, match: pending };
        }
      }

      // Garantizar que todos los jugadores tengan steam_id_64 y que los equipos lleven el nombre del capitán
      if (current.active && current.match) {
        if (current.match.team1) {
          const cap1 = current.match.team1.captain?.faceit_nickname || current.match.team1.captain?.discordUser?.displayName || current.match.team1.players?.[0]?.nickname;
          if (cap1 && (!current.match.team1.name || current.match.team1.name === 'Equipo 1' || current.match.team1.name === 'Equipo A')) {
            current.match.team1.name = `Equipo ${cap1}`;
            current.match.team1.tag = cap1.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'EQ1';
          }
        }
        if (current.match.team2) {
          const cap2 = current.match.team2.captain?.faceit_nickname || current.match.team2.captain?.discordUser?.displayName || current.match.team2.players?.[0]?.nickname;
          if (cap2 && (!current.match.team2.name || current.match.team2.name === 'Equipo 2' || current.match.team2.name === 'Equipo B')) {
            current.match.team2.name = `Equipo ${cap2}`;
            current.match.team2.tag = cap2.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'EQ2';
          }
        }

        const teams = [current.match.team1, current.match.team2].filter(Boolean);
        for (const team of teams) {
          if (Array.isArray(team.players)) {
            for (const p of team.players) {
              if (!p.steam_id_64 || !/^\d{17}$/.test(String(p.steam_id_64).trim())) {
                // 1. Intentar recuperar desde Firestore si hay discordId
                if (p.discordId && db && typeof db.getFullUser === 'function') {
                  const uData = await db.getFullUser(p.discordId).catch(() => null);
                  if (uData?.steam_id_64 && /^\d{17}$/.test(String(uData.steam_id_64).trim())) {
                    p.steam_id_64 = String(uData.steam_id_64).trim();
                  }
                }
                // 2. Si aún falta, consultar FACEIT API
                if (!p.steam_id_64 || !/^\d{17}$/.test(String(p.steam_id_64).trim())) {
                  const pid = p.faceit_player_id || (team.captain && (team.captain.discordId === p.discordId || team.captain.faceit_nickname === p.nickname) ? team.captain.faceit_player_id : null);
                  try {
                    const fcPlayer = pid
                      ? await fetchFaceitPlayerById(pid).catch(() => null)
                      : (p.nickname ? await fetchFaceitPlayer(p.nickname).catch(() => null) : null);
                    const s64 = fcPlayer?.games?.cs2?.game_player_id || fcPlayer?.games?.csgo?.game_player_id || fcPlayer?.steam_id_64;
                    if (s64 && /^\d{17}$/.test(String(s64).trim())) {
                      p.steam_id_64 = String(s64).trim();
                      if (p.discordId && db && typeof db.saveUser === 'function') {
                        await db.saveUser(p.discordId, { steam_id_64: p.steam_id_64 }).catch(() => {});
                      }
                    }
                  } catch {}
                }
              }
            }
          }
        }
      }

      return res.status(200).json(current);
    } catch (err) {
      logger.error('Error al obtener current-match para CS2:', err);
      return res.status(500).json({ active: false, error: err.message });
    }
  });

  /**
   * POST /api/cs2/match-finish
   * El servidor CS2 local envía las estadísticas finales de la partida (K/D/A, HS%, MVP, puntuaciones).
   * 1. Guarda las estadísticas en Firebase (collection matches_stats).
   * 2. Resuelve la partida en Firebase (collection matches_history) y reparte apuestas.
   * 3. Limpia los canales de Discord y anuncia el resultado.
   * 4. HACE DESAPARECER la partida de la API (currentCs2Match = null).
   */
  router.post('/match-finish', async (req, res) => {
    try {
      const { matchId, winner, team1_score, team2_score, stats } = req.body || {};

      if (!matchId) {
        return res.status(400).json({ error: 'El campo matchId es obligatorio.' });
      }

      logger.info(`[CS2 API] Recibido reporte de fin de partida para matchId: ${matchId}`);
      logger.info(` - Ganador: ${winner || 'N/A'}, Marcador: ${team1_score ?? 0} - ${team2_score ?? 0}`);

      // 1. Guardar las estadísticas detalladas en Firebase Firestore
      if (stats) {
        await db.saveMatchStats(matchId, stats);
        logger.success(`[CS2 API] Estadísticas de match ${matchId} guardadas en Firebase Firestore con éxito.`);
      }

      // 2. Determinar acción ganadora: 'win_a' o 'win_b'
      const action = (winner === 'team1' || winner === 'faction1') ? 'win_a'
        : (winner === 'team2' || winner === 'faction2') ? 'win_b'
        : (team1_score > team2_score ? 'win_a' : (team2_score > team1_score ? 'win_b' : 'win_a'));

      // 3. Resolver la partida (reparto de pozos, historial, Discord, etc.)
      // Nota: resolveMixtonMatchEnd también llama a cs2ServerManager.clearCurrentMatch(matchId),
      // lo cual hace desaparecer la información del JSON en la API automáticamente.
      const resolution = await resolveMixtonMatchEnd({
        matchId,
        action,
        scoreA: team1_score ?? null,
        scoreB: team2_score ?? null,
        client,
        db,
        reason: 'Partida finalizada por servidor CS2 local'
      });

      // Asegurar que la API quede completamente limpia de la información
      await cs2ServerManager.clearCurrentMatch(matchId, db);

      return res.status(200).json({
        success: true,
        matchId,
        statsSaved: Boolean(stats),
        resolved: resolution.ok,
        message: 'Estadísticas guardadas en Firebase y match finalizado correctamente.'
      });
    } catch (err) {
      logger.error('Error al procesar match-finish en CS2 API:', err);
      return res.status(500).json({ error: 'Error interno: ' + err.message });
    }
  });

  /**
   * POST /api/cs2/match-cancel
   * Permite abortar una partida si hubo algún error fatal local.
   */
  router.post('/match-cancel', async (req, res) => {
    try {
      const { matchId, reason } = req.body || {};
      if (!matchId) return res.status(400).json({ error: 'matchId requerido' });

      await resolveMixtonMatchEnd({
        matchId,
        action: 'cancel',
        client,
        db,
        reason: reason || 'Cancelada por servidor CS2 local'
      });

      await cs2ServerManager.clearCurrentMatch(matchId, db);
      return res.json({ success: true, message: 'Match cancelado y limpiado de la API.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/cs2/server-info
   * Devuelve la IP pública del servidor CS2 configurada
   */
  router.get('/server-info', (req, res) => {
    return res.json({
      serverIp: cs2ServerManager.serverIp,
      activeMatch: cs2ServerManager.getCurrentMatch()
    });
  });

  return router;
}
