// games/luckywheel/constants.js
module.exports = {
  MIN_NUMBER: 1,
  MAX_NUMBER: 100,
  WAITING_DURATION: 10000, // 10s for guesses
  SPIN_DURATION: 7000, // 7s spinning
  WINNER_DURATION: 5000, // 5s showing result
  COOLDOWN_DURATION: 5000, // 5s before next round
  MAX_SCOREBOARD: 5,

  // UI Display Constants
  ANSWER_BOX_Y: -20, // Vertical position of answer display (negative = above center)
  TITLE_HEIGHT: 50, // Height of "WINNING NUMBER" title container in pixels
  TITLE_WIDTH: 400, // Width of title container in pixels
  TITLE_X: -200, // X position of title container (centered, so -200 to +200 = 400px wide)
  TITLE_CORNER_RADIUS: 15, // Corner roundness of title container
  TITLE_FONT_SIZE: 35, // Font size for "WINNING NUMBER" text
  TITLE_FONT_FAMILY: "Bebas", // Font family for title
  TITLE_BG_COLOR: "rgba(0, 0, 0, 0.8)", // Background color of title container
  TITLE_TEXT_COLOR: "white", // Color of "WINNING NUMBER" text
  TITLE_TEXT: "WINNING NUMBER", // Text displayed in title

  GAP_BETWEEN_TITLE_AND_NUMBER: 15, // Gap in pixels between title and number containers

  NUMBER_TEXT_HEIGHT: 150, // Target height for winning number text (in pixels) - font size will be calculated to achieve this
  NUMBER_FONT_FAMILY: "Orbitron", // Font family for number
  NUMBER_PADDING: 3, // Padding around number inside container
  NUMBER_MAX_WIDTH: 220, // Maximum container width to keep it compact
  NUMBER_FALLBACK_HEIGHT: 220, // Fallback height if text metrics unavailable
  NUMBER_BORDER_THICKNESS: 2, // Thickness of outer gold border
  NUMBER_OUTER_CORNER_RADIUS: 10, // Corner roundness of outer border
  NUMBER_INNER_CORNER_RADIUS: 8, // Corner roundness of inner background
  NUMBER_BG_COLOR: "rgba(0, 0, 0, 0.9)", // Background color of number container
  NUMBER_BORDER_COLOR: "#FFD700", // Color of outer border (gold)
  NUMBER_TEXT_COLOR: "#FFD700", // Color of number text (gold)
  NUMBER_SHADOW_BLUR: 15, // Shadow blur amount for number text
  NUMBER_SHADOW_COLOR: "#FFD700", // Shadow/glow color for number text

  // Status Text Constants
  // Placeholders available:
  //   {seconds} - Replaced with countdown number (e.g., "10")
  //   {countdown} - Same as {seconds} (for flexibility)
  //   {unit} - Replaced with TIME_UNIT_SUFFIX (e.g., "s", "sec", "seconds")
  TIME_UNIT_SUFFIX: "s", // Time unit suffix (e.g., "s", "sec", "seconds", or "" for no unit)
  READY_TO_SPIN_TEXT: "READY TO SPIN ({seconds}{unit})...Start Guessing!", // Text displayed during waiting phase
  NEXT_ROUND_STARTING_TEXT: "NEXT ROUND STARTING ({seconds}{unit})", // Text displayed during cooldown phase

  // Scoring Constants
  // Scoring System:
  // - Single guess (1 guess that matches): BASE_SCORE_SINGLE_GUESS points
  // - Multiple guesses (2-5 guesses, one matches): BASE_SCORE_MULTIPLE_GUESSES / guessCount (minimum 1 point)
  // Examples:
  //   - 1 guess matches: 10 points
  //   - 2 guesses, one matches: floor(5/2) = 2 points
  //   - 3 guesses, one matches: floor(5/3) = 1 point
  //   - 4 guesses, one matches: floor(5/4) = 1 point
  //   - 5 guesses, one matches: floor(5/5) = 1 point
  BASE_SCORE_SINGLE_GUESS: 10, // Points awarded for winning with exactly 1 guess (highest reward)
  BASE_SCORE_MULTIPLE_GUESSES: 5, // Base points for winning with 2-5 guesses (divided by guess count, minimum 1)
  MAX_GUESSES_PER_USER: 5, // Maximum number of guesses allowed per user per round (only last 5 are kept)
};
