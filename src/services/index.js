/**
 * Services Module Exports
 *
 * Central export point for all services
 */

module.exports = {
  // Logging
  logger: require("./logger").logger,
  LOG_LEVELS: require("./logger").LOG_LEVELS,

  // Redis
  redisClient: require("./redis").redisClient,
  connectRedis: require("./redis").connectRedis,
  disconnectRedis: require("./redis").disconnectRedis,

  // Topix99 API
  getTopicStream: require("./topix99-api").getTopicStream,

  // YouTube Chat
  YTChat: require("./ytchat").YTChat,

  // Configuration
  validateConfig: require("./config-validator").validateConfig,
  validateModeConfig: require("./config-validator").validateModeConfig,

  // Utilities
  calculateFontSizeForHeight: require("./font-helper").calculateFontSizeForHeight,
  shapes: require("./shapes"),

  // Shape drawing functions (for convenience)
  drawRoundedRect: require("./shapes").drawRoundedRect,
  drawRect: require("./shapes").drawRect,
  drawCircle: require("./shapes").drawCircle,
  drawTriangle: require("./shapes").drawTriangle,
  drawProgressBar: require("./shapes").drawProgressBar,
  drawSector: require("./shapes").drawSector,
};
