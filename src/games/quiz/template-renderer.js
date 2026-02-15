// Default to neon-dream-layout
const defaultTemplate = require("../../templates/neon-dream-layout");
const { createCanvas, registerFont } = require("canvas");
const path = require("path");
const { logger } = require("../../services");

// constants
const C = require("./constants");
const { WIDTH, HEIGHT, FPS } = C;

// Register fonts
try {
  registerFont(
    path.join(__dirname, "../../../assets/fonts/MouldyCheese-Regular.ttf"),
    { family: "MouldyCheese" }
  );
  logger.info("[template-renderer] Fonts registered successfully");
} catch (err) {
  console.error("[template-renderer] Failed to register fonts:", err.message);
}

// Layout Caching
let mainAreaCanvas = null;
let mainAreaCtx = null;
let lastMainAreaKey = "";

function getMainAreaKey(gameState) {
  return JSON.stringify({
    q: gameState.questionText,
    o: gameState.options,
    s: gameState.status,
    c: gameState.correctAnswerIndex,
    sel: gameState.selectedAnswerIndex,
  });
}




/**
 * Main render function for Quiz UI
 */
function renderQuizUI(ctx, gameState, leaderboard, timestamp = Date.now(), template = defaultTemplate) {
  if (timestamp % 1000 < 40) { // Log once per second approx
     console.log("[template-renderer] Rendering with template:", template.name || "unknown");
  }
  const { uiComponents, designSystem, utils } = template;
  const { COLORS, TYPOGRAPHY } = designSystem;
  const { Background, Card, Header, Timer, Button, Celebration } = uiComponents;
  const { drawMultilingualText, easeOutQuad } = utils;
  const renderDefaultLayout = template.renderDefaultLayout || template.layoutRenderer.renderDefaultLayout;

  // 1. Render Dynamic Background
  Background.render(ctx, timestamp);

  // Prepare UI data
  const uiData = {
    layout: {
      title: gameState.title || "QUIZ SHOWDOWN",
      badge: `Round ${gameState.round || 1}`,
      timer: gameState.timeLeft !== undefined ? {
        timeLeft: gameState.timeLeft,
        totalTime: gameState.totalTime || 15,
      } : null,
    },
    sidebar: {
      leaderboard: leaderboard || [],
      recentAnswers: gameState.recentAnswers || [],
    },
  };

  // 2. Render Base Layout
  const layout = renderDefaultLayout(ctx, uiData, { skipBackground: true });

  const { Row2X, Row2Y, Row2W, Row2H } = {
    Row2X: layout.mainRow2.x,
    Row2Y: layout.mainRow2.y,
    Row2W: layout.mainRow2.width,
    Row2H: layout.mainRow2.height,
  };

  const { Row3X, Row3Y, Row3W, Row3H } = {
    Row3X: layout.mainRow3.x,
    Row3Y: layout.mainRow3.y,
    Row3W: layout.mainRow3.width,
    Row3H: layout.mainRow3.height,
  };

  // 3. Render Questions/Direct (Non-cached for now to debug)
  switch (gameState.status) {
    case "question":
    case "reveal":
      Card.render(ctx, { title: gameState.status === "reveal" ? "ANSWER REVEALED" : "QUESTION" }, Row2X, Row2Y, Row2W, Row2H);
      ctx.save();
      const questionFont = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
      drawMultilingualText(ctx, gameState.questionText || "Loading...", Row2X + 30, Row2Y + 60, Row2W - 60, questionFont, COLORS.FOREGROUND);
      ctx.restore();
      break;
    case "next":
      Card.render(ctx, { title: "GET READY" }, Row2X, Row2Y, Row2W, Row2H + Row3H + 20);
      ctx.save();
      ctx.font = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.textAlign = "center";
      ctx.fillText("Next question loading...", Row2X + Row2W / 2, Row2Y + (Row2H + Row3H) / 2);
      ctx.restore();
      break;
  }

  // 4. Render Dynamic Parts (Options and Celebration)
  if (gameState.status === "question" || gameState.status === "reveal") {
    const options = gameState.options || [];
    const labels = ["A", "B", "C", "D"];
    const margin = 16;
    const buttonWidth = (Row3W - margin) / 2;
    const buttonHeight = (Row3H - margin) / 2;

    if (!gameState.questionStartTime) gameState.questionStartTime = timestamp;

    options.forEach((option, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = Row3X + col * (buttonWidth + margin);
      const by = Row3Y + row * (buttonHeight + margin);

      const staggerDelay = index * 150;
      const progress = Math.max(0, Math.min(1, (timestamp - gameState.questionStartTime - staggerDelay) / 400));
      if (progress <= 0) return;

      const easedProgress = easeOutQuad(progress);
      const renderY = by + (1 - easedProgress) * 50;

      let status = "default";
      if (gameState.status === "reveal") {
        status = index === gameState.correctAnswerIndex ? "correct" : "incorrect";
      } else if (gameState.selectedAnswerIndex === index) {
        status = "selected";
      }

      ctx.save();
      ctx.globalAlpha = easedProgress;
      Button.render(ctx, { label: option, prefix: labels[index], status }, bx, renderY, buttonWidth, buttonHeight);
      ctx.restore();
    });
  }

  if (gameState.status === "celebration" || gameState.status === "reveal") {
    Celebration?.render(ctx, {
      winnerName: gameState.winnerUsername,
      winnerAvatar: gameState.winnerAvatar || "🏆",
      isVisible: gameState.status === "celebration",
    }, timestamp);
  }
}

module.exports = {
  renderQuizUI,
  WIDTH,
  HEIGHT,
  FPS,
};
