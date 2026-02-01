const { spawn } = require("child_process");
const { createCanvas } = require("canvas");

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

// ----------------- BACKGROUNDS -----------------

const palettes = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77", "#ffaf7b"],
  ["#1d4350", "#a43931"],
  ["#232526", "#414345"],
  ["#283048", "#859398"],
  ["#42275a", "#734b6d"],
  ["#000428", "#004e92"],
];

let currentPalette = palettes[0];

function pickNewBackground() {
  currentPalette = palettes[Math.floor(Math.random() * palettes.length)];
}

function drawBackground(ctx, w, h, phase) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  currentPalette.forEach((c, i) =>
    grad.addColorStop(i / (currentPalette.length - 1), c)
  );

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (phase === "spinning") {
    ctx.fillStyle = "rgba(255,215,0,0.12)";
    ctx.fillRect(0, 0, w, h);
  }
  if (phase === "finished") {
    ctx.fillStyle = "rgba(0,255,160,0.12)";
    ctx.fillRect(0, 0, w, h);
  }
}

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

    const mid = (start + end) / 2;
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "right";
    ctx.fillStyle = "#000";
    ctx.font = "24px Arial Black";
    ctx.fillText(`${i * 10 + 1}-${(i + 1) * 10}`, r - 10, 10);
    ctx.restore();
  }

  ctx.restore();

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
    ctx.fillStyle = "#fff";
    ctx.font = "36px Arial";
    ctx.fillText(`${i + 1}. ${p.username} — ${p.score}`, 1300, 260 + i * 50);
  });
}

function drawCelebration(ctx, s) {
  const t = (Date.now() - s.celebration.startTime) / 1000;
  if (t > 6) return;

  ctx.fillStyle = "rgba(255,215,0,0.15)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 50;
  ctx.fillStyle = "#FFD700";
  ctx.font = "100px Arial Black";
  ctx.fillText(s.celebration.username, 600, 520);
  ctx.font = "60px Arial";
  ctx.fillText("IS THE WINNER!", 650, 600);
  ctx.shadowBlur = 0;
}

// ----------------- STREAM -----------------

function startLive(rtmpUrl, game) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

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
    "anullsrc",
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
    "-g",
    `${FPS * 2}`,
    "-c:a",
    "aac",
    "-f",
    "flv",
    rtmpUrl,
  ]);

  let lastRound = 0;
  pickNewBackground();

  setInterval(async () => {
    const s = game.getState();

    if (s.round !== lastRound) {
      pickNewBackground();
      lastRound = s.round;
    }

    drawBackground(ctx, WIDTH, HEIGHT, s.status);

    ctx.fillStyle = "#FFD700";
    ctx.font = "80px Arial";
    ctx.fillText("TOPIX99 LIVE", 600, 140);

    drawWheel(ctx, s);

    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.fillText(game.getOverlayText(), 400, 850);

    await drawLeaderboard(ctx, game);
    if (s.celebration.active) drawCelebration(ctx, s);

    ffmpeg.stdin.write(canvas.toBuffer("raw"));
  }, 1000 / FPS);

  return ffmpeg;
}

module.exports = { startLive };
