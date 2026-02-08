const { createCanvas, registerFont, loadImage } = require("canvas");
const path = require("path");

// Mocking required assets path to work from root
const ASSETS_DIR = path.join(__dirname, "assets");

// --- REPLICATING live/index.js CONSTANTS & SETUP ---
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS_TARGET = 30;

// Register fonts (paths adjusted for root execution)
try {
  registerFont(path.join(ASSETS_DIR, "fonts/Orbitron-Bold.ttf"), { family: "Orbitron" });
  registerFont(path.join(ASSETS_DIR, "fonts/BebasNeue-Regular.ttf"), { family: "Bebas" });
  registerFont(path.join(ASSETS_DIR, "fonts/LeagueSpartan-Bold.ttf"), { family: "League" });
  console.log("✅ Fonts loaded");
} catch (e) {
  console.error("❌ Font loading failed:", e.message);
}

// Mock State
const localGameState = {
  status: "spinning",
  wheelValues: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  targetRotation: 5.5,
  currentNumber: 50,
  timerEnd: Date.now() + 10000
};

const localLeaderboard = Array.from({ length: 10 }, (_, i) => ({
  username: `Player_${i}`,
  wins: 100 - i * 5
}));

const palettes = [["#0f2027", "#203a43", "#2c5364"]];
const currentPalette = palettes[0];

// --- DRAWING FUNCTIONS (Copied/Adapted from live/index.js) ---

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  currentPalette.forEach((c, i) =>
    grad.addColorStop(i / (currentPalette.length - 1), c)
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawWheelAndUI(ctx, s) {
  const cx = 520;
  const cy = 520;
  const r = 290;
  const values = s.wheelValues;
  const slices = values.length;
  let visualWheelRotation = s.targetRotation || 0; // Simplified for benchmark

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(visualWheelRotation - Math.PI / 2);
  for (let i = 0; i < slices; i++) {
    const angle = (i * 2 * Math.PI) / slices;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, angle, angle + (2 * Math.PI) / slices);
    ctx.fillStyle = i % 2 ? "#FFD700" : "#1A1A1A";
    ctx.fill();

    ctx.save();
    ctx.rotate(angle + Math.PI / slices);
    ctx.fillStyle = i % 2 ? "#000" : "#FFF";
    ctx.font = "bold 34px 'Orbitron'";
    ctx.textAlign = "right";
    ctx.fillText(String(values[i]), r - 40, 12);
    ctx.restore();
  }
  ctx.restore();

  // Pointer
  ctx.fillStyle = "#FF3B30";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 5);
  ctx.lineTo(cx - 30, cy - r - 45);
  ctx.lineTo(cx + 30, cy - r - 45);
  ctx.fill();
}

function drawLeaderboard(ctx, players) {
  const lbWidth = 460;
  const lbX = WIDTH - lbWidth - 100;
  const lbY = 180;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  // Check if roundRect exists (node-canvas 2.x doesn't have it generally, 3.x might)
  // implementing basic fallback if not
  if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(lbX, lbY, lbWidth, 650, 20);
      ctx.fill();
  } else {
      ctx.fillRect(lbX, lbY, lbWidth, 650);
  }

  ctx.fillStyle = "#FFD700";
  ctx.font = "40px 'Bebas'";
  ctx.textAlign = "left";
  ctx.fillText("LEADERBOARD", lbX + 40, lbY + 70);

  players.slice(0, 10).forEach((player, i) => {
    const rowY = lbY + 160 + i * 45;
    ctx.font = "24px 'Orbitron'";
    ctx.fillStyle = i === 0 ? "#FFD700" : "white";
    ctx.fillText(`${i + 1}. ${player.username}`, lbX + 40, rowY);
  });
}

// --- BENCHMARK RUNNER ---

async function runBenchmark() {
  console.log("🚀 Starting Benchmark...");
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Load logo mock
  let logoImage = null;
  try {
     logoImage = await loadImage(path.join(ASSETS_DIR, "images/logo.png"));
  } catch(e) { console.log("⚠️ No logo, skipping"); }

  const FRAMES_TO_TEST = 100;
  let totalTime = 0;

  console.log(`Running ${FRAMES_TO_TEST} frames...`);

  const startTotal = process.hrtime.bigint();

  for (let i = 0; i < FRAMES_TO_TEST; i++) {
    const start = process.hrtime.bigint();

    // 1. Draw Background
    drawBackground(ctx);

    // 2. Draw Wheel
    drawWheelAndUI(ctx, localGameState);

    // 3. Draw Leaderboard
    drawLeaderboard(ctx, localLeaderboard);

    // 4. Draw Logo (if exists)
    if (logoImage) {
        ctx.drawImage(logoImage, WIDTH - 560, 40, 120, 120);
    }

    // 5. Heavy Operation: output to buffer (simulating piping to ffmpeg)
    const buffer = canvas.toBuffer("raw");

    const end = process.hrtime.bigint();
    totalTime += Number(end - start) / 1e6; // Convert ns to ms
  }

  const endTotal = process.hrtime.bigint();
  const realDurationSeconds = Number(endTotal - startTotal) / 1e9;

  const avgFrameTime = totalTime / FRAMES_TO_TEST;
  const potentialFPS = 1000 / avgFrameTime;

  // Write results to file
  const fs = require('fs');
  const output = `
📊 Benchmark Results:
- Total Real Time for ${FRAMES_TO_TEST} frames: ${realDurationSeconds.toFixed(2)}s
- Average Frame Rendering Time: ${avgFrameTime.toFixed(2)}ms
- Max Potential FPS: ${potentialFPS.toFixed(2)} FPS
- Target FPS: ${FPS_TARGET}
  `;

  fs.writeFileSync('benchmark_results.txt', output);
  console.log(output);

  if (potentialFPS > FPS_TARGET) {
      fs.appendFileSync('benchmark_results.txt', `\n✅ PASSED: System can comfortably handle ${FPS_TARGET} FPS.`);
  } else {
      fs.appendFileSync('benchmark_results.txt', `\n❌ FAILED: System cannot maintain ${FPS_TARGET} FPS. Optimization needed.`);
  }
}

runBenchmark().catch(err => {
  const fs = require('fs');
  fs.writeFileSync('benchmark_results.txt', `ERROR: ${err.message}\n${err.stack}`);
});
