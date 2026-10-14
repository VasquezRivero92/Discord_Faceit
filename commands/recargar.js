import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  MessageFlags, 
  EmbedBuilder 
} from 'discord.js';
import { culqiService } from '../services/culqiService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('recargar')
  .setDescription('Recarga saldo para tus mixtones y apuestas de Faceit usando Yape')
  .addNumberOption(opt => 
    opt.setName('monto')
      .setDescription('Monto en Soles (PEN) que deseas recargar (Mínimo S/ 1.00)')
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const defaultAmount = interaction.options.getNumber('monto');

  const modal = new ModalBuilder()
    .setCustomId('recargar_yape_modal')
    .setTitle('Recargar Saldo con Yape');

  const amountInput = new TextInputBuilder()
    .setCustomId('monto_input')
    .setLabel('Monto en Soles (PEN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: 5.00 o 10.00')
    .setValue(defaultAmount ? defaultAmount.toString() : '5.00')
    .setMinLength(1)
    .setMaxLength(6)
    .setRequired(true);

  const phoneInput = new TextInputBuilder()
    .setCustomId('celular_input')
    .setLabel('Número de celular Yape (9 dígitos)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: 987654321')
    .setMinLength(9)
    .setMaxLength(9)
    .setRequired(true);

  const otpInput = new TextInputBuilder()
    .setCustomId('otp_input')
    .setLabel('Código de aprobación Yape (6 dígitos)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Código de 6 dígitos desde tu app de Yape')
    .setMinLength(6)
    .setMaxLength(6)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(phoneInput),
    new ActionRowBuilder().addComponents(otpInput)
  );

  await interaction.showModal(modal);
}

/**
 * Procesa la respuesta del modal de recarga Yape
 */
export async function handleRecargaModalSubmit(interaction, db) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const amountStr = interaction.fields.getTextInputValue('monto_input');
  const phone = interaction.fields.getTextInputValue('celular_input');
  const otp = interaction.fields.getTextInputValue('otp_input');

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 1) {
    return interaction.editReply({
      content: '❌ El monto ingresado no es válido. El monto mínimo de recarga es S/ 1.00.'
    });
  }

  try {
    const result = await culqiService.processYapeRecharge({
      discordId: interaction.user.id,
      phoneNumber: phone,
      otp: otp,
      amount: amount,
      nickname: interaction.member?.displayName || interaction.user.username,
      guildId: interaction.guildId,
      db
    });

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ ¡Recarga Exitosa con Yape!')
      .setColor(0x742284) // Color morado característico de Yape
      .setDescription(`Se ha procesado tu pago de forma segura a través de **Culqi** y acreditado a tu cuenta.`)
      .addFields(
        { name: '💵 Monto Recargado', value: `S/ ${result.amount.toFixed(2)}`, inline: true },
        { name: '💰 Nuevo Saldo', value: `S/ ${result.newBalance.toFixed(2)}`, inline: true },
        { name: '🧾 Referencia de Pago', value: `\`${result.chargeId}\``, inline: false }
      )
      .setFooter({ text: 'Ya puedes participar en partidas con apuesta en Mixton Arena' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (err) {
    logger.error('Error al procesar recarga con Yape en Discord:', err);
    await interaction.editReply({
      content: `❌ **Error al procesar el pago con Yape:**\n> ${err.message || 'No se pudo autorizar la transacción.'}\n\n*Asegúrate de generar un nuevo código de aprobación en tu app Yape e intenta nuevamente.*`
    });
  }
}
