import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { getEffectiveConfigForGuild } from '../config/index.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('crear_sala')
  .setDescription('Arma una sala de 10 jugadores de un canal de voz, los equilibra por ELO y crea canales temporales.')
  .addChannelOption(option =>
    option.setName('canal_voz')
      .setDescription('Canal de voz del cual extraer los 10 jugadores (opcional)')
      .addChannelTypes(ChannelType.GuildVoice)
      .setRequired(false)
  );

export async function execute(interaction, db) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const config = await getEffectiveConfigForGuild(interaction.guildId);
    const guild = interaction.guild;

    // 1. Obtener canal de voz de origen
    let targetChannel = interaction.options.getChannel('canal_voz');
    if (!targetChannel) {
      targetChannel = interaction.member.voice.channel;
    }
    if (!targetChannel && config.discordWaitingRoomChannelId) {
      targetChannel = await guild.channels.fetch(config.discordWaitingRoomChannelId).catch(() => null);
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      return interaction.editReply('❌ No se encontró ningún canal de voz de origen. Únete a uno o especifica un canal en las opciones del comando.');
    }

    // 2. Obtener miembros del canal
    const members = Array.from(targetChannel.members.values());
    if (members.length < 10) {
      return interaction.editReply(`❌ Se necesitan al menos 10 jugadores en el canal de voz **${targetChannel.name}** para armar la sala (actualmente hay ${members.length}).`);
    }

    // 3. Priorizar jugadores verificados e investigarlos en la BD
    const playerChecks = await Promise.all(
      members.map(async (member) => {
        const data = await db.getFullUser(member.id, interaction.guildId);
        if (data) {
          return {
            member,
            isLinked: true,
            faceitPlayerId: data.faceit_player_id,
            faceitNickname: data.faceit_nickname,
            faceitLevel: data.faceit_level || 3,
            faceitElo: data.faceit_elo || 1000
          };
        }
        return {
          member,
          isLinked: false,
          faceitPlayerId: null,
          faceitNickname: member.user.username,
          faceitLevel: 3,
          faceitElo: 1000
        };
      })
    );

    // Separar y priorizar
    const linkedPlayers = playerChecks.filter(p => p.isLinked);
    const unlinkedPlayers = playerChecks.filter(p => !p.isLinked);

    // Seleccionar exactamente 10 jugadores prioritarios
    const selectedPlayers = [...linkedPlayers, ...unlinkedPlayers].slice(0, 10);

    // 4. Algoritmo de equilibrio de ELO
    const balanceResult = balanceTeams(selectedPlayers);
    const { teamA, teamB, diff } = balanceResult;

    // 5. Crear canales de voz temporales
    const botId = interaction.client.user.id;
    const parentId = targetChannel.parentId;

    const permissionOverwrites1 = [
      { id: guild.id, deny: ['Connect'] },
      { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];
    const permissionOverwrites2 = [
      { id: guild.id, deny: ['Connect'] },
      { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
    ];

    for (const p of teamA) {
      permissionOverwrites1.push({ id: p.member.id, allow: ['Connect', 'Speak'] });
    }
    for (const p of teamB) {
      permissionOverwrites2.push({ id: p.member.id, allow: ['Connect', 'Speak'] });
    }

    const vc1 = await guild.channels.create({
      name: `🔊 Equipo A (Manual)`,
      type: ChannelType.GuildVoice,
      parent: parentId,
      permissionOverwrites: permissionOverwrites1,
      reason: 'Partida manual iniciada desde Discord'
    });

    const vc2 = await guild.channels.create({
      name: `🔊 Equipo B (Manual)`,
      type: ChannelType.GuildVoice,
      parent: parentId,
      permissionOverwrites: permissionOverwrites2,
      reason: 'Partida manual iniciada desde Discord'
    });

    // 6. Mover jugadores a los nuevos VCs
    const originalVoiceStates = {};
    for (const p of teamA) {
      if (p.member.voice.channel) {
        originalVoiceStates[p.member.id] = p.member.voice.channel.id;
        await p.member.voice.setChannel(vc1).catch(err => logger.warn(`Error al mover a ${p.member.user.tag}: ${err.message}`));
      }
    }
    for (const p of teamB) {
      if (p.member.voice.channel) {
        originalVoiceStates[p.member.id] = p.member.voice.channel.id;
        await p.member.voice.setChannel(vc2).catch(err => logger.warn(`Error al mover a ${p.member.user.tag}: ${err.message}`));
      }
    }

    // 7. Registrar en la Base de Datos
    const matchId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const matchesChannelId = config.discordMatchesChannelId;
    let messageId = null;

    if (matchesChannelId && !matchesChannelId.startsWith('ID_')) {
      const matchesChannel = await guild.channels.fetch(matchesChannelId).catch(() => null);
      if (matchesChannel) {
        const team1List = teamA.map(p => `• <@${p.member.id}> [${p.faceitNickname}] (Lvl ${p.faceitLevel})`).join('\n');
        const team2List = teamB.map(p => `• <@${p.member.id}> [${p.faceitNickname}] (Lvl ${p.faceitLevel})`).join('\n');

        const startedEmbed = new EmbedBuilder()
          .setTitle('🎮 ¡Partida Manual Iniciada!')
          .setColor(0x00FF55)
          .setDescription(`Iniciada por <@${interaction.user.id}> desde Discord.`)
          .addFields(
            { name: '🌐 Origen', value: 'Discord Bot', inline: true },
            { name: '🗺️ Mapa', value: '`Manual`', inline: true },
            { name: '📍 Servidor', value: '`Manual`', inline: true },
            { name: '👥 Equipo A', value: team1List, inline: true },
            { name: '👥 Equipo B', value: team2List, inline: true }
          )
          .setFooter({ text: 'Usa los botones para reportar el resultado de la partida' })
          .setTimestamp();

        const winA = new ButtonBuilder()
          .setCustomId(`manual_match_win_a_${matchId}`)
          .setLabel('Ganó Equipo A')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const winB = new ButtonBuilder()
          .setCustomId(`manual_match_win_b_${matchId}`)
          .setLabel('Ganó Equipo B')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const cancel = new ButtonBuilder()
          .setCustomId(`manual_match_cancel_${matchId}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(winA, winB, cancel);

        const msg = await matchesChannel.send({ embeds: [startedEmbed], components: [row] }).catch(err => logger.error('Error enviando anuncio de partida:', err));
        if (msg) messageId = msg.id;
      }
    }

    if (messageId) {
      const messageUrl = `https://discord.com/channels/${guild.id}/${matchesChannelId}/${messageId}`;
      
      // Enviar DMs a los jugadores del Equipo A
      for (const p of teamA) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎮 ¡Tu partida ha comenzado!')
            .setDescription(`Has sido asignado al **Equipo A** para esta partida manual.`)
            .setColor(0x15C253)
            .addFields(
              { name: '🔊 Canal de Voz', value: `<#${vc1.id}>`, inline: true },
              { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
            )
            .setTimestamp();
          await p.member.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (e) {
          logger.warn(`No se pudo enviar DM a ${p.member.user.tag}: ${e.message}`);
        }
      }

      // Enviar DMs a los jugadores del Equipo B
      for (const p of teamB) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎮 ¡Tu partida ha comenzado!')
            .setDescription(`Has sido asignado al **Equipo B** para esta partida manual.`)
            .setColor(0xFF3E3E)
            .addFields(
              { name: '🔊 Canal de Voz', value: `<#${vc2.id}>`, inline: true },
              { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
            )
            .setTimestamp();
          await p.member.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (e) {
          logger.warn(`No se pudo enviar DM a ${p.member.user.tag}: ${e.message}`);
        }
      }
    }

    const matchData = {
      entity_custom_name: 'Manual / Discord',
      game: 'cs2',
      voting: { map: { pick: ['Manual'] }, location: { pick: ['Manual'] } },
      teams: { faction1: { name: 'Equipo A' }, faction2: { name: 'Equipo B' } },
      creator_id: interaction.user.id
    };

    const rosterA = teamA.map(p => ({ player_id: p.faceitPlayerId || p.member.id, nickname: p.faceitNickname }));
    const rosterB = teamB.map(p => ({ player_id: p.faceitPlayerId || p.member.id, nickname: p.faceitNickname }));

    await db.addActiveMatch(matchId, matchData, vc1.id, vc2.id, messageId, rosterA, rosterB, originalVoiceStates, interaction.guildId);
    
    if (matchesChannelId && !matchesChannelId.startsWith('ID_')) {
      await updateLivePanel(interaction.client, matchesChannelId, db);
    }

    logger.success(`Partida manual ${matchId} iniciada desde Discord por ${interaction.user.tag}`);
    await interaction.editReply(`✅ **¡Sala creada con éxito!** Se crearon los canales temporales y se reubicó a los 10 jugadores. Canal de anuncios: <#${matchesChannelId}>`);

  } catch (err) {
    logger.error('Error al ejecutar /crear_sala:', err);
    await interaction.editReply('❌ Ocurrió un error al intentar crear la sala.');
  }
}

// Algoritmo matemático de balance de ELO
function balanceTeams(players) {
  let bestDiff = Infinity;
  let bestTeamA = [];
  let bestTeamB = [];

  const combinations = [];
  function getCombinations(start, combo) {
    if (combo.length === 5) {
      combinations.push([...combo]);
      return;
    }
    for (let i = start; i < 10; i++) {
      combo.push(i);
      getCombinations(i + 1, combo);
      combo.pop();
    }
  }
  getCombinations(0, []);

  for (const indicesA of combinations) {
    const setA = new Set(indicesA);
    const tempA = [];
    const tempB = [];
    let eloA = 0;
    let eloB = 0;

    for (let i = 0; i < 10; i++) {
      if (setA.has(i)) {
        tempA.push(players[i]);
        eloA += players[i].faceitElo;
      } else {
        tempB.push(players[i]);
        eloB += players[i].faceitElo;
      }
    }

    const diff = Math.abs(eloA - eloB);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTeamA = tempA;
      bestTeamB = tempB;
    }
  }

  return { teamA: bestTeamA, teamB: bestTeamB, diff: bestDiff };
}
