import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { mixtonEvents } from '../routes/lobby.js';

export const data = new SlashCommandBuilder()
  .setName('mixton_listo')
  .setDescription('Muestra que estás disponible y listo para ser elegido en las partidas de mixton.');

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_mixton_listo', interaction.guildId).catch(() => true);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  const discordId = interaction.user.id;

  try {
    // Verificar si el usuario está registrado en la base de datos (verificado)
    const userData = await db.getFaceitIdByDiscordId(discordId, interaction.guildId);
    if (!userData || !userData.faceit_player_id) {
      return interaction.reply({
        content: '❌ No estás verificado. Debes vincular tu cuenta de Faceit usando el comando `/verificar_fc <nickname>` antes de unirte al mixton.',
        ephemeral: true
      });
    }

    // Actualizar el estado del usuario a listo para el mixton
    await db.setPlayerReadyStatus(discordId, true, interaction.guildId);

    mixtonEvents.emit('update', interaction.guildId);

    await db.addLogEntry('info', `El usuario ${interaction.user.tag} se marcó como LISTO para mixton`, 'bot');

    const embed = new EmbedBuilder()
      .setTitle('🎮 ¡Listo para el Mixton!')
      .setDescription(`Hola <@${discordId}>, te has marcado como **Disponible** para competir.\n\n` +
        `Ya apareces en la lista de la web y los capitanes podrán elegirte para sus equipos.\n` +
        `Si deseas salir, usa \`/mixton_no_listo\`.`)
      .setColor(0x15C253)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Competencias Mixton' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error en el comando /mixton_listo:', error);
    await interaction.reply({
      content: `❌ Ocurrió un error al intentar cambiar tu estado a listo: ${error.message}`,
      ephemeral: true
    });
  }
}
