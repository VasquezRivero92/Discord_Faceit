import { Router } from 'express';
import admin from 'firebase-admin';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { verifyUserToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfig, getEffectiveConfigForGuild } from '../config/index.js';
import { updateLivePanel } from '../services/matchMessages.js';
import { updateMixtonReadyPanel } from '../services/mixtonPanel.js';
import { invalidateSettingsCache } from '../utils/featureFlags.js';
import { EventEmitter } from 'events';
import { fetchFaceitPlayerById } from '../services/faceitApi.js';
import { crearLobbyMatchmaking, steamClient } from '../steamBot.js';
import { playTTSCountdown } from '../utils/voiceAnnouncer.js';
import { culqiService } from '../services/culqiService.js';

export const mixtonEvents = new EventEmitter();

export function createLobbyRouter(client, db, config, wss) {
  const router = Router();
  const { ADMIN_JWT_SECRET, DISCORD_GUILD_ID } = config;
  const requireAuth = verifyUserToken(ADMIN_JWT_SECRET);

  // Middleware to attach guildId to req
  router.use((req, res, next) => {
    req.guildId = req.query.guildId || req.body.guildId || req.headers['x-guild-id'] || null;
    next();
  });

  const verifyGuildAdmin = (req, res, next) => {
    const isAllowedAdmin = req.user?.role === 'global_admin' || req.user?.role === 'admin' || req.user?.isAdmin === true;
    if (!isAllowedAdmin) {
      return res.status(403).json({ error: 'Se requieren permisos de administrador.' });
    }

    if (req.user?.role === 'admin') {
      if (req.guildId && req.guildId !== req.user.servidor) {
        return res.status(403).json({ error: 'No tienes permisos para gestionar este servidor.' });
      }
      req.guildId = req.user.servidor;
    }
    next();
  };

  const verifyGuildAccess = (req, res, next) => {
    if (req.user?.role === 'admin') {
      if (req.guildId && req.guildId !== req.user.servidor) {
        return res.status(403).json({ error: 'No tienes permisos para acceder a este servidor.' });
      }
      req.guildId = req.user.servidor;
    }
    next();
  };

  // In-memory cache for Discord user details to avoid slow API round-trips
  const discordUserCache = new Map();

  let cachedGuild = null;
  async function getGuild() {
    if (cachedGuild) return cachedGuild;
    cachedGuild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!cachedGuild) {
      cachedGuild = await client.guilds.fetch(DISCORD_GUILD_ID).catch(() => null);
    }
    return cachedGuild;
  }

  async function getDiscordUserDetails(guild, discordId) {
    if (!discordId) return null;
    if (discordUserCache.has(discordId)) {
      return discordUserCache.get(discordId);
    }
    if (!guild) return null;
    try {
      let member = guild.members.cache.get(discordId);
      if (member) {
        const details = {
          username: member.user.username,
          displayName: member.displayName,
          avatarURL: member.user.displayAvatarURL({ size: 128 })
        };
        discordUserCache.set(discordId, details);
        db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
        return details;
      }

      // No está en caché local de Discord. Lanzamos el fetch en segundo plano.
      const backgroundFetch = guild.members.fetch(discordId)
        .then(m => {
          if (m) {
            const details = {
              username: m.user.username,
              displayName: m.displayName,
              avatarURL: m.user.displayAvatarURL({ size: 128 })
            };
            discordUserCache.set(discordId, details);
            db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
            return details;
          }
          return null;
        })
        .catch(() => {
          discordUserCache.set(discordId, null);
          return null;
        });

      // Carrera de 800ms para no congelar la petición al usuario
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 800));
      const details = await Promise.race([backgroundFetch, timeoutPromise]);
      if (details) {
        return details;
      }

      // Si tardó más de 800ms, intentamos con la caché del cliente Discord
      const globalUser = client.users.cache.get(discordId);
      if (globalUser) {
        const details = {
          username: globalUser.username,
          displayName: globalUser.globalName || globalUser.username,
          avatarURL: globalUser.displayAvatarURL({ size: 128 })
        };
        discordUserCache.set(discordId, details);
        db.updateDiscordDetailsInDb(discordId, details, guild.id).catch(() => {});
        return details;
      }

      // Retornar datos temporales mientras la promesa en segundo plano sigue descargando
      return {
        username: 'usuario_discord',
        displayName: 'Usuario Discord',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    } catch (err) {
      logger.warn(`Error fetching Discord details for user ${discordId}: ${err.message}`);
      discordUserCache.set(discordId, null);
    }
    return null;
  }

  async function getLobbyData(guildId = null) {
    const effectiveGuildId = guildId || DISCORD_GUILD_ID;
    const state = await db.getMixtonLobbyState(effectiveGuildId);
    const settings = await db.getGuildSettings(effectiveGuildId).catch(() => ({}));
    const commandEnabled = settings.command_mixton_listo !== false;

    const allReadyPlayers = await db.getReadyPlayers();
    const readyPlayers = allReadyPlayers.filter(p => p.mixton_guild_id === effectiveGuildId);

    const guild = client.guilds.cache.get(effectiveGuildId) || await client.guilds.fetch(effectiveGuildId).catch(() => null);
    const guildName = guild ? guild.name : 'Mixton Arena';

    // Encontrar todos los discordIds ocupados
    const occupiedIds = new Set();
    state.teams.forEach(team => {
      if (team.captain && team.captain.discordId) {
        occupiedIds.add(team.captain.discordId);
      }
      if (Array.isArray(team.players)) {
        team.players.forEach(p => {
          if (p && p.discordId) {
            occupiedIds.add(p.discordId);
          }
        });
      }
    });

    const availablePlayers = { S: [], A: [], B: [], C: [] };

    const playerPromises = readyPlayers.map(async (player) => {
      const discordId = player.discordId;
      if (occupiedIds.has(discordId)) return null;

      let discordUser = null;
      const playerGuildId = player.mixton_guild_id || DISCORD_GUILD_ID;
      let playerGuild = null;
      if (playerGuildId && typeof playerGuildId === 'string' && playerGuildId.trim() !== '') {
        playerGuild = client.guilds.cache.get(playerGuildId) || await client.guilds.fetch(playerGuildId).catch(() => null);
      }
      if (playerGuild) {
        discordUser = await getDiscordUserDetails(playerGuild, discordId);
      }
      if ((!discordUser || discordUser.username === 'usuario_discord') && player.discord_avatar) {
        discordUser = {
          username: player.discord_username || 'usuario_discord',
          displayName: player.discord_displayName || player.faceit_nickname || 'Usuario Discord',
          avatarURL: player.discord_avatar
        };
      }

      return {
        ...player,
        discordUser
      };
    });

    const resolvedPlayers = (await Promise.all(playerPromises)).filter(Boolean);

    resolvedPlayers.forEach(playerObj => {
      const overrideTier = playerObj.mixton_tier_override;
      if (overrideTier === 'S' || overrideTier === 'A' || overrideTier === 'B' || overrideTier === 'C') {
        availablePlayers[overrideTier].push(playerObj);
      } else {
        const lvl = parseInt(playerObj.faceit_level) || 1;
        if (lvl === 10) {
          availablePlayers.S.push(playerObj);
        } else if (lvl === 8 || lvl === 9) {
          availablePlayers.A.push(playerObj);
        } else if (lvl >= 5 && lvl <= 7) {
          availablePlayers.B.push(playerObj);
        } else {
          availablePlayers.C.push(playerObj);
        }
      }
    });

    // Ordenar por ELO desc
    Object.keys(availablePlayers).forEach(tier => {
      availablePlayers[tier].sort((a, b) => (b.faceit_elo || 1000) - (a.faceit_elo || 1000));
    });

    return { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId };
  }

  async function broadcastLobbyState(guildId = null) {
    if (!wss) return;
    try {
      const { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId } = await getLobbyData(guildId);
      const payload = JSON.stringify({
        type: 'state_update',
        data: {
          state,
          availablePlayers,
          commandEnabled,
          guildName,
          guildId: effectiveGuildId
        }
      });

      let sentCount = 0;
      wss.clients.forEach(c => {
        if (c.readyState === 1 && (c.guildId === effectiveGuildId || (!c.guildId && effectiveGuildId === DISCORD_GUILD_ID))) {
          c.send(payload);
          sentCount++;
        }
      });
      logger.info(`Estado mixton actualizado en tiempo real para guild ${effectiveGuildId}. Clientes notificados: ${sentCount}.`);
    } catch (err) {
      logger.error('Error al difundir el estado mixton a través de WebSockets:', err);
    }
  }

  // Escuchar actualizaciones internas del lobby para relanzar la difusión
  mixtonEvents.on('update', (guildId) => {
    broadcastLobbyState(guildId).catch(() => {});
    updateMixtonReadyPanel(client, guildId, db).catch(() => {});
  });

  if (wss) {
    wss.on('connection', async (ws, req) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const guildId = url.searchParams.get('guildId') || null;
        ws.guildId = guildId;

        const { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId } = await getLobbyData(guildId);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'state_update',
            data: { state, availablePlayers, commandEnabled, guildName, guildId: effectiveGuildId }
          }));
        }
      } catch (err) {
        logger.error('Error al enviar estado inicial de WebSocket:', err);
      }
    });
  }

  // --- Información del usuario autenticado ---
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // --- Lista de servidores (Guilds) para administrador ---
  router.get('/guilds', requireAuth, async (req, res) => {
    try {
      const isAllowed = req.user?.role === 'global_admin' || req.user?.role === 'admin' || req.user?.isAdmin === true;
      if (!isAllowed) {
        return res.status(403).json({ error: 'Se requieren permisos de administrador.' });
      }
      let guilds = client.guilds.cache.map(g => ({
        id: g.id,
        name: g.name
      }));

      if (req.user?.role === 'admin') {
        guilds = guilds.filter(g => g.id === req.user.servidor);
      }

      res.json({ guilds });
    } catch (err) {
      logger.error('Error al obtener servidores:', err);
      res.status(500).json({ error: 'Error al obtener servidores.' });
    }
  });

  // --- Lista de todos los usuarios verificados (con datos de Discord) ---
  router.get('/users', requireAuth, async (req, res) => {
    try {
      const snapshot = await db._firestore.collection('faceit_users').get();
      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : DISCORD_GUILD_ID;
      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      if (guild) {
        await guild.members.fetch().catch(() => null);
      }

      const users = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (req.user?.role === 'admin') {
          const userGuild = data.servidor || data.mixton_guild_id || null;
          if (userGuild !== req.user.servidor) {
            return;
          }
        }

        let discordUser = null;
        if (guild) {
          const member = guild.members.cache.get(doc.id);
          if (member) {
            discordUser = {
              username: member.user.username,
              displayName: member.displayName,
              avatarURL: member.user.displayAvatarURL({ size: 128 })
            };
          }
        }

        users.push({
          discordId: doc.id,
          faceit_player_id: data.faceit_player_id || '',
          faceit_nickname: data.faceit_nickname || '',
          faceit_level: data.faceit_level || 1,
          faceit_elo: data.faceit_elo || 1000,
          discordUser
        });
      });

      res.json({ users });
    } catch (err) {
      logger.error('Error al obtener usuarios para el lobby:', err);
      res.status(500).json({ error: 'Error al obtener usuarios verificados.' });
    }
  });

  // --- Crear partida manual desde la web ---
  router.post('/create-match', requireAuth, async (req, res) => {
    try {
      const { teamA, teamB } = req.body;

      if (!Array.isArray(teamA) || teamA.length !== 5 || !Array.isArray(teamB) || teamB.length !== 5) {
        return res.status(400).json({ error: 'Debes proporcionar exactamente dos equipos de 5 jugadores cada uno.' });
      }

      const targetGuildId = (req.user?.role === 'admin') ? req.user.servidor : (req.guildId || DISCORD_GUILD_ID);
      const effectiveConfig = await getEffectiveConfigForGuild(targetGuildId);
      const matchesChannelId = effectiveConfig.discordMatchesChannelId;
      if (!matchesChannelId || matchesChannelId.startsWith('ID_')) {
        return res.status(500).json({ error: 'El canal de anuncios de partidas no está configurado.' });
      }

      const guild = targetGuildId ? await client.guilds.fetch(targetGuildId).catch(() => null) : null;
      if (!guild) {
        return res.status(500).json({ error: 'No se pudo acceder al servidor de Discord.' });
      }

      // Validar y obtener perfiles de todos los jugadores en la base de datos
      const allPlayerIds = [...teamA, ...teamB];
      const playerProfiles = {};

      for (const discordId of allPlayerIds) {
        const data = await db.getFullUser(discordId, req.guildId);
        if (!data) {
          return res.status(400).json({ error: `El jugador con Discord ID ${discordId} no está registrado/verificado.` });
        }
        if (req.user?.role === 'admin') {
          const playerGuild = data.servidor || data.mixton_guild_id || null;
          if (playerGuild !== req.user.servidor) {
            return res.status(400).json({ error: `El jugador con Discord ID ${discordId} no pertenece a tu servidor de Discord.` });
          }
        }
        playerProfiles[discordId] = data;
      }

      // Definir los roster correspondientes
      const teamAPlayerData = teamA.map(id => ({
        discordId: id,
        faceit_player_id: playerProfiles[id].faceit_player_id,
        faceit_nickname: playerProfiles[id].faceit_nickname,
        faceit_level: playerProfiles[id].faceit_level || 3,
        faceit_elo: playerProfiles[id].faceit_elo || 1000
      }));

      const teamBPlayerData = teamB.map(id => ({
        discordId: id,
        faceit_player_id: playerProfiles[id].faceit_player_id,
        faceit_nickname: playerProfiles[id].faceit_nickname,
        faceit_level: playerProfiles[id].faceit_level || 3,
        faceit_elo: playerProfiles[id].faceit_elo || 1000
      }));

      // 1. Canales de voz temporales
      let waitingRoomId = null;
      if (effectiveConfig.discordWaitingRoomChannelId) {
        const ids = effectiveConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (!waitingRoomId) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackVC = channels.find(ch => ch.type === 2 && (ch.name.toLowerCase() === 'sala-de-espera' || ch.name.toLowerCase() === 'waiting-room' || ch.name.toLowerCase() === 'general'));
          if (fallbackVC) {
            waitingRoomId = fallbackVC.id;
          }
        }
      }

      let parentId = null;
      if (waitingRoomId) {
        const waitingRoom = await guild.channels.fetch(waitingRoomId).catch(() => null);
        if (waitingRoom) parentId = waitingRoom.parentId;
      }

      const botId = client.user.id;
      const permissionOverwrites1 = [
        { id: guild.id, deny: ['Connect'] },
        { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];
      const permissionOverwrites2 = [
        { id: guild.id, deny: ['Connect'] },
        { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];

      if (effectiveConfig?.discordMatchAccessRoleId) {
        permissionOverwrites1.push({ id: effectiveConfig.discordMatchAccessRoleId, allow: ['ViewChannel', 'Connect', 'Speak'] });
        permissionOverwrites2.push({ id: effectiveConfig.discordMatchAccessRoleId, allow: ['ViewChannel', 'Connect', 'Speak'] });
      }

      for (const id of teamA) {
        permissionOverwrites1.push({ id, allow: ['Connect', 'Speak'] });
      }
      for (const id of teamB) {
        permissionOverwrites2.push({ id, allow: ['Connect', 'Speak'] });
      }

      const vc1 = await guild.channels.create({
        name: `🔊 Equipo A (Web)`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites1,
        reason: 'Partida manual iniciada desde el Panel Web'
      });

      const vc2 = await guild.channels.create({
        name: `🔊 Equipo B (Web)`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites2,
        reason: 'Partida manual iniciada desde el Panel Web'
      });

      // A. Reproducir anuncio por voz con IA antes de mover a los jugadores
      if (waitingRoomId) {
        const textToSpeak = `La partida entre el Equipo A en contra de el Equipo B iniciará en 5, 4, 3, 2, 1`;
        try {
          await playTTSCountdown(guild, waitingRoomId, textToSpeak);
        } catch (err) {
          logger.error('Error al reproducir el anuncio de voz en partida manual:', err);
        }
      }

      // 2. Mover a los jugadores a sus respectivos VCs
      const originalVoiceStates = {};

      for (const id of teamA) {
        const member = await guild.members.fetch(id).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[id] = member.voice.channel.id;
          await member.voice.setChannel(vc1).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      for (const id of teamB) {
        const member = await guild.members.fetch(id).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[id] = member.voice.channel.id;
          await member.voice.setChannel(vc2).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      // Generar ID único para la partida manual
      const matchId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 3. Crear anuncio con botones en Discord
      const matchesChannel = await client.channels.fetch(matchesChannelId).catch(() => null);
      let messageId = null;

      if (matchesChannel) {
        const team1List = teamAPlayerData.map(p => `• <@${p.discordId}> [${p.faceit_nickname}] (Lvl ${p.faceit_level})`).join('\n');
        const team2List = teamBPlayerData.map(p => `• <@${p.discordId}> [${p.faceit_nickname}] (Lvl ${p.faceit_level})`).join('\n');

        const startedEmbed = new EmbedBuilder()
          .setTitle('🎮 ¡Partida Manual Iniciada!')
          .setColor(0x00FF55)
          .setDescription(`Iniciada por <@${req.user.userId}> desde el panel web.`)
          .addFields(
            { name: '🌐 Origen', value: 'Panel Web', inline: true },
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

      if (messageId) {
        const messageUrl = `https://discord.com/channels/${guild.id}/${matchesChannelId}/${messageId}`;

        // Enviar DMs a los jugadores del Equipo A
        for (const id of teamA) {
          try {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member) {
              const dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Tu partida ha comenzado!')
                .setDescription(`Has sido asignado al **Equipo A** para esta partida manual.`)
                .setColor(0x15C253)
                .addFields(
                  { name: '🔊 Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
                )
                .setTimestamp();
              await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          } catch (e) {
            logger.warn(`No se pudo enviar DM al jugador ${id}: ${e.message}`);
          }
        }

        // Enviar DMs a los jugadores del Equipo B
        for (const id of teamB) {
          try {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member) {
              const dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Tu partida ha comenzado!')
                .setDescription(`Has sido asignado al **Equipo B** para esta partida manual.`)
                .setColor(0xFF3E3E)
                .addFields(
                  { name: '🔊 Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true }
                )
                .setTimestamp();
              await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          } catch (e) {
            logger.warn(`No se pudo enviar DM al jugador ${id}: ${e.message}`);
          }
        }
      }

      // 4. Guardar en base de datos de partidas activas
      const matchData = {
        entity_custom_name: 'Manual / Web',
        game: 'cs2',
        voting: { map: { pick: ['Manual'] }, location: { pick: ['Manual'] } },
        teams: { faction1: { name: 'Equipo A' }, faction2: { name: 'Equipo B' } },
        creator_id: req.user.userId
      };

      const rosterA = teamAPlayerData.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));
      const rosterB = teamBPlayerData.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));

      await db.addActiveMatch(matchId, matchData, vc1.id, vc2.id, messageId, rosterA, rosterB, originalVoiceStates, req.guildId || DISCORD_GUILD_ID);
      await db.addMatchToHistory(matchId, matchData, 'TBD', 0, 0, rosterA, rosterB, req.guildId || DISCORD_GUILD_ID, 'started').catch(err => logger.error('Error al guardar historial de partida manual:', err));
      
      // 5. Actualizar el panel en vivo
      await updateLivePanel(client, matchesChannelId, db);

      logger.success(`Partida manual ${matchId} iniciada desde web por ${req.user.username}`);
      res.json({ success: true, matchId });
    } catch (err) {
      logger.error('Error al crear partida manual desde web:', err);
      res.status(500).json({ error: 'Error al iniciar la partida en el servidor.' });
    }
  });

  // ==========================================
  // --- ENDPOINTS MIXTON COMPETITIVO ---
  // ==========================================

  // 1. Obtener estado del lobby mixton, jugadores disponibles y Tiers
  router.get('/mixton-state', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { state, availablePlayers, commandEnabled, guildName, guildId } = await getLobbyData(req.guildId);
      
      res.json({
        state,
        availablePlayers,
        commandEnabled,
        guildName,
        guildId,
        currentUser: {
          userId: req.user.userId,
          username: req.user.username,
          avatar: req.user.avatar || null,
          isAdmin: req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.isAdmin === true
        }
      });
    } catch (err) {
      logger.error('Error al obtener estado mixton:', err);
      res.status(500).json({ error: 'Error al obtener estado de mixton.' });
    }
  });

  // 2. Configurar cantidad de equipos (Admin)
  router.post('/mixton-setup', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { numTeams } = req.body;
      const count = parseInt(numTeams);
      if (isNaN(count) || count < 2 || count > 6) {
        return res.status(400).json({ error: 'El número de equipos debe ser entre 2 y 6.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      
      const newTeams = [];
      for (let i = 1; i <= count; i++) {
        newTeams.push({
          id: `team_${i}`,
          name: `Equipo ${i}`,
          captain: null,
          players: []
        });
      }

      state.teams = newTeams;
      state.pickOrder = [];
      state.currentPickIndex = 0;
      state.draftStarted = false;
      state.draftFinished = false;

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-setup:', err);
      res.status(500).json({ error: 'Error al configurar equipos.' });
    }
  });

  // 3. Asignar capitán de un equipo (Admin)
  router.post('/mixton-assign-captain', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      const state = await db.getMixtonLobbyState(req.guildId);

      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      if (!discordId) {
        team.captain = null;
      } else {
        const data = await db.getFullUser(discordId, req.guildId);
        if (!data) {
          return res.status(404).json({ error: 'Jugador no registrado.' });
        }

        // Los capitanes solo pueden ser de Tier S o Tier A
        const overrideTier = data.mixton_tier_override;
        let isAllowedTier = false;
        if (overrideTier) {
          isAllowedTier = (overrideTier === 'S' || overrideTier === 'A');
        } else {
          const lvl = parseInt(data.faceit_level) || 1;
          isAllowedTier = (lvl === 10 || lvl === 8 || lvl === 9);
        }

        if (!isAllowedTier) {
          return res.status(400).json({ error: 'Los capitanes solo pueden ser de Tier S o Tier A.' });
        }

        const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
        const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
        let discordUser = null;
        if (guild) {
          discordUser = await getDiscordUserDetails(guild, discordId);
        }

        team.captain = {
          discordId,
          faceit_player_id: data.faceit_player_id || '',
          faceit_nickname: data.faceit_nickname || '',
          faceit_level: data.faceit_level || 1,
          faceit_elo: data.faceit_elo || 1000,
          mixton_guild_id: data.mixton_guild_id || null,
          discordUser
        };

        // Enviar mensaje privado amigable al capitán asignado
        try {
          const userObj = await client.users.fetch(discordId).catch(() => null);
          if (userObj) {
            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
            const loginUrl = `${baseUrl}/?guild=${targetGuildId}`;
            const embed = new EmbedBuilder()
              .setTitle('👑 ¡Has sido elegido como Capitán de Mixton!')
              .setDescription(`¡Hola, **${data.faceit_nickname || userObj.username}**!\n\nHas sido seleccionado como **Capitán de Equipo** en el lobby de Mixton.\nTu rol ahora es iniciar sesión en la web para elegir a tus compañeros de equipo y armar la partida.`)
              .addFields(
                { name: '🔗 Enlace de Acceso', value: `[Iniciar Sesión e Ir al Lobby](${loginUrl})` },
                { name: '📌 Instrucciones', value: '1. Haz clic en el enlace de arriba.\n2. Inicia sesión con tu cuenta de Discord.\n3. Espera tu turno y selecciona a los jugadores de la lista.' }
              )
              .setColor('#FF5500')
              .setTimestamp()
              .setFooter({ text: 'Mixton Matchmaking System', iconURL: client.user.avatarURL() });

            await userObj.send({ embeds: [embed] }).catch((e) => {
              logger.warn(`No se pudo enviar MD al capitán ${discordId}: ${e.message}`);
            });
          }
        } catch (dmErr) {
          logger.error('Error al intentar enviar mensaje privado al capitán:', dmErr);
        }

        // Quitar de elegidos de otros equipos si existía
        state.teams.forEach(t => {
          t.players = (t.players || []).filter(p => p.discordId !== discordId);
        });

        // Quitar de capitán de otros equipos si existía
        state.teams.forEach(t => {
          if (t.id !== teamId && t.captain && t.captain.discordId === discordId) {
            t.captain = null;
          }
        });
      }

      // Sincronizar pickOrder
      state.pickOrder = state.teams.filter(t => t.captain !== null).map(t => t.id);

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-assign-captain:', err);
      res.status(500).json({ error: 'Error al asignar capitán.' });
    }
  });

  // 4. Guardar orden de elección (Admin)
  router.post('/mixton-pick-order', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { pickOrder } = req.body;
      if (!Array.isArray(pickOrder)) {
        return res.status(400).json({ error: 'El orden debe ser un array.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      
      for (const teamId of pickOrder) {
        const team = state.teams.find(t => t.id === teamId);
        if (!team || !team.captain) {
          return res.status(400).json({ error: `El equipo ${teamId} no tiene un capitán asignado.` });
        }
      }

      state.pickOrder = pickOrder;
      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-pick-order:', err);
      res.status(500).json({ error: 'Error al guardar el orden de elección.' });
    }
  });

  // 5. Iniciar draft (Admin)
  router.post('/mixton-start', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const state = await db.getMixtonLobbyState(req.guildId);

      if (state.teams.length < 2) {
        return res.status(400).json({ error: 'Se requieren al menos 2 equipos para iniciar.' });
      }
      
      const missingCaptains = state.teams.some(t => !t.captain);
      if (missingCaptains) {
        return res.status(400).json({ error: 'Todos los equipos creados deben tener un capitán asignado.' });
      }

      if (!state.pickOrder || state.pickOrder.length !== state.teams.length) {
        state.pickOrder = state.teams.map(t => t.id);
      }

      state.draftStarted = true;
      state.draftFinished = false;
      state.currentPickIndex = 0;

      // Limpiar jugadores elegidos previos
      state.teams.forEach(t => {
        t.players = [];
      });

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-start:', err);
      res.status(500).json({ error: 'Error al iniciar la selección.' });
    }
  });

  // 6. Realizar una elección de jugador (Capitanes o Admin)
  router.post('/mixton-pick', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { playerDiscordId } = req.body;
      const state = await db.getMixtonLobbyState(req.guildId);

      if (!state.draftStarted || state.draftFinished) {
        return res.status(400).json({ error: 'La selección de jugadores no está activa.' });
      }

      const currentTeamId = state.pickOrder[state.currentPickIndex];
      const currentTeam = state.teams.find(t => t.id === currentTeamId);
      
      if (!currentTeam || !currentTeam.captain) {
        return res.status(500).json({ error: 'Equipo o capitán actual no definido.' });
      }

      const isCaptain = currentTeam.captain.discordId === req.user.userId;
      const isAdmin = req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.isAdmin === true;

      if (!isCaptain && !isAdmin) {
        return res.status(403).json({ error: `No es tu turno. Es turno del capitán de ${currentTeam.name}.` });
      }

      // Validar si el jugador ya está en algún equipo
      const alreadyOccupied = state.teams.some(t => 
         (t.captain && t.captain.discordId === playerDiscordId) || 
         (t.players || []).some(p => p.discordId === playerDiscordId)
      );

      if (alreadyOccupied) {
        return res.status(400).json({ error: 'Este jugador ya ha sido elegido.' });
      }

      const data = await db.getFullUser(playerDiscordId, req.guildId);
      if (!data) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      if (data.mixton_ready !== true) {
        return res.status(400).json({ error: 'El jugador seleccionado no está disponible (/mixton_listo).' });
      }

      const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      let discordUser = null;
      if (guild) {
        discordUser = await getDiscordUserDetails(guild, playerDiscordId);
      }

      const playerObj = {
        discordId: playerDiscordId,
        faceit_player_id: data.faceit_player_id || '',
        faceit_nickname: data.faceit_nickname || '',
        faceit_level: data.faceit_level || 1,
        faceit_elo: data.faceit_elo || 1000,
        mixton_guild_id: data.mixton_guild_id || null,
        discordUser
      };

      if (!currentTeam.players) currentTeam.players = [];
      if (currentTeam.players.length >= 4) {
        return res.status(400).json({ error: `${currentTeam.name} ya está completo (4 jugadores elegidos + 1 capitán).` });
      }

      currentTeam.players.push(playerObj);

      // Avanzar al siguiente
      state.currentPickIndex = (state.currentPickIndex + 1) % state.pickOrder.length;

      // Verificar si terminó el draft
      const allDone = state.teams.every(t => t.players.length === 4);
      if (allDone) {
        state.draftFinished = true;
        state.draftStarted = false;
      }

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-pick:', err);
      res.status(500).json({ error: 'Error al seleccionar jugador.' });
    }
  });

  // 7. Reiniciar lobby mixton (Admin)
  router.post('/mixton-reset', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const defaultState = {
        teams: [
          { id: 'team_1', name: 'Equipo 1', captain: null, players: [] },
          { id: 'team_2', name: 'Equipo 2', captain: null, players: [] }
        ],
        pickOrder: [],
        currentPickIndex: 0,
        draftStarted: false,
        draftFinished: false,
        updatedAt: Date.now()
      };

      await db.saveMixtonLobbyState(defaultState, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state: defaultState });
    } catch (err) {
      logger.error('Error en mixton-reset:', err);
      res.status(500).json({ error: 'Error al reiniciar el lobby.' });
    }
  });

  // 7.5. Verificar cuotas y saldos de los 10 jugadores antes de lanzar (Apuestas)
  router.post('/mixton-check-bet-status', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const { teamIdA, teamIdB, betAmount = 0 } = req.body;
      if (!teamIdA || !teamIdB) {
        return res.status(400).json({ error: 'Debes seleccionar dos equipos.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const teamA = state.teams.find(t => t.id === teamIdA);
      const teamB = state.teams.find(t => t.id === teamIdB);

      if (!teamA || !teamB) {
        return res.status(404).json({ error: 'Equipos no encontrados.' });
      }

      if (!teamA.captain || teamA.players.length !== 4 || !teamB.captain || teamB.players.length !== 4) {
        return res.status(400).json({ error: 'Ambos equipos deben estar completos (5 jugadores c/u).' });
      }

      const rosterA = [teamA.captain, ...teamA.players];
      const rosterB = [teamB.captain, ...teamB.players];
      const parsedBetAmount = Math.max(0, parseFloat(betAmount) || 0);

      let targetGuildId = null;
      for (const p of [...rosterA, ...rosterB]) {
        if (p.mixton_guild_id) {
          targetGuildId = p.mixton_guild_id;
          break;
        }
      }
      const guildIdToUse = targetGuildId || req.guildId || DISCORD_GUILD_ID;

      const playerStatusList = [];

      for (const p of rosterA) {
        const balance = await db.getUserBalance(p.discordId, guildIdToUse);
        playerStatusList.push({
          discordId: p.discordId,
          faceit_nickname: p.faceit_nickname,
          displayName: p.discordUser?.displayName || p.discordUser?.username || p.faceit_nickname,
          avatarURL: p.discordUser?.avatarURL || null,
          team: 'A',
          teamName: teamA.name,
          isCaptain: p.discordId === teamA.captain.discordId,
          balance,
          hasEnough: parsedBetAmount === 0 || balance >= parsedBetAmount,
          deficit: Math.max(0, parseFloat((parsedBetAmount - balance).toFixed(2)))
        });
      }

      for (const p of rosterB) {
        const balance = await db.getUserBalance(p.discordId, guildIdToUse);
        playerStatusList.push({
          discordId: p.discordId,
          faceit_nickname: p.faceit_nickname,
          displayName: p.discordUser?.displayName || p.discordUser?.username || p.faceit_nickname,
          avatarURL: p.discordUser?.avatarURL || null,
          team: 'B',
          teamName: teamB.name,
          isCaptain: p.discordId === teamB.captain.discordId,
          balance,
          hasEnough: parsedBetAmount === 0 || balance >= parsedBetAmount,
          deficit: Math.max(0, parseFloat((parsedBetAmount - balance).toFixed(2)))
        });
      }

      const totalPot = parseFloat((parsedBetAmount * 10).toFixed(2));
      const allReady = playerStatusList.every(p => p.hasEnough);

      res.json({
        betAmount: parsedBetAmount,
        totalPot,
        allReady,
        teamA: { id: teamA.id, name: teamA.name },
        teamB: { id: teamB.id, name: teamB.name },
        players: playerStatusList
      });
    } catch (err) {
      logger.error('Error al verificar estado de apuestas:', err);
      res.status(500).json({ error: 'Error al verificar saldos de los jugadores.' });
    }
  });

  // 7.6. Recarga rápida de saldo manual por admin (ej: pago directo Yape en efectivo)
  router.post('/quick-add-balance', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { discordId, amount, reason } = req.body;
      if (!discordId || amount === undefined) {
        return res.status(400).json({ error: 'Faltan discordId o monto.' });
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número positivo.' });
      }

      const newBalance = await db.updateUserBalance(
        discordId, 
        numAmount, 
        req.guildId, 
        reason || `Recarga manual por admin ${req.user.username}`
      );

      res.json({ success: true, discordId, newBalance });
    } catch (err) {
      logger.error('Error al recargar saldo manual:', err);
      res.status(500).json({ error: 'Error al recargar saldo.' });
    }
  });

  // 7.7. Recargar saldo con Yape vía Culqi API
  router.post('/wallet/recharge-yape', requireAuth, async (req, res) => {
    try {
      const { phoneNumber, otp, amount, targetDiscordId } = req.body;
      const discordId = (req.user?.isAdmin && targetDiscordId) ? targetDiscordId : req.user.userId;

      if (!phoneNumber || !otp || !amount) {
        return res.status(400).json({ error: 'Debes proporcionar tu número de celular Yape, código de aprobación y monto.' });
      }

      const result = await culqiService.processYapeRecharge({
        discordId,
        phoneNumber,
        otp,
        amount,
        email: req.user.email || null,
        nickname: req.user.username || 'Jugador',
        guildId: req.guildId,
        db
      });

      mixtonEvents.emit('update', req.guildId);

      res.json({
        success: true,
        message: `¡Recarga de S/ ${result.amount.toFixed(2)} procesada exitosamente con Yape!`,
        ...result
      });
    } catch (err) {
      logger.error('Error al procesar recarga con Yape en endpoint:', err.message);
      res.status(400).json({ error: err.message || 'Error al procesar el pago con Yape.' });
    }
  });

  // 8. Crear partida mixton en Discord (Admin)
  router.post('/mixton-create-match', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamIdA, teamIdB, betAmount = 0, manualPaidDiscordIds = [] } = req.body;
      if (!teamIdA || !teamIdB) {
        return res.status(400).json({ error: 'Debes seleccionar dos equipos.' });
      }

      const parsedBetAmount = Math.max(0, parseFloat(betAmount) || 0);
      const manualPaidSet = new Set(Array.isArray(manualPaidDiscordIds) ? manualPaidDiscordIds : []);

      const state = await db.getMixtonLobbyState(req.guildId);
      const teamA = state.teams.find(t => t.id === teamIdA);
      const teamB = state.teams.find(t => t.id === teamIdB);

      if (!teamA || !teamB) {
        return res.status(404).json({ error: 'Equipos no encontrados.' });
      }

      if (!teamA.captain || teamA.players.length !== 4 || !teamB.captain || teamB.players.length !== 4) {
        return res.status(400).json({ error: 'Ambos equipos deben estar completos (5 jugadores c/u).' });
      }

      const rosterA = [teamA.captain, ...teamA.players];
      const rosterB = [teamB.captain, ...teamB.players];

      // Determinar la guild correcta de la partida
      let targetGuildId = null;
      for (const p of [...rosterA, ...rosterB]) {
        if (p.mixton_guild_id) {
          targetGuildId = p.mixton_guild_id;
          break;
        }
      }

      const guildIdToUse = targetGuildId || req.guildId || DISCORD_GUILD_ID;

      // Validación estricta de saldo/cuota si hay apuesta
      const unpaidPlayers = [];
      const playersToDeduct = [];

      if (parsedBetAmount > 0) {
        for (const p of [...rosterA, ...rosterB]) {
          const isManual = manualPaidSet.has(p.discordId);
          if (isManual) continue;

          const balance = await db.getUserBalance(p.discordId, guildIdToUse);
          if (balance < parsedBetAmount) {
            unpaidPlayers.push({
              discordId: p.discordId,
              nickname: p.faceit_nickname || p.discordUser?.displayName || 'Jugador',
              balance,
              deficit: parseFloat((parsedBetAmount - balance).toFixed(2))
            });
          } else {
            playersToDeduct.push(p.discordId);
          }
        }

        if (unpaidPlayers.length > 0) {
          const names = unpaidPlayers.map(u => `${u.nickname} (Saldo: S/ ${u.balance.toFixed(2)}, Falta: S/ ${u.deficit.toFixed(2)})`).join(', ');
          return res.status(400).json({ 
            error: `No se puede lanzar el encuentro: Faltan ${unpaidPlayers.length} jugador(es) por completar su cuota: ${names}`,
            unpaidPlayers 
          });
        }

        // Deducir saldo de los jugadores con balance suficiente
        for (const discordId of playersToDeduct) {
          await db.updateUserBalance(
            discordId, 
            -parsedBetAmount, 
            guildIdToUse, 
            `Entrada cuota de apuesta mixton: ${teamA.name} vs ${teamB.name}`
          );
        }
      }

      const effectiveConfig = await getEffectiveConfigForGuild(guildIdToUse);
      const guild = await client.guilds.fetch(guildIdToUse).catch(() => null);
      if (!guild) {
        return res.status(500).json({ error: `No se pudo conectar a Discord para la Guild ${guildIdToUse}.` });
      }

      let matchesChannelId = null;
      if (effectiveConfig.discordMatchesChannelId) {
        const ids = effectiveConfig.discordMatchesChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            matchesChannelId = id;
            break;
          }
        }
      }

      if (!matchesChannelId) {
        // Fallback: Buscar un canal de texto llamado 'partidas' o 'mixton' en la guild
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackCh = channels.find(ch => ch.type === 0 && (ch.name.toLowerCase() === 'partidas' || ch.name.toLowerCase() === 'mixton' || ch.name.toLowerCase() === 'mixton-partidas'));
          if (fallbackCh) {
            matchesChannelId = fallbackCh.id;
          }
        }
      }

      if (!matchesChannelId && effectiveConfig.discordMatchesChannelId) {
        // Usar la primera por defecto
        matchesChannelId = effectiveConfig.discordMatchesChannelId.split(',')[0].trim();
      }

      if (!matchesChannelId) {
        return res.status(500).json({ error: 'Canal de anuncios no configurado y no se encontró canal fallback.' });
      }

      // 1. Canales de voz temporales
      let waitingRoomId = null;
      if (effectiveConfig.discordWaitingRoomChannelId) {
        const ids = effectiveConfig.discordWaitingRoomChannelId.split(',').map(id => id.trim());
        for (const id of ids) {
          const ch = await guild.channels.fetch(id).catch(() => null);
          if (ch && ch.guild.id === guild.id) {
            waitingRoomId = id;
            break;
          }
        }
      }

      if (!waitingRoomId) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (channels) {
          const fallbackVC = channels.find(ch => ch.type === 2 && (ch.name.toLowerCase() === 'sala-de-espera' || ch.name.toLowerCase() === 'waiting-room' || ch.name.toLowerCase() === 'general'));
          if (fallbackVC) {
            waitingRoomId = fallbackVC.id;
          }
        }
      }

      let parentId = null;
      if (waitingRoomId) {
        const waitingRoom = await guild.channels.fetch(waitingRoomId).catch(() => null);
        if (waitingRoom) parentId = waitingRoom.parentId;
      }

      const botId = client.user.id;
      const permissionOverwrites1 = [
        { id: guild.id, deny: ['Connect'] },
        { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];
      const permissionOverwrites2 = [
        { id: guild.id, deny: ['Connect'] },
        { id: botId, allow: ['ViewChannel', 'Connect', 'Speak', 'ManageChannels', 'MoveMembers'] }
      ];

      if (effectiveConfig?.discordMatchAccessRoleId) {
        permissionOverwrites1.push({ id: effectiveConfig.discordMatchAccessRoleId, allow: ['ViewChannel', 'Connect', 'Speak'] });
        permissionOverwrites2.push({ id: effectiveConfig.discordMatchAccessRoleId, allow: ['ViewChannel', 'Connect', 'Speak'] });
      }

      for (const p of rosterA) {
        permissionOverwrites1.push({ id: p.discordId, allow: ['Connect', 'Speak'] });
      }
      for (const p of rosterB) {
        permissionOverwrites2.push({ id: p.discordId, allow: ['Connect', 'Speak'] });
      }

      const capAName = teamA.captain?.discordUser?.displayName || teamA.captain?.faceit_nickname || 'A';
      const capBName = teamB.captain?.discordUser?.displayName || teamB.captain?.faceit_nickname || 'B';

      const vc1 = await guild.channels.create({
        name: `🔊 Team ${capAName}`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites1,
        reason: 'Partida Mixton iniciada desde la web'
      });

      const vc2 = await guild.channels.create({
        name: `🔊 Team ${capBName}`,
        type: 2,
        parent: parentId,
        permissionOverwrites: permissionOverwrites2,
        reason: 'Partida Mixton iniciada desde la web'
      });

      // A. Reproducir anuncio por voz con IA antes de mover a los jugadores
      if (waitingRoomId) {
        const textToSpeak = `La partida entre ${capAName} en contra de ${capBName} iniciará en 5, 4, 3, 2, 1`;
        try {
          await playTTSCountdown(guild, waitingRoomId, textToSpeak);
        } catch (err) {
          logger.error('Error al reproducir el anuncio de voz en Mixton:', err);
        }
      }

      // 2. Mover a los jugadores a los VCs
      const originalVoiceStates = {};

      for (const p of rosterA) {
        const member = await guild.members.fetch(p.discordId).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[p.discordId] = member.voice.channel.id;
          await member.voice.setChannel(vc1).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      for (const p of rosterB) {
        const member = await guild.members.fetch(p.discordId).catch(() => null);
        if (member && member.voice.channel) {
          originalVoiceStates[p.discordId] = member.voice.channel.id;
          await member.voice.setChannel(vc2).catch(err => logger.warn(`No se pudo mover a ${member.user.tag}: ${err.message}`));
        }
      }

      const matchId = `mixton_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 3. Anuncio en Discord
      const matchesChannel = await client.channels.fetch(matchesChannelId).catch(() => null);
      let messageId = null;

      if (matchesChannel) {
        const getLvlEmoji = (lvl) => {
          const l = parseInt(lvl) || 1;
          if (l === 10) return '🔴';
          if (l >= 8) return 'orange_circle'; // we can use standard discord emojis
          // Actually standard discord emojis are :red_circle: :orange_circle: :blue_circle: :white_circle:
          // In raw text: 🔴, 🟠, 🔵, ⚪
          if (l >= 8) return '🟠';
          if (l >= 5) return '🔵';
          return '⚪';
        };

        const avgEloA = Math.round(rosterA.reduce((sum, p) => sum + (p.faceit_elo || 1000), 0) / rosterA.length);
        const avgEloB = Math.round(rosterB.reduce((sum, p) => sum + (p.faceit_elo || 1000), 0) / rosterB.length);

        const team1List = rosterA.map(p => {
          const isCap = p.discordId === teamA.captain.discordId;
          return `${isCap ? '👑 **Capitán**' : '•'} ${getLvlEmoji(p.faceit_level)} <@${p.discordId}> (\`${p.faceit_nickname}\` - ELO: ${p.faceit_elo || 1000})`;
        }).join('\n');

        const team2List = rosterB.map(p => {
          const isCap = p.discordId === teamB.captain.discordId;
          return `${isCap ? '👑 **Capitán**' : '•'} ${getLvlEmoji(p.faceit_level)} <@${p.discordId}> (\`${p.faceit_nickname}\` - ELO: ${p.faceit_elo || 1000})`;
        }).join('\n');

        const activeHubId = effectiveConfig.faceitHubId || '52a88f17-1660-42ae-8322-76592f0c6f23';
        const faceitHubUrl = `https://www.faceit.com/es/hub/${activeHubId}/Mixtones`;

        const embedFields = [
          { name: '🌐 Modo de Juego', value: 'Mixton Competitivo', inline: true },
          { name: '🗺️ Mapa', value: '`Elección de Capitanes`', inline: true },
          { name: '📍 Canales de Voz', value: `🔊 <#${vc1.id}>\n🔊 <#${vc2.id}>`, inline: true }
        ];

        if (parsedBetAmount > 0) {
          embedFields.push({
            name: '💰 Apuesta y Pozo',
            value: `💵 **Cuota:** S/ ${parsedBetAmount.toFixed(2)} c/u\n🏆 **Pozo Total:** S/ ${(parsedBetAmount * 10).toFixed(2)}`,
            inline: true
          });
        }

        embedFields.push(
          { name: '🟠 Club Faceit', value: `[Entrar a la cola del Hub](${faceitHubUrl})`, inline: false },
          { name: `👥 Roster A (${teamA.name}) [Promedio ELO: ${avgEloA}]`, value: team1List, inline: false },
          { name: `👥 Roster B (${teamB.name}) [Promedio ELO: ${avgEloB}]`, value: team2List, inline: false }
        );

        const startedEmbed = new EmbedBuilder()
          .setTitle(parsedBetAmount > 0 ? `🎮 ¡Partida Mixton con Apuesta (S/ ${parsedBetAmount.toFixed(2)})!` : '🎮 ¡Partida Mixton Competitiva!')
          .setColor(parsedBetAmount > 0 ? 0x15C253 : 0xFF5500)
          .setDescription(`Lanzada por el Administrador **${req.user.username}** desde el panel web.`)
          .addFields(embedFields)
          .setFooter({ text: 'Usa los botones para reportar el resultado de la partida' })
          .setTimestamp();

        const winA = new ButtonBuilder()
          .setCustomId(`manual_match_win_a_${matchId}`)
          .setLabel(`Ganó ${teamA.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const winB = new ButtonBuilder()
          .setCustomId(`manual_match_win_b_${matchId}`)
          .setLabel(`Ganó ${teamB.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏆');

        const cancel = new ButtonBuilder()
          .setCustomId(`manual_match_cancel_${matchId}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const faceitBtn = new ButtonBuilder()
          .setLabel('Cola en Faceit')
          .setStyle(ButtonStyle.Link)
          .setURL(faceitHubUrl)
          .setEmoji('🟠');

        const row = new ActionRowBuilder().addComponents(winA, winB, cancel, faceitBtn);

        const playerPings = [...rosterA, ...rosterB].map(p => `<@${p.discordId}>`).join(' ');
        const msg = await matchesChannel.send({ 
          content: `📢 **¡Partida Mixtón Iniciada!**\nJugadores: ${playerPings}`,
          embeds: [startedEmbed], 
          components: [row] 
        }).catch(err => logger.error('Error enviando anuncio mixton:', err));
        if (msg) messageId = msg.id;
      }

      const activeHubId = effectiveConfig.faceitHubId || '52a88f17-1660-42ae-8322-76592f0c6f23';
      const faceitHubUrl = `https://www.faceit.com/es/hub/${activeHubId}/Mixtones`;

      if (messageId) {
        const messageUrl = `https://discord.com/channels/${guild.id}/${matchesChannelId}/${messageId}`;

        // Notificaciones personalizadas para Roster A
        for (const p of rosterA) {
          try {
            const isCap = (p.discordId === teamA.captain?.discordId);
            let dmEmbed;

            if (isCap) {
              const matesList = (teamA.players || []).map(t => `• [${t.faceit_nickname || 'Jugador'}](https://www.faceit.com/es/players/${t.faceit_nickname || ''}) (<@${t.discordId}>)`).join('\n') || 'Sin compañeros asignados';
              dmEmbed = new EmbedBuilder()
                .setTitle('👑 ¡Eres el Capitán y Líder de Grupo en Faceit!')
                .setDescription(`Has sido elegido Capitán de **${teamA.name}**.\n\n👉 **Invita a tus 4 compañeros a tu Grupo (Party) en FACEIT** y luego dale a **JUGAR** en la cola del Hub:`)
                .setColor(0xFF5500)
                .addFields(
                  { name: '👥 Tus Compañeros (Haz clic para invitar en Faceit)', value: matesList, inline: false },
                  { name: '🔊 Tu Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true },
                  { name: '🟠 Cola del Hub Faceit', value: `[Abrir Hub para Jugar](${faceitHubUrl})`, inline: false }
                )
                .setFooter({ text: 'Asegúrate de que los 5 estén en el grupo antes de darle a Jugar' })
                .setTimestamp();
            } else {
              const capNick = teamA.captain?.faceit_nickname || 'Capitán';
              const capUrl = `https://www.faceit.com/es/players/${capNick}`;
              dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Invitación de Equipo Mixton!')
                .setDescription(`Has sido asignado a **${teamA.name}**.\n\n👑 Tu Capitán y líder de grupo en Faceit es: **[${capNick}](${capUrl})** (<@${teamA.captain?.discordId}>).\n\n👉 **Acepta la invitación de grupo de tu Capitán en Faceit** o agrégalo como amigo para unirte a su grupo antes de iniciar la partida.`)
                .setColor(0x15C253)
                .addFields(
                  { name: '👑 Tu Capitán en Faceit', value: `[Perfil de ${capNick}](${capUrl})`, inline: true },
                  { name: '🔊 Canal de Voz', value: `<#${vc1.id}>`, inline: true },
                  { name: '🟠 Hub Mixtones', value: `[Ir al Hub](${faceitHubUrl})`, inline: true }
                )
                .setFooter({ text: 'Ten abierto Faceit y el Anti-Cheat' })
                .setTimestamp();
            }

            const member = await guild.members.fetch(p.discordId).catch(() => null);
            if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch (e) {
            logger.warn(`No se pudo enviar DM a ${p.discordId}: ${e.message}`);
          }
        }

        // Notificaciones personalizadas para Roster B
        for (const p of rosterB) {
          try {
            const isCap = (p.discordId === teamB.captain?.discordId);
            let dmEmbed;

            if (isCap) {
              const matesList = (teamB.players || []).map(t => `• [${t.faceit_nickname || 'Jugador'}](https://www.faceit.com/es/players/${t.faceit_nickname || ''}) (<@${t.discordId}>)`).join('\n') || 'Sin compañeros asignados';
              dmEmbed = new EmbedBuilder()
                .setTitle('👑 ¡Eres el Capitán y Líder de Grupo en Faceit!')
                .setDescription(`Has sido elegido Capitán de **${teamB.name}**.\n\n👉 **Invita a tus 4 compañeros a tu Grupo (Party) en FACEIT** y luego dale a **JUGAR** en la cola del Hub:`)
                .setColor(0xFF5500)
                .addFields(
                  { name: '👥 Tus Compañeros (Haz clic para invitar en Faceit)', value: matesList, inline: false },
                  { name: '🔊 Tu Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: '🔗 Anuncio en Discord', value: `[Ir al canal](${messageUrl})`, inline: true },
                  { name: '🟠 Cola del Hub Faceit', value: `[Abrir Hub para Jugar](${faceitHubUrl})`, inline: false }
                )
                .setFooter({ text: 'Asegúrate de que los 5 estén en el grupo antes de darle a Jugar' })
                .setTimestamp();
            } else {
              const capNick = teamB.captain?.faceit_nickname || 'Capitán';
              const capUrl = `https://www.faceit.com/es/players/${capNick}`;
              dmEmbed = new EmbedBuilder()
                .setTitle('🎮 ¡Invitación de Equipo Mixton!')
                .setDescription(`Has sido asignado a **${teamB.name}**.\n\n👑 Tu Capitán y líder de grupo en Faceit es: **[${capNick}](${capUrl})** (<@${teamB.captain?.discordId}>).\n\n👉 **Acepta la invitación de grupo de tu Capitán en Faceit** o agrégalo como amigo para unirte a su grupo antes de iniciar la partida.`)
                .setColor(0xFF3E3E)
                .addFields(
                  { name: '👑 Tu Capitán en Faceit', value: `[Perfil de ${capNick}](${capUrl})`, inline: true },
                  { name: '🔊 Canal de Voz', value: `<#${vc2.id}>`, inline: true },
                  { name: '🟠 Hub Mixtones', value: `[Ir al Hub](${faceitHubUrl})`, inline: true }
                )
                .setFooter({ text: 'Ten abierto Faceit y el Anti-Cheat' })
                .setTimestamp();
            }

            const member = await guild.members.fetch(p.discordId).catch(() => null);
            if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch (e) {
            logger.warn(`No se pudo enviar DM a ${p.discordId}: ${e.message}`);
          }
        }
      }

      // Guardar partida activa
      const matchData = {
        entity_custom_name: parsedBetAmount > 0 ? `Mixton Apuesta (S/ ${parsedBetAmount.toFixed(2)})` : 'Mixton / Web',
        game: 'cs2',
        voting: { map: { pick: ['Mixton'] }, location: { pick: ['Mixton'] } },
        teams: { faction1: { name: teamA.name }, faction2: { name: teamB.name } },
        creator_id: req.user.userId,
        bet_amount_per_player: parsedBetAmount,
        total_pot: parseFloat((parsedBetAmount * 10).toFixed(2)),
        manual_paid_players: Array.from(manualPaidSet)
      };

      const dbRosterA = rosterA.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));
      const dbRosterB = rosterB.map(p => ({ player_id: p.faceit_player_id, nickname: p.faceit_nickname, discord_id: p.discordId }));

      await db.addActiveMatch(matchId, matchData, vc1.id, vc2.id, messageId, dbRosterA, dbRosterB, originalVoiceStates, guildIdToUse);
      await updateLivePanel(client, matchesChannelId, db);

      // Quitar estado mixton_ready
      const usersToResetReady = [...rosterA.map(p => p.discordId), ...rosterB.map(p => p.discordId)];
      await db.resetPlayersReadyStatus(usersToResetReady, guildIdToUse);

      // Vaciar estos dos equipos en el lobby mixton
      teamA.captain = null;
      teamA.players = [];
      teamB.captain = null;
      teamB.players = [];
      state.currentPickIndex = 0;
      state.draftStarted = false;
      state.draftFinished = false;
      state.pickOrder = state.teams.filter(t => t.captain !== null).map(t => t.id);

      await db.saveMixtonLobbyState(state, guildIdToUse);
      mixtonEvents.emit('update', guildIdToUse);

      logger.success(`Partida mixton ${matchId} iniciada desde web por ${req.user.username}`);
      res.json({ success: true, matchId, faceitHubUrl });

      // Ejecutar el envío de invitaciones de Steam en segundo plano
      (async () => {
        try {
          const allPlayers = [...rosterA, ...rosterB];
          logger.info(`🤖 Steam Bot: Obteniendo SteamID64 para ${allPlayers.length} jugadores desde Faceit...`);
          
          const steamIDs = await Promise.all(
            allPlayers.map(async (p) => {
              try {
                if (!p.faceit_player_id) return null;
                const profile = await fetchFaceitPlayerById(p.faceit_player_id);
                const steamId = profile.steam_id_64 || profile.platforms?.steam;
                if (steamId) {
                  logger.info(`🔍 Steam ID encontrado para ${p.faceit_nickname}: ${steamId}`);
                } else {
                  logger.warn(`⚠️ No se encontró Steam ID para ${p.faceit_nickname}`);
                }
                return steamId;
              } catch (err) {
                logger.error(`Error al consultar perfil de Faceit para ${p.faceit_nickname}: ${err.message}`);
                return null;
              }
            })
          );

          const validSteamIDs = [...new Set(steamIDs.filter(Boolean))];
          if (!steamClient.steamID) {
            logger.warn('Steam Bot: se omitieron invitaciones porque Steam no tiene una sesion activa. La partida mixton ya fue creada en Discord.');
            return;
          }

          if (validSteamIDs.length !== 10) {
            logger.warn(`Steam Bot: se omitieron invitaciones porque se requieren 10 SteamID64 unicos y se obtuvieron ${validSteamIDs.length}. La partida mixton ya fue creada en Discord.`);
            return;
          }

          const serverIp = process.env.MIXTON_SERVER_IP;
          if (!serverIp) {
            logger.warn('Steam Bot: MIXTON_SERVER_IP no esta configurado. Se omitieron invitaciones automaticas.');
            return;
          }

          logger.info(`Steam Bot: iniciando invitaciones del lobby CS2 para el servidor ${serverIp}...`);
          await crearLobbyMatchmaking(validSteamIDs, serverIp);
        } catch (steamErr) {
          logger.error('❌ Error al procesar invitaciones automáticas de Steam:', steamErr);
        }
      })();
    } catch (err) {
      logger.error('Error al crear partida mixton desde web:', err);
      res.status(500).json({ error: 'Error al iniciar la partida en el servidor.' });
    }
  });

  // --- Obtener historial de partidas para el lobby mixton ---
  router.get('/matches-history', requireAuth, verifyGuildAccess, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const history = await db.getMatchHistory(limit, targetGuildId);
      res.json({ history });
    } catch (err) {
      logger.error('Error al obtener historial en lobby:', err);
      res.status(500).json({ error: 'Error al obtener historial.' });
    }
  });

  // --- Cargar roster completo a un equipo en el lobby mixton (Admin) ---
  router.post('/mixton-load-team', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, captainDiscordId, playerDiscordIds } = req.body;
      
      if (!teamId || !captainDiscordId || !Array.isArray(playerDiscordIds)) {
        return res.status(400).json({ error: 'Faltan parámetros (teamId, captainDiscordId, playerDiscordIds).' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      const targetGuildId = req.guildId || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);

      // Obtener perfiles de Firestore para todos los jugadores en paralelo.
      // Ya que las partidas de Faceit normales pueden no tener discord_id en la historia
      // y mandan el UUID de Faceit, resolvemos el ID de Discord dinámicamente si es necesario.
      const allIdsInput = [captainDiscordId, ...playerDiscordIds];
      
      const resolveProfilePromises = allIdsInput.map(async (inputId) => {
        let user = await db.getFullUser(inputId, req.guildId);
        if (!user) {
          const resolvedDiscordId = await db.getDiscordIdByFaceitId(inputId, req.guildId);
          if (resolvedDiscordId) {
            user = await db.getFullUser(resolvedDiscordId, req.guildId);
          }
        }
        return { inputId, user };
      });
      
      const resolvedResults = await Promise.all(resolveProfilePromises);
      
      const profiles = {};
      let finalCapDiscordId = null;
      const finalPlayerDiscordIds = [];
      
      for (const resItem of resolvedResults) {
        const { inputId, user } = resItem;
        if (!user) {
          return res.status(400).json({ error: `El jugador con ID o Faceit ID '${inputId}' no está registrado en la base de datos.` });
        }
        
        const finalDiscordId = user.discordId || user.id;
        profiles[finalDiscordId] = user;
        
        if (inputId === captainDiscordId) {
          finalCapDiscordId = finalDiscordId;
        } else {
          finalPlayerDiscordIds.push(finalDiscordId);
        }
      }

      // Quitar a todos estos jugadores de otros equipos/capitanías para evitar duplicados
      const allIdsSet = new Set([finalCapDiscordId, ...finalPlayerDiscordIds]);
      state.teams.forEach(t => {
        if (t.captain && allIdsSet.has(t.captain.discordId)) {
          t.captain = null;
        }
        t.players = (t.players || []).filter(p => !allIdsSet.has(p.discordId));
      });

      // Asignar Capitán
      const capData = profiles[finalCapDiscordId];
      
      // Resolve both captain and players' Discord user details in parallel!
      const userDetailsPromises = [
        getDiscordUserDetails(guild, finalCapDiscordId),
        ...finalPlayerDiscordIds.map(dId => getDiscordUserDetails(guild, dId))
      ];
      
      const [discordUserCap, ...discordUsersPlayers] = await Promise.all(userDetailsPromises);

      let finalCapUser = discordUserCap;
      if ((!finalCapUser || finalCapUser.username === 'usuario_discord') && capData.discord_avatar) {
        finalCapUser = {
          username: capData.discord_username || 'usuario_discord',
          displayName: capData.discord_displayName || capData.faceit_nickname || 'Usuario Discord',
          avatarURL: capData.discord_avatar
        };
      }

      team.captain = {
        discordId: finalCapDiscordId,
        faceit_player_id: capData.faceit_player_id || '',
        faceit_nickname: capData.faceit_nickname || '',
        faceit_level: capData.faceit_level || 1,
        faceit_elo: capData.faceit_elo || 1000,
        mixton_guild_id: targetGuildId,
        discordUser: finalCapUser || null
      };

      // Asignar Jugadores
      team.players = [];
      finalPlayerDiscordIds.forEach((dId, idx) => {
        const pData = profiles[dId];
        let finalPUser = discordUsersPlayers[idx];
        if ((!finalPUser || finalPUser.username === 'usuario_discord') && pData.discord_avatar) {
          finalPUser = {
            username: pData.discord_username || 'usuario_discord',
            displayName: pData.discord_displayName || pData.faceit_nickname || 'Usuario Discord',
            avatarURL: pData.discord_avatar
          };
        }
        team.players.push({
          discordId: dId,
          faceit_player_id: pData.faceit_player_id || '',
          faceit_nickname: pData.faceit_nickname || '',
          faceit_level: pData.faceit_level || 1,
          faceit_elo: pData.faceit_elo || 1000,
          mixton_guild_id: targetGuildId,
          discordUser: finalPUser || null
        });
      });

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-load-team:', err);
      res.status(500).json({ error: 'Error al cargar el equipo.' });
    }
  });

  // Vaciar/Limpiar un equipo completo en el lobby mixton (Admin)
  router.post('/mixton-clear-team', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId } = req.body;
      if (!teamId) {
        return res.status(400).json({ error: 'Falta el teamId.' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      // Vaciar capitán y jugadores
      team.captain = null;
      team.players = [];

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);
      
      logger.success(`El administrador ${req.user.username} vació el equipo ${teamId}.`);
      await db.addLogEntry('info', `El administrador ${req.user.username} vació el equipo ${teamId} (${team.name}) en el lobby.`, 'system');

      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error en mixton-clear-team:', err);
      res.status(500).json({ error: 'Error al vaciar el equipo.' });
    }
  });

  // 9. Poner a todos los usuarios listos como no listos (Admin)
  router.post('/mixton-reset-players', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const resetCount = await db.resetAllReadyPlayers(req.guildId);
      
      if (resetCount === 0) {
        return res.json({ success: true, message: 'No hay usuarios listos en la lista.' });
      }

      logger.success(`Se marcaron ${resetCount} usuarios como no listos.`);
      await db.addLogEntry('info', `El administrador ${req.user.username} marcó a todos los jugadores (${resetCount}) como no listos.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, count: resetCount });
    } catch (err) {
      logger.error('Error al restablecer disponibilidad de jugadores:', err);
      res.status(500).json({ error: 'Error al vaciar la lista de listos.' });
    }
  });

  // Quitar a un jugador de la cola de listos o de un equipo (Admin)
  router.post('/mixton-remove-player', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      if (!discordId) {
        return res.status(400).json({ error: 'Falta el discordId del jugador.' });
      }

      if (teamId) {
        // Lógica de quitar de un equipo
        const state = await db.getMixtonLobbyState(req.guildId);
        const team = state.teams.find(t => t.id === teamId);
        if (!team) {
          return res.status(404).json({ error: 'Equipo no encontrado.' });
        }

        if (team.players) {
          team.players = team.players.filter(p => p.discordId !== discordId);
        }

        await db.saveMixtonLobbyState(state, req.guildId);
        mixtonEvents.emit('update', req.guildId);

        logger.success(`Administrador ${req.user.username} removió al jugador ${discordId} del equipo ${team.name}`);
        await db.addLogEntry('info', `El administrador ${req.user.username} removió a un jugador del equipo ${team.name}.`, 'system');

        return res.json({ success: true, state });
      } else {
        // Lógica de quitar de la cola de listos
        const success = await db.setPlayerReadyStatus(discordId, false, req.guildId);
        if (success) {
          logger.success(`El administrador ${req.user.username} removió al jugador ${discordId} de la cola de listos.`);
          await db.addLogEntry('info', `El administrador ${req.user.username} removió al jugador con Discord ID ${discordId} de la cola de listos.`, 'system');
          mixtonEvents.emit('update', req.guildId);
          return res.json({ success: true });
        } else {
          return res.status(500).json({ error: 'No se pudo remover al jugador.' });
        }
      }
    } catch (err) {
      logger.error('Error al remover jugador:', err);
      res.status(500).json({ error: 'Error al remover al jugador en el servidor.' });
    }
  });

  // 10. Activar/Desactivar comandos mixton en Discord (Admin)
  router.post('/mixton-toggle-command', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'El valor de "enabled" debe ser un booleano.' });
      }

      const settings = await db.getGuildSettings(req.guildId).catch(() => ({}));
      settings.command_mixton_listo = enabled;
      settings.command_mixton_no_listo = enabled;
      await db.setGuildSettings(req.guildId, settings);

      // Invalidar cache de settings en memoria
      invalidateSettingsCache();

      logger.success(`Comandos mixton actualizados a: ${enabled ? 'ACTIVADOS' : 'DESACTIVADOS'}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} cambió el estado de los comandos mixton a: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, commandEnabled: enabled });
    } catch (err) {
      logger.error('Error al cambiar estado de comandos mixton:', err);
      res.status(500).json({ error: 'Error al actualizar el estado de los comandos.' });
    }
  });

  // 11. Cambiar/Override el Tier de un jugador (Admin)
  router.post('/mixton-override-tier', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { playerDiscordId, tier } = req.body;
      if (!playerDiscordId) {
        return res.status(400).json({ error: 'Falta el ID del jugador.' });
      }

      if (tier !== null && tier !== 'S' && tier !== 'A' && tier !== 'B' && tier !== 'C') {
        return res.status(400).json({ error: 'Tier inválido. Debe ser S, A, B, C o null.' });
      }

      const userData = await db.getFullUser(playerDiscordId, req.guildId);
      if (!userData) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      await db.overridePlayerTier(playerDiscordId, tier, req.guildId);

      logger.success(`Administrador ${req.user.username} cambió el tier de ${playerDiscordId} a: ${tier || 'Por defecto (Nivel)'}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} cambió el tier de ${userData.faceit_nickname || playerDiscordId} a: ${tier || 'Por defecto (Nivel)'}.`, 'system');
      mixtonEvents.emit('update', req.guildId);

      res.json({ success: true, tier });
    } catch (err) {
      logger.error('Error al cambiar tier de jugador:', err);
      res.status(500).json({ error: 'Error al cambiar el tier del jugador.' });
    }
  });

  // 12. Asignar un jugador a un equipo directamente sin esperar turno (Admin)
  router.post('/mixton-assign-player', requireAuth, verifyGuildAdmin, async (req, res) => {
    try {
      const { teamId, discordId } = req.body;
      if (!teamId || !discordId) {
        return res.status(400).json({ error: 'Faltan parámetros (teamId, discordId).' });
      }

      const state = await db.getMixtonLobbyState(req.guildId);
      const team = state.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: 'Equipo no encontrado.' });
      }

      if (team.players && team.players.length >= 4) {
        return res.status(400).json({ error: 'El equipo ya tiene el máximo de 4 jugadores elegidos.' });
      }

      // Buscar al jugador en Firestore
      const data = await db.getFullUser(discordId, req.guildId);
      if (!data) {
        return res.status(404).json({ error: 'Jugador no registrado.' });
      }

      // Resolver detalles de Discord
      const targetGuildId = req.guildId || data.mixton_guild_id || DISCORD_GUILD_ID;
      const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
      let discordUser = null;
      if (guild) {
        discordUser = await getDiscordUserDetails(guild, discordId);
      }

      const playerObj = {
        discordId,
        faceit_player_id: data.faceit_player_id || '',
        faceit_nickname: data.faceit_nickname || '',
        faceit_level: data.faceit_level || 1,
        faceit_elo: data.faceit_elo || 1000,
        mixton_tier_override: data.mixton_tier_override || null,
        mixton_guild_id: data.mixton_guild_id || null,
        discordUser
      };

      // Quitar de elegidos de otros equipos si existía
      state.teams.forEach(t => {
        t.players = (t.players || []).filter(p => p.discordId !== discordId);
      });

      // Quitar de capitán si existía
      state.teams.forEach(t => {
        if (t.captain && t.captain.discordId === discordId) {
          t.captain = null;
        }
      });

      if (!team.players) team.players = [];
      team.players.push(playerObj);

      await db.saveMixtonLobbyState(state, req.guildId);
      mixtonEvents.emit('update', req.guildId);

      logger.success(`Administrador ${req.user.username} asignó manualmente a ${playerObj.faceit_nickname} al equipo ${team.name}`);
      await db.addLogEntry('info', `El administrador ${req.user.username} asignó manualmente a ${playerObj.faceit_nickname} al equipo ${team.name}.`, 'system');

      res.json({ success: true, state });
    } catch (err) {
      logger.error('Error al asignar jugador manualmente:', err);
      res.status(500).json({ error: 'Error al asignar jugador.' });
    }
  });



  return router;
}

