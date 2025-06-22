const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || null;
        this.logToConsole = process.env.LOG_CONSOLE !== 'false';
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[37m', // White
            reset: '\x1b[0m'
        };
        
        // Create logs directory if file logging is enabled
        if (this.logFile) {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }
    
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] ${levelUpper} ${message}${formattedArgs}`;
    }
    
    log(level, message, ...args) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, ...args);
        
        // Console output with colors
        if (this.logToConsole) {
            const coloredMessage = `${this.colors[level]}${formattedMessage}${this.colors.reset}`;
            console.log(coloredMessage);
        }
        
        // File output without colors
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, formattedMessage + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }
    
    error(message, ...args) {
        this.log('error', message, ...args);
    }
    
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    
    info(message, ...args) {
        this.log('info', message, ...args);
    }
    
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
}

module.exports = new Logger();
