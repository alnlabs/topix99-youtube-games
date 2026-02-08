const express = require('express');
const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const { redisClient, connectRedis, disconnectRedis } = require('./utils/redis');
const game = require('./games/luckywheel/index');
const { logger } = require('./utils/logger');
const C = require('./games/luckywheel/constants');
const { drawRoundedRect, drawRect, drawCircle, drawTriangle, drawProgressBar, drawSector } = require('./utils/shapes');
const { calculateFontSizeForHeight } = require('./utils/font-helper');

// Set test mode environment variable to ensure test Redis keys are used
process.env.TEST_MODE = "true";

const app = express();
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
const PORT = 5001;
let server = null;

// --- ASSETS ---
try {
  registerFont(path.join(__dirname, 'assets/fonts/MouldyCheese-Regular.ttf'), { family: 'MouldyCheese' });
  registerFont(path.join(__dirname, 'assets/fonts/Orbitron-Bold.ttf'), { family: 'Orbitron' });
  registerFont(path.join(__dirname, 'assets/fonts/BebasNeue-Regular.ttf'), { family: 'Bebas' });
  registerFont(path.join(__dirname, 'assets/fonts/LeagueSpartan-Bold.ttf'), { family: 'League' });
} catch (e) {}

const WIDTH = 1920;
const HEIGHT = 1080;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

let visualWheelRotation = 0;
let lockedWheelRotation = null; // Locked position when wheel stops - prevents state updates from moving it
let lastRotTime = Date.now();
let logoImage = null;
let currentFPS = 30;
let lastFrameTime = Date.now();

// Leaderboard (synced from Redis)
let localLeaderboard = [];

// --- RENDER FUNCTIONS (Synced with live/index.js) ---

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, '#0f2027');
  grad.addColorStop(0.5, '#203a43');
  grad.addColorStop(1, '#2c5364');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawWinnerUI(ctx, cx, cy, r, s) {
  if (!s.currentNumber) return;
  const now = Date.now();
  const pulse = Math.sin(now / 150) * 15;
  const rotation = now / 1000;
  const glow = 20 + Math.sin(now / 300) * 20;

  // Get winner username from celebration or winners array
  const winnerUsername = s.celebration?.username || (s.winners && s.winners.length > 0 ? s.winners[0].username : null);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.save();
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.3;
  // Draw celebration rays (triangles) - MODIFY: Change "#FFD700" (gold) to change ray color
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    drawTriangle(ctx, 0, 0, -80, r + 500, 80, r + 500, "#FFD700");
  }
  ctx.restore();

  // Set shadow for celebration box
  ctx.shadowBlur = 15;
  ctx.shadowColor = "black";
  // Draw celebration box - MODIFY: Change "#FF3B30" (red) and dimensions to customize celebration appearance
  // Make box taller if we have a username to display
  const boxHeight = winnerUsername ? 120 : 80;
  drawRoundedRect(ctx, -225, -r - 110 + pulse / 2, 450, boxHeight, 15, "#FF3B30");
  // Reset shadow
  ctx.shadowBlur = 0;

  ctx.fillStyle = "white";
  ctx.font = "60px 'MouldyCheese'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LUCKY WINNER", 0, -r - 110 + pulse / 2 + (winnerUsername ? 30 : 40));

  // Display winner username if available
  if (winnerUsername) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 45px 'MouldyCheese'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Truncate long usernames
    // Move username down slightly (changed from 80 to 90)
    const displayName = winnerUsername.length > 20 ? winnerUsername.substring(0, 17) + "..." : winnerUsername;
    ctx.fillText(displayName, 0, -r - 110 + pulse / 2 + 90);
  }

  // Draw winning number with high contrast - use white with black outline for visibility
  ctx.font = `bold ${200 + pulse}px 'MouldyCheese'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Draw black outline/stroke for contrast
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 8;
  ctx.shadowBlur = 0; // Disable shadow for stroke
  ctx.strokeText(String(s.currentNumber), 0, 70);

  // Draw white fill for high contrast against dark background
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowBlur = glow;
  ctx.shadowColor = "#FFD700";
  ctx.fillText(String(s.currentNumber), 0, 70);
  ctx.restore();
}

function drawNormalAnswer(ctx, cx, cy, r, s) {
  // Early return if no winning number to display
  if (!s.currentNumber) return;

  // Save current canvas state (transformations, styles, etc.) so we can restore later
  ctx.save();
  // Move coordinate system origin to wheel center (cx, cy) - makes positioning easier
  ctx.translate(cx, cy);

  // ===== NUMBER CONTAINER CALCULATIONS =====
  // Convert winning number to string for display
  const numberText = String(s.currentNumber);

  // Calculate font size to achieve target text height - MODIFY: Change C.NUMBER_TEXT_HEIGHT in constants.js
  const fontSize = calculateFontSizeForHeight(ctx, numberText, "MouldyCheese", C.NUMBER_TEXT_HEIGHT);

  // Set font for the number - font size is calculated to match target height
  ctx.font = `bold ${fontSize}px 'MouldyCheese'`;

  // Measure the text to get actual rendered dimensions
  const textMetrics = ctx.measureText(numberText);
  // Get actual width of rendered text (varies by number - "1" is narrower than "88")
  const textWidth = textMetrics.width;

  // Get actual rendered height of text (should be close to C.NUMBER_TEXT_HEIGHT)
  const actualTextHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  // Padding around the number inside the container
  // MODIFY: Change C.NUMBER_PADDING in constants.js
  const padding = C.NUMBER_PADDING;

  // Maximum allowed container width to prevent it from getting too large
  // MODIFY: Change C.NUMBER_MAX_WIDTH in constants.js
  const maxWidth = C.NUMBER_MAX_WIDTH;

  // Calculate container width: text width + padding on both sides, but cap at maxWidth
  const bgWidth = Math.min(textWidth + padding * 2, maxWidth);
  // Calculate container height: actual text height + padding on top and bottom
  const bgHeight = 80; //actualTextHeight + padding * 2;

  // ===== POSITIONING =====
  // Number container centered at wheel center (y = 0 is center since we're translated to cx, cy)
  // MODIFY: Change 0 to move number up (negative) or down (positive)
  const numberBoxY = 0;

  // ===== TITLE CONTAINER SECTION =====
  // Title container height - MODIFY: Change C.TITLE_HEIGHT in constants.js
  const titleHeight = C.TITLE_HEIGHT;
  // Gap between title and number containers - MODIFY: Change C.GAP_BETWEEN_TITLE_AND_NUMBER in constants.js
  const gap = C.GAP_BETWEEN_TITLE_AND_NUMBER;
  // Calculate title position: above number container
  const titleBoxY = numberBoxY - bgHeight / 2 - gap - titleHeight;

  // Draw title container background - MODIFY: Change C.TITLE_X, C.TITLE_WIDTH, C.TITLE_HEIGHT, C.TITLE_CORNER_RADIUS, C.TITLE_BG_COLOR in constants.js
  drawRoundedRect(ctx, C.TITLE_X, titleBoxY, C.TITLE_WIDTH, titleHeight, C.TITLE_CORNER_RADIUS, C.TITLE_BG_COLOR);

  // ===== TITLE TEXT SECTION =====
  // Set text color - MODIFY: Change C.TITLE_TEXT_COLOR in constants.js
  ctx.fillStyle = C.TITLE_TEXT_COLOR;
  // Set font - MODIFY: Change C.TITLE_FONT_SIZE in constants.js
  ctx.font = `${C.TITLE_FONT_SIZE}px 'MouldyCheese'`;
  // Align text horizontally to center
  ctx.textAlign = "center";
  // Align text vertically to middle (baseline)
  ctx.textBaseline = "middle";
  // Draw the title text - MODIFY: Change C.TITLE_TEXT in constants.js
  ctx.fillText(C.TITLE_TEXT, 0, titleBoxY + titleHeight / 2);

  // ===== NUMBER CONTAINER (OUTER BORDER - GOLD) =====
  // Draw outer border: positioned outside the inner container
  // MODIFY: Change C.NUMBER_BORDER_THICKNESS and C.NUMBER_OUTER_CORNER_RADIUS in constants.js
  const borderOffset = C.NUMBER_BORDER_THICKNESS;
  drawRoundedRect(ctx, -bgWidth / 2 - borderOffset, numberBoxY - bgHeight / 2 - borderOffset,
                  bgWidth + borderOffset * 2, bgHeight + borderOffset * 2, C.NUMBER_OUTER_CORNER_RADIUS, C.NUMBER_BORDER_COLOR);

  // ===== NUMBER CONTAINER (INNER BACKGROUND - BLACK) =====
  // Draw inner background: exact size of container (no border offset)
  // MODIFY: Change C.NUMBER_INNER_CORNER_RADIUS and C.NUMBER_BG_COLOR in constants.js
  drawRoundedRect(ctx, -bgWidth / 2, numberBoxY - bgHeight / 2, bgWidth, bgHeight, C.NUMBER_INNER_CORNER_RADIUS, C.NUMBER_BG_COLOR);

  // ===== NUMBER TEXT =====
  // Set shadow blur amount - MODIFY: Change C.NUMBER_SHADOW_BLUR in constants.js
  ctx.shadowBlur = C.NUMBER_SHADOW_BLUR;
  // Set shadow color - MODIFY: Change C.NUMBER_SHADOW_COLOR in constants.js
  ctx.shadowColor = C.NUMBER_SHADOW_COLOR;
  // Set shadow horizontal offset (0 = no horizontal offset)
  ctx.shadowOffsetX = 0;
  // Set shadow vertical offset (0 = no vertical offset)
  ctx.shadowOffsetY = 0;
  // Set text fill color - MODIFY: Change C.NUMBER_TEXT_COLOR in constants.js
  ctx.fillStyle = C.NUMBER_TEXT_COLOR;
  // Set vertical text alignment to middle (centers text vertically)
  ctx.textBaseline = "middle";
  // Draw the number text
  ctx.fillText(numberText, 0, numberBoxY);

  // Reset shadow to 0 so it doesn't affect other drawings
  ctx.shadowBlur = 0;

  // Restore canvas state (undoes translate and any other transformations)
  ctx.restore();
}

function drawWheelAndUI(ctx, s) {
  const cx = 520, cy = 520, r = 290;
  const values = s.wheelValues && s.wheelValues.length > 0 ? s.wheelValues : [1,2,3,4,5,6,7,8,9,10];
  const slices = values.length;

  // Draw game title on the wheel (centered above wheel)
  ctx.save();
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 50px 'MouldyCheese'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText("Lucky Wheel Guessing Game", cx, cy - r - 60);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  // Handle wheel rotation based on game status
  if (s.status === "spinning") {
    // During spinning, animate towards target
    // Clear any locked position when spinning starts
    lockedWheelRotation = null;
    const target = s.targetRotation || 0;
    visualWheelRotation += (target - visualWheelRotation) * 0.1;
  } else if (s.status === "finished" || s.status === "winner" || s.status === "cooldown") {
    // After spinning stops, LOCK the wheel position - prevent state updates from moving it
    // IMPORTANT: Once locked, use the locked position instead of state.targetRotation
    if (lockedWheelRotation === null) {
      // First time reaching finished state - lock the current target rotation
      if (s.targetRotation !== undefined && s.targetRotation !== null) {
        lockedWheelRotation = s.targetRotation;
        visualWheelRotation = lockedWheelRotation;
      }
    } else {
      // Already locked - use locked position, ignore state updates
      visualWheelRotation = lockedWheelRotation;
    }
  } else {
    // Waiting state - clear lock and allow normal rotation
    lockedWheelRotation = null;
    const now = Date.now();
    const dt = Math.min(now - lastRotTime, 100);
    lastRotTime = now;
    visualWheelRotation += 0.00015 * dt;
  }

  // Normalize rotation to [0, 2PI] range for rendering only
  // This doesn't affect the actual visualWheelRotation value, just how we render it
  let renderRotation = visualWheelRotation % (Math.PI * 2);
  if (renderRotation < 0) renderRotation += Math.PI * 2;

  // Draw wheel at fixed size - never zoom or scale
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(renderRotation - Math.PI / 2);

  for (let i = 0; i < slices; i++) {
    const angle = (i * 2 * Math.PI) / slices;
    // Draw wheel slice - MODIFY: Change colors "#FFD700" (gold) and "#1A1A1A" (dark) to change slice colors
    drawSector(ctx, 0, 0, r, angle, angle + (2 * Math.PI) / slices, i % 2 ? "#FFD700" : "#1A1A1A");

    // Draw numbers with proper positioning to stay within bounds
    ctx.save();
    ctx.rotate(angle + Math.PI / slices);
    ctx.fillStyle = i % 2 ? "#000" : "#FFF";
    ctx.font = "bold 34px 'MouldyCheese'";
    ctx.textAlign = "right";
    // Position numbers at safe distance from edge (r - 50) to prevent cropping
    // Keep Y offset small (12) to stay centered in slice
    const textX = Math.max(r - 50, r * 0.65); // Ensure at least 65% of radius, max r-50
    ctx.fillText(String(values[i]), textX, 12);
    ctx.restore();
  }
  ctx.restore();

  // Draw pointer triangle - MODIFY: Change "#FF3B30" (red) to change pointer color, adjust coordinates to change position/size
  drawTriangle(ctx, cx, cy - r + 5, cx - 30, cy - r - 45, cx + 30, cy - r - 45, "#FF3B30");

  // Progress Bar
  if (s.status === "waiting" || s.status === "cooldown") {
    const barY = HEIGHT - 100;
    const remainingMs = Math.max(0, (s.timerEnd || 0) - Date.now());
    const total = s.status === "waiting" ? 10000 : 5000;
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    ctx.fillStyle = "white";
    ctx.font = "45px 'MouldyCheese'";
    ctx.textAlign = "center";

    // Show countdown with placeholder replacement
    // MODIFY: Change C.READY_TO_SPIN_TEXT, C.NEXT_ROUND_STARTING_TEXT, and C.TIME_UNIT_SUFFIX in constants.js
    // Available placeholders: {seconds}, {countdown}, {unit}
    let statusText = s.status === "waiting" ? C.READY_TO_SPIN_TEXT : C.NEXT_ROUND_STARTING_TEXT;
    // Replace placeholders with actual values
    statusText = statusText.replace(/{seconds}/g, remainingSeconds.toString());
    statusText = statusText.replace(/{countdown}/g, remainingSeconds.toString());
    statusText = statusText.replace(/{unit}/g, C.TIME_UNIT_SUFFIX);
    ctx.fillText(statusText, cx, barY - 60);

    // Draw progress bar - MODIFY: Change colors and dimensions to customize progress bar appearance
    const progress = remainingMs / total;
    drawProgressBar(ctx, cx, barY, 500, 20, progress, "rgba(0,0,0,0.5)", "#FFD700");
  }

  // Show answer after spin stops
  // Only show celebration if there's a winner, otherwise show normal answer
  // IMPORTANT: Only show answer UI, never zoom or highlight the wheel itself
  if (s.status === "winner" || s.status === "cooldown") {
    const hasWinner = s.winners && s.winners.length > 0;
    const celebrationActive = s.celebration && s.celebration.active;

    if (hasWinner && celebrationActive) {
      // Show celebration for winners (above wheel, doesn't affect wheel size)
      drawWinnerUI(ctx, cx, cy, r, s);
    } else {
      // Show normal answer display (above wheel, doesn't affect wheel size)
      drawNormalAnswer(ctx, cx, cy, r, s);
    }
  }
}

function drawLeaderboard(ctx, players) {
  const lbWidth = 460, lbX = WIDTH - lbWidth - 100, lbY = 180;
  // Draw leaderboard background - MODIFY: Change colors and dimensions to customize leaderboard appearance
  drawRoundedRect(ctx, lbX, lbY, lbWidth, 650, 20, "rgba(0, 0, 0, 0.6)");
  ctx.fillStyle = "#FFD700";
  ctx.font = "40px 'MouldyCheese'";
  ctx.textAlign = "left";
  ctx.fillText("LEADERBOARD", lbX + 40, lbY + 70);
  players.slice(0, 10).forEach((player, i) => {
    const rowY = lbY + 160 + i * 45;
    ctx.font = "24px 'MouldyCheese'";
    ctx.fillStyle = i === 0 ? "#FFD700" : "white";
    ctx.fillText(`${i === 0 ? "👑 " : i + 1 + ". "}${player.username}`, lbX + 40, rowY);
    ctx.textAlign = "right";
    ctx.fillText(String(player.wins || 0), lbX + lbWidth - 40, rowY);
    ctx.textAlign = "left";
  });
}

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

          drawBackground(ctx);
          drawWheelAndUI(ctx, s);
          drawLeaderboard(ctx, localLeaderboard);

          // Title & Logo (Vertically aligned)
          const rightAnchor = WIDTH - 560;
          const logoY = 40;
          const logoHeight = 120;
          const logoCenterY = logoY + logoHeight / 2; // Center of logo at y=100
          if (logoImage) {
            ctx.drawImage(logoImage, rightAnchor, logoY, 120, logoHeight);
          }
          ctx.fillStyle = "#FFD700";
          ctx.font = "bold 70px 'MouldyCheese'";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle"; // Center text vertically on the y coordinate
          ctx.fillText("TOPIX99", rightAnchor + 140, logoCenterY);

          // FPS Counter
          const now = Date.now();
          currentFPS = currentFPS * 0.9 + (1000 / (now - lastFrameTime)) * 0.1;
          lastFrameTime = now;

          // FPS counter container dimensions
          const fpsBoxX = WIDTH - 250;
          const fpsBoxY = HEIGHT - 80;
          const fpsBoxWidth = 220;
          const fpsBoxHeight = 60;

          // Draw FPS counter background - MODIFY: Change color and dimensions to customize FPS display
          drawRect(ctx, fpsBoxX, fpsBoxY, fpsBoxWidth, fpsBoxHeight, "rgba(0, 0, 0, 0.8)");

          // Set text style
          ctx.fillStyle = currentFPS < 25 ? "#FF3B30" : "#4CD964";
          ctx.font = "bold 24px 'MouldyCheese'";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Center text in container
          const fpsTextX = fpsBoxX + fpsBoxWidth / 2;
          const fpsTextY = fpsBoxY + fpsBoxHeight / 2;
          ctx.fillText(`${Math.round(currentFPS)} FPS`, fpsTextX, fpsTextY);

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
