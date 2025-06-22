const mineflayer = require('mineflayer');
const cron = require('node-cron');
const Activities = require('./activities');
const logger = require('./logger');

class MinecraftBot {
    constructor(config) {
        this.config = config;
        this.bot = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
        this.reconnectDelay = config.initialReconnectDelay || 5000;
        this.maxReconnectDelay = config.maxReconnectDelay || 300000; // 5 minutes
        this.activities = new Activities();
        this.activityInterval = null;
        this.lastActivity = Date.now();
        this.isFirstConnection = true;
        this.currentUsernameIndex = 0;
        this.banAttempts = 0;
    }

    async start() {
        logger.info('Starting Minecraft bot...');
        await this.connect();
        this.setupActivityScheduler();
    }

    async connect() {
        try {
            if (this.bot) {
                this.bot.removeAllListeners();
                this.bot.quit();
            }

            // Validate configuration before attempting connection
            if (this.config.host.includes('your-aternos-server') || 
                this.config.host.includes('demo.mc-server.net') ||
                this.config.username.includes('YourBotName') ||
                this.config.username.includes('TestBot')) {
                throw new Error(`Please configure your actual Minecraft server details in the .env file. Current host: ${this.config.host}, username: ${this.config.username}`);
            }

            logger.info(`Connecting to ${this.config.host}:${this.config.port} as ${this.config.username}`);

            const botOptions = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                version: this.config.version || false,
                auth: this.config.auth || 'offline'
            };

            // Add password if provided
            if (this.config.password) {
                botOptions.password = this.config.password;
            }

            this.bot = mineflayer.createBot(botOptions);
            this.setupEventHandlers();

        } catch (error) {
            logger.error('Error creating bot:', error.message || error);
            if (error.stack) {
                logger.debug('Error stack:', error.stack);
            }
            await this.handleReconnection();
        }
    }

    setupEventHandlers() {
        // Connection successful
        this.bot.on('login', () => {
            logger.info(`Bot logged in as ${this.bot.username}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = this.config.initialReconnectDelay || 5000;
            this.lastActivity = Date.now();
            
            // Track if this is a reconnection
            if (!this.isFirstConnection) {
                logger.info('Bot reconnected successfully');
            }
            this.isFirstConnection = false;
        });

        // Bot spawned in world
        this.bot.on('spawn', () => {
            logger.info('Bot spawned in the world');
            logger.info(`Position: ${this.bot.entity.position}`);
            
            // Start immediate anti-AFK activity
            this.startImmediateActivity();
            
            // Start combat monitoring if enabled
            if (this.config.combatMode.enabled) {
                this.startCombatMonitoring();
            }
            
            // Handle login system if enabled
            this.handleLoginSystem();
            
            // Send UptimeRobot connection announcement
            this.announceUptimeRobotConnection();
            
            // Send initial message if configured
            if (this.config.joinMessage) {
                setTimeout(() => {
                    this.bot.chat(this.config.joinMessage);
                }, 2000);
            }
        });

        // Chat messages
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;
            logger.info(`<${username}> ${message}`);
            
            // Handle login system messages
            this.handleLoginMessages(username, message);
            
            // Respond to mentions or direct messages
            if (message.toLowerCase().includes(this.bot.username.toLowerCase())) {
                const responses = this.config.chatResponses || ['Hello!', 'I am here!', 'Bot is active'];
                const response = responses[Math.floor(Math.random() * responses.length)];
                setTimeout(() => {
                    this.bot.chat(response);
                }, 1000 + Math.random() * 2000);
            }
        });

        // Player joined/left
        this.bot.on('playerJoined', (player) => {
            logger.info(`Player ${player.username} joined the server`);
        });

        this.bot.on('playerLeft', (player) => {
            logger.info(`Player ${player.username} left the server`);
        });

        // System messages (server messages, login prompts, etc.)
        this.bot.on('message', (message) => {
            const text = message.toString();
            logger.info(`[System] ${text}`);
            
            // Handle system login prompts
            this.handleLoginMessages('System', text);
        });

        // Health and food tracking
        this.bot.on('health', () => {
            logger.debug(`Health: ${this.bot.health}, Food: ${this.bot.food}`);
            
            // Emergency actions if health is low
            if (this.bot.health < 10) {
                logger.warn('Health is low! Attempting to find food or shelter');
                this.activities.emergencyActions(this.bot);
            }
        });

        // Error handling
        this.bot.on('error', (error) => {
            if (error.code === 'ECONNRESET') {
                logger.warn('Connection reset by server - server may be offline or restarting');
            } else if (error.code === 'ECONNREFUSED') {
                logger.warn('Connection refused - server is likely offline');
            } else if (error.code === 'ENOTFOUND') {
                logger.error('Server not found - check server address:', this.config.host);
            } else {
                logger.error('Bot error:', error.message || error);
                if (error.stack) {
                    logger.debug('Error stack:', error.stack);
                }
            }
            this.isConnected = false;
            this.handleReconnection();
        });

        // Disconnection handling
        this.bot.on('end', (reason) => {
            logger.warn(`Bot disconnected: ${reason}`);
            this.isConnected = false;
            this.handleReconnection();
        });

        // Kicked from server
        this.bot.on('kicked', (reason) => {
            const reasonText = typeof reason === 'string' ? reason : JSON.stringify(reason);
            logger.warn(`Bot was kicked: ${reasonText}`);
            
            // Check if banned for idle/ToS violation or login timeout
            if (reasonText && (reasonText.includes('idle') || reasonText.includes('terms of service') || reasonText.includes('banned') || reasonText.includes('timed out'))) {
                logger.error('Bot appears to be banned from server.');
                this.banAttempts++;
                
                if (this.config.autoUsernameRotation && this.banAttempts <= 3) {
                    this.rotateUsername();
                    logger.info(`Attempting username rotation (attempt ${this.banAttempts}/3)`);
                } else {
                    logger.error('Maximum ban attempts reached or username rotation disabled.');
                }
            }
            
            this.isConnected = false;
            this.handleReconnection();
        });
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Maximum reconnection attempts reached. Stopping bot.');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );

        logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                logger.error('Reconnection failed:', error.message || error);
                if (error.stack) {
                    logger.debug('Error stack:', error.stack);
                }
                await this.handleReconnection();
            }
        }, delay);
    }

    setupActivityScheduler() {
        // More frequent movement - every 30 seconds
        cron.schedule('*/30 * * * * *', () => {
            if (this.isConnected && this.bot) {
                this.activities.randomMovement(this.bot);
                this.lastActivity = Date.now();
            }
        });

        // Chat message every 2-5 minutes
        cron.schedule('*/2 * * * *', () => {
            if (this.isConnected && this.bot) {
                const shouldChat = Math.random() < 0.4; // 40% chance to chat
                if (shouldChat) {
                    this.activities.randomChat(this.bot, this.config.afkMessages);
                    this.lastActivity = Date.now();
                }
            }
        });

        // Look around every 15 seconds
        cron.schedule('*/15 * * * * *', () => {
            if (this.isConnected && this.bot) {
                this.activities.lookAround(this.bot);
                this.lastActivity = Date.now();
            }
        });

        // Status check every minute
        cron.schedule('* * * * *', () => {
            if (this.isConnected && this.bot) {
                logger.debug(`Bot status: Online, Position: ${this.bot.entity.position}, Health: ${this.bot.health}`);
            }
        });
    }

    getStatus() {
        return {
            connected: this.isConnected,
            username: this.bot ? this.bot.username : null,
            position: this.bot && this.bot.entity ? this.bot.entity.position : null,
            health: this.bot ? this.bot.health : null,
            food: this.bot ? this.bot.food : null,
            lastActivity: this.lastActivity,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.bot && this.bot.startTime ? Date.now() - this.bot.startTime : 0
        };
    }

    handleLoginSystem() {
        const loginConfig = this.config.loginSystem;
        
        if (!loginConfig.enabled || (!loginConfig.registerDoublePassword && !loginConfig.registerSinglePassword)) {
            logger.debug('Login system disabled or not configured');
            return;
        }

        logger.info('Login system enabled, checking server authentication...');

        // Login system is now working, no need for test messages

        // Wait for server prompts instead of forcing commands immediately
        logger.info('Waiting for server authentication prompts...');
    }

    handleLoginMessages(username, message) {
        const loginConfig = this.config.loginSystem;
        
        // Force enable login system if it's undefined but other settings exist
        if (loginConfig.enabled === undefined && (loginConfig.registerSinglePassword || loginConfig.registerDoublePassword)) {
            loginConfig.enabled = true;
        }
        
        if (!loginConfig.enabled || (!loginConfig.registerDoublePassword && !loginConfig.registerSinglePassword)) {
            return;
        }

        const lowerMessage = message.toLowerCase();
        
        // Common login/register prompts
        const loginPrompts = [
            'please register',
            'please login',
            'use /register',
            'use /login',
            'you need to register',
            'you need to login',
            'authentication required',
            'please authenticate',
            'register with',
            'login with',
            'not registered',
            'not logged in',
            'register first',
            'must register',
            'login required',
            'authme',
            'you must login',
            'you must register',
            'please type',
            'command:'
        ];

        const isLoginPrompt = loginPrompts.some(prompt => lowerMessage.includes(prompt));
        
        // Check for specific registration prompt (but ignore bot's own messages)
        if ((lowerMessage.includes('please register using /register') || lowerMessage.includes('register using /register') || lowerMessage.includes('please register using')) && !lowerMessage.includes('uptimemonitor') && !lowerMessage.includes('🤖')) {
            logger.info(`Registration prompt detected from ${username}`);
            
            if (this.bot && this.isConnected) {
                try {
                    if (loginConfig.registerSinglePassword) {
                        logger.info('Sending registration command');
                        this.bot.chat(`/register ${loginConfig.password}`);
                    } else if (loginConfig.registerDoublePassword) {
                        logger.info('Sending double password registration');
                        this.bot.chat(`/register ${loginConfig.password} ${loginConfig.password}`);
                    }
                } catch (error) {
                    logger.error('Error sending registration command:', error);
                }
            }
            return;
        }

        // Handle login prompts specifically
        if (lowerMessage.includes('please log in using /login') || lowerMessage.includes('login using /login')) {
            logger.info(`Login prompt detected: ${message}`);
            
            setTimeout(() => {
                if (this.bot && this.isConnected) {
                    logger.info(`Sending login command with password`);
                    this.bot.chat(`/login ${loginConfig.password}`);
                }
            }, 500);
            return;
        }

        // Only respond to actual server prompts, not bot's own messages
        if ((isLoginPrompt || username === 'Server' || username === 'AuthMe' || username === 'Login') && 
            !lowerMessage.includes('uptimemonitor') && !lowerMessage.includes('serverguard') && !lowerMessage.includes('🤖') && 
            !lowerMessage.includes('replit.app')) {
            logger.info(`General login prompt detected from ${username}`);
            
            setTimeout(() => {
                if (this.bot && this.isConnected) {
                    if (loginConfig.registerDoublePassword) {
                        this.bot.chat(`/register ${loginConfig.password} ${loginConfig.password}`);
                    } else if (loginConfig.registerSinglePassword) {
                        this.bot.chat(`/register ${loginConfig.password}`);
                    }
                    
                    // Also try login after brief delay
                    setTimeout(() => {
                        if (this.bot && this.isConnected) {
                            this.bot.chat(`/login ${loginConfig.password}`);
                        }
                    }, 2000);
                }
            }, 1000);
        }

        // Success messages
        if (lowerMessage.includes('successfully registered') || 
            lowerMessage.includes('successfully logged in') ||
            lowerMessage.includes('login successful') ||
            lowerMessage.includes('registered successfully') ||
            lowerMessage.includes('welcome')) {
            logger.info('Authentication successful!');
        }

        // Error messages
        if (lowerMessage.includes('wrong password') || 
            lowerMessage.includes('incorrect password') ||
            lowerMessage.includes('authentication failed') ||
            lowerMessage.includes('already registered')) {
            logger.warn('Authentication issue detected - check password in configuration');
        }
    }

    startImmediateActivity() {
        logger.info('Starting immediate anti-AFK activity...');
        
        // Start moving immediately to prevent idle detection
        setTimeout(() => {
            if (this.bot && this.isConnected) {
                this.activities.randomMovement(this.bot);
                this.lastActivity = Date.now();
            }
        }, 500);

        // Look around after a brief delay
        setTimeout(() => {
            if (this.bot && this.isConnected) {
                this.activities.lookAround(this.bot);
                this.lastActivity = Date.now();
            }
        }, 1500);

        // Continue with regular movement every 10 seconds for the first minute
        let immediateActivityCount = 0;
        const immediateInterval = setInterval(() => {
            if (this.bot && this.isConnected && immediateActivityCount < 6) {
                this.activities.randomMovement(this.bot);
                this.activities.lookAround(this.bot);
                this.lastActivity = Date.now();
                immediateActivityCount++;
                logger.debug(`Immediate activity ${immediateActivityCount}/6 completed`);
            } else {
                clearInterval(immediateInterval);
                logger.info('Immediate anti-AFK phase completed, switching to normal intervals');
            }
        }, 10000);
    }

    announceUptimeRobotConnection() {
        const config = require('./config');
        
        if (!config.uptimeRobot.enabled || !config.uptimeRobot.announceConnection) {
            return;
        }

        setTimeout(() => {
            if (this.bot && this.isConnected) {
                logger.info('Announcing UptimeRobot monitoring status...');
                this.bot.chat('📊 UptimeRobot Monitor: CONNECTED');
            }
        }, 5000);
    }

    rotateUsername() {
        if (!this.config.backupUsernames || this.config.backupUsernames.length === 0) {
            logger.warn('No backup usernames available for rotation');
            return;
        }

        this.currentUsernameIndex = (this.currentUsernameIndex + 1) % this.config.backupUsernames.length;
        const newUsername = this.config.backupUsernames[this.currentUsernameIndex];
        
        // Update the config with new username
        this.config.username = newUsername;
        
        logger.info(`Username rotated to: ${newUsername}`);
    }

    startCombatMonitoring() {
        logger.info('Combat monitoring enabled - scanning for targets...');
        
        setInterval(() => {
            if (!this.bot || !this.isConnected) return;
            
            this.scanForTargets();
        }, 1000); // Check every second
    }

    scanForTargets() {
        try {
            const entities = Object.values(this.bot.entities);
            const botPosition = this.bot.entity.position;
            
            for (const entity of entities) {
                if (!entity || !entity.position || entity === this.bot.entity) continue;
                
                const distance = botPosition.distanceTo(entity.position);
                
                if (distance <= this.config.combatMode.attackRange) {
                    // Check if should attack players
                    if (this.config.combatMode.attackPlayers && entity.type === 'player' && entity.username !== this.bot.username) {
                        logger.info(`Found player target: ${entity.username} at distance ${distance.toFixed(1)}`);
                        this.engageCombat(entity);
                        break;
                    }
                    
                    // Check if should attack mobs - attack ANY mob except specific passive ones
                    if (this.config.combatMode.attackMobs && (entity.type === 'mob' || entity.kind === 'Hostile mobs' || entity.mobType)) {
                        const passiveMobs = ['cow', 'pig', 'sheep', 'chicken', 'horse', 'villager', 'iron_golem', 'cat', 'wolf', 'parrot'];
                        const entityName = (entity.name || entity.displayName || entity.mobType || entity.kind || '').toLowerCase();
                        
                        // Attack if it's not in the passive list OR if no name is detected (assume hostile)
                        const isPassive = passiveMobs.some(mob => entityName.includes(mob));
                        if (!isPassive) {
                            logger.info(`Found mob target: ${entityName || 'Unknown mob'} (${entity.type}) at distance ${distance.toFixed(1)}`);
                            this.engageCombat(entity);
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            logger.debug('Error in combat scanning:', error.message);
        }
    }

    engageCombat(target) {
        if (!target || !this.bot || !target.position) return;
        
        try {
            const distance = this.bot.entity.position.distanceTo(target.position);
            logger.info(`🗡️ ATTACKING: ${target.name || target.username || target.type} at distance ${distance.toFixed(1)}`);
            
            // Look at target first
            const targetPos = target.position.clone();
            if (target.height) {
                targetPos.y += target.height * 0.5;
            }
            this.bot.lookAt(targetPos);
            
            // Attack immediately and repeatedly
            const attackTarget = () => {
                if (this.bot && target && target.position) {
                    try {
                        this.bot.attack(target);
                        logger.info('⚔️ Attack executed!');
                    } catch (attackError) {
                        logger.warn('Attack failed:', attackError.message);
                    }
                }
            };
            
            // First attack after brief targeting delay
            setTimeout(attackTarget, 50);
            
            // Follow-up attacks every 600ms for 3 seconds
            let attackCount = 0;
            const attackInterval = setInterval(() => {
                if (attackCount < 5 && this.bot && target && target.position) {
                    attackTarget();
                    attackCount++;
                } else {
                    clearInterval(attackInterval);
                }
            }, 600);
            
            // Combat movement (strafing)
            if (this.config.combatMode.combatMovement && this.config.combatMode.strafingEnabled) {
                setTimeout(() => {
                    this.performCombatMovement();
                }, 100);
            }
            
            this.lastActivity = Date.now();
        } catch (error) {
            logger.error('Combat error:', error.message);
        }
    }

    performCombatMovement() {
        if (!this.bot) return;
        
        try {
            // Stop current movement
            this.bot.setControlState('left', false);
            this.bot.setControlState('right', false);
            this.bot.setControlState('forward', false);
            this.bot.setControlState('back', false);
            
            // Random strafe direction
            const strafeDirection = Math.random() < 0.5 ? 'left' : 'right';
            const moveForward = Math.random() < 0.3; // 30% chance to move forward while strafing
            
            // Start strafing
            this.bot.setControlState(strafeDirection, true);
            if (moveForward) {
                this.bot.setControlState('forward', true);
            }
            
            // Random jump during combat
            if (Math.random() < 0.4) {
                this.bot.setControlState('jump', true);
                setTimeout(() => {
                    if (this.bot) this.bot.setControlState('jump', false);
                }, 100);
            }
            
            // Stop strafing after short duration
            setTimeout(() => {
                if (this.bot) {
                    this.bot.setControlState(strafeDirection, false);
                    if (moveForward) {
                        this.bot.setControlState('forward', false);
                    }
                }
            }, 500 + Math.random() * 1000); // 0.5 to 1.5 seconds
            
        } catch (error) {
            logger.debug('Combat movement error:', error.message);
        }
    }

    async stop() {
        logger.info('Stopping Minecraft bot...');
        
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
        }

        if (this.bot) {
            this.bot.removeAllListeners();
            this.bot.quit();
            this.bot = null;
        }

        this.isConnected = false;
        logger.info('Minecraft bot stopped');
    }
}

module.exports = MinecraftBot;
