function time() {
  return new Date().toISOString().substr(11, 8);
}

function dateTime() {
  return new Date().toISOString();
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

const logger = {
  debug(...args) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log(`${colors.gray}[${time()}] [DEBUG]${colors.reset}`, ...args);
    }
  },

  info(...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(`${colors.cyan}[${time()}]${colors.reset}`, ...args);
    }
  },

  success(...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(`${colors.green}[${time()}] ✓${colors.reset}`, ...args);
    }
  },

  warn(...args) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(`${colors.yellow}[${time()}] ⚠${colors.reset}`, ...args);
    }
  },

  error(...args) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error(`${colors.red}[${time()}] ✗${colors.reset}`, ...args);
    }
  },

  // Structured logging for monitoring
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: dateTime(),
      level: level.toUpperCase(),
      message,
      ...metadata,
    };

    // In production, you might want to send this to a logging service
    if (process.env.LOG_JSON === "true") {
      console.log(JSON.stringify(logEntry));
    } else {
      const color = colors[level === "error" ? "red" : level === "warn" ? "yellow" : "cyan"];
      console.log(`${color}[${time()}] [${level.toUpperCase()}]${colors.reset} ${message}`, metadata);
    }
  },
};

module.exports = { logger, LOG_LEVELS };
