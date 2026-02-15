/**
 * Design System Constants
 *
 * Matches the React frontend design system from:
 * - src/index.css (CSS custom properties)
 * - src/config/quizConfig.ts
 * - DESIGN_AND_UX.md
 *
 * Ensures visual parity between React frontend and canvas rendering.
 */

// Canvas dimensions (matches React frontend)
// Canvas dimensions (matches React frontend)
const CANVAS = {
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 30,
};

// Container dimensions
const CONTAINER = {
  // Container height ratio (0.0 to 1.0) - percentage of safe height to use
  // 1.0 = use full safe height, 0.9 = use 90% of safe height, etc.
  HEIGHT_RATIO: 0.95, // Increased from 0.8 to use more vertical space

  // Container internal margins (padding inside containers)
  MARGIN: 13, // Internal margin for all containers (ensures content doesn't touch edges)
};

// Color palette (matches React CSS custom properties)
// ... (COLORS section remains unchanged)
const COLORS = {
  // Background
  BACKGROUND: "hsl(230, 25%, 7%)", // Deep navy/black

  // Foreground
  FOREGROUND: "hsl(0, 0%, 98%)", // Almost white

  // Neon accent colors (matches React design)
  NEON_BLUE: "hsl(220, 90%, 56%)",
  NEON_PINK: "hsl(330, 85%, 60%)",
  NEON_GREEN: "hsl(150, 80%, 45%)",
  NEON_YELLOW: "hsl(45, 95%, 55%)",
  NEON_PURPLE: "hsl(280, 80%, 60%)",
  NEON_ORANGE: "hsl(25, 95%, 55%)",

  // Answer option colors (matches React design)
  OPTION_A: "hsl(0, 70%, 50%)", // Red tones
  OPTION_B: "hsl(220, 70%, 50%)", // Blue tones
  OPTION_C: "hsl(45, 70%, 50%)", // Yellow tones
  OPTION_D: "hsl(150, 70%, 50%)", // Green tones

  // Status colors
  CORRECT: "hsl(150, 80%, 45%)", // Green for correct
  INCORRECT: "hsl(0, 70%, 50%)", // Red for incorrect
  SELECTED: "hsl(220, 90%, 56%)", // Blue for selected

  // UI elements
  CARD_BACKGROUND: "hsl(230, 25%, 12%)",
  BORDER: "hsl(230, 25%, 20%)",
  MUTED: "hsl(230, 10%, 40%)",
};

// Typography (matches React fonts)
const TYPOGRAPHY = {
  FONT_TITLE: "'MouldyCheese', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif", // Playful, bold
  FONT_SECONDARY: "'Orbitron', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif", // Futuristic, tech-forward
  FONT_DISPLAY: "'Space Grotesk', 'Kohinoor Devanagari', 'Telugu MN', 'Arial', sans-serif", // Modern, clean (fallback)

  // Font sizes scaled for 1920x1080
  SIZE_TITLE: 63,
  SIZE_SUBTITLE: 42,
  SIZE_BODY: 36,
  SIZE_SMALL: 24,
  SIZE_LARGE: 81,
};

// Layout constants scaled for 1280x720 (original * 0.66)
const LAYOUT = {
  // Safe margins for YouTube streaming
  SAFE_MARGINS: {
    top: 40,
    bottom: 100,
    left: 40,
    right: 40,
  },

  // Sidebar
  SIDEBAR_WIDTH: 450,

  // Container width ratios
  MAIN_CONTAINER_RATIO: 0.75,
  SIDEBAR_CONTAINER_RATIO: 0.25,

  // Main container row heights
  MAIN_ROW1_HEIGHT: 180,
  MAIN_ROW2_HEIGHT_RATIO: 0.65,
  QUESTION_OPTIONS_GAP: 8,

  // Header row (Row 1) component sizes
  LOGO_SIZE: 140,
  LOGO_ICON_SIZE: 120,
  TITLE_GAP: 39,
  LOGO_TO_GAMENAME_SPACING: 350,
  TIMER_SIZE: 120,
  BADGE_HEIGHT: 32,
  BADGE_PADDING: 20,
  BADGE_TOP_OFFSET: 9,

  // Sidebar container row heights
  SIDEBAR_ROW1_HEIGHT_RATIO: 0.4,
  SIDEBAR_ROW2_HEIGHT_RATIO: 0.6,

  // Spacing
  SPACING_SMALL: 5,
  SPACING_MEDIUM: 10,
  SPACING_LARGE: 16,
  SPACING_XLARGE: 21,
};

// Game timing (matches React config)
const TIMING = {
  REVEAL_DURATION: 1500, // 1.5 seconds
  CELEBRATION_DURATION: 3500, // 3.5 seconds
  NEXT_DELAY: 500, // 0.5 seconds
  TIMER_URGENT_THRESHOLD: 5, // Show urgent style at 5 seconds
};

// Scoring (matches React config)
const SCORING = {
  BASE_SCORE: 100,
  BONUS_SCORE_RANGE: 50,
  CORRECT_ANSWER_CHANCE: 0.8, // 80% chance
};

// Leaderboard (matches React config)
const LEADERBOARD = {
  TOP_PLAYERS_COUNT: 5,
  RECENT_ANSWERS_COUNT: 5,
};

// Timer (matches React config)
const TIMER = {
  SIZE: 100,
  STROKE_WIDTH: 6,
};

// Theme object (for easy access)
const THEME = {
  ...COLORS,
  ...TYPOGRAPHY,
  ...LAYOUT,
  ...TIMING,
  ...SCORING,
  ...LEADERBOARD,
  ...TIMER,
};

module.exports = {
  CANVAS,
  CONTAINER,
  COLORS,
  TYPOGRAPHY,
  LAYOUT,
  TIMING,
  SCORING,
  LEADERBOARD,
  TIMER,
  THEME,
};
