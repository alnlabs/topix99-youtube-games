const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { redisClient, connectRedis, disconnectRedis } = require('./utils/redis');
const game = require('./games/luckywheel/index');
const { logger } = require('./utils/logger');
const {
  WIDTH,
  HEIGHT,
  FPS,
  palettes,
  drawBackground,
  drawWheelAndUI,
  drawLeaderboard,
  drawFPSCounter,
  drawLogoAndBrand,
  WheelRotationState,
  LeaderboardAnimationState,
} = require('./live/renderer');

// Set test mode environment variable to ensure test Redis keys are used
process.env.TEST_MODE = "true";

const app = express();
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
const PORT = 5001;
let server = null;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

let wheelRotationState = new WheelRotationState();
let leaderboardAnimationState = new LeaderboardAnimationState();
let logoImage = null;
let fpsState = { currentFPS: 30, lastFrameTime: Date.now() };

// Leaderboard (synced from Redis)
let localLeaderboard = [];

// All drawing functions are now imported from live/renderer.js

// --- SERVER SETUP ---

// Sync game state and leaderboard from Redis
const syncData = async () => {
  try {
    await game.load();
    const lb = game.getLeaderboardSync();
    if (lb && Array.isArray(lb)) {
      localLeaderboard = lb.map((p) => ({
        username: p.username || "Unknown",
        wins: p.score || 0,
      }));
    }
  } catch (e) {
    // Only log errors occasionally to avoid spam
    if (!global.lastSyncError || Date.now() - global.lastSyncError > 5000) {
      logger.error(`[test] Sync error: ${e.message}`);
      global.lastSyncError = Date.now();
    }
  }
};

async function start() {
  try {
    await connectRedis();
    logger.info("Redis connected for test mode");

    // Clean test database on startup (optional - remove if you want to keep test data)
    if (process.env.CLEAN_TEST_DB === "true") {
      logger.info("Cleaning test database...");
      const state = require('./games/luckywheel/state');
      await state.cleanDatabase();
      logger.success("Test database cleaned");
    }

    logoImage = await loadImage(path.join(__dirname, "assets/images/logo.png")).catch(() => {
      logger.warn("Logo image not found");
      return null;
    });

    await game.startNewRound();
    logger.info("Game started");

    // Initial sync
    await syncData();
    // Sync every 500ms
    const syncInterval = setInterval(syncData, 500);

    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Lucky Wheel Test</title>
            <style>
              body {
                background: #000;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
                width: 100%;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                padding: 10px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
              }
              img {
                max-width: 100%;
                width: auto;
                height: auto;
                border: 2px solid #333;
                object-fit: contain;
                flex-shrink: 0;
              }
              .info {
                color: #fff;
                margin-top: 10px;
                font-size: 14px;
              }
              .input-section {
                margin-top: 20px;
                padding: 20px;
                background: #1a1a1a;
                border-radius: 8px;
                border: 1px solid #333;
                max-width: 600px;
                width: 90%;
                flex-shrink: 0;
                position: relative;
                z-index: 10;
              }
              .input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
              }
              input[type="text"] {
                flex: 1;
                padding: 10px;
                font-size: 16px;
                border: 2px solid #444;
                border-radius: 4px;
                background: #2a2a2a;
                color: #fff;
              }
              input[type="text"]:focus {
                outline: none;
                border-color: #FFD700;
              }
              button {
                padding: 10px 20px;
                font-size: 16px;
                background: #FFD700;
                color: #000;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
              }
              button:hover {
                background: #ffed4e;
              }
              .help-text {
                color: #888;
                font-size: 12px;
                margin-top: 10px;
                text-align: left;
              }
              .status {
                color: #4CD964;
                font-size: 14px;
                margin-top: 10px;
                min-height: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="/stream" alt="Lucky Wheel Stream">
              <div class="info">Test Mode - Game running at http://localhost:${PORT}</div>

              <div class="input-section">
                <div class="input-group">
                  <input type="text" id="username" placeholder="Username (e.g., Player1)" value="TestUser">
                  <input type="text" id="message" placeholder="Enter a number (1-100)" autofocus>
                  <button onclick="submitGuess()">Submit Guess</button>
                </div>
                <div class="help-text">
                  💡 <strong>How to test:</strong><br>
                  • Enter a number between 1-100 to simulate a guess<br>
                  • The game will process it as a chat message<br>
                  • During "waiting" phase, guesses are collected<br>
                  • After spin, winners are calculated based on closest guess
                </div>
                <div class="status" id="status"></div>
              </div>
            </div>

            <script>
              const messageInput = document.getElementById('message');
              const usernameInput = document.getElementById('username');
              const statusDiv = document.getElementById('status');

              // Submit on Enter key
              messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                  submitGuess();
                }
              });

              async function submitGuess() {
                const message = messageInput.value.trim();
                const username = usernameInput.value.trim() || 'TestUser';

                if (!message) {
                  showStatus('Please enter a number', 'error');
                  return;
                }

                const num = parseInt(message);
                if (isNaN(num) || num < 1 || num > 100) {
                  showStatus('Please enter a number between 1 and 100', 'error');
                  return;
                }

                try {
                  showStatus('Submitting guess...', 'info');
                  const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, message })
                  });

                  const data = await response.json();
                  if (response.ok) {
                    showStatus(\`✅ Guess submitted: \${num} by \${username}\`, 'success');
                    messageInput.value = '';
                    messageInput.focus();
                  } else {
                    showStatus(\`❌ Error: \${data.error || 'Failed to submit'}\`, 'error');
                  }
                } catch (err) {
                  showStatus(\`❌ Error: \${err.message}\`, 'error');
                }
              }

              function showStatus(text, type) {
                statusDiv.textContent = text;
                statusDiv.style.color = type === 'error' ? '#FF3B30' : type === 'success' ? '#4CD964' : '#FFD700';
                setTimeout(() => {
                  if (statusDiv.textContent === text) {
                    statusDiv.textContent = '';
                  }
                }, 3000);
              }
            </script>
          </body>
        </html>
      `);
    });

    // API endpoint to clean test database
    app.post('/api/clean', async (req, res) => {
      try {
        const state = require('./games/luckywheel/state');
        await state.cleanDatabase();
        res.json({ success: true, message: 'Test database cleaned successfully' });
      } catch (err) {
        logger.error(`[test] Clean API error: ${err.message}`);
        res.status(500).json({ error: err.message });
      }
    });

    // API endpoint to simulate chat messages
    app.post('/api/chat', async (req, res) => {
      try {
        const { username, message } = req.body;

        if (!username || !message) {
          return res.status(400).json({ error: 'Username and message are required' });
        }

        // Use consistent userId based on username (lowercase) to prevent duplicates
        // This ensures the same user always gets the same userId, allowing guess tracking
        const userId = `user_${username.toLowerCase().trim()}`;

        // Process the chat message through the game
        await game.processChatMessage(userId, username, message);

        res.json({ success: true, message: 'Guess submitted successfully' });
      } catch (err) {
        logger.error(`[test] Chat API error: ${err.message}`);
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/stream', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=frame' });

      const interval = setInterval(() => {
        try {
          const s = game.getStateSync();

          drawBackground(ctx, palettes[0]);
          drawWheelAndUI(ctx, s, wheelRotationState);
          drawLeaderboard(ctx, localLeaderboard, leaderboardAnimationState);
          drawLogoAndBrand(ctx, logoImage);
          fpsState = drawFPSCounter(ctx, fpsState);

          const buf = canvas.toBuffer('image/jpeg', { quality: 0.8 });
          res.write('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' + buf.length + '\r\n\r\n');
          res.write(buf, 'binary');
          res.write('\r\n');
        } catch (err) {
          logger.error(`[test] Render error: ${err.message}`);
          clearInterval(interval);
          res.end();
        }
      }, 1000 / 30);

      req.on('close', () => {
        clearInterval(interval);
        logger.debug("[test] Client disconnected from stream");
      });
    });

    server = app.listen(PORT, () => {
      logger.success(`\n🚀 TEST MODE: http://localhost:${PORT}\n`);
      logger.info("Press Ctrl+C to stop");
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Cleanup on server close
    server.on('close', () => {
      clearInterval(syncInterval);
    });
  } catch (err) {
    logger.error(`[test] Failed to start: ${err.message}`);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Shutting down test server...");

  try {
    game.cleanup();
  } catch (err) {
    logger.error(`[test] Error cleaning up game: ${err.message}`);
  }

  try {
    await disconnectRedis();
    logger.info("[test] Redis disconnected");
  } catch (err) {
    logger.error(`[test] Error disconnecting Redis: ${err.message}`);
  }

  if (server) {
    server.close(() => {
      logger.info("[test] Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn("[test] Forcing exit after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

start().catch((err) => {
  logger.error(`[test] Fatal error: ${err.message}`);
  process.exit(1);
});
