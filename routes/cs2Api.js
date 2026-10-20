import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { cs2ServerManager, resolveMixtonMatchEnd } from '../services/cs2ServerManager.js';

export function createCs2ApiRouter(client, db) {
  const router = Router();

  /**
   * GET /api/cs2/current-match
   * El agente del servidor CS2 local consulta este endpoint periódicamente.
   * Si hay un match activo pendiente, devuelve el JSON con el matchId, los 10 jugadores y el mapa.
   * Si ya finalizó o no hay partida, devuelve { active: false, match: null }.
   */
  router.get('/current-match', async (req, res) => {
    try {
      let current = cs2ServerManager.getCurrentMatch();
      if (!current.active && db && typeof db.getCs2PendingMatch === 'function') {
        const pending = await db.getCs2PendingMatch();
        if (pending && pending.matchId) {
          await cs2ServerManager.publishMatch(pending);
          current = { active: true, match: pending };
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
