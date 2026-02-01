const { spawn } = require("child_process");
const { createCanvas } = require("canvas");

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const PADDING = 100;

let visualWheelRotation = 0;

/* ---------------- BACKGROUNDS ---------------- */
const palettes = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77", "#ffaf7b"],
];

let currentPalette = palettes[0];
function pickNewBackground() {
  currentPalette = palettes[Math.floor(Math.random() * palettes.length)];
}

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  currentPalette.forEach((c, i) =>
    grad.addColorStop(i / (currentPalette.length - 1), c)
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/* ---------------- LEADERBOARD ---------------- */
async function drawLeaderboard(ctx, game) {
  const lbWidth = 460;
  // Push further right and lower down to create a "top-right corner" look
  const lbX = WIDTH - lbWidth - 100;
  const lbY = 180;

  const topPlayers = (await game.getLeaderboard?.()) || [];

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(lbX, lbY, lbWidth, 650, 20); // Taller box
  } else {
    ctx.rect(lbX, lbY, lbWidth, 650);
  }
  ctx.fill();

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "left";
  ctx.fillText("TOP PLAYERS", lbX + 40, lbY + 70);

  ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lbX + 40, lbY + 95);
  ctx.lineTo(lbX + lbWidth - 40, lbY + 95);
  ctx.stroke();

  topPlayers.slice(0, 10).forEach((player, i) => {
    const rowY = lbY + 160 + i * 45; // Tighter row spacing
    ctx.font = i === 0 ? "bold 28px Arial" : "24px Arial";
    ctx.fillStyle = i === 0 ? "#FFD700" : "white";

    ctx.textAlign = "left";
    const prefix = i === 0 ? "👑 " : `${i + 1}. `;
    ctx.fillText(
      `${prefix}${player.username.substring(0, 14)}`,
      lbX + 40,
      rowY
    );

    ctx.textAlign = "right";
    ctx.fillText(player.wins.toString(), lbX + lbWidth - 40, rowY);
  });
}

/* ---------------- WHEEL & PROGRESS BAR ---------------- */
function drawWheelAndUI(ctx, s) {
  const cx = 520;
  const cy = 520;
  const r = 290;

  const values = s.wheelValues || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const slices = values.length;

  // Rotation Logic
  if (s.status === "spinning") {
    const dist = s.targetRotation - visualWheelRotation;
    visualWheelRotation += dist * 0.05;
  } else if (s.status === "winner" || s.status === "cooldown") {
    visualWheelRotation = s.targetRotation;
  } else {
    visualWheelRotation += 0.005;
  }

  // --- DRAW WHEEL ---
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(visualWheelRotation - Math.PI / 2);
  for (let i = 0; i < slices; i++) {
    const angle = (i * 2 * Math.PI) / slices;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, angle, angle + (2 * Math.PI) / slices);
    ctx.fillStyle = i % 2 ? "#FFD700" : "#1A1A1A";
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(angle + Math.PI / slices);
    ctx.fillStyle = i % 2 ? "#000" : "#FFF";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "right";
    ctx.fillText(values[i].toString(), r - 40, 12);
    ctx.restore();
  }
  ctx.restore();

  // --- FLIPPED POINTER (Points Down) ---
  ctx.fillStyle = "#FF3B30";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Tip of triangle (Points at wheel)
  ctx.moveTo(cx, cy - r + 5);
  // Base of triangle (Points away)
  ctx.lineTo(cx - 30, cy - r - 40);
  ctx.lineTo(cx + 30, cy - r - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- PROGRESS UI (FIXED OVERLAP) ---
  if (s.status === "waiting" || s.status === "cooldown") {
    const remainingMs = Math.max(0, s.timerEnd - Date.now());
    const seconds = Math.ceil(remainingMs / 1000);
    const total = s.status === "waiting" ? 15000 : 5000;

    const barW = 500;
    const barX = cx - barW / 2;
    const barY = HEIGHT - 100; // Anchored near bottom
    const textY = barY - 60; // 60px gap to ensure no overlap

    // Status Text
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "black";
    ctx.fillText(
      s.status === "waiting"
        ? `SPINNING IN ${seconds}s`
        : `NEXT ROUND IN ${seconds}s`,
      cx,
      textY
    );
    ctx.shadowBlur = 0;

    // Progress Bar
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(barX, barY, barW, 20);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(barX, barY, barW * (remainingMs / total), 20);
  }

  // --- WINNER NUMBER ---
  // --- HIGH-ENERGY WINNER UI ---
  if (s.status === "winner" || s.status === "cooldown") {
    const now = Date.now();
    const pulse = Math.sin(now / 150) * 15; // Fast, catchy heartbeat pulse
    const rotation = now / 1000; // Slow background rotation
    const glow = 20 + Math.sin(now / 300) * 20; // Pulsing outer glow

    ctx.save();

    // 1. Draw Rotating "Victory Rays" behind everything
    ctx.translate(cx, cy);
    ctx.save();
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-60, r + 400);
      ctx.lineTo(60, r + 400);
      ctx.fillStyle = "#FFD700"; // Golden Rays
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw "WINNER" Floating Label
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.fillStyle = "#FF3B30"; // Bright Red
    const labelW = 320;
    const labelH = 60;

    // Draw rounded banner above the number
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-labelW / 2, -r - 100 + pulse / 2, labelW, labelH, 30);
      ctx.fill();
    }

    ctx.fillStyle = "white";
    ctx.font = "bold 35px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LUCKY WIN!", 0, -r - 58 + pulse / 2);

    // 3. The Winning Number (Main Attraction)
    ctx.fillStyle = "white";
    ctx.font = `bold ${190 + pulse}px Arial`;
    ctx.shadowBlur = glow;
    ctx.shadowColor = "#FFD700";

    // Draw the number centered in the wheel
    ctx.fillText(s.currentNumber.toString(), 0, 65);

    // Add a secondary white outline for "Pop"
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.strokeText(s.currentNumber.toString(), 0, 65);

    ctx.restore();
  }
}

/* ---------------- STREAM ENGINE ---------------- */
function startLive(rtmpUrl, game) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  let ffmpeg = null;
  let isRendering = false;

  function startFFmpeg() {
    console.log("🎬 Connecting to RTMP...");
    ffmpeg = spawn("ffmpeg", [
      "-f",
      "rawvideo",
      "-vcodec",
      "rawvideo",
      "-pix_fmt",
      "bgra",
      "-s",
      `${WIDTH}x${HEIGHT}`,
      "-r",
      `${FPS}`,
      "-i",
      "pipe:0",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "zerolatency",
      "-pix_fmt",
      "yuv420p",
      "-g",
      "30",
      "-b:v",
      "3000k",
      "-f",
      "flv",
      rtmpUrl,
    ]);

    ffmpeg.stdin.on("error", (e) =>
      console.error("FFmpeg STDIN Error:", e.message)
    );
    ffmpeg.on("close", (code) => {
      console.log(`FFmpeg exited with code ${code}. Restarting...`);
      ffmpeg = null;
      setTimeout(startFFmpeg, 5000);
    });
  }

  startFFmpeg();

  async function render() {
    if (isRendering) return;
    isRendering = true;
    const startTime = Date.now();

    try {
      if (!ffmpeg || !ffmpeg.stdin || !ffmpeg.stdin.writable)
        throw new Error("FFmpeg not ready");

      const s = await game.getState();
      drawBackground(ctx);
      drawWheelAndUI(ctx, s);
      await drawLeaderboard(ctx, game);

      // Branding - Pushed slightly further from corner
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 75px Arial";
      ctx.textAlign = "left";
      ctx.fillText("TOPIX99 LIVE", 120, 160);

      const buf = canvas.toBuffer("raw");
      const canWrite = ffmpeg.stdin.write(buf);
      if (!canWrite) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    } catch (e) {
      if (Date.now() % 1000 < 50) console.log("Stream status:", e.message);
    } finally {
      isRendering = false;
      const elapsed = Date.now() - startTime;
      setTimeout(render, Math.max(1, 1000 / FPS - elapsed));
    }
  }

  render();
  setInterval(pickNewBackground, 300000);
}

module.exports = { startLive };
