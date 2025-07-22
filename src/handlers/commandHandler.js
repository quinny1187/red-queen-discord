const logger = require('../utils/logger');

class CommandHandler {
    constructor(client, messageQueue) {
        this.client = client;
        this.messageQueue = messageQueue;
        this.prefix = process.env.BOT_PREFIX || '!rq';
    }
    
    async handleMessage(message) {
        // Check if message starts with prefix
        if (!message.content.startsWith(this.prefix)) {
            // Check if bot was mentioned
            if (message.mentions.has(this.client.user)) {
                await this.handleMention(message);
            }
            return;
        }
        
        // Parse command and arguments
        const args = message.content.slice(this.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        logger.debug(`Command: ${command}, Args: ${args.join(', ')}`);
        
        // Handle commands
        switch (command) {
            case 'help':
                await this.helpCommand(message);
                break;
            case 'status':
                await this.statusCommand(message);
                break;
            case 'ping':
                await this.pingCommand(message);
                break;
            case 'ask':
                await this.askCommand(message, args);
                break;
            default:
                await message.reply(`Unknown command. Use \`${this.prefix} help\` for available commands.`);
        }
    }
    
    async handleMention(message) {
        // Remove mention from content
        const content = message.content.replace(/<@!?\d+>/g, '').trim();
        
        if (!content) {
            await message.reply("Hello! How can I help you? Ask me anything!");
            return;
        }
        
        // Treat as ask command
        await this.askCommand(message, content.split(' '));
    }
    
    async helpCommand(message) {
        const embed = {
            color: 0xff0000,
            title: '👑 Red Queen Help',
            description: 'Available commands:',
            fields: [
                {
                    name: `${this.prefix} help`,
                    value: 'Show this help message'
                },
                {
                    name: `${this.prefix} status`,
                    value: 'Check bot status'
                },
                {
                    name: `${this.prefix} ping`,
                    value: 'Check bot latency'
                },
                {
                    name: `${this.prefix} ask [question]`,
                    value: 'Ask Red Queen anything'
                },
                {
                    name: `@Red Queen [question]`,
                    value: 'Mention me to ask a question'
                }
            ],
            footer: {
                text: 'Red Queen Discord Bot'
            }
        };
        
        await message.reply({ embeds: [embed] });
    }
    
    async statusCommand(message) {
        const uptime = this.formatUptime(this.client.uptime);
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const embed = {
            color: 0x00ff00,
            title: '📊 Bot Status',
            fields: [
                {
                    name: 'Uptime',
                    value: uptime,
                    inline: true
                },
                {
                    name: 'Memory Usage',
                    value: `${memUsage} MB`,
                    inline: true
                },
                {
                    name: 'Servers',
                    value: this.client.guilds.cache.size.toString(),
                    inline: true
                },
                {
                    name: 'Messages in Queue',
                    value: (await this.messageQueue.getMessages()).length.toString(),
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        
        await message.reply({ embeds: [embed] });
    }
    
    async pingCommand(message) {
        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong! Latency: ${latency}ms, API Latency: ${Math.round(this.client.ws.ping)}ms`);
    }
    
    async askCommand(message, args) {
        if (args.length === 0) {
            await message.reply('Please provide a question!');
            return;
        }
        
        const question = args.join(' ');
        
        // For now, just acknowledge the question
        // In the future, this will send to Red Queen console
        await message.reply(`🤔 Processing: "${question}"\n\n*This feature is coming soon! The bot will connect to Red Queen AI to answer your questions.*`);
    }
    
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

module.exports = CommandHandler;