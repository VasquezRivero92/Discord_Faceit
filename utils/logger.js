/**
 * Logger centralizado con niveles.
 * Opcional: enviar logs críticos a un canal de Discord.
 */
export const logger = {
  info: (...args) => console.log(`[INFO] ${new Date().toISOString()}`, ...args),
  warn: (...args) => console.warn(`[WARN] ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
  success: (...args) => console.log(`[OK] ${new Date().toISOString()}`, ...args),
};

let _logChannel = null;

export async function setLogChannel(channel) {
  _logChannel = channel;
}

export async function logToDiscord(level, message) {
  if (!_logChannel) return;
  try {
    const emoji = { info: 'ℹ️', warn: '⚠️', error: '❌', success: '✅' }[level] || '📝';
    await _logChannel.send(`${emoji} \`[${level.toUpperCase()}]\` ${message}`);
  } catch (e) {
    console.error('Error enviando log a Discord:', e.message);
  }
}
