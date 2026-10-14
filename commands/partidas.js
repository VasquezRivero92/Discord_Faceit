import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('partidas')
  .setDescription('Muestra las partidas de Faceit que se encuentran activas en el servidor');

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_partidas', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  try {
    const allMatches = await db.getActiveMatches();
    const activeMatches = allMatches.filter(m => m.guild_id === interaction.guildId);

    const embed = new EmbedBuilder()
      .setTitle('🟢 Partidas de Faceit Activas')
      .setColor(0x00FF55)
      .setTimestamp()
      .setFooter({ text: 'Sincronizado con Faceit API' });

    if (activeMatches.length === 0) {
      embed.setDescription('No hay partidas activas en este momento.\n\n¡Únete a la cola del Club en Faceit para empezar a jugar! 🎮')
        .setColor(0x8C8C8C);
    } else {
      const descriptionLines = activeMatches.map((m, index) => {
        const timeStarted = `<t:${Math.floor(m.startedAt / 1000)}:R>`;
        const matchUrl = `https://www.faceit.com/en/cs2/room/${m.id}`;
        return `**${index + 1}. [${m.faction1_name} vs ${m.faction2_name}](${matchUrl})**\n` +
          `🗺️ Mapa: \`${m.map}\` | 📍 Servidor: \`${(m.location || 'N/A').toUpperCase()}\` | 🕒 Iniciada: ${timeStarted}\n`;
      });
      embed.setDescription(descriptionLines.join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error en el comando /partidas:', error);
    await interaction.editReply('❌ Ocurrió un error al obtener la lista de partidas activas.');
  }
}
