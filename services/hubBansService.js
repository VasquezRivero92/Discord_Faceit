import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { env, getEffectiveConfigForGuild } from '../config/index.js';
import { fetchAllHubBans, fetchFaceitPlayerById } from './faceitApi.js';

export async function checkAndNotifyHubBans(client, db) {
  try {
    if (!client.guilds || !client.user) return;
    
    const guilds = client.guilds.cache.map(g => g.id);
    const checkedHubIds = new Set();

    for (const guildId of guilds) {
      const config = await getEffectiveConfigForGuild(guildId);
      const hubId = config.faceitHubId;
      const sanctionsChannelId = config.discordSanctionsChannelId;

      if (!hubId || hubId.startsWith('ID_') || !sanctionsChannelId || sanctionsChannelId.startsWith('ID_')) {
        continue;
      }

      if (checkedHubIds.has(hubId)) continue;
      checkedHubIds.add(hubId);

      const sanctionsChannel = await client.channels.fetch(sanctionsChannelId).catch(() => null);
      if (!sanctionsChannel || sanctionsChannel.guild?.id !== guildId) continue;

      // 1. Obtener lista actual de baneos desde FACEIT
      const currentBans = await fetchAllHubBans(hubId);
      if (currentBans === null) {
        logger.info(`Omitiendo comparación de baneos para el Hub/Club ${hubId} porque el recurso de baneos no está disponible en la API.`);
        continue;
      }
      
      // 2. Obtener lista cacheada desde la DB
      const cachedBans = await db.getHubBansCache(hubId);
      const cachedBansMap = new Map(cachedBans.map(b => [b.userId, b]));

      // Hub info (para avatar del Hub)
      const hubAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

      // 3. Identificar nuevos baneos
      for (const ban of currentBans) {
        const userId = ban.user?.user_id;
        if (!userId) continue;

        if (!cachedBansMap.has(userId)) {
          // Nuevo baneo
          const nickname = ban.user?.nickname || userId;
          const reason = ban.reason || 'No especificada';
          const endsAt = ban.ends_at;

          // Obtener avatar del jugador para un embed súper estético
          const playerDetails = await fetchFaceitPlayerById(userId).catch(() => null);
          const playerAvatar = playerDetails?.avatar || 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

          let durationStr = 'Permanente';
          let dateStr = '';
          if (endsAt) {
            const endsDate = new Date(endsAt);
            const unixSeconds = Math.floor(endsDate.getTime() / 1000);
            durationStr = `Expira <t:${unixSeconds}:R>`;
            
            const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
            dateStr = `\n(${endsDate.toLocaleString('es-ES', options).replace(',', '')})`;
          }

          const embed = new EmbedBuilder()
            .setTitle('🚫 Usuario Baneado del Hub')
            .setDescription('El siguiente usuario ha sido baneado del hub.')
            .setColor(0xFF0000) // Rojo
            .setThumbnail(hubAvatar)
            .addFields(
              { name: '👤 Jugador', value: `**[${nickname}](https://www.faceit.com/en/players/${nickname})**\nID: ${userId}`, inline: false },
              { name: '❗ Razón', value: reason, inline: false },
              { name: '🕒 Duración / Expiración', value: `${durationStr}${dateStr}`, inline: false }
            )
            .setFooter({ 
              text: 'FACEIT Hub System', 
              iconURL: playerAvatar 
            })
            .setTimestamp();

          await sanctionsChannel.send({ embeds: [embed] }).catch(err => {
            logger.error(`Error al enviar embed de baneo al canal ${sanctionsChannelId}:`, err);
          });
          
          await db.addHubBanToCache(hubId, userId, {
            nickname,
            reason,
            endsAt: endsAt || null
          });
        }
      }

      // 4. Identificar desbaneos
      const currentBansUserIds = new Set(currentBans.map(b => b.user?.user_id).filter(Boolean));
      for (const cachedBan of cachedBans) {
        const userId = cachedBan.userId;
        if (!currentBansUserIds.has(userId)) {
          // Desbaneado
          const nickname = cachedBan.nickname || userId;

          const playerDetails = await fetchFaceitPlayerById(userId).catch(() => null);
          const playerAvatar = playerDetails?.avatar || 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

          const unbanDate = new Date();
          const unixSeconds = Math.floor(unbanDate.getTime() / 1000);
          const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
          const dateStr = `\n(${unbanDate.toLocaleString('es-ES', options).replace(',', '')})`;

          const embed = new EmbedBuilder()
            .setTitle('✅ Usuario Desbaneado del Hub')
            .setDescription('El siguiente usuario ha sido desbaneado del hub.')
            .setColor(0x00FF00) // Verde
            .setThumbnail(hubAvatar)
            .addFields(
              { name: '👤 Jugador', value: `**[${nickname}](https://www.faceit.com/en/players/${nickname})**\nID: ${userId}`, inline: false },
              { name: '✅ Estado', value: 'El usuario ha sido removido de la lista de baneados.', inline: false },
              { name: '🕒 Fecha de Desbaneo', value: `<t:${unixSeconds}:R>${dateStr}`, inline: false }
            )
            .setFooter({ 
              text: 'FACEIT Hub System', 
              iconURL: playerAvatar 
            })
            .setTimestamp();

          await sanctionsChannel.send({ embeds: [embed] }).catch(err => {
            logger.error(`Error al enviar embed de desbaneo al canal ${sanctionsChannelId}:`, err);
          });

          await db.removeHubBanFromCache(hubId, userId);
        }
      }
    }
  } catch (err) {
    logger.error('Error en checkAndNotifyHubBans:', err);
  }
}
