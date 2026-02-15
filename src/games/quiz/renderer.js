/**
 * Quiz Game Renderer
 * Canvas-based rendering for YouTube streaming
 * Visual style matched to the React frontend design
 */

const path = require("path");
const { registerFont } = require("canvas");
const C = require("./constants");
const { questions } = require("./data");

// Register fonts
registerFont(
  path.join(__dirname, "../../../assets/fonts/MouldyCheese-Regular.ttf"),
  {
    family: "MouldyCheese",
  }
);

// Canvas dimensions for YouTube streaming
const { WIDTH, HEIGHT, FPS } = C;

/**
 * Draw the main quiz UI
 */
function drawQuizUI(ctx, gameState, leaderboard) {
  // Clear canvas with dark blue background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw header
  drawHeader(ctx);

  // Draw timer if in question state
  if (gameState.status === "question") {
    drawTimer(ctx, gameState.timeLeft);
  }

  // Draw body content based on game state
  drawBody(ctx, gameState);

  // Draw leaderboard
  drawLeaderboard(ctx, leaderboard);

  // Draw footer
  drawFooter(ctx);
}

/**
 * Draw header section
 */
function drawHeader(ctx) {
  // Header background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, WIDTH, 120);

  // Title
  ctx.font = `bold 60px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_BLUE;
  ctx.textAlign = "center";
  ctx.fillText("QUIZ SHOWDOWN", WIDTH / 2, 80);

  // Subtitle
  ctx.font = `30px ${C.FONT_BODY}`;
  ctx.fillStyle = C.COLORS.NEON_GREEN;
  ctx.fillText("Test Your Knowledge!", WIDTH / 2, 110);
}

/**
 * Draw timer
 */
function drawTimer(ctx, timeLeft) {
  const centerX = WIDTH / 2;
  const centerY = 180;
  const radius = 60;

  // Background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();

  // Progress arc
  const startAngle = -Math.PI / 2;
  const progress = Math.max(0, timeLeft) / (C.QUESTION_DURATION / 1000);
  const endAngle = startAngle + 2 * Math.PI * progress;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.strokeStyle =
    timeLeft <= C.TIMER_URGENT_THRESHOLD
      ? C.COLORS.NEON_RED
      : C.COLORS.NEON_BLUE;
  ctx.lineWidth = C.TIMER_STROKE_WIDTH;
  ctx.stroke();

  // Time text
  ctx.font = `bold ${C.TIMER_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle =
    timeLeft <= C.TIMER_URGENT_THRESHOLD
      ? C.COLORS.NEON_RED
      : C.COLORS.NEON_BLUE;
  ctx.textAlign = "center";
  ctx.fillText(timeLeft.toString(), centerX, centerY + 20);
}

/**
 * Draw body content based on game state
 */
function drawBody(ctx, gameState) {
  const bodyY = 250;
  const bodyHeight = HEIGHT - 400;

  // Body background
  ctx.fillStyle = "#16213e";
  ctx.fillRect(100, bodyY, WIDTH - 200, bodyHeight);

  switch (gameState.status) {
    case "question":
      drawQuestionPhase(ctx, gameState, bodyY);
      break;
    case "reveal":
      drawRevealPhase(ctx, gameState, bodyY);
      break;
    case "celebration":
      drawCelebrationPhase(ctx, gameState, bodyY);
      break;
    default:
      drawWaitingPhase(ctx, bodyY);
  }
}

/**
 * Draw question phase
 */
function drawQuestionPhase(ctx, gameState, bodyY) {
  const questionY = bodyY + 50;

  // Question text
  ctx.font = `bold ${C.QUESTION_FONT_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_YELLOW;
  ctx.textAlign = "center";

  const questionText = gameState.questionText || "Loading question...";
  wrapText(
    ctx,
    questionText,
    WIDTH / 2,
    questionY,
    WIDTH - 300,
    C.QUESTION_FONT_SIZE + 10
  );

  // Options
  const options = gameState.options || [];
  const optionStartY = questionY + 150;
  const optionSpacing = 100;

  options.forEach((option, index) => {
    const optionY = optionStartY + index * optionSpacing;

    // Option background
    const isSelected = gameState.selectedAnswerIndex === index;
    ctx.fillStyle = isSelected ? C.COLORS.NEON_BLUE : "#0f3460";
    ctx.fillRect(WIDTH / 2 - 400, optionY - 30, 800, 70);

    // Option text
    ctx.font = `${C.OPTION_FONT_SIZE}px ${C.FONT_BODY}`;
    ctx.fillStyle = isSelected ? "#ffffff" : C.COLORS.NEON_GREEN;
    ctx.textAlign = "left";
    ctx.fillText(
      `${String.fromCharCode(65 + index)}. ${option || "Loading..."}`,
      WIDTH / 2 - 380,
      optionY
    );

    // Option border
    ctx.strokeStyle = isSelected ? C.COLORS.NEON_BLUE : "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.strokeRect(WIDTH / 2 - 400, optionY - 30, 800, 70);
  });
}

/**
 * Draw reveal phase
 */
function drawRevealPhase(ctx, gameState, bodyY) {
  const revealY = bodyY + 100;

  // Correct answer indicator
  ctx.font = `bold ${C.QUESTION_FONT_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_GREEN;
  ctx.textAlign = "center";
  ctx.fillText("ANSWER REVEALED!", WIDTH / 2, revealY);

  // Correct answer
  const correctIndex = gameState.correctAnswerIndex;
  const correctOption = (gameState.options || [])[correctIndex];
  if (correctOption) {
    ctx.font = `${C.OPTION_FONT_SIZE}px ${C.FONT_BODY}`;
    ctx.fillStyle = C.COLORS.NEON_YELLOW;
    ctx.fillText(`✓ Correct Answer: ${correctOption}`, WIDTH / 2, revealY + 80);
  }

  // Winners
  const correctAnswerers = gameState.correctAnswerers || [];
  if (correctAnswerers.length > 0) {
    ctx.font = `${C.OPTION_FONT_SIZE}px ${C.FONT_BODY}`;
    ctx.fillStyle = C.COLORS.NEON_BLUE;
    ctx.fillText(
      `Winners (${correctAnswerers.length}):`,
      WIDTH / 2,
      revealY + 160
    );

    const winnersY = revealY + 200;
    correctAnswerers.slice(0, 5).forEach((winner, index) => {
      ctx.fillText(
        `${index + 1}. ${winner.username}`,
        WIDTH / 2,
        winnersY + index * 40
      );
    });
  }
}

/**
 * Draw celebration phase
 */
function drawCelebrationPhase(ctx, gameState, bodyY) {
  const centerY = bodyY + 150;

  // Winner announcement
  ctx.font = `bold ${C.QUESTION_FONT_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_YELLOW;
  ctx.textAlign = "center";
  ctx.fillText("🎉 WINNER ANNOUNCEMENT! 🎉", WIDTH / 2, centerY);

  // Winner details
  const winnerUsername = gameState.winnerUsername || "Anonymous";
  ctx.font = `bold ${C.OPTION_FONT_SIZE + 10}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_GREEN;
  ctx.fillText(winnerUsername, WIDTH / 2, centerY + 80);

  // Winner message
  ctx.font = `${C.OPTION_FONT_SIZE}px ${C.FONT_BODY}`;
  ctx.fillStyle = C.COLORS.NEON_BLUE;
  ctx.fillText("Congratulations on your victory!", WIDTH / 2, centerY + 140);
}

/**
 * Draw waiting phase
 */
function drawWaitingPhase(ctx, bodyY) {
  const centerY = bodyY + 150;

  ctx.font = `bold ${C.QUESTION_FONT_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_BLUE;
  ctx.textAlign = "center";
  ctx.fillText("Waiting for Next Round...", WIDTH / 2, centerY);
}

/**
 * Draw leaderboard
 */
function drawLeaderboard(ctx, leaderboard) {
  const startX = WIDTH - 450;
  const startY = 250;

  // Leaderboard background
  ctx.fillStyle = "#0f3460";
  ctx.fillRect(startX - 20, startY - 20, 420, 400);

  // Leaderboard title
  ctx.font = `bold ${C.OPTION_FONT_SIZE}px ${C.FONT_TITLE}`;
  ctx.fillStyle = C.COLORS.NEON_YELLOW;
  ctx.textAlign = "left";
  ctx.fillText("TOP PLAYERS", startX, startY - 5);

  // Leaderboard entries
  (leaderboard || []).slice(0, 5).forEach((entry, index) => {
    const y = startY + 40 + index * 60;

    // Rank number
    ctx.font = `bold ${C.OPTION_FONT_SIZE - 10}px ${C.FONT_TITLE}`;
    ctx.fillStyle = C.COLORS.NEON_ORANGE;
    ctx.fillText(`${index + 1}.`, startX, y);

    // Username
    ctx.font = `${C.OPTION_FONT_SIZE - 12}px ${C.FONT_BODY}`;
    ctx.fillStyle = C.COLORS.NEON_GREEN;
    ctx.fillText(entry.username || "Anonymous", startX + 40, y);

    // Score
    ctx.font = `${C.OPTION_FONT_SIZE - 12}px ${C.FONT_BODY}`;
    ctx.fillStyle = C.COLORS.NEON_BLUE;
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(entry.score || 0)), startX + 400, y);
  });
}

/**
 * Draw footer
 */
function drawFooter(ctx) {
  const footerY = HEIGHT - 80;

  // Footer background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, footerY, WIDTH, 80);

  // Footer text
  ctx.font = `24px ${C.FONT_BODY}`;
  ctx.fillStyle = C.COLORS.NEON_PURPLE;
  ctx.textAlign = "center";
  ctx.fillText(
    "Join the quiz and test your knowledge! | Subscribe for more quizzes!",
    WIDTH / 2,
    footerY + 45
  );
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, currentY);
}

module.exports = {
  drawQuizUI,
  WIDTH,
  HEIGHT,
  FPS,
};
