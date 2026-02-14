/**
 * Quiz Game - YouTube Live Streaming
 *
 * This module uses the YouTubeStreamer library to stream the Quiz game to YouTube Live.
 */

const path = require("path");
const { YouTubeStreamer } = require("../../core");
const {
  WIDTH,
  HEIGHT,
  FPS,
  drawQuizUI,
} = require("./renderer");
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
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    bgmPath: path.join(__dirname, "../../../assets/sounds/bgm.mp3"),
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
      // Extract state
      const gameState = state.gameState || {};
      const leaderboard = state.leaderboard || [];

      // Render quiz UI
      drawQuizUI(ctx, gameState, leaderboard);
    },
  });

  // Start streaming
  await streamer.start();

  logger.success("[quiz-live] Quiz game streaming started");

  return streamer;
}

// Export the function directly so require('./live') returns the function
module.exports = startLive;
