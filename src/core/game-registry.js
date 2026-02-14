/**
 * Game Registry
 *
 * Central registry for managing and loading games.
 * Allows easy addition of new games without modifying core server code.
 */

const path = require("path");
// Lazy load logger to avoid circular dependency issues
let logger;
function getLogger() {
  if (!logger) {
    logger = require("../services").logger;
  }
  return logger;
}

class GameRegistry {
  constructor() {
    this.games = new Map();
  }

  /**
   * Register a game
   * @param {string} gameId - Unique game identifier (e.g., 'luckywheel')
   * @param {Object} gameConfig - Game configuration
   * @param {Function} gameConfig.GameClass - Game class constructor
   * @param {Function} gameConfig.renderer - Renderer module
   * @param {Function} gameConfig.startLive - Function to start live streaming
   * @param {Function} [gameConfig.startTest] - Function to start test mode
   * @param {Object} [gameConfig.config] - Game-specific configuration
   */
  register(gameId, gameConfig) {
    if (this.games.has(gameId)) {
      getLogger().warn(`[registry] Game '${gameId}' is already registered, overwriting...`);
    }

    this.games.set(gameId, {
      id: gameId,
      GameClass: gameConfig.GameClass,
      renderer: gameConfig.renderer,
      startLive: gameConfig.startLive,
      startTest: gameConfig.startTest,
      config: gameConfig.config || {},
      ...gameConfig,
    });

    getLogger().info(`[registry] Registered game: ${gameId}`);
  }

  /**
   * Get a registered game
   * @param {string} gameId - Game identifier
   * @returns {Object|null} Game configuration or null if not found
   */
  get(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Check if a game is registered
   * @param {string} gameId - Game identifier
   * @returns {boolean}
   */
  has(gameId) {
    return this.games.has(gameId);
  }

  /**
   * Get all registered games
   * @returns {Array} Array of game IDs
   */
  list() {
    return Array.from(this.games.keys());
  }

  /**
   * Create a game instance
   * @param {string} gameId - Game identifier
   * @returns {Object|null} Game instance or null if not found
   */
  createInstance(gameId) {
    const gameConfig = this.get(gameId);
    if (!gameConfig || !gameConfig.GameClass) {
      getLogger().error(`[registry] Game '${gameId}' not found or missing GameClass`);
      return null;
    }

    try {
      return new gameConfig.GameClass();
    } catch (error) {
      getLogger().error(`[registry] Failed to create instance of '${gameId}': ${error.message}`);
      return null;
    }
  }
}

// Create singleton instance
const registry = new GameRegistry();

module.exports = registry;
