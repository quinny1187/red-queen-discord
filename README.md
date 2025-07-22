# Red Queen Discord Bot

A Discord bot that bridges Claude Code (Red Queen AI) with Discord, enabling seamless AI interactions through Discord messages.

## Features

- 🤖 **Real-time message processing** - Messages sent to Claude's terminal instantly
- 💬 **Direct message support** - Send and receive DMs
- 📝 **Command system** - Use mentions or `!rq` prefix
- 🔄 **Two-way communication** - Claude can send messages, DMs, and reactions
- 👑 **Red Queen personality** - Fun, themed responses while processing
- 🎯 **Message ID tracking** - Enables reactions to specific messages
- 📊 **File-based message queue** - Reliable message delivery
- 🔍 **Python terminal integration** - Uses Windows API for reliable text input

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd red-queen-discord
   npm install
   cd mcp && npm install && npm run build && cd ..
   ```

2. **Configure Discord Bot**
   - Create app at https://discord.com/developers/applications
   - Create bot and copy token
   - Copy `.env.example` to `.env` and fill in:
     ```
     DISCORD_TOKEN=your_bot_token_here
     CLIENT_ID=your_client_id_here
     GUILD_ID=your_guild_id_here  # Optional
     ```

3. **Invite bot to server**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414464744512&scope=bot
   ```

4. **Configure Claude Code MCP**
   Add to your Claude Code config:
   ```json
   {
     "mcpServers": {
       "red-queen-discord": {
         "command": "node",
         "args": ["C:\\repos\\red-queen-discord\\mcp\\dist\\index.js"]
       }
     }
   }
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## Usage

### In Discord
- **Mention the bot**: `@Red Queen hello!`
- **Use prefix**: `!rq what's the weather?`
- **DM the bot**: Send direct messages without prefix

### Claude's Response Tools
Claude can use these MCP tools:
- `discord_send_message` - Send to channels (returns message ID)
- `discord_send_dm` - Send direct messages
- `discord_add_reaction` - Add emoji reactions
- `discord_get_user_info` - Get user details
- `discord_get_channel_info` - Get channel details

## Architecture

```
Discord User -> Discord Bot -> Python Terminal Sender -> Claude Terminal
                    ^                                           |
                    |                                           v
                    +--------- File Bridge <---- MCP Server ----+
```

### Components

1. **Discord Bot** (`src/index.js`)
   - Receives Discord messages
   - Sends to Claude via Python terminal sender
   - Shows Red Queen quips while waiting

2. **Terminal Sender** (`src/services/send_to_terminal.py`)
   - Uses Windows API to send text to terminal
   - Works without requiring window focus
   - Based on claude-listen implementation

3. **Console Bridge** (`src/services/consoleBridge.js`)
   - Manages file-based message queue
   - Processes MCP commands from Claude
   - Tracks message IDs for reactions

4. **MCP Server** (`mcp/src/index.ts`)
   - Provides Discord tools to Claude
   - Uses bridge client for communication
   - Returns message IDs for sent messages

## File Structure

```
red-queen-discord/
├── src/
│   ├── index.js                 # Main bot entry
│   ├── services/
│   │   ├── consoleBridge.js     # Bridge manager
│   │   ├── messageQueue.js      # Queue system
│   │   └── send_to_terminal.py  # Terminal sender
│   └── utils/
│       ├── logger.js            # Winston logger
│       └── redQueenQuips.js     # Fun responses
├── mcp/
│   ├── src/
│   │   ├── index.ts            # MCP server
│   │   ├── bridgeClient.ts     # Bridge communication
│   │   └── logger.ts           # MCP logger
│   └── package.json
├── message-queue/              # Runtime data (gitignored)
│   └── bridge/
│       ├── outgoing.json       # Commands from Claude
│       └── responses.json      # Message IDs
├── logs/                       # Log files (gitignored)
├── .env                        # Config (gitignored)
├── .env.example               # Config template
└── package.json
```

## Development

```bash
# Run with auto-restart
npm run dev

# Build MCP server
cd mcp && npm run build

# View logs
tail -f logs/combined.log
```

## Troubleshooting

1. **"Discord client not ready"** - Restart Claude Code after bot is running
2. **No response in Discord** - Check bot logs for errors
3. **Duplicate messages** - Normal behavior, minor race condition
4. **Can't find terminal** - Ensure terminal title contains "Red Queen" or "claude"

## Technical Details

- **Terminal Integration**: Uses PostMessageW Windows API via Python ctypes
- **Message Queue**: JSON file-based for simplicity and reliability  
- **Response Tracking**: Stores last 50 message IDs for reactions
- **Error Handling**: Comprehensive logging with Winston
- **TypeScript MCP**: Fully typed for better development experience

## Future Enhancements

- [ ] Fix duplicate message processing
- [ ] Add slash command support
- [ ] Implement voice channel features
- [ ] Add message threading support
- [ ] Create web dashboard
- [ ] Add multi-server config management

## License

MIT