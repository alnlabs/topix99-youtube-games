// utils/redis.js
const redis = require("redis");
const { logger } = require("./logger");

// Redis URL (Docker, local, cloud all supported)
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Create Redis client
const redisClient = redis.createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff: 50ms → 2s max
      return Math.min(retries * 50, 2000);
    },
  },
});

// Events
redisClient.on("connect", () => {
  logger.info("[redis] connecting...");
});

redisClient.on("ready", () => {
  logger.info("[redis] ready");
});

redisClient.on("error", (err) => {
  logger.error("[redis] error:", err);
});

redisClient.on("end", () => {
  logger.warn("[redis] connection closed");
});

// Connect
async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info("[redis] connected");
  } catch (err) {
    logger.error("[redis] connection failed:", err);
    throw err;
  }
}

// Graceful shutdown
async function disconnectRedis() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info("[redis] disconnected");
    }
  } catch (err) {
    logger.error("[redis] shutdown error:", err);
  }
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
};
