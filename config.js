const logger = require('./logger');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Load JSON configuration if it exists
let jsonConfig = {};
const configPath = path.join(__dirname, 'bot-config.json');
if (fs.existsSync(configPath)) {
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        jsonConfig = JSON.parse(configData);
        logger.info('Loaded configuration from bot-config.json');
    } catch (error) {
        logger.warn('Failed to load bot-config.json, using environment variables:', error.message);
    }
}

const config = {
    minecraft: {
        host: jsonConfig.server?.host || process.env.MINECRAFT_HOST || 'localhost',
        port: jsonConfig.server?.port || parseInt(process.env.MINECRAFT_PORT) || 25565,
        username: jsonConfig.server?.username || process.env.MINECRAFT_USERNAME || 'MinecraftBot',
        password: jsonConfig.server?.password || process.env.MINECRAFT_PASSWORD || null,
        version: jsonConfig.server?.version || process.env.MINECRAFT_VERSION || false,
        auth: jsonConfig.server?.auth || process.env.MINECRAFT_AUTH || 'offline',
        maxReconnectAttempts: jsonConfig.reconnection?.maxAttempts || parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 50,
        initialReconnectDelay: jsonConfig.reconnection?.initialDelay || parseInt(process.env.INITIAL_RECONNECT_DELAY) || 5000,
        maxReconnectDelay: jsonConfig.reconnection?.maxDelay || parseInt(process.env.MAX_RECONNECT_DELAY) || 300000,
        joinMessage: jsonConfig.behavior?.joinMessage || process.env.JOIN_MESSAGE || null,
        afkMessages: jsonConfig.behavior?.afkMessages || 
            (process.env.AFK_MESSAGES ? 
                process.env.AFK_MESSAGES.split(',').map(msg => msg.trim()) : 
                ['Still here!', 'Bot active', 'Keeping server alive', 'All good here']),
        chatResponses: jsonConfig.behavior?.chatResponses ||
            (process.env.CHAT_RESPONSES ?
                process.env.CHAT_RESPONSES.split(',').map(msg => msg.trim()) :
                ['Hello!', 'I am here!', 'Bot is active', 'How can I help?']),
        
        // Username rotation and combat settings
        autoUsernameRotation: jsonConfig.behavior?.autoUsernameRotation !== undefined ? jsonConfig.behavior.autoUsernameRotation : true,
        backupUsernames: jsonConfig.behavior?.backupUsernames || ['UptimeMonitor', 'ServerGuard', 'MonitorBot', 'ActivePlayer'],
        // Login system configuration
        loginSystem: {
            enabled: jsonConfig.loginSystem?.enabled !== undefined ? jsonConfig.loginSystem.enabled : false,
            registerDoublePassword: jsonConfig.loginSystem?.registerDoublePassword !== undefined ? jsonConfig.loginSystem.registerDoublePassword : false,
            registerSinglePassword: jsonConfig.loginSystem?.registerSinglePassword !== undefined ? jsonConfig.loginSystem.registerSinglePassword : false,
            password: jsonConfig.loginSystem?.password || 'defaultpass123'
        },
        
        combatMode: {
            enabled: jsonConfig.combatMode?.enabled !== undefined ? jsonConfig.combatMode.enabled : false,
            attackPlayers: jsonConfig.combatMode?.attackPlayers !== undefined ? jsonConfig.combatMode.attackPlayers : false,
            attackMobs: jsonConfig.combatMode?.attackMobs !== undefined ? jsonConfig.combatMode.attackMobs : true,
            attackRange: jsonConfig.combatMode?.attackRange || 4,
            combatMovement: jsonConfig.combatMode?.combatMovement !== undefined ? jsonConfig.combatMode.combatMovement : true,
            strafingEnabled: jsonConfig.behavior?.combatMode?.strafingEnabled !== undefined ? jsonConfig.behavior.combatMode.strafingEnabled : true
        }
    },
    
    server: {
        port: jsonConfig.monitoring?.healthServerPort || parseInt(process.env.HEALTH_SERVER_PORT) || 5000
    },
    
    logging: {
        level: jsonConfig.monitoring?.logLevel || process.env.LOG_LEVEL || 'info',
        console: jsonConfig.monitoring?.logToConsole !== undefined ? jsonConfig.monitoring.logToConsole : (process.env.LOG_CONSOLE !== 'false'),
        file: jsonConfig.monitoring?.logToFile || process.env.LOG_FILE || null
    },
    
    uptimeRobot: {
        enabled: jsonConfig.monitoring?.uptimeRobot?.enabled !== undefined ? jsonConfig.monitoring.uptimeRobot.enabled : true,
        showStatus: jsonConfig.monitoring?.uptimeRobot?.showStatus !== undefined ? jsonConfig.monitoring.uptimeRobot.showStatus : true,
        announceConnection: jsonConfig.monitoring?.uptimeRobot?.announceConnection !== undefined ? jsonConfig.monitoring.uptimeRobot.announceConnection : true
    }
};

// Validate required configuration
function validateConfig() {
    const required = [
        { key: 'minecraft.host', value: config.minecraft.host },
        { key: 'minecraft.username', value: config.minecraft.username }
    ];

    for (const item of required) {
        if (!item.value) {
            throw new Error(`Missing required configuration: ${item.key}`);
        }
    }

    // Validate port ranges
    if (config.minecraft.port < 1 || config.minecraft.port > 65535) {
        throw new Error('Invalid Minecraft port: must be between 1 and 65535');
    }

    if (config.server.port < 1 || config.server.port > 65535) {
        throw new Error('Invalid health server port: must be between 1 and 65535');
    }

    logger.info('Configuration validated successfully');
    logger.debug('Minecraft server:', `${config.minecraft.host}:${config.minecraft.port}`);
    logger.debug('Bot username:', config.minecraft.username);
    logger.debug('Health server port:', config.server.port);
}

try {
    validateConfig();
} catch (error) {
    logger.error('Configuration validation failed:', error.message);
    process.exit(1);
}

module.exports = config;
