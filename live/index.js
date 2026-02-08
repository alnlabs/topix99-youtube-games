const { spawn } = require("child_process");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");
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
} = require("./renderer");

let ffmpegInstance = null;
let logoImage = null;
let fpsState = { currentFPS: 0, lastFrameTime: Date.now() };
let wheelRotationState = new WheelRotationState();
let leaderboardAnimationState = new LeaderboardAnimationState();
let isRenderingPaused = false; // Track if rendering is paused due to backpressure

let localGameState = { status: "waiting", wheelValues: [], timerEnd: 0 };
let localLeaderboard = [];

const currentPalette = palettes[0];

// All drawing functions are now imported from renderer.js

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
    // EPIPE, ECONNRESET, and EINVAL are expected when FFmpeg closes or has issues
    if (err.code !== "EPIPE" && err.code !== "ECONNRESET" && err.code !== "EINVAL") {
      console.error("[live] FFmpeg stdin error:", err.message, err.code);
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

    // Skip rendering if paused due to backpressure
    if (isRenderingPaused) return;

    const startTime = Date.now();

    drawBackground(ctx, currentPalette);
    drawWheelAndUI(ctx, localGameState, wheelRotationState);
    drawLeaderboard(ctx, localLeaderboard, leaderboardAnimationState);
    drawLogoAndBrand(ctx, logoImage);
    fpsState = drawFPSCounter(ctx, fpsState);

    if (ffmpegInstance && ffmpegInstance.stdin) {
      // Check if stream is in a valid state for writing
      const isWritable = ffmpegInstance.stdin.writable &&
                         !ffmpegInstance.stdin.destroyed &&
                         !ffmpegInstance.stdin.closed;

      if (isWritable) {
        try {
          const buffer = canvas.toBuffer("raw");
          const writeResult = ffmpegInstance.stdin.write(buffer);

          // If write returns false, the buffer is full - handle backpressure
          if (!writeResult) {
            isRenderingPaused = true;
            // Wait for drain event before continuing
            ffmpegInstance.stdin.once("drain", () => {
              isRenderingPaused = false;
              // Resume rendering
              render();
            });
            return; // Don't schedule next frame until drain
          }
        } catch (err) {
          // Handle broken pipe, connection errors, and invalid argument errors gracefully
          if (err.code === "EPIPE" || err.code === "ECONNRESET" || err.code === "EINVAL") {
            console.error(`[live] FFmpeg pipe error (${err.code}), stopping render loop`);
            ffmpegInstance = null; // Clear reference to prevent further writes
            clearInterval(syncInterval);
            return;
          }
          // Log other errors but continue rendering (with throttling)
          if (!global.lastFrameError || Date.now() - global.lastFrameError > 5000) {
            console.error("[live] Failed to write frame:", err.message, err.code);
            global.lastFrameError = Date.now();
          }
        }
      } else {
        // Stream is not writable, stop rendering
        console.error("[live] FFmpeg stdin not writable, stopping render loop");
        ffmpegInstance = null;
        clearInterval(syncInterval);
        return;
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
