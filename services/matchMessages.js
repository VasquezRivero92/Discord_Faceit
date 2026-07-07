import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export async function updateLivePanel(client, channelId, db) {
  if (!channelId || channelId.startsWith('ID_')) return;
  if (!(await isFeatureEnabled('liveMatchPanel'))) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const activeMatches = await db.getActiveMatches();

    const embed = new EmbedBuilder()
      .setTitle('🟢 Panel de Partidas en Vivo')
      .setTimestamp()
      .setFooter({ text: 'Actualizado en tiempo real' });

    if (activeMatches.length === 0) {
      embed.setColor(0x555555)
        .setDescription('🟢 **No hay partidas activas en este momento.**\n\n¡Únete a la cola en Faceit para empezar a jugar!');
    } else {
      embed.setColor(0x00FF55);
      const descriptionLines = activeMatches.map((m, index) => {
        const timeStarted = `<t:${Math.floor(m.startedAt / 1000)}:R>`;
        return `**${index + 1}. [${m.faction1_name} vs ${m.faction2_name}](https://www.faceit.com/en/cs2/room/${m.id})**\n` +
          `🗺️ Mapa: \`${m.map}\` | 📍 Servidor: \`${m.location.toUpperCase()}\` | 🕒 Iniciada: ${timeStarted}\n`;
      });
      embed.setDescription(descriptionLines.join('\n'));
    }

    const config = await db.getPanelMessageConfig();
    let panelMessage = null;

    if (config && config.channelId === channelId) {
      try {
        panelMessage = await channel.messages.fetch(config.messageId);
      } catch (err) {
        logger.info('El mensaje del panel fue eliminado en Discord. Creando uno nuevo...');
      }
    }

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed] });
      logger.success('Panel de partidas en vivo actualizado.');
    } else {
      const newMessage = await channel.send({ embeds: [embed] });
      try { await newMessage.pin(); } catch (e) {
        logger.warn('No se pudo fijar el mensaje del panel:', e.message);
      }
      await db.setPanelMessageConfig(newMessage.id, channelId);
      logger.success('Nuevo panel de partidas en vivo creado y fijado.');
    }
  } catch (error) {
    logger.error('Error al actualizar el panel de partidas en vivo:', error);
  }
}

export function createMatchEmbed(matchData, type) {
  const mapName = matchData.voting?.map?.pick?.[0] || 'Votando...';
  const location = matchData.voting?.location?.pick?.[0] || 'Desconocido';
  const teams = matchData.teams || {};
  const faction1 = teams.faction1 || { roster: [] };
  const faction2 = teams.faction2 || { roster: [] };

  if (type === 'configuring') {
    return new EmbedBuilder()
      .setTitle('🎮 ¡Lobby de Partida Creado!')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xFFAA00)
      .setDescription('⚙️ Los capitanes están en fase de votación de mapa/servidor y selección de jugadores en Faceit...')
      .addFields(
        { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
        { name: '🎮 Juego', value: `\`${matchData.game.toUpperCase()}\``, inline: true }
      )
      .setTimestamp();
  }

  if (type === 'started') {
    return new EmbedBuilder()
      .setTitle('🎮 ¡Partida Iniciada en el Club!')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xFF6B00)
      .addFields(
        { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
        { name: '🗺️ Mapa', value: `\`${mapName}\``, inline: true },
        { name: '📍 Servidor', value: `\`${location.toUpperCase()}\``, inline: true }
      )
      .setTimestamp();
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
        scoreStr = `🏆 **${score.faction1}**  vs  ${score.faction2}`;
      } else if (winnerFaction === 'faction2') {
        scoreStr = `${score.faction1}  vs  🏆 **${score.faction2}**`;
      } else {
        scoreStr = `**${score.faction1}**  vs  **${score.faction2}**`;
      }
    }

    return new EmbedBuilder()
      .setTitle('🏁 Partida Finalizada')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0x10B981)
      .addFields(
        { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
        { name: '🗺️ Mapa', value: `\`${mapName}\``, inline: true },
        { name: '📊 Marcador', value: scoreStr, inline: true },
        { name: '🏆 Ganador', value: `🎉 **${winnerName}**`, inline: false }
      )
      .setTimestamp();
  }

  if (type === 'cancelled') {
    return new EmbedBuilder()
      .setTitle('❌ Partida Cancelada')
      .setURL(`https://www.faceit.com/en/cs2/room/${matchData.id}`)
      .setColor(0xEF4444)
      .setDescription('⚠️ Esta partida fue cancelada o abortada en Faceit.')
      .addFields(
        { name: '🌐 Club', value: `${matchData.entity_custom_name || 'Club'}`, inline: true },
        { name: '🗺️ Mapa', value: `\`${mapName}\``, inline: true },
        { name: '📍 Servidor', value: `\`${location.toUpperCase()}\``, inline: true }
      )
      .setTimestamp();
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
