/**
 * Minecraft Bot for Aternos Server Monitoring
 * Created by: Rudr
 * 
 * Main entry point for the application
 */

const Bot = require('./bot');
const Server = require('./server');
const config = require('./config');
const logger = require('./logger');

// Initialize components
const bot = new Bot(config.minecraft);
const server = new Server(config.server, bot);

// Start the application
async function start() {
    try {
        logger.info('Starting Minecraft Bot Application...');
        
        // Start HTTP server for health checks
        await server.start();
        logger.info(`Health check server running on port ${config.server.port}`);
        
        // Start the Minecraft bot
        await bot.start();
        logger.info('Minecraft bot started successfully');
        
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    
    try {
        await bot.stop();
        await server.stop();
        logger.info('Application shut down successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    
    try {
        await bot.stop();
        await server.stop();
        logger.info('Application shut down successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.message || error);
    if (error.stack) {
        logger.debug('Error stack:', error.stack);
    }
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (reason && reason.stack) {
        logger.debug('Rejection stack:', reason.stack);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
start();
