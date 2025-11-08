const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock the server/channel')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Lock or unlock')
        .setRequired(true)
        .addChoices(
          { name: 'Lock', value: 'lock' },
          { name: 'Unlock', value: 'unlock' }
        )
    )
    .addStringOption(option =>
      option.setName('scope')
        .setDescription('What to lock/unlock')
        .setRequired(true)
        .addChoices(
          { name: 'Current Channel', value: 'channel' },
          { name: 'All Channels', value: 'server' }
        )
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for lockdown')
        .setRequired(false)
    ),
  
  permission: 'admin',
  cooldown: 5,
  
  async execute(interaction, convex) {
    await interaction.deferReply();

    const action = interaction.options.getString('action');
    const scope = interaction.options.getString('scope');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const isLocking = action === 'lock';
      let channelsModified = 0;

      if (scope === 'channel') {
        // Lock/unlock current channel
        const channel = interaction.channel;
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: !isLocking,
        });
        channelsModified = 1;
      } else {
        // Lock/unlock all text channels
        const textChannels = interaction.guild.channels.cache.filter(
          channel => channel.type === 0 // Text channels
        );

        for (const [, channel] of textChannels) {
          try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
              SendMessages: !isLocking,
            });
            channelsModified++;
          } catch (error) {
            console.error(`Failed to ${action} channel ${channel.name}:`, error);
          }
        }
      }

      // Log the action
      await convex.mutation('bot:addModerationLog', {
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        targetUserId: interaction.guild.id, // Using guild ID as target for server-wide actions
        action: `${action}_${scope}`,
        reason: reason,
      });

      const embed = new EmbedBuilder()
        .setColor(isLocking ? '#ff0000' : '#00ff00')
        .setTitle(`🔒 Server ${isLocking ? 'Locked' : 'Unlocked'}`)
        .addFields(
          { name: '🎯 Scope', value: scope === 'channel' ? 'Current Channel' : 'All Channels', inline: true },
          { name: '📊 Channels Modified', value: channelsModified.toString(), inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '📝 Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Send announcement if locking server
      if (isLocking && scope === 'server') {
        const announcementEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🚨 Server Lockdown')
          .setDescription('This server has been temporarily locked by the moderation team.')
          .addFields(
            { name: '📝 Reason', value: reason },
            { name: '👮 Moderator', value: interaction.user.tag }
          )
          .setTimestamp();

        await interaction.followUp({ embeds: [announcementEmbed] });
      }

    } catch (error) {
      console.error('Lockdown error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Lockdown Failed')
        .setDescription('Failed to execute lockdown. Please check my permissions.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
