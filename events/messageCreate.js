import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { env } from '../config/index.js';

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
  // Ignorar mensajes del bot, DM, o fuera de guilds
  if (message.author.bot || !message.guild) return;

  // Feature flag
  if (!(await isFeatureEnabled('adminCallNotifications'))) return;

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
    const adminRoleName = env.ADMIN_ROLE_NAME || 'ADMIN';
    const adminRole = guild.roles.cache.find(r => r.name.toUpperCase() === adminRoleName.toUpperCase());
    let admins = adminRole ? adminRole.members : null;

    if (!admins || admins.size === 0) {
      admins = guild.members.cache.filter(m => m.permissions.has('Administrator'));
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
