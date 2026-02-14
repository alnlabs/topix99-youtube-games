// games/quiz/constants.js
module.exports = {
  // Game Timing (milliseconds)
  QUESTION_DURATION: 15000, // 15 seconds per question
  REVEAL_DURATION: 1500, // 1.5 seconds to show answer
  CELEBRATION_DURATION: 3500, // 3.5 seconds celebration
  NEXT_QUESTION_DELAY: 500, // 0.5 seconds before next question

  // Scoring
  BASE_SCORE: 100,
  BONUS_SCORE_RANGE: 50, // Random bonus between 0-50
  CORRECT_ANSWER_CHANCE: 0.8, // 80% chance someone answers correctly

  // Leaderboard
  TOP_PLAYERS_COUNT: 5,
  RECENT_ANSWERS_COUNT: 5,

  // UI Colors
  COLORS: {
    NEON_BLUE: "#4A9EFF",
    NEON_PINK: "#FF4A9E",
    NEON_GREEN: "#4AFF9E",
    NEON_YELLOW: "#FFD700",
    NEON_PURPLE: "#9E4AFF",
    NEON_ORANGE: "#FF9E4A",
    OPTION_A: "#FF6B6B", // Red
    OPTION_B: "#4ECDC4", // Blue
    OPTION_C: "#FFE66D", // Yellow
    OPTION_D: "#95E1D3", // Green
  },

  // Fonts
  FONT_TITLE: "MouldyCheese",
  FONT_DISPLAY: "MouldyCheese",
  FONT_BODY: "MouldyCheese",

  // Layout
  QUESTION_FONT_SIZE: 48,
  OPTION_FONT_SIZE: 32,
  TIMER_SIZE: 100,
  TIMER_STROKE_WIDTH: 6,
  TIMER_URGENT_THRESHOLD: 5, // Seconds when timer turns red

  // Safe margins for YouTube streaming (mobile keyboard + edges)
  // These values match config/modes.js for quiz mode
  SAFE_MARGINS: {
    top: 40,    // YouTube title bar
    bottom: 300, // Mobile keyboard + progress bar
    left: 40,   // Left edge
    right: 40,   // Chat overlay
  },
};
