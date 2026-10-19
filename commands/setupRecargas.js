import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup_recargas')
  .setDescription('Publica el panel interactivo de recargas con Yape en este canal')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, db) {
  const embed = new EmbedBuilder()
    .setTitle('💰 Billetera y Recargas Mixton Arena')
    .setDescription(
      '¡Recarga saldo a tu cuenta de forma instantánea usando **Yape** para participar en las partidas y cuotas de apuestas de Mixton Arena!\n\n' +
      '**📌 ¿Cómo recargar?**\n' +
      '1️⃣ Realiza tu Yape al número indicado por la administración.\n' +
      '2️⃣ Presiona el botón e ingresa el monto y el código de aprobación de tu comprobante.\n' +
      '3️⃣ Verificaremos que ambos datos coincidan con el depósito registrado y acreditaremos el monto a tu saldo.\n\n' +
      '🔒 *Nunca te pediremos códigos de aprobación de Yape.*'
    )
    .setColor(0x742284) // Morado característico de Yape
    .setFooter({ text: 'Sistema de Pagos y Billetera Mixton • Yape Oficial' })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('iniciar_recarga_btn')
    .setLabel('Recargar con Yape')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('💜');

  const row = new ActionRowBuilder().addComponents(button);

  try {
    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    try {
      await msg.pin();
    } catch (pinErr) {
      logger.warn('No se pudo anclar el mensaje de recargas:', pinErr.message);
    }

    // Guardar este canal como el canal oficial de recargas en Firestore para esta guild
    if (interaction.guildId) {
      const guildSettings = await db.getGuildSettings(interaction.guildId).catch(() => ({}));
      guildSettings.discordRechargeChannelId = interaction.channelId;
      await db.setGuildSettings(interaction.guildId, guildSettings);
      logger.success(`Canal de recargas configurado para guild ${interaction.guildId}: ${interaction.channelId}`);
    }
  } catch (err) {
    logger.error('Error al ejecutar /setup_recargas:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ Error al crear el panel: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}
