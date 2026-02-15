/**
 * Logging Service
 *
 * Centralized logging with levels and color-coded output
 */

// Chalk v5 is ESM-only, so we use a simple color implementation for CommonJS
// This works with both chalk v4 and v5, and provides fallback if chalk fails
let chalk;
try {
  const chalkModule = require("chalk");
  // Chalk v4: direct use
  // Chalk v5: ESM-only, won't work with require, so we use fallback
  if (typeof chalkModule.red === 'function') {
    chalk = chalkModule;
  } else {
    throw new Error('Chalk v5 detected, using fallback');
  }
} catch (e) {
  // Fallback: simple ANSI color codes (works without chalk)
  chalk = {
    red: (str) => `\x1b[31m${str}\x1b[0m`,
    yellow: (str) => `\x1b[33m${str}\x1b[0m`,
    blue: (str) => `\x1b[34m${str}\x1b[0m`,
    gray: (str) => `\x1b[90m${str}\x1b[0m`,
  };
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  SUCCESS: 3,
  DEBUG: 4,
};

// Current log level (default: INFO)
const currentLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  },

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  },

  /**
   * Log success message
   * @param {string} message - Success message
   * @param {...any} args - Additional arguments
   */
  success(message, ...args) {
    if (currentLevel >= LOG_LEVELS.SUCCESS) {
      // Use green color for success
      const green = chalk.green ? chalk.green : (str) => `\x1b[32m${str}\x1b[0m`;
      console.log(green(`[SUCCESS] ${message}`), ...args);
    }
  },

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  },
};

module.exports = {
  logger,
  LOG_LEVELS,
};
