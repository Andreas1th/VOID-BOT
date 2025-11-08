const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get info about')
        .setRequired(false)
    ),
  
  cooldown: 3,
  
  async execute(interaction, convex) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    try {
      // Get user warnings and permissions
      const [warnings, permissions] = await Promise.all([
        convex.query('bot:getUserWarnings', {
          userId: target.id,
          guildId: interaction.guild.id,
        }),
        convex.query('bot:getUserPermissions', {
          userId: target.id,
          guildId: interaction.guild.id,
        })
      ]);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`👤 User Information: ${target.tag}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '🆔 User ID', value: target.id, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
          { name: '🤖 Bot', value: target.bot ? 'Yes' : 'No', inline: true }
        );

      if (member) {
        embed.addFields(
          { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
          { name: '🎭 Roles', value: member.roles.cache.filter(role => role.id !== interaction.guild.id).map(role => role.toString()).join(', ') || 'None', inline: false },
          { name: '🏆 Highest Role', value: member.roles.highest.toString(), inline: true }
        );

        if (member.premiumSince) {
          embed.addFields({ name: '💎 Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`, inline: true });
        }
      }

      // Add bot-specific information
      if (permissions && permissions.roles.length > 0) {
        embed.addFields({
          name: '🛡️ Bot Permissions',
          value: permissions.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', '),
          inline: true
        });
      }

      if (warnings.length > 0) {
        embed.addFields({
          name: '⚠️ Active Warnings',
          value: warnings.length.toString(),
          inline: true
        });
      }

      // Add user status and activities
      if (member && member.presence) {
        const status = member.presence.status;
        const statusEmoji = {
          online: '🟢',
          idle: '🟡',
          dnd: '🔴',
          offline: '⚫'
        };

        embed.addFields({
          name: '📱 Status',
          value: `${statusEmoji[status] || '⚫'} ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          inline: true
        });

        if (member.presence.activities.length > 0) {
          const activity = member.presence.activities[0];
          embed.addFields({
            name: '🎮 Activity',
            value: `${activity.type === 0 ? 'Playing' : activity.type === 2 ? 'Listening to' : 'Watching'} ${activity.name}`,
            inline: true
          });
        }
      }

      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('User info error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('Failed to get user information.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
