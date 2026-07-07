import { SlashCommandBuilder } from 'discord.js';
import { checkIsAdmin } from '../services/adminCheck.js';
import { removeAllFaceitRoles } from '../services/roles.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/index.js';
import { isFeatureEnabled, getSettings } from '../utils/featureFlags.js';

export const data = new SlashCommandBuilder()
  .setName('desvincular_fc')
  .setDescription('Desvincula a un usuario de su perfil de Faceit (Solo ADMIN)')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El usuario de Discord a desvincular')
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_desvincular', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  const settings = await getSettings().catch(() => ({}));
  const linkChannelId = settings.discordLinkChannelId || env.DISCORD_LINK_CHANNEL_ID;
  const isConfigured = linkChannelId && !linkChannelId.startsWith('ID_') && !linkChannelId.startsWith('ID-');

  if (!isConfigured) {
    return interaction.reply({
      content: '❌ El canal de vinculación no está configurado por el administrador.',
      ephemeral: true,
    });
  }

  const allowedChannels = linkChannelId.split(',').map(id => id.trim()).filter(Boolean);
  if (!allowedChannels.includes(interaction.channelId)) {
    const channelMentions = allowedChannels.map(id => `<#${id}>`).join(' o ');
    return interaction.reply({
      content: `❌ Este comando solo se puede usar en el canal de vinculación: ${channelMentions}.`,
      ephemeral: true,
    });
  }

  const member = interaction.member;

  const isAdmin = await checkIsAdmin(member, interaction.guild);
  if (!isAdmin) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar este comando. Se requiere el rol **ADMIN**.',
      ephemeral: true,
    });
  }

  const targetUser = interaction.options.getUser('usuario');
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  await interaction.deferReply({ ephemeral: false });

  try {
    await db.unlinkAccount(targetUser.id, interaction.guildId);
    await db.addLogEntry('warn', `El administrador ${interaction.user.tag} desvinculó la cuenta de ${targetUser.tag}`, 'bot');

    if (targetMember) {
      const removedCount = await removeAllFaceitRoles(targetMember, interaction.guild);
      if (removedCount > 0) {
        logger.info(`Roles de Faceit removidos para el usuario desvinculado: ${targetUser.tag}`);
      }
    }

    await interaction.editReply({
      content: `✅ El usuario <@${targetUser.id}> ha sido desvinculado de Faceit con éxito y sus roles asociados fueron removidos.`,
    });
  } catch (error) {
    logger.error('Error en el comando /desvincular_fc:', error);
    await interaction.editReply({
      content: `❌ Ocurrió un error al intentar desvincular al usuario: ${error.message}`,
    });
  }
}
