import { SlashCommandBuilder, ChannelType, MessageFlags } from 'discord.js';
import { checkIsAdmin } from '../services/adminCheck.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Hace que el bot escriba el texto ingresado (solo usuarios con rol admin configurado)')
  .addStringOption(option =>
    option
      .setName('texto')
      .setDescription('El texto que quieres que el bot escriba')
      .setRequired(true)
  )
  .addChannelOption(option =>
    option
      .setName('canal')
      .setDescription('Canal de texto donde enviar el mensaje (opcional)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  );

export async function execute(interaction, db) {
  // Deferir respuesta de inmediato de forma efímera para evitar "Unknown interaction" o timeouts de Discord
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = interaction.member;
  const guild = interaction.guild;

  if (!guild || !member) {
    return interaction.editReply({ content: '❌ Este comando solo se puede usar dentro de un servidor.' });
  }

  // Verificar si el usuario tiene el rol admin configurado o permisos de Administrador
  const isAdmin = await checkIsAdmin(member, guild);
  if (!isAdmin) {
    return interaction.editReply({
      content: '❌ No tienes permisos para usar este comando. Solo los miembros con el rol admin configurado pueden usarlo.'
    });
  }

  const texto = interaction.options.getString('texto');
  const targetChannel = interaction.options.getChannel('canal') || interaction.channel;

  if (!targetChannel || !targetChannel.isTextBased()) {
    return interaction.editReply({ content: '❌ El canal seleccionado no es un canal de texto válido.' });
  }

  try {
    await targetChannel.send(texto);
    return interaction.editReply({ content: '✅ Mensaje enviado correctamente.' });
  } catch (err) {
    logger.error('Error al enviar mensaje en /say:', err);
    return interaction.editReply({ content: `❌ Error al enviar el mensaje en el canal: ${err.message}` });
  }
}
