#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { BridgeClient } from './bridgeClient.js';
import { Logger } from './logger.js';

const logger = new Logger();

class DiscordMCPServer {
  private server: Server;
  private bridgeClient: BridgeClient;

  constructor() {
    this.server = new Server(
      {
        name: 'red-queen-discord',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.bridgeClient = new BridgeClient(logger);
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'discord_send_message',
          description: 'Send a message to a Discord channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: {
                type: 'string',
                description: 'Discord channel ID'
              },
              content: {
                type: 'string',
                description: 'Message content to send'
              },
              reply_to: {
                type: 'string',
                description: 'Message ID to reply to (optional)'
              }
            },
            required: ['channel_id', 'content']
          }
        },
        {
          name: 'discord_send_dm',
          description: 'Send a direct message to a Discord user',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                description: 'Discord user ID'
              },
              content: {
                type: 'string',
                description: 'Message content to send'
              }
            },
            required: ['user_id', 'content']
          }
        },
        {
          name: 'discord_add_reaction',
          description: 'Add a reaction emoji to a message',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: {
                type: 'string',
                description: 'Discord channel ID'
              },
              message_id: {
                type: 'string',
                description: 'Message ID to react to'
              },
              emoji: {
                type: 'string',
                description: 'Emoji to react with'
              }
            },
            required: ['channel_id', 'message_id', 'emoji']
          }
        },
        {
          name: 'discord_get_user_info',
          description: 'Get information about a Discord user',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                description: 'Discord user ID'
              }
            },
            required: ['user_id']
          }
        },
        {
          name: 'discord_get_channel_info',
          description: 'Get information about a Discord channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: {
                type: 'string',
                description: 'Discord channel ID'
              }
            },
            required: ['channel_id']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'discord_send_message':
            return await this.handleSendMessage(args);
          case 'discord_send_dm':
            return await this.handleSendDM(args);
          case 'discord_add_reaction':
            return await this.handleAddReaction(args);
          case 'discord_get_user_info':
            return await this.handleGetUserInfo(args);
          case 'discord_get_channel_info':
            return await this.handleGetChannelInfo(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async handleSendMessage(args: any) {
    const { channel_id, content, reply_to } = args;
    const result = await this.bridgeClient.sendMessage(channel_id, content, reply_to);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success 
            ? `Message sent to Discord channel${(result as any).messageId ? ` (ID: ${(result as any).messageId})` : ''}` 
            : `Failed to send message: ${result.error}`
        }
      ]
    };
  }

  private async handleSendDM(args: any) {
    const { user_id, content } = args;
    const result = await this.bridgeClient.sendDM(user_id, content);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success 
            ? `DM sent to Discord user${(result as any).messageId ? ` (ID: ${(result as any).messageId})` : ''}` 
            : `Failed to send DM: ${result.error}`
        }
      ]
    };
  }

  private async handleAddReaction(args: any) {
    const { channel_id, message_id, emoji } = args;
    const result = await this.bridgeClient.addReaction(channel_id, message_id, emoji);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success 
            ? `Reaction ${emoji} added successfully` 
            : `Failed to add reaction: ${result.error}`
        }
      ]
    };
  }

  private async handleGetUserInfo(args: any) {
    const { user_id } = args;
    const result = await this.bridgeClient.getUserInfo(user_id);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success 
            ? JSON.stringify(result.data, null, 2)
            : `Failed to get user info: Request sent to Discord bot`
        }
      ]
    };
  }

  private async handleGetChannelInfo(args: any) {
    const { channel_id } = args;
    const result = await this.bridgeClient.getChannelInfo(channel_id);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success 
            ? JSON.stringify(result.data, null, 2)
            : `Failed to get channel info: Request sent to Discord bot`
        }
      ]
    };
  }

  async start() {
    try {
      // Start MCP server first
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Discord MCP Server started');
      
      // Initialize bridge client
      await this.bridgeClient.initialize();
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
}

// Start the server
const server = new DiscordMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});