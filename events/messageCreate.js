import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { env, getEffectiveConfigForGuild } from '../config/index.js';
import { queues } from '../commands/cs2_play.js';

const ADMIN_CALL_KEYWORDS = [
  'llamar a un admin',
  'necesito admin',
  'llamada admin',
  'admin help',
  'call admin',
  'need admin',
  'ayuda admin',
  'admin por favor',
  'admin please',
  'admin',
  'mod',
  'moderador',
  'necesito ayuda',
  'help',
];

export async function onMessageCreate(message, client, db) {
  // Eliminar mensajes no anclados en el canal de vinculación, de partidas y de música
  try {
    const guildId = message.guildId || message.guild?.id || null;
    const settings = await getEffectiveConfigForGuild(guildId).catch(() => ({}));
    const linkChannelId = settings.discordLinkChannelId || env.DISCORD_LINK_CHANNEL_ID;
    const mixtonChannelId = settings.discordMixtonChannelId || env.DISCORD_MIXTON_CHANNEL_ID;
    const matchesChannelId = settings.discordMatchesChannelId || env.DISCORD_MATCHES_CHANNEL_ID;
    let musicChannelId = settings.discordMusicChannelId || env.DISCORD_MUSIC_CHANNEL_ID;

    // Fallback: Buscar canal con nombre musica o music si no está configurado
    if ((!musicChannelId || musicChannelId.startsWith('ID_')) && message.guild) {
      const foundMusic = message.guild.channels.cache.find(c => 
        c && c.isTextBased() && 
        (c.name.toLowerCase().includes('musica') || c.name.toLowerCase().includes('music'))
      );
      if (foundMusic) {
        musicChannelId = foundMusic.id;
      }
    }

    const allowedLinkChannels = linkChannelId && !linkChannelId.startsWith('ID_')
      ? linkChannelId.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    const allowedMixtonChannels = mixtonChannelId && !mixtonChannelId.startsWith('ID_')
      ? mixtonChannelId.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    const allowedMatchesChannels = matchesChannelId && !matchesChannelId.startsWith('ID_')
      ? matchesChannelId.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    const allowedMusicChannels = musicChannelId && !musicChannelId.startsWith('ID_')
      ? musicChannelId.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // NUNCA limpiar el canal de publicaciones de partidas (matchesChannelId).
    // Solo limpiar canal de vinculación, música, o mixton (si mixton es distinto al canal de partidas).
    const filteredMixtonChannels = allowedMixtonChannels.filter(id => !allowedMatchesChannels.includes(id));
    const allChannelsToClean = [...allowedLinkChannels, ...filteredMixtonChannels, ...allowedMusicChannels];

    if (allChannelsToClean.includes(message.channelId)) {
      // Si el mensaje es un anuncio de partida activa (cuyo ID está en la db) o un panel de música activo, lo mantenemos.
      // De lo contrario (usuario escribiendo, mensaje de sistema de fijación, etc.), se borra en 3s.
      const activeMatches = await db.getActiveMatches().catch(() => []);
      const activeMatchMessageIds = activeMatches.map(m => m.message_id).filter(Boolean);

      const activeMusicMessageIds = [];
      for (const q of queues.values()) {
        if (q.controlMessage?.id) {
          activeMusicMessageIds.push(q.controlMessage.id);
        }
      }
      
      if (activeMatchMessageIds.includes(message.id) || activeMusicMessageIds.includes(message.id)) {
        return;
      }

      const delay = 3000;

      setTimeout(async () => {
        try {
          const freshMsg = await message.channel.messages.fetch(message.id).catch(() => null);
          if (freshMsg && !freshMsg.pinned) {
            // Re-chequeo por si el mensaje fue asignado a una partida activa o panel de música entretanto
            const latestMatches = await db.getActiveMatches(true).catch(() => []);
            const latestIds = latestMatches.map(m => m.message_id).filter(Boolean);

            const latestMusicIds = [];
            for (const q of queues.values()) {
              if (q.controlMessage?.id) {
                latestMusicIds.push(q.controlMessage.id);
              }
            }

            if (!latestIds.includes(freshMsg.id) && !latestMusicIds.includes(freshMsg.id)) {
              await freshMsg.delete().catch(() => {});
            }
          }
        } catch (err) {
          // Ignorar errores si el mensaje ya fue eliminado
        }
      }, delay);
    }
  } catch (err) {
    logger.warn('Error al programar la eliminación del mensaje:', err.message);
  }

  // Ignorar mensajes del bot, DM, o fuera de guilds
  if (message.author.bot || !message.guild) return;

  // Feature flag
  if (!(await isFeatureEnabled('adminCallNotifications', message.guild.id))) return;

  // Solo reaccionar a comandos explícitos para llamar admin y evitar falsos positivos
  const contentTrimmed = message.content.trim().toLowerCase();
  const isCommandCall = contentTrimmed === '!admin' || contentTrimmed === '!soporte' || contentTrimmed === '!llamaradmin';
  if (!isCommandCall) return;

  logger.info(`Solicitud de admin detectada de ${message.author.tag} en #${message.channel.name}`);

  try {
    // 1. Obtener faceit_id del usuario
    const userData = await db.getFaceitIdByDiscordId(message.author.id, message.guild.id);
    if (!userData || !userData.faceit_player_id) {
      await message.reply({ content: '❌ No tienes una cuenta de Faceit vinculada. Usa `/verificar_fc` para vincularla.' }).catch(() => {});
      return;
    }

    // 2. Buscar partida activa del usuario
    const activeMatch = await db.getActiveMatchByPlayerId(userData.faceit_player_id);
    if (!activeMatch) {
      await message.reply({ content: '❌ No estás en ninguna partida activa en este momento.' }).catch(() => {});
      return;
    }

    // 3. Buscar admins en el servidor
    const guild = message.guild;
    const config = await getEffectiveConfigForGuild(guild.id).catch(() => ({}));
    const adminRoleId = config.adminRoleId || env.ADMIN_ROLE_ID;
    const adminRole = adminRoleId ? (guild.roles.cache.get(adminRoleId) || guild.roles.cache.find(r => r.name.toUpperCase() === adminRoleId.toUpperCase())) : null;
    let admins = adminRole ? adminRole.members : null;

    if (!admins || admins.size === 0) {
      admins = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator));
    }

    if (admins.size === 0) {
      await message.reply({ content: '⚠️ No hay admins disponibles para atender tu solicitud.' }).catch(() => {});
      return;
    }

    // 4. Enviar DM a cada admin
    const matchUrl = `https://www.faceit.com/en/cs2/room/${activeMatch.id}`;
    const embed = new EmbedBuilder()
      .setTitle('🚨 Solicitud de Admin')
      .setColor(0xFF0000)
      .setDescription(`El jugador **${message.author.tag}** (${userData.faceit_nickname}) ha solicitado un admin en su partida.`)
      .addFields(
        { name: '🔗 Partida', value: `[Hacer clic aquí](${matchUrl})`, inline: false },
        { name: '📋 Detalles', value: `**${activeMatch.faction1_name}** vs **${activeMatch.faction2_name}**\n🗺️ Mapa: \`${activeMatch.map}\`\n📍 Servidor: \`${(activeMatch.location || 'N/A').toUpperCase()}\``, inline: false },
        { name: '👤 Jugador', value: `<@${message.author.id}>`, inline: true },
        { name: '💬 Canal', value: `<#${message.channel.id}>`, inline: true }
      )
      .setTimestamp();

    let sentCount = 0;
    for (const [_, admin] of admins) {
      try {
        await admin.send({ embeds: [embed] });
        sentCount++;
      } catch (dmErr) {
        logger.warn(`No se pudo enviar DM a ${admin.user.tag}: ${dmErr.message}`);
      }
    }

    logger.success(`Solicitud de admin enviada a ${sentCount} admins.`);
    await db.addLogEntry('warn', `Solicitud de admin de ${message.author.tag} en partida ${activeMatch.id}. DMs enviados: ${sentCount}/${admins.size}`, 'bot');

    // 5. Responder al usuario
    await message.reply({ 
      content: `✅ Se ha notificado a **${sentCount} admin(s)**. Te atenderán pronto.` 
    }).catch(() => {});

  } catch (err) {
    logger.error('Error procesando solicitud de admin:', err);
    await message.reply({ content: '❌ Error al procesar tu solicitud. Intenta de nuevo.' }).catch(() => {});
  }
}

