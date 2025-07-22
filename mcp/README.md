# Red Queen Discord MCP Server

This MCP (Model Context Protocol) server provides Discord tools for Claude to interact with Discord directly.

## Setup

1. **Build the MCP server**:
   ```bash
   cd mcp
   npm install
   npm run build
   ```

2. **Add to Claude Desktop Config**:
   - Copy the content from `claude_desktop_config.json` in the parent directory
   - Add it to your Claude Desktop configuration file:
     - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
     - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

3. **Restart Claude Desktop** to load the MCP server

## Available Tools

- `discord_send_message` - Send a message to a Discord channel
- `discord_send_dm` - Send a direct message to a user
- `discord_add_reaction` - Add an emoji reaction to a message
- `discord_get_user_info` - Get information about a Discord user
- `discord_get_channel_info` - Get information about a Discord channel

## How It Works

1. Discord bot receives a mention or !rq command
2. Bot sends the message to Claude's console via PowerShell
3. Claude can use the MCP tools to respond back to Discord
4. The response appears in the same channel/DM

## Example Usage

When someone mentions the bot:
```
@Red Queen What's the weather like?
```

Claude receives:
```
[Discord: Username in #channel-name] What's the weather like?
```

Claude can respond using:
```
discord_send_message(channel_id, "I don't have weather data, but I can help with other questions!")
```

## Development

- `npm run watch` - Watch for changes and rebuild
- Logs are saved to `mcp/logs/`
- The server connects to the same Discord bot using the parent .env file