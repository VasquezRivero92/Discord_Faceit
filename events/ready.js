import { REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { cleanupOrphanVoiceChannels } from '../services/voice.js';
import { env, getEffectiveConfig } from '../config/index.js';
import { isFeatureEnabled, getSettings } from '../utils/featureFlags.js';
import { fetchFaceitPlayerById } from '../services/faceitApi.js';
import { syncMemberLevelRole, getPlayerSkillLevel } from '../services/roles.js';

export async function onReady(client, commands, db) {
  logger.success(`Bot de Discord conectado como ${client.user.tag}`);

  const config = await getEffectiveConfig();

  // Registrar comandos de barra
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  try {
    logger.info('Registrando comandos de barra...');
    // Se registran globalmente para evitar duplicados en la guild
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
    
    // Si hay un guild ID configurado, limpiamos los comandos específicos de ese guild
    // para evitar que se muestren duplicados en el cliente de Discord.
    const guildId = config.discordGuildId;
    if (guildId && !guildId.startsWith('ID_')) {
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId),
        { body: [] }
      );
      logger.success(`Comandos de barra registrados globalmente y limpiados de la guild: ${guildId}`);
    } else {
      logger.success('Comandos de barra registrados con éxito globalmente.');
    }
    await db.addLogEntry('success', `Bot conectado como ${client.user.tag} y comandos sincronizados.`, 'system');
  } catch (error) {
    logger.error('Error al registrar comandos:', error);
  }

  // Cleanup de canales de voz huérfanos
  const autoVoice = await isFeatureEnabled('autoVoiceChannels');
  const guildId = config.discordGuildId;
  const waitingRoomId = config.discordWaitingRoomChannelId;
  if (autoVoice && guildId && !guildId.startsWith('ID_') && waitingRoomId && !waitingRoomId.startsWith('ID_')) {
    try {
      const guild = await client.guilds.fetch(guildId);
      await cleanupOrphanVoiceChannels(guild, waitingRoomId);
    } catch (err) {
      logger.warn('No se pudo limpiar VCs huérfanos al iniciar:', err.message);
    }
  }

  // Inicializar panel de partidas
  const livePanel = await isFeatureEnabled('liveMatchPanel');
  const matchesChannelId = config.discordMatchesChannelId;
  if (livePanel && matchesChannelId && !matchesChannelId.startsWith('ID_')) {
    setTimeout(() => {
      updateLivePanel(client, matchesChannelId, db);
    }, 3000);
  }

  // Auto-desplegar panel de soporte
  await checkAndDeploySupportPanel(client, db);

  // Cleanup de partidas expiradas cada 5 minutos
  setInterval(async () => {
    await cleanupExpiredMatches(client, db);
  }, 5 * 60 * 1000);

  // Sincronización automática de roles cada 12 horas
  setInterval(async () => {
    await syncAllUserRoles(client, db);
  }, 12 * 60 * 60 * 1000);

  // Limpieza de logs antiguos de Firestore cada 24 horas
  setInterval(async () => {
    try {
      await db.pruneOldLogs(7);
    } catch (err) {
      logger.error('Error al ejecutar auto-limpieza de logs diarios:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // Ejecutar limpieza inicial de logs
  setTimeout(async () => {
    try {
      await db.pruneOldLogs(7);
    } catch (err) {
      logger.error('Error al ejecutar limpieza de logs inicial:', err.message);
    }
  }, 10 * 1000);
}

export async function checkAndDeploySupportPanel(client, db) {
  const settings = await getSettings().catch(() => ({}));
  const supportChannelId = settings.discordSupportChannelId || env.DISCORD_SUPPORT_CHANNEL_ID || process.env.DISCORD_SUPPORT_CHANNEL_ID;
  if (supportChannelId && !supportChannelId.startsWith('ID_')) {
    try {
      const supportChannel = await client.channels.fetch(supportChannelId).catch(() => null);
      if (supportChannel) {
        const messages = await supportChannel.messages.fetch({ limit: 50 }).catch(() => []);
        const hasPanel = messages.some(msg => 
          msg.components?.some(row => 
            row.components?.some(btn => btn.customId === 'llamar_admin_btn')
          )
        );
        if (!hasPanel) {
          logger.info(`No se encontró panel de soporte en el canal ${supportChannelId}. Creándolo automáticamente...`);
          const templates = await db.getMessageTemplates();
          const title = templates.supportTitle || '🚨 Soporte y Llamado de Admin';
          const description = templates.supportDescription ||
            '¿Tienes algún problema en tu partida activa de Faceit?\n\n' +
            'Presiona el botón de abajo para solicitar la asistencia de un administrador del staff.\n\n' +
            '⚠️ **Requisitos y Notas Importantes**:\n' +
            '- Debes tener tu cuenta de Faceit vinculada con el bot (usa `/verificar_fc` si aún no lo has hecho).\n' +
            '- Solo funcionará si te encuentras actualmente en una **partida activa** de Faceit en este servidor/club.\n' +
            '- Al presionar el botón, se enviará una notificación con el enlace a tu partida al equipo de soporte.';
          const colorStr = templates.supportColor || '#FF0000';
          let color = parseInt(colorStr.replace('#', '0x'), 16);
          if (isNaN(color)) color = 0xFF0000;

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: 'Sistema de Soporte de Faceit' })
            .setTimestamp();

          const button = new ButtonBuilder()
            .setCustomId('llamar_admin_btn')
            .setLabel('Llamar Administrador')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚨');

          const row = new ActionRowBuilder().addComponents(button);

          await supportChannel.send({
            embeds: [embed],
            components: [row]
          });
          logger.success(`Panel de soporte creado automáticamente en el canal: ${supportChannelId}`);
        }
      }
    } catch (err) {
      logger.warn('No se pudo comprobar/crear el panel de soporte automático:', err.message);
    }
  }
}

async function cleanupExpiredMatches(client, db) {
  const MATCH_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
  try {
    const matches = await db.getActiveMatches();
    const now = Date.now();
    const expired = matches.filter(m => (m.startedAt && (now - m.startedAt > MATCH_TTL_MS)));

    const config = await getEffectiveConfig();
    const guildId = config.discordGuildId;
    const waitingRoomId = config.discordWaitingRoomChannelId;
    const matchesChannelId = config.discordMatchesChannelId;

    for (const match of expired) {
      logger.warn(`Partida ${match.id} expirada (más de 2h). Forzando cleanup...`);

      const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
      if (guild && waitingRoomId) {
        await cleanupOrphanVoiceChannels(guild, waitingRoomId);
      }
      await db.removeActiveMatch(match.id);
    }

    if (expired.length > 0 && matchesChannelId) {
      await updateLivePanel(client, matchesChannelId, db);
      logger.success(`${expired.length} partidas expiradas limpiadas.`);
    }
  } catch (err) {
    logger.error('Error en cleanup de partidas expiradas:', err.message);
  }
}

async function syncAllUserRoles(client, db) {
  try {
    const settings = await db.getSettings().catch(() => ({}));
    if (settings.autoRoleSync === false) return;

    const config = await getEffectiveConfig();
    const guildId = config.discordGuildId;
    if (!guildId || guildId.startsWith('ID_')) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      logger.error('Sincronización automática de 5 mins: No se pudo obtener la guild.');
      return;
    }

    const snapshot = await db._firestore.collection('faceit_users').get();
    if (snapshot.empty) return;

    const users = [];
    snapshot.forEach(doc => {
      users.push({ discordId: doc.id, ...doc.data() });
    });

    logger.info(`Iniciando actualización automática de roles para ${users.length} usuarios...`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Delay de 150ms

        if (!user.faceit_player_id) continue;
        const playerData = await fetchFaceitPlayerById(user.faceit_player_id);
        const currentLevel = getPlayerSkillLevel(playerData);

        if (currentLevel) {
          await syncMemberLevelRole(guild, user.discordId, currentLevel);
          const elo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
          await db.updatePlayerStats(user.discordId, currentLevel, elo, user.guild_id);
          successCount++;
        }
      } catch (err) {
        errorCount++;
        logger.error(`Error al sincronizar roles automáticamente para ${user.faceit_nickname || user.discordId}:`, err.message);
      }
    }

    if (successCount > 0 || errorCount > 0) {
      logger.success(`Sincronización automática de 5 mins completada. Éxito: ${successCount}, Errores: ${errorCount}`);
      await db.addLogEntry('info', `Sincronización automática de 5 mins completada. Éxito: ${successCount}, Errores: ${errorCount}`, 'system');
    }
  } catch (err) {
    logger.error('Error en la actualización automática de roles de 5 mins:', err.message);
  }
}
