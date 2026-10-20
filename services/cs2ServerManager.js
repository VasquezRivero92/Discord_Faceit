import { io } from 'socket.io-client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuración por defecto con soporte para variables de entorno
const MCSM_DAEMON_URL = process.env.MCSM_DAEMON_URL || 'ws://127.0.0.1:24444';
const MCSM_API_KEY = process.env.MCSM_API_KEY || 'e48580b2636b4464fc5467e669146699181471a341a7bc0';
const MCSM_INSTANCE_UUID = process.env.MCSM_INSTANCE_UUID || 'ccdc655afc4146958f67a96853386537';
const CS2_SERVER_DIR = process.env.CS2_SERVER_DIR || 'D:\\ServerCS2';
const MIXTON_SERVER_IP = process.env.MIXTON_SERVER_IP || '38.25.72.56:27015';

class Cs2ServerManager {
  constructor() {
    this.daemonUrl = MCSM_DAEMON_URL;
    this.apiKey = MCSM_API_KEY;
    this.instanceUuid = MCSM_INSTANCE_UUID;
    this.serverDir = CS2_SERVER_DIR;
    this.serverIp = MIXTON_SERVER_IP;
    this.currentMatchId = null;
    this.currentMatchData = null;
    this.isStopping = false;
  }

  /**
   * Publica una partida en memoria y en Firestore para que el agente local de CS2 la descargue vía API
   */
  async publishMatch(matchData, db = null) {
    this.currentMatchData = {
      ...matchData,
      publishedAt: Date.now()
    };
    this.currentMatchId = matchData.matchId;
    logger.info(`[CS2ServerManager] Partida ${matchData.matchId} publicada para consulta del servidor CS2 local.`);
    if (db && typeof db.setCs2PendingMatch === 'function') {
      await db.setCs2PendingMatch(this.currentMatchData).catch(e => {
        logger.warn('[CS2ServerManager] No se pudo guardar match en Firestore cs2_pending_matches:', e.message);
      });
    }
  }

  /**
   * Obtiene la partida activa actual para exponerla en la API JSON
   */
  getCurrentMatch() {
    if (!this.currentMatchData) {
      return { active: false, match: null };
    }
    return {
      active: true,
      match: this.currentMatchData
    };
  }

  /**
   * Limpia la información de la partida de la API tras recibir estadísticas o finalizarse
   */
  async clearCurrentMatch(matchId = null, db = null) {
    if (!matchId || this.currentMatchData?.matchId === matchId) {
      logger.info(`[CS2ServerManager] Limpiando partida activa de la API (matchId: ${this.currentMatchData?.matchId || matchId}).`);
      this.currentMatchData = null;
      this.currentMatchId = null;
    }
    if (db && typeof db.clearCs2PendingMatch === 'function') {
      await db.clearCs2PendingMatch(matchId).catch(e => {
        logger.warn('[CS2ServerManager] No se pudo borrar match en Firestore cs2_pending_matches:', e.message);
      });
    }
  }

  /**
   * Ejecuta una petición Socket.io contra el Daemon de MCSManager
   */
  async _sendMcsmRequest(event, data, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let socket = null;
      let timer = null;

      try {
        socket = io(this.daemonUrl, {
          reconnection: false,
          timeout: 4000,
          transports: ['websocket', 'polling']
        });
      } catch (err) {
        return reject(err);
      }

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (socket) {
          socket.removeAllListeners();
          socket.disconnect();
        }
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Tiempo de espera agotado (${timeoutMs}ms) en petición MCSManager a ${event}`));
      }, timeoutMs);

      socket.on('connect_error', (err) => {
        cleanup();
        reject(new Error(`No se pudo conectar al daemon de MCSManager en ${this.daemonUrl}: ${err.message}`));
      });

      socket.on('connect', async () => {
        try {
          // 1. Autenticar primero ante el Daemon
          const authUuid = randomUUID() + Date.now();
          const authHandler = (authMsg) => {
            if (authMsg?.uuid === authUuid) {
              socket.off('auth', authHandler);
              if (authMsg.status !== 200) {
                cleanup();
                return reject(new Error('Autenticación rechazada por el Daemon de MCSManager.'));
              }
              // 2. Enviar el evento solicitado
              sendActualEvent();
            }
          };
          socket.on('auth', authHandler);
          socket.emit('auth', { uuid: authUuid, data: this.apiKey });
        } catch (authErr) {
          cleanup();
          reject(authErr);
        }
      });

      const sendActualEvent = () => {
        const reqUuid = randomUUID() + Date.now();
        const eventHandler = (msg) => {
          if (msg?.uuid === reqUuid) {
            cleanup();
            if (msg.status === 200) {
              resolve(msg.data);
            } else {
              reject(new Error(JSON.stringify(msg.data || msg)));
            }
          }
        };

        socket.on(event, eventHandler);
        socket.emit(event, { uuid: reqUuid, data });
      };
    });
  }

  /**
   * Obtiene el estado actual de la instancia en MCSManager
   * 0 = Detenido, 1 = Deteniéndose, 2 = Iniciando, 3 = Ejecutándose
   */
  async getInstanceOverview() {
    try {
      const overview = await this._sendMcsmRequest('instance/overview', { instanceUuid: this.instanceUuid });
      const inst = Array.isArray(overview) ? overview.find(i => i.instanceUuid === this.instanceUuid) || overview[0] : overview;
      return {
        online: inst?.status === 3,
        status: inst?.status ?? -1,
        started: inst?.started,
        nickname: inst?.config?.nickname || 'CS2 Server'
      };
    } catch (err) {
      logger.warn(`[CS2ServerManager] No se pudo consultar overview de MCSManager: ${err.message}`);
      return { online: false, status: -1, error: err.message };
    }
  }

  /**
   * Envía un comando de consola RCON/stdin al servidor CS2 a través de MCSManager
   */
  async sendCommand(command) {
    logger.info(`[CS2ServerManager] Enviando comando a consola CS2: "${command}"`);
    try {
      await this._sendMcsmRequest('instance/command', {
        instanceUuid: this.instanceUuid,
        command
      });
      return { success: true };
    } catch (err) {
      logger.error(`[CS2ServerManager] Error enviando comando a CS2: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Inicia el servidor dedicado de CS2.
   * Prioridad 1: MCSManager (para que figure en su panel con consola y métricas en vivo).
   * Prioridad 2: Fallback directo a start_machupeek_cs2.cmd si MCSManager estuviese cerrado.
   */
  async startServer() {
    logger.info('[CS2ServerManager] Iniciando proceso de encendido del servidor CS2...');
    this.isStopping = false;

    // 1. Intentar por MCSManager
    try {
      const overview = await this.getInstanceOverview();
      if (overview.status === 3) {
        logger.info('[CS2ServerManager] El servidor CS2 ya se encuentra encendido en MCSManager.');
        return { success: true, method: 'mcsm_already_running', status: overview.status };
      }

      logger.info(`[CS2ServerManager] Solicitando apertura de instancia a MCSManager (${this.instanceUuid})...`);
      await this._sendMcsmRequest('instance/open', {
        instanceUuids: [this.instanceUuid]
      });

      logger.success('[CS2ServerManager] Instancia encendida correctamente en MCSManager.');
      return { success: true, method: 'mcsm_open' };
    } catch (mcsmErr) {
      logger.warn(`[CS2ServerManager] No se pudo iniciar vía MCSManager (${mcsmErr.message}). Iniciando fallback local directo...`);
    }

    // 2. Fallback de inicio directo
    try {
      const startScript = path.join(this.serverDir, 'start_machupeek_cs2.cmd');
      if (fs.existsSync(startScript)) {
        logger.info(`[CS2ServerManager] Ejecutando script de arranque: ${startScript}`);
        const child = spawn('cmd.exe', ['/c', startScript], {
          cwd: this.serverDir,
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
        return { success: true, method: 'direct_script_spawn' };
      }
      throw new Error(`No se encontró el script de inicio en ${startScript}`);
    } catch (fallbackErr) {
      logger.error('[CS2ServerManager] Error fatal: No se pudo arrancar el servidor CS2 ni por MCSManager ni directo:', fallbackErr);
      throw fallbackErr;
    }
  }

  /**
   * Expulsa a todos los jugadores del servidor y apaga el proceso limpiamente.
   */
  async stopServer(reason = 'Partida mixton finalizada. ¡Gracias por participar!') {
    if (this.isStopping) return { success: true, alreadyStopping: true };
    this.isStopping = true;
    logger.info(`[CS2ServerManager] Iniciando apagado del servidor CS2. Motivo: "${reason}"`);

    try {
      // 1. Expulsar a todos los jugadores conectados en CS2
      try {
        await this.sendCommand(`kickall "${reason}"`);
      } catch (e) {
        logger.warn('[CS2ServerManager] No se pudo enviar kickall:', e.message);
      }

      // Pequeña pausa para permitir que el mensaje de desconexión viaje a los clientes
      await new Promise(r => setTimeout(r, 2500));

      // 2. Solicitar detención a MCSManager
      try {
        logger.info('[CS2ServerManager] Enviando orden de detención a MCSManager...');
        await this._sendMcsmRequest('instance/stop', {
          instanceUuids: [this.instanceUuid]
        });
        logger.success('[CS2ServerManager] Servidor CS2 detenido limpiamente en MCSManager.');
        return { success: true, method: 'mcsm_stop' };
      } catch (mcsmErr) {
        logger.warn(`[CS2ServerManager] Detención por MCSManager falló (${mcsmErr.message}). Enviando comando 'quit' a la consola CS2...`);
        await this.sendCommand('quit');
      }

      return { success: true, method: 'quit_command' };
    } catch (err) {
      logger.error('[CS2ServerManager] Error deteniendo el servidor CS2:', err);
      return { success: false, error: err.message };
    } finally {
      this.isStopping = false;
      this.currentMatchId = null;
    }
  }

  /**
   * Escribe la configuración oficial de MatchZy (match.json y whitelist.cfg)
   * con los 10 jugadores exactos y el mapa baneado/elegido.
   */
  async configureMatch({ matchId, chosenMap, teamA, rosterA, teamB, rosterB }) {
    this.currentMatchId = matchId;
    const matchJsonPath = path.join(this.serverDir, 'game', 'csgo', 'cfg', 'MatchZy', 'match.json');
    const whitelistPath = path.join(this.serverDir, 'game', 'csgo', 'cfg', 'MatchZy', 'whitelist.cfg');
    const configOverridePath = path.join(this.serverDir, 'game', 'csgo', 'cfg', 'MatchZy', 'config_override.cfg');

    logger.info(`[CS2ServerManager] Configurando partido 5v5 MatchZy para ${matchId}...`);
    logger.info(` - Mapa seleccionado: ${chosenMap?.id || 'de_mirage'}`);
    logger.info(` - Equipo 1 (${teamA.name}): ${rosterA.length} jugadores`);
    logger.info(` - Equipo 2 (${teamB.name}): ${rosterB.length} jugadores`);

    // 1. Mapear jugadores de Team A
    const team1Players = {};
    rosterA.forEach((p, idx) => {
      const s64 = String(p.steam_id_64 || '').trim();
      const nick = p.faceit_nickname || p.discordUser?.displayName || `Jugador A${idx + 1}`;
      if (/^\d{17}$/.test(s64)) {
        team1Players[s64] = nick;
      }
    });

    // 2. Mapear jugadores de Team B
    const team2Players = {};
    rosterB.forEach((p, idx) => {
      const s64 = String(p.steam_id_64 || '').trim();
      const nick = p.faceit_nickname || p.discordUser?.displayName || `Jugador B${idx + 1}`;
      if (/^\d{17}$/.test(s64)) {
        team2Players[s64] = nick;
      }
    });

    // 3. Espectadores y Admins permitidos
    const spectators = {
      '76561198675781576': 'Admin 1',
      '76561198042296985': 'Admin 2'
    };

    // Cargar observadores extra si existen
    const observersPath = path.join(this.serverDir, 'game', 'csgo', 'addons', 'counterstrikesharp', 'plugins', 'MachuPeekObserverManager', 'observers.json');
    if (fs.existsSync(observersPath)) {
      try {
        const obsList = JSON.parse(fs.readFileSync(observersPath, 'utf8'));
        if (Array.isArray(obsList)) {
          obsList.forEach(obs => { spectators[String(obs)] = 'Observer'; });
        }
      } catch {}
    }

    const mapIdToPlay = (chosenMap?.id || 'de_mirage').toLowerCase().trim();

    const matchConfig = {
      matchid: matchId,
      num_maps: 1,
      maplist: [mapIdToPlay],
      skip_veto: true,
      players_per_team: 5,
      min_players_to_ready: 10,
      min_spectators_to_ready: 0,
      team1: {
        name: teamA.name || 'Equipo 1',
        tag: 'EQ1',
        players: team1Players
      },
      team2: {
        name: teamB.name || 'Equipo 2',
        tag: 'EQ2',
        players: team2Players
      },
      spectators: {
        players: spectators
      },
      cvars: {
        mp_spectators_max: '10',
        sv_hibernate_when_empty: '0',
        matchzy_kick_when_no_match_loaded: '0'
      }
    };

    // Guardar match.json
    fs.mkdirSync(path.dirname(matchJsonPath), { recursive: true });
    fs.writeFileSync(matchJsonPath, JSON.stringify(matchConfig, null, 2), 'utf8');

    // Guardar whitelist.cfg
    const allAllowed = [
      ...Object.keys(team1Players),
      ...Object.keys(team2Players),
      ...Object.keys(spectators)
    ];
    const uniqueAllowed = [...new Set(allAllowed)];
    fs.writeFileSync(whitelistPath, uniqueAllowed.join('\n'), 'utf8');

    // Asegurar que config_override.cfg tenga configurado el webhook de logs de MatchZy
    try {
      if (fs.existsSync(configOverridePath)) {
        let currentCfg = fs.readFileSync(configOverridePath, 'utf8');
        const webhookUrl = 'http://127.0.0.1:15633/api/matchzy/event';
        if (!currentCfg.includes('matchzy_remote_log_url')) {
          currentCfg += `\n\n// Webhook oficial para coordinar fin de partido y bot\nmatchzy_remote_log_url "${webhookUrl}"\nmatchzy_remote_log_header_key "x-matchzy-token"\nmatchzy_remote_log_header_value "machupeek-cs2-secret"\n`;
          fs.writeFileSync(configOverridePath, currentCfg, 'utf8');
          logger.info('[CS2ServerManager] Configuración de webhook inyectada en config_override.cfg');
        }
      }
    } catch (cfgErr) {
      logger.warn('[CS2ServerManager] No se pudo verificar config_override.cfg:', cfgErr.message);
    }

    logger.success(`[CS2ServerManager] match.json y whitelist.cfg creados exitosamente para ${matchId}.`);

    // Si el servidor ya está encendido, cargamos el partido y cambiamos al mapa elegido
    try {
      const overview = await this.getInstanceOverview();
      if (overview.status === 3) {
        logger.info('[CS2ServerManager] Servidor ya activo: recargando match en vivo y cambiando de mapa...');
        await this.sendCommand('matchzy_loadmatch cfg/MatchZy/match.json');
        await this.sendCommand(`map ${mapIdToPlay}`);
      }
    } catch {}

    return {
      matchConfig,
      playersCount: uniqueAllowed.length,
      map: mapIdToPlay
    };
  }
}

export const cs2ServerManager = new Cs2ServerManager();

/**
 * Resuelve y finaliza una partida mixton (automática por MatchZy o manual por Discord/Panel).
 * Reparte premios o reembolsos, limpia canales, expulsa jugadores de CS2 y apaga el servidor en MCSManager.
 */
export async function resolveMixtonMatchEnd({
  matchId,
  action, // 'win_a' | 'win_b' | 'cancel'
  scoreA = null,
  scoreB = null,
  client,
  db,
  reason = 'Partida finalizada'
}) {
  logger.info(`[resolveMixtonMatchEnd] Procesando finalización de match ${matchId} (Acción: ${action})...`);
  const activeMatch = await db.getActiveMatch(matchId);
  if (!activeMatch) {
    logger.warn(`[resolveMixtonMatchEnd] Match ${matchId} no encontrado en partidas activas (o ya finalizado). Asegurando apagado del servidor...`);
    await cs2ServerManager.stopServer(reason);
    return { ok: false, error: 'Match no encontrado o ya resuelto.' };
  }

  // 1. Eliminar de partidas activas ANTES de mover voz para evitar rebotes de eventos
  await db.removeActiveMatch(matchId);

  // Limpiar inmediatamente el match expuesto en la API para que desaparezca
  await cs2ServerManager.clearCurrentMatch(matchId, db);

  // 2. Apagar servidor CS2 (expulsa a todos los jugadores con kickall y detiene la instancia en MCSManager)
  try {
    await cs2ServerManager.stopServer(reason);
  } catch (err) {
    logger.warn('[CS2ServerManager] Error al detener servidor tras fin de match:', err.message);
  }

  // 3. Manejar balance y apuestas
  const parsedBetAmount = Math.max(0, parseFloat(activeMatch.bet_amount_per_player) || 0);
  const totalPot = parseFloat(activeMatch.total_pot) || (parsedBetAmount * 10);
  const manualPaidSet = new Set(activeMatch.manual_paid_players || []);

  const rosterA = activeMatch.faction1_roster || [];
  const rosterB = activeMatch.faction2_roster || [];
  const guildId = activeMatch.guild_id || null;

  if (parsedBetAmount > 0) {
    if (action === 'win_a' && rosterA.length > 0) {
      const prizePerPlayer = parseFloat((totalPot / rosterA.length).toFixed(2));
      for (const p of rosterA) {
        if (p.discord_id) {
          await db.updateUserBalance(
            p.discord_id,
            prizePerPlayer,
            guildId,
            `🏆 Premio ganador partida mixton ${matchId} (S/ ${prizePerPlayer})`
          ).catch(e => logger.error(`Error acreditando premio a ${p.discord_id}:`, e));
        }
      }
    } else if (action === 'win_b' && rosterB.length > 0) {
      const prizePerPlayer = parseFloat((totalPot / rosterB.length).toFixed(2));
      for (const p of rosterB) {
        if (p.discord_id) {
          await db.updateUserBalance(
            p.discord_id,
            prizePerPlayer,
            guildId,
            `🏆 Premio ganador partida mixton ${matchId} (S/ ${prizePerPlayer})`
          ).catch(e => logger.error(`Error acreditando premio a ${p.discord_id}:`, e));
        }
      }
    } else if (action === 'cancel') {
      // Reembolsar cuota a todos los jugadores que pagaron con saldo digital
      for (const p of [...rosterA, ...rosterB]) {
        if (p.discord_id && !manualPaidSet.has(p.discord_id)) {
          await db.updateUserBalance(
            p.discord_id,
            parsedBetAmount,
            guildId,
            `↩️ Reembolso por cancelación de partida mixton ${matchId}`
          ).catch(e => logger.error(`Error reembolsando a ${p.discord_id}:`, e));
        }
      }
    }
  }

  // 4. Limpieza de canales de voz
  try {
    const guild = guildId && client ? await client.guilds.fetch(guildId).catch(() => null) : null;
    if (guild) {
      const { cleanupVoiceChannel } = await import('./voice.js');
      const isCancel = action === 'cancel';
      const cleanReason = isCancel ? 'Partida mixton cancelada' : 'Partida mixton finalizada';
      const originalStates = activeMatch.original_voice_states || {};
      const waitingRoomId = activeMatch.waiting_room_id || null;

      if (activeMatch.faction1_vc_id) {
        await cleanupVoiceChannel(guild, activeMatch.faction1_vc_id, waitingRoomId, originalStates, cleanReason, isCancel);
      }
      if (activeMatch.faction2_vc_id) {
        await cleanupVoiceChannel(guild, activeMatch.faction2_vc_id, waitingRoomId, originalStates, cleanReason, isCancel);
      }
    }
  } catch (voiceErr) {
    logger.warn('[CS2ServerManager] Error limpiando canales de voz:', voiceErr.message);
  }

  // 5. Registrar en historial
  let finalScoreA = scoreA !== null ? scoreA : (action === 'win_a' ? 13 : (action === 'win_b' ? 0 : 0));
  let finalScoreB = scoreB !== null ? scoreB : (action === 'win_b' ? 13 : (action === 'win_a' ? 0 : 0));
  const winner = action === 'win_a' ? 'faction1' : (action === 'win_b' ? 'faction2' : 'CANCELLED');
  const status = action === 'cancel' ? 'cancelled' : 'finished';

  await db.addMatchToHistory(
    matchId,
    {
      entity_custom_name: activeMatch.entity_custom_name || 'Mixton',
      game: activeMatch.game || 'cs2',
      voting: { map: { pick: [activeMatch.map || activeMatch.chosen_map?.name || 'Manual'] }, location: { pick: ['Mixton'] } },
      teams: { faction1: { name: activeMatch.faction1_name || 'Equipo 1' }, faction2: { name: activeMatch.faction2_name || 'Equipo 2' } },
      chosen_map: activeMatch.chosen_map || null,
      bet_amount_per_player: parsedBetAmount,
      total_pot: totalPot
    },
    winner,
    finalScoreA,
    finalScoreB,
    rosterA,
    rosterB,
    guildId,
    status
  ).catch(err => logger.error('Error al guardar historial de partida:', err));

  // 6. Actualizar mensaje de anuncio en Discord
  try {
    if (activeMatch.message_id && activeMatch.matches_channel_id && client) {
      const channel = await client.channels.fetch(activeMatch.matches_channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(activeMatch.message_id).catch(() => null);
        if (msg && msg.embeds.length > 0) {
          const { EmbedBuilder } = await import('discord.js');
          let statusText = action === 'win_a' ? `🏆 **Ganador: ${activeMatch.faction1_name || 'Equipo 1'}** (${finalScoreA}-${finalScoreB})`
            : action === 'win_b' ? `🏆 **Ganador: ${activeMatch.faction2_name || 'Equipo 2'}** (${finalScoreB}-${finalScoreA})`
            : '❌ **Partida Cancelada**';
          let embedColor = action === 'win_a' ? 0x15C253 : action === 'win_b' ? 0xFF3E3E : 0xEF4444;

          const updatedEmbed = EmbedBuilder.from(msg.embeds[0])
            .setColor(embedColor)
            .addFields({ name: '🏁 Resultado Final', value: statusText, inline: false });
          
          await msg.edit({ embeds: [updatedEmbed], components: [] }).catch(() => {});
        }
      }
    }
  } catch (msgErr) {
    logger.warn('[CS2ServerManager] Error actualizando mensaje en Discord:', msgErr.message);
  }

  // 7. Actualizar Live Panel y emitir actualización a la web
  try {
    const { updateLivePanel } = await import('../utils/panelUpdater.js');
    if (activeMatch.matches_channel_id && client) {
      await updateLivePanel(client, activeMatch.matches_channel_id, db);
    }
  } catch {}

  try {
    const { mixtonEvents } = await import('../routes/lobby.js');
    mixtonEvents.emit('update', guildId);
  } catch {}

  logger.success(`[resolveMixtonMatchEnd] Match ${matchId} cerrado exitosamente con resultado: ${action}.`);
  return { ok: true, matchId, action, winner };
}
