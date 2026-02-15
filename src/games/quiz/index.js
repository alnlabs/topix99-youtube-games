// File: src/games/quiz/index.js

/**
 * Quiz Game
 *
 * Main game module that exports the game class and configuration
 */

const GameClass = require("./game");
// Use template-renderer instead of old renderer.js for consistency
const templateRenderer = require("./template-renderer");
const renderer = {
  drawQuizUI: templateRenderer.renderQuizUI, // Map old API to new template renderer
  WIDTH: templateRenderer.WIDTH,
  HEIGHT: templateRenderer.HEIGHT,
  FPS: templateRenderer.FPS,
};
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
