/**
 * Neon Dream Design System
 *
 * Inspired by aln-quiz-app
 * Optimized for 1280x720 (720p) resolution
 */

const CANVAS = {
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 25,
};

const COLORS = {
  BACKGROUND: "hsl(230, 25%, 7%)",
  FOREGROUND: "hsl(0, 0%, 98%)",

  // Neon Accents
  NEON_BLUE: "hsl(220, 90%, 56%)",
  NEON_PINK: "hsl(330, 85%, 60%)",
  NEON_GREEN: "hsl(150, 80%, 45%)",
  NEON_YELLOW: "hsl(45, 95%, 55%)",
  NEON_PURPLE: "hsl(280, 80%, 60%)",
  NEON_ORANGE: "hsl(25, 95%, 55%)",

  // Answer Options
  OPTION_A: "hsl(350, 85%, 60%)", // Rich Red/Pink
  OPTION_B: "hsl(210, 85%, 60%)", // Bright Blue
  OPTION_C: "hsl(45, 95%, 55%)",  // Gold/Yellow
  OPTION_D: "hsl(150, 80%, 45%)", // Emerald Green

  BORDER: "hsl(230, 25%, 20%)",
  CARD_BG: "rgba(10, 10, 26, 0.7)",
  MUTED: "hsl(230, 10%, 40%)",
};

const TYPOGRAPHY = {
  FONT_TITLE: "'MouldyCheese', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif",
  FONT_SECONDARY: "'MouldyCheese', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif",
  FONT_DISPLAY: "'MouldyCheese', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif",

  // 1080p Scaled font sizes
  SIZE_LARGE: 81,
  SIZE_TITLE: 63,
  SIZE_SUBTITLE: 36,
  SIZE_BODY: 30,
  SIZE_SMALL: 24,
};

const LAYOUT = {
  // Container width ratios
  MAIN_CONTAINER_RATIO: 0.75,
  SIDEBAR_CONTAINER_RATIO: 0.25,

  SIDEBAR_ROW1_HEIGHT_RATIO: 0.45,
  SIDEBAR_ROW2_HEIGHT_RATIO: 0.55,

  SAFE_MARGINS: {
    top: 40,
    bottom: 350,
    left: 40,
    right: 40,
  },

  LOGO_ICON_SIZE: 90,

  SPACING: {
    XS: 4,
    S: 8,
    M: 16,
    L: 24,
    XL: 32,
  },

  RADIUS: {
    S: 8,
    M: 12,
    L: 20,
  }
};

module.exports = {
  CANVAS,
  COLORS,
  TYPOGRAPHY,
  LAYOUT,
  THEME: { ...COLORS, ...TYPOGRAPHY, ...LAYOUT }
};
