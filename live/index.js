const { spawn } = require("child_process");
const { createCanvas, registerFont, loadImage } = require("canvas");
const path = require("path");

// --- 1. ASSET REGISTRATION ---
try {
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

  ctx.save();
  ctx.translate(cx, cy);

  ctx.save();
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-80, r + 500);
    ctx.lineTo(80, r + 500);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#FF3B30";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "black";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(-225, -r - 110 + pulse / 2, 450, 80, 15);
    ctx.fill();
  }

  ctx.fillStyle = "white";
  ctx.font = "60px 'Bebas'";
  ctx.textAlign = "center";
  ctx.fillText("LUCKY WINNER", 0, -r - 50 + pulse / 2);

  ctx.font = `bold ${200 + pulse}px 'Orbitron'`;
  ctx.shadowBlur = glow;
  ctx.shadowColor = "#FFD700";
  ctx.fillText(String(s.currentNumber), 0, 70);
  ctx.restore();
}

function drawWheelAndUI(ctx, s) {
  const cx = 520;
  const cy = 520;
  const r = 290;

  // Fallback if wheelValues hasn't loaded yet
  const values =
    s && s.wheelValues && s.wheelValues.length > 0
      ? s.wheelValues
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const slices = values.length;

  // UPDATED: Use "winner" instead of "finished"
  if (s.status === "spinning") {
    visualWheelRotation +=
      ((s.targetRotation || 0) - visualWheelRotation) * 0.05;
  } else if (s.status === "winner" || s.status === "cooldown") {
    visualWheelRotation = s.targetRotation || 0;
  } else {
    visualWheelRotation += 0.005;
  }

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

  ctx.fillStyle = "#FF3B30";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 5);
  ctx.lineTo(cx - 30, cy - r - 45);
  ctx.lineTo(cx + 30, cy - r - 45);
  ctx.fill();

  if (s.status === "waiting" || s.status === "cooldown") {
    const barY = HEIGHT - 100;
    const remainingMs = Math.max(0, (s.timerEnd || 0) - Date.now());
    ctx.fillStyle = "white";
    ctx.font = "45px 'Bebas'";
    ctx.textAlign = "center";
    ctx.fillText(
      s.status === "waiting" ? "READY TO SPIN..." : "NEXT ROUND STARTING",
      cx,
      barY - 60
    );
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cx - 250, barY, 500, 20);
    ctx.fillStyle = "#FFD700";
    const total = s.status === "waiting" ? 15000 : 5000;
    const barWidth = 500 * (remainingMs / total);
    ctx.fillRect(cx - 250, barY, Math.min(500, Math.max(0, barWidth)), 20);
  }

  // UPDATED: Check for "winner" status
  if (s.status === "winner" || s.status === "cooldown") {
    drawWinnerUI(ctx, cx, cy, r, s);
  }
}

function drawLeaderboard(ctx, players) {
  const lbWidth = 460;
  const lbX = WIDTH - lbWidth - 100;
  const lbY = 180;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(lbX, lbY, lbWidth, 650, 20);
    ctx.fill();
  }

  ctx.fillStyle = "#FFD700";
  ctx.font = "40px 'Bebas'";
  ctx.textAlign = "left";
  ctx.fillText("LEADERBOARD", lbX + 40, lbY + 70);

  players.slice(0, 10).forEach((player, i) => {
    const rowY = lbY + 160 + i * 45;
    ctx.font = "24px 'Orbitron'";
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(WIDTH - 250, HEIGHT - 80, 220, 60);
  ctx.fillStyle = currentFPS < 25 ? "#FF3B30" : "#4CD964";
  ctx.font = "bold 24px 'Orbitron'";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(currentFPS)} FPS`, WIDTH - 50, HEIGHT - 45);
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
      if (lb) {
        localLeaderboard = lb.map((p) => ({
          username: p.username,
          wins: p.score,
        }));
      }
    } catch (e) {
      console.error("Sync error:", e.message);
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
    "ultrafast",
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

  ffmpegInstance.on("close", () => clearInterval(syncInterval));

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

    // 1. Draw Logo
    if (logoImage) {
      ctx.drawImage(logoImage, rightAnchor, 40, 120, 120);
    }

    // 2. Draw Title (Moved next to Logo)
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 70px 'League'";
    ctx.textAlign = "left";
    // Positioned to the right of the logo
    ctx.fillText("TOPIX99 LIVE", rightAnchor + 140, 125);

    drawFPSCounter(ctx);

    if (ffmpegInstance.stdin.writable) {
      ffmpegInstance.stdin.write(canvas.toBuffer("raw"));
    }

    const nextFrameIn = Math.max(1, 1000 / FPS - (Date.now() - startTime));
    setTimeout(render, nextFrameIn);
  }

  render();
}

module.exports = { startLive };
