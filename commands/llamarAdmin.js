import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { env, getEffectiveConfigForGuild } from '../config/index.js';

export const data = new SlashCommandBuilder()
  .setName('llamar_admin')
  .setDescription('Solicita un admin para tu partida activa en Faceit');

export async function execute(interaction, db) {
  if (!(await isFeatureEnabled('adminCallNotifications', interaction.guildId))) {
    return interaction.reply({ content: '❌ La función de llamada a admin está desactivada.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 1. Obtener faceit_id del usuario
    let userData = await db.getFaceitIdByDiscordId(interaction.user.id, interaction.guildId);
    if (!userData || !userData.faceit_player_id) {
      const fullUser = await db.getFullUser(interaction.user.id, interaction.guildId);
      if (fullUser && fullUser.faceit_player_id) {
        userData = fullUser;
      }
    }

    if (!userData || !userData.faceit_player_id) {
      return interaction.editReply({ content: '❌ No tienes una cuenta de Faceit vinculada. Usa `/verificar_fc` o conéctala desde la web.' });
    }

    // 2. Buscar partida activa del usuario
    const activeMatch = await db.getActiveMatchByPlayerId(userData.faceit_player_id);
    if (!activeMatch) {
      return interaction.editReply({ content: '❌ No estás en ninguna partida activa en este momento.' });
    }

    // 3. Buscar admins en el servidor
    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ content: '❌ Este comando solo funciona dentro de un servidor.' });
    }

    const config = await getEffectiveConfigForGuild(guild.id).catch(() => ({}));
    const adminRoleId = config.adminRoleId || env.ADMIN_ROLE_ID;
    const adminRole = adminRoleId ? (guild.roles.cache.get(adminRoleId) || guild.roles.cache.find(r => r.name.toUpperCase() === adminRoleId.toUpperCase())) : null;
    let admins = adminRole ? adminRole.members : null;

    if (!admins || admins.size === 0) {
      admins = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator));
    }

    if (admins.size === 0) {
      return interaction.editReply({ content: '⚠️ No hay admins disponibles para atender tu solicitud.' });
    }

    // 4. Enviar DM a cada admin
    const matchUrl = `https://www.faceit.com/en/cs2/room/${activeMatch.id}`;
    const embed = new EmbedBuilder()
      .setTitle('🚨 Solicitud de Admin')
      .setColor(0xFF0000)
      .setDescription(`El jugador **${interaction.user.tag}** (${userData.faceit_nickname}) ha solicitado un admin en su partida.`)
      .addFields(
        { name: '🔗 Partida', value: `[Hacer clic aquí](${matchUrl})`, inline: false },
        { name: '📋 Detalles', value: `**${activeMatch.faction1_name}** vs **${activeMatch.faction2_name}**\n🗺️ Mapa: \`${activeMatch.map}\`\n📍 Servidor: \`${(activeMatch.location || 'N/A').toUpperCase()}\``, inline: false },
        { name: '👤 Jugador', value: `<@${interaction.user.id}>`, inline: true },
        { name: '💬 Canal', value: `<#${interaction.channelId}>`, inline: true }
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
    await db.addLogEntry('warn', `Solicitud de admin de ${interaction.user.tag} en partida ${activeMatch.id}. DMs enviados: ${sentCount}/${admins.size}`, 'bot');

    // 5. Responder al usuario
    return interaction.editReply({
      content: `✅ Se ha notificado a **${sentCount} admin(s)**. Te atenderán pronto.`
    });

  } catch (err) {
    logger.error('Error procesando /llamar_admin:', err);
    return interaction.editReply({ content: '❌ Error al procesar tu solicitud. Intenta de nuevo.' });
  }
}

