import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { fetchFaceitPlayerById, fetchCurrentHubSeason } from '../services/faceitApi.js';
import { syncMemberLevelRole, getPlayerSkillLevel, syncMemberNickname } from '../services/roles.js';
import { logger } from '../utils/logger.js';
import { playerCache } from '../utils/cache.js';
import { env, getEffectiveConfigForGuild } from '../config/index.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export const data = new SlashCommandBuilder()
  .setName('sincronizar_fc')
  .setDescription('Sincroniza manualmente tus roles de Discord con tu nivel actual de Faceit');

export async function execute(interaction, db) {
  const isEnabled = await isFeatureEnabled('command_sincronizar', interaction.guildId);
  if (isEnabled === false) {
    return interaction.reply({ content: '❌ Este comando está desactivado por el administrador.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordId = interaction.user.id;

  try {
    if (!env.FACEIT_API_KEY || env.FACEIT_API_KEY.startsWith('TU_')) {
      return interaction.editReply('❌ El administrador no ha configurado la API Key de Faceit.');
    }

    // 1. Obtener la vinculación desde la base de datos
    const userData = await db.getFaceitIdByDiscordId(discordId, interaction.guildId);
    if (!userData || !userData.faceit_player_id) {
      return interaction.editReply('❌ No tienes una cuenta de Faceit vinculada. Usa `/verificar_fc` primero para vincular tu cuenta.');
    }

    const faceitPlayerId = userData.faceit_player_id;
    const faceitNickname = userData.faceit_nickname;

    // 2. Consultar datos de Faceit
    const player = await fetchFaceitPlayerById(faceitPlayerId);
    const skillLevel = getPlayerSkillLevel(player);
    const elo = player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0;

    if (!skillLevel) {
      return interaction.editReply(`❌ No se pudo encontrar un nivel activo en Faceit para el perfil **${faceitNickname}**.`);
    }

    // 3. Sincronizar roles y apodo en Discord
    if (interaction.guild) {
      await syncMemberLevelRole(interaction.guild, discordId, skillLevel);
      await syncMemberNickname(interaction.guild, discordId, player.nickname || faceitNickname);
    }

    // 4. Actualizar base de datos con stats y season actual
    try {
      const guildConfig = await getEffectiveConfigForGuild(interaction.guildId);
      const currentSeason = await fetchCurrentHubSeason(guildConfig.faceitLeaderboardId || guildConfig.faceitHubId).catch(() => null);
      await db.updatePlayerStats(discordId, skillLevel, elo, interaction.guildId, currentSeason);
    } catch (dbErr) {
      logger.error('Error al actualizar stats y season en DB durante sincronización:', dbErr.message);
    }

    // 5. Actualizar cache en memoria
    playerCache.set(discordId, { faceitId: faceitPlayerId, nickname: faceitNickname, level: skillLevel });

    // 5. Enviar respuesta exitosa
    await interaction.editReply({
      content: `✅ ¡Sincronización completa!\n\n` +
        `Tu cuenta de Discord <@${discordId}> está sincronizada con el perfil de Faceit **${faceitNickname}**.\n` +
        `🎮 **Nivel Faceit:** Level ${skillLevel}\n` +
        `⚡ **ELO:** ${elo} ELO`
    });

    await db.addLogEntry('info', `Usuario ${interaction.user.tag} sincronizó manualmente su nivel Faceit (${skillLevel}) y roles.`, 'bot');

  } catch (error) {
    logger.error(`Error en el comando /sincronizar_fc para ${interaction.user.tag}:`, error);
    await interaction.editReply(`❌ Ocurrió un error al intentar sincronizar tu cuenta: ${error.message}`);
  }
}
