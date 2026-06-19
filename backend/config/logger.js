// config/logger.js
// Structured logging via Winston
// In development: pretty-printed colored output
// In production:  JSON lines (pipe to Loki / CloudWatch / Papertrail)

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, colorize, printf, json, errors } = format;

// Human-readable format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
  })
);

// Structured JSON format for production
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    // Add file transport in production if needed:
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

module.exports = logger;
