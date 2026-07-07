import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { db } from './database.js';
import { env, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { createAuthRouter } from './routes/auth.js';
import { createApiRouter } from './routes/api.js';
import { createLobbyRouter } from './routes/lobby.js';
import { WebSocketServer } from 'ws';
import { loadCommands, onInteractionCreate } from './events/interactionCreate.js';
import { onReady } from './events/ready.js';
import { onGuildMemberAdd } from './events/guildMemberAdd.js';
import { onMessageCreate } from './events/messageCreate.js';
import { onVoiceStateUpdate } from './events/voiceStateUpdate.js';
import { handleFaceitWebhook } from './webhooks/faceit.js';
import rateLimit from 'express-rate-limit';
import { isFeatureEnabled } from './utils/featureFlags.js';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config();

// Validación de configuración
validateConfig();

// ---------------------------------------------------------
// 1. BOT DE DISCORD
// ---------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Cargar comandos dinámicamente
const { commands, commandMap } = await loadCommands();

client.once('ready', () => onReady(client, commands, db));
client.on('interactionCreate', (interaction) => onInteractionCreate(interaction, db, commandMap));
client.on('guildMemberAdd', (member) => onGuildMemberAdd(member, db));
client.on('messageCreate', (message) => onMessageCreate(message, client, db));
client.on('voiceStateUpdate', (oldState, newState) => onVoiceStateUpdate(oldState, newState, db));

// ---------------------------------------------------------
// 2. SERVIDOR EXPRESS
// ---------------------------------------------------------
const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.set('trust proxy', 1); // Confiar en el proxy reverso (Nginx/Wisp)

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' });
  },
});
app.use(globalLimiter);

// Rate limiting para webhook de Faceit (más estricto)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    discord: client.readyAt ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Webhook de Faceit con validación de secret
app.post('/webhook/faceit', webhookLimiter, async (req, res) => {
  // Validación de secret si está configurado y la flag webhookValidation está activa en Firestore
  const validationEnabled = await isFeatureEnabled('webhookValidation');
  if (validationEnabled && env.FACEIT_WEBHOOK_SECRET) {
    const signature = req.headers['x-faceit-signature'] || req.headers['x-webhook-signature'];
    if (signature !== env.FACEIT_WEBHOOK_SECRET) {
      logger.warn('Webhook rechazado: firma inválida');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  res.status(200).send('OK');
  await handleFaceitWebhook(req.body, client, db);
});

// Web Admin
const BASE_URL = env.BASE_URL;
app.use('/auth', createAuthRouter(client, db, {
  DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
  ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET,
  BASE_URL,
}));
// Ruta de diagnóstico (sin auth) para verificar que el servidor responde
app.get('/api/ping', (req, res) => {
  res.json({
    ok: true,
    cookies: Object.keys(req.cookies || {}),
    hasAdminToken: !!req.cookies?.admin_token,
    secure: req.secure,
    protocol: req.protocol,
    timestamp: new Date().toISOString()
  });
});

const wss = new WebSocketServer({ noServer: true });

app.use('/api/admin', createApiRouter(client, db, {
  ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET,
  DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
}));
app.use('/api/lobby', createLobbyRouter(client, db, {
  ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET,
  DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
}, wss));
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(new URL('public/admin/index.html', import.meta.url).pathname);
});
app.get('/admin/*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(new URL('public/admin/index.html', import.meta.url).pathname);
});

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.success(`Servidor Express escuchando en http://0.0.0.0:${env.PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === '/api/lobby/mixton-ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

// ---------------------------------------------------------
// 3. GRACEFUL SHUTDOWN
// ---------------------------------------------------------
async function shutdown(signal) {
  logger.info(`Recibida señal ${signal}. Cerrando servicios...`);

  try {
    await client.destroy();
    logger.info('Cliente de Discord desconectado.');
  } catch (e) {
    logger.error('Error al desconectar Discord:', e.message);
  }

  try {
    server.close(() => {
      logger.info('Servidor Express cerrado.');
      process.exit(0);
    });
  } catch (e) {
    logger.error('Error al cerrar Express:', e.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------
// 4. LOGIN
// ---------------------------------------------------------
client.login(env.DISCORD_TOKEN);
