const { spawn } = require("child_process");
const { createCanvas, registerFont, loadImage } = require("canvas");
const path = require("path");
const C = require("../games/luckywheel/constants");
const { drawRoundedRect, drawRect, drawCircle, drawTriangle, drawProgressBar, drawSector } = require("../utils/shapes");
const { calculateFontSizeForHeight } = require("../utils/font-helper");

// --- 1. ASSET REGISTRATION ---
try {
  registerFont(path.join(__dirname, "../assets/fonts/MouldyCheese-Regular.ttf"), {
    family: "MouldyCheese",
  });
  registerFont(path.join(__dirname, "../assets/fonts/Orbitron-Bold.ttf"), {
    family: "Orbitron",
  });
  registerFont(path.join(__dirname, "../assets/fonts/BebasNeue-Regular.ttf"), {
    family: "Bebas",
  });
  registerFont(path.join(__dirname, "../assets/fonts/LeagueSpartan-Bold.ttf"), {
    family: "League",
  });
  console.log("✅ Fonts loaded successfully");
} catch (e) {
  console.error("❌ Font loading failed:", e.message);
}

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

let visualWheelRotation = 0;
let lockedWheelRotation = null; // Locked position when wheel stops - prevents state updates from moving it
let ffmpegInstance = null;
let logoImage = null;
let lastFrameTime = Date.now();
let currentFPS = 0;

let localGameState = { status: "waiting", wheelValues: [], timerEnd: 0 };
let localLeaderboard = [];

const palettes = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77", "#ffaf7b"],
];
let currentPalette = palettes[0];

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  currentPalette.forEach((c, i) =>
    grad.addColorStop(i / (currentPalette.length - 1), c)
  );
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
  const cx = 520;
  const cy = 520;
  const r = 290;

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

  // Fallback if wheelValues hasn't loaded yet
  const values =
    s && s.wheelValues && s.wheelValues.length > 0
      ? s.wheelValues
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const slices = values.length;

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
    // UPDATED: Time-based rotation calculation
    // Server uses 0.00015 rad/ms. We must match this exactly regardless of FPS.
    // We use a static variable to track the last update time specifically for rotation.
    if (!global.lastRotTime) global.lastRotTime = Date.now();
    const now = Date.now();
    const dt = now - global.lastRotTime;
    global.lastRotTime = now;

    // Protect against huge jumps if tab was backgrounded/lagged significantly
    const safeDt = Math.min(dt, 100);

    visualWheelRotation += 0.00015 * safeDt;
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

  if (s.status === "waiting" || s.status === "cooldown") {
    // Increased spacing from bottom edge for mobile keyboard visibility
    // Changed from HEIGHT - 100 to HEIGHT - 200 to keep status visible when keyboard appears
    const barY = HEIGHT - 200;
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
  const lbWidth = 460;
  const lbX = WIDTH - lbWidth - 100;
  const lbY = 180;

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
    const name = String(player.username || "Anonymous").substring(0, 14);
    ctx.fillText(`${i === 0 ? "👑 " : i + 1 + ". "}${name}`, lbX + 40, rowY);
    ctx.textAlign = "right";
    ctx.fillText(String(player.wins || 0), lbX + lbWidth - 40, rowY);
    ctx.textAlign = "left";
  });
}

function drawFPSCounter(ctx) {
  const now = Date.now();
  currentFPS = currentFPS * 0.9 + (1000 / (now - lastFrameTime)) * 0.1;
  lastFrameTime = now;

  // FPS counter container dimensions
  // Moved higher up to avoid mobile keyboard overlap
  const fpsBoxX = WIDTH - 250;
  const fpsBoxY = HEIGHT - 180; // Changed from HEIGHT - 80 to HEIGHT - 180 for mobile spacing
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

  // --- FPS STATS LOGGING (Optional, controlled by env var) ---
  if (process.env.ENABLE_FPS_STATS === "true") {
    if (!global.fpsStatsFile) {
      const fs = require('fs');
      const path = require('path');
      global.fpsStatsFile = path.resolve(__dirname, '../fps_stats.txt');
      try {
        fs.writeFileSync(global.fpsStatsFile, "Timestamp,FPS\n");
      } catch (err) {
        console.warn("[fps] Failed to create stats file:", err.message);
      }
    }
    if (!global.profileFrameCount) global.profileFrameCount = 0;
    global.profileFrameCount++;
    // Log every 30 frames (1 second at 30fps) instead of every 10
    if (global.profileFrameCount % 30 === 0) {
      const fs = require('fs');
      try {
        fs.appendFileSync(global.fpsStatsFile, `${Date.now()},${currentFPS.toFixed(2)}\n`);
      } catch (err) {
        // Silently fail - don't spam console
      }
    }
  }
  // ------------------------------------------
}

async function startLive(rtmpUrl, game) {
  try {
    logoImage = await loadImage(
      path.join(__dirname, "../assets/images/logo.png")
    );
  } catch (e) {
    console.warn("⚠️ Logo not found");
  }

  const syncData = async () => {
    try {
      await game.load();
      const state = game.getStateSync();
      const lb = game.getLeaderboardSync();

      if (state) localGameState = state;
      if (lb && Array.isArray(lb)) {
        localLeaderboard = lb.map((p) => ({
          username: p.username || "Unknown",
          wins: p.score || 0,
        }));
      }
    } catch (e) {
      // Only log errors occasionally to avoid spam
      if (!global.lastSyncError || Date.now() - global.lastSyncError > 5000) {
        console.error("[live] Sync error:", e.message);
        global.lastSyncError = Date.now();
      }
    }
  };

  await syncData();
  const syncInterval = setInterval(syncData, 500);

  ffmpegInstance = spawn("ffmpeg", [
    "-loglevel",
    "error",
    "-f",
    "rawvideo",
    "-pixel_format",
    "bgra",
    "-video_size",
    `${WIDTH}x${HEIGHT}`,
    "-framerate",
    `${FPS}`,
    "-i",
    "pipe:0",
    "-stream_loop",
    "-1",
    "-i",
    path.join(__dirname, "../assets/sounds/bgm.mp3"),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    "4500k",
    "-maxrate",
    "4500k",
    "-bufsize",
    "9000k",
    "-tune",
    "zerolatency",
    "-g",
    "60",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-pix_fmt",
    "yuv420p",
    "-f",
    "flv",
    rtmpUrl,
  ]);

  ffmpegInstance.on("close", (code) => {
    console.error(`[live] FFmpeg process exited with code ${code}`);
    ffmpegInstance = null; // Clear reference
    clearInterval(syncInterval);
  });

  ffmpegInstance.on("error", (err) => {
    console.error("[live] FFmpeg error:", err.message);
    ffmpegInstance = null; // Clear reference on error
    clearInterval(syncInterval);
  });

  // Handle stdin errors (broken pipe, etc.)
  ffmpegInstance.stdin.on("error", (err) => {
    // EPIPE and ECONNRESET are expected when FFmpeg closes
    if (err.code !== "EPIPE" && err.code !== "ECONNRESET") {
      console.error("[live] FFmpeg stdin error:", err.message);
    }
    ffmpegInstance = null; // Clear reference
    clearInterval(syncInterval);
  });

  // Handle FFmpeg stderr for debugging
  ffmpegInstance.stderr.on("data", (data) => {
    const message = data.toString();
    // Only log errors, not warnings
    if (message.toLowerCase().includes("error")) {
      console.error("[live] FFmpeg:", message.trim());
    }
  });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  function render() {
    if (!ffmpegInstance) return;
    const startTime = Date.now();

    drawBackground(ctx);
    drawWheelAndUI(ctx, localGameState);
    drawLeaderboard(ctx, localLeaderboard);

    // --- UI Group: Title & Logo (Aligned above Leaderboard) ---
    const rightAnchor = WIDTH - 560; // Matches the Leaderboard X position

    // 1. Draw Logo (centered vertically)
    const logoY = 40;
    const logoHeight = 120;
    const logoCenterY = logoY + logoHeight / 2; // Center of logo at y=100
    if (logoImage) {
      ctx.drawImage(logoImage, rightAnchor, logoY, 120, logoHeight);
    }

    // 2. Draw Title (Vertically aligned with logo center)
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 70px 'MouldyCheese'";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle"; // Center text vertically on the y coordinate
    // Positioned to the right of the logo, vertically centered with logo
    ctx.fillText("TOPIX99", rightAnchor + 140, logoCenterY);

    drawFPSCounter(ctx);

    if (ffmpegInstance && ffmpegInstance.stdin && ffmpegInstance.stdin.writable) {
      try {
        ffmpegInstance.stdin.write(canvas.toBuffer("raw"));
      } catch (err) {
        // Handle broken pipe and connection errors gracefully
        if (err.code === "EPIPE" || err.code === "ECONNRESET") {
          console.error("[live] FFmpeg pipe closed, stopping render loop");
          ffmpegInstance = null; // Clear reference to prevent further writes
          clearInterval(syncInterval);
          return;
        }
        // Log other errors but continue rendering
        if (!global.lastFrameError || Date.now() - global.lastFrameError > 5000) {
          console.error("[live] Failed to write frame:", err.message);
          global.lastFrameError = Date.now();
        }
      }
    } else {
      // FFmpeg is not available, stop rendering
      console.error("[live] FFmpeg stdin not available, stopping render loop");
      clearInterval(syncInterval);
      return;
    }

    const nextFrameIn = Math.max(1, 1000 / FPS - (Date.now() - startTime));
    setTimeout(render, nextFrameIn);
  }

  render();
}

module.exports = { startLive };
