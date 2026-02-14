/**
 * Lucky Wheel Game
 *
 * Main game module that exports the game class and configuration
 */

const GameClass = require("./game");
const renderer = require("./renderer");
const startLive = require("./live");
const startTest = require("./test");

// Game configuration
const config = {
  name: "Lucky Wheel",
  id: "luckywheel",
  description: "Number guessing game with spinning wheel",
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
