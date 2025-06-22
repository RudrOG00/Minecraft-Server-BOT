const logger = require('./logger');

class BotActivities {
    constructor() {
        this.lastMovement = Date.now();
        this.movements = ['forward', 'back', 'left', 'right'];
        this.lookDirections = [
            { yaw: 0, pitch: 0 },      // North
            { yaw: Math.PI / 2, pitch: 0 },   // East
            { yaw: Math.PI, pitch: 0 },       // South
            { yaw: -Math.PI / 2, pitch: 0 },  // West
            { yaw: 0, pitch: -Math.PI / 4 },  // Up
            { yaw: 0, pitch: Math.PI / 4 }    // Down
        ];
    }

    randomMovement(bot) {
        if (!bot || !bot.entity) {
            logger.warn('Cannot perform movement: bot not ready');
            return;
        }

        try {
            // Stop any current movement
            bot.setControlState('forward', false);
            bot.setControlState('back', false);
            bot.setControlState('left', false);
            bot.setControlState('right', false);
            bot.setControlState('jump', false);

            // Choose random movement
            const movement = this.movements[Math.floor(Math.random() * this.movements.length)];
            const duration = 1000 + Math.random() * 2000; // 1 to 3 seconds - longer movement
            const shouldJump = Math.random() < 0.5; // 50% chance to jump - more active

            logger.debug(`Bot moving ${movement} for ${Math.round(duration)}ms${shouldJump ? ' with jump' : ''}`);

            // Start movement
            bot.setControlState(movement, true);
            
            if (shouldJump) {
                bot.setControlState('jump', true);
            }

            // Stop movement after duration
            setTimeout(() => {
                try {
                    bot.setControlState(movement, false);
                    if (shouldJump) {
                        bot.setControlState('jump', false);
                    }
                } catch (error) {
                    logger.warn('Error stopping movement:', error.message);
                }
            }, duration);

            this.lastMovement = Date.now();

        } catch (error) {
            logger.warn('Error during movement:', error.message);
        }
    }

    lookAround(bot) {
        if (!bot || !bot.entity) {
            logger.warn('Cannot look around: bot not ready');
            return;
        }

        try {
            const direction = this.lookDirections[Math.floor(Math.random() * this.lookDirections.length)];
            
            bot.look(direction.yaw, direction.pitch, false);
            logger.debug(`Bot looking at yaw: ${direction.yaw.toFixed(2)}, pitch: ${direction.pitch.toFixed(2)}`);

        } catch (error) {
            logger.warn('Error looking around:', error.message);
        }
    }

    randomChat(bot, messages = []) {
        if (!bot) {
            logger.warn('Cannot chat: bot not ready');
            return;
        }

        try {
            const defaultMessages = [
                'Still here!',
                'Bot active',
                'Keeping server alive',
                'All systems operational',
                'Monitoring server status'
            ];

            const messagePool = messages.length > 0 ? messages : defaultMessages;
            const message = messagePool[Math.floor(Math.random() * messagePool.length)];

            bot.chat(message);
            logger.debug(`Bot sent message: ${message}`);

        } catch (error) {
            logger.warn('Error sending chat message:', error.message);
        }
    }

    emergencyActions(bot) {
        if (!bot || !bot.entity) {
            logger.warn('Cannot perform emergency actions: bot not ready');
            return;
        }

        try {
            logger.warn('Performing emergency actions due to low health');

            // Try to find and eat food
            const food = bot.inventory.items().find(item => 
                item.name.includes('bread') || 
                item.name.includes('apple') || 
                item.name.includes('carrot') ||
                item.name.includes('potato') ||
                item.name.includes('beef') ||
                item.name.includes('pork') ||
                item.name.includes('chicken')
            );

            if (food) {
                bot.equip(food, 'hand').then(() => {
                    bot.activateItem();
                    logger.info('Bot is eating food to restore health');
                }).catch(error => {
                    logger.warn('Failed to eat food:', error.message);
                });
            }

            // Try to move to safety (away from danger)
            this.randomMovement(bot);

            // Send emergency chat message
            bot.chat('Health low! Taking evasive action.');

        } catch (error) {
            logger.error('Error during emergency actions:', error.message);
        }
    }

    performRandomActivity(bot, config = {}) {
        if (!bot || !bot.entity) {
            logger.warn('Cannot perform activity: bot not ready');
            return;
        }

        const activities = [];
        
        // Add available activities based on configuration
        if (config.allowMovement !== false) {
            activities.push(() => this.randomMovement(bot));
        }
        
        if (config.allowLooking !== false) {
            activities.push(() => this.lookAround(bot));
        }
        
        if (config.allowChat !== false && config.afkMessages) {
            activities.push(() => this.randomChat(bot, config.afkMessages));
        }

        if (activities.length === 0) {
            logger.warn('No activities available to perform');
            return;
        }

        // Choose and perform random activity
        const activity = activities[Math.floor(Math.random() * activities.length)];
        activity();
    }

    // Check if bot needs to be more active based on time since last activity
    shouldPerformActivity(lastActivity, activityInterval = 60000) {
        return Date.now() - lastActivity > activityInterval;
    }

    // Get activity statistics
    getActivityStats() {
        return {
            lastMovement: this.lastMovement,
            timeSinceLastMovement: Date.now() - this.lastMovement,
            availableMovements: this.movements.length,
            availableLookDirections: this.lookDirections.length
        };
    }
}

module.exports = BotActivities;
