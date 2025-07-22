import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './logger.js';

interface BridgeMessage {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  processed?: boolean;
}

export class BridgeClient {
  private logger: Logger;
  private bridgePath: string;
  
  constructor(logger: Logger) {
    this.logger = logger;
    // Use absolute path to the bridge directory
    const messageQueuePath = process.env.MESSAGE_QUEUE_PATH || 'C:\\repos\\red-queen-discord\\message-queue';
    this.bridgePath = path.join(messageQueuePath, 'bridge');
    this.logger.info(`Bridge path: ${this.bridgePath}`);
  }

  async initialize(): Promise<void> {
    try {
      // Ensure bridge directory exists
      await fs.mkdir(this.bridgePath, { recursive: true });
      this.logger.info('Bridge client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize bridge client:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async checkForMessageId(requestId: string): Promise<string | null> {
    try {
      const responsesPath = path.join(this.bridgePath, 'responses.json');
      
      // Try a few times to find the response
      for (let i = 0; i < 3; i++) {
        try {
          const content = await fs.readFile(responsesPath, 'utf8');
          const responses = JSON.parse(content);
          
          // Find response matching our request ID
          const response = responses.find((r: any) => r.requestId === requestId);
          if (response) {
            this.logger.info(`Found message ID: ${response.messageId}`);
            return response.messageId;
          }
        } catch (error) {
          // File might not exist yet
        }
        
        // Wait before trying again
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error checking for message ID:', error);
      return null;
    }
  }

  async sendCommand(action: string, data: any): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      const outgoingPath = path.join(this.bridgePath, 'outgoing.json');
      
      // Read current messages
      let messages: BridgeMessage[] = [];
      try {
        const content = await fs.readFile(outgoingPath, 'utf8');
        messages = JSON.parse(content);
      } catch (error) {
        // File might not exist or be empty
        messages = [];
      }

      // Add new message
      const message: BridgeMessage = {
        id: this.generateId(),
        action,
        data,
        timestamp: Date.now(),
        processed: false
      };
      
      messages.push(message);

      // Keep only last 100 messages to prevent file from growing too large
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }

      // Write back
      await fs.writeFile(outgoingPath, JSON.stringify(messages, null, 2));
      
      this.logger.info(`Sent command to bridge: ${action}`);
      return { success: true, requestId: message.id };
      
    } catch (error) {
      this.logger.error('Failed to send command:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendMessage(channelId: string, content: string, replyTo?: string) {
    const result = await this.sendCommand('send_message', {
      channel_id: channelId,
      content,
      reply_to: replyTo
    });
    
    if (result.success) {
      // Wait a bit for the response to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for message ID in responses
      if (result.requestId) {
        const messageId = await this.checkForMessageId(result.requestId);
        if (messageId) {
          return { ...result, messageId };
        }
      }
    }
    
    return result;
  }

  async sendDM(userId: string, content: string) {
    const result = await this.sendCommand('send_dm', {
      user_id: userId,
      content
    });
    
    if (result.success) {
      // Wait a bit for the response to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for message ID in responses
      if (result.requestId) {
        const messageId = await this.checkForMessageId(result.requestId);
        if (messageId) {
          return { ...result, messageId };
        }
      }
    }
    
    return result;
  }

  async addReaction(channelId: string, messageId: string, emoji: string) {
    return await this.sendCommand('add_reaction', {
      channel_id: channelId,
      message_id: messageId,
      emoji
    });
  }

  // For get operations, we'll return a pending status since we can't get immediate responses
  async getUserInfo(userId: string) {
    await this.sendCommand('get_user_info', { user_id: userId });
    return {
      success: true,
      data: {
        message: 'Request sent to Discord bot. User info will be logged by the bot.'
      }
    };
  }

  async getChannelInfo(channelId: string) {
    await this.sendCommand('get_channel_info', { channel_id: channelId });
    return {
      success: true,
      data: {
        message: 'Request sent to Discord bot. Channel info will be logged by the bot.'
      }
    };
  }
}