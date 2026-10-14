import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfigForGuild } from '../config/index.js';

export const data = new SlashCommandBuilder()
  .setName('desancionar')
  .setDescription('Levanta una sanción o baneo temporal de un usuario')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('El usuario de Discord a desancionar')
      .setRequired(true)
  );

export async function execute(interaction, db) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const targetUser = interaction.options.getUser('usuario');
  const guildId = interaction.guildId;
  const config = await getEffectiveConfigForGuild(guildId);
  const sanctionsChannelId = config.discordSanctionsChannelId;

  if (!sanctionsChannelId || sanctionsChannelId.startsWith('ID_')) {
    return interaction.editReply('❌ No está configurado el canal de sanciones en el bot.');
  }

  const channel = await interaction.guild.channels.fetch(sanctionsChannelId).catch(() => null);
  if (!channel) {
    return interaction.editReply('❌ No se encontró el canal de sanciones en este servidor.');
  }

  const hubId = config.faceitHubId || 'GENERAL';
  const unbanDate = new Date();
  const unixSeconds = Math.floor(unbanDate.getTime() / 1000);
  const hubAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

  const embed = new EmbedBuilder()
    .setTitle('✅ Sanción Levantada (Desbaneo)')
    .setDescription(`La sanción registrada para el jugador <@${targetUser.id}> ha sido levantada exitosamente.`)
    .setColor(0x00E676)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Jugador', value: `<@${targetUser.id}> (**${targetUser.username}**)`, inline: true },
      { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
      { name: '🕒 Fecha de Liberación', value: `<t:${unixSeconds}:F> (<t:${unixSeconds}:R>)`, inline: false }
    )
    .setFooter({ text: 'Sistema de Moderación Discord/FACEIT • Registro de Sanciones', iconURL: 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(err => {
    logger.error('Error al enviar embed de desanción:', err);
  });

  await db.removeHubBanFromCache(hubId, targetUser.id);
  await db.addLogEntry('info', `Sanción levantada para ${targetUser.tag}`, 'bot', guildId);

  return interaction.editReply({
    content: `✅ **Sanción levantada exitosamente** para <@${targetUser.id}> y publicada en <#${sanctionsChannelId}>.`
  });
}
