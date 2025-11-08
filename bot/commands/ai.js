const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with the AI assistant')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('context')
        .setDescription('Additional context for the AI')
        .setRequired(false)
    ),
  
  cooldown: 10,
  
  async execute(interaction, convex) {
    await interaction.deferReply();

    const message = interaction.options.getString('message');
    const context = interaction.options.getString('context');

    try {
      const response = await convex.action('ai:chatWithAI', {
        message: message,
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channel.id,
        context: context,
      });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🤖 AI Assistant')
        .addFields(
          { name: '❓ Your Question', value: message, inline: false },
          { name: '💬 AI Response', value: response, inline: false }
        )
        .setFooter({ text: `Asked by ${interaction.user.tag}` })
        .setTimestamp();

      if (context) {
        embed.addFields({ name: '📝 Context', value: context, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('AI chat error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ AI Error')
        .setDescription('Sorry, I\'m having trouble processing your request right now.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
