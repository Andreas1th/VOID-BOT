const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for Roblox scripts')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('What to search for')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Script category')
        .setRequired(false)
        .addChoices(
          { name: 'Universal', value: 'universal' },
          { name: 'Game-Specific', value: 'game-specific' },
          { name: 'GUI', value: 'gui' },
          { name: 'Exploit', value: 'exploit' }
        )
    )
    .addBooleanOption(option =>
      option.setName('verified')
        .setDescription('Only show verified scripts')
        .setRequired(false)
    ),
  
  cooldown: 5,
  
  async execute(interaction, convex) {
    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const category = interaction.options.getString('category');
    const verified = interaction.options.getBoolean('verified');

    try {
      // Search scripts using Convex
      const results = await convex.action('scripts:searchRobloxScripts', {
        query: query,
      });

      if (results.total === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🔍 No Scripts Found')
          .setDescription(`No scripts found for query: **${query}**`)
          .addFields(
            { name: '💡 Suggestions', value: '• Try different keywords\n• Check spelling\n• Use broader search terms' }
          );

        return interaction.editReply({ embeds: [embed] });
      }

      // Create embed with results
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`🔍 Script Search Results: "${query}"`)
        .setDescription(`Found ${results.total} scripts`)
        .setTimestamp();

      // Add database results
      if (results.database.length > 0) {
        const dbScripts = results.database.slice(0, 5).map(script => 
          `**${script.name}** ${script.verified ? '✅' : '⚠️'}\n` +
          `*${script.description}*\n` +
          `Category: ${script.category} | Downloads: ${script.downloads}`
        ).join('\n\n');

        embed.addFields({
          name: '📚 Database Scripts',
          value: dbScripts,
          inline: false
        });
      }

      // Add external results
      if (results.external.length > 0) {
        const externalScripts = results.external.slice(0, 3).map(script =>
          `**${script.name}**\n*${script.description}*\nSource: ${script.source}`
        ).join('\n\n');

        embed.addFields({
          name: '🌐 External Sources',
          value: externalScripts,
          inline: false
        });
      }

      // Create action buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`search_more_${query}`)
            .setLabel('Show More')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📄'),
          new ButtonBuilder()
            .setCustomId(`search_filter_${query}`)
            .setLabel('Filter Results')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔧'),
          new ButtonBuilder()
            .setCustomId(`add_script`)
            .setLabel('Add Script')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕')
        );

      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Search error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Search Error')
        .setDescription('Failed to search for scripts. Please try again later.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
