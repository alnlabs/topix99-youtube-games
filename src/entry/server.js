// src/entry/server.js
require("dotenv").config({ path: ".env" });
/**
 * Main Server Entry Point
 *
 * Production server that loads and runs games based on configuration.
 * Uses the game registry system for easy scalability.
 */

const express = require("express");
const path = require("path");
const { gameRegistry } = require("../core");
const {
  logger,
  connectRedis,
  disconnectRedis,
  getTopics,
  getTopicStream,
  getTopicStreams,
  YTChat,
  validateConfig,
  validateModeConfig,
} = require("../services");

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

console.log("MODE:", process.env.MODE);
console.log("API:", process.env.TOPIX99_API_TOKEN);

const { mode: MODE, modeConfig } = config;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : modeConfig.port;
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
app.use(express.json());
app.use(express.static("public"));
app.get("/admin", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin.html"));
});

let streamer = null;
let ytChat = null;
let server = null;
let game = null;
let streamSwitchInProgress = false;
let currentStreamState = {
  status: "idle",
  topicId: TOPIC_ID,
  streamName: modeConfig.streamName || null,
  broadcastId: null,
  rtmpUrl: null,
  usingOverride: Boolean(process.env.RTMP_URL_OVERRIDE),
  startedAt: null,
  updatedAt: new Date().toISOString(),
};
const streamRuntimeConfig = {
  topicId: TOPIC_ID,
  streamName: modeConfig.streamName || null,
  rtmpUrlOverride: process.env.RTMP_URL_OVERRIDE || null,
};

function getActiveStreamConfig() {
  return {
    topicId: streamRuntimeConfig.topicId,
    streamName: streamRuntimeConfig.streamName,
    rtmpUrlOverride: streamRuntimeConfig.rtmpUrlOverride,
  };
}

async function startOrRestartStreamingOutput(target) {
  const gameConfig = gameRegistry.get(MODE);
  if (!gameConfig) {
    throw new Error(`Game '${MODE}' is not registered`);
  }
  if (!game) {
    throw new Error("Game instance not initialized");
  }

  const topicId = target.topicId;
  const streamName = target.streamName || null;
  const overrideRtmp = target.rtmpUrlOverride || null;
  const directRtmpUrl = target.rtmpUrl || null;
  const directBroadcastId = target.broadcastId || null;
  const directLiveChatId = target.liveChatId || null;

  let rtmpUrl = null;
  let broadcastId = null;
  let liveChatId = null;

  if (directRtmpUrl && directBroadcastId) {
    logger.info(`Using direct stream payload from admin for topic ${topicId}`);
    rtmpUrl = overrideRtmp || directRtmpUrl;
    broadcastId = directBroadcastId;
    liveChatId = directLiveChatId;
  } else {
    logger.info(`Fetching stream from Topix99 (topic ${topicId})...`);
    const fromApi = await getTopicStream(topicId, streamName);
    rtmpUrl = overrideRtmp || fromApi.rtmpUrl;
    broadcastId = fromApi.broadcastId;
    liveChatId = fromApi.liveChatId || null;
  }

  if (!rtmpUrl || !broadcastId) {
    throw new Error("Invalid stream data from Topix99 - missing rtmpUrl or broadcastId");
  }

  if (ytChat) {
    try {
      await ytChat.stop();
      logger.info("YouTube chat stopped");
    } catch (err) {
      logger.error(`Error stopping chat: ${err.message}`);
    }
    ytChat = null;
  }

  if (streamer && typeof streamer.stop === "function") {
    try {
      await streamer.stop();
      logger.info("Previous stream output stopped");
    } catch (err) {
      logger.error(`Error stopping previous stream output: ${err.message}`);
    }
    streamer = null;
  }

  logger.info(
    overrideRtmp
      ? "RTMP URL: using runtime override from admin"
      : `RTMP URL: ${rtmpUrl.substring(0, 50)}...`
  );
  logger.info(`Broadcast ID: ${broadcastId}`);

  streamer = await gameConfig.startLive(rtmpUrl, game);
  logger.info("Video pipeline started");
  currentStreamState = {
    status: "running",
    topicId,
    streamName: streamName || null,
    broadcastId: broadcastId || null,
    rtmpUrl: rtmpUrl || null,
    liveChatId: liveChatId || null,
    usingOverride: Boolean(overrideRtmp),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ytChat = new YTChat(broadcastId);
  await ytChat.start(async ({ author, message }) => {
    logger.info(`[server-chat] Received from ${author}: "${message}"`);
    if (game && typeof game.processChatMessage === "function") {
      try {
        const normalizedUsername = author.replace(/^@+/, "").trim();
        const userId = normalizedUsername.toLowerCase();
        await game.processChatMessage(userId, normalizedUsername, message);
      } catch (err) {
        logger.error(`Error processing chat message: ${err.message}`);
      }
    }
  });
  logger.info("YouTube chat monitoring started");
}

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
    if (process.env.CLEAN_LIVE_DB === "true") {
      logger.info(`Cleaning live database for mode: ${MODE}...`);
      const state = require(`../games/${MODE}/state`);
      await state.cleanDatabase();
      logger.info("Live database cleaned - all game data and leaderboard reset");
    }

    await startOrRestartStreamingOutput(getActiveStreamConfig());

    // Start game
    if (game && typeof game.startNewRound === "function") {
      await game.startNewRound();
      logger.info(`${gameConfig.config.name || MODE} game started`);
    }

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

app.get("/api/admin/config", (req, res) => {
  res.json({
    mode: MODE,
    runtime: getActiveStreamConfig(),
    running: currentStreamState,
  });
});

app.get("/api/admin/running-streams", (req, res) => {
  res.json({
    mode: MODE,
    streams: [currentStreamState],
  });
});

app.get("/api/admin/topics/:topicId/streams", async (req, res) => {
  try {
    const topicId = parseInt(req.params.topicId, 10);
    if (!Number.isFinite(topicId) || topicId <= 0) {
      return res.status(400).json({ error: "Invalid topicId" });
    }
    const streams = await getTopicStreams(topicId);
    return res.json({
      topicId,
      streams: streams.map((s) => ({
        id: s.id,
        name: s.name,
        rtmpUrl: s.rtmpUrl,
        broadcastId: s.broadcastId,
        liveChatId: s.liveChatId || null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/topics", async (req, res) => {
  try {
    const topics = await getTopics();
    return res.json({
      topics: topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/stream/select", async (req, res) => {
  if (streamSwitchInProgress) {
    return res.status(409).json({ error: "Stream switch already in progress" });
  }
  const topicId = parseInt(req.body.topicId, 10);
  const streamName = req.body.streamName ? String(req.body.streamName).trim() : null;
  const directRtmpUrl = req.body.rtmpUrl ? String(req.body.rtmpUrl).trim() : null;
  const directBroadcastId = req.body.broadcastId ? String(req.body.broadcastId).trim() : null;
  const directLiveChatId = req.body.liveChatId ? String(req.body.liveChatId).trim() : null;
  const rtmpUrlOverride = req.body.rtmpUrlOverride
    ? String(req.body.rtmpUrlOverride).trim()
    : null;

  if (!Number.isFinite(topicId) || topicId <= 0) {
    return res.status(400).json({ error: "Invalid topicId" });
  }

  streamSwitchInProgress = true;
  try {
    currentStreamState = {
      ...currentStreamState,
      status: "switching",
      topicId,
      streamName,
      rtmpUrl: directRtmpUrl || null,
      broadcastId: directBroadcastId || null,
      liveChatId: directLiveChatId || null,
      usingOverride: Boolean(rtmpUrlOverride),
      updatedAt: new Date().toISOString(),
    };
    streamRuntimeConfig.topicId = topicId;
    streamRuntimeConfig.streamName = streamName;
    streamRuntimeConfig.rtmpUrlOverride = rtmpUrlOverride;

    await startOrRestartStreamingOutput({
      ...getActiveStreamConfig(),
      rtmpUrl: directRtmpUrl,
      broadcastId: directBroadcastId,
      liveChatId: directLiveChatId,
    });
    return res.json({
      ok: true,
      runtime: getActiveStreamConfig(),
    });
  } catch (err) {
    currentStreamState = {
      ...currentStreamState,
      status: "error",
      updatedAt: new Date().toISOString(),
      lastError: err.message,
    };
    return res.status(500).json({ error: err.message });
  } finally {
    streamSwitchInProgress = false;
  }
});

app.post("/api/admin/stream/stop", async (req, res) => {
  if (streamSwitchInProgress) {
    return res.status(409).json({ error: "Stream switch already in progress" });
  }

  streamSwitchInProgress = true;
  try {
    if (ytChat) {
      await ytChat.stop();
      logger.info("YouTube chat stopped via admin stop request");
      ytChat = null;
    }

    if (streamer && typeof streamer.stop === "function") {
      await streamer.stop();
      logger.info("Stream output stopped via admin stop request");
      streamer = null;
    }

    currentStreamState = {
      ...currentStreamState,
      status: "stopped",
      topicId: null,
      streamName: null,
      rtmpUrl: null,
      broadcastId: null,
      liveChatId: null,
      usingOverride: false,
      updatedAt: new Date().toISOString(),
    };
    streamRuntimeConfig.topicId = null;
    streamRuntimeConfig.streamName = null;
    streamRuntimeConfig.rtmpUrlOverride = null;

    return res.json({
      ok: true,
      runtime: getActiveStreamConfig(),
    });
  } catch (err) {
    logger.error(`Error stopping stream: ${err.message}`);
    return res.status(500).json({ error: err.message });
  } finally {
    streamSwitchInProgress = false;
  }
});

// Start server
server = app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);

  if (process.env.ADMIN_ONLY === "true") {
    logger.info("🛠️  Running in ADMIN ONLY mode. Skipping game boot sequence.");
    return;
  }

  try {
    console.log("[SERVER] Starting boot sequence...");
    await boot();
    console.log("[SERVER] Boot completed successfully!");
    logger.info("Server boot completed successfully");
  } catch (err) {
    logger.error(`Boot failed: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
});

module.exports = { app, server };
