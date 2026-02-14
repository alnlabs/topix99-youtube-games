/**
 * Quiz Game
 *
 * Main game module that exports the game class and configuration
 */

const GameClass = require("./game");
const renderer = require("./renderer");
const startLive = require("./live");
const startTest = require("./test");

// Game configuration
const config = {
  name: "Quiz Showdown",
  id: "quiz",
  description: "Real-time quiz game with multiple choice questions",
  version: "1.0.0",
};

module.exports = {
  GameClass,
  renderer,
  startLive,
  startTest,
  config,
  // Default export for backward compatibility
  default: GameClass,
};
