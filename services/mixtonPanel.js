import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfigForGuild } from '../config/index.js';

export async function updateMixtonReadyPanel(client, guildId, db) {
  try {
    const docRef = db._firestore.collection('faceit_config').doc(`mixton_ready_panel_${guildId || 'global'}`);
    const doc = await docRef.get();
    if (doc.exists) {
      const panelConfig = doc.data();
      if (panelConfig.channels) {
        for (const [channelId, messageId] of Object.entries(panelConfig.channels)) {
          try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) {
              const msg = await channel.messages.fetch(messageId).catch(() => null);
              if (msg) {
                await msg.delete().catch(() => {});
              }
            }
          } catch (e) {
            // Ignorar errores de borrado de mensaje
          }
        }
      }
      await docRef.delete().catch(() => {});
      logger.info(`Limpia del panel de mixton listo completada para guild ${guildId || 'global'}.`);
    }
  } catch (err) {
    logger.error('Error al limpiar panel mixton desactivado:', err);
  }
}
