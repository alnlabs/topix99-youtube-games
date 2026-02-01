function time() {
  return new Date().toISOString().substr(11, 8);
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const logger = {
  info(...args) {
    console.log(`${colors.cyan}[${time()}]${colors.reset}`, ...args);
  },
  warn(...args) {
    console.warn(`${colors.yellow}[${time()}]${colors.reset}`, ...args);
  },
  error(...args) {
    console.error(`${colors.red}[${time()}]${colors.reset}`, ...args);
  },
};

module.exports = { logger };
