import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getEffectiveConfigForGuild } from '../config/index.js';
import { fetchFaceitPlayerById } from '../services/faceitApi.js';

export const data = new SlashCommandBuilder()
  .setName('sancionar')
  .setDescription('Aplica y notifica una sanción o baneo temporal a un usuario en Discord/Hub')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('El usuario de Discord a sancionar')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('duracion')
      .setDescription('Duración de la sanción (ej: 12h, 24h, 3d, 7d, perm)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('razon')
      .setDescription('Motivo o razón de la sanción')
      .setRequired(false)
  );

export async function execute(interaction, db) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const targetUser = interaction.options.getUser('usuario');
  const duracionInput = interaction.options.getString('duracion').trim().toLowerCase();
  const razon = interaction.options.getString('razon') || 'Comportamiento antideportivo / Violación de reglas del Hub';

  const guildId = interaction.guildId;
  const config = await getEffectiveConfigForGuild(guildId);
  const sanctionsChannelId = config.discordSanctionsChannelId;

  if (!sanctionsChannelId || sanctionsChannelId.startsWith('ID_')) {
    return interaction.editReply('❌ No está configurado el canal de sanciones en el bot. Configura `ID Canal Alertas de Sanciones (Baneos)` en el panel.');
  }

  const channel = await interaction.guild.channels.fetch(sanctionsChannelId).catch(() => null);
  if (!channel) {
    return interaction.editReply('❌ No se encontró el canal de sanciones en este servidor.');
  }

  // Parsear duración
  let durationMs = 0;
  let durationStr = 'Permanente';
  let dateStr = '';
  let endsDate = null;

  if (duracionInput.endsWith('h')) {
    const hours = parseInt(duracionInput.replace('h', ''), 10);
    if (!isNaN(hours)) {
      durationMs = hours * 3600 * 1000;
      endsDate = new Date(Date.now() + durationMs);
    }
  } else if (duracionInput.endsWith('d')) {
    const days = parseInt(duracionInput.replace('d', ''), 10);
    if (!isNaN(days)) {
      durationMs = days * 24 * 3600 * 1000;
      endsDate = new Date(Date.now() + durationMs);
    }
  } else if (duracionInput.endsWith('m')) {
    const mins = parseInt(duracionInput.replace('m', ''), 10);
    if (!isNaN(mins)) {
      durationMs = mins * 60 * 1000;
      endsDate = new Date(Date.now() + durationMs);
    }
  }

  if (endsDate) {
    const unixSeconds = Math.floor(endsDate.getTime() / 1000);
    durationStr = `Expira <t:${unixSeconds}:R>`;
    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    dateStr = `\n(${endsDate.toLocaleString('es-ES', options).replace(',', '')})`;
  }

  // Buscar vinculación de Faceit si existe
  const faceitId = await db.getFaceitIdByDiscordId(targetUser.id, guildId).catch(() => null);
  let playerNickname = targetUser.username;
  let playerAvatar = targetUser.displayAvatarURL({ dynamic: true });

  if (faceitId) {
    const playerDetails = await fetchFaceitPlayerById(faceitId).catch(() => null);
    if (playerDetails) {
      playerNickname = playerDetails.nickname || playerNickname;
      if (playerDetails.avatar) playerAvatar = playerDetails.avatar;
    }
  }

  const hubId = config.faceitHubId || 'GENERAL';
  const hubAvatar = 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png';

  const embed = new EmbedBuilder()
    .setTitle('🚫 Sanción Aplicada (Moderación Administrador)')
    .setDescription(`Se ha registrado una sanción administrativa para el jugador <@${targetUser.id}>.`)
    .setColor(0xFF0033)
    .setThumbnail(playerAvatar)
    .addFields(
      { name: '👤 Jugador Sancionado', value: `<@${targetUser.id}> (**[${playerNickname}](https://www.faceit.com/es/players/${playerNickname})**)`, inline: true },
      { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
      { name: '❗ Motivo / Razón', value: razon, inline: false },
      { name: '🕒 Duración / Expiración', value: `${durationStr}${dateStr}`, inline: false }
    )
    .setFooter({ text: 'Sistema de Moderación Discord/FACEIT • Registro de Sanciones', iconURL: 'https://assets.faceit-cdn.net/hubs/avatar/default_150x150.png' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(err => {
    logger.error('Error al enviar embed de sanción:', err);
  });

  // Guardar en Firestore cache
  await db.addHubBanToCache(hubId, targetUser.id, {
    nickname: playerNickname,
    discordId: targetUser.id,
    reason: razon,
    endsAt: endsDate ? endsDate.toISOString() : null,
    bannedBy: interaction.user.tag,
    sourceEvent: 'manual_slash_command'
  });

  await db.addLogEntry('warn', `Sanción aplicada a ${targetUser.tag} (${duracionInput}): ${razon}`, 'bot', guildId);

  return interaction.editReply({
    content: `✅ **Sanción notificada exitosamente** en el canal <#${sanctionsChannelId}> para <@${targetUser.id}> (${duracionInput}).`
  });
}
