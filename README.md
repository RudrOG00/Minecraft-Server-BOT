
# Minecraft Bot for Aternos Server Monitoring

**Created by: Rudr**

A powerful Node.js Minecraft bot that maintains a 24/7 connection to Aternos servers to keep them active, with UptimeRobot integration for monitoring.

## 🎯 Features

- **24/7 Server Connection**: Maintains persistent connection to keep Aternos servers active
- **Automatic Reconnection**: Intelligent reconnection with exponential backoff
- **Anti-AFK Measures**: Random movement, chat messages, and looking around to prevent AFK kicks
- **Login System Support**: Automatic registration and login for servers with authentication plugins
- **Combat System**: Optional PvP and mob fighting capabilities
- **UptimeRobot Integration**: Built-in monitoring with automatic setup instructions and chat announcements
- **Health Monitoring**: HTTP endpoints for UptimeRobot integration
- **Comprehensive Logging**: Detailed logging system for debugging and monitoring
- **Username Rotation**: Automatic username switching when banned
- **Configurable Behavior**: Customizable bot activities and responses

## 🚀 Quick Setup Guide

### Option 1: Easy Setup (Recommended)
Run the interactive setup script:
```bash
node setup.js
```
This will guide you through all configuration options and create a `bot-config.json` file.

### Option 2: Manual Configuration
Edit the `bot-config.json` file directly:

```json
{
  "server": {
    "host": "your-server.aternos.me",
    "port": 25565,
    "username": "YourBotName",
    "password": "",
    "auth": "offline"
  },
  "loginSystem": {
    "enabled": true,
    "registerDoublePassword": false,
    "registerSinglePassword": true,
    "password": "your_login_password"
  },
  "behavior": {
    "combatMode": {
      "enabled": true,
      "attackPlayers": false,
      "attackMobs": true,
      "attackRange": 4,
      "combatMovement": true,
      "strafingEnabled": true
    }
  }
}
```

### 3. Start the Bot

```bash
node index.js
```

### 4. UptimeRobot Integration

The bot includes built-in UptimeRobot integration with automatic setup instructions.

**Quick Setup:**
1. Visit `/uptimerobot-setup` endpoint for detailed instructions
2. Add your health endpoint to UptimeRobot: `https://your-server-url.com:5000/health`
3. Bot automatically announces UptimeRobot connection in chat when joining servers

**Available Endpoints:**
- **Health Check**: `/health` - Returns 200 when connected, 503 when disconnected
- **Setup Guide**: `/uptimerobot-setup` - Complete integration instructions
- **Status Details**: `/status` - Detailed bot and system information
- **Simple Ping**: `/ping` - Basic connectivity test

## ⚙️ Configuration Options

### Combat System Features
- **Mob Combat**: Attacks hostile mobs within range (zombies, skeletons, etc.)
- **Player Combat**: Optional PvP mode (disabled by default for safety)
- **Combat Movement**: Strafes left/right during fights with jumping
- **Smart Targeting**: Scans for targets every second within attack range
- **Realistic Behavior**: Includes advanced movement patterns during combat

### Anti-AFK Activities
- **Random Movement**: Moves in random directions every 30 seconds
- **Looking Around**: Changes view direction every 15 seconds  
- **Chat Messages**: Sends activity messages every 2-5 minutes
- **Emergency Actions**: Responds to low health situations

### Login System Support
- **Double Password Format**: `/register <password> <password>`
- **Single Password Format**: `/register <password>`
- **Automatic Detection**: Responds to common login prompts
- **Smart Retry**: Attempts both registration and login commands

### Username Rotation
- **Auto-Rotation**: Automatically tries different usernames when banned
- **Smart Detection**: Recognizes ban messages and triggers username change
- **Backup Names**: Uses predefined list of realistic usernames
- **Retry Logic**: Attempts up to 3 username rotations before stopping

## 🔧 Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `server.host` | Your Minecraft server address | `localhost` |
| `server.port` | Server port | `25565` |
| `server.username` | Bot's username | `MinecraftBot` |
| `server.password` | Server password (if required) | *(empty)* |
| `server.auth` | Authentication type | `offline` |
| `combatMode.enabled` | Enable combat system | `false` |
| `combatMode.attackPlayers` | Attack nearby players | `false` |
| `combatMode.attackMobs` | Attack hostile mobs | `true` |
| `combatMode.attackRange` | Combat range in blocks | `4` |
| `loginSystem.enabled` | Enable auto-login | `false` |
| `loginSystem.password` | Login password | `defaultpass123` |
| `reconnection.maxAttempts` | Max reconnection attempts | `50` |
| `monitoring.healthServerPort` | Health server port | `5000` |

## 📊 API Endpoints

### GET /health
Returns bot connection status for UptimeRobot monitoring.

**Response (Connected):**
```json
{
  "status": "healthy",
  "message": "Bot is connected and active",
  "data": {
    "connected": true,
    "username": "MinecraftBot",
    "lastActivity": "2025-06-22T06:09:29.949Z",
    "uptime": 3600,
    "reconnectAttempts": 0
  }
}
```

### GET /status
Detailed system and bot status information.

### GET /ping
Simple ping endpoint that always returns "pong".

## 🐛 Troubleshooting

### Common Issues
1. **Connection Refused**: Check that your server is online and address is correct
2. **Authentication Failed**: Verify username and password settings
3. **Kicked for AFK**: Bot activities should prevent this, check logs for errors
4. **Combat Not Working**: Ensure `combatMode.enabled` is `true` and check attack range

### Logs
Check the console output for detailed logging:
- Connection attempts and status
- Bot activities and movements
- Combat actions and target detection
- Error messages and reconnection attempts

## 🌟 Features Showcase

This bot includes advanced features:
- **Intelligent Combat**: Attacks hostile mobs while avoiding passive ones
- **Realistic Movement**: Human-like strafing and jumping during combat
- **Emergency Response**: Automatically handles low health situations
- **Smart Authentication**: Handles various login system formats
- **Persistent Monitoring**: Keeps servers active 24/7 with UptimeRobot integration

## 📄 License

Created by **Rudr** - Feel free to modify and distribute.

---

**Support**: If you encounter any issues, check the troubleshooting section or review the console logs for detailed error information.

**Author**: Rudr
**Project**: Minecraft Bot for Aternos Server Monitoring
**Version**: 1.0.0
