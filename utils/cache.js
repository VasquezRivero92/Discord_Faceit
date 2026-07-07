/**
 * Cache simple en memoria con TTL para jugadores de Faceit.
 */
const cache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const playerCache = {
  get(discordId) {
    const entry = cache.get(discordId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(discordId);
      return null;
    }
    return entry.value;
  },

  set(discordId, value, ttlMs = DEFAULT_TTL_MS) {
    cache.set(discordId, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  },

  delete(discordId) {
    cache.delete(discordId);
  },

  clear() {
    cache.clear();
  },
};
