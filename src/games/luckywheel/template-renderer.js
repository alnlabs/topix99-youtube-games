/**
 * Lucky Wheel Game Template Renderer
 *
 * Uses the showdown-layout template to render lucky wheel game UI.
 * Converts game state to UI data format expected by the template.
 */

const template = require("../../templates/showdown-layout");
const {
  uiComponents,
  designSystem,
} = require("../../templates/showdown-layout");

const { COLORS, LAYOUT, TYPOGRAPHY } = designSystem;

// Canvas dimensions
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

/**
 * Convert game state to UI data format
 * @param {Object} gameState - Game state from lucky wheel game
 * @param {Array} leaderboard - Leaderboard array
 * @returns {Object} UI data object for template
 */
function prepareUIData(gameState, leaderboard) {
  // Determine wheel status for UI
  const getWheelStatus = () => {
    switch (gameState.status) {
      case "spinning":
        return "spinning";
      case "winner":
      case "finished":
        return "result";
      case "cooldown":
        return "cooldown";
      default:
        return "waiting";
    }
  };

  // Format participants for display
  const participants = Array.from(gameState.participants?.values?.() || []);

  return {
    layout: {
      title: "LUCKY WHEEL",
      badge: `ROUND ${gameState.round || 1}`,
      timer:
        (gameState.status === "waiting" || gameState.status === "cooldown") &&
        gameState.timerEnd
          ? {
              timeLeft: Math.max(
                0,
                Math.ceil((gameState.timerEnd - Date.now()) / 1000)
              ),
              totalTime: gameState.status === "waiting" ? 30000 : 10000, // 30s for waiting, 10s for cooldown
              timerEnd: gameState.timerEnd || null,
            }
          : null,
    },
    content: {
      wheel: {
        status: getWheelStatus(),
        values: gameState.wheelValues || [],
        currentNumber: gameState.currentNumber || null,
        participants: participants.length,
        spinning: gameState.status === "spinning",
      },
      header: {
        status: gameState.status || "waiting",
        message:
          gameState.status === "waiting"
            ? "GUESS THE NUMBER ON THE WHEEL!"
            : gameState.status === "spinning"
            ? "SPINNING..."
            : gameState.status === "winner"
            ? "WINNER ANNOUNCEMENT!"
            : gameState.status === "cooldown"
            ? "NEXT ROUND STARTING SOON"
            : "WAITING...",
      },
    },
    sidebar: {
      leaderboard: (leaderboard || []).slice(0, 10).map((player, index) => {
        // Handle different leaderboard formats
        const username =
          player.username || player.name || `Player ${index + 1}`;
        const score = player.wins || player.score || 0;
        const playerId = player.userId || username;

        return {
          label: username,
          value: score,
          highlight: false, // No specific highlight for lucky wheel
        };
      }),
      participants: {
        count: participants.length,
        lastGuesser:
          participants.length > 0
            ? participants[participants.length - 1]?.username || "Someone"
            : null,
      },
    },
    overlay:
      gameState.status === "winner" && gameState.winners?.length > 0
        ? {
            type: "celebration",
            winner: gameState.winners[0],
            number: gameState.currentNumber,
          }
        : null,
    animations: {
      phase: gameState.status || "waiting",
      transitions: {
        reveal: gameState.status === "winner",
        celebration: gameState.status === "winner",
      },
    },
  };
}

/**
 * Render lucky wheel UI using template
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} gameState - Game state
 * @param {Array} leaderboard - Leaderboard array
 */
function renderLuckyWheelUI(ctx, gameState, leaderboard) {
  // Prepare UI data from game state
  const uiData = prepareUIData(gameState, leaderboard);

  // Use template's default layout renderer for containers
  const {
    renderDefaultLayout,
  } = require("../../templates/showdown-layout/layout-renderer");
  const layout = renderDefaultLayout(ctx, uiData);

  // Extract main container row dimensions from layout
  const { mainRow2, mainRow3 } = layout; // Row 2 = Wheel/Game content, Row 3 = Participants/Info

  // Render Main Row 2: Wheel Area (using consistent styling with quiz)
  if (uiData.content.wheel) {
    const {
      drawMultilingualText,
      drawRoundedRect,
      hslAlpha,
    } = require("../../templates/showdown-layout/utils");
    const { CONTAINER } = designSystem;

    // Use container margin for outer padding, then add internal padding
    const wheelBoxPadding = LAYOUT.SPACING_MEDIUM;
    const wheelBoxX = mainRow2.x + wheelBoxPadding;
    const wheelBoxY = mainRow2.y + wheelBoxPadding;
    const wheelBoxWidth = mainRow2.width - wheelBoxPadding * 2;
    const wheelBoxHeight = mainRow2.height - wheelBoxPadding * 2;

    // Draw wheel background box with consistent styling
    drawRoundedRect(
      ctx,
      wheelBoxX,
      wheelBoxY,
      wheelBoxWidth,
      wheelBoxHeight,
      20,
      hslAlpha(COLORS.CARD_BACKGROUND, 0.85),
      hslAlpha(COLORS.NEON_YELLOW, 0.3),
      3
    );

    // Draw the wheel visualization in the center of the box
    const centerX = wheelBoxX + wheelBoxWidth / 2;
    const centerY = wheelBoxY + wheelBoxHeight / 2;
    const radius = Math.min(wheelBoxWidth, wheelBoxHeight) * 0.35;

    // Draw wheel circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = hslAlpha(COLORS.BACKGROUND, 0.9);
    ctx.fill();
    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw wheel sectors if in waiting/spinning state
    if (
      uiData.content.wheel.values &&
      (uiData.content.wheel.status === "waiting" ||
        uiData.content.wheel.status === "spinning")
    ) {
      const values = uiData.content.wheel.values;
      const slices = values.length;

      for (let i = 0; i < slices; i++) {
        const startAngle = (i * 2 * Math.PI) / slices - Math.PI / 2;
        const endAngle = ((i + 1) * 2 * Math.PI) / slices - Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Alternate colors for sectors
        ctx.fillStyle = i % 2 === 0 ? COLORS.NEON_YELLOW : COLORS.BACKGROUND;
        ctx.fill();

        // Draw sector number
        const midAngle = (startAngle + endAngle) / 2;
        const textRadius = radius * 0.7;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;

        ctx.fillStyle = i % 2 === 0 ? COLORS.BACKGROUND : COLORS.NEON_YELLOW;
        ctx.font = `bold ${TYPOGRAPHY.SIZE_MEDIUM}px ${TYPOGRAPHY.FONT_DISPLAY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(values[i]), textX, textY);
      }
    }

    // Draw pointer
    ctx.save();
    ctx.translate(centerX, centerY - radius + 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-15, -25);
    ctx.lineTo(15, -25);
    ctx.closePath();
    ctx.fillStyle = COLORS.NEON_RED;
    ctx.fill();
    ctx.restore();

    // Draw current number if available (in result state)
    if (
      uiData.content.wheel.currentNumber !== null &&
      (uiData.content.wheel.status === "result" ||
        uiData.content.wheel.status === "winner")
    ) {
      // Draw number display box below the wheel
      const numberBoxWidth = 300;
      const numberBoxHeight = 120;
      const numberBoxX = centerX - numberBoxWidth / 2;
      const numberBoxY = centerY + radius + 40;

      drawRoundedRect(
        ctx,
        numberBoxX,
        numberBoxY,
        numberBoxWidth,
        numberBoxHeight,
        20,
        hslAlpha(COLORS.CARD_BACKGROUND, 0.9),
        hslAlpha(COLORS.NEON_GOLD, 0.5),
        4
      );

      // Draw winning number
      ctx.fillStyle = COLORS.NEON_GOLD;
      ctx.font = `bold ${TYPOGRAPHY.SIZE_EXTRA_LARGE}px ${TYPOGRAPHY.FONT_DISPLAY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(uiData.content.wheel.currentNumber),
        centerX,
        numberBoxY + numberBoxHeight / 2
      );
    }
  }

  // Main Row 3 is now handled by the template's default layout renderer
  // This ensures consistency with the quiz game layout

  // Sidebar is now handled by the template's default layout renderer
  // Game-specific content (wheel and info) is rendered above
}

// Register lucky wheel renderer with template system
template.registerTemplate("luckywheel", {
  render: renderLuckyWheelUI,
  WIDTH,
  HEIGHT,
  FPS,
  uiComponents,
  config: {
    name: "Lucky Wheel",
    version: "1.0.0",
    gameType: "wheel",
  },
});

module.exports = {
  renderLuckyWheelUI,
  prepareUIData,
  WIDTH,
  HEIGHT,
  FPS,
};
