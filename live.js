const { spawn } = require("child_process");
const { createCanvas } = require("canvas");
const path = require("path");

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

const SPIN_SOUND = path.join(__dirname, "assets/sounds/spin.wav");
const WIN_SOUND = path.join(__dirname, "assets/sounds/win.wav");

// ----------------- DRAWING -----------------

function drawWheel(ctx, s) {
  const cx = 500;
  const cy = 550;
  const r = 220;
  const slices = 10;

  s.wheelPosition += s.spinSpeed;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(s.wheelPosition);

  for (let i = 0; i < slices; i++) {
    const start = (i * Math.PI * 2) / slices;
    const end = ((i + 1) * Math.PI * 2) / slices;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.fillStyle = i % 2 ? "#FFD700" : "#222";
    ctx.fill();

    // draw numbers
    const mid = (start + end) / 2;
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "right";
    ctx.fillStyle = "#000";
    ctx.font = "24px Arial Black";
    const from = i * 10 + 1;
    const to = (i + 1) * 10;
    ctx.fillText(`${from}-${to}`, r - 10, 10);
    ctx.restore();
  }

  ctx.restore();

  // Pointer
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 20);
  ctx.lineTo(cx - 20, cy - r + 20);
  ctx.lineTo(cx + 20, cy - r + 20);
  ctx.fill();
}

async function drawLeaderboard(ctx, game) {
  const list = await game.getLeaderboard();

  ctx.fillStyle = "#00ffcc";
  ctx.font = "42px Arial";
  ctx.fillText("TOP PLAYERS", 1300, 200);

  list.forEach((p, i) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = "36px Arial";
    ctx.fillText(`${i + 1}. ${p.username} — ${p.score}`, 1300, 260 + i * 50);
  });
}

function drawCelebration(ctx, s) {
  const c = s.celebration;
  const t = (Date.now() - c.startTime) / 1000;
  if (t > 6) {
    c.active = false;
    return;
  }

  ctx.fillStyle = `rgba(255,215,0,${0.15 + Math.sin(t * 10) * 0.1})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(960, 540, t * 220, 0, Math.PI * 2);
  ctx.stroke();

  const shake = Math.sin(t * 40) * 8;
  ctx.translate(shake, 0);

  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 50;

  ctx.fillStyle = "#FFD700";
  ctx.font = "100px Arial Black";
  ctx.fillText(c.username, 600, 520);

  ctx.font = "60px Arial";
  ctx.fillText("IS THE WINNER!", 650, 600);

  ctx.shadowBlur = 0;

  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = ["#FFD700", "#ff00ff", "#00ffff"][i % 3];
    ctx.fillRect(
      Math.random() * WIDTH,
      (Date.now() * 0.4 + i * 60) % HEIGHT,
      12,
      12
    );
  }
}

// ----------------- SOUND INJECTOR -----------------

function playSound(rtmpUrl, file) {
  spawn(
    "ffmpeg",
    ["-re", "-i", file, "-c:a", "aac", "-b:a", "128k", "-f", "flv", rtmpUrl],
    { stdio: "ignore" }
  );
}

// ----------------- STREAM -----------------

function startLive(rtmpUrl, game) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // MAIN VIDEO PIPELINE (silent audio)
  const ffmpeg = spawn("ffmpeg", [
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
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
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "6000k",
    "-maxrate",
    "6000k",
    "-bufsize",
    "12000k",
    "-g",
    `${FPS * 2}`,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-f",
    "flv",
    rtmpUrl,
  ]);

  let lastSpin = false;
  let lastWin = false;

  setInterval(async () => {
    const s = game.getState();
    const secs = Math.floor(process.uptime());

    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#FFD700";
    ctx.font = "80px Arial";
    ctx.fillText("TOPIX99 LIVE", 600, 140);

    drawWheel(ctx, s);

    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.fillText(game.getOverlayText(), 400, 850);

    ctx.font = "60px Arial";
    ctx.fillText(secs + "s", 880, 280);

    await drawLeaderboard(ctx, game);

    if (s.celebration.active) drawCelebration(ctx, s);

    // 🔊 Trigger sounds
    if (s.status === "spinning" && !lastSpin) {
      playSound(rtmpUrl, SPIN_SOUND);
      lastSpin = true;
    }
    if (s.status !== "spinning") lastSpin = false;

    if (s.celebration.active && !lastWin) {
      playSound(rtmpUrl, WIN_SOUND);
      lastWin = true;
    }
    if (!s.celebration.active) lastWin = false;

    ffmpeg.stdin.write(canvas.toBuffer("raw"));
  }, 1000 / FPS);

  return ffmpeg;
}

module.exports = { startLive };
