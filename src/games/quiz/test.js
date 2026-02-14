const express = require('express');
const { createCanvas } = require('canvas');
const path = require('path');
const { connectRedis, disconnectRedis } = require('../../services');
const GameClass = require('./game');
const game = new GameClass();
const { logger } = require('../../services');
const {
  WIDTH,
  HEIGHT,
  FPS,
  drawQuizUI,
} = require('./renderer');

// Set test mode environment variable
process.env.TEST_MODE = "true";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 5002;
let server = null;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Sync game state and leaderboard from Redis
const syncData = async () => {
  try {
    await game.load();
  } catch (e) {
    logger.error(`[quiz-test] Sync error: ${e.message}`);
  }
};

async function start() {
  try {
    await connectRedis();
    logger.info("Redis connected for quiz test mode");

    // Clean test database on startup (optional)
    if (process.env.CLEAN_TEST_DB === "true") {
      logger.info("Cleaning quiz test database...");
      const state = require('./state');
      await state.cleanDatabase();
      logger.success("Quiz test database cleaned");
    }

    await game.startNewRound();
    logger.info("Quiz game started");

    // Initial sync
    await syncData();
    // Sync every 500ms
    const syncInterval = setInterval(syncData, 500);

    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Quiz Game Test</title>
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
              button {
                padding: 10px 20px;
                font-size: 16px;
                background: #4A9EFF;
                color: #000;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
              }
              button:hover {
                background: #6BB0FF;
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
              <img src="/stream" alt="Quiz Game Stream">
              <div class="info">Test Mode - Quiz Game running at http://localhost:${PORT}</div>
              <div class="input-section">
                <h3 style="color: #fff; margin-top: 0;">Submit Answer</h3>
                <div class="input-group">
                  <input type="text" id="username" placeholder="Your name" value="TestUser">
                  <input type="text" id="answer" placeholder="Answer (A, B, C, D or 1, 2, 3, 4)">
                  <button onclick="submitAnswer()">Submit</button>
                </div>
                <div class="help-text">
                  <strong>How to play:</strong><br>
                  • Type A, B, C, D or 1, 2, 3, 4 to answer<br>
                  • First answer per question counts<br>
                  • Fastest correct answer wins points!
                </div>
                <div class="status" id="status"></div>
              </div>
            </div>
            <script>
              function submitAnswer() {
                const username = document.getElementById('username').value;
                const answer = document.getElementById('answer').value;
                const status = document.getElementById('status');

                if (!username || !answer) {
                  status.textContent = 'Please enter both name and answer';
                  status.style.color = '#FF6B6B';
                  return;
                }

                status.textContent = 'Submitting...';
                status.style.color = '#4A9EFF';

                fetch('/api/answer', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, answer })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    status.textContent = '✓ Answer submitted!';
                    status.style.color = '#4CD964';
                    document.getElementById('answer').value = '';
                  } else {
                    status.textContent = '✗ ' + (data.error || 'Failed to submit');
                    status.style.color = '#FF6B6B';
                  }
                })
                .catch(err => {
                  status.textContent = '✗ Error: ' + err.message;
                  status.style.color = '#FF6B6B';
                });
              }

              // Allow Enter key to submit
              document.getElementById('answer').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitAnswer();
              });
            </script>
          </body>
        </html>
      `);
    });

    app.post('/api/answer', async (req, res) => {
      try {
        const { username, answer } = req.body;
        if (!username || !answer) {
          return res.status(400).json({ error: 'Username and answer required' });
        }

        const userId = `user_${username.toLowerCase().trim()}`;
        await game.processChatMessage(userId, username, answer);

        res.json({ success: true, message: 'Answer submitted successfully' });
      } catch (err) {
        logger.error(`[quiz-test] Answer API error: ${err.message}`);
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/stream', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=frame' });

      const interval = setInterval(() => {
        try {
          const gameState = game.getStateSync();
          const leaderboard = game.getLeaderboardSync();

          drawQuizUI(ctx, gameState, leaderboard);

          const buf = canvas.toBuffer('image/jpeg', { quality: 0.8 });
          res.write('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' + buf.length + '\r\n\r\n');
          res.write(buf, 'binary');
          res.write('\r\n');
        } catch (err) {
          logger.error(`[quiz-test] Render error: ${err.message}`);
          clearInterval(interval);
          res.end();
        }
      }, 1000 / FPS);

      req.on('close', () => {
        clearInterval(interval);
        logger.debug("[quiz-test] Client disconnected from stream");
      });
    });

    server = app.listen(PORT, () => {
      logger.success(`\n🚀 QUIZ TEST MODE: http://localhost:${PORT}\n`);
      logger.info("Press Ctrl+C to stop");
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    server.on('close', () => {
      clearInterval(syncInterval);
    });
  } catch (err) {
    logger.error(`[quiz-test] Failed to start: ${err.message}`);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Shutting down quiz test server...");

  try {
    game.cleanup();
  } catch (err) {
    logger.error(`[quiz-test] Error cleaning up game: ${err.message}`);
  }

  try {
    await disconnectRedis();
    logger.info("[quiz-test] Redis disconnected");
  } catch (err) {
    logger.error(`[quiz-test] Error disconnecting Redis: ${err.message}`);
  }

  if (server) {
    server.close(() => {
      logger.info("[quiz-test] Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn("[quiz-test] Forcing exit after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

start().catch((err) => {
  logger.error(`[quiz-test] Fatal error: ${err.message}`);
  process.exit(1);
});
