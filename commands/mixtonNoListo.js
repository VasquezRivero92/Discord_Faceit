import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { mixtonEvents } from '../routes/lobby.js';

export const data = new SlashCommandBuilder()
  .setName('mixton_no_listo')
  .setDescription('Quita tu perfil de la lista de listos para el mixton.');

export async function execute(interaction, db) {
  // Asegurar diferir respuesta de inmediato para evitar el timeout de 3 segundos de Discord
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
  }

  const sendResponse = async (payload) => {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload).catch(err => logger.warn('Error en editReply mixton_no_listo:', err.message));
    }
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(err => logger.warn('Error en reply mixton_no_listo:', err.message));
  };

  const isEnabled = await isFeatureEnabled('command_mixton_no_listo', interaction.guildId).catch(() => true);
  if (isEnabled === false) {
    return sendResponse({ content: '❌ Este comando está desactivado por el administrador.' });
  }

  const discordId = interaction.user.id;

  try {
    // Verificar si el usuario está registrado en la base de datos (verificado)
    let userData = await db.getFaceitIdByDiscordId(discordId, interaction.guildId);
    if (!userData || !userData.faceit_player_id) {
      const fullUser = await db.getFullUser(discordId, interaction.guildId);
      if (fullUser && fullUser.faceit_player_id) {
        userData = fullUser;
      }
    }

    if (!userData || !userData.faceit_player_id) {
      return sendResponse({
        content: '❌ No estás verificado. Este comando es solo para miembros registrados.'
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

    await sendResponse({ embeds: [embed] });

  } catch (error) {
    logger.error('Error en el comando /mixton_no_listo:', error);
    await sendResponse({
      content: `❌ Ocurrió un error al intentar cambiar tu estado: ${error.message}`
    });
  }
}
