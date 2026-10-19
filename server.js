import express from 'express';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import { steamClient } from './steamBot.js';
import { authenticateSteamApiKey, getSteamBotStatus, handleMatchmakingLaunch } from './services/matchmakingApi.js';


dotenv.config();

export const app = express();
app.use(express.json());

const PORT = process.env.STEAM_BOT_PORT || 15634;
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
const requireSteamApiKey = authenticateSteamApiKey(logger);
let serverInstance = null;

app.get('/api/matchmaking/status', requireSteamApiKey, (req, res) => {
  res.json(getSteamBotStatus());
});

app.post('/api/matchmaking/launch', requireSteamApiKey, (req, res) => {
  handleMatchmakingLaunch(req, res, logger);
});

export function startServer() {
  if (serverInstance) return serverInstance;

  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de la API del Steam Bot escuchando en http://0.0.0.0:${PORT}`);
    console.log('Bot de Steam: el inicio de sesión se solicita manualmente desde el panel de administración.');
  });

  return serverInstance;
}

async function handleShutdown(signal) {
  console.log(`\nRecibida señal ${signal}. Iniciando apagado del bot y la API...`);

  try {
    if (steamClient && steamClient.steamID) {
      console.log('Desconectando bot de Steam...');
      steamClient.logOff();
    }
  } catch (err) {
    console.error('Error al desconectar el bot de Steam:', err.message);
  }

  if (!serverInstance) {
    process.exit(0);
  }

  serverInstance.close(() => {
    console.log('Servidor Express detenido.');
    process.exit(0);
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  startServer();
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

