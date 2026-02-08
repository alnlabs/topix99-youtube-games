// utils/config-validator.js
const { logger } = require("./logger");
const modes = require("../config/modes");

/**
 * Validates environment configuration
 * @throws {Error} If required configuration is missing or invalid
 */
function validateConfig() {
  const errors = [];

  // Validate MODE
  const MODE = process.env.MODE || "luckywheel";
  if (!modes[MODE]) {
    errors.push(
      `Invalid MODE: ${MODE}. Available modes: ${Object.keys(modes).join(", ")}`
    );
  }

  // Validate Redis URL format (if provided)
  const REDIS_URL = process.env.REDIS_URL;
  if (REDIS_URL && !REDIS_URL.match(/^redis:\/\//)) {
    errors.push(
      `Invalid REDIS_URL format. Expected: redis://host:port or redis://:password@host:port`
    );
  }

  // Validate Topix99 API token (warn if missing, but don't fail)
  const TOPIX99_API_TOKEN = process.env.TOPIX99_API_TOKEN;
  if (!TOPIX99_API_TOKEN) {
    logger.warn(
      "TOPIX99_API_TOKEN not set. API calls may fail. Set it in your .env file."
    );
  }

  // Validate boolean environment variables
  const ENABLE_FPS_STATS = process.env.ENABLE_FPS_STATS;
  if (ENABLE_FPS_STATS && !["true", "false"].includes(ENABLE_FPS_STATS)) {
    errors.push(
      `ENABLE_FPS_STATS must be "true" or "false", got: ${ENABLE_FPS_STATS}`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }

  return {
    mode: MODE,
    modeConfig: modes[MODE],
    redisUrl: REDIS_URL || "redis://127.0.0.1:6379",
    apiToken: TOPIX99_API_TOKEN,
    enableFpsStats: ENABLE_FPS_STATS === "true",
  };
}

/**
 * Validates game mode configuration
 * @param {Object} modeConfig - Mode configuration object
 * @throws {Error} If configuration is invalid
 */
function validateModeConfig(modeConfig) {
  const errors = [];

  if (!modeConfig.port || typeof modeConfig.port !== "number") {
    errors.push("Mode config must have a valid 'port' number");
  }

  if (!modeConfig.topicId || typeof modeConfig.topicId !== "number") {
    errors.push("Mode config must have a valid 'topicId' number");
  }

  if (!modeConfig.fps || typeof modeConfig.fps !== "number" || modeConfig.fps < 1) {
    errors.push("Mode config must have a valid 'fps' number >= 1");
  }

  if (errors.length > 0) {
    throw new Error(`Mode configuration invalid:\n${errors.join("\n")}`);
  }
}

module.exports = {
  validateConfig,
  validateModeConfig,
};
