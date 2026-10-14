import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

const CULQI_API_BASE = 'https://api.culqi.com/v2';

/**
 * Servicio de integración con la API de Culqi (Cobros automáticos con Yape)
 */
export const culqiService = {
  /**
   * Genera un token de Yape usando el número de celular y el código OTP de 6 dígitos.
   * @param {string} phoneNumber - Número de 9 dígitos de Yape
   * @param {string} otp - Código de aprobación de 6 dígitos generado en la app de Yape
   */
  async createYapeToken(phoneNumber, otp) {
    const publicKey = env.CULQI_PUBLIC_KEY || process.env.CULQI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('CULQI_PUBLIC_KEY no está configurada en las variables de entorno.');
    }

    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    const cleanOtp = String(otp).replace(/\D/g, '');

    if (cleanPhone.length !== 9) {
      throw new Error('El número de celular debe tener 9 dígitos.');
    }
    if (cleanOtp.length !== 6) {
      throw new Error('El código de aprobación de Yape debe tener exactamente 6 dígitos.');
    }

    try {
      const response = await fetch(`${CULQI_API_BASE}/tokens/yape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: cleanPhone,
          otp: cleanOtp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.user_message || data.merchant_message || data.message || 'Error al validar token de Yape en Culqi.';
        logger.error('Error al crear token de Yape en Culqi:', data);
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      logger.error('Error en createYapeToken:', err.message);
      throw err;
    }
  },

  /**
   * Ejecuta un cargo con la API de Culqi usando el token de Yape generado.
   */
  async createCharge({ amount, sourceId, email, discordId, nickname, description }) {
    const secretKey = env.CULQI_SECRET_KEY || process.env.CULQI_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CULQI_SECRET_KEY no está configurada en las variables de entorno.');
    }

    const amountInCents = Math.round(Number(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      throw new Error('El monto a cobrar debe ser mayor a 0 soles.');
    }

    const payload = {
      amount: amountInCents,
      currency_code: 'PEN',
      email: email || `${discordId || 'usuario'}@discord.faceit`,
      source_id: sourceId,
      description: description || `Recarga de saldo Mixtones para ${nickname || discordId}`,
      metadata: {
        discord_id: discordId || '',
        nickname: nickname || '',
        type: 'wallet_recharge'
      }
    };

    try {
      const response = await fetch(`${CULQI_API_BASE}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.user_message || data.merchant_message || data.message || 'Error al procesar el cargo con Culqi.';
        logger.error('Error en createCharge de Culqi:', data);
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      logger.error('Error al ejecutar cargo en Culqi:', err.message);
      throw err;
    }
  },

  /**
   * Flujo completo: Tokeniza Yape y procesa el cobro inmediatamente.
   * Si es exitoso, acredita el saldo al usuario en Firestore de forma atómica.
   */
  async processYapeRecharge({ discordId, phoneNumber, otp, amount, email, nickname, guildId, db }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      throw new Error('El monto mínimo de recarga es S/ 1.00');
    }

    logger.info(`Iniciando recarga Yape Culqi: S/ ${numAmount.toFixed(2)} para Discord ID ${discordId} (Cel: ${phoneNumber})`);

    // 1. Crear Token de Yape
    const token = await this.createYapeToken(phoneNumber, otp);
    if (!token?.id) {
      throw new Error('No se pudo generar el token de autorización de Yape.');
    }

    // 2. Crear Cargo en Culqi
    const charge = await this.createCharge({
      amount: numAmount,
      sourceId: token.id,
      email,
      discordId,
      nickname,
      description: `Recarga de saldo Mixton Arena (S/ ${numAmount.toFixed(2)})`
    });

    const isSuccessful = charge.outcome?.type === 'venta_exitosa' || charge.id;
    if (!isSuccessful) {
      throw new Error(charge.outcome?.merchant_message || 'El pago no fue autorizado por Yape.');
    }

    // 3. Registrar el cargo e impedir cobro doble (idempotencia)
    const { alreadyProcessed } = await db.recordCulqiCharge(charge.id, discordId, numAmount, {
      phoneNumber,
      nickname,
      guildId,
      chargeDate: Date.now()
    });

    let newBalance = await db.getUserBalance(discordId, guildId);

    if (!alreadyProcessed) {
      // 4. Acreditar saldo en la base de datos
      newBalance = await db.updateUserBalance(
        discordId, 
        numAmount, 
        guildId, 
        `Recarga Yape confirmada por Culqi (ID: ${charge.id})`
      );
      logger.success(`✅ Saldo acreditado con éxito a ${discordId}: +S/ ${numAmount.toFixed(2)} (Nuevo saldo: S/ ${newBalance.toFixed(2)})`);
    }

    return {
      success: true,
      chargeId: charge.id,
      amount: numAmount,
      newBalance,
      referenceCode: charge.reference_code || charge.id
    };
  },

  /**
   * Procesa eventos entrantes del Webhook de Culqi.
   */
  async handleWebhookEvent(event, db) {
    if (!event) return { processed: false, reason: 'Payload vacío' };

    let eventData = event.data;
    if (typeof eventData === 'string') {
      try {
        eventData = JSON.parse(eventData);
      } catch {
        // mantener como string
      }
    }

    const eventType = event.type;
    logger.info(`Webhook Culqi recibido. Tipo: ${eventType}`);

    if (eventType === 'charge.creation.succeeded') {
      const charge = eventData;
      const chargeId = charge?.id;
      const amountInCents = Number(charge?.amount || 0);
      const amountInSoles = parseFloat((amountInCents / 100).toFixed(2));
      const discordId = charge?.metadata?.discord_id;

      if (!chargeId || !discordId || amountInSoles <= 0) {
        logger.warn('Webhook Culqi charge sin metadata.discord_id o monto inválido:', charge);
        return { processed: false, reason: 'Faltan datos obligatorios' };
      }

      // Validar si ya fue procesado de forma síncrona
      const { alreadyProcessed } = await db.recordCulqiCharge(chargeId, discordId, amountInSoles, {
        source: 'webhook',
        charge
      });

      if (alreadyProcessed) {
        logger.info(`Webhook Culqi: El cargo ${chargeId} ya había sido acreditado previamente.`);
        return { processed: true, alreadyProcessed: true, chargeId };
      }

      const newBalance = await db.updateUserBalance(
        discordId,
        amountInSoles,
        null,
        `Recarga Yape vía Webhook Culqi (ID: ${chargeId})`
      );

      logger.success(`✅ Webhook Culqi procesado: +S/ ${amountInSoles.toFixed(2)} para usuario ${discordId}. Nuevo saldo: S/ ${newBalance.toFixed(2)}`);
      return { processed: true, alreadyProcessed: false, chargeId, discordId, amount: amountInSoles, newBalance };
    }

    return { processed: true, reason: `Evento ${eventType} no requiere acción de saldo` };
  }
};
