import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/index.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

/**
 * Carga todos los comandos desde la carpeta commands/
 * y devuelve un objeto { commands, commandMap }.
 */
export async function loadCommands() {
  const commands = [];
  const commandMap = new Map();

  const commandFiles = [
    await import('../commands/verificar.js'),
    await import('../commands/desvincular.js'),
    await import('../commands/leaderboard.js'),
    await import('../commands/stats.js'),
    await import('../commands/info.js'),
    await import('../commands/llamarAdmin.js'),
    await import('../commands/setupSoporte.js'),
    await import('../commands/sincronizar.js'),
    await import('../commands/partidas.js'),
    await import('../commands/crearSala.js'),
    await import('../commands/mixtonListo.js'),
    await import('../commands/mixtonNoListo.js'),
  ];

  for (const mod of commandFiles) {
    commands.push(mod.data.toJSON());
    commandMap.set(mod.data.name, mod.execute);
  }

  return { commands, commandMap };
}

export async function onInteractionCreate(interaction, db, commandMap) {
  if (interaction.isChatInputCommand()) {
    const handler = commandMap.get(interaction.commandName);
    if (!handler) {
      logger.warn(`Comando desconocido: ${interaction.commandName}`);
      return;
    }

    try {
      await handler(interaction, db);
    } catch (error) {
      logger.error(`Error ejecutando comando ${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ Error interno al ejecutar el comando.' }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Error interno al ejecutar el comando.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // --- Manejo de Envío de Modal (Popup) ---
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('support_call_modal_')) {
      const matchId = customId.replace('support_call_modal_', '');
      const description = interaction.fields.getTextInputValue('problem_description');

      await interaction.deferReply({ ephemeral: true });

      try {
        if (!(await isFeatureEnabled('adminCallNotifications'))) {
          return interaction.editReply({ content: '❌ La función de llamada a admin está desactivada.' });
        }

        // 1. Obtener datos de Faceit
        const userData = await db.getFaceitIdByDiscordId(interaction.user.id, interaction.guildId);
        if (!userData || !userData.faceit_player_id) {
          return interaction.editReply({ content: '❌ No tienes una cuenta de Faceit vinculada.' });
        }

        // 2. Obtener datos de la partida
        const activeMatch = await db.getActiveMatch(matchId);
        if (!activeMatch) {
          return interaction.editReply({ content: '❌ La partida ya no se encuentra activa.' });
        }

        const matchUrl = `https://www.faceit.com/en/cs2/room/${activeMatch.id}`;

        // 3. Registrar llamada de soporte en Firebase
        const supportId = `call_${activeMatch.id}_${Date.now()}`;
        await db.createSupportCall(supportId, activeMatch.id, userData.faceit_player_id, userData.faceit_nickname, interaction.user.id, description, matchUrl, interaction.guildId);

        // 4. Enviar alerta al canal de Staff
        const adminAlertsChannelId = env.DISCORD_ADMIN_ALERTS_CHANNEL_ID;
        if (!adminAlertsChannelId) {
          logger.error('No se configuró DISCORD_ADMIN_ALERTS_CHANNEL_ID.');
          return interaction.editReply({ content: '❌ Error de configuración del servidor. Por favor reporta esto a un admin.' });
        }

        const alertsChannel = await interaction.client.channels.fetch(adminAlertsChannelId).catch(() => null);
        if (!alertsChannel) {
          logger.error(`No se pudo encontrar el canal de alertas de admin: ${adminAlertsChannelId}`);
          return interaction.editReply({ content: '❌ Error al enviar la alerta al staff. El canal de alertas no está accesible.' });
        }

        const staffEmbed = new EmbedBuilder()
          .setTitle('🚨 Solicitud de Admin (Soporte)')
          .setColor(0xFF0000)
          .setDescription(`El jugador <@${interaction.user.id}> (**${userData.faceit_nickname}**) ha solicitado asistencia desde el panel de soporte.`)
          .addFields(
            { name: '🔗 Partida (Enlace Directo)', value: `[Hacer clic aquí](${matchUrl})\n\`${matchUrl}\``, inline: false },
            { name: '📝 Problema Reportado', value: `\`\`\`\n${description}\n\`\`\``, inline: false },
            { name: '📋 Detalles de Partida', value: `**${activeMatch.faction1_name}** vs **${activeMatch.faction2_name}**\n🗺️ Mapa: \`${activeMatch.map}\`\n📍 Servidor: \`${(activeMatch.location || 'N/A').toUpperCase()}\``, inline: false },
            { name: '👤 Jugador', value: `<@${interaction.user.id}>`, inline: true },
            { name: '💬 Canal de origen', value: `<#${interaction.channelId}>`, inline: true },
            { name: '⚙️ Estado', value: '⏳ **Pendiente**', inline: true }
          )
          .setTimestamp();

        const claimButton = new ButtonBuilder()
          .setCustomId(`admin_respond_btn_${supportId}`)
          .setLabel('Atender Solicitud')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅');

        const row = new ActionRowBuilder().addComponents(claimButton);

        const adminRoleName = env.ADMIN_ROLE_NAME || 'ADMIN';
        const adminRole = interaction.guild?.roles?.cache?.find(r => r.name.toUpperCase() === adminRoleName.toUpperCase());
        const pingMention = adminRole ? `<@&${adminRole.id}>` : '@here';

        await alertsChannel.send({
          content: `⚠️ Atención ${pingMention}`,
          embeds: [staffEmbed],
          components: [row]
        });

        // 5. Responder al usuario
        return interaction.editReply({
          content: '✅ **Solicitud enviada**. Nos estamos poniendo en contacto con un administrador. Te atenderán lo antes posible.'
        });

      } catch (err) {
        logger.error('Error al procesar modal de soporte:', err);
        return interaction.editReply({ content: '❌ Error al procesar tu solicitud. Intenta de nuevo.' });
      }
    }
  }

  // --- Manejo de Botones ---
  if (interaction.isButton()) {
    const { customId } = interaction;

    // --- Botón de Confirmar Vinculación ---
    if (customId === 'confirm_verify_btn') {
      return interaction.reply({
        content: '❌ Este botón y el método de código en la biografía ya no son necesarios.\n\n' +
          'Ahora puedes vincular tu cuenta directamente ejecutando nuevamente el comando: `/verificar_fc` con tu nickname.',
        ephemeral: true
      });
    }

    // --- Botón de Llamar Admin ---
    if (customId === 'llamar_admin_btn') {
      try {
        if (!(await isFeatureEnabled('adminCallNotifications'))) {
          return interaction.reply({ content: '❌ La función de llamada a admin está desactivada.', ephemeral: true });
        }

        // 1. Verificar si ya tiene una solicitud pendiente
        const hasPending = await db.hasPendingSupportCall(interaction.user.id);
        if (hasPending) {
          return interaction.reply({ content: '❌ Ya tienes una solicitud de soporte pendiente. Por favor, espera a que un administrador te atienda.', ephemeral: true });
        }

        // 2. Obtener faceit_id del usuario
        const userData = await db.getFaceitIdByDiscordId(interaction.user.id, interaction.guildId);
        if (!userData || !userData.faceit_player_id) {
          return interaction.reply({ content: '❌ No tienes una cuenta de Faceit vinculada. Usa `/verificar_fc` para vincularla.', ephemeral: true });
        }

        // 2. Buscar partida activa del usuario
        const activeMatch = await db.getActiveMatchByPlayerId(userData.faceit_player_id);
        if (!activeMatch) {
          return interaction.reply({ content: '❌ No estás en ninguna partida activa en este momento.', ephemeral: true });
        }

        // 3. Crear y mostrar el modal
        const modal = new ModalBuilder()
          .setCustomId(`support_call_modal_${activeMatch.id}`)
          .setTitle('Llamar Administrador');

        const problemInput = new TextInputBuilder()
          .setCustomId('problem_description')
          .setLabel('Describe tu problema en la partida')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ej: Jugador ausente (AFK), actitudes tóxicas, etc.')
          .setMinLength(10)
          .setMaxLength(500)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(problemInput);
        modal.addComponents(row);

        // Mostrar popup
        await interaction.showModal(modal);

      } catch (err) {
        logger.error('Error al verificar jugador para modal:', err);
        return interaction.reply({ content: '❌ Error al procesar tu solicitud. Intenta de nuevo.', ephemeral: true });
      }
      return;
    }

    // --- Botón de Reclamar / Atender Solicitud ---
    if (customId.startsWith('admin_respond_btn_')) {
      const supportId = customId.replace('admin_respond_btn_', '');

      try {
        // Verificar si el usuario que hace clic tiene permisos de admin
        const member = interaction.member;
        const adminRoleName = env.ADMIN_ROLE_NAME || 'ADMIN';
        const hasAdminRole = member.roles.cache.some(r => r.name.toUpperCase() === adminRoleName.toUpperCase());
        const hasAdminPermissions = member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasAdminRole && !hasAdminPermissions) {
          return interaction.reply({ content: '❌ Solo los administradores pueden atender solicitudes.', ephemeral: true });
        }

        // Obtener la solicitud desde la base de datos
        const callData = await db.getSupportCall(supportId);
        if (!callData) {
          return interaction.reply({ content: '❌ No se encontró la información de esta solicitud en la base de datos.', ephemeral: true });
        }

        if (callData.status === 'atendida') {
          return interaction.reply({ content: `⚠️ Esta solicitud ya está siendo atendida por <@${callData.claimedBy}>.`, ephemeral: true });
        }

        // Actualizar en Firebase
        await db.claimSupportCall(supportId, interaction.user.id);

        // Eliminar el mensaje de alerta para que desaparezca
        await interaction.message.delete().catch(err => logger.error('Error al eliminar mensaje de alerta:', err.message));

        // Responder de forma efímera al administrador con el enlace de la partida
        await interaction.reply({
          content: `✅ Has tomado la solicitud de soporte.\n🔗 **Enlace de la partida:** ${callData.match_url}\n📝 **Problema:** ${callData.description || 'No especificado'}`,
          ephemeral: true
        });

        // Notificar al jugador por DM
        const playerUser = await interaction.client.users.fetch(callData.discord_id).catch(() => null);
        if (playerUser) {
          await playerUser.send(
            `✅ **Tu solicitud de soporte ha sido aceptada** por el administrador **${interaction.user.tag}**.\n` +
            `Se pondrá en contacto contigo o se unirá al canal de voz de tu partida a la brevedad.`
          ).catch(() => {});
        }

        // Enviar log
        await db.addLogEntry('info', `Solicitud ${supportId} atendida por ${interaction.user.tag}`, 'bot');

      } catch (err) {
        logger.error('Error al reclamar soporte:', err);
        return interaction.reply({ content: '❌ Ocurrió un error al intentar atender la solicitud.', ephemeral: true });
      }
      return;
    }

    // --- Botones de Partida Manual (Lobby / crear_sala) ---
    if (customId.startsWith('manual_match_win_a_') || customId.startsWith('manual_match_win_b_') || customId.startsWith('manual_match_cancel_')) {
      let action = '';
      let matchId = '';

      if (customId.startsWith('manual_match_win_a_')) {
        action = 'win_a';
        matchId = customId.replace('manual_match_win_a_', '');
      } else if (customId.startsWith('manual_match_win_b_')) {
        action = 'win_b';
        matchId = customId.replace('manual_match_win_b_', '');
      } else if (customId.startsWith('manual_match_cancel_')) {
        action = 'cancel';
        matchId = customId.replace('manual_match_cancel_', '');
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        // 1. Obtener la partida activa de la base de datos
        const activeMatch = await db.getActiveMatch(matchId);
        if (!activeMatch) {
          return interaction.editReply('❌ No se encontró esta partida manual activa o ya fue finalizada.');
        }

        // 2. Verificar permisos (Creador de la partida, Admin o rol de Admin)
        const member = interaction.member;
        const config = await db.getSettings().catch(() => ({}));
        const adminRoleName = config.adminRoleName || env.ADMIN_ROLE_NAME || 'ADMIN';
        const hasAdminRole = member.roles.cache.some(r => r.name.toUpperCase() === adminRoleName.toUpperCase());
        const hasAdminPermissions = member.permissions.has(PermissionFlagsBits.Administrator);
        const isCreator = activeMatch.creator_id === interaction.user.id;

        if (!isCreator && !hasAdminRole && !hasAdminPermissions) {
          return interaction.editReply('❌ No tienes permisos para definir el resultado de esta sala. Solo el creador de la sala o un administrador pueden hacerlo.');
        }

        // 3. Devolver jugadores a su canal original y eliminar canales temporales
        let waitingRoomId = null;
        if (config.discordWaitingRoomChannelId) {
          const ids = config.discordWaitingRoomChannelId.split(',').map(id => id.trim());
          for (const id of ids) {
            const ch = await interaction.guild.channels.fetch(id).catch(() => null);
            if (ch && ch.guild.id === interaction.guild.id) {
              waitingRoomId = id;
              break;
            }
          }
        }
        const originalStates = activeMatch.original_voice_states || {};
        
        const { cleanupVoiceChannel } = await import('../services/voice.js');
        if (activeMatch.faction1_vc_id) {
          await cleanupVoiceChannel(interaction.guild, activeMatch.faction1_vc_id, waitingRoomId, originalStates, 'Partida manual finalizada');
        }
        if (activeMatch.faction2_vc_id) {
          await cleanupVoiceChannel(interaction.guild, activeMatch.faction2_vc_id, waitingRoomId, originalStates, 'Partida manual finalizada');
        }

        // 4. Registrar en historial si hubo ganador
        let statusText = '';
        let embedColor = 0x8C8C8C;

        if (action === 'win_a') {
          statusText = '🏆 **Ganador: Equipo A**';
          embedColor = 0x15C253; // Verde
          
          await db.addMatchToHistory(
            matchId,
            {
              entity_custom_name: activeMatch.entity_custom_name || 'Manual',
              game: activeMatch.game || 'cs2',
              voting: { map: { pick: [activeMatch.map || 'Manual'] }, location: { pick: [activeMatch.location || 'Manual'] } },
              teams: { faction1: { name: activeMatch.faction1_name || 'Equipo A' }, faction2: { name: activeMatch.faction2_name || 'Equipo B' } }
            },
            'faction1',
            16,
            0,
            activeMatch.faction1_roster || [],
            activeMatch.faction2_roster || [],
            activeMatch.guild_id || null
          );
        } else if (action === 'win_b') {
          statusText = '🏆 **Ganador: Equipo B**';
          embedColor = 0xFF3E3E; // Rojo
          
          await db.addMatchToHistory(
            matchId,
            {
              entity_custom_name: activeMatch.entity_custom_name || 'Manual',
              game: activeMatch.game || 'cs2',
              voting: { map: { pick: [activeMatch.map || 'Manual'] }, location: { pick: [activeMatch.location || 'Manual'] } },
              teams: { faction1: { name: activeMatch.faction1_name || 'Equipo A' }, faction2: { name: activeMatch.faction2_name || 'Equipo B' } }
            },
            'faction2',
            0,
            16,
            activeMatch.faction1_roster || [],
            activeMatch.faction2_roster || [],
            activeMatch.guild_id || null
          );
        } else {
          statusText = '❌ **Partida Cancelada**';
          embedColor = 0xEF4444; // Rojo claro
        }

        // 5. Eliminar la partida activa de Firestore
        await db.removeActiveMatch(matchId);

        // Resolver canal de anuncios de la guild
        let resolvedMatchesChannelId = null;
        if (config.discordMatchesChannelId) {
          const ids = config.discordMatchesChannelId.split(',').map(id => id.trim());
          for (const id of ids) {
            const ch = await interaction.guild.channels.fetch(id).catch(() => null);
            if (ch && ch.guild.id === interaction.guild.id) {
              resolvedMatchesChannelId = id;
              break;
            }
          }
        }

        // 6. Editar mensaje de anuncio para quitar botones y mostrar resultado
        if (activeMatch.message_id && resolvedMatchesChannelId) {
          const channel = await interaction.guild.channels.fetch(resolvedMatchesChannelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(activeMatch.message_id).catch(() => null);
            if (msg && msg.embeds.length > 0) {
              const oldEmbed = msg.embeds[0];
              const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor(embedColor)
                .addFields({ name: '🏁 Resultado Final', value: statusText, inline: false });
              
              await msg.edit({ embeds: [updatedEmbed], components: [] }).catch(err => logger.error('Error al editar mensaje de anuncio final:', err));
            }
          }
        }

        // 7. Actualizar el panel en vivo
        if (resolvedMatchesChannelId && !resolvedMatchesChannelId.startsWith('ID_')) {
          await updateLivePanel(interaction.client, resolvedMatchesChannelId, db);
        }

        await db.addLogEntry('info', `Partida manual ${matchId} finalizada (${action}) por ${interaction.user.tag}`, 'bot');
        await interaction.editReply(`✅ Partida finalizada con éxito. Resultado registrado: ${statusText}`);

        try {
          const { mixtonEvents } = await import('../routes/lobby.js');
          mixtonEvents.emit('update', activeMatch.guild_id || null);
        } catch (e) {
          logger.error('Error al notificar actualización de mixton:', e);
        }

      } catch (err) {
        logger.error('Error al procesar botón de partida manual:', err);
        return interaction.editReply('❌ Ocurrió un error al procesar el resultado de la partida.');
      }
      return;
    }
  }
}
