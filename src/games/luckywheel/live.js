/**
 * Lucky Wheel Game - YouTube Live Streaming
 *
 * This module uses the YouTubeStreamer library to stream the Lucky Wheel game to YouTube Live.
 * Uses the showdown-layout template for UI rendering.
 */

const path = require("path");
const { YouTubeStreamer } = require("../../core");
const template = require("../../templates/showdown-layout");
const {
  WIDTH,
  HEIGHT,
  FPS,
  renderLuckyWheelUI,
} = require("./template-renderer");
const { logger } = require("../../services");

/**
 * Start streaming the Lucky Wheel game to YouTube Live
 * @param {string} rtmpUrl - RTMP URL for YouTube Live stream
 * @param {Object} game - Game instance with load(), getStateSync(), getLeaderboardSync() methods
 * @returns {Promise<YouTubeStreamer>} - The streamer instance
 */
async function startLive(rtmpUrl, game) {
  // Create streamer instance
  const streamer = new YouTubeStreamer({
    rtmpUrl,
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,

    bgmPath: path.join(__dirname, "../../../assets/sounds/bgm.mp3"),

    // 🔥 Optimized FFmpeg settings for seamless streaming
    ffmpegOptions: {
      preset: "veryfast", // Balance quality and performance
      tune: "zerolatency", // Optimize for live streaming
      videoBitrate: "4200k", // Increased for better quality
      maxBitrate: "4200k", // Consistent bitrate
      bufsize: "8400k", // Buffer size for stable streaming
      gop: "60", // GOP size (2 seconds at 30fps)
      audioBitrate: "128k", // Audio bitrate
    },

    syncState: async () => {
      // Sync game state from Redis
      await game.load();

      const gameState = game.getStateSync();
      const leaderboard = game.getLeaderboardSync();

      return {
        gameState: gameState || {},
        leaderboard: leaderboard || [],
      };
    },

    syncInterval: 500,

    renderFrame: (ctx, state) => {
      const gameState = state.gameState || {};
      const leaderboard = state.leaderboard || [];

      renderLuckyWheelUI(ctx, gameState, leaderboard);
    },
  });

  // Start streaming
  await streamer.start();

  logger.success("[live] Lucky Wheel streaming started");

  return streamer;
}

// Export the function directly so require('./live') returns the function
module.exports = startLive;
