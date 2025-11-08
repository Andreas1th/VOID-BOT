const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    ),
  
  permission: 'moderator',
  cooldown: 3,
  
  async execute(interaction, convex) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteMessageDays = interaction.options.getInteger('days') || 0;

    // Check if user can be banned
    const member = interaction.guild.members.cache.get(target.id);
    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: '❌ You cannot ban someone with equal or higher roles!',
          ephemeral: true,
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: '❌ I cannot ban this user! Check my permissions and role hierarchy.',
          ephemeral: true,
        });
      }
    }

    try {
      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
        reason: `${reason} | Banned by ${interaction.user.tag}`,
      });

      // Log to database
      await convex.mutation('bot:addModerationLog', {
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        targetUserId: target.id,
        action: 'ban',
        reason: reason,
      });

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔨 User Banned')
        .addFields(
          { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '🗑️ Messages Deleted', value: `${deleteMessageDays} days`, inline: true }
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle(`🔨 You have been banned from ${interaction.guild.name}`)
          .addFields(
            { name: '📝 Reason', value: reason },
            { name: '👮 Moderator', value: interaction.user.tag }
          )
          .setTimestamp();

        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled or blocked the bot
      }

    } catch (error) {
      console.error('Ban error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Ban Failed')
        .setDescription('Failed to ban the user. Please check my permissions.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
