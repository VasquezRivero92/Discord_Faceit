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
import { createPublicApiRouter } from './routes/publicApi.js';
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
import { startSteamBot, steamClient } from './steamBot.js';
import { authenticateSteamApiKey, getSteamBotStatus, handleMatchmakingLaunch } from './services/matchmakingApi.js';
import { fetchLatestSeasonPoints } from './services/faceitApi.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

// Capturar errores no controlados para evitar caídas del bot por librerías de terceros (como play-dl)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('⚠️ Promesa no controlada rechazada:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Excepción no controlada:', error);
});

// Validación de configuración
const isDiscordConfigured = validateConfig();

// ---------------------------------------------------------
// 1. BOT DE DISCORD
// ---------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Cargar comandos dinámicamente
const { commands, commandMap } = await loadCommands();

if (isDiscordConfigured && env.DISCORD_TOKEN) {
  client.once('clientReady', () => onReady(client, commands, db));
  client.on('interactionCreate', (interaction) => onInteractionCreate(interaction, db, commandMap));
  client.on('guildMemberAdd', (member) => onGuildMemberAdd(member, db));
  client.on('messageCreate', (message) => onMessageCreate(message, client, db));
  client.on('voiceStateUpdate', (oldState, newState) => onVoiceStateUpdate(oldState, newState, db));
} else {
  logger.warn('⚠️ El bot de Discord se ejecutará en modo Offline debido a la falta de credenciales de Discord.');
  client.user = {
    id: '123456789012345678',
    username: 'MixtonBotOffline',
    avatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  };
  client.readyAt = null;
  client.guilds.fetch = async () => ({
    name: 'Servidor Offline de Desarrollo',
    id: env.DISCORD_GUILD_ID || '111222333444555666',
    memberCount: 42,
    members: {
      fetch: async () => ({
        get: () => null,
        cache: new Map()
      }),
      cache: new Map()
    },
    channels: {
      fetch: async () => null,
      create: async () => ({ id: 'MOCK_VC_ID', name: 'Mock VC', delete: async () => {} })
    },
    roles: {
      cache: {
        find: () => null
      }
    }
  });
  client.channels.fetch = async () => null;
  client.users.fetch = async () => null;
}

// ---------------------------------------------------------
// 2. SERVIDOR EXPRESS
// ---------------------------------------------------------
const app = express();
app.set('trust proxy', 1); // Confiar en 1 salto de proxy reverso (Nginx/Wisp)

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
const allowedCorsOrigins = (process.env.CORS_ORIGINS || process.env.ADMIN_ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedCorsOrigins.length === 0 && process.env.NODE_ENV === 'production' && env.BASE_URL) {
  allowedCorsOrigins.push(new URL(env.BASE_URL).origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedCorsOrigins.length === 0 || allowedCorsOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen CORS no permitido.'));
  },
  credentials: true,
}));
app.use(express.json({
  limit: '64kb',
  verify: (req, res, buffer) => {
    if (req.originalUrl?.split('?')[0] === '/webhook/yape-transaction') {
      req.rawYapeWebhookBody = Buffer.from(buffer);
    }
  }
}));
app.use(cookieParser());
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.includes('assets')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Redirección forzosa a HTTPS para proteger las sesiones y datos de los usuarios.
app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && (process.env.NODE_ENV === 'production' || (env.BASE_URL && env.BASE_URL.startsWith('https')))) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
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
  validate: false,
});

const yapeWebhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res) => res.status(429).json({ error: 'Demasiados eventos del escáner Yape.' }),
});
const usedYapeWebhookNonces = new Map();
const YAPE_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

function validateYapeWebhook(req) {
  const secret = env.YAPE_WEBHOOK_SECRET;
  const timestamp = String(req.headers['x-yape-timestamp'] || '');
  const nonce = String(req.headers['x-yape-nonce'] || '');
  const signature = String(req.headers['x-yape-signature'] || '');
  const parsedTimestamp = Number(timestamp);

  if (!secret || !Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > YAPE_WEBHOOK_MAX_AGE_MS) {
    return false;
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || usedYapeWebhookNonces.has(nonce)) {
    return false;
  }

  const rawBody = req.rawYapeWebhookBody;
  if (!rawBody || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.`)
    .update(rawBody)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return false;
  }

  const now = Date.now();
  for (const [knownNonce, createdAt] of usedYapeWebhookNonces) {
    if (now - createdAt >= YAPE_WEBHOOK_MAX_AGE_MS) usedYapeWebhookNonces.delete(knownNonce);
  }
  usedYapeWebhookNonces.set(nonce, now);
  return true;
}

async function notifyYapeCredit(discordId, amount) {
  try {
    const user = await client.users.fetch(discordId);
    await user.send(`✅ Tu recarga Yape de S/ ${Number(amount).toFixed(2)} fue acreditada automáticamente a tu billetera.`);
  } catch (error) {
    logger.warn(`No se pudo notificar por DM la recarga Yape a ${discordId}: ${error.message}`);
  }
}

async function notifyYapeSecurityIncident(processed) {
  try {
    const channelId = env.DISCORD_ADMIN_ALERTS_CHANNEL_ID;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased?.()) return;
    await channel.send(`🚨 **Alerta de recarga Yape**\nUna reserva no coincide con el monto detectado por el escáner. Usuario: <@${processed.pending?.discordId || 'desconocido'}>. Se bloqueó la acreditación automática.`);
  } catch (error) {
    logger.warn(`No se pudo enviar alerta de seguridad Yape: ${error.message}`);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    discord: client.readyAt ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de verificación GET (para navegador / pings)
app.get(['/webhook/faceit', '/webhooks/faceit'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'Endpoint de Webhook de FACEIT activo. Este endpoint está listo para recibir eventos POST de FACEIT.',
    endpoint: '/webhook/faceit'
  });
});

// Webhook de Faceit con validación de secret (acepta singular /webhook/faceit y plural /webhooks/faceit)
app.post(['/webhook/faceit', '/webhooks/faceit'], webhookLimiter, async (req, res) => {
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

// El escáner Android llama este endpoint solamente después de persistir el
// depósito en Firestore. No se acepta ningún monto ni cuenta del cliente: el
// servidor vuelve a leer el depósito y acredita únicamente una reserva válida.
app.post('/webhook/yape-transaction', yapeWebhookLimiter, async (req, res) => {
  if (!validateYapeWebhook(req)) {
    logger.warn(`Webhook Yape rechazado desde ${req.ip}: firma, fecha o nonce inválido.`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const operationNumber = String(req.body?.numero_operacion || req.body?.operationNumber || '').trim();
  if (!/^[A-Za-z0-9-]{4,64}$/.test(operationNumber)) {
    return res.status(400).json({ error: 'Código de aprobación inválido.' });
  }

  try {
    const processed = await db.processPendingYapeOperation({
      operationNumber,
      auditContext: { source: 'yape-scanner-webhook' }
    });
    if (processed.status === 'credited') {
      void notifyYapeCredit(processed.pending.discordId, processed.amount);
    }
    if (processed.status === 'amount_mismatch') {
      void notifyYapeSecurityIncident(processed);
    }
    return res.json({ ok: true, status: processed.status });
  } catch (error) {
    logger.error(`Error procesando webhook Yape para ${operationNumber}:`, error);
    return res.status(500).json({ error: 'No se pudo procesar la transacción Yape.' });
  }
});

// ---------------------------------------------------------
// API DE MATCHMAKING (STEAM BOT BRIDGE)
// ---------------------------------------------------------
const requireSteamApiKey = authenticateSteamApiKey(logger);
app.get('/api/matchmaking/status', requireSteamApiKey, (req, res) => {
  res.json(getSteamBotStatus());
});
app.post('/api/matchmaking/launch', requireSteamApiKey, (req, res) => {
  handleMatchmakingLaunch(req, res, logger);
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

// ---------------------------------------------------------
// API DE PUNTOS / TABLA DE POSICIONES (ÚLTIMA TEMPORADA)
// ---------------------------------------------------------
app.all(['/api/points', '/api/club/points', '/api/leaderboard/points'], async (req, res) => {
  try {
    const clubId = req.query.club_id || req.query.clubId || req.body?.club_id || req.body?.clubId;
    const queueId = req.query.queue_id || req.query.queueId || req.body?.queue_id || req.body?.queueId;
    const nickname = req.query.nickname || req.query.player || req.body?.nickname || req.body?.player;
    const playerId = req.query.player_id || req.query.playerId || req.body?.player_id || req.body?.playerId;
    const limit = req.query.limit || req.body?.limit;
    const offset = req.query.offset || req.body?.offset;

    if (!clubId && !queueId) {
      return res.status(400).json({
        error: 'Debes proporcionar club_id (ID del club) o queue_id (ID de la cola).'
      });
    }

    const result = await fetchLatestSeasonPoints(clubId, queueId, {
      limit,
      offset,
      nickname,
      playerId
    });

    return res.json(result);
  } catch (error) {
    logger.error('Error al consultar puntos de la tabla en API:', error);
    if (error.message === 'NO_LEADERBOARD_FOUND') {
      return res.status(404).json({ error: 'No se encontró la tabla de posiciones (leaderboard) para el club_id o queue_id indicado.' });
    }
    return res.status(500).json({ error: 'Error interno al consultar la API de Faceit.' });
  }
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
app.use('/api', createPublicApiRouter(db));

app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(new URL('public/admin/index.html', import.meta.url).pathname);
});
app.get('/admin/*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(new URL('public/admin/index.html', import.meta.url).pathname);
});

// Rutas públicas de Tienda, Términos, Devoluciones, Libro de Reclamaciones INDECOPI y Contacto
const publicSpaRoutes = [
  '/',
  '/tienda',
  '/tienda/*',
  '/productos',
  '/productos/*',
  '/contacto',
  '/terminos',
  '/terminos-y-condiciones',
  '/devoluciones',
  '/politica-de-devoluciones',
  '/reclamaciones',
  '/libro-de-reclamaciones',
  '/libro-de-reclamaciones/*',
  '/arena',
  '/draft',
  '/mixton',
  '/mixton/*',
  '/checkout'
];

app.get(publicSpaRoutes, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(new URL('public/index.html', import.meta.url).pathname);
});

// Fallback universal para SPA: cualquier ruta GET no de API ni Admin devuelve index.html
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/auth') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/webhook') ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/assets') ||
    req.path.includes('.')
  ) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(new URL('public/index.html', import.meta.url).pathname);
});

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.success(`Servidor Express escuchando en http://0.0.0.0:${env.PORT}`);
  // Iniciar el Bot de Steam en el mismo proceso
  if (process.env.DISABLE_STEAM_BOT !== 'true') {
    startSteamBot();
  } else {
    logger.warn('🤖 Bot de Steam: Inicio de sesión desactivado mediante la variable DISABLE_STEAM_BOT en el archivo .env.');
  }
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
    if (steamClient && steamClient.steamID) {
      logger.info('🤖 Desconectando bot de Steam...');
      steamClient.logOff();
    }
  } catch (err) {
    logger.error('Error al desconectar el bot de Steam:', err.message);
  }

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
if (isDiscordConfigured && env.DISCORD_TOKEN) {
  client.login(env.DISCORD_TOKEN).catch((err) => {
    logger.error('Error al iniciar sesion en Discord:', err.message);
  });
} else {
  logger.warn('Login de Discord omitido por falta de credenciales. El servidor web seguira disponible en modo offline.');
}

