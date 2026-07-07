import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fetchLeaderboard } from '../services/faceitApi.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfigForGuild } from '../config/index.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Muestra el ranking del Club de Faceit de la season actual');

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_leaderboard', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const config = await getEffectiveConfigForGuild(interaction.guildId);
    const leaderboardId = config.faceitLeaderboardId || config.faceitHubId;

    if (!leaderboardId || leaderboardId.startsWith('ID_')) {
      return interaction.editReply('❌ El administrador no ha configurado el ID de Leaderboard o Hub de Faceit.');
    }

    // 1. Obtener la tabla del Club/Hub de Faceit
    const leaderboardData = await fetchLeaderboard(leaderboardId);
    if (!leaderboardData || !leaderboardData.items || leaderboardData.items.length === 0) {
      return interaction.editReply('⚠️ No se encontraron datos para el leaderboard de Faceit actual en este Hub/Club.');
    }

    // 2. Mapear nicknames de Faceit a IDs de Discord locales desde Firestore
    const nicknameToDiscord = await db.getNicknameToDiscordMap(interaction.guildId);

    // 3. Crear las líneas de ranking
    const lines = leaderboardData.items.slice(0, 10).map((item, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const player = item.player || {};
      const discordId = nicknameToDiscord[player.nickname?.toLowerCase()];
      const discordMention = discordId ? `<@${discordId}>` : `*(Sin vincular)*`;
      const level = player.skill_level ? `(Lvl ${player.skill_level})` : '';
      const points = item.points !== undefined ? `${item.points} pts` : '';
      return `${medal} ${discordMention} — **${player.nickname}** ${level} [${points}]`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Leaderboard del Club — Season ${leaderboardData.leaderboard?.season || 'Actual'}`)
      .setDescription(`Ranking de los mejores jugadores del Hub en la season actual.\n\n${lines.join('\n') || '*Sin datos*'}`)
      .setColor(0xFFD700)
      .setTimestamp()
      .setFooter({ text: 'Sincronizado con Faceit API' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error en /leaderboard:', error);
    await interaction.editReply('❌ Ocurrió un error al obtener el leaderboard del Club.');
  }
}
