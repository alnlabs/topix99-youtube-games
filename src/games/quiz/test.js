const express = require("express");
const { createCanvas } = require("canvas");
const path = require("path");
const { connectRedis, disconnectRedis } = require("../../services");
const GameClass = require("./game");
const game = new GameClass();
const { logger } = require("../../services");
const { renderQuizUI } = require("./template-renderer");
const C = require("./constants");
const { WIDTH, HEIGHT, FPS } = C;

// Set up test mode environment - moved into start()
// process.env.TEST_MODE = "true";

async function start() {
  process.env.TEST_MODE = "true";
  // Create canvas for testing
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    // Initialize Redis connection
    await connectRedis();
    logger.info("[quiz-test] Starting quiz game test server");

    // Create Express app
    const app = express();

    // Serve static files
    app.use(express.static(path.join(__dirname, "../../../")));

    // Specific endpoints first
    // Endpoint to get current game state
    app.get("/api/quiz/state", async (req, res) => {
      try {
        const gameState = game.getStateSync();
        const leaderboard = game.getLeaderboardSync();
        res.json({ gameState, leaderboard });
      } catch (err) {
        logger.error("[quiz-test] Error getting state:", err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // Endpoint to render current frame
    app.get("/api/quiz/frame", async (req, res) => {
      try {
        // Load latest state
        await game.load();

        // Get current state
        const gameState = game.getStateSync();
        const leaderboard = game.getLeaderboardSync();

        // Render frame
        renderQuizUI(ctx, gameState, leaderboard);

        // Send as PNG
        const buffer = canvas.toBuffer("image/png");
        res.set("Content-Type", "image/png");
        res.send(buffer);
      } catch (err) {
        logger.error("[quiz-test] Error rendering frame:", err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // Endpoint to trigger game events (wildcard should be last)
    app.get("/api/quiz/:action", async (req, res) => {
      try {
        const { action } = req.params;

        switch (action) {
          case "start":
            await game.goToQuestion();
            res.json({ status: "started", gameState: game.getStateSync() });
            break;

          case "answer":
            const { userId, username, answerIndex } = req.query;
            if (userId && username && answerIndex !== undefined) {
              const labels = ["A", "B", "C", "D"];
              const label = labels[parseInt(answerIndex)] || "A";
              await game.processChatMessage(userId, username, label);
              res.json({ status: "answered", gameState: game.getStateSync() });
            } else {
              res
                .status(400)
                .json({ error: "Missing userId, username, or answerIndex" });
            }
            break;

          case "next":
            await game.goToNext();
            res.json({ status: "next", gameState: game.getStateSync() });
            break;

          case "reset":
            await game.reset();
            res.json({ status: "reset", gameState: game.getStateSync() });
            break;

          default:
            res.status(404).json({ error: "Invalid action" });
        }
      } catch (err) {
        logger.error(`[quiz-test] Error in ${action}:`, err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // Main game loop
    const gameLoop = async () => {
      try {
        // Load latest state
        await game.load();

        // Get current state
        const gameState = game.getStateSync();
        const leaderboard = game.getLeaderboardSync();

        // Render frame
        renderQuizUI(ctx, gameState, leaderboard);

        // Schedule next frame
        setTimeout(gameLoop, 1000 / FPS);
      } catch (err) {
        logger.error("[quiz-test] Error in game loop:", err.message);
        setTimeout(gameLoop, 1000); // Retry after 1 second
      }
    };

    // Start game loop
    gameLoop();

    // Start server
    const PORT = process.env.TEST_PORT || 3001;
    app.listen(PORT, () => {
      logger.success(`[quiz-test] Quiz test server running on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("[quiz-test] Shutting down...");
      await disconnectRedis();
      process.exit(0);
    });
  } catch (err) {
    logger.error("[quiz-test] Failed to start:", err.message);
    process.exit(1);
  }
}

// Only auto-start if this file is run directly (not when required)
if (require.main === module) {
  start().catch((err) => {
    logger.error(`[quiz-test] Fatal error: ${err.message}`);
    process.exit(1);
  });
}

// Export start function for use by other modules
module.exports = start;
