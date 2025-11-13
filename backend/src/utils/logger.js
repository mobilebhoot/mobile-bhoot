/**
 * Production Logger Configuration
 * Winston-based logging with multiple transports
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Define format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(process.env.LOG_FILE_PATH || './logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: parseInt(process.env.LOG_MAX_SIZE) || 5242880, // 5MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(process.env.LOG_FILE_PATH || './logs', 'combined.log'),
    format: fileFormat,
    maxsize: parseInt(process.env.LOG_MAX_SIZE) || 5242880, // 5MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.dirname(transports[1].filename);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(process.env.LOG_FILE_PATH || './logs', 'exceptions.log'),
    format: fileFormat
  })
);

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Add request logging method
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  if (next) next();
};

// Add security logging methods
logger.security = {
  authAttempt: (phoneNumber, ip, success, reason = null) => {
    logger.info('Authentication Attempt', {
      phoneNumber,
      ip,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  },
  
  otpRequest: (phoneNumber, ip, channels, success) => {
    logger.info('OTP Request', {
      phoneNumber,
      ip,
      channels,
      success,
      timestamp: new Date().toISOString()
    });
  },
  
  otpVerification: (phoneNumber, ip, success, attempts) => {
    logger.info('OTP Verification', {
      phoneNumber,
      ip,
      success,
      attempts,
      timestamp: new Date().toISOString()
    });
  },
  
  rateLimitHit: (type, identifier, ip) => {
    logger.warn('Rate Limit Hit', {
      type,
      identifier,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (activity, details) => {
    logger.error('Suspicious Activity', {
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = logger;
