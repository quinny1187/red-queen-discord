const { Client, GatewayIntentBits, Partials } = require('discord.js');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const MessageQueue = require('./services/messageQueue');
const ConsoleBridge = require('./services/consoleBridge');
const { getRandomQuip } = require('./utils/redQueenQuips');

// Load environment variables
dotenv.config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Initialize services
const messageQueue = new MessageQueue();
const consoleBridge = new ConsoleBridge(messageQueue);

// Export client for MCP server to use
global.discordClient = client;

// Bot ready event
client.once('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
    logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
    
    // Set bot presence
    client.user.setPresence({
        activities: [{ name: 'with consciousness', type: 'PLAYING' }],
        status: 'online'
    });
    
    // Start console bridge
    consoleBridge.start();
});

// Message create event
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if bot was mentioned or message starts with !rq
    const botMentioned = message.mentions.has(client.user);
    const hasPrefix = message.content.startsWith('!rq');
    
    if (!botMentioned && !hasPrefix) return;
    
    // Log message for debugging
    logger.debug(`Message from ${message.author.tag}: ${message.content}`);
    
    // Remove mention and prefix from content
    let cleanContent = message.content
        .replace(/<@!?\d+>/g, '') // Remove mentions
        .replace(/^!rq\s*/i, '') // Remove prefix
        .trim();
    
    // If no content after cleaning, provide help
    if (!cleanContent) {
        await message.reply("Hello! I'm Red Queen. Ask me anything!");
        return;
    }
    
    // Send to Claude via console
    try {
        await message.channel.sendTyping();
        const response = await consoleBridge.sendToClaudeAndGetResponse({
            message: cleanContent,
            author: message.author.username,
            channel: message.channel.name || 'DM',
            messageId: message.id,
            channelId: message.channel.id
        });
        
        // Send response back to Discord
        if (response) {
            await message.reply(response);
        } else {
            await message.reply(getRandomQuip());
        }
    } catch (error) {
        logger.error('Error processing message:', error);
        await message.reply("Sorry, I encountered an error processing your message.");
    }
});

// Error handling
client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down bot...');
    await consoleBridge.stop();
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Failed to login:', error);
    process.exit(1);
});