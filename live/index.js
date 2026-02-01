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
let logoImage = null; // Stored globally to avoid reloading every frame

/* ---------------- BACKGROUND LOGIC ---------------- */
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

/* ---------------- CREATIVE WINNER UI ---------------- */
function drawWinnerUI(ctx, cx, cy, r, s) {
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
  const labelW = 450;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(-labelW / 2, -r - 110 + pulse / 2, labelW, 80, 15);
    ctx.fill();
  }

  ctx.fillStyle = "white";
  ctx.font = "60px 'Bebas'";
  ctx.textAlign = "center";
  ctx.fillText("LUCKY WINNER", 0, -r - 50 + pulse / 2);

  ctx.fillStyle = "white";
  ctx.font = `bold ${200 + pulse}px 'Orbitron'`;
  ctx.shadowBlur = glow;
  ctx.shadowColor = "#FFD700";
  ctx.fillText(s.currentNumber.toString(), 0, 70);
  ctx.restore();
}

/* ---------------- MAIN UI FUNCTION ---------------- */
function drawWheelAndUI(ctx, s) {
  const cx = 520;
  const cy = 520;
  const r = 290;
  const values = s.wheelValues || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const slices = values.length;

  if (s.status === "spinning") {
    visualWheelRotation += (s.targetRotation - visualWheelRotation) * 0.05;
  } else if (s.status === "winner" || s.status === "cooldown") {
    visualWheelRotation = s.targetRotation;
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
    ctx.fillText(values[i].toString(), r - 40, 12);
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
    const remainingMs = Math.max(0, s.timerEnd - Date.now());
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
    ctx.fillRect(
      cx - 250,
      barY,
      500 * (remainingMs / (s.status === "waiting" ? 15000 : 5000)),
      20
    );
  }

  if (s.status === "winner" || s.status === "cooldown") {
    drawWinnerUI(ctx, cx, cy, r, s);
  }
}

/* ---------------- LEADERBOARD ---------------- */
async function drawLeaderboard(ctx, game) {
  const lbWidth = 460;
  const lbX = WIDTH - lbWidth - 100;
  const lbY = 180;
  let topPlayers = [];

  try {
    topPlayers = (await game.getLeaderboard?.()) || [];
  } catch (e) {
    console.log("LB Error:", e.message);
  }

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

  topPlayers.slice(0, 10).forEach((player, i) => {
    const rowY = lbY + 160 + i * 45;
    ctx.font = "24px 'Orbitron'";
    ctx.fillStyle = i === 0 ? "#FFD700" : "white";
    ctx.textAlign = "left";
    ctx.fillText(
      `${i === 0 ? "👑 " : i + 1 + ". "}${player.username.substring(0, 14)}`,
      lbX + 40,
      rowY
    );
    ctx.textAlign = "right";
    ctx.fillText(player.wins.toString(), lbX + lbWidth - 40, rowY);
  });
}

/* ---------------- STREAM ENGINE ---------------- */
async function startLive(rtmpUrl, game) {
  // 1. ASSET LOADING (LOGO)
  try {
    logoImage = await loadImage(
      path.join(__dirname, "../assets/images/logo.png")
    );
    console.log("✅ Logo loaded");
  } catch (e) {
    console.warn("⚠️ Logo not found at assets/images/logo.png");
  }

  // 2. CLEANUP OLD PROCESS
  if (ffmpegInstance) {
    console.log("♻️ Killing old FFmpeg process...");
    ffmpegInstance.stdin.destroy();
    ffmpegInstance.kill("SIGKILL");
    ffmpegInstance = null;
  }

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  let isRendering = false;

  function spawnFFmpeg() {
    console.log("🎬 Connecting to Stream...");
    const ff = spawn("ffmpeg", [
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
      (FPS * 2).toString(),
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

    ff.stdin.on("error", (e) => {
      if (["EPIPE", "ECONNRESET", "EINVAL"].includes(e.code)) {
        console.log("⚠️ Pipe closed gracefully.");
      }
    });

    ff.on("close", (code) => {
      console.log(`FFmpeg exited: ${code}`);
      ffmpegInstance = null;
    });

    return ff;
  }

  ffmpegInstance = spawnFFmpeg();

  async function render() {
    if (!ffmpegInstance || isRendering) return;
    isRendering = true;
    const startTime = Date.now();

    try {
      const s = await game.getState();
      drawBackground(ctx);
      drawWheelAndUI(ctx, s);
      await drawLeaderboard(ctx, game);

      // --- LOGO DRAWING ---
      if (logoImage) {
        // Draw logo in the top-right corner
        const logoSize = 180;
        const padding = 50;
        ctx.drawImage(
          logoImage,
          WIDTH - logoSize - padding,
          padding,
          logoSize,
          logoSize
        );
      }

      // Branding
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 80px 'League'";
      ctx.textAlign = "left";
      ctx.fillText("TOPIX99 LIVE", 120, 160);

      const buf = canvas.toBuffer("raw");

      if (ffmpegInstance && ffmpegInstance.stdin.writable) {
        const canWrite = ffmpegInstance.stdin.write(buf);
        if (!canWrite) {
          ffmpegInstance.stdin.once("drain", () => {
            isRendering = false;
            scheduleNextFrame(startTime);
          });
          return;
        }
      }
    } catch (e) {
      console.log("Frame skip:", e.message);
    }

    isRendering = false;
    scheduleNextFrame(startTime);
  }

  function scheduleNextFrame(startTime) {
    const elapsed = Date.now() - startTime;
    setTimeout(render, Math.max(1, 1000 / FPS - elapsed));
  }

  render();
}

module.exports = { startLive };
