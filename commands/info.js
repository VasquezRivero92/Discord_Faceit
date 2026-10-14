import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { env } from '../config/index.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Muestra información del servidor y el club de Faceit');

export async function execute(interaction) {
  const isEnabled = await isFeatureEnabled('command_info', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', flags: MessageFlags.Ephemeral });
  }

  const clubUrl = 'https://www.faceit.com/es/club/e72c25e6-74e5-415b-97da-e541296ff1db/queue/9ccf9665-c715-4938-8edd-1ab17bc7d263/chat';
  const linkChannel = env.DISCORD_LINK_CHANNEL_ID && !env.DISCORD_LINK_CHANNEL_ID.startsWith('ID_')
    ? `<#${env.DISCORD_LINK_CHANNEL_ID}>` : 'Canal de vinculación';

  const embed = new EmbedBuilder()
    .setTitle('🎮 Información del Servidor y Club Faceit')
    .setDescription('Guía rápida para unirte a nuestra comunidad')
    .setColor(0x5865F2)
    .addFields(
      { name: '🔗 Club Faceit', value: `[Haz clic para unirte](${clubUrl})`, inline: true },
      { name: '📝 Vinculación', value: `Usa \`/verificar_fc\` en ${linkChannel}`, inline: true },
      { name: '🏆 Leaderboard', value: '\`/leaderboard\` para ver el ranking', inline: true },
      { name: '📊 Stats', value: '\`/stats <nickname>\` para ver estadísticas', inline: true }
    )
    .setFooter({ text: 'Bot de Faceit Hub' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
