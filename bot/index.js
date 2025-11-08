const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ConvexHttpClient } = require('convex/browser');
const fs = require('fs');
const path = require('path');

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.CONVEX_URL);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Permission checking function
async function hasPermission(userId, guildId, requiredRole) {
  try {
    const userPerms = await convex.query('bot:getUserPermissions', {
      userId: userId,
      guildId: guildId,
    });

    if (!userPerms) return false;

    const roleHierarchy = ['owner', 'admin', 'moderator', 'staff'];
    const userHighestRole = userPerms.roles.reduce((highest, role) => {
      const roleIndex = roleHierarchy.indexOf(role);
      const highestIndex = roleHierarchy.indexOf(highest);
      return roleIndex < highestIndex ? role : highest;
    }, 'staff');

    const requiredIndex = roleHierarchy.indexOf(requiredRole);
    const userIndex = roleHierarchy.indexOf(userHighestRole);

    return userIndex <= requiredIndex;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} is online!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Set bot status
  client.user.setActivity('Roblox Scripts | /help', { type: 'WATCHING' });
  
  // Initialize bot configs for all guilds
  for (const guild of client.guilds.cache.values()) {
    try {
      const existingConfig = await convex.query('bot:getBotConfig', {
        guildId: guild.id,
      });
      
      if (!existingConfig) {
        await convex.mutation('bot:createBotConfig', {
          guildId: guild.id,
          ownerId: guild.ownerId,
          prefix: '!',
        });
        console.log(`✅ Initialized config for ${guild.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize config for ${guild.name}:`, error);
    }
  }
});

// Guild join event
client.on('guildCreate', async (guild) => {
  try {
    await convex.mutation('bot:createBotConfig', {
      guildId: guild.id,
      ownerId: guild.ownerId,
      prefix: '!',
    });
    console.log(`✅ Joined new guild: ${guild.name}`);
  } catch (error) {
    console.error(`❌ Failed to setup new guild ${guild.name}:`, error);
  }
});

// Slash command interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Check permissions
  if (command.permission) {
    const hasPerms = await hasPermission(
      interaction.user.id,
      interaction.guild.id,
      command.permission
    );
    
    if (!hasPerms) {
      return interaction.reply({
        content: '❌ You don\'t have permission to use this command!',
        ephemeral: true,
      });
    }
  }

  // Cooldown handling
  const { cooldowns } = client;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: `⏰ Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`,
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // Execute command
  try {
    await command.execute(interaction, convex);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Command Error')
      .setDescription('There was an error executing this command!')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

// Message event for auto-moderation
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    // Get bot config
    const config = await convex.query('bot:getBotConfig', {
      guildId: message.guild.id,
    });

    if (!config || !config.autoModEnabled) return;

    // AI-powered content moderation
    const modResult = await convex.action('ai:moderateContent', {
      content: message.content,
      guildId: message.guild.id,
    });

    if (modResult.flagged && modResult.severity !== 'low') {
      // Delete the message
      await message.delete();

      // Log the action
      await convex.mutation('bot:addModerationLog', {
        guildId: message.guild.id,
        moderatorId: client.user.id,
        targetUserId: message.author.id,
        action: 'auto_delete',
        reason: `Auto-moderation: ${modResult.reason}`,
      });

      // Send warning to user
      const warningEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('⚠️ Message Removed')
        .setDescription(`Your message was removed by auto-moderation.\nReason: ${modResult.reason}`)
        .setTimestamp();

      await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [warningEmbed],
      });

      // Take additional action based on severity
      if (modResult.action === 'warn') {
        await convex.mutation('bot:addWarning', {
          guildId: message.guild.id,
          userId: message.author.id,
          moderatorId: client.user.id,
          reason: `Auto-moderation: ${modResult.reason}`,
        });
      }
    }
  } catch (error) {
    console.error('Auto-moderation error:', error);
  }
});

// Member join event
client.on('guildMemberAdd', async (member) => {
  try {
    const config = await convex.query('bot:getBotConfig', {
      guildId: member.guild.id,
    });

    if (config && config.welcomeChannelId) {
      const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🎉 Welcome to the Server!')
          .setDescription(`Welcome <@${member.user.id}> to **${member.guild.name}**!`)
          .addFields(
            { name: '📋 Rules', value: config.rulesChannelId ? `Check out <#${config.rulesChannelId}>` : 'Please read the server rules', inline: true },
            { name: '🤖 Bot Commands', value: 'Use `/help` to see available commands', inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await welcomeChannel.send({ embeds: [welcomeEmbed] });
      }
    }
  } catch (error) {
    console.error('Welcome message error:', error);
  }
});

// Error handling
client.on('error', console.error);
client.on('warn', console.warn);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

module.exports = { client, convex, hasPermission };
      
