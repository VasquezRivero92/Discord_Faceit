import { culqiService } from '../services/culqiService.js';
import { logger } from '../utils/logger.js';

/**
 * Controlador para recibir eventos POST desde el Webhook de Culqi
 */
export async function handleCulqiWebhook(body, client, db) {
  try {
    const result = await culqiService.handleWebhookEvent(body, db);

    if (result.processed && !result.alreadyProcessed && result.discordId) {
      // Intentar notificar al usuario por Discord DM si el bot está conectado
      try {
        const user = await client.users.fetch(result.discordId).catch(() => null);
        if (user) {
          await user.send({
            content: `🎉 **¡Tu recarga con Yape ha sido procesada con éxito!**\n💵 **Monto acreditado:** S/ ${result.amount.toFixed(2)}\n💰 **Nuevo saldo total:** S/ ${result.newBalance.toFixed(2)}\n*Referencia de pago: \`${result.chargeId}\`*`
          }).catch(() => {});
        }
      } catch (dmErr) {
        logger.warn(`No se pudo enviar DM a ${result.discordId}: ${dmErr.message}`);
      }
    }

    return result;
  } catch (err) {
    logger.error('Error al procesar webhook de Culqi:', err);
    throw err;
  }
}
