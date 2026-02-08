const express = require("express");
const { getTopicStream } = require("./utils/topix99-api");
const { startLive } = require("./live");
const LuckyWheelGame = require("./games/luckywheel");
const { YTChat } = require("./utils/ytchat");
const { connectRedis, disconnectRedis } = require("./utils/redis");
const { logger } = require("./utils/logger");
const { validateConfig, validateModeConfig } = require("./utils/config-validator");

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
// This prevents accidentally using test Redis keys
if (process.env.TEST_MODE === "true") {
  logger.warn("⚠️  TEST_MODE is set to 'true' but running live server. Forcing TEST_MODE=false");
  process.env.TEST_MODE = "false";
}

logger.info(`Starting server - Mode=${MODE}, Port=${PORT}, Topic=${TOPIC_ID}, TEST_MODE=${process.env.TEST_MODE || "false"}`);

const app = express();
let ffmpeg = null;
let ytChat = null;
let server = null;

async function boot() {
  try {
    await connectRedis();
    logger.info("Redis connected");

    // Clean live database on startup if CLEAN_LIVE_DB is set
    if (process.env.CLEAN_LIVE_DB === "true" && MODE === "luckywheel") {
      logger.info("Cleaning live database...");
      const state = require("./games/luckywheel/state");
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

    // Start video pipeline
    ffmpeg = startLive(rtmpUrl, LuckyWheelGame);
    logger.info("Video pipeline started");

    // Start game
    if (MODE === "luckywheel") {
      await LuckyWheelGame.startNewRound();
      logger.info("Lucky wheel game started");
    }

    // Start chat
    ytChat = new YTChat(broadcastId);
    await ytChat.start(async ({ author, message }) => {
      logger.info(`[chat] ${author}: ${message}`);

      if (MODE === "luckywheel") {
        try {
          // Normalize username: remove @ symbol and trim whitespace
          const normalizedUsername = author.replace(/^@+/, '').trim();
          // Use normalized username as userId for consistency
          // This ensures same user always gets same userId even if @ symbol is present/absent
          const userId = normalizedUsername.toLowerCase();

          await LuckyWheelGame.processChatMessage(userId, normalizedUsername, message);
        } catch (err) {
          logger.error(`Error processing chat message: ${err.message}`);
        }
      }
    });
    logger.info("YouTube chat monitoring started");
  } catch (err) {
    logger.error(`Boot failed: ${err.message}`);
    throw err;
  }
}

async function shutdown() {
  logger.info("Shutting down gracefully...");

  try {
    if (MODE === "luckywheel") {
      LuckyWheelGame.cleanup();
      logger.info("Game cleanup completed");
    }
  } catch (err) {
    logger.error(`Error cleaning up game: ${err.message}`);
  }

  try {
    if (ytChat) {
      await ytChat.stop();
      logger.info("YouTube chat stopped");
    }
  } catch (err) {
    logger.error(`Error stopping chat: ${err.message}`);
  }

  try {
    if (ffmpeg && ffmpeg.stdin) {
      ffmpeg.stdin.end();
      logger.info("FFmpeg pipeline closed");
    }
  } catch (err) {
    logger.error(`Error closing FFmpeg: ${err.message}`);
  }

  try {
    await disconnectRedis();
    logger.info("Redis disconnected");
  } catch (err) {
    logger.error(`Error disconnecting Redis: ${err.message}`);
  }

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
    // Force exit after 10 seconds if server doesn't close
    setTimeout(() => {
      logger.warn("Forcing exit after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: MODE,
    port: PORT,
    topicId: TOPIC_ID,
    streaming: !!ffmpeg,
    chatActive: !!ytChat && !ytChat.isStopping,
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (req, res) => {
  const gameState = LuckyWheelGame.getStateSync();
  res.json({
    mode: MODE,
    gameState: {
      status: gameState.status,
      round: gameState.round,
      currentNumber: gameState.currentNumber,
      participants: gameState.participants.size,
    },
    streaming: !!ffmpeg,
    chatActive: !!ytChat && !ytChat.isStopping,
  });
});

// API endpoint to clean the live database (removes all game data and leaderboard)
app.post("/api/clean", async (req, res) => {
  try {
    if (MODE !== "luckywheel") {
      return res.status(400).json({ error: "Clean endpoint only available in luckywheel mode" });
    }
    const state = require("./games/luckywheel/state");
    await state.cleanDatabase();
    logger.info("Live database cleaned via API");
    res.json({ success: true, message: "Live database cleaned successfully" });
  } catch (err) {
    logger.error(`[server] Clean API error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

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
});

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
