import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

class MockFirestore {
  constructor() {
    this.store = {}; // { collectionName: { docId: data } }
  }
  collection(name) {
    if (!this.store[name]) this.store[name] = {};
    return new MockCollection(this.store[name], name, this);
  }
  batch() {
    return new MockBatch(this);
  }
  _resolveServerTimestamps(data) {
    if (!data) return data;
    const copy = { ...data };
    for (const [k, v] of Object.entries(copy)) {
      if (v && v.__serverTimestamp) {
        copy[k] = new Date();
      }
    }
    return copy;
  }
}

class MockCollection {
  constructor(dataStore, name, firestoreInstance) {
    this.dataStore = dataStore;
    this.name = name;
    this.firestoreInstance = firestoreInstance;
  }
  doc(id) {
    const docId = id || Math.random().toString(36).substring(2, 15);
    return new MockDocument(this.dataStore, docId, this.name, this.firestoreInstance);
  }
  async add(data) {
    const id = Math.random().toString(36).substring(2, 15);
    const cleanData = this.firestoreInstance._resolveServerTimestamps(data);
    this.dataStore[id] = cleanData;
    return new MockDocument(this.dataStore, id, this.name, this.firestoreInstance);
  }
  where(field, op, val) {
    return new MockQuery(this.dataStore, this.name, this.firestoreInstance).where(field, op, val);
  }
  orderBy(field, dir) {
    return new MockQuery(this.dataStore, this.name, this.firestoreInstance).orderBy(field, dir);
  }
  limit(n) {
    return new MockQuery(this.dataStore, this.name, this.firestoreInstance).limit(n);
  }
  async get() {
    return new MockQuery(this.dataStore, this.name, this.firestoreInstance).get();
  }
}

class MockDocument {
  constructor(dataStore, id, collectionName, firestoreInstance) {
    this.dataStore = dataStore;
    this.id = id;
    this.collectionName = collectionName;
    this.firestoreInstance = firestoreInstance;
  }
  async get() {
    const exists = this.dataStore[this.id] !== undefined;
    const data = exists ? this.dataStore[this.id] : undefined;
    return {
      exists,
      id: this.id,
      data: () => (data ? { ...data } : undefined)
    };
  }
  async set(data, options) {
    const cleanData = this.firestoreInstance._resolveServerTimestamps(data);
    if (options && options.merge && this.dataStore[this.id]) {
      this.dataStore[this.id] = { ...this.dataStore[this.id], ...cleanData };
    } else {
      this.dataStore[this.id] = cleanData;
    }
  }
  async update(data) {
    if (this.dataStore[this.id] === undefined) {
      this.dataStore[this.id] = {};
    }
    const cleanData = this.firestoreInstance._resolveServerTimestamps(data);
    for (const [k, v] of Object.entries(cleanData)) {
      if (v === '__DELETE__') {
        delete this.dataStore[this.id][k];
      } else {
        this.dataStore[this.id][k] = v;
      }
    }
  }
  async delete() {
    delete this.dataStore[this.id];
  }
}

class MockQuery {
  constructor(dataStore, collectionName, firestoreInstance) {
    this.dataStore = dataStore;
    this.collectionName = collectionName;
    this.firestoreInstance = firestoreInstance;
    this.filters = [];
    this.order = null;
    this.lim = null;
  }
  where(field, op, val) {
    this.filters.push({ field, op, val });
    return this;
  }
  orderBy(field, dir) {
    this.order = { field, dir };
    return this;
  }
  limit(n) {
    this.lim = n;
    return this;
  }
  async get() {
    let docs = Object.entries(this.dataStore).map(([id, data]) => ({ id, data }));
    
    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const val = doc.data[filter.field];
        if (filter.op === '==' || filter.op === '===') return val === filter.val;
        if (filter.op === '!=') return val !== filter.val;
        if (filter.op === '>') return val > filter.val;
        if (filter.op === '<') return val < filter.val;
        if (filter.op === '>=') return val >= filter.val;
        if (filter.op === '<=') return val <= filter.val;
        if (filter.op === 'array-contains') return Array.isArray(val) && val.includes(filter.val);
        if (filter.op === 'in') return Array.isArray(filter.val) && filter.val.includes(val);
        return true;
      });
    }

    if (this.order) {
      docs.sort((a, b) => {
        const valA = a.data[this.order.field];
        const valB = b.data[this.order.field];
        if (valA < valB) return this.order.dir === 'desc' ? 1 : -1;
        if (valA > valB) return this.order.dir === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (this.lim !== null) {
      docs = docs.slice(0, this.lim);
    }

    const mockDocs = docs.map(doc => ({
      id: doc.id,
      exists: true,
      data: () => ({ ...doc.data })
    }));

    return {
      size: mockDocs.length,
      empty: mockDocs.length === 0,
      forEach: (callback) => mockDocs.forEach(callback),
      docs: mockDocs
    };
  }
}

class MockBatch {
  constructor(firestoreInstance) {
    this.firestoreInstance = firestoreInstance;
    this.operations = [];
  }
  set(docRef, data, options) {
    this.operations.push({ type: 'set', docRef, data, options });
    return this;
  }
  update(docRef, data) {
    this.operations.push({ type: 'update', docRef, data });
    return this;
  }
  delete(docRef) {
    this.operations.push({ type: 'delete', docRef });
    return this;
  }
  async commit() {
    for (const op of this.operations) {
      if (op.type === 'set') {
        await op.docRef.set(op.data, op.options);
      } else if (op.type === 'update') {
        await op.docRef.update(op.data);
      } else if (op.type === 'delete') {
        await op.docRef.delete();
      }
    }
  }
}

let firestoreInitialized = false;

if (serviceAccountPath) {
  try {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.success('🔥 Firebase inicializado usando el archivo de credenciales.');
      firestoreInitialized = true;
    } else {
      logger.warn(`⚠️ Advertencia: No se encontró el archivo de credenciales de Firebase en: ${resolvedPath}. Intentando inicialización por defecto...`);
      admin.initializeApp();
      firestoreInitialized = true;
    }
  } catch (error) {
    logger.error('❌ Error al inicializar Firebase con archivo, intentando inicialización por defecto:', error.message);
    try {
      admin.initializeApp();
      firestoreInitialized = true;
    } catch (e) {
      logger.error('❌ Error al inicializar Firebase tras fallback:', e.message);
    }
  }
} else {
  try {
    admin.initializeApp();
    logger.success('🔥 Firebase inicializado con credenciales por defecto.');
    firestoreInitialized = true;
  } catch (error) {
    logger.error('❌ Error al inicializar Firebase por defecto:', error.message);
  }
}

let firestore;
try {
  if (!firestoreInitialized) {
    throw new Error('Firebase Admin no se ha inicializado.');
  }
  firestore = admin.firestore();
  logger.success('🔥 Conectado a Firestore con éxito.');
} catch (error) {
  logger.error('❌ No se pudo conectar a Firestore, activando base de datos en memoria para desarrollo:', error.message);
  
  admin.firestore = () => new MockFirestore();
  admin.firestore.FieldValue = {
    serverTimestamp: () => ({ __serverTimestamp: true }),
    delete: () => '__DELETE__'
  };
  admin.firestore.Timestamp = class {
    constructor(seconds, nanoseconds) {
      this._seconds = seconds;
      this._nanoseconds = nanoseconds;
    }
    toDate() {
      return new Date(this._seconds * 1000);
    }
    static now() {
      return new this(Math.floor(Date.now() / 1000), 0);
    }
    static fromDate(date) {
      return new this(Math.floor(date.getTime() / 1000), 0);
    }
  };
  firestore = admin.firestore();
}

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

async function ensureActiveMatchesCache(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && activeMatchesFetched && (now - activeMatchesLastFetch < ACTIVE_MATCHES_TTL)) {
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
const hubIdToGuildIdsCache = new Map();

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

  async linkAccounts(discordId, faceitPlayerId, faceitNickname, skillLevel = null, elo = null, guildId = null, season = null, phoneNumber = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const cleanPhone = phoneNumber ? String(phoneNumber).replace(/\D/g, '').trim() : null;
      const userData = {
        discordId: discordId,
        guild_id: guildId || null,
        faceit_player_id: faceitPlayerId,
        faceit_nickname: faceitNickname,
        faceit_nickname_lower: faceitNickname.toLowerCase(),
        faceit_level: skillLevel,
        faceit_elo: elo
      };
      if (cleanPhone) {
        userData.phoneNumber = cleanPhone;
      }
      if (season !== null && season !== undefined) {
        userData.faceit_level_season = season;
      }
      await userRef.set({
        ...userData,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
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

  async setUserPhone(discordId, phoneNumber, guildId = null) {
    if (!discordId || !phoneNumber) return false;
    const cleanPhone = String(phoneNumber).replace(/\D/g, '').trim();
    if (!cleanPhone) return false;
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const doc = await userRef.get();
      if (doc.exists) {
        await userRef.update({
          phoneNumber: cleanPhone,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const snapshot = await firestore.collection(USERS_COLLECTION).where('discordId', '==', discordId).get();
        if (!snapshot.empty) {
          for (const d of snapshot.docs) {
            await d.ref.update({
              phoneNumber: cleanPhone,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
      logger.info(`📱 Teléfono guardado de forma confidencial para Discord ID ${discordId}`);
      return true;
    } catch (err) {
      logger.error(`Error al guardar teléfono para usuario ${discordId}:`, err);
      return false;
    }
  },

  async updatePlayerStats(discordId, skillLevel, elo, guildId = null, season = null) {
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const updateData = {
        faceit_level: skillLevel,
        faceit_elo: elo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (season !== null && season !== undefined) {
        updateData.faceit_level_season = season;
      }
      await userRef.update(updateData);
      readyPlayersCache = null;
      readyPlayersLastFetch = 0;
      
      const cached = getCachedUserByDiscordId(docId);
      if (cached) {
        cacheUser(docId, {
          ...cached,
          faceit_level: skillLevel,
          faceit_elo: elo,
          ...(season !== null && season !== undefined ? { faceit_level_season: season } : {})
        });
      } else {
        invalidateUserCache(docId);
      }
      logger.info(`Stats actualizados en Firestore para Server(${guildId}) Discord(${discordId}): Nivel ${skillLevel}, ELO ${elo}${season ? `, Season ${season}` : ''}`);
    } catch (error) {
      logger.error('Error al actualizar stats de jugador en Firestore:', error);
    }
  },

  /**
   * Verifica si un jugador ya ha jugado en la temporada actual de una cola del Hub.
   * @param {string} discordId
   * @param {string} queueId
   * @param {number} season
   * @param {string|null} guildId
   * @returns {Promise<boolean>}
   */
  async hasPlayerPlayedHubSeason(discordId, queueId, season, guildId = null) {
    if (!discordId || !season) return false;
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const doc = await userRef.get();
      if (!doc.exists) return false;
      const data = doc.data();
      const qKey = (queueId || 'default').replace(/\./g, '_');
      const playedSeason = data.hub_seasons_played?.[qKey];
      return playedSeason === season;
    } catch (error) {
      logger.error(`Error al verificar season jugada para Discord(${discordId}):`, error);
      return false;
    }
  },

  /**
   * Registra que un jugador ha iniciado su primera partida en una temporada para una cola del Hub.
   * @param {string} discordId
   * @param {string} queueId
   * @param {number} season
   * @param {string|null} guildId
   */
  async recordPlayerHubSeason(discordId, queueId, season, guildId = null) {
    if (!discordId || !season) return;
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const qKey = (queueId || 'default').replace(/\./g, '_');
      await userRef.update({
        [`hub_seasons_played.${qKey}`]: season,
        last_hub_season_played: season,
        last_hub_match_at: admin.firestore.FieldValue.serverTimestamp()
      }).catch(async () => {
        await userRef.set({
          hub_seasons_played: {
            [qKey]: season
          },
          last_hub_season_played: season,
          last_hub_match_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      invalidateUserCache(docId);
      logger.info(`Temporada de Hub registrada en Firestore: Discord(${discordId}) -> Cola(${qKey}) Season(${season})`);
    } catch (error) {
      logger.error(`Error al registrar season de Hub para Discord(${discordId}):`, error);
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
  async addActiveMatch(matchId, matchData, vc1Id = null, vc2Id = null, messageId = null, faction1Roster = [], faction2Roster = [], originalVoiceStates = {}, guildId = null, queueId = null, queueName = null, matchesChannelId = null, waitingRoomId = null) {
    if (!matchId || typeof matchId !== 'string') {
      logger.warn('addActiveMatch ignorado: matchId no es válido o está vacío.');
      return;
    }
    try {
      const docRef = firestore.collection(ACTIVE_MATCHES_COLLECTION).doc(matchId);
      const matchObj = {
        id: matchId,
        entity_custom_name: matchData.entity_custom_name || 'Club',
        game: matchData.game || 'cs2',
        map: matchData.voting?.map?.pick?.[0] || matchData.map || 'Votando...',
        location: matchData.voting?.location?.pick?.[0] || matchData.location || 'Votando...',
        faction1_name: matchData.teams?.faction1?.name || matchData.faction1_name || 'Equipo A',
        faction2_name: matchData.teams?.faction2?.name || matchData.faction2_name || 'Equipo B',
        faction1_roster: faction1Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        faction2_roster: faction2Roster.map(p => ({ id: p.player_id || p.id, nickname: p.nickname, discord_id: p.discord_id || p.discordId || null })),
        faction1_vc_id: vc1Id,
        faction2_vc_id: vc2Id,
        message_id: messageId,
        matches_channel_id: matchesChannelId || matchData.matches_channel_id || null,
        waiting_room_id: waitingRoomId || matchData.waiting_room_id || null,
        queue_id: queueId || matchData.queue_id || null,
        queue_name: queueName || matchData.queue_name || null,
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
    const ids = await this.getGuildIdsByHubId(hubId);
    return ids.length > 0 ? ids[0] : null;
  },

  async getGuildIdsByHubId(hubId) {
    if (!hubId) return [];
    
    if (hubIdToGuildIdsCache.has(hubId)) {
      return hubIdToGuildIdsCache.get(hubId);
    }

    try {
      const ids = [];

      // 1. Buscar por faceitHubId o faceitClubId
      const snapshot = await firestore.collection('guild_settings')
        .where('faceitHubId', '==', hubId)
        .get();
      snapshot.forEach(doc => {
        ids.push(doc.id);
      });

      const clubSnapshot = await firestore.collection('guild_settings')
        .where('faceitClubId', '==', hubId)
        .get();
      clubSnapshot.forEach(doc => {
        if (!ids.includes(doc.id)) {
          ids.push(doc.id);
        }
      });

      // 2. También buscar por faceitLeaderboardId
      const leaderboardSnapshot = await firestore.collection('guild_settings')
        .where('faceitLeaderboardId', '==', hubId)
        .get();
      leaderboardSnapshot.forEach(doc => {
        if (!ids.includes(doc.id)) {
          ids.push(doc.id);
        }
      });

      // 3. Buscar si el hubId corresponde al ID de alguna Cola configurada (queues)
      const allGuildsSnap = await firestore.collection('guild_settings').get();
      allGuildsSnap.forEach(doc => {
        const data = doc.data() || {};
        if (Array.isArray(data.queues)) {
          const hasQueue = data.queues.some(q => 
            (q.id && q.id.toLowerCase() === hubId.toLowerCase()) || 
            (q.queueId && q.queueId.toLowerCase() === hubId.toLowerCase())
          );
          if (hasQueue && !ids.includes(doc.id)) {
            ids.push(doc.id);
          }
        }
      });

      if (ids.length > 0) {
        hubIdToGuildIdsCache.set(hubId, ids);
        return ids;
      }

      // Si no se encuentra, verificar si el hubId pertenece a un Club (Organizador)
      const { env } = await import('./config/index.js');
      if (env && env.FACEIT_API_KEY && !hubId.startsWith('ID_')) {
        const res = await fetch(`https://open.faceit.com/data/v4/hubs/${hubId}`, {
          headers: {
            Authorization: `Bearer ${env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const hubData = await res.json();
          const organizerId = hubData.organizer_id;
          if (organizerId) {
            const orgSnapshot = await firestore.collection('guild_settings')
              .where('faceitHubId', '==', organizerId)
              .get();
            
            orgSnapshot.forEach(doc => {
              if (!ids.includes(doc.id)) ids.push(doc.id);
            });

            if (ids.length > 0) {
              hubIdToGuildIdsCache.set(hubId, ids);
              return ids;
            }
          }
        }
      }

      return [];
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
    if (!matchId || typeof matchId !== 'string') {
      logger.warn('removeActiveMatch ignorado: matchId no es válido o está vacío.');
      return;
    }
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

  // --- Historial de Partidas ---
  async addMatchToHistory(matchId, matchData, winner, scoreA, scoreB, faction1Roster = [], faction2Roster = [], guildId = null, status = 'finished') {
    if (!matchId || typeof matchId !== 'string') {
      logger.warn('addMatchToHistory ignorado: matchId no es válido o está vacío.');
      return;
    }
    try {
      const docRef = firestore.collection(MATCHES_HISTORY_COLLECTION).doc(matchId);
      const existingDoc = await docRef.get();

      const formatRoster = (roster) => {
        if (!Array.isArray(roster)) return [];
        return roster.map(p => ({
          id: p.player_id || p.id || p.guid || null,
          nickname: p.nickname || p.name || p.username || 'Jugador',
          discord_id: p.discord_id || p.discordId || null
        }));
      };

      const f1Roster = formatRoster(faction1Roster && faction1Roster.length > 0 ? faction1Roster : matchData.teams?.faction1?.roster || matchData.faction1_roster);
      const f2Roster = formatRoster(faction2Roster && faction2Roster.length > 0 ? faction2Roster : matchData.teams?.faction2?.roster || matchData.faction2_roster);

      const mapPick = matchData.voting?.map?.pick?.[0] || matchData.map || 'Desconocido';
      const locPick = matchData.voting?.location?.pick?.[0] || matchData.location || 'Desconocido';

      const matchObj = {
        id: matchId,
        entity_custom_name: matchData.entity_custom_name || matchData.competition_name || 'Club',
        game: matchData.game || 'cs2',
        map: mapPick,
        location: locPick,
        faction1_name: matchData.teams?.faction1?.name || matchData.faction1_name || 'Equipo A',
        faction2_name: matchData.teams?.faction2?.name || matchData.faction2_name || 'Equipo B',
        faction1_score: scoreA !== undefined && scoreA !== null ? scoreA : (matchData.faction1_score || 0),
        faction2_score: scoreB !== undefined && scoreB !== null ? scoreB : (matchData.faction2_score || 0),
        winner: winner || matchData.winner || 'TBD',
        status: status || matchData.status || 'finished',
        queue_id: matchData.queue_id || null,
        queue_name: matchData.queue_name || null,
        faction1_roster: f1Roster,
        faction2_roster: f2Roster,
        guild_id: guildId || matchData.guild_id || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (!existingDoc.exists) {
        matchObj.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await docRef.set(matchObj, { merge: true });
      logger.success(`Partida ${matchId} [${status}] guardada/actualizada en historial de Firestore.`);
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

  async deleteMatchFromHistory(matchId) {
    if (!matchId || typeof matchId !== 'string') return false;
    try {
      await firestore.collection(MATCHES_HISTORY_COLLECTION).doc(matchId).delete();
      logger.success(`Partida ${matchId} eliminada del historial de Firestore.`);
      return true;
    } catch (error) {
      logger.error(`Error al eliminar partida ${matchId} del historial de Firestore:`, error);
      return false;
    }
  },

  async getActiveMatch(matchId) {
    if (!matchId || typeof matchId !== 'string') return null;
    try {
      await ensureActiveMatchesCache();
      return activeMatchesCacheMap.get(matchId) || null;
    } catch (error) {
      logger.error('Error al obtener partida activa de Firestore:', error);
      return null;
    }
  },

  async getActiveMatches(forceRefresh = false) {
    try {
      await ensureActiveMatchesCache(forceRefresh);
      return Array.from(activeMatchesCacheMap.values());
    } catch (error) {
      logger.error('Error al obtener partidas activas de Firestore:', error);
      return [];
    }
  },

  // --- Configuración del Panel Fijo ---
  async getPanelMessageConfig(guildId) {
    try {
      const docName = guildId ? `panel_${guildId}` : 'panel';
      const doc = await firestore.collection(CONFIG_COLLECTION).doc(docName).get();
      if (doc.exists) return doc.data();
      return null;
    } catch (error) {
      logger.error('Error al obtener configuración del panel:', error);
      return null;
    }
  },

  async setPanelMessageConfig(messageId, channelId, guildId) {
    try {
      const docName = guildId ? `panel_${guildId}` : 'panel';
      await firestore.collection(CONFIG_COLLECTION).doc(docName).set({
        messageId,
        channelId,
        guildId: guildId || null,
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

  async getHubBansCache(hubId) {
    try {
      const snapshot = await firestore.collection('hub_bans_cache').where('hubId', '==', hubId).get();
      const bans = [];
      snapshot.forEach(doc => {
        bans.push({ id: doc.id, ...doc.data() });
      });
      return bans;
    } catch (err) {
      logger.error('Error al obtener cache de baneos:', err);
      return [];
    }
  },

  async addHubBanToCache(hubId, userId, banData) {
    try {
      await firestore.collection('hub_bans_cache').doc(`${hubId}_${userId}`).set({
        hubId,
        userId,
        ...banData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (err) {
      logger.error('Error al agregar baneo a cache:', err);
      return false;
    }
  },

  async removeHubBanFromCache(hubId, userId) {
    try {
      await firestore.collection('hub_bans_cache').doc(`${hubId}_${userId}`).delete();
      return true;
    } catch (err) {
      logger.error('Error al eliminar baneo de cache:', err);
      return false;
    }
  },

  invalidateNicknameMapCache() {
    nicknameToDiscordMapCache = null;
    nicknameToDiscordMapLastFetch = 0;
  },

  // --- Gestión de Saldos / Billetera (Yape / Apuestas) ---
  async getUserBalance(discordId, guildId = null) {
    if (!discordId) return 0;
    try {
      const user = await this.getFullUser(discordId, guildId);
      if (user && user.wallet_balance !== undefined) {
        return Number(user.wallet_balance) || 0;
      }
      return 0;
    } catch (err) {
      logger.error(`Error al obtener balance de ${discordId}:`, err);
      return 0;
    }
  },

  async updateUserBalance(discordId, delta, guildId = null, reason = '') {
    if (!discordId) return 0;
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const doc = await userRef.get();
      let newBalance = 0;
      if (doc.exists) {
        const currentBalance = Number(doc.data().wallet_balance || 0);
        newBalance = Math.max(0, parseFloat((currentBalance + Number(delta)).toFixed(2)));
        await userRef.update({
          wallet_balance: newBalance,
          last_balance_update: Date.now(),
          last_balance_reason: reason
        });
      } else {
        newBalance = Math.max(0, parseFloat(Number(delta).toFixed(2)));
        await userRef.set({
          discordId,
          guild_id: guildId || null,
          wallet_balance: newBalance,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          last_balance_update: Date.now(),
          last_balance_reason: reason
        });
      }
      return newBalance;
    } catch (err) {
      logger.error(`Error al actualizar balance de ${discordId}:`, err);
      throw err;
    }
  },

  async setUserBalance(discordId, amount, guildId = null, reason = '') {
    if (!discordId) return 0;
    try {
      const docId = guildId ? `${guildId}_${discordId}` : discordId;
      const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
      const newBalance = Math.max(0, parseFloat(Number(amount).toFixed(2)));
      await userRef.set({
        discordId,
        guild_id: guildId || null,
        wallet_balance: newBalance,
        last_balance_update: Date.now(),
        last_balance_reason: reason
      }, { merge: true });
      return newBalance;
    } catch (err) {
      logger.error(`Error al establecer balance de ${discordId}:`, err);
      throw err;
    }
  },

  async recordCulqiCharge(chargeId, discordId, amount, details = {}) {
    try {
      const chargeRef = firestore.collection('culqi_charges').doc(chargeId);
      const doc = await chargeRef.get();
      if (doc.exists && doc.data()?.credited) {
        return { alreadyProcessed: true, charge: doc.data() };
      }
      await chargeRef.set({
        chargeId,
        discordId,
        amount,
        credited: true,
        details,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return { alreadyProcessed: false };
    } catch (err) {
      logger.error(`Error al registrar cargo de Culqi ${chargeId}:`, err);
      return { alreadyProcessed: false };
    }
  }
};

function getDefaultSettings() {
  return {
    // Canales
    discordLinkChannelId: '',
    discordMatchesChannelId: '',
    discordMixtonChannelId: '',
    discordRolesChannelId: '',
    discordStatusChannelId: '',
    discordWaitingRoomChannelId: '',
    discordAdminAlertsChannelId: '',
    discordSupportChannelId: '',
    discordMusicChannelId: '',
    discordSanctionsChannelId: '',
    // Feature flags
    autoWelcomeDm: true,
    autoRoleSync: true,
    autoNickSync: true,
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
    adminRoleId: '',
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
