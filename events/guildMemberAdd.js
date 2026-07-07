import { createWelcomeEmbed } from '../services/matchMessages.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/index.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export async function onGuildMemberAdd(member, db) {
  if (!(await isFeatureEnabled('autoWelcomeDm'))) {
    return;
  }

  logger.info(`Nuevo miembro se ha unido al servidor: ${member.user.tag}`);

  const clubUrl = 'https://www.faceit.com/es/club/e72c25e6-74e5-415b-97da-e541296ff1db/queue/9ccf9665-c715-4938-8edd-1ab17bc7d263/chat';
  const linkChannelId = env.DISCORD_LINK_CHANNEL_ID;
  const linkChannelMention = linkChannelId && !linkChannelId.startsWith('ID_') ? `<#${linkChannelId}>` : 'el canal de vinculación';

  try {
    const templates = await db.getMessageTemplates();
    const embed = createWelcomeEmbed(member, clubUrl, linkChannelMention, templates);
    await member.send({ embeds: [embed] });
    logger.success(`Mensaje de bienvenida enviado por DM a ${member.user.tag}`);
  } catch (err) {
    logger.warn(`No se pudo enviar mensaje privado de bienvenida a ${member.user.tag}:`, err.message);
  }
}
