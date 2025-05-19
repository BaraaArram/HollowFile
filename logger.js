const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class Logger {
  constructor(logType) {
    this.logType = logType;
    
    // Determine if we're in development or production
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         !app || 
                         !app.isPackaged;
    
    // Set log directory based on environment
    const logDir = isDevelopment 
      ? path.join(process.cwd(), 'logs')  // Project directory during development
      : path.join(app?.getPath('userData') || process.cwd(), 'logs');  // userData in production
    
    this.logFilePath = path.join(logDir, `${logType}.log`);
    
    try {
      // Ensure logs directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Write initialization message
      this.writeToFile('info', {
        message: 'Logger initialized',
        meta: { logPath: this.logFilePath }
      });
      
      //console.log(chalk.green(`${logType} logs will be saved to: ${this.logFilePath}`));
    } catch (err) {
      //console.error(chalk.red(`Failed to initialize ${logType} logger:`), err);
      // Fallback to console-only logging if file creation fails
      this.logFilePath = null;
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  safeStringify(obj, indent = 2) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    }, indent);
  }

  formatLogEntry(level, message, meta) {
    let entry = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      entry += `\n${this.safeStringify(meta)}`;
    }
    
    return entry + '\n';
  }

  writeToFile(level, data) {
    if (!this.logFilePath) return;
    
    try {
      let logEntry;
      
      if (typeof data === 'object') {
        logEntry = this.formatLogEntry(level, data.message || '', data.meta);
      } else {
        logEntry = this.formatLogEntry(level, data);
      }
      
      fs.appendFileSync(this.logFilePath, logEntry);
    } catch (err) {
      //console.error(chalk.red(`Error writing to ${this.logType} log:`), err);
    }
  }

  log(level, message, meta) {
    const colors = {
      debug: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green,
      info: chalk.white,
      verbose: chalk.gray
    };

    const color = colors[level] || chalk.white;
    const formattedMessage = this.formatLogEntry(level, message, meta);
    
    // Console output with colors (remove trailing newline for console)
    //console.log(color(formattedMessage.trimEnd()));
    
    // Write to file
    this.writeToFile(level, meta ? { message, meta } : message);
  }

  debug(message, meta) { this.log('debug', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
  success(message, meta) { this.log('success', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  verbose(message, meta) { this.log('verbose', message, meta); }
}

// Create logger instances
const apiLogger = new Logger('api');
const downloadLogger = new Logger('download');
const resultLogger = new Logger('result');
const nameListLogger = new Logger('nameList');

module.exports = {
  api: apiLogger,
  download: downloadLogger,
  result: resultLogger,
  nameList: nameListLogger
};