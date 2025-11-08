const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
    ),
  
  async execute(interaction, convex) {
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      // Show help for specific command
      const command = interaction.client.commands.get(commandName);
      if (!command) {
        return interaction.reply({
          content: `❌ Command \`${commandName}\` not found!`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📖 Help: /${command.data.name}`)
        .setDescription(command.data.description)
        .addFields(
          { name: '🔧 Usage', value: `\`/${command.data.name}\``, inline: false },
          { name: '⏰ Cooldown', value: `${command.cooldown || 3} seconds`, inline: true },
          { name: '🔒 Permission', value: command.permission || 'Everyone', inline: true }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // Show all commands categorized
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🤖 Bot Commands')
      .setDescription('Here are all available commands organized by category:')
      .addFields(
        {
          name: '🔍 **Script Commands**',
          value: '`/search` - Search for Roblox scripts\n`/addscript` - Add a new script\n`/verifyscript` - Verify a script (Staff+)',
          inline: false
        },
        {
          name: '🛡️ **Moderation Commands**',
          value: '`/ban` - Ban a user\n`/kick` - Kick a user\n`/mute` - Mute a user\n`/warn` - Warn a user\n`/warnings` - Check user warnings',
          inline: false
        },
        {
          name: '🔧 **Admin Commands**',
          value: '`/addstaff` - Add staff member\n`/removestaff` - Remove staff member\n`/config` - Configure bot settings\n`/purge` - Delete messages',
          inline: false
        },
        {
          name: '🤖 **AI Commands**',
          value: '`/ai` - Chat with AI assistant\n`/analyze` - Analyze code/script\n`/explain` - Explain Lua concepts',
          inline: false
        },
        {
          name: '🔒 **Security Commands**',
          value: '`/lockdown` - Lock server\n`/antispam` - Configure anti-spam\n`/automod` - Configure auto-moderation',
          inline: false
        },
        {
          name: '📊 **Utility Commands**',
          value: '`/userinfo` - Get user information\n`/serverinfo` - Get server information\n`/ping` - Check bot latency',
          inline: false
        }
      )
      .setFooter({ text: 'Use /help <command> for detailed information about a specific command' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
