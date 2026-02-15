/**
 * Template System Entry Point
 *
 * This is the main entry point for accessing templates.
 * Templates are organized in subdirectories (e.g., showdown-layout/).
 */

// Export the showdown-layout template as the default/main template
module.exports = {
  showdownLayout: require("./showdown-layout"),
  neonDreamLayout: require("./neon-dream-layout"),
};
