import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { mixtonEvents } from '../routes/lobby.js';

export const data = new SlashCommandBuilder()
  .setName('mixton_listo')
  .setDescription('Muestra que estás disponible y listo para ser elegido en las partidas de mixton.');

export async function execute(interaction, db) {
  // Asegurar diferir respuesta de inmediato para evitar el timeout de 3 segundos de Discord
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
  }

  const sendResponse = async (payload) => {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload).catch(err => logger.warn('Error en editReply mixton_listo:', err.message));
    }
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(err => logger.warn('Error en reply mixton_listo:', err.message));
  };

  const isEnabled = await isFeatureEnabled('command_mixton_listo', interaction.guildId).catch(() => true);
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
        content: '❌ No estás verificado. Debes vincular tu cuenta de Faceit usando el comando `/verificar_fc <nickname>` o desde la web antes de unirte al mixton.'
      });
    }

    // Actualizar datos de Discord en segundo plano si están disponibles
    if (interaction.user) {
      db.updateDiscordDetailsInDb(discordId, {
        username: interaction.user.username,
        displayName: interaction.user.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL()
      }, interaction.guildId).catch(() => {});
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

    await sendResponse({ embeds: [embed] });

  } catch (error) {
    logger.error('Error en el comando /mixton_listo:', error);
    await sendResponse({
      content: `❌ Ocurrió un error al intentar cambiar tu estado a listo: ${error.message}`
    });
  }
}
