/**
 * Neon Dream Layout Template
 */

const designSystem = require("./design-system");
const layoutRenderer = require("./layout-renderer");
const uiComponents = require("./ui-components");
const utils = require("./utils");

module.exports = {
  name: "neon-dream-layout",
  designSystem,
  layoutRenderer,
  uiComponents,
  utils,

  // Expose key renderers directly
  renderDefaultLayout: layoutRenderer.renderDefaultLayout,
};
