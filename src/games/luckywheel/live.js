/**
 * Lucky Wheel Game - YouTube Live Streaming
 *
 * This module uses the YouTubeStreamer library to stream the Lucky Wheel game to YouTube Live.
 * It demonstrates how to integrate the streaming library with a game.
 */

const { loadImage } = require("canvas");
const path = require("path");
const { YouTubeStreamer } = require("../../core");
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
const { logger } = require("../../services");

// Game-specific state (not synced via library)
let logoImage = null;
let fpsState = { currentFPS: 0, lastFrameTime: Date.now() };
let wheelRotationState = new WheelRotationState();
let leaderboardAnimationState = new LeaderboardAnimationState();

const currentPalette = palettes[0];

/**
 * Start streaming the Lucky Wheel game to YouTube Live
 * @param {string} rtmpUrl - RTMP URL for YouTube Live stream
 * @param {Object} game - Game instance with load(), getStateSync(), getLeaderboardSync() methods
 * @returns {Promise<YouTubeStreamer>} - The streamer instance
 */
async function startLive(rtmpUrl, game) {
  // Load logo image
  try {
    // Assets folder is at root level, so go up 3 levels from src/games/luckywheel/live.js
    const assetsPath = path.join(__dirname, "../../../assets");
    logoImage = await loadImage(
      path.join(assetsPath, "images/logo.png")
    );
  } catch (e) {
    logger.warn("⚠️ Logo not found");
  }

  // Track previous leaderboard for animation
  let previousLeaderboard = [];

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
      const state = game.getStateSync();
      const lb = game.getLeaderboardSync();

      // Update animation states
      if (lb && Array.isArray(lb)) {
        const leaderboard = lb.map((p) => ({
          username: p.username || "Unknown",
          wins: p.score || 0,
        }));
        leaderboardAnimationState.update(previousLeaderboard, leaderboard);
        previousLeaderboard = leaderboard;
        return {
          gameState: state || {},
          leaderboard: leaderboard,
        };
      }

      return {
        gameState: state || {},
        leaderboard: previousLeaderboard,
      };
    },
    syncInterval: 500,
    renderFrame: (ctx, state) => {
      // Extract state
      const gameState = state.gameState || {};
      const leaderboard = state.leaderboard || [];

      // Update wheel rotation state
      wheelRotationState.update(gameState);

      // Render game
      drawBackground(ctx, currentPalette);
      drawWheelAndUI(ctx, gameState, wheelRotationState);
      drawLeaderboard(ctx, leaderboard, leaderboardAnimationState);
      drawLogoAndBrand(ctx, logoImage);
      fpsState = drawFPSCounter(ctx, fpsState);
    },
  });

  // Start streaming
  await streamer.start();

  logger.success("[live] Lucky Wheel streaming started");

  return streamer;
}

// Export the function directly so require('./live') returns the function
module.exports = startLive;
