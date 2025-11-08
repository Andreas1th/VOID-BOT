const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addstaff')
    .setDescription('Add a staff member with specific role')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add as staff')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('role')
        .setDescription('Staff role to assign')
        .setRequired(true)
        .addChoices(
          { name: 'Admin', value: 'admin' },
          { name: 'Moderator', value: 'moderator' },
          { name: 'Staff', value: 'staff' }
        )
    ),
  
  permission: 'admin',
  cooldown: 3,
  
  async execute(interaction, convex) {
    const target = interaction.options.getUser('user');
    const role = interaction.options.getString('role');

    try {
      // Add user permission to database
      await convex.mutation('bot:addUserPermission', {
        userId: target.id,
        guildId: interaction.guild.id,
        role: role,
        addedBy: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Staff Member Added')
        .addFields(
          { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
          { name: '🎭 Role', value: role.charAt(0).toUpperCase() + role.slice(1), inline: true },
          { name: '👮 Added By', value: interaction.user.tag, inline: true }
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle(`🎉 You've been promoted in ${interaction.guild.name}!`)
          .addFields(
            { name: '🎭 New Role', value: role.charAt(0).toUpperCase() + role.slice(1) },
            { name: '👮 Promoted By', value: interaction.user.tag }
          )
          .setDescription('You now have access to staff commands. Use `/help` to see available commands.')
          .setTimestamp();

        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('Add staff error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Failed to Add Staff')
        .setDescription('There was an error adding the staff member.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
