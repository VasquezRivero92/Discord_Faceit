import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  MessageFlags, 
  EmbedBuilder
} from 'discord.js';
import { yapeTransactionService } from '../services/yapeTransactionService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('recargar')
  .setDescription('Acredita tu depósito Yape con monto y código de aprobación');

export async function execute(interaction, db) {
  const modal = new ModalBuilder()
    .setCustomId('recargar_yape_modal')
    .setTitle('Recargar Saldo con Yape');

  const amountInput = new TextInputBuilder()
    .setCustomId('monto_input')
    .setLabel('Monto enviado por Yape (S/)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: 5.00')
    .setMinLength(1)
    .setMaxLength(8)
    .setRequired(true);

  const phoneInput = new TextInputBuilder()
    .setCustomId('celular_input')
    .setLabel('Celular Yape para recibir premios (9 dígitos)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: 987654321')
    .setMinLength(9)
    .setMaxLength(9)
    .setRequired(true);

  const operationInput = new TextInputBuilder()
    .setCustomId('operacion_input')
    .setLabel('Código de aprobación Yape')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: 25381004')
    .setMinLength(4)
    .setMaxLength(64)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(phoneInput),
    new ActionRowBuilder().addComponents(operationInput)
  );

  await interaction.showModal(modal);
}

/**
 * Procesa la respuesta del modal de recarga Yape
 */
export async function handleRecargaModalSubmit(interaction, db) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const amount = Number.parseFloat(interaction.fields.getTextInputValue('monto_input')?.trim());
  const phoneNumber = interaction.fields.getTextInputValue('celular_input')?.trim();
  const operationNumber = interaction.fields.getTextInputValue('operacion_input')?.trim();
  const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
  if (!Number.isFinite(amount) || amount < 1) {
    return interaction.editReply({ content: '❌ Debes ingresar un monto válido, mínimo S/ 1.00.' });
  }
  if (cleanPhone.length !== 9) {
    return interaction.editReply({ content: '❌ Ingresa un celular Yape válido de 9 dígitos para recibir premios.' });
  }
  if (!db.consumeYapeVerificationAttempt(interaction.user.id, interaction.guildId)) {
    return interaction.editReply({ content: '❌ Demasiados intentos de recarga. Espera unos minutos antes de volver a intentar.' });
  }

  try {
    let payment;
    try {
      payment = await yapeTransactionService.findIncomingTransaction({
        db,
        operationNumber,
        expectedAmount: amount
      });
    } catch (err) {
      const isMissingOperation = String(err.message || '').startsWith('No encontramos ese depósito');
      if (!isMissingOperation) throw err;

      const reservation = await db.reserveYapeOperation({
        operationNumber,
        discordId: interaction.user.id,
        guildId: interaction.guildId,
        amount,
        phoneNumber: cleanPhone,
        auditContext: { source: 'discord' }
      });
      if (reservation.rateLimited) {
        return interaction.editReply({ content: '❌ Alcanzaste el límite de códigos pendientes. Espera 10 minutos antes de intentar otro código.' });
      }
      if (!reservation.reserved) {
        const message = reservation.alreadyProcessed
          ? (reservation.belongsToUser
            ? '❌ Esta operación ya fue acreditada anteriormente en tu billetera.'
            : '❌ Esta operación ya fue utilizada para acreditar otra cuenta.')
          : (reservation.belongsToUser
            ? '⏳ Este código de aprobación ya está en proceso de verificación para tu cuenta.'
            : '❌ Este código de aprobación ya está siendo usado por otra cuenta.');
        return interaction.editReply({ content: message });
      }

      return interaction.editReply({
        content: '⏳ **Aún no vemos tu depósito.**\n> El código quedó reservado para tu cuenta. Vuelve a intentar en unos segundos; no se entregará a otro usuario.'
      });
    }
    const result = await db.creditYapeOperation({
      operationNumber: payment.operationNumber,
      discordId: interaction.user.id,
      guildId: interaction.guildId,
      amount: payment.amount,
      phoneNumber: cleanPhone,
      details: { receivedAt: payment.receivedAt },
      auditContext: { source: 'discord' }
    });

    if (result.alreadyProcessed) {
      const message = result.belongsToUser
        ? '❌ Esta operación ya fue acreditada anteriormente en tu billetera.'
        : '❌ Esta operación ya fue utilizada para acreditar otra cuenta.';
      return interaction.editReply({ content: message });
    }
    if (result.alreadyReserved) {
      return interaction.editReply({ content: '❌ Esta operación ya está siendo usada por otra cuenta.' });
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ ¡Recarga Exitosa con Yape!')
      .setColor(0x742284) // Color morado característico de Yape
      .setDescription(`Se ha procesado tu pago de forma exitosa y acreditado a tu saldo.`)
      .addFields(
        { name: '💵 Monto Recargado', value: `S/ ${payment.amount.toFixed(2)}`, inline: true },
        { name: '💰 Nuevo Saldo', value: `S/ ${result.newBalance.toFixed(2)}`, inline: true },
        { name: '📱 Celular para premios', value: `\`${cleanPhone.slice(0, 3)}***${cleanPhone.slice(-3)}\``, inline: true },
        { name: '🧾 Código de aprobación', value: `\`${payment.operationNumber}\``, inline: false }
      )
      .setFooter({ text: 'Ya puedes participar en partidas con apuesta en Mixton Arena' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (err) {
    logger.error('Error al procesar recarga con Yape en Discord:', err);
    const isMissingOperation = String(err.message || '').startsWith('No encontramos ese depósito');
    await interaction.editReply({
      content: isMissingOperation
        ? '❌ **No encontramos ese código de aprobación.**\n> Vuelve a verificar el código en tu comprobante Yape e inténtalo nuevamente.'
        : `❌ **No se pudo acreditar tu depósito Yape:**\n> ${err.message || 'No se pudo verificar la operación.'}`
    });
  }
}
