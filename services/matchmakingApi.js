import { crearLobbyMatchmaking, steamClient } from '../steamBot.js';

const ipPortRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):([0-9]{1,5})$/;
const domainPortRegex = /^(?=.{1,253}:)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?:([0-9]{1,5})$/;
const steamId64Regex = /^[0-9]{17}$/;

function readAuthToken(req) {
  const requestKey = req.headers['x-api-key'] || req.headers.authorization;
  if (typeof requestKey !== 'string') {
    return null;
  }

  return requestKey.startsWith('Bearer ') ? requestKey.slice(7).trim() : requestKey.trim();
}

export function authenticateSteamApiKey(logger = console) {
  return (req, res, next) => {
    const apiKey = process.env.STEAM_BOT_API_KEY;
    if (!apiKey) {
      logger.error('STEAM_BOT_API_KEY no esta configurada. La API de matchmaking permanecera deshabilitada.');
      return res.status(503).json({
        error: 'Servicio no disponible',
        message: 'La API de matchmaking no esta configurada en este servidor.'
      });
    }

    const token = readAuthToken(req);
    if (!token || token !== apiKey) {
      logger.warn(`Intento de acceso no autorizado al API de Steam desde IP: ${req.ip}`);
      return res.status(401).json({
        error: 'No autorizado',
        message: 'API Key invalida o no proporcionada en la cabecera x-api-key o Authorization.'
      });
    }

    next();
  };
}

function parsePort(endpoint) {
  const match = endpoint.match(ipPortRegex) || endpoint.match(domainPortRegex);
  if (!match) return null;
  return Number(match[match.length - 1]);
}

export function validateMatchmakingPayload(body) {
  const { serverIp, players } = body || {};

  if (!serverIp || typeof serverIp !== 'string') {
    return { ok: false, status: 400, error: 'Parametro faltante', message: 'El campo "serverIp" es obligatorio.' };
  }

  const port = parsePort(serverIp);
  if (!port || port < 1 || port > 65535) {
    return {
      ok: false,
      status: 400,
      error: 'Formato IP invalido',
      message: 'El campo "serverIp" debe tener un formato IP:PUERTO o DOMINIO:PUERTO valido y un puerto entre 1 y 65535.'
    };
  }

  if (!Array.isArray(players)) {
    return { ok: false, status: 400, error: 'Estructura invalida', message: 'El campo "players" debe ser un array.' };
  }

  if (players.length !== 10) {
    return {
      ok: false,
      status: 400,
      error: 'Cantidad incorrecta de jugadores',
      message: `Se requieren exactamente 10 jugadores para un match 5v5 de CS2. Recibidos: ${players.length}.`
    };
  }

  const invalidPlayers = players.filter(steamId => typeof steamId !== 'string' || !steamId64Regex.test(steamId));
  if (invalidPlayers.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'SteamIDs invalidos',
      message: 'Todos los jugadores deben ser SteamID64 validos como strings numericos de 17 digitos.',
      invalidPlayers
    };
  }

  const duplicates = players.filter((steamId, index) => players.indexOf(steamId) !== index);
  if (duplicates.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'SteamIDs duplicados',
      message: 'La lista de jugadores no puede contener SteamID64 repetidos.',
      duplicatePlayers: [...new Set(duplicates)]
    };
  }

  return { ok: true, serverIp, players };
}

export function getSteamBotStatus() {
  return {
    status: 'online',
    steamBot: {
      connected: !!steamClient.steamID,
      steamID: steamClient.steamID ? steamClient.steamID.getSteamID64() : null,
      personaState: steamClient.personaState
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

export async function handleMatchmakingLaunch(req, res, logger = console) {
  const validation = validateMatchmakingPayload(req.body);
  if (!validation.ok) {
    const { status, ...payload } = validation;
    return res.status(status).json(payload);
  }

  try {
    logger.info('Peticion de lanzamiento de matchmaking recibida.');
    const lobby = await crearLobbyMatchmaking(validation.players, validation.serverIp);
    logger.info(`Matchmaking lanzado con exito. Lobby ID: ${lobby.lobbyId}`);
    return res.status(200).json({
      success: true,
      message: 'Matchmaking lanzado con exito. Se enviaron invitaciones a los jugadores.',
      lobbyId: lobby.lobbyId,
      lobby
    });
  } catch (error) {
    logger.error(`Error al ejecutar el matchmaking: ${error.message}`);
    return res.status(500).json({
      error: 'Error interno del bot',
      message: error.message
    });
  }
}

