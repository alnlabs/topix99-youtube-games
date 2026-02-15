/**
 * Showdown Layout Template
 *
 * A reusable UI template for game showdown layouts (quiz, trivia, etc.).
 * Pure UI - layout, animations, and visual experience only.
 *
 * Games provide data/state, this template handles all UI rendering.
 */

// Template registry - stores UI template renderers
const templateRegistry = new Map();

/**
 * Register a UI template
 * @param {string} templateId - Template identifier (e.g., 'quiz-showdown', 'game-layout')
 * @param {Object} templateConfig - Template configuration
 * @param {Function} templateConfig.render - Main UI render function (ctx, uiData) => void
 * @param {number} templateConfig.WIDTH - Canvas width (default: 1920)
 * @param {number} templateConfig.HEIGHT - Canvas height (default: 1080)
 * @param {number} templateConfig.FPS - Frames per second (default: 30)
 * @param {Object} [templateConfig.uiComponents] - Available UI components
 * @param {Object} [templateConfig.config] - Template metadata
 */
function registerTemplate(templateId, templateConfig) {
  if (!templateConfig.render || typeof templateConfig.render !== "function") {
    throw new Error(`Template '${templateId}' must provide a render function`);
  }

  templateRegistry.set(templateId, {
    render: templateConfig.render,
    WIDTH: templateConfig.WIDTH || 1920,
    HEIGHT: templateConfig.HEIGHT || 1080,
    FPS: templateConfig.FPS || 30,
    uiComponents: templateConfig.uiComponents || {},
    config: templateConfig.config || {},
  });
}

/**
 * Get a template
 * @param {string} templateId - Template identifier
 * @returns {Object|null} Template config or null if not found
 */
function getTemplate(templateId) {
  return templateRegistry.get(templateId) || null;
}

/**
 * Render UI using a template
 * Templates are UI-only: they receive data and render the visual layout
 * @param {string} templateId - Template identifier
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} uiData - UI data object (provided by game)
 * @param {Object} uiData.layout - Layout data (title, subtitle, etc.)
 * @param {Object} uiData.content - Content data (questions, options, etc.)
 * @param {Object} uiData.sidebar - Sidebar data (leaderboard, recent items, etc.)
 * @param {Object} uiData.overlay - Overlay data (celebration, modals, etc.)
 * @param {Object} uiData.animations - Animation state (phase, transitions, etc.)
 */
function renderTemplate(templateId, ctx, uiData) {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template '${templateId}' not found. Available templates: ${listTemplates().join(", ")}`);
  }

  // Template handles all UI rendering - no game logic
  return template.render(ctx, uiData);
}

/**
 * Get template dimensions
 * @param {string} templateId - Template identifier
 * @returns {Object} { WIDTH, HEIGHT, FPS }
 */
function getTemplateDimensions(templateId) {
  const template = getTemplate(templateId);
  if (!template) {
    return { WIDTH: 1920, HEIGHT: 1080, FPS: 30 };
  }

  return {
    WIDTH: template.WIDTH,
    HEIGHT: template.HEIGHT,
    FPS: template.FPS,
  };
}

/**
 * Get template UI components (if available)
 * @param {string} templateId - Template identifier
 * @returns {Object} UI components object
 */
function getTemplateComponents(templateId) {
  const template = getTemplate(templateId);
  return template?.uiComponents || {};
}

/**
 * Get template config
 * @param {string} templateId - Template identifier
 * @returns {Object|null} Template config or null
 */
function getTemplateConfig(templateId) {
  const template = getTemplate(templateId);
  return template?.config || null;
}

/**
 * List all registered templates
 * @returns {Array<string>} Array of template IDs
 */
function listTemplates() {
  return Array.from(templateRegistry.keys());
}

// Export UI components for direct use
const uiComponents = require("./ui-components");
const designSystem = require("./design-system");
const utils = require("./utils");
const layoutRenderer = require("./layout-renderer");

module.exports = {
  registerTemplate,
  getTemplate,
  renderTemplate,
  getTemplateDimensions,
  getTemplateComponents,
  getTemplateConfig,
  listTemplates,
  // Direct exports for convenience
  uiComponents,
  designSystem,
  utils,
  layoutRenderer,
};
