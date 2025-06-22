#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');

// Minecraft Bot Setup Script
// Created by: Rudr

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('🤖 Minecraft Bot Configuration Setup');
    console.log('=====================================\n');

    const config = {
        server: {},
        loginSystem: {},
        behavior: {},
        reconnection: {},
        monitoring: {}
    };

    // Server configuration
    console.log('Server Configuration:');
    config.server.host = await question('Server IP/Host (e.g., myserver.aternos.me): ');
    config.server.port = parseInt(await question('Server Port (default 25565): ')) || 25565;
    config.server.username = await question('Bot Username: ');

    const hasServerPassword = await question('Does server require a password? (y/n): ');
    if (hasServerPassword.toLowerCase() === 'y') {
        config.server.password = await question('Server Password: ');
    } else {
        config.server.password = '';
    }

    const authType = await question('Authentication type (offline/microsoft) [offline]: ');
    config.server.auth = authType || 'offline';
    config.server.version = await question('Minecraft version (leave empty for auto): ') || '';

    // Login system configuration
    console.log('\nLogin System Configuration:');
    const hasLoginSystem = await question('Does server have login plugin (AuthMe, etc.)? (y/n): ');

    if (hasLoginSystem.toLowerCase() === 'y') {
        config.loginSystem.enabled = true;
        config.loginSystem.password = await question('Login/Register password: ');

        console.log('\nSelect register command format:');
        console.log('1. /register <password> <password>');
        console.log('2. /register <password>');
        const formatChoice = await question('Choose format (1 or 2): ');

        if (formatChoice === '1') {
            config.loginSystem.registerDoublePassword = true;
            config.loginSystem.registerSinglePassword = false;
        } else {
            config.loginSystem.registerDoublePassword = false;
            config.loginSystem.registerSinglePassword = true;
        }
    } else {
        config.loginSystem.enabled = false;
        config.loginSystem.registerDoublePassword = false;
        config.loginSystem.registerSinglePassword = false;
        config.loginSystem.password = 'mypassword123';
    }

    // Behavior configuration
    console.log('\nBot Behavior:');
    config.behavior.joinMessage = await question('Join message (leave empty for default): ') || 'Bot connected and monitoring server';

    const customMessages = await question('Use custom AFK messages? (y/n): ');
    if (customMessages.toLowerCase() === 'y') {
        const messagesInput = await question('Enter AFK messages (comma separated): ');
        config.behavior.afkMessages = messagesInput.split(',').map(msg => msg.trim());
    } else {
        config.behavior.afkMessages = [
            'Still here!',
            'Bot active',
            'Keeping server alive',
            'All systems operational'
        ];
    }

    config.behavior.chatResponses = [
        'Hello!',
        'I am here!',
        'Bot is active',
        'How can I help?'
    ];

    // Reconnection settings
    config.reconnection.maxAttempts = parseInt(await question('Max reconnection attempts [50]: ')) || 50;
    config.reconnection.initialDelay = 5000;
    config.reconnection.maxDelay = 300000;

    // Monitoring settings
    config.monitoring.healthServerPort = parseInt(await question('Health server port [5000]: ')) || 5000;
    config.monitoring.logLevel = 'info';
    config.monitoring.logToConsole = true;
    config.monitoring.logToFile = null;

    // Save configuration
    try {
        fs.writeFileSync('bot-config.json', JSON.stringify(config, null, 2));
        console.log('\n✅ Configuration saved to bot-config.json');
        console.log('🚀 You can now start the bot with: node index.js');
        console.log('\n📝 To modify settings later, edit bot-config.json');
    } catch (error) {
        console.error('❌ Failed to save configuration:', error.message);
    }

    rl.close();
}

if (require.main === module) {
    setup().catch(console.error);
}

module.exports = { setup };