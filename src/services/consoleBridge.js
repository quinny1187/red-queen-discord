const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

class ConsoleBridge {
    constructor(messageQueue) {
        this.messageQueue = messageQueue;
        this.bridgePath = path.join(process.env.MESSAGE_QUEUE_PATH || './message-queue', 'bridge');
        this.watchInterval = null;
        this.isRunning = false;
        this.pendingResponses = new Map(); // Store pending responses by messageId
    }
    
    async start() {
        try {
            // Create bridge directory
            await fs.mkdir(this.bridgePath, { recursive: true });
            
            // Create initial files
            await this.createBridgeFiles();
            
            // Start watching for responses
            this.watchInterval = setInterval(() => this.checkForResponses(), 1000);
            this.isRunning = true;
            
            // Listen for new messages
            this.messageQueue.on('message', (message) => this.notifyConsole(message));
            
            logger.info('Console bridge started');
        } catch (error) {
            logger.error('Error starting console bridge:', error);
        }
    }
    
    async stop() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }
        this.isRunning = false;
        logger.info('Console bridge stopped');
    }
    
    async createBridgeFiles() {
        // Create incoming messages file
        const incomingFile = path.join(this.bridgePath, 'incoming.json');
        await fs.writeFile(incomingFile, JSON.stringify([], null, 2));
        
        // Create outgoing responses file
        const outgoingFile = path.join(this.bridgePath, 'outgoing.json');
        await fs.writeFile(outgoingFile, JSON.stringify([], null, 2));
        
        // Create status file
        const statusFile = path.join(this.bridgePath, 'status.json');
        await fs.writeFile(statusFile, JSON.stringify({
            connected: true,
            lastUpdate: Date.now()
        }, null, 2));
    }
    
    async notifyConsole(message) {
        try {
            const incomingFile = path.join(this.bridgePath, 'incoming.json');
            
            // Read current messages
            let messages = [];
            try {
                const data = await fs.readFile(incomingFile, 'utf8');
                messages = JSON.parse(data);
            } catch (error) {
                // File might be locked or empty
            }
            
            // Add new message
            messages.push({
                ...message,
                bridgedAt: Date.now()
            });
            
            // Keep only last 100 messages
            if (messages.length > 100) {
                messages = messages.slice(-100);
            }
            
            // Write back
            await fs.writeFile(incomingFile, JSON.stringify(messages, null, 2));
            
            logger.debug(`Bridged message ${message.id} to console`);
        } catch (error) {
            logger.error('Error notifying console:', error);
        }
    }
    
    async writeMessageResponse(requestId, messageId, targetId) {
        try {
            const responsesFile = path.join(this.bridgePath, 'responses.json');
            
            // Read current responses
            let responses = [];
            try {
                const data = await fs.readFile(responsesFile, 'utf8');
                responses = JSON.parse(data);
            } catch (error) {
                // File might not exist
                responses = [];
            }
            
            // Add new response
            responses.push({
                requestId,
                messageId,
                targetId,
                timestamp: Date.now()
            });
            
            // Keep only last 50 responses
            if (responses.length > 50) {
                responses = responses.slice(-50);
            }
            
            // Write back
            await fs.writeFile(responsesFile, JSON.stringify(responses, null, 2));
            logger.info(`Wrote message response: ${messageId}`);
            
        } catch (error) {
            logger.error('Error writing message response:', error);
        }
    }
    
    async checkForResponses() {
        try {
            const outgoingFile = path.join(this.bridgePath, 'outgoing.json');
            
            // Read responses
            let responses = [];
            try {
                const data = await fs.readFile(outgoingFile, 'utf8');
                responses = JSON.parse(data);
            } catch (error) {
                // File might be locked or empty
                return;
            }
            
            // Process responses
            for (const response of responses) {
                if (!response.processed) {
                    await this.processResponse(response);
                    response.processed = true;
                }
            }
            
            // Write back processed responses
            await fs.writeFile(outgoingFile, JSON.stringify(responses, null, 2));
            
        } catch (error) {
            logger.error('Error checking for responses:', error);
        }
    }
    
    async processResponse(response) {
        try {
            const { action, data } = response;
            
            logger.info(`Processing response: ${action}`);
            
            // Get Discord client from global
            const client = global.discordClient;
            if (!client) {
                logger.error('Discord client not available');
                return;
            }
            
            switch (action) {
                case 'send_message':
                    const channel = await client.channels.fetch(data.channel_id);
                    if (channel && channel.isTextBased()) {
                        const sentMessage = await channel.send(data.content);
                        logger.info(`Sent message to channel ${data.channel_id} with ID ${sentMessage.id}`);
                        
                        // Write message ID back to a response file
                        await this.writeMessageResponse(response.id, sentMessage.id, data.channel_id);
                    }
                    break;
                    
                case 'send_dm':
                    const user = await client.users.fetch(data.user_id);
                    if (user) {
                        const sentMessage = await user.send(data.content);
                        logger.info(`Sent DM to user ${data.user_id} with ID ${sentMessage.id}`);
                        
                        // Write message ID back to a response file
                        await this.writeMessageResponse(response.id, sentMessage.id, data.user_id);
                    }
                    break;
                    
                case 'add_reaction':
                    const reactionChannel = await client.channels.fetch(data.channel_id);
                    if (reactionChannel && reactionChannel.isTextBased()) {
                        const message = await reactionChannel.messages.fetch(data.message_id);
                        await message.react(data.emoji);
                        logger.info(`Added reaction ${data.emoji} to message ${data.message_id}`);
                    }
                    break;
                    
                default:
                    logger.warn(`Unknown action: ${action}`);
            }
            
        } catch (error) {
            logger.error('Error processing response:', error);
        }
    }
    
    async sendToClaudeAndGetResponse(messageData) {
        try {
            const { message, author, channel, messageId, channelId } = messageData;
            
            // Format the message for Claude with channel ID
            const formattedMessage = `[Discord: ${author} in #${channel} (${channelId})] ${message}`;
            
            // Send to Claude's console using Python script (following claude-listen pattern)
            const pythonScript = path.join(__dirname, 'send_to_terminal.py');
            const command = `python "${pythonScript}" "${formattedMessage.replace(/"/g, '\\"')}"`;
            
            logger.info(`Sending to Claude: ${formattedMessage}`);
            
            try {
                await execAsync(command);
                logger.info('Message sent to Claude console');
            } catch (error) {
                logger.error('Failed to send to Claude:', error);
            }
            
            // Store context for response
            this.pendingResponses.set(messageId, {
                channelId,
                messageId,
                timestamp: Date.now()
            });
            
            // For now, return null - response will come through MCP tools
            return null;
            
        } catch (error) {
            logger.error('Error in sendToClaudeAndGetResponse:', error);
            throw error;
        }
    }
}

module.exports = ConsoleBridge;