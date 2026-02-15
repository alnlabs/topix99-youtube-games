// File: src/games/quiz/live.js

/**
 * Quiz Game - YouTube Live Streaming
 *
 * This module uses the YouTubeStreamer library to stream the Quiz game to YouTube Live.
 * Uses the showdown-layout template for UI rendering.
 */

const path = require("path");
const { YouTubeStreamer } = require("../../core");
const template = require("../../templates/neon-dream-layout");
const { renderQuizUI } = require("./template-renderer");
const C = require("./constants");
const { WIDTH, HEIGHT, FPS } = C;
const { logger } = require("../../services");

/**
 * Start streaming the Quiz game to YouTube Live
 * @param {string} rtmpUrl - RTMP URL for YouTube Live stream
 * @param {Object} game - Game instance with load(), getStateSync(), getLeaderboardSync() methods
 * @returns {Promise<YouTubeStreamer>} - The streamer instance
 */
async function startLive(rtmpUrl, game) {
  // Create streamer instance
  const streamer = new YouTubeStreamer({
    rtmpUrl,
    width: WIDTH, // 1920
    height: HEIGHT, // 1080
    fps: FPS, // 30

    bgmPath: path.join(__dirname, "../../../assets/sounds/bgm.mp3"),

    // 🔥 Optimized FFmpeg settings for seamless streaming
    ffmpegOptions: {
      videoEncoder: "h264_videotoolbox",
      videoBitrate: "6000k",
      maxBitrate: "6000k",
      bufsize: "12000k",
      gop: "60",
      audioBitrate: "128k",
    },

    syncState: async () => {
      // NOTE: We no longer call await game.load() here!
      // Since streamer and game run in the same process, we use the in-memory state directly.
      // This eliminates 30+ Redis roundtrips and JSON parses per second.
      const gameState = game.getStateSync();
      const leaderboard = game.getLeaderboardSync();

      return {
        gameState: gameState || {},
        leaderboard: leaderboard || [],
      };
    },

    syncInterval: 500, // Sync every 500ms since it's local and fast

    renderFrame: (ctx, state) => {
      const gameState = state.gameState || {};
      const leaderboard = state.leaderboard || [];

      // Pass timestamp for animations and template explicitly
      renderQuizUI(ctx, gameState, leaderboard, Date.now(), template);
    },
  });

  // Start streaming
  await streamer.start();

  logger.success("[quiz-live] Quiz game streaming started");

  return streamer;
}

// Export the function directly so require('./live') returns the function
module.exports = startLive;
