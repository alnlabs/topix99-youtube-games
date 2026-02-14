/**
 * Quiz Game Renderer
 * Canvas-based rendering for YouTube streaming
 */

const path = require("path");
const { registerFont } = require("canvas");
const C = require("./constants");
const { questions } = require("./data");
const { shapes, calculateFontSizeForHeight } = require("../../services");
const { drawRoundedRect, drawCircle } = shapes;
const { normalizeQuestion } = require("./utils");

// Canvas dimensions
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

// Register fonts
function registerFonts() {
  try {
    const assetsPath = path.join(__dirname, "../../../assets");
    registerFont(path.join(assetsPath, "fonts/MouldyCheese-Regular.ttf"), {
      family: "MouldyCheese",
    });
    registerFont(path.join(assetsPath, "fonts/Orbitron-Bold.ttf"), {
      family: "Orbitron",
    });
    console.log("✅ Quiz fonts loaded successfully");
  } catch (e) {
    console.error("❌ Quiz font loading failed:", e.message);
  }
}

registerFonts();

// Background gradient colors
const BACKGROUND_COLORS = [
  ["#0a0a1a", "#1a1a2e", "#16213e"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
];

/**
 * Draw animated background
 */
function drawBackground(ctx, palette = BACKGROUND_COLORS[0]) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  palette.forEach((c, i) =>
    grad.addColorStop(i / (palette.length - 1), c)
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Add subtle animated particles (simple version)
  const time = Date.now() * 0.001;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 50; i++) {
    const x = (Math.sin(time + i) * 0.5 + 0.5) * WIDTH;
    const y = (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * HEIGHT;
    const size = 2 + Math.sin(time + i) * 2;
    drawCircle(ctx, x, y, size, C.COLORS.NEON_BLUE);
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Draw circular timer
 */
function drawTimer(ctx, x, y, timeLeft, totalTime) {
  const size = C.TIMER_SIZE;
  const strokeWidth = C.TIMER_STROKE_WIDTH;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const offset = circumference * (1 - progress);
  const isUrgent = timeLeft <= C.TIMER_URGENT_THRESHOLD;

  ctx.save();
  ctx.translate(x, y);

  // Background circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Progress circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
  ctx.strokeStyle = isUrgent ? C.COLORS.NEON_PINK : C.COLORS.NEON_BLUE;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // Timer text
  ctx.fillStyle = isUrgent ? C.COLORS.NEON_PINK : "#FFFFFF";
  ctx.font = `bold 32px '${C.FONT_TITLE}'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(timeLeft), 0, 0);

  ctx.restore();
}

/**
 * Helper function to draw multilingual text (3 languages stacked)
 * Expects normalized displayText format from utils
 */
function drawMultilingualText(ctx, displayText, x, y, fontSize, maxWidth, textAlign = "left") {
  if (typeof displayText === "string") {
    // Regular text, just draw it
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = textAlign;
    ctx.textBaseline = "top";
    ctx.fillText(displayText, x, y);
    return y;
  }

  // Multilingual text object with telugu, hindi, english
  const languages = [
    { key: "telugu", label: "తెలుగు", color: "#FFD700" },
    { key: "hindi", label: "हिंदी", color: "#FF6B6B" },
    { key: "english", label: "English", color: "#4ECDC4" }
  ];

  let currentY = y;
  const lineHeight = fontSize * 1.3; // Better spacing between languages
  const languageSpacing = fontSize * 0.3; // Extra spacing between different languages

  languages.forEach((lang, langIndex) => {
    if (displayText[lang.key]) {
      ctx.fillStyle = lang.color;
      ctx.font = `${fontSize}px '${C.FONT_TITLE}'`;
      ctx.textBaseline = "top";

      // Word wrap for long text with proper alignment
      const words = displayText[lang.key].split(" ");
      let line = "";
      let lineY = currentY;
      const lines = [];

      // First, calculate all lines for this language
      for (const word of words) {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          lines.push(line.trim());
          line = word + " ";
        } else {
          line = testLine;
        }
      }
      if (line.length > 0) {
        lines.push(line.trim());
      }

      // Draw each line with proper alignment
      lines.forEach((lineText, lineIndex) => {
        ctx.textAlign = textAlign;

        // For center alignment, ensure text is properly centered
        // Canvas textAlign handles this automatically when set before fillText
        ctx.fillText(lineText, x, lineY);

        // Move to next line
        if (lineIndex < lines.length - 1) {
          lineY += lineHeight * 0.85; // Tighter spacing within same language
        }
      });

      // Update currentY for next language
      if (lines.length > 0) {
        currentY = lineY + languageSpacing;
      } else {
        currentY += lineHeight;
      }
    }
  });

  return currentY;
}

/**
 * Draw answer option
 */
function drawAnswerOption(ctx, x, y, width, height, label, text, isSelected, isCorrect, isRevealed, index) {
  const colors = [
    C.COLORS.OPTION_A,
    C.COLORS.OPTION_B,
    C.COLORS.OPTION_C,
    C.COLORS.OPTION_D,
  ];
  const optionColor = colors[index] || "#FFFFFF";

  ctx.save();
  ctx.translate(x, y);

  // Determine background color
  let bgColor = `${optionColor}33`; // 20% opacity
  let borderColor = `${optionColor}66`; // 40% opacity

  if (isRevealed && isCorrect) {
    bgColor = `${C.COLORS.NEON_GREEN}33`;
    borderColor = C.COLORS.NEON_GREEN;
  } else if (isRevealed && isSelected && !isCorrect) {
    bgColor = `${C.COLORS.NEON_PINK}33`;
    borderColor = C.COLORS.NEON_PINK;
  } else if (isSelected) {
    bgColor = `${optionColor}66`;
    borderColor = optionColor;
  }

  // Draw option box
  drawRoundedRect(ctx, 0, 0, width, height, 15, bgColor, borderColor, 2);

  // Draw label (A, B, C, D)
  ctx.fillStyle = optionColor;
  ctx.font = `bold 28px '${C.FONT_TITLE}'`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, 20, 10);

  // Draw option text (expects normalized format from utils)
  // text should be an object with {isMultilingual, displayText} or a string (for backward compatibility)
  const optionData = typeof text === "object" && text !== null && text.displayText !== undefined
    ? text
    : { isMultilingual: false, displayText: text };

  const isMultilingual = optionData.isMultilingual;
  const displayText = optionData.displayText;
  const optionFontSize = isMultilingual ? 20 : C.OPTION_FONT_SIZE; // Slightly larger for readability
  const textX = 70; // More space from label
  const textY = isMultilingual ? 15 : height / 2; // Better vertical positioning
  const maxTextWidth = width - 120; // Leave space for label and checkmark

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  if (isMultilingual) {
    // Draw multilingual text with proper alignment
    drawMultilingualText(ctx, displayText, textX, textY, optionFontSize, maxTextWidth, "left");
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${optionFontSize}px '${C.FONT_TITLE}'`;
    ctx.textBaseline = "middle";
    ctx.fillText(displayText, textX, height / 2);
  }

  // Draw checkmark or X if revealed
  if (isRevealed) {
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `36px '${C.FONT_TITLE}'`;
    if (isCorrect) {
      ctx.fillText("✅", width - 20, height / 2);
    } else if (isSelected) {
      ctx.fillText("❌", width - 20, height / 2);
    }
  }

  ctx.restore();
}

/**
 * Draw question and options
 */
function drawQuestion(ctx, gameState, safeX, safeY, safeWidth, safeHeight) {
  const rawQuestion = questions[gameState.currentQuestionIndex];
  if (!rawQuestion) return;

  // Normalize question using utility
  const question = normalizeQuestion(rawQuestion);

  // Position within safe area
  const centerX = safeX + safeWidth / 2;
  const questionY = safeY + 120; // Start below title

  // Calculate options dimensions first
  const isMultilingual = question.isMultilingual ||
    (question.options && question.options.some(opt => opt.isMultilingual));
  const optionHeight = isMultilingual ? 160 : 100; // More height for multilingual options (3 languages)
  const optionSpacing = 15; // Slightly tighter spacing
  const totalOptionsHeight = 4 * optionHeight + 3 * optionSpacing; // 4 options, 3 gaps
  const optionWidth = Math.min(850, safeWidth - 40); // Slightly wider for better text display

  // Draw question (multilingual or regular) and track its height
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const maxWidth = Math.min(1400, safeWidth - 40); // Don't exceed safe width

  // Estimate question height first (for box sizing) - will be recalculated after drawing
  let estimatedQuestionHeight = 120; // Default height
  if (question.isMultilingual) {
    estimatedQuestionHeight = 180; // More space for 3 languages with proper spacing
  }

  // Draw question box background (will be adjusted after we know actual height)
  const questionBoxPadding = 25;
  const questionBoxY = questionY - questionBoxPadding;
  const questionBoxHeight = estimatedQuestionHeight + (questionBoxPadding * 2);
  const questionBoxWidth = Math.min(maxWidth + 60, safeWidth - 20);

  // Draw question box with proper background
  drawRoundedRect(
    ctx,
    centerX - questionBoxWidth / 2,
    questionBoxY,
    questionBoxWidth,
    questionBoxHeight,
    20,
    "rgba(20, 20, 40, 0.85)", // Darker background for better contrast
    C.COLORS.NEON_PINK,
    3
  );

  // Draw question text
  let questionEndY = questionY;
  if (question.isMultilingual) {
    // Draw multilingual question (all 3 languages) - centered
    const questionFontSize = 30; // Optimized size for readability
    questionEndY = drawMultilingualText(ctx, question.displayText, centerX, questionY, questionFontSize, maxWidth - 20, "center");
    // Add padding to end
    questionEndY += 15;
  } else {
    // Regular question text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${C.QUESTION_FONT_SIZE}px '${C.FONT_TITLE}'`;

    // Word wrap for long questions (respect safe width)
    const words = question.displayText.split(" ");
    let line = "";
    let y = questionY;

    for (const word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, centerX, y);
        line = word + " ";
        y += 60;
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      ctx.fillText(line, centerX, y);
      questionEndY = y + 60; // Add line height
    } else {
      questionEndY = questionY + 60;
    }
  }

  // Calculate options start Y: below question with spacing, ensuring all 4 options fit
  const questionSpacing = 40; // Space between question and options
  const calculatedOptionsStartY = questionEndY + questionSpacing;
  const maxOptionsStartY = safeY + safeHeight - totalOptionsHeight - 20; // 20px padding from bottom

  // Use the calculated position, but ensure all options fit
  const optionsStartY = Math.min(calculatedOptionsStartY, maxOptionsStartY);

  // Draw options
  const isRevealed = gameState.status === "reveal" || gameState.status === "celebration";
  const labels = ["A", "B", "C", "D"];

  question.options.forEach((option, index) => {
    const optionX = centerX - optionWidth / 2;
    const optionY = optionsStartY + index * (optionHeight + optionSpacing);
    // Check if this answer was selected by any participant
    let isSelected = false;
    if (gameState.participants && gameState.participants instanceof Map) {
      gameState.participants.forEach((participant) => {
        if (participant.answerIndex === index) {
          isSelected = true;
        }
      });
    }
    const isCorrect = index === question.correctIndex;

    drawAnswerOption(
      ctx,
      optionX,
      optionY,
      optionWidth,
      optionHeight,
      labels[index],
      option,
      isSelected,
      isCorrect,
      isRevealed,
      index
    );
  });
}

/**
 * Draw leaderboard
 */
function drawLeaderboard(ctx, players, winnerId, safeX, safeY, safeWidth, safeHeight) {
  // Position on right side, within safe area
  const lbWidth = 280;
  const lbX = safeX + safeWidth - lbWidth; // Right-aligned within safe area
  const lbY = safeY + 60; // Below title
  const itemHeight = 50;

  // Calculate leaderboard height to fit within safe area
  const maxLbHeight = safeY + safeHeight - lbY - 20; // Leave 20px padding
  const lbHeight = Math.min(350, maxLbHeight);

  // Background
  drawRoundedRect(ctx, lbX, lbY, lbWidth, lbHeight, 15, "rgba(0, 0, 0, 0.7)");

  // Title
  ctx.fillStyle = C.COLORS.NEON_YELLOW;
  ctx.font = `bold 24px '${C.FONT_TITLE}'`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("TOP 5", lbX + 20, lbY + 15);

  // Players
  const top5 = [...players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, C.TOP_PLAYERS_COUNT);

  const maxScore = Math.max(...top5.map(p => p.score || 0), 1);

  top5.forEach((player, index) => {
    const y = lbY + 60 + index * itemHeight;
    const isWinner = (player.userId || player.username) === winnerId;

    // Rank icon
    const icons = ["👑", "🥈", "🥉", "4", "5"];
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `20px '${C.FONT_TITLE}'`;
    ctx.fillText(icons[index] || String(index + 1), lbX + 20, y + 15);

    // Name
    const name = (player.username || "Anonymous").substring(0, 15);
    ctx.fillStyle = isWinner ? C.COLORS.NEON_YELLOW : "#FFFFFF";
    ctx.font = `bold 18px '${C.FONT_BODY}'`;
    ctx.fillText(name, lbX + 50, y + 15);

    // Score
    ctx.textAlign = "right";
    ctx.fillText(String(player.score || 0), lbX + lbWidth - 20, y + 15);
    ctx.textAlign = "left";

    // Score bar
    const barWidth = ((player.score || 0) / maxScore) * (lbWidth - 100);
    drawRoundedRect(ctx, lbX + 50, y + 40, lbWidth - 100, 4, 2, C.COLORS.NEON_BLUE);
    if (barWidth > 0) {
      drawRoundedRect(ctx, lbX + 50, y + 40, barWidth, 4, 2, C.COLORS.NEON_GREEN);
    }
  });
}

/**
 * Draw recent answers
 */
function drawRecentAnswers(ctx, recentAnswers, safeX, safeY, safeWidth, safeHeight) {
  // Position on right side, below leaderboard, within safe area
  const raWidth = 280;
  const raX = safeX + safeWidth - raWidth; // Right-aligned within safe area
  const raY = safeY + 440; // Below leaderboard
  const itemHeight = 40;

  // Calculate recent answers height to fit within safe area
  const maxRaHeight = safeY + safeHeight - raY - 20; // Leave 20px padding
  const raHeight = Math.min(250, maxRaHeight);

  // Background
  drawRoundedRect(ctx, raX, raY, raWidth, raHeight, 15, "rgba(0, 0, 0, 0.7)");

  // Title
  ctx.fillStyle = C.COLORS.NEON_PINK;
  ctx.font = `bold 20px '${C.FONT_TITLE}'`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RECENT", raX + 20, raY + 15);

  // Recent answers
  const latest = recentAnswers
    .filter(a => a.correct)
    .slice(-C.RECENT_ANSWERS_COUNT)
    .reverse();

  if (latest.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = `16px '${C.FONT_TITLE}'`;
    ctx.fillText("Waiting for answers...", raX + 20, raY + 60);
    return;
  }

  latest.forEach((entry, index) => {
    const y = raY + 50 + index * itemHeight;

    // Avatar (emoji)
    ctx.font = `20px '${C.FONT_TITLE}'`;
    ctx.fillText(entry.playerAvatar || "🎉", raX + 20, y + 10);

    // Name
    const name = (entry.playerName || "Anonymous").substring(0, 12);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `16px '${C.FONT_BODY}'`;
    ctx.fillText(name, raX + 50, y + 10);

    // Score
    ctx.textAlign = "right";
    ctx.fillText(String(entry.score || 0), raX + raWidth - 20, y + 10);
    ctx.textAlign = "left";
  });
}

/**
 * Draw celebration overlay
 */
function drawCelebration(ctx, winner, safeX, safeY, safeWidth, safeHeight) {
  if (!winner) return;

  // Confetti effect (simplified) - within safe area
  const time = Date.now() * 0.01;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 30; i++) {
    const x = safeX + (Math.sin(time + i) * 0.5 + 0.5) * safeWidth;
    const y = safeY + (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * safeHeight;
    const colors = [C.COLORS.NEON_BLUE, C.COLORS.NEON_PINK, C.COLORS.NEON_YELLOW, C.COLORS.NEON_GREEN];
    const color = colors[i % colors.length];
    drawCircle(ctx, x, y, 8, color);
  }
  ctx.globalAlpha = 1.0;

  // Celebration box - centered in safe area
  const centerX = safeX + safeWidth / 2;
  const centerY = safeY + safeHeight / 2;
  const boxWidth = Math.min(600, safeWidth - 40);
  const boxHeight = 300;

  drawRoundedRect(
    ctx,
    centerX - boxWidth / 2,
    centerY - boxHeight / 2,
    boxWidth,
    boxHeight,
    20,
    "rgba(0, 0, 0, 0.9)",
    C.COLORS.NEON_YELLOW,
    3
  );

  // Winner text
  ctx.fillStyle = C.COLORS.NEON_YELLOW;
  ctx.font = `bold 32px '${C.FONT_TITLE}'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡ FASTEST ANSWER ⚡", centerX, centerY - 80);

  // Winner name
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 48px '${C.FONT_TITLE}'`;
  ctx.fillText(winner.username || "Winner", centerX, centerY);

  // Points
  ctx.fillStyle = C.COLORS.NEON_GREEN;
  ctx.font = `bold 36px '${C.FONT_BODY}'`;
  ctx.fillText(`+${C.BASE_SCORE} points!`, centerX, centerY + 60);
}

/**
 * Main render function
 */
function drawQuizUI(ctx, gameState, leaderboard) {
  // Clear canvas
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Draw background
  drawBackground(ctx);

  // Calculate safe area (avoiding mobile keyboard and YouTube edges)
  const safeTop = C.SAFE_MARGINS.top;
  const safeBottom = C.SAFE_MARGINS.bottom;
  const safeLeft = C.SAFE_MARGINS.left;
  const safeRight = C.SAFE_MARGINS.right;
  const safeWidth = WIDTH - safeLeft - safeRight;
  const safeHeight = HEIGHT - safeTop - safeBottom;
  const safeX = safeLeft;
  const safeY = safeTop;

  // Draw game title (within safe area)
  ctx.fillStyle = C.COLORS.NEON_BLUE;
  ctx.font = `bold 36px '${C.FONT_TITLE}'`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("QUIZ SHOWDOWN", safeX, safeY);

  // Draw timer (top right, within safe area)
  if (gameState.status === "question" && gameState.timeLeft > 0) {
    const question = questions[gameState.currentQuestionIndex];
    if (question) {
      drawTimer(ctx, WIDTH - safeRight - 100, safeY + 40, gameState.timeLeft, question.timeLimit);
    }
  }

  // Draw question and options (within safe area)
  drawQuestion(ctx, gameState, safeX, safeY, safeWidth, safeHeight);

  // Draw leaderboard (within safe area, right side)
  drawLeaderboard(ctx, leaderboard || [], gameState.winnerId, safeX, safeY, safeWidth, safeHeight);

  // Draw recent answers (within safe area, right side)
  drawRecentAnswers(ctx, gameState.recentAnswers || [], safeX, safeY, safeWidth, safeHeight);

  // Draw celebration if active (centered in safe area)
  if (gameState.status === "celebration" && gameState.winnerId) {
    const winner = leaderboard?.find(p =>
      (p.userId || p.username) === gameState.winnerId
    );
    if (winner) {
      drawCelebration(ctx, winner, safeX, safeY, safeWidth, safeHeight);
    }
  }
}

module.exports = {
  WIDTH,
  HEIGHT,
  FPS,
  drawQuizUI,
  drawBackground,
  drawTimer,
  drawQuestion,
  drawLeaderboard,
  drawRecentAnswers,
  drawCelebration,
};
