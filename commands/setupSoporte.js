import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup_soporte')
  .setDescription('Crea el panel de soporte para llamar administradores')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, db) {
  if (!(await isFeatureEnabled('adminCallNotifications', interaction.guildId))) {
    return interaction.reply({ content: '❌ La función de llamada a admin está desactivada.', ephemeral: true });
  }

  const templates = await db.getMessageTemplates();
  const title = templates.supportTitle || '🚨 Soporte y Llamado de Admin';
  const description = templates.supportDescription ||
    '¿Tienes algún problema en tu partida activa de Faceit?\n\n' +
    'Presiona el botón de abajo para solicitar la asistencia de un administrador del staff.\n\n' +
    '⚠️ **Requisitos y Notas Importantes**:\n' +
    '- Debes tener tu cuenta de Faceit vinculada con el bot (usa `/verificar_fc` si aún no lo has hecho).\n' +
    '- Solo funcionará si te encuentras actualmente en una **partida activa** de Faceit en este servidor/club.\n' +
    '- Al presionar el botón, se enviará una notificación con el enlace a tu partida al equipo de soporte.';
  const colorStr = templates.supportColor || '#FF0000';
  let color = parseInt(colorStr.replace('#', '0x'), 16);
  if (isNaN(color)) color = 0xFF0000;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: 'Sistema de Soporte de Faceit' })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('llamar_admin_btn')
    .setLabel('Llamar Administrador')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🚨');

  const row = new ActionRowBuilder().addComponents(button);

  try {
    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    logger.error(`Error al crear el panel de soporte: ${err.message}`);
  }
}
