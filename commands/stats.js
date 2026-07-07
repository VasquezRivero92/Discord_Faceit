import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fetchFaceitPlayer, fetchFaceitStats, fetchPlayerHistory } from '../services/faceitApi.js';
import { getPlayerSkillLevel } from '../services/roles.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Muestra estadísticas de un jugador de Faceit')
  .addStringOption(option =>
    option.setName('nickname')
      .setDescription('Nickname exacto en Faceit')
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_stats', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  const nickname = interaction.options.getString('nickname');
  await interaction.deferReply({ ephemeral: false });

  try {
    const player = await fetchFaceitPlayer(nickname);
    const level = getPlayerSkillLevel(player);
    const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;

    const stats = await fetchFaceitStats(player.player_id);
    const history = await fetchPlayerHistory(player.player_id, 'cs2', 10);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Estadísticas de ${player.nickname}`)
      .setURL(`https://www.faceit.com/en/players/${player.nickname}`)
      .setColor(LEVEL_COLORS[level] || 0xFFFFFF)
      .setThumbnail(player.avatar || null)
      .addFields(
        { name: 'Nivel Faceit', value: `Level ${level || '?'}`, inline: true },
        { name: 'ELO', value: `${elo}`, inline: true },
        { name: 'País', value: `:flag_${player.country?.toLowerCase() || 'un'}:`, inline: true }
      );

    if (stats && stats.lifetime) {
      const lifetime = stats.lifetime;
      embed.addFields(
        { name: 'K/D', value: `${lifetime['Average K/D Ratio'] || 'N/D'}`, inline: true },
        { name: 'Win Rate', value: `${lifetime['Win Rate %'] || 'N/D'}%`, inline: true },
        { name: 'Partidas', value: `${lifetime['Matches'] || 'N/D'}`, inline: true }
      );
    }

    if (history && history.items) {
      const lastResults = history.items.slice(0, 5).map(m => {
        const faction1Players = m.teams?.faction1?.players || [];
        const isFaction1 = faction1Players.some(p => p.player_id === player.player_id);
        const playerFaction = isFaction1 ? 'faction1' : 'faction2';
        const won = m.results?.winner === playerFaction;
        return won ? '🟢' : '🔴';
      }).join(' ');
      embed.addFields({ name: 'Últimas 5', value: lastResults || 'N/D', inline: false });
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error en /stats:', error);
    if (error.message === 'PLAYER_NOT_FOUND') {
      return interaction.editReply(`❌ No se encontró el jugador **${nickname}** en Faceit.`);
    }
    await interaction.editReply('❌ Error al obtener estadísticas.');
  }
}

const LEVEL_COLORS = {
  1: 0x8C8C8C, 2: 0x8C8C8C, 3: 0x8C8C8C,
  4: 0x15C253, 5: 0x15C253, 6: 0x15C253, 7: 0x15C253,
  8: 0xFF9E00, 9: 0xFF9E00, 10: 0xFF3E3E,
};
