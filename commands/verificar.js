import { SlashCommandBuilder } from 'discord.js';
import { fetchFaceitPlayer } from '../services/faceitApi.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/index.js';
import { isFeatureEnabled, getSettings } from '../utils/featureFlags.js';
import { syncMemberLevelRole, getPlayerSkillLevel } from '../services/roles.js';
import { playerCache } from '../utils/cache.js';

export const data = new SlashCommandBuilder()
  .setName('verificar_fc')
  .setDescription('Vincula tu cuenta de Discord con tu perfil de Faceit')
  .addStringOption(option =>
    option.setName('nickname')
      .setDescription('Tu nickname exacto en Faceit')
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_verificar');
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', ephemeral: true });
  }

  const settings = await getSettings().catch(() => ({}));
  const linkChannelId = settings.discordLinkChannelId || env.DISCORD_LINK_CHANNEL_ID;
  const isConfigured = linkChannelId && !linkChannelId.startsWith('ID_') && !linkChannelId.startsWith('ID-');

  if (!isConfigured) {
    return interaction.reply({
      content: '❌ El canal de vinculación no está configurado por el administrador.',
      ephemeral: true,
    });
  }

  const allowedChannels = linkChannelId.split(',').map(id => id.trim()).filter(Boolean);
  if (!allowedChannels.includes(interaction.channelId)) {
    const channelMentions = allowedChannels.map(id => `<#${id}>`).join(' o ');
    return interaction.reply({
      content: `❌ Este comando solo se puede usar en el canal de vinculación: ${channelMentions}.`,
      ephemeral: true,
    });
  }

  const nickname = interaction.options.getString('nickname');
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    if (!env.FACEIT_API_KEY || env.FACEIT_API_KEY.startsWith('TU_')) {
      return interaction.editReply('❌ El administrador no ha configurado la API Key de Faceit.');
    }

    const player = await fetchFaceitPlayer(nickname);

    const existingDiscordId = await db.getDiscordIdByFaceitId(player.player_id, interaction.guildId);
    if (existingDiscordId) {
      if (existingDiscordId === discordId) {
        return interaction.editReply(`ℹ️ Tu cuenta de Discord ya está vinculada al perfil de Faceit **${player.nickname}**.`);
      } else {
        return interaction.editReply(`❌ La cuenta de Faceit **${player.nickname}** ya está vinculada al usuario de Discord <@${existingDiscordId}>.`);
      }
    }

    const skillLevel = getPlayerSkillLevel(player);
    const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;

    if (!skillLevel) {
      return interaction.editReply(`❌ No se encontró nivel de CS2/CS:GO activo para tu perfil.`);
    }

    // Enlazar cuentas guardando nivel y elo
    await db.linkAccounts(discordId, player.player_id, player.nickname, skillLevel, elo, interaction.guildId);
    await db.addLogEntry('success', `El usuario ${interaction.user.tag} vinculó su cuenta directamente con Faceit ID ${player.nickname}`, 'bot', interaction.guildId);
    playerCache.set(`${interaction.guildId}_${discordId}`, { faceitId: player.player_id, nickname: player.nickname, level: skillLevel });

    // Sincronizar roles
    const autoRoleSync = await isFeatureEnabled('autoRoleSync', interaction.guildId);
    if (autoRoleSync && interaction.guild) {
      await syncMemberLevelRole(interaction.guild, discordId, skillLevel);
    }

    const faceitProfileUrl = `https://www.faceit.com/en/players/${player.nickname}`;

    // Responder con éxito (efímero al usuario)
    await interaction.editReply({
      content: `✅ ¡Vinculación exitosa!\n\n` +
        `Tu cuenta de Discord ahora está vinculada al perfil de Faceit **[${player.nickname}](${faceitProfileUrl})** (Nivel ${skillLevel}).`
    });

    // Enviar mensaje público al canal de vinculación para notificar al servidor
    if (linkChannelId && interaction.guild) {
      const channel = await interaction.guild.channels.fetch(linkChannelId).catch(() => null);
      if (channel) {
        await channel.send({
          content: `✨ ¡El usuario <@${discordId}> se ha verificado exitosamente con su perfil de Faceit **[${player.nickname}](${faceitProfileUrl})** (Nivel ${skillLevel})! 🎉`
        }).catch(() => {});
      }
    }

  } catch (error) {
    logger.error('Error en el comando /verificar_fc:', error);
    if (error.message === 'PLAYER_NOT_FOUND') {
      return interaction.editReply(`❌ No se encontró ningún jugador con el nickname **${nickname}** en Faceit.`);
    }
    await interaction.editReply({
      content: `❌ Ocurrió un error al intentar iniciar la vinculación. Detalles: ${error.message}`,
    });
  }
}
