const express = require('express');
const logger = require('./logger');

class HealthServer {
    constructor(config, bot) {
        this.config = config;
        this.bot = bot;
        this.app = express();
        this.server = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Middleware for JSON parsing
        this.app.use(express.json());

        // Middleware for logging requests
        this.app.use((req, res, next) => {
            logger.debug(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });

        // Health check endpoint for UptimeRobot
        this.app.get('/health', (req, res) => {
            try {
                const status = this.bot.getStatus();
                const config = require('./config');
                
                if (status.connected) {
                    res.status(200).json({
                        status: 'healthy',
                        message: 'UptimeRobot Monitor: Bot is connected and active',
                        service: 'Minecraft Bot UptimeRobot Monitor',
                        uptimeRobot: {
                            enabled: config.uptimeRobot.enabled,
                            monitoring: 'ACTIVE',
                            endpoint: '/health'
                        },
                        data: {
                            connected: status.connected,
                            username: status.username,
                            lastActivity: new Date(status.lastActivity).toISOString(),
                            uptime: Math.floor((status.uptime || 0) / 1000),
                            reconnectAttempts: status.reconnectAttempts
                        }
                    });
                } else {
                    res.status(503).json({
                        status: 'unhealthy',
                        message: 'UptimeRobot Monitor: Bot is not connected',
                        service: 'Minecraft Bot UptimeRobot Monitor',
                        uptimeRobot: {
                            enabled: config.uptimeRobot.enabled,
                            monitoring: 'WARNING - Bot Disconnected',
                            endpoint: '/health'
                        },
                        data: {
                            connected: status.connected,
                            reconnectAttempts: status.reconnectAttempts,
                            lastActivity: new Date(status.lastActivity).toISOString()
                        }
                    });
                }
            } catch (error) {
                logger.error('Health endpoint error:', error);
                res.status(503).json({
                    status: 'unhealthy',
                    message: 'Bot status unavailable',
                    data: {
                        connected: false,
                        error: 'Status check failed'
                    }
                });
            }
        });

        // Detailed status endpoint
        this.app.get('/status', (req, res) => {
            try {
                const status = this.bot.getStatus();
                res.json({
                    timestamp: new Date().toISOString(),
                    bot: status,
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        version: process.version
                    }
                });
            } catch (error) {
                logger.error('Status endpoint error:', error);
                res.status(500).json({
                    timestamp: new Date().toISOString(),
                    error: 'Unable to retrieve status',
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        version: process.version
                    }
                });
            }
        });

        // Simple ping endpoint
        this.app.get('/ping', (req, res) => {
            res.json({
                message: 'pong',
                service: 'UptimeRobot Monitor',
                timestamp: new Date().toISOString()
            });
        });

        // UptimeRobot setup instructions endpoint
        this.app.get('/uptimerobot-setup', (req, res) => {
            const replUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : 'https://your-replit-url.replit.app';
            
            res.json({
                title: 'UptimeRobot Setup Instructions',
                description: 'Follow these steps to connect your bot to UptimeRobot monitoring',
                steps: [
                    {
                        step: 1,
                        title: 'Create UptimeRobot Account',
                        description: 'Sign up at uptimerobot.com (free plan available)'
                    },
                    {
                        step: 2,
                        title: 'Add New Monitor',
                        description: 'Click "Add New Monitor" in your UptimeRobot dashboard'
                    },
                    {
                        step: 3,
                        title: 'Configure Monitor',
                        details: {
                            'Monitor Type': 'HTTP(s)',
                            'Friendly Name': 'Minecraft Bot Monitor',
                            'URL': `${replUrl}/health`,
                            'Monitoring Interval': '5 minutes (or your preference)',
                            'Monitor Timeout': '30 seconds'
                        }
                    },
                    {
                        step: 4,
                        title: 'Set Up Alerts',
                        description: 'Configure email/SMS alerts for when your bot goes offline'
                    }
                ],
                endpoints: {
                    health: `${replUrl}/health`,
                    status: `${replUrl}/status`,
                    ping: `${replUrl}/ping`
                },
                notes: [
                    'The /health endpoint returns 200 when bot is connected, 503 when disconnected',
                    'UptimeRobot will automatically detect outages and send alerts',
                    'Free plan allows up to 50 monitors with 5-minute intervals'
                ]
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Minecraft Bot Health Monitor',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    status: '/status',
                    ping: '/ping'
                },
                description: 'Health monitoring server for Minecraft bot with UptimeRobot integration'
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                message: `${req.method} ${req.originalUrl} is not a valid endpoint`
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            logger.error('Express error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'An unexpected error occurred'
            });
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, '0.0.0.0', (error) => {
                if (error) {
                    reject(error);
                } else {
                    logger.info(`Health server listening on port ${this.config.port}`);
                    resolve();
                }
            });
        });
    }

    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('Health server stopped');
                    resolve();
                });
            });
        }
    }
}

module.exports = HealthServer;
