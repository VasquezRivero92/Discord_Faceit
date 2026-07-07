import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath) {
  try {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.success('🔥 Firebase inicializado usando el archivo de credenciales.');
    } else {
      logger.warn(`⚠️ Advertencia: No se encontró el archivo de credenciales de Firebase en: ${resolvedPath}. Intentando inicialización por defecto...`);
      admin.initializeApp();
    }
  } catch (error) {
      logger.error('❌ Error al inicializar Firebase con archivo, intentando inicialización por defecto:', error);
    admin.initializeApp();
  }
} else {
  try {
    admin.initializeApp();
    logger.success('🔥 Firebase inicializado con credenciales por defecto.');
  } catch (error) {
    logger.error('❌ Error al inicializar Firebase por defecto:', error);
  }
}

const firestore = admin.firestore();

const USERS_COLLECTION = 'faceit_users';
const PENDING_COLLECTION = 'faceit_pending_verifications';
const ACTIVE_MATCHES_COLLECTION = 'faceit_active_matches';
const CONFIG_COLLECTION = 'faceit_config';
const MATCHES_HISTORY_COLLECTION = 'faceit_matches_history';
// --- In-Memory Caching ---
let mixtonLobbyStateCache = null;
let readyPlayersCache = null;
let readyPlayersLastFetch = 0;
const READY_PLAYERS_TTL = 30000; // 30 seconds

let settingsCache = null;
let settingsLastFetch = 0;
const SETTINGS_TTL = 30000; // 30 seconds

let nicknameToDiscordMapCache = null;
let nicknameToDiscordMapLastFetch = 0;
const NICKNAME_MAP_TTL = 300000; // 5 minutes

// --- Nuevas Estructuras de Caché Optimizadas ---
const userByDiscordIdCache = new Map();
const userByFaceitIdCache = new Map();
const userByNicknameCache = new Map();
const USER_CACHE_TTL = 300000; // 5 minutos (evita lecturas constantes en eventos frecuentes)

function cacheUser(docId, data) {
  if (!docId) return;
  const now = Date.now();
  userByDiscordIdCache.set(docId, { data, timestamp: now });
  if (data) {
    const actualDiscordId = data.discordId || docId;
    if (data.faceit_player_id) {
      userByFaceitIdCache.set(data.faceit_player_id, { data: actualDiscordId, timestamp: now });
    }
    if (data.faceit_nickname) {
      userByNicknameCache.set(data.faceit_nickname.toLowerCase(), { data: actualDiscordId, timestamp: now });
    }
  }
}

function getCachedUserByDiscordId(discordId) {
  const entry = userByDiscordIdCache.get(discordId);
  if (entry && (Date.now() - entry.timestamp < USER_CACHE_TTL)) {
    return entry.data;
  }
  return undefined; // Miss
}

function invalidateUserCache(discordId, faceitPlayerId = null, faceitNickname = null) {
  if (discordId) userByDiscordIdCache.delete(discordId);
  if (faceitPlayerId) userByFaceitIdCache.delete(faceitPlayerId);
  if (faceitNickname) userByNicknameCache.delete(faceitNickname.toLowerCase());
}

// Caché de Partidas Activas
const activeMatchesCacheMap = new Map();
let activeMatchesLastFetch = 0;
let activeMatchesFetched = false;
const ACTIVE_MATCHES_TTL = 10000; // 10 segundos

async function ensureActiveMatchesCache() {
  const now = Date.now();
  if (activeMatchesFetched && (now - activeMatchesLastFetch < ACTIVE_MATCHES_TTL)) {
    return;
  }
  try {
    const snapshot = await firestore.collection(ACTIVE_MATCHES_COLLECTION).get();
    activeMatchesCacheMap.clear();
    snapshot.forEach(doc => {
      activeMatchesCacheMap.set(doc.id, doc.data());
    });
    activeMatchesLastFetch = now;
    activeMatchesFetched = true;
  } catch (error) {
    logger.error('Error al actualizar caché de partidas activas:', error);
  }
}

function invalidateActiveMatchesCache() {
  activeMatchesFetched = false;
  activeMatchesLastFetch = 0;
  activeMatchesCacheMap.clear();
}

// Caché de Configuración por Servidor (Guild Settings)
const guildSettingsCache = new Map();
const GUILD_SETTINGS_TTL = 30000; // 30 segundos

export const db = {
  _firestore: firestore,

  // --- Mapeo de Usuarios ---
  async setPendingVerification(discordId, faceitNickname, code) {
    try {
      const docRef = firestore.collection(PENDING_COLLECTION).doc(discordId);
      await docRef.set({
        faceitNickname,
        code,
        expiresAt: Date.now() + 15 * 60 * 1000
      });
    } catch (error) {
      logger.error('Error al guardar verificación pendiente en Firestore:', error);
    }
  },

  async getPendingVerification(discordId) {
    try {
      const docRef = firestore.collection(PENDING_COLLECTION).doc(discordId);
      const doc = await docRef.get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (Date.now() > data.expiresAt) {
        await docRef.delete();
        return null;
      }
      return data;
    } catch (error) {
      logger.error('Error al obtener verificación pendiente de Firestore:', error);
      return null;
    }
  },

  async linkAccounts(discordId, faceitPlayerId, faceitNickname, skillLevel = null, elo = null, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const userData = {
        discordId: discordId,
        guild_id: guildId || null,
        faceit_player_id: faceitPlayerId,
        faceit_nickname: faceitNickname,
        faceit_nickname_lower: faceitNickname.toLowerCase(),
        faceit_level: skillLevel,
        faceit_elo: elo
      };
      await userRef.set({
        ...userData,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      const pendingRef = firestore.collection(PENDING_COLLECTION).doc(discordId);
      await pendingRef.delete();
      readyPlayersCache = null;
      readyPlayersLastFetch = 0;
      nicknameToDiscordMapCache = null;
      nicknameToDiscordMapLastFetch = 0;
      cacheUser(docId, userData);
      logger.success(`Cuenta vinculada en Firestore: Server(${guildId}) Discord(${discordId}) <-> Faceit(${faceitNickname})`);
    } catch (error) {
      logger.error('Error al vincular cuentas en Firestore:', error);
    }
  },

  async updatePlayerStats(discordId, skillLevel, elo, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      await userRef.update({
        faceit_level: skillLevel,
        faceit_elo: elo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      readyPlayersCache = null;
      readyPlayersLastFetch = 0;
      
      const cached = getCachedUserByDiscordId(docId);
      if (cached) {
        cacheUser(docId, {
          ...cached,
          faceit_level: skillLevel,
          faceit_elo: elo
        });
      } else {
        invalidateUserCache(docId);
      }
      logger.info(`Stats actualizados en Firestore para Server(${guildId}) Discord(${discordId}): Nivel ${skillLevel}, ELO ${elo}`);
    } catch (error) {
      logger.error('Error al actualizar stats de jugador en Firestore:', error);
    }
  },

  async updateDiscordDetailsInDb(discordId, details, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const doc = await userRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (
          data.discord_username !== details.username ||
          data.discord_displayName !== details.displayName ||
          data.discord_avatar !== details.avatarURL
        ) {
          await userRef.update({
            discord_username: details.username,
            discord_displayName: details.displayName,
            discord_avatar: details.avatarURL,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Update local memory cache too
          const cached = getCachedUserByDiscordId(docId);
          if (cached) {
            cacheUser(docId, {
              ...cached,
              discord_username: details.username,
              discord_displayName: details.displayName,
              discord_avatar: details.avatarURL
            });
          }
        }
      }
    } catch (error) {
      // Silencioso
    }
  },

  async unlinkAccount(discordId, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      await userRef.delete();
      readyPlayersCache = null;
      readyPlayersLastFetch = 0;
      nicknameToDiscordMapCache = null;
      nicknameToDiscordMapLastFetch = 0;
      
      const cached = getCachedUserByDiscordId(docId);
      if (cached) {
        invalidateUserCache(docId, cached.faceit_player_id, cached.faceit_nickname);
      } else {
        invalidateUserCache(docId);
      }
      logger.info(`Cuenta desvinculada en Firestore: Server(${guildId}) Discord(${discordId})`);
    } catch (error) {
      logger.error('Error al desvincular cuenta en Firestore:', error);
    }
  },

  async getDiscordIdByFaceitId(faceitPlayerId, guildId = null) {
    if (!faceitPlayerId) return null;
    
    // Check in-memory cache
    const cachedEntry = userByFaceitIdCache.get(faceitPlayerId);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < USER_CACHE_TTL)) {
      return cachedEntry.data;
    }

    try {
      let query = firestore.collection(USERS_COLLECTION)
        .where('faceit_player_id', '==', faceitPlayerId);
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      const data = doc.data();
      const resolvedId = data.discordId || doc.id;
      
      // Update cache
      cacheUser(doc.id, data);
      return resolvedId;
    } catch (error) {
      logger.error('Error al buscar Discord ID por Faceit ID en Firestore:', error);
      return null;
    }
  },

  async getDiscordIdByNickname(nickname, guildId = null) {
    if (!nickname) return null;
    const key = nickname.toLowerCase();
    
    // Check in-memory cache
    const cachedEntry = userByNicknameCache.get(key);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < USER_CACHE_TTL)) {
      return cachedEntry.data;
    }

    try {
      let query = firestore.collection(USERS_COLLECTION)
        .where('faceit_nickname_lower', '==', key);
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      const data = doc.data();
      const resolvedId = data.discordId || doc.id;
      
      // Update cache
      cacheUser(doc.id, data);
      return resolvedId;
    } catch (error) {
      logger.error('Error al buscar Discord ID por Nickname en Firestore:', error);
      return null;
    }
  },

  async getFaceitIdByDiscordId(discordId, guildId = null) {
    if (!discordId) return null;
    const docId = guildId ? `${guildId}_${discordId}` : discordId;
    const cached = getCachedUserByDiscordId(docId);
    if (cached !== undefined) {
      if (cached === null) return null;
      return {
        faceit_player_id: cached.faceit_player_id || null,
        faceit_nickname: cached.faceit_nickname || null
      };
    }
    try {
      const doc = await firestore.collection(USERS_COLLECTION).doc(docId).get();
      if (!doc.exists) {
        cacheUser(docId, null);
        return null;
      }
      const data = doc.data();
      cacheUser(docId, data);
      return {
        faceit_player_id: data.faceit_player_id || null,
        faceit_nickname: data.faceit_nickname || null
      };
    } catch (error) {
      logger.error('Error al obtener Faceit ID por Discord ID:', error);
      return null;
    }
  },

  async getActiveMatchByPlayerId(faceitPlayerId) {
    try {
      await ensureActiveMatchesCache();
      for (const data of activeMatchesCacheMap.values()) {
        const allPlayers = [
          ...(data.faction1_roster || []),
          ...(data.faction2_roster || [])
        ];
        if (allPlayers.some(p => p.id === faceitPlayerId)) {
          return data;
        }
      }
      return null;
    } catch (error) {
      logger.error('Error al buscar partida activa por player ID:', error);
      return null;
    }
  },

  // --- Gestión de Partidas Activas ---
  async addActiveMatch(matchId, matchData, vc1Id = null, vc2Id = null, messageId = null, faction1Roster = [], faction2Roster = [], originalVoiceStates = {}, guildId = null) {
    try {
      const docRef = firestore.collection(ACTIVE_MATCHES_COLLECTION).doc(matchId);
      const matchObj = {
        id: matchId,
        entity_custom_name: matchData.entity_custom_name || 'Club',
        game: matchData.game || 'cs2',
        map: matchData.voting?.map?.pick?.[0] || 'Votando...',
        location: matchData.voting?.location?.pick?.[0] || 'Votando...',
        faction1_name: matchData.teams?.faction1?.name || 'Equipo A',
        faction2_name: matchData.teams?.faction2?.name || 'Equipo B',
        faction1_roster: faction1Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        faction2_roster: faction2Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        faction1_vc_id: vc1Id,
        faction2_vc_id: vc2Id,
        message_id: messageId,
        original_voice_states: originalVoiceStates,
        creator_id: matchData.creator_id || null,
        guild_id: guildId,
        startedAt: Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await docRef.set(matchObj);
      activeMatchesCacheMap.set(matchId, matchObj);
      activeMatchesLastFetch = Date.now();
      activeMatchesFetched = true;
      logger.success(`Partida ${matchId} agregada a activas en Firestore.`);
    } catch (error) {
      logger.error('Error al guardar partida activa en Firestore:', error);
    }
  },

  async getGuildIdByHubId(hubId) {
    if (!hubId) return null;
    try {
      const snapshot = await firestore.collection('guild_settings')
        .where('faceitHubId', '==', hubId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
      return null;
    } catch (e) {
      logger.error('Error al buscar guild por hub ID:', e);
      return null;
    }
  },

  async getGuildIdsByHubId(hubId) {
    if (!hubId) return [];
    try {
      const snapshot = await firestore.collection('guild_settings')
        .where('faceitHubId', '==', hubId)
        .get();
      const ids = [];
      snapshot.forEach(doc => {
        ids.push(doc.id);
      });
      return ids;
    } catch (e) {
      logger.error('Error al buscar guilds por hub ID:', e);
      return [];
    }
  },

  async updateActiveMatchVoiceAndMessage(matchId, vc1Id, vc2Id, messageId) {
    try {
      const docRef = firestore.collection(ACTIVE_MATCHES_COLLECTION).doc(matchId);
      await docRef.update({
        faction1_vc_id: vc1Id,
        faction2_vc_id: vc2Id,
        message_id: messageId
      });
      const cached = activeMatchesCacheMap.get(matchId);
      if (cached) {
        cached.faction1_vc_id = vc1Id;
        cached.faction2_vc_id = vc2Id;
        cached.message_id = messageId;
        activeMatchesCacheMap.set(matchId, cached);
        activeMatchesLastFetch = Date.now();
      } else {
        invalidateActiveMatchesCache();
      }
      logger.success(`Partida ${matchId} actualizada con VCs y Message ID.`);
    } catch (error) {
      logger.error('Error al actualizar partida activa en Firestore:', error);
    }
  },

  async removeActiveMatch(matchId) {
    try {
      const docRef = firestore.collection(ACTIVE_MATCHES_COLLECTION).doc(matchId);
      await docRef.delete();
      activeMatchesCacheMap.delete(matchId);
      activeMatchesLastFetch = Date.now();
      logger.success(`Partida ${matchId} removida de activas en Firestore.`);
    } catch (error) {
      logger.error('Error al eliminar partida activa de Firestore:', error);
    }
  },

  // --- Historial de Partidas Finalizadas ---
  async addMatchToHistory(matchId, matchData, winner, scoreA, scoreB, faction1Roster = [], faction2Roster = [], guildId = null) {
    try {
      const docRef = firestore.collection(MATCHES_HISTORY_COLLECTION).doc(matchId);
      await docRef.set({
        id: matchId,
        entity_custom_name: matchData.entity_custom_name || 'Club',
        game: matchData.game || 'cs2',
        map: matchData.voting?.map?.pick?.[0] || 'Desconocido',
        location: matchData.voting?.location?.pick?.[0] || 'Desconocido',
        faction1_name: matchData.teams?.faction1?.name || 'Equipo A',
        faction2_name: matchData.teams?.faction2?.name || 'Equipo B',
        faction1_score: scoreA,
        faction2_score: scoreB,
        winner: winner, // 'faction1' or 'faction2'
        faction1_roster: faction1Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        faction2_roster: faction2Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        guild_id: guildId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.success(`Partida ${matchId} agregada al historial de Firestore.`);
    } catch (error) {
      logger.error('Error al guardar partida en historial de Firestore:', error);
    }
  },

  async getMatchHistory(limit = 20, guildId = null) {
    try {
      let query = firestore.collection(MATCHES_HISTORY_COLLECTION);
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.get();
      const history = [];
      snapshot.forEach(doc => {
        history.push(doc.data());
      });

      // Ordenar en memoria por createdAt descendente
      history.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : (a.createdAt._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt).getTime())) : 0;
        const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : (b.createdAt._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt).getTime())) : 0;
        return timeB - timeA;
      });

      return history.slice(0, limit);
    } catch (error) {
      logger.error('Error al obtener historial de partidas de Firestore:', error);
      return [];
    }
  },

  async getActiveMatch(matchId) {
    try {
      await ensureActiveMatchesCache();
      return activeMatchesCacheMap.get(matchId) || null;
    } catch (error) {
      logger.error('Error al obtener partida activa de Firestore:', error);
      return null;
    }
  },

  async getActiveMatches() {
    try {
      await ensureActiveMatchesCache();
      return Array.from(activeMatchesCacheMap.values());
    } catch (error) {
      logger.error('Error al obtener partidas activas de Firestore:', error);
      return [];
    }
  },

  // --- Configuración del Panel Fijo ---
  async getPanelMessageConfig() {
    try {
      const doc = await firestore.collection(CONFIG_COLLECTION).doc('panel').get();
      if (doc.exists) return doc.data();
      return null;
    } catch (error) {
      logger.error('Error al obtener configuración del panel:', error);
      return null;
    }
  },

  async setPanelMessageConfig(messageId, channelId) {
    try {
      await firestore.collection(CONFIG_COLLECTION).doc('panel').set({
        messageId,
        channelId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.error('Error al guardar configuración del panel:', error);
    }
  },

  // --- Configuración del Mensaje de Estado de Servidores ---
  async getStatusMessageConfig() {
    try {
      const doc = await firestore.collection(CONFIG_COLLECTION).doc('status_panel').get();
      if (doc.exists) return doc.data();
      return null;
    } catch (error) {
      logger.error('Error al obtener configuración del estado de servidores:', error);
      return null;
    }
  },

  async setStatusMessageConfig(messageId, channelId) {
    try {
      await firestore.collection(CONFIG_COLLECTION).doc('status_panel').set({
        messageId,
        channelId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.error('Error al guardar configuración del estado de servidores:', error);
    }
  },

  // --- Settings / Feature Flags ---
  async getSettings() {
    if (settingsCache && (Date.now() - settingsLastFetch < SETTINGS_TTL)) {
      return settingsCache;
    }
    try {
      const doc = await firestore.collection(CONFIG_COLLECTION).doc('settings').get();
      if (doc.exists) {
        settingsCache = doc.data();
        settingsLastFetch = Date.now();
        return settingsCache;
      }
      const defaultSettings = getDefaultSettings();
      settingsCache = defaultSettings;
      settingsLastFetch = Date.now();
      return defaultSettings;
    } catch (error) {
      logger.error('Error al obtener settings:', error);
      return settingsCache || getDefaultSettings();
    }
  },

  async setSettings(settings) {
    try {
      const updatedSettings = {
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await firestore.collection(CONFIG_COLLECTION).doc('settings').set(updatedSettings);
      settingsCache = updatedSettings;
      settingsLastFetch = Date.now();
      logger.success('Settings actualizados en Firestore.');
    } catch (error) {
      logger.error('Error al guardar settings:', error);
    }
  },

  async getGuildSettings(guildId) {
    if (!guildId) return {};
    const cached = guildSettingsCache.get(guildId);
    if (cached && (Date.now() - cached.timestamp < GUILD_SETTINGS_TTL)) {
      return cached.data;
    }
    try {
      const doc = await firestore.collection('guild_settings').doc(guildId).get();
      const data = doc.exists ? doc.data() : {};
      guildSettingsCache.set(guildId, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      logger.error(`Error al obtener settings de la guild ${guildId}:`, error);
      return {};
    }
  },

  async setGuildSettings(guildId, settings) {
    if (!guildId) return false;
    try {
      await firestore.collection('guild_settings').doc(guildId).set({
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      guildSettingsCache.delete(guildId);
      return true;
    } catch (error) {
      logger.error(`Error al guardar settings de la guild ${guildId}:`, error);
      return false;
    }
  },

  invalidateSettingsCache() {
    settingsCache = null;
    settingsLastFetch = 0;
    guildSettingsCache.clear();
  },

  // --- Logs del Bot ---
  async addLogEntry(level, message, source = 'bot', guildId = null) {
    // Para no saturar la cuota de escritura de Firestore (Spark Plan),
    // solo persistimos logs de nivel 'error', 'warn' o acciones realizadas desde el panel ('system').
    if (level !== 'error' && level !== 'warn' && source !== 'system') {
      return;
    }
    try {
      await firestore.collection('faceit_bot_logs').add({
        level,
        message,
        source,
        guild_id: guildId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      // Silencioso para no crear bucle
    }
  },

  async getRecentLogs(limit = 50, guildId = null) {
    try {
      let query = firestore.collection('faceit_bot_logs').orderBy('createdAt', 'desc');
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.limit(limit).get();
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return logs;
    } catch (error) {
      logger.error('Error al obtener logs:', error);
      return [];
    }
  },

  async pruneOldLogs(days = 7) {
    try {
      const expirationDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const snapshot = await firestore.collection('faceit_bot_logs')
        .where('createdAt', '<', expirationDate)
        .get();

      if (snapshot.empty) return 0;

      const batch = firestore.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpieza de logs: se eliminaron ${snapshot.size} entradas con más de ${days} días.`);
      return snapshot.size;
    } catch (error) {
      logger.error('Error al limpiar logs antiguos de Firestore:', error);
      return 0;
    }
  },

  // --- Llamadas de Soporte ---
  async createSupportCall(supportId, matchId, faceitPlayerId, faceitNickname, discordId, description, matchUrl, guildId = null) {
    try {
      const docRef = firestore.collection('faceit_support_calls').doc(supportId);
      await docRef.set({
        id: supportId,
        match_id: matchId,
        match_url: matchUrl,
        faceit_player_id: faceitPlayerId,
        faceit_nickname: faceitNickname,
        discord_id: discordId,
        description: description,
        status: 'pendiente',
        claimedBy: null,
        claimedAt: null,
        guild_id: guildId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.success(`Solicitud de soporte ${supportId} guardada en Firestore.`);
    } catch (error) {
      logger.error('Error al guardar solicitud de soporte en Firestore:', error);
    }
  },

  async getSupportCall(supportId) {
    try {
      const doc = await firestore.collection('faceit_support_calls').doc(supportId).get();
      if (doc.exists) return doc.data();
      return null;
    } catch (error) {
      logger.error('Error al obtener solicitud de soporte de Firestore:', error);
      return null;
    }
  },

  async claimSupportCall(supportId, adminDiscordId) {
    try {
      const docRef = firestore.collection('faceit_support_calls').doc(supportId);
      await docRef.update({
        status: 'atendida',
        claimedBy: adminDiscordId,
        claimedAt: Date.now()
      });
      logger.success(`Solicitud de soporte ${supportId} reclamada por ${adminDiscordId}.`);
    } catch (error) {
      logger.error('Error al reclamar solicitud de soporte en Firestore:', error);
    }
  },

  async hasPendingSupportCall(discordId) {
    try {
      const snapshot = await firestore.collection('faceit_support_calls')
        .where('discord_id', '==', discordId)
        .where('status', '==', 'pendiente')
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      logger.error('Error al comprobar solicitud de soporte pendiente:', error);
      return false;
    }
  },

  async getSupportCalls(limit = 50, guildId = null) {
    try {
      let query = firestore.collection('faceit_support_calls').orderBy('createdAt', 'desc');
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.limit(limit).get();
      const calls = [];
      snapshot.forEach(doc => {
        calls.push(doc.data());
      });
      return calls;
    } catch (error) {
      logger.error('Error al obtener llamadas de soporte de Firestore:', error);
      return [];
    }
  },

  async getMessageTemplates() {
    try {
      const doc = await firestore.collection(CONFIG_COLLECTION).doc('messages').get();
      if (doc.exists) return doc.data();
      return getDefaultMessageTemplates();
    } catch (error) {
      logger.error('Error al obtener plantillas de mensajes:', error);
      return getDefaultMessageTemplates();
    }
  },

  async setMessageTemplates(templates) {
    try {
      await firestore.collection(CONFIG_COLLECTION).doc('messages').set({
        ...templates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.success('Plantillas de mensajes actualizadas en Firestore.');
    } catch (error) {
      logger.error('Error al guardar plantillas de mensajes:', error);
    }
  },

  async getMixtonLobbyState(guildId = null) {
    if (!guildId && mixtonLobbyStateCache) {
      return mixtonLobbyStateCache;
    }
    const docId = guildId ? `mixton_lobby_${guildId}` : 'mixton_lobby';
    try {
      const doc = await firestore.collection(CONFIG_COLLECTION).doc(docId).get();
      if (doc.exists) {
        const state = doc.data();
        if (!guildId) mixtonLobbyStateCache = state;
        return state;
      }
      
      const defaultState = {
        teams: [
          { id: 'team_1', name: 'Equipo 1', captain: null, players: [] },
          { id: 'team_2', name: 'Equipo 2', captain: null, players: [] }
        ],
        pickOrder: [],
        currentPickIndex: 0,
        draftStarted: false,
        draftFinished: false,
        updatedAt: Date.now()
      };
      await firestore.collection(CONFIG_COLLECTION).doc(docId).set(defaultState);
      if (!guildId) mixtonLobbyStateCache = defaultState;
      return defaultState;
    } catch (error) {
      logger.error('Error al obtener estado del lobby mixton:', error);
      return null;
    }
  },

  async saveMixtonLobbyState(state, guildId = null) {
    const docId = guildId ? `mixton_lobby_${guildId}` : 'mixton_lobby';
    try {
      const updatedState = {
        ...state,
        updatedAt: Date.now()
      };
      await firestore.collection(CONFIG_COLLECTION).doc(docId).set(updatedState);
      if (!guildId) mixtonLobbyStateCache = updatedState;
      return true;
    } catch (error) {
      logger.error('Error al guardar estado del lobby mixton:', error);
      return false;
    }
  },

  // --- Ready Players Cache & Helper Methods ---
  invalidateReadyPlayersCache() {
    readyPlayersCache = null;
    readyPlayersLastFetch = 0;
  },

  async getReadyPlayers() {
    if (readyPlayersCache && (Date.now() - readyPlayersLastFetch < READY_PLAYERS_TTL)) {
      return readyPlayersCache;
    }
    try {
      const snapshot = await firestore.collection(USERS_COLLECTION).where('mixton_ready', '==', true).get();
      const players = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        players.push({
          discordId: data.discordId || doc.id,
          faceit_player_id: data.faceit_player_id || '',
          faceit_nickname: data.faceit_nickname || '',
          faceit_level: data.faceit_level || 1,
          faceit_elo: data.faceit_elo || 1000,
          mixton_tier_override: data.mixton_tier_override || null,
          mixton_guild_id: data.mixton_guild_id || data.guild_id || null
        });
      });
      readyPlayersCache = players;
      readyPlayersLastFetch = Date.now();
      return players;
    } catch (error) {
      logger.error('Error al obtener jugadores listos de Firestore:', error);
      return readyPlayersCache || [];
    }
  },

  async setPlayerReadyStatus(discordId, ready, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const updates = { mixton_ready: ready };
      if (ready) {
        updates.mixton_ready_at = Date.now();
        if (guildId) {
          updates.mixton_guild_id = guildId;
        }
      } else {
        updates.mixton_guild_id = admin.firestore.FieldValue.delete();
      }
      await userRef.update(updates);
      this.invalidateReadyPlayersCache();
      return true;
    } catch (error) {
      logger.error(`Error al establecer estado listo para el usuario ${discordId}:`, error);
      return false;
    }
  },

  async overridePlayerTier(discordId, tier, guildId = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const docRef = firestore.collection(USERS_COLLECTION).doc(docId);
      if (tier === null) {
        await docRef.update({
          mixton_tier_override: admin.firestore.FieldValue.delete()
        });
      } else {
        await docRef.update({
          mixton_tier_override: tier
        });
      }
      this.invalidateReadyPlayersCache();
      return true;
    } catch (error) {
      logger.error(`Error al sobreescribir tier para el usuario ${discordId}:`, error);
      return false;
    }
  },

  async resetPlayersReadyStatus(discordIds, guildId = null) {
    try {
      if (!discordIds || discordIds.length === 0) return true;
      const batch = firestore.batch();
      discordIds.forEach(id => {
        const docId = guildId ? `${guildId}_${id}` : id;
        batch.update(firestore.collection(USERS_COLLECTION).doc(docId), { mixton_ready: false });
      });
      await batch.commit();
      this.invalidateReadyPlayersCache();
      return true;
    } catch (error) {
      logger.error('Error al restablecer listos de jugadores:', error);
      return false;
    }
  },

  async resetAllReadyPlayers(guildId = null) {
    try {
      const allReadyPlayers = await this.getReadyPlayers();
      const readyPlayers = guildId ? allReadyPlayers.filter(p => p.mixton_guild_id === guildId) : allReadyPlayers;
      if (readyPlayers.length === 0) return 0;
      
      const batch = firestore.batch();
      readyPlayers.forEach(p => {
        const docId = guildId ? `${guildId}_${p.discordId}` : p.discordId;
        batch.update(firestore.collection(USERS_COLLECTION).doc(docId), { mixton_ready: false });
      });
      await batch.commit();
      this.invalidateReadyPlayersCache();
      return readyPlayers.length;
    } catch (error) {
      logger.error('Error al restablecer todos los jugadores listos:', error);
      return 0;
    }
  },
  async getFullUser(discordId, guildId = null) {
    if (!discordId) return null;
    try {
      if (guildId) {
        const doc = await firestore.collection(USERS_COLLECTION).doc(`${guildId}_${discordId}`).get();
        if (doc.exists) return doc.data();
      }
      const doc = await firestore.collection(USERS_COLLECTION).doc(discordId).get();
      if (doc.exists) return doc.data();

      // Fallback: buscar cualquier documento con el mismo discordId en la colección
      const snapshot = await firestore.collection(USERS_COLLECTION).where('discordId', '==', discordId).get();
      if (!snapshot.empty) {
        // Priorizar el documento que contenga privilegios administrativos
        const adminDoc = snapshot.docs.find(d => d.data().rol === 'admin' || d.data().rol === 'global_admin');
        if (adminDoc) return adminDoc.data();
        return snapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      logger.error(`Error al obtener usuario completo ${discordId}:`, error);
      return null;
    }
  },

  async setUserRoleAndGuild(discordId, role, guildId) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const docRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const doc = await docRef.get();
      
      const updateData = {
        rol: role,
        servidor: guildId,
        guild_id: guildId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (doc.exists) {
        await docRef.update(updateData);
      } else {
        await docRef.set({
          discordId,
          ...updateData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      this.invalidateReadyPlayersCache();
      return true;
    } catch (error) {
      logger.error(`Error al establecer rol y servidor para el usuario ${discordId}:`, error);
      return false;
    }
  },

  async getNicknameToDiscordMap(guildId = null) {
    const now = Date.now();
    const cacheKey = guildId || 'global';
    if (nicknameToDiscordMapCache && nicknameToDiscordMapCache[cacheKey] && (now - nicknameToDiscordMapLastFetch < NICKNAME_MAP_TTL)) {
      return nicknameToDiscordMapCache[cacheKey];
    }
    try {
      let query = firestore.collection(USERS_COLLECTION);
      if (guildId) {
        query = query.where('guild_id', '==', guildId);
      }
      const snapshot = await query.get();
      const map = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.faceit_nickname) {
          map[data.faceit_nickname.toLowerCase()] = data.discordId || doc.id;
        }
      });
      if (!nicknameToDiscordMapCache) nicknameToDiscordMapCache = {};
      nicknameToDiscordMapCache[cacheKey] = map;
      nicknameToDiscordMapLastFetch = now;
      return map;
    } catch (error) {
      logger.error('Error al obtener mapeo de apodos en Firestore:', error);
      return {};
    }
  },

  invalidateNicknameMapCache() {
    nicknameToDiscordMapCache = null;
    nicknameToDiscordMapLastFetch = 0;
  }
};

function getDefaultSettings() {
  return {
    // Canales
    discordLinkChannelId: '',
    discordMatchesChannelId: '',
    discordRolesChannelId: '',
    discordStatusChannelId: '',
    discordWaitingRoomChannelId: '',
    discordAdminAlertsChannelId: '',
    discordSupportChannelId: '',
    // Feature flags
    autoWelcomeDm: true,
    autoRoleSync: true,
    autoVoiceChannels: true,
    autoMovePlayers: true,
    matchAnnouncements: true,
    serverStatusAnnouncements: true,
    liveMatchPanel: true,
    webhookValidation: false,
    adminCallNotifications: true,
    // Hub
    faceitHubId: '',
    // Roles
    adminRoleName: 'ADMIN',
    // Misc
    matchTimeoutMinutes: 120,
    updatedAt: null
  };
}

function getDefaultMessageTemplates() {
  return {
    welcomeTitle: '¡Bienvenido al Servidor! 🎉',
    welcomeDescription: '¡Hola **{username}**! Gracias por unirte a nuestra comunidad.\n\nAquí tienes una **guía rápida** para unirte y verificar tu cuenta de **Faceit**:\n\n📌 **PASO 1: Únete al Club**\nHaz clic en el siguiente enlace y únete a nuestro club oficial en la plataforma:\n🔗 **[Hacer clic aquí para Unirse al Club]({clubUrl})**\n\n📌 **PASO 2: Obtén tu Nickname de Faceit**\nAsegúrate de copiar tu nombre de usuario exacto tal y como aparece en tu perfil de Faceit.\n\n📌 **PASO 3: Vincula tu cuenta en Discord**\nVe al canal de Discord {linkChannelMention} y escribe el comando:\n➡️ `/verificar_fc`\n\nEl bot te pedirá tu nickname de Faceit. Escríbelo, presiona enviar y ¡listo! Tus roles de nivel y del Club se actualizarán automáticamente.\n\n¡Nos vemos en el servidor y buena suerte en tus partidas! 🎮',
    welcomeColor: '#FF5500',
    supportTitle: '🚨 Soporte y Llamado de Admin',
    supportDescription: '¿Tienes algún problema en tu partida activa de Faceit?\n\nPresiona el botón de abajo para solicitar la asistencia de un administrador del staff.\n\n⚠️ **Requisitos y Notas Importantes**:\n- Debes tener tu cuenta de Faceit vinculada con el bot (usa `/verificar_fc` si aún no lo has hecho).\n- Solo funcionará si te encuentras actualmente en una **partida activa** de Faceit en este servidor/club.\n- Al presionar el botón, se enviará una notificación con el enlace a tu partida al equipo de soporte.',
    supportColor: '#FF0000',
  };
}
