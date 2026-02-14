/**
 * Core Module Exports
 *
 * Central export point for all core functionality
 */

module.exports = {
  // Streaming
  YouTubeStreamer: require("./youtube-streamer").YouTubeStreamer,

  // Game Registry
  gameRegistry: require("./game-registry"),
};
