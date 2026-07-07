import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { mixtonEvents } from '../routes/lobby.js';

export const data = new SlashCommandBuilder()
  .setName('mixton_no_listo')
  .setDescription('Quita tu perfil de la lista de listos para el mixton.');

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_mixton_no_listo', interaction.guildId).catch(() => true);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  const discordId = interaction.user.id;

  try {
    // Verificar si el usuario está registrado en la base de datos (verificado)
    const userData = await db.getFaceitIdByDiscordId(discordId, interaction.guildId);
    if (!userData || !userData.faceit_player_id) {
      return interaction.reply({
        content: '❌ No estás verificado. Este comando es solo para miembros registrados.',
        ephemeral: true
      });
    }

    // Actualizar el estado del usuario a no listo
    await db.setPlayerReadyStatus(discordId, false, interaction.guildId);

    mixtonEvents.emit('update', interaction.guildId);

    await db.addLogEntry('info', `El usuario ${interaction.user.tag} se marcó como NO LISTO para mixton`, 'bot');

    const embed = new EmbedBuilder()
      .setTitle('🎮 ¡Fuera del Mixton!')
      .setDescription(`Hola <@${discordId}>, te has marcado como **No Disponible**.\n\n` +
        `Ya no aparecerás en la lista de la web y no podrás ser elegido.\n` +
        `Usa \`/mixton_listo\` si quieres volver a estar disponible.`)
      .setColor(0xFF3E3E)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Competencias Mixton' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error en el comando /mixton_no_listo:', error);
    await interaction.reply({
      content: `❌ Ocurrió un error al intentar cambiar tu estado: ${error.message}`,
      ephemeral: true
    });
  }
}
