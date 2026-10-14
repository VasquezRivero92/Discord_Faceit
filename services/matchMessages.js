import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export async function updateLivePanel(client, channelId, db, filterQueueId = null) {
  if (!channelId || channelId.startsWith('ID_')) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const guildId = channel.guild?.id || channel.guildId;
    if (!(await isFeatureEnabled('liveMatchPanel', guildId))) return;

    if (channel.guild && channel.permissionsFor) {
      const me = channel.guild.members.me || channel.guild.members.cache.get(client.user.id);
      if (me) {
        const permissions = channel.permissionsFor(me);
        if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
          logger.error(`Error al actualizar el panel de partidas en vivo: El bot no tiene permiso para VER el canal (ViewChannel) con ID ${channelId}.`);
          return;
        }
        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
          logger.error(`Error al actualizar el panel de partidas en vivo: El bot no tiene permiso para ENVIAR MENSAJES (SendMessages) en el canal con ID ${channelId}.`);
          return;
        }
        if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
          logger.error(`Error al actualizar el panel de partidas en vivo: El bot no tiene permiso para INSERTAR ENLACES (EmbedLinks) en el canal con ID ${channelId}.`);
          return;
        }
      }
    }

    let activeMatches = await db.getActiveMatches();
    if (guildId) {
      activeMatches = activeMatches.filter(m => m.guild_id === guildId);
    }
    if (filterQueueId) {
      activeMatches = activeMatches.filter(m => m.queue_id === filterQueueId);
    }

    const embed = new EmbedBuilder()
      .setTitle('🟢 Panel de Partidas en Vivo')
      .setTimestamp()
      .setFooter({ text: 'Actualizado en tiempo real' });

    const mixtonEnabled = await isFeatureEnabled('command_mixton_listo', guildId).catch(() => true);
    
    let description = '';
    if (activeMatches.length === 0) {
      description = '🟢 **No hay partidas activas en este momento.**\n\n';
    } else {
      embed.setColor(0x00FF55);
      const descriptionLines = activeMatches.map((m, index) => {
        const timeStarted = `<t:${Math.floor(m.startedAt / 1000)}:R>`;
        const queueTag = m.queue_name ? `🎯 Cola: \`${m.queue_name}\` | ` : '';
        return `**${index + 1}. [${m.faction1_name} vs ${m.faction2_name}](https://www.faceit.com/en/cs2/room/${m.id})**\n` +
          `${queueTag}🗺️ Mapa: \`${m.map}\` | 📍 Servidor: \`${m.location.toUpperCase()}\` | 🕒 Iniciada: ${timeStarted}\n`;
      });
      description = descriptionLines.join('\n') + '\n';
    }

    if (mixtonEnabled) {
      description += '\n📝 **Cola de Mixton**:\n' +
        '• Presiona **Listo para Mixton** para aparecer disponible para ser seleccionado para jugar en las partidas.\n' +
        '• Presiona **Salir de Mixton** para lo contrario (quitarte de la lista de listos).';
    } else {
      description += '¡Únete a la cola en Faceit para empezar a jugar!';
    }
    embed.setDescription(description);

    if (activeMatches.length === 0) {
      embed.setColor(0x555555);
    }

    const components = [];
    if (mixtonEnabled) {
      const mixtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mixton_listo_btn')
          .setLabel('Listo para Mixton')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎮'),
        new ButtonBuilder()
          .setCustomId('mixton_no_listo_btn')
          .setLabel('Salir de Mixton')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );
      components.push(mixtonRow);
    }

    const config = await db.getPanelMessageConfig(guildId);
    let panelMessage = null;

    if (config && config.channelId === channelId) {
      try {
        panelMessage = await channel.messages.fetch(config.messageId);
      } catch (err) {
        logger.info('El mensaje del panel fue eliminado en Discord. Creando uno nuevo...');
      }
    }

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed], components });
      logger.success('Panel de partidas en vivo actualizado con botones de mixton.');
    } else {
      const newMessage = await channel.send({ embeds: [embed], components });
      try { await newMessage.pin(); } catch (e) {
        logger.warn('No se pudo fijar el mensaje del panel:', e.message);
      }
      await db.setPanelMessageConfig(newMessage.id, channelId, guildId);
      logger.success('Nuevo panel de partidas en vivo creado y fijado con botones de mixton.');
    }
  } catch (error) {
    if (error.code === 50013) {
      logger.error(`Error al actualizar el panel de partidas en vivo: Falta de permisos (Missing Permissions). Asegúrate de que el bot tenga los permisos de Ver Canal, Enviar Mensajes, e Insertar Enlaces (Embed Links) en el canal con ID ${channelId}.`);
    } else {
      logger.error('Error al actualizar el panel de partidas en vivo:', error);
    }
  }
}

const MAP_DETAILS = {
  de_dust2: { name: 'Dust II', emoji: '🏜️', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_dust2.png' },
  de_mirage: { name: 'Mirage', emoji: '🏛️', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_mirage.png' },
  de_inferno: { name: 'Inferno', emoji: '🔥', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_inferno.png' },
  de_nuke: { name: 'Nuke', emoji: '☢️', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_nuke.png' },
  de_ancient: { name: 'Ancient', emoji: '🗿', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_ancient.png' },
  de_anubis: { name: 'Anubis', emoji: '🐍', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_anubis.png' },
  de_vertigo: { name: 'Vertigo', emoji: '🏗️', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_vertigo.png' },
  de_train: { name: 'Train', emoji: '🚂', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_train.png' },
  de_overpass: { name: 'Overpass', emoji: '🌉', image: 'https://assets.faceit-cdn.net/third_party/games/cs2/maps/de_overpass.png' },
};

export function formatMapDisplay(mapRaw) {
  if (!mapRaw || mapRaw === 'Votando...') return '`Votando...`';
  const key = mapRaw.toLowerCase();
  const info = MAP_DETAILS[key];
  if (info) {
    return `${info.emoji} **${info.name}** (\`${mapRaw}\`)`;
  }
  return `🗺️ \`${mapRaw}\``;
}

export function getMapThumbnailUrl(mapRaw) {
  if (!mapRaw || mapRaw === 'Votando...') return null;
  const key = mapRaw.toLowerCase();
  if (MAP_DETAILS[key]) {
    return MAP_DETAILS[key].image;
  }
  return `https://assets.faceit-cdn.net/third_party/games/cs2/maps/${key}.png`;
}

export function formatLocationDisplay(locationRaw) {
  if (!locationRaw || locationRaw === 'Desconocido') return '`Desconocido`';
  const loc = locationRaw.toLowerCase();
  if (loc.includes('peru') || loc.includes('lima')) return '🇵🇪 **Perú**';
  if (loc.includes('santiago') || loc.includes('chile')) return '🇨🇱 **Santiago**';
  if (loc.includes('buenos') || loc.includes('argentina') || loc.includes('ba')) return '🇦🇷 **Buenos Aires**';
  if (loc.includes('paulo') || loc.includes('brasil') || loc.includes('br')) return '🇧🇷 **São Paulo**';
  if (loc.includes('bogota') || loc.includes('colombia')) return '🇨🇴 **Bogotá**';
  return `📍 **${locationRaw.toUpperCase()}**`;
}

export function createMatchEmbed(matchData, type, queueInfo = null) {
  const mapName = matchData.voting?.map?.pick?.[0] || 'Votando...';
  const location = matchData.voting?.location?.pick?.[0] || 'Desconocido';
  const teams = matchData.teams || {};
  const faction1 = teams.faction1 || { roster: [] };
  const faction2 = teams.faction2 || { roster: [] };
  const queueName = queueInfo?.queueName || queueInfo?.name || matchData.queue_name || null;

  const faceitIcon = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

  if (type === 'configuring') {
    const embed = new EmbedBuilder()
      .setTitle('⚙️ ¡Lobby de Partida Creado!')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xFF9900)
      .setDescription(
        `> ⚙️ **Fase de Votación y Selección**\n` +
        `> Los capitanes están seleccionando mapa, servidor y alineación en FACEIT.\n\n` +
        `🔗 **[Ver Sala de Partida en FACEIT](https://www.faceit.com/en/cs2/room/${matchData.id})**`
      );

    const fields = [
      { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
      { name: '🎮 Juego', value: `\`${(matchData.game || 'cs2').toUpperCase()}\``, inline: true },
      { name: '📌 Estado', value: '`⚙️ Configurando`', inline: true }
    ];

    if (queueName) {
      fields.push({ name: '🎯 Cola', value: `\`${queueName}\``, inline: true });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `FACEIT Match System • En Configuración${queueName ? ` • ${queueName}` : ''}`, iconURL: faceitIcon })
      .setTimestamp();

    const mapThumb = getMapThumbnailUrl(mapName);
    if (mapThumb) embed.setThumbnail(mapThumb);

    return embed;
  }

  if (type === 'started') {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ ¡Partida Iniciada en el Club!')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xFF5500)
      .setDescription(
        `> 💥 **¡La batalla ha comenzado!** Los equipos ya se encuentran compitiendo en el servidor.\n\n` +
        `🔗 **[Unirse / Ver Sala en FACEIT](https://www.faceit.com/en/cs2/room/${matchData.id})**`
      );

    const fields = [
      { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
      { name: '🗺️ Mapa', value: formatMapDisplay(mapName), inline: true },
      { name: '📍 Servidor', value: formatLocationDisplay(location), inline: true }
    ];

    if (queueName) {
      fields.push({ name: '🎯 Cola', value: `\`${queueName}\``, inline: true });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `FACEIT Match System • Partida en Curso${queueName ? ` • ${queueName}` : ''}`, iconURL: faceitIcon })
      .setTimestamp();

    const mapThumb = getMapThumbnailUrl(mapName);
    if (mapThumb) embed.setThumbnail(mapThumb);

    return embed;
  }

  if (type === 'finished') {
    const results = matchData.results || {};
    const winnerFaction = results.winner;
    const score = results.score || {};
    let winnerName = 'Empate';
    if (winnerFaction === 'faction1') winnerName = faction1.name || 'Equipo A';
    else if (winnerFaction === 'faction2') winnerName = faction2.name || 'Equipo B';

    let scoreStr = 'N/D';
    if (score.faction1 !== undefined && score.faction2 !== undefined) {
      if (winnerFaction === 'faction1') {
        scoreStr = `🏆 **${score.faction1}**  -  ${score.faction2}`;
      } else if (winnerFaction === 'faction2') {
        scoreStr = `${score.faction1}  -  🏆 **${score.faction2}**`;
      } else {
        scoreStr = `**${score.faction1}**  -  **${score.faction2}**`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🏁 Partida Finalizada')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0x10B981)
      .setDescription(
        `> 🏆 **¡Partida concluida con éxito!**\n\n` +
        `🔗 **[Ver Estadísticas de la Partida en FACEIT](https://www.faceit.com/en/cs2/room/${matchData.id})**`
      );

    const fields = [
      { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
      { name: '🗺️ Mapa', value: formatMapDisplay(mapName), inline: true },
      { name: '📊 Marcador', value: scoreStr, inline: true },
      { name: '🏆 Ganador', value: `🎉 **${winnerName}**`, inline: false }
    ];

    if (queueName) {
      fields.push({ name: '🎯 Cola', value: `\`${queueName}\``, inline: true });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `FACEIT Match System • Partida Concluida${queueName ? ` • ${queueName}` : ''}`, iconURL: faceitIcon })
      .setTimestamp();

    const mapThumb = getMapThumbnailUrl(mapName);
    if (mapThumb) embed.setThumbnail(mapThumb);

    return embed;
  }

  if (type === 'cancelled') {
    const reasonRaw = matchData.reason || matchData.cancel_reason || matchData.status_reason || '';
    let cancelReasonText = 'Esta partida fue cancelada o abortada en FACEIT.';
    if (reasonRaw) {
      if (reasonRaw.toLowerCase().includes('checkin')) cancelReasonText = 'Cancelada por falla en la confirmación (Check-in fallido).';
      else if (reasonRaw.toLowerCase().includes('afk') || reasonRaw.toLowerCase().includes('leaver')) cancelReasonText = 'Cancelada por jugador AFK / no conectado a tiempo.';
      else if (reasonRaw.toLowerCase().includes('cancelled_by_user') || reasonRaw.toLowerCase().includes('veto_aborted')) cancelReasonText = 'Cancelada manualmente por capitán / Veto abortado.';
    }

    const embed = new EmbedBuilder()
      .setTitle('❌ Partida Cancelada')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xEF4444)
      .setDescription(
        `> ⚠️ **${cancelReasonText}**\n\n` +
        `🔗 **[Ver Detalles de la Sala en FACEIT](https://www.faceit.com/en/cs2/room/${matchData.id})**`
      );

    const fields = [
      { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
      { name: '🗺️ Mapa', value: formatMapDisplay(mapName), inline: true },
      { name: '📍 Servidor', value: formatLocationDisplay(location), inline: true }
    ];

    if (queueName) {
      fields.push({ name: '🎯 Cola', value: `\`${queueName}\``, inline: true });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `FACEIT Match System • Partida Cancelada${queueName ? ` • ${queueName}` : ''}`, iconURL: faceitIcon })
      .setTimestamp();

    const mapThumb = getMapThumbnailUrl(mapName);
    if (mapThumb) embed.setThumbnail(mapThumb);

    return embed;
  }

  return null;
}
async function getLatestCs2Patch() {
  try {
    const res = await fetch('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=730&count=10');
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.appnews?.newsitems || [];
    // Buscar la última noticia que tenga el tag "patchnotes"
    const patch = items.find(item => item.tags && item.tags.includes('patchnotes'));
    if (patch) {
      return {
        title: patch.title,
        timestamp: patch.date, // Unix timestamp en segundos
      };
    }
  } catch (err) {
    logger.error('Error al obtener la versión del parche de Steam:', err.message);
  }
  return null;
}

export async function createServerStatusEmbed(location, game = 'cs2') {
  const servers = [
    { name: 'Lima', flag: '🇵🇪', key: 'lima' },
    { name: 'Santiago', flag: '🇨🇱', key: 'santiago' },
    { name: 'Buenos Aires', flag: '🇦🇷', key: 'buenos' },
    { name: 'São Paulo', flag: '🇧🇷', key: 'paulo' },
  ];

  const serverStatusLines = servers.map(srv => {
    const isCurrent = location.toLowerCase().includes(srv.key);
    const highlight = isCurrent ? ' 👈 **(Jugando aquí 🎮)**' : '';
    return `${srv.flag} **${srv.name}**: 🟢 Operational${highlight}`;
  });

  const gameDisplay = game ? game.toUpperCase() : 'CS2';

  let patchInfoLine = '';
  if (gameDisplay === 'CS2' || gameDisplay === 'CSGO') {
    const patchInfo = await getLatestCs2Patch();
    if (patchInfo && patchInfo.timestamp) {
      patchInfoLine = `\n🛠️ **Último parche:** <t:${patchInfo.timestamp}:f> (<t:${patchInfo.timestamp}:R>)`;
    }
  }

  return new EmbedBuilder()
    .setTitle('FACEIT Status')
    .setURL('https://www.faceitstatus.com/')
    .setColor(0x00FF55)
    .setDescription(`🟢 **All FACEIT systems are operational**\n\n🎮 **Juego en vivo:** \`${gameDisplay}\`${patchInfoLine}`)
    .addFields(
      { name: 'Statuses', value: '🟢 **FACEIT API**: Operational\n🟢 **LiveChat Service**: Operational\n🟢 **Steam API**: Operational\n🟢 **Steam Sessions**: Normal\n🟢 **Steam Community**: Normal', inline: true },
      { name: 'Status', value: 'Operational\nOperational\nOperational\nNormal\nNormal', inline: true }
    )
    .addFields({
      name: '⚡ LATAM Servers Status',
      value: serverStatusLines.join('\n'),
      inline: false,
    })
    .setTimestamp();
}

export function createWelcomeEmbed(member, clubUrl, linkChannelMention, templates = {}) {
  const title = templates.welcomeTitle || '¡Bienvenido al Servidor! 🎉';
  let description = templates.welcomeDescription || 
    `¡Hola **{username}**! Gracias por unirte a nuestra comunidad.\n\n` +
    `Aquí tienes una **guía rápida** para unirte y verificar tu cuenta de **Faceit**:\n\n` +
    `📌 **PASO 1: Únete al Club**\n` +
    `Haz clic en el siguiente enlace y únete a nuestro club oficial en la plataforma:\n` +
    `🔗 **[Hacer clic aquí para Unirse al Club]({clubUrl})**\n\n` +
    `📌 **PASO 2: Obtén tu Nickname de Faceit**\n` +
    `Asegúrate de copiar tu nombre de usuario exacto tal y como aparece en tu perfil de Faceit.\n\n` +
    `📌 **PASO 3: Vincula tu cuenta en Discord**\n` +
    `Ve al canal de Discord {linkChannelMention} y escribe el comando:\n` +
    `➡️ \`/verificar_fc\`\n\n` +
    `El bot te pedirá tu nickname de Faceit. Escríbelo, presiona enviar y ¡listo! Tus roles de nivel y del Club se actualizarán automáticamente.\n\n` +
    `¡Nos vemos en el servidor y buena suerte en tus partidas! 🎮`;

  description = description
    .replace(/{username}/g, member.user.username)
    .replace(/{clubUrl}/g, clubUrl)
    .replace(/{linkChannelMention}/g, linkChannelMention);

  const colorStr = templates.welcomeColor || '#FF5500';
  let color = parseInt(colorStr.replace('#', '0x'), 16);
  if (isNaN(color)) color = 0xFF5500;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

