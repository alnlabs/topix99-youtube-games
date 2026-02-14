/**
 * Main Server Entry Point
 *
 * Production server that loads and runs games based on configuration.
 * Uses the game registry system for easy scalability.
 */

const express = require("express");
const { gameRegistry } = require("../core");
const { logger, connectRedis, disconnectRedis, getTopicStream, YTChat, validateConfig, validateModeConfig } = require("../services");

// Register games
const luckywheel = require("../games/luckywheel");
gameRegistry.register("luckywheel", {
  GameClass: luckywheel.GameClass,
  renderer: luckywheel.renderer,
  startLive: luckywheel.startLive,
  startTest: luckywheel.startTest,
  config: luckywheel.config,
});

const quiz = require("../games/quiz");
gameRegistry.register("quiz", {
  GameClass: quiz.GameClass,
  renderer: quiz.renderer,
  startLive: quiz.startLive,
  startTest: quiz.startTest,
  config: quiz.config,
});

// Validate and load configuration
let config;
try {
  config = validateConfig();
  validateModeConfig(config.modeConfig);
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const { mode: MODE, modeConfig } = config;
const PORT = modeConfig.port;
const TOPIC_ID = modeConfig.topicId;

// Ensure TEST_MODE is NOT set for live/production server
if (process.env.TEST_MODE === "true") {
  logger.warn("⚠️  TEST_MODE is set to 'true' but running live server. Forcing TEST_MODE=false");
  process.env.TEST_MODE = "false";
}

// Check if running under PM2 (for live/YouTube mode)
const isPM2 = process.env.pm_id !== undefined || process.env.PM2_HOME !== undefined;

// Live/YouTube mode should ONLY run under PM2
if (!isPM2 && !process.env.ALLOW_NON_PM2) {
  logger.error("❌ ERROR: Live/YouTube mode requires PM2!");
  logger.error("   Live mode is only allowed to run under PM2 for safety and stability.");
  logger.error("   Use one of these commands:");
  logger.error("   - npm run pm2:start:quiz (for quiz live mode)");
  logger.error("   - pm2 start ecosystem.config.js --only topix99-quiz");
  logger.error("");
  logger.error("   For test mode, you can use:");
  logger.error("   - npm run quiz:test (direct run)");
  logger.error("   - npm run pm2:start:quiz:test (PM2)");
  logger.error("");
  logger.error("   If you really need to run live mode without PM2 (NOT RECOMMENDED), set:");
  logger.error("   ALLOW_NON_PM2=true npm run quiz");
  process.exit(1);
}

logger.info(`Starting server - Mode=${MODE}, Port=${PORT}, Topic=${TOPIC_ID}, TEST_MODE=${process.env.TEST_MODE || "false"}, PM2=${isPM2}`);

const app = express();
let streamer = null;
let ytChat = null;
let server = null;
let game = null;

async function boot() {
  try {
    await connectRedis();
    logger.info("Redis connected");

    // Get game configuration from registry
    const gameConfig = gameRegistry.get(MODE);
    if (!gameConfig) {
      throw new Error(`Game '${MODE}' is not registered. Available games: ${gameRegistry.list().join(", ")}`);
    }

    // Create game instance
    game = gameRegistry.createInstance(MODE);
    if (!game) {
      throw new Error(`Failed to create instance of game '${MODE}'`);
    }

    // Clean live database on startup if CLEAN_LIVE_DB is set
    if (process.env.CLEAN_LIVE_DB === "true" && MODE === "luckywheel") {
      logger.info("Cleaning live database...");
      const state = require(`../games/${MODE}/state`);
      await state.cleanDatabase();
      logger.info("Live database cleaned - all game data and leaderboard reset");
    }

    logger.info("Fetching stream from Topix99...");
    const { rtmpUrl, broadcastId } = await getTopicStream(TOPIC_ID);

    if (!rtmpUrl || !broadcastId) {
      throw new Error("Invalid stream data from Topix99 - missing rtmpUrl or broadcastId");
    }

    logger.info(`RTMP URL: ${rtmpUrl.substring(0, 50)}...`);
    logger.info(`Broadcast ID: ${broadcastId}`);

    // Start video pipeline using game's startLive function
    streamer = await gameConfig.startLive(rtmpUrl, game);
    logger.info("Video pipeline started");

    // Start game
    if (game && typeof game.startNewRound === "function") {
      await game.startNewRound();
      logger.info(`${gameConfig.config.name || MODE} game started`);
    }

    // Start chat
    ytChat = new YTChat(broadcastId);
    await ytChat.start(async ({ author, message }) => {
      logger.info(`[chat] ${author}: ${message}`);

      if (game && typeof game.processChatMessage === "function") {
        try {
          // Normalize username: remove @ symbol and trim whitespace
          const normalizedUsername = author.replace(/^@+/, "").trim();
          // Use normalized username as userId for consistency
          const userId = normalizedUsername.toLowerCase();

          await game.processChatMessage(userId, normalizedUsername, message);
        } catch (err) {
          logger.error(`Error processing chat message: ${err.message}`);
        }
      }
    });
    logger.info("YouTube chat monitoring started");
  } catch (err) {
    logger.error(`Boot failed: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
}

async function shutdown() {
  logger.info("Shutting down server...");

  if (ytChat) {
    try {
      await ytChat.stop();
      logger.info("YouTube chat stopped");
    } catch (err) {
      logger.error(`Error stopping chat: ${err.message}`);
    }
  }

  if (streamer && typeof streamer.stop === "function") {
    try {
      await streamer.stop();
      logger.info("Stream stopped");
    } catch (err) {
      logger.error(`Error stopping stream: ${err.message}`);
    }
  }

  if (game && typeof game.cleanup === "function") {
    try {
      game.cleanup();
      logger.info("Game cleaned up");
    } catch (err) {
      logger.error(`Error cleaning up game: ${err.message}`);
    }
  }

  disconnectRedis();
  logger.info("Redis disconnected");

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Graceful shutdown handlers
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  logger.error(err.stack);
  shutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  shutdown();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: MODE,
    uptime: process.uptime(),
    games: gameRegistry.list(),
  });
});

// Start server
server = app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);
  try {
    await boot();
    logger.info("Server boot completed successfully");
  } catch (err) {
    logger.error(`Boot failed: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
});

module.exports = { app, server };
