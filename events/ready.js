import { REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { updateMixtonReadyPanel } from '../services/mixtonPanel.js';
import { cleanupOrphanVoiceChannels, cleanupVoiceChannel } from '../services/voice.js';
import { env, getEffectiveConfig, getEffectiveConfigForGuild, getAllWaitingRoomIds, getAllMatchesChannelIds, getAllMixtonChannelIds } from '../config/index.js';
import { isFeatureEnabled, getSettings } from '../utils/featureFlags.js';
import { fetchFaceitPlayerById, fetchCurrentHubSeason } from '../services/faceitApi.js';
import { syncMemberLevelRole, getPlayerSkillLevel, syncMemberNickname } from '../services/roles.js';
import { queues } from '../commands/cs2_play.js';
import { checkAndNotifyHubBans } from '../services/hubBansService.js';

export async function onReady(client, commands, db) {
  logger.success(`Bot de Discord conectado como ${client.user.tag}`);

  const config = await getEffectiveConfig();

  // Registrar comandos de barra
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  try {
    logger.info('Registrando comandos de barra...');
    // Se registran globalmente para evitar duplicados en la guild
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
    
    // Registrar también en todas las guilds donde está el bot para disponibilidad instantánea (evita la espera de 1 hora de caché global)
    const targetGuilds = new Set();
    if (config.discordGuildId && !config.discordGuildId.startsWith('ID_')) {
      targetGuilds.add(config.discordGuildId);
    }
    client.guilds.cache.forEach(g => targetGuilds.add(g.id));

    for (const gId of targetGuilds) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, gId),
          { body: commands }
        );
        logger.success(`Comandos de barra registrados instantáneamente en la guild: ${gId}`);
      } catch (gErr) {
        logger.warn(`No se pudieron registrar comandos en la guild ${gId}:`, gErr.message);
      }
    }
    await db.addLogEntry('success', `Bot conectado como ${client.user.tag} y comandos sincronizados.`, 'system');
  } catch (error) {
    logger.error('Error al registrar comandos:', error);
  }

  // Cleanup de canales de voz huérfanos (consultando partidas activas para no borrar canales en curso)
  const autoVoice = await isFeatureEnabled('autoVoiceChannels');
  const guildId = config.discordGuildId;
  if (autoVoice && guildId && !guildId.startsWith('ID_')) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const waitingRoomIds = getAllWaitingRoomIds(config);
      for (const wrId of waitingRoomIds) {
        await cleanupOrphanVoiceChannels(guild, wrId, db);
      }
    } catch (err) {
      logger.warn('No se pudo limpiar VCs huérfanos al iniciar:', err.message);
    }
  }

  // Inicializar panel de partidas para todas las guilds y sus colas
  const livePanel = await isFeatureEnabled('liveMatchPanel');
  if (livePanel) {
    setTimeout(async () => {
      try {
        const guilds = client.guilds.cache.map(g => g.id);
        for (const gId of guilds) {
          const guildConfig = await getEffectiveConfigForGuild(gId);
          const panelChannels = getAllMixtonChannelIds(guildConfig);
          if (panelChannels.length === 0) {
            const fallbackChannel = guildConfig.discordMixtonChannelId || guildConfig.discordMatchesChannelId;
            if (fallbackChannel && !fallbackChannel.startsWith('ID_')) {
              panelChannels.push(fallbackChannel);
            }
          }
          for (const mChannelId of panelChannels) {
            await updateLivePanel(client, mChannelId, db).catch((err) => {
              logger.warn(`No se pudo inicializar el panel de partidas para la guild ${gId} en el canal ${mChannelId}:`, err.message);
            });
          }
        }
      } catch (err) {
        logger.error('Error al inicializar paneles de partidas en vivo para guilds:', err);
      }
    }, 3000);
  }

  // Inicializar panel de jugadores listos para mixton para todas las guilds
  setTimeout(async () => {
    try {
      const guilds = client.guilds.cache.map(g => g.id);
      for (const gId of guilds) {
        await updateMixtonReadyPanel(client, gId, db).catch(() => {});
      }
    } catch (err) {
      logger.error('Error al inicializar el panel de mixton listo:', err);
    }
  }, 4000);

  // Limpieza inicial de historial de canales (verificación y partidas/mixton)
  setTimeout(async () => {
    await cleanChannelsHistory(client, db).catch(() => {});
  }, 6000);

  // Auto-desplegar panel de soporte
  await checkAndDeploySupportPanel(client, db);

  // Auto-desplegar panel de verificación y limpiar anclajes viejos
  await checkAndDeployVerificationPanel(client, db);

  // Auto-desplegar panel de música
  await checkAndDeployMusicPanel(client, db);

  // Auto-desplegar panel de recargas de saldo
  await checkAndDeployRechargePanel(client, db);

  // Cleanup de partidas expiradas cada 5 minutos
  setInterval(async () => {
    await cleanupExpiredMatches(client, db);
  }, 5 * 60 * 1000);

  // Limpieza periódica de mensajes antiguos no anclados en el canal de vinculación y partidas (cada 30 minutos)
  setInterval(async () => {
    await cleanChannelsHistory(client, db).catch(() => {});
  }, 30 * 60 * 1000);

  // Sincronización automática periódica desactivada a petición (solo bajo demanda al verificar o sincronizar manualmente)
  // setInterval(async () => { await syncAllUserRoles(client, db); }, 12 * 60 * 60 * 1000);


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

  // Monitoreo de baneos y desbaneos del Hub cada 2 minutos
  setInterval(async () => {
    try {
      await checkAndNotifyHubBans(client, db);
    } catch (err) {
      logger.error('Error en intervalo de checkAndNotifyHubBans:', err.message);
    }
  }, 2 * 60 * 1000);

  setTimeout(async () => {
    try {
      await checkAndNotifyHubBans(client, db);
    } catch (err) {
      logger.error('Error en ejecución inicial de checkAndNotifyHubBans:', err.message);
    }
  }, 15 * 1000);
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

export async function checkAndDeployVerificationPanel(client, db) {
  const settings = await getSettings().catch(() => ({}));
  const linkChannelId = settings.discordLinkChannelId || env.DISCORD_LINK_CHANNEL_ID;
  if (linkChannelId && !linkChannelId.startsWith('ID_')) {
    const allowedChannels = linkChannelId.split(',').map(id => id.trim()).filter(Boolean);
    for (const channelId of allowedChannels) {
      try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) continue;

        // 1. Limpieza de anclajes viejos: desanclar cualquier mensaje de mixton listo
        try {
          const pinnedMessages = await channel.messages.fetchPins().catch(() => null);
          if (pinnedMessages) {
            const msgs = typeof pinnedMessages.values === 'function' ? Array.from(pinnedMessages.values()) : Array.from(pinnedMessages);
            for (const msg of msgs) {
              const isMixtonReadyEmbed = msg.embeds?.some(e => e.title && e.title.includes('Jugadores Listos para Mixton'));
              if (isMixtonReadyEmbed) {
                await msg.unpin().catch(unpinErr => logger.warn(`No se pudo desanclar panel de mixton viejo:`, unpinErr.message));
              }
            }
          }
        } catch (pinFetchErr) {
          logger.warn(`No se pudieron obtener los mensajes anclados para limpieza en el canal ${channelId}:`, pinFetchErr.message);
        }

        // Limpiar mensajes antiguos no anclados (más de 1 hora de antigüedad)
        try {
          const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
          if (messages) {
            const now = Date.now();
            const ONE_HOUR = 60 * 60 * 1000;
            for (const msg of messages.values()) {
              if (!msg.pinned && (now - msg.createdTimestamp > ONE_HOUR)) {
                await msg.delete().catch(() => {});
              }
            }
          }
        } catch (msgCleanErr) {
          logger.warn(`Error al limpiar mensajes antiguos no anclados en canal ${channelId}:`, msgCleanErr.message);
        }

        // 2. Verificar si ya existe el panel de verificación
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => []);
        const hasPanel = messages.some(msg => 
          msg.components?.some(row => 
            row.components?.some(btn => btn.customId === 'iniciar_verificacion_btn')
          )
        );

        if (!hasPanel) {
          logger.info(`No se encontró panel de verificación en el canal ${channelId}. Creándolo automáticamente...`);
          
          const embed = new EmbedBuilder()
            .setTitle('🛡️ Verificación de Perfil de Faceit')
            .setDescription(
              'Para poder jugar en nuestra comunidad, mixtons, torneos y obtener tus roles automáticos correspondientes a tu nivel, debes vincular tu cuenta.\n\n' +
              'Presiona el botón de abajo para iniciar la verificación. Se abrirá una ventana emergente donde deberás ingresar tu nickname de Faceit.'
            )
            .setColor(0xFF5500)
            .setFooter({ text: 'Sistema de Vinculación Faceit' })
            .setTimestamp();

          const button = new ButtonBuilder()
            .setCustomId('iniciar_verificacion_btn')
            .setLabel('Verificar Cuenta')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛡️');

          const row = new ActionRowBuilder().addComponents(button);

          const newMessage = await channel.send({
            embeds: [embed],
            components: [row]
          });
          
          try {
            await newMessage.pin();
          } catch (pinErr) {
            logger.warn(`No se pudo fijar el mensaje de verificación en el canal ${channelId}:`, pinErr.message);
          }
          
          logger.success(`Panel de verificación creado y anclado en el canal: ${channelId}`);
        }
      } catch (err) {
        logger.warn(`No se pudo comprobar/crear el panel de verificación automático en canal ${channelId}:`, err.message);
      }
    }
  }
}

export async function checkAndDeployRechargePanel(client, db) {
  try {
    const globalSettings = await getSettings().catch(() => ({}));
    const channelsToDeploy = new Set();

    // 1. Canal configurado globalmente o en .env
    const globalChannel = globalSettings.discordRechargeChannelId || env.DISCORD_RECHARGE_CHANNEL_ID;
    if (globalChannel && !globalChannel.startsWith('ID_')) {
      globalChannel.split(',').map(id => id.trim()).filter(Boolean).forEach(id => channelsToDeploy.add(id));
    }

    // 2. Canales configurados por cada servidor (Guild) en Firestore
    for (const guild of client.guilds.cache.values()) {
      try {
        const guildSettings = await db.getGuildSettings(guild.id).catch(() => ({}));
        if (guildSettings && guildSettings.discordRechargeChannelId && !guildSettings.discordRechargeChannelId.startsWith('ID_')) {
          guildSettings.discordRechargeChannelId.split(',').map(id => id.trim()).filter(Boolean).forEach(id => channelsToDeploy.add(id));
        }
      } catch (gErr) {
        logger.warn(`Error al leer settings de recargas para guild ${guild.id}:`, gErr.message);
      }
    }

    if (channelsToDeploy.size === 0) {
      logger.info('ℹ️ No hay canales configurados para el panel de recargas automático (usa /setup_recargas o configúralo en el panel admin).');
      return;
    }

    logger.info(`🔍 Verificando panel de recargas en canales: [${Array.from(channelsToDeploy).join(', ')}]`);

    for (const channelId of channelsToDeploy) {
      try {
        const channel = await client.channels.fetch(channelId).catch((fetchErr) => {
          logger.warn(`⚠️ No se pudo acceder al canal de recargas ${channelId}:`, fetchErr.message);
          return null;
        });
        if (!channel) {
          logger.warn(`⚠️ El canal de recargas ${channelId} no existe o el bot no tiene permisos para verlo.`);
          continue;
        }

        // Limpiar mensajes antiguos no anclados (más de 1 hora de antigüedad)
        try {
          const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
          if (messages) {
            const now = Date.now();
            const ONE_HOUR = 60 * 60 * 1000;
            for (const msg of messages.values()) {
              if (!msg.pinned && (now - msg.createdTimestamp > ONE_HOUR)) {
                await msg.delete().catch(() => {});
              }
            }
          }
        } catch (msgCleanErr) {
          logger.warn(`Error al limpiar mensajes antiguos en canal de recargas ${channelId}:`, msgCleanErr.message);
        }

        // Verificar si ya existe el panel de recargas
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => []);
        const hasPanel = messages.some(msg => 
          msg.components?.some(row => 
            row.components?.some(btn => btn.customId === 'iniciar_recarga_btn' || btn.data?.custom_id === 'iniciar_recarga_btn')
          )
        );

        if (!hasPanel) {
          logger.info(`✨ Desplegando panel de recargas en el canal #${channel.name || channelId}...`);
          
          const embed = new EmbedBuilder()
            .setTitle('💰 Billetera y Recargas Mixton Arena')
            .setDescription(
              '¡Recarga saldo a tu cuenta de forma instantánea usando **Yape** para participar en las partidas y cuotas de apuestas de Mixton Arena!\n\n' +
              '**📌 ¿Cómo recargar?**\n' +
              '1️⃣ Presiona el botón de abajo **[Recargar con Yape]**.\n' +
              '2️⃣ Ingresa el monto, tu celular Yape para premios y el código de aprobación de tu comprobante.\n' +
              '3️⃣ Verificaremos monto y código; tu celular se guardará para enviarte premios si ganas.\n\n' +
              '🔒 *Nunca te pediremos códigos de aprobación de Yape.*'
            )
            .setColor(0x742284) // Morado característico de Yape
            .setFooter({ text: 'Sistema de Pagos y Billetera Mixton • Yape Oficial' })
            .setTimestamp();

          const button = new ButtonBuilder()
            .setCustomId('iniciar_recarga_btn')
            .setLabel('Recargar con Yape')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💜');

          const row = new ActionRowBuilder().addComponents(button);

          const newMessage = await channel.send({
            embeds: [embed],
            components: [row]
          });
          
          try {
            await newMessage.pin();
          } catch (pinErr) {
            logger.warn(`No se pudo fijar el mensaje de recargas en el canal ${channelId}:`, pinErr.message);
          }
          
          logger.success(`✅ Panel de recargas creado y anclado en #${channel.name || channelId}`);
        } else {
          logger.info(`ℹ️ El panel de recargas ya existe en el canal #${channel.name || channelId}.`);
        }
      } catch (err) {
        logger.warn(`No se pudo comprobar/crear el panel de recargas automático en canal ${channelId}:`, err.message);
      }
    }
  } catch (globalErr) {
    logger.error('Error general en checkAndDeployRechargePanel:', globalErr);
  }
}

async function cleanupExpiredMatches(client, db) {
  const MATCH_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
  try {
    const matches = await db.getActiveMatches();
    const now = Date.now();
    const expired = matches.filter(m => (m.startedAt && (now - m.startedAt > MATCH_TTL_MS)));

    const config = await getEffectiveConfig();
    const defaultGuildId = config.discordGuildId;

    for (const match of expired) {
      logger.warn(`Partida ${match.id} expirada (más de 2h). Forzando cleanup...`);

      const targetGuildId = match.guild_id || defaultGuildId;
      const targetConfig = targetGuildId ? await getEffectiveConfigForGuild(targetGuildId).catch(() => config) : config;
      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      const waitingRoomId = match.waiting_room_id || targetConfig.discordWaitingRoomChannelId;

      if (guild && waitingRoomId) {
        const originalStates = match.original_voice_states || {};
        if (match.faction1_vc_id) {
          await cleanupVoiceChannel(guild, match.faction1_vc_id, waitingRoomId, originalStates, 'Partida expirada (>2h)', true);
        }
        if (match.faction2_vc_id) {
          await cleanupVoiceChannel(guild, match.faction2_vc_id, waitingRoomId, originalStates, 'Partida expirada (>2h)', true);
        }
        await cleanupOrphanVoiceChannels(guild, waitingRoomId, db);
      }
      await db.removeActiveMatch(match.id);
    }

    if (expired.length > 0) {
      const panelChannels = getAllMixtonChannelIds(config);
      if (panelChannels.length === 0) {
        const fallbackChannel = config.discordMixtonChannelId || config.discordMatchesChannelId;
        if (fallbackChannel && !fallbackChannel.startsWith('ID_')) {
          panelChannels.push(fallbackChannel);
        }
      }
      for (const pCh of panelChannels) {
        await updateLivePanel(client, pCh, db).catch(() => {});
      }
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
      logger.error('Sincronización masiva de roles: No se pudo obtener la guild.');
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

    const currentSeason = await fetchCurrentHubSeason(config.faceitLeaderboardId || config.faceitHubId).catch(() => null);

    for (const user of users) {
      try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Delay de 150ms

        if (!user.faceit_player_id) continue;
        const playerData = await fetchFaceitPlayerById(user.faceit_player_id);
        const currentLevel = getPlayerSkillLevel(playerData);

        if (currentLevel) {
          await syncMemberLevelRole(guild, user.discordId, currentLevel);
          const elo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
          await db.updatePlayerStats(user.discordId, currentLevel, elo, user.guild_id, currentSeason);
          successCount++;
        }
        const nickToSync = playerData.nickname || user.faceit_nickname;
        if (nickToSync) {
          await syncMemberNickname(guild, user.discordId, nickToSync);
        }
      } catch (err) {
        errorCount++;
        logger.error(`Error al sincronizar roles automáticamente para ${user.faceit_nickname || user.discordId}:`, err.message);
      }
    }

    if (successCount > 0 || errorCount > 0) {
      logger.success(`Sincronización masiva de roles completada. Éxito: ${successCount}, Errores: ${errorCount}`);
      await db.addLogEntry('info', `Sincronización masiva de roles completada. Éxito: ${successCount}, Errores: ${errorCount}`, 'system');
    }
  } catch (err) {
    logger.error('Error en la actualización masiva de roles:', err.message);
  }
}

export async function cleanChannelsHistory(client, db) {
  try {
    const guilds = client.guilds.cache.map(g => g.id);
    const channelsToClean = new Set();
    const excludedMatchesChannels = new Set();
    const activeMatchMessageIds = new Set();
    const activeMusicMessageIds = new Set();

    // Recopilar todos los canales de partidas (matchesChannelId de todas las colas) para NUNCA limpiarlos
    const globalConfig = await getEffectiveConfigForGuild(null);
    getAllMatchesChannelIds(globalConfig).forEach(id => excludedMatchesChannels.add(id));

    for (const gId of guilds) {
      const guildConfig = await getEffectiveConfigForGuild(gId).catch(() => null);
      if (guildConfig) {
        getAllMatchesChannelIds(guildConfig).forEach(id => excludedMatchesChannels.add(id));
      }
    }

    // Obtener IDs de mensajes de partidas activas para no borrarlos de la lista de partidas si estuvieran en otros canales
    const activeMatches = await db.getActiveMatches().catch(() => []);
    for (const m of activeMatches) {
      if (m.message_id) {
        activeMatchMessageIds.add(m.message_id);
      }
    }

    // Obtener IDs de paneles de música activos
    for (const q of queues.values()) {
      if (q.controlMessage?.id) {
        activeMusicMessageIds.add(q.controlMessage.id);
      }
    }

    // Agregar canales de la configuración global (excluyendo canal de partidas)
    const globalLink = globalConfig.discordLinkChannelId;
    const globalMixton = globalConfig.discordMixtonChannelId;
    const globalMusic = globalConfig.discordMusicChannelId;
    if (globalLink && !globalLink.startsWith('ID_')) {
      globalLink.split(',').forEach(id => channelsToClean.add(id.trim()));
    }
    if (globalMixton && !globalMixton.startsWith('ID_')) {
      globalMixton.split(',').forEach(id => {
        const trimmed = id.trim();
        if (!excludedMatchesChannels.has(trimmed)) channelsToClean.add(trimmed);
      });
    }
    if (globalMusic && !globalMusic.startsWith('ID_')) {
      globalMusic.split(',').forEach(id => channelsToClean.add(id.trim()));
    }

    // Agregar canales de configuraciones de cada guild
    for (const gId of guilds) {
      const guildConfig = await getEffectiveConfigForGuild(gId).catch(() => null);
      if (guildConfig) {
        const linkChannelId = guildConfig.discordLinkChannelId;
        const mixtonChannelId = guildConfig.discordMixtonChannelId;
        let musicChannelId = guildConfig.discordMusicChannelId;

        // Fallback: buscar canal si no está configurado
        if (!musicChannelId || musicChannelId.startsWith('ID_')) {
          try {
            const guild = await client.guilds.fetch(gId).catch(() => null);
            if (guild) {
              const channels = await guild.channels.fetch().catch(() => null);
              if (channels) {
                const musicChannel = channels.find(c => 
                  c && c.isTextBased() && 
                  (c.name.toLowerCase().includes('musica') || c.name.toLowerCase().includes('music'))
                );
                if (musicChannel) {
                  musicChannelId = musicChannel.id;
                }
              }
            }
          } catch (err) {
            // Ignorar errores al buscar canal
          }
        }

        if (linkChannelId && !linkChannelId.startsWith('ID_')) {
          linkChannelId.split(',').forEach(id => channelsToClean.add(id.trim()));
        }
        if (mixtonChannelId && !mixtonChannelId.startsWith('ID_')) {
          mixtonChannelId.split(',').forEach(id => {
            const trimmed = id.trim();
            if (!excludedMatchesChannels.has(trimmed)) channelsToClean.add(trimmed);
          });
        }
        if (musicChannelId && !musicChannelId.startsWith('ID_')) {
          musicChannelId.split(',').forEach(id => channelsToClean.add(id.trim()));
        }
      }
    }

    // Remover expresamente cualquier canal de partidas de la lista a limpiar
    for (const matchChanId of excludedMatchesChannels) {
      channelsToClean.delete(matchChanId);
    }

    for (const channelId of channelsToClean) {
      if (!channelId) continue;
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;
      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (messages) {
        for (const msg of messages.values()) {
          // Si no está anclado y no es un anuncio de partida activa ni panel de música activo, borrarlo
          if (!msg.pinned && !activeMatchMessageIds.has(msg.id) && !activeMusicMessageIds.has(msg.id)) {
            await msg.delete().catch(() => {});
          }
        }
      }
    }
    logger.info('Limpieza del historial de canales completada (verificación y música).');
  } catch (err) {
    logger.warn('Error al limpiar el historial de canales:', err.message);
  }
}

export async function checkAndDeployMusicPanel(client, db) {
  try {
    const guilds = client.guilds.cache.map(g => g.id);
    for (const gId of guilds) {
      const guildConfig = await getEffectiveConfigForGuild(gId).catch(() => null);
      if (!guildConfig) continue;

      let musicChannelId = guildConfig.discordMusicChannelId;

      // Fallback: buscar canal si no está configurado
      if (!musicChannelId || musicChannelId.startsWith('ID_')) {
        try {
          const guild = await client.guilds.fetch(gId).catch(() => null);
          if (guild) {
            const channels = await guild.channels.fetch().catch(() => null);
            if (channels) {
              const musicChannel = channels.find(c => 
                c && c.isTextBased() && 
                (c.name.toLowerCase().includes('musica') || c.name.toLowerCase().includes('music'))
              );
              if (musicChannel) {
                musicChannelId = musicChannel.id;
                logger.info(`[Guild ${gId}] Canal de música no configurado. Usando canal encontrado automáticamente: #${musicChannel.name} (${musicChannelId})`);
              }
            }
          }
        } catch (err) {
          logger.warn(`[Guild ${gId}] Error al buscar canal de música de forma automática:`, err.message);
        }
      }

      if (musicChannelId && !musicChannelId.startsWith('ID_')) {
        const allowedChannels = musicChannelId.split(',').map(id => id.trim()).filter(Boolean);
        for (const channelId of allowedChannels) {
          try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) continue;

            // Limpiar mensajes antiguos no anclados (más de 1 hora de antigüedad)
            try {
              const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
              if (messages) {
                const now = Date.now();
                const ONE_HOUR = 60 * 60 * 1000;
                for (const msg of messages.values()) {
                  if (!msg.pinned && (now - msg.createdTimestamp > ONE_HOUR)) {
                    await msg.delete().catch(() => {});
                  }
                }
              }
            } catch (msgCleanErr) {
              logger.warn(`Error al limpiar mensajes antiguos no anclados en canal ${channelId}:`, msgCleanErr.message);
            }

            // Verificar si ya existe el panel de música
            const messages = await channel.messages.fetch({ limit: 50 }).catch(() => []);
            const hasPanel = messages.some(msg => 
              msg.components?.some(row => 
                row.components?.some(btn => btn.customId === 'iniciar_musica_btn')
              )
            );

            if (!hasPanel) {
              logger.info(`No se encontró panel de música en el canal ${channelId}. Creándolo automáticamente...`);
              
              const embed = new EmbedBuilder()
                .setTitle('🎵 Reproductor de Música')
                .setDescription(
                  'Reproduce música de YouTube directamente en tu canal de voz.\n\n' +
                  'Presiona el botón de abajo para ingresar un enlace de YouTube o realizar una búsqueda.'
                )
                .setColor(0x00FFBB)
                .setFooter({ text: 'Sistema de Música' })
                .setTimestamp();

              const button = new ButtonBuilder()
                .setCustomId('iniciar_musica_btn')
                .setLabel('Reproducir Música')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎵');

              const row = new ActionRowBuilder().addComponents(button);

              const newMessage = await channel.send({
                embeds: [embed],
                components: [row]
              });
              
              try {
                await newMessage.pin();
              } catch (pinErr) {
                logger.warn(`No se pudo fijar el mensaje de música en el canal ${channelId}:`, pinErr.message);
              }
              
              logger.success(`Panel de música creado y anclado en el canal: ${channelId}`);
            }
          } catch (err) {
            logger.warn(`No se pudo comprobar/crear el panel de música automático en canal ${channelId}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    logger.error('Error general al desplegar paneles de música para las guilds:', err);
  }
}
