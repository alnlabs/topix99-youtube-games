/**
 * Shared renderer module for Lucky Wheel game
 * Contains all common drawing functions used by both live streaming and test mode
 */

const path = require("path");
const { registerFont } = require("canvas");
const C = require("../games/luckywheel/constants");
const { drawRoundedRect, drawRect, drawCircle, drawTriangle, drawProgressBar, drawSector } = require("../utils/shapes");
const { calculateFontSizeForHeight } = require("../utils/font-helper");

// Canvas dimensions
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

// Register fonts (called once on module load)
function registerFonts() {
  try {
    registerFont(path.join(__dirname, "../assets/fonts/MouldyCheese-Regular.ttf"), {
      family: "MouldyCheese",
    });
    registerFont(path.join(__dirname, "../assets/fonts/Orbitron-Bold.ttf"), {
      family: "Orbitron",
    });
    registerFont(path.join(__dirname, "../assets/fonts/BebasNeue-Regular.ttf"), {
      family: "Bebas",
    });
    registerFont(path.join(__dirname, "../assets/fonts/LeagueSpartan-Bold.ttf"), {
      family: "League",
    });
    console.log("✅ Fonts loaded successfully");
  } catch (e) {
    console.error("❌ Font loading failed:", e.message);
  }
}

// Register fonts on module load
registerFonts();

// Background palettes
const palettes = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77", "#ffaf7b"],
];

/**
 * Draw background gradient
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} palette - Optional palette override (defaults to first palette)
 */
function drawBackground(ctx, palette = palettes[0]) {
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  palette.forEach((c, i) =>
    grad.addColorStop(i / (palette.length - 1), c)
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/**
 * Draw winner celebration UI
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} cx - Wheel center X
 * @param {number} cy - Wheel center Y
 * @param {number} r - Wheel radius
 * @param {Object} s - Game state
 */
function drawWinnerUI(ctx, cx, cy, r, s) {
  if (!s.currentNumber) return;

  const now = Date.now();
  const pulse = Math.sin(now / 150) * 15;
  const rotation = now / 1000;
  const glow = 20 + Math.sin(now / 300) * 20;

  // Get winner username from celebration or winners array
  const winnerUsername = s.celebration?.username || (s.winners && s.winners.length > 0 ? s.winners[0].username : null);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.save();
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.3;
  // Draw celebration rays (triangles) - MODIFY: Change "#FFD700" (gold) to change ray color
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    drawTriangle(ctx, 0, 0, -80, r + 500, 80, r + 500, "#FFD700");
  }
  ctx.restore();

  // Set shadow for celebration box
  ctx.shadowBlur = 15;
  ctx.shadowColor = "black";
  // Draw celebration box - MODIFY: Change "#FF3B30" (red) and dimensions to customize celebration appearance
  // Make box taller if we have a username to display
  const boxHeight = winnerUsername ? 120 : 80;
  drawRoundedRect(ctx, -225, -r - 110 + pulse / 2, 450, boxHeight, 15, "#FF3B30");
  // Reset shadow
  ctx.shadowBlur = 0;

  ctx.fillStyle = "white";
  ctx.font = "60px 'MouldyCheese'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LUCKY WINNER", 0, -r - 110 + pulse / 2 + (winnerUsername ? 30 : 40));

  // Display winner username if available
  if (winnerUsername) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 45px 'MouldyCheese'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Truncate long usernames
    // Move username down slightly (changed from 80 to 90)
    const displayName = winnerUsername.length > 20 ? winnerUsername.substring(0, 17) + "..." : winnerUsername;
    ctx.fillText(displayName, 0, -r - 110 + pulse / 2 + 90);
  }

  // Draw winning number with high contrast - use white with black outline for visibility
  ctx.font = `bold ${200 + pulse}px 'MouldyCheese'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Draw black outline/stroke for contrast
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 8;
  ctx.shadowBlur = 0; // Disable shadow for stroke
  ctx.strokeText(String(s.currentNumber), 0, 70);

  // Draw white fill for high contrast against dark background
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowBlur = glow;
  ctx.shadowColor = "#FFD700";
  ctx.fillText(String(s.currentNumber), 0, 70);
  ctx.restore();
}

/**
 * Draw normal answer display (non-celebration)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} cx - Wheel center X
 * @param {number} cy - Wheel center Y
 * @param {number} r - Wheel radius
 * @param {Object} s - Game state
 */
function drawNormalAnswer(ctx, cx, cy, r, s) {
  // Early return if no winning number to display
  if (!s.currentNumber) return;

  // Save current canvas state (transformations, styles, etc.) so we can restore later
  ctx.save();
  // Move coordinate system origin to wheel center (cx, cy) - makes positioning easier
  ctx.translate(cx, cy);

  // ===== NUMBER CONTAINER CALCULATIONS =====
  // Convert winning number to string for display
  const numberText = String(s.currentNumber);

  // Calculate font size to achieve target text height - MODIFY: Change C.NUMBER_TEXT_HEIGHT in constants.js
  const fontSize = calculateFontSizeForHeight(ctx, numberText, "MouldyCheese", C.NUMBER_TEXT_HEIGHT);

  // Set font for the number - font size is calculated to match target height
  ctx.font = `bold ${fontSize}px 'MouldyCheese'`;

  // Measure the text to get actual rendered dimensions
  const textMetrics = ctx.measureText(numberText);
  // Get actual width of rendered text (varies by number - "1" is narrower than "88")
  const textWidth = textMetrics.width;

  // Get actual rendered height of text (should be close to C.NUMBER_TEXT_HEIGHT)
  const actualTextHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  // Padding around the number inside the container
  // MODIFY: Change C.NUMBER_PADDING in constants.js
  const padding = C.NUMBER_PADDING;

  // Maximum allowed container width to prevent it from getting too large
  // MODIFY: Change C.NUMBER_MAX_WIDTH in constants.js
  const maxWidth = C.NUMBER_MAX_WIDTH;

  // Calculate container width: text width + padding on both sides, but cap at maxWidth
  const bgWidth = Math.min(textWidth + padding * 2, maxWidth);
  // Calculate container height: actual text height + padding on top and bottom
  const bgHeight = 80; //actualTextHeight + padding * 2;

  // ===== POSITIONING =====
  // Number container centered at wheel center (y = 0 is center since we're translated to cx, cy)
  // MODIFY: Change 0 to move number up (negative) or down (positive)
  const numberBoxY = 0;

  // ===== TITLE CONTAINER SECTION =====
  // Title container height - MODIFY: Change C.TITLE_HEIGHT in constants.js
  const titleHeight = C.TITLE_HEIGHT;
  // Gap between title and number containers - MODIFY: Change C.GAP_BETWEEN_TITLE_AND_NUMBER in constants.js
  const gap = C.GAP_BETWEEN_TITLE_AND_NUMBER;
  // Calculate title position: above number container
  const titleBoxY = numberBoxY - bgHeight / 2 - gap - titleHeight;

  // Draw title container background - MODIFY: Change C.TITLE_X, C.TITLE_WIDTH, C.TITLE_HEIGHT, C.TITLE_CORNER_RADIUS, C.TITLE_BG_COLOR in constants.js
  drawRoundedRect(ctx, C.TITLE_X, titleBoxY, C.TITLE_WIDTH, titleHeight, C.TITLE_CORNER_RADIUS, C.TITLE_BG_COLOR);

  // ===== TITLE TEXT SECTION =====
  // Set text color - MODIFY: Change C.TITLE_TEXT_COLOR in constants.js
  ctx.fillStyle = C.TITLE_TEXT_COLOR;
  // Set font - MODIFY: Change C.TITLE_FONT_SIZE in constants.js
  ctx.font = `${C.TITLE_FONT_SIZE}px 'MouldyCheese'`;
  // Align text horizontally to center
  ctx.textAlign = "center";
  // Align text vertically to middle (baseline)
  ctx.textBaseline = "middle";
  // Draw the title text - MODIFY: Change C.TITLE_TEXT in constants.js
  ctx.fillText(C.TITLE_TEXT, 0, titleBoxY + titleHeight / 2);

  // ===== NUMBER CONTAINER (OUTER BORDER - GOLD) =====
  // Draw outer border: positioned outside the inner container
  // MODIFY: Change C.NUMBER_BORDER_THICKNESS and C.NUMBER_OUTER_CORNER_RADIUS in constants.js
  const borderOffset = C.NUMBER_BORDER_THICKNESS;
  drawRoundedRect(ctx, -bgWidth / 2 - borderOffset, numberBoxY - bgHeight / 2 - borderOffset,
                  bgWidth + borderOffset * 2, bgHeight + borderOffset * 2, C.NUMBER_OUTER_CORNER_RADIUS, C.NUMBER_BORDER_COLOR);

  // ===== NUMBER CONTAINER (INNER BACKGROUND - BLACK) =====
  // Draw inner background: exact size of container (no border offset)
  // MODIFY: Change C.NUMBER_INNER_CORNER_RADIUS and C.NUMBER_BG_COLOR in constants.js
  drawRoundedRect(ctx, -bgWidth / 2, numberBoxY - bgHeight / 2, bgWidth, bgHeight, C.NUMBER_INNER_CORNER_RADIUS, C.NUMBER_BG_COLOR);

  // ===== NUMBER TEXT =====
  // Set shadow blur amount - MODIFY: Change C.NUMBER_SHADOW_BLUR in constants.js
  ctx.shadowBlur = C.NUMBER_SHADOW_BLUR;
  // Set shadow color - MODIFY: Change C.NUMBER_SHADOW_COLOR in constants.js
  ctx.shadowColor = C.NUMBER_SHADOW_COLOR;
  // Set shadow horizontal offset (0 = no horizontal offset)
  ctx.shadowOffsetX = 0;
  // Set shadow vertical offset (0 = no vertical offset)
  ctx.shadowOffsetY = 0;
  // Set text fill color - MODIFY: Change C.NUMBER_TEXT_COLOR in constants.js
  ctx.fillStyle = C.NUMBER_TEXT_COLOR;
  // Set vertical text alignment to middle (centers text vertically)
  ctx.textBaseline = "middle";
  // Draw the number text
  ctx.fillText(numberText, 0, numberBoxY);

  // Reset shadow to 0 so it doesn't affect other drawings
  ctx.shadowBlur = 0;

  // Restore canvas state (undoes translate and any other transformations)
  ctx.restore();
}

/**
 * Wheel rotation state manager
 * Handles visual wheel rotation and locking
 */
class WheelRotationState {
  constructor() {
    this.visualWheelRotation = 0;
    this.lockedWheelRotation = null;
    this.lastRotTime = Date.now();
  }

  /**
   * Update wheel rotation based on game status
   * @param {Object} gameState - Current game state
   * @returns {number} - Render rotation value [0, 2PI]
   */
  update(gameState) {
    if (gameState.status === "spinning") {
      // During spinning, animate towards target
      // Clear any locked position when spinning starts
      this.lockedWheelRotation = null;
      const target = gameState.targetRotation || 0;
      this.visualWheelRotation += (target - this.visualWheelRotation) * 0.1;
    } else if (gameState.status === "finished" || gameState.status === "winner" || gameState.status === "cooldown") {
      // After spinning stops, LOCK the wheel position - prevent state updates from moving it
      // IMPORTANT: Once locked, use the locked position instead of state.targetRotation
      if (this.lockedWheelRotation === null) {
        // First time reaching finished state - lock the current target rotation
        if (gameState.targetRotation !== undefined && gameState.targetRotation !== null) {
          this.lockedWheelRotation = gameState.targetRotation;
          this.visualWheelRotation = this.lockedWheelRotation;
        }
      } else {
        // Already locked - use locked position, ignore state updates
        this.visualWheelRotation = this.lockedWheelRotation;
      }
    } else {
      // Waiting state - STOP the wheel completely for easier reading while guessing
      // Don't update visualWheelRotation - keep it frozen at current position
      this.lockedWheelRotation = null;
      // Wheel stays completely still during waiting phase
    }

    // Normalize rotation to [0, 2PI] range for rendering only
    // This doesn't affect the actual visualWheelRotation value, just how we render it
    let renderRotation = this.visualWheelRotation % (Math.PI * 2);
    if (renderRotation < 0) renderRotation += Math.PI * 2;

    return renderRotation;
  }

  /**
   * Reset rotation state (for new rounds)
   */
  reset() {
    this.lockedWheelRotation = null;
  }
}

/**
 * Leaderboard animation state manager
 * Tracks previous positions and animates movement when order changes
 */
class LeaderboardAnimationState {
  constructor() {
    this.previousPositions = new Map(); // Map of username -> previous row index
    this.animationStartTime = null;
    this.animationDuration = 500; // Animation duration in milliseconds
    this.isAnimating = false;
  }

  /**
   * Update leaderboard positions and detect changes
   * @param {Array} players - Sorted array of players
   * @returns {boolean} - True if positions changed (animation needed)
   */
  update(players) {
    const currentPositions = new Map();
    let hasChanges = false;

    // Build current position map
    players.forEach((player, index) => {
      const key = (player.username || "Anonymous").toLowerCase();
      currentPositions.set(key, index);

      // Check if position changed
      const prevIndex = this.previousPositions.get(key);
      if (prevIndex !== undefined && prevIndex !== index) {
        hasChanges = true;
      }
    });

    // Check for new players or removed players
    if (this.previousPositions.size !== currentPositions.size) {
      hasChanges = true;
    }

    // Start animation if positions changed
    if (hasChanges) {
      this.isAnimating = true;
      this.animationStartTime = Date.now();
    }

    // Update previous positions
    this.previousPositions = currentPositions;

    return hasChanges;
  }

  /**
   * Get interpolated Y position for a player during animation
   * @param {string} username - Player username
   * @param {number} currentIndex - Current row index
   * @param {number} baseY - Base Y position for row 0
   * @param {number} rowHeight - Height between rows
   * @returns {number} - Interpolated Y position
   */
  getAnimatedY(username, currentIndex, baseY, rowHeight) {
    if (!this.isAnimating || !this.animationStartTime) {
      return baseY + currentIndex * rowHeight;
    }

    const key = (username || "Anonymous").toLowerCase();
    const prevIndex = this.previousPositions.get(key);

    // If no previous position, use current
    if (prevIndex === undefined) {
      return baseY + currentIndex * rowHeight;
    }

    // Calculate animation progress (0 to 1)
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(1, elapsed / this.animationDuration);

    // Easing function (ease-out)
    const eased = 1 - Math.pow(1 - progress, 3);

    // Interpolate between previous and current position
    const prevY = baseY + prevIndex * rowHeight;
    const currentY = baseY + currentIndex * rowHeight;
    const animatedY = prevY + (currentY - prevY) * eased;

    // Stop animation when complete
    if (progress >= 1) {
      this.isAnimating = false;
    }

    return animatedY;
  }

  /**
   * Reset animation state
   */
  reset() {
    this.isAnimating = false;
    this.animationStartTime = null;
  }
}

/**
 * Draw wheel and UI elements
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} gameState - Game state
 * @param {WheelRotationState} rotationState - Wheel rotation state manager
 */
function drawWheelAndUI(ctx, gameState, rotationState) {
  const cx = 520;
  const cy = 520;
  const r = 290;

  // Draw game title on the wheel (centered above wheel)
  ctx.save();
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 50px 'MouldyCheese'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText("Lucky Wheel Guessing Game", cx, cy - r - 60);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  // Fallback if wheelValues hasn't loaded yet
  const values =
    gameState && gameState.wheelValues && gameState.wheelValues.length > 0
      ? gameState.wheelValues
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const slices = values.length;

  // Update and get render rotation
  const renderRotation = rotationState.update(gameState);

  // Draw wheel at fixed size - never zoom or scale
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(renderRotation - Math.PI / 2);

  for (let i = 0; i < slices; i++) {
    const angle = (i * 2 * Math.PI) / slices;
    // Draw wheel slice - MODIFY: Change colors "#FFD700" (gold) and "#1A1A1A" (dark) to change slice colors
    drawSector(ctx, 0, 0, r, angle, angle + (2 * Math.PI) / slices, i % 2 ? "#FFD700" : "#1A1A1A");
  }

  // Draw numbers UPRIGHT (not rotated) for easier reading
  // Calculate positions in world coordinates and draw without rotation
  ctx.restore(); // Restore from wheel rotation context
  ctx.save(); // Save for number drawing

  for (let i = 0; i < slices; i++) {
    const sliceAngle = (i * 2 * Math.PI) / slices;
    const sliceCenterAngle = sliceAngle + Math.PI / slices; // Center of the slice
    const numberRadius = Math.max(r - 50, r * 0.65); // Safe distance from edge

    // Calculate world position accounting for wheel rotation
    const rotatedAngle = sliceCenterAngle + renderRotation - Math.PI / 2;
    const worldX = cx + Math.cos(rotatedAngle) * numberRadius;
    const worldY = cy + Math.sin(rotatedAngle) * numberRadius;

    // Draw number upright (no rotation)
    ctx.fillStyle = i % 2 ? "#000" : "#FFF";
    ctx.font = "bold 34px 'MouldyCheese'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(values[i]), worldX, worldY);
  }

  ctx.restore();

  // Draw pointer triangle - MODIFY: Change "#FF3B30" (red) to change pointer color, adjust coordinates to change position/size
  // Pointer is drawn in world coordinates (not rotated)
  drawTriangle(ctx, cx, cy - r + 5, cx - 30, cy - r - 45, cx + 30, cy - r - 45, "#FF3B30");

  if (gameState.status === "waiting" || gameState.status === "cooldown") {
    // Increased spacing from bottom edge for mobile keyboard visibility
    // Changed from HEIGHT - 100 to HEIGHT - 200 to keep status visible when keyboard appears
    const barY = HEIGHT - 200;
    const remainingMs = Math.max(0, (gameState.timerEnd || 0) - Date.now());
    const total = gameState.status === "waiting" ? C.WAITING_DURATION : C.COOLDOWN_DURATION;
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    ctx.fillStyle = "white";
    ctx.font = "45px 'MouldyCheese'";
    ctx.textAlign = "center";

    // Show countdown with placeholder replacement
    // MODIFY: Change C.READY_TO_SPIN_TEXT, C.NEXT_ROUND_STARTING_TEXT, and C.TIME_UNIT_SUFFIX in constants.js
    // Available placeholders: {seconds}, {countdown}, {unit}
    let statusText = gameState.status === "waiting" ? C.READY_TO_SPIN_TEXT : C.NEXT_ROUND_STARTING_TEXT;
    // Replace placeholders with actual values
    statusText = statusText.replace(/{seconds}/g, remainingSeconds.toString());
    statusText = statusText.replace(/{countdown}/g, remainingSeconds.toString());
    statusText = statusText.replace(/{unit}/g, C.TIME_UNIT_SUFFIX);
    ctx.fillText(statusText, cx, barY - 60);

    // Draw progress bar - MODIFY: Change colors and dimensions to customize progress bar appearance
    const progress = remainingMs / total;
    drawProgressBar(ctx, cx, barY, 500, 20, progress, "rgba(0,0,0,0.5)", "#FFD700");
  }

  // Show answer after spin stops
  // Only show celebration if there's a winner, otherwise show normal answer
  // IMPORTANT: Only show answer UI, never zoom or highlight the wheel itself
  if (gameState.status === "winner" || gameState.status === "cooldown") {
    const hasWinner = gameState.winners && gameState.winners.length > 0;
    const celebrationActive = gameState.celebration && gameState.celebration.active;

    if (hasWinner && celebrationActive) {
      // Show celebration for winners (above wheel, doesn't affect wheel size)
      drawWinnerUI(ctx, cx, cy, r, gameState);
    } else {
      // Show normal answer display (above wheel, doesn't affect wheel size)
      drawNormalAnswer(ctx, cx, cy, r, gameState);
    }
  }
}

/**
 * Draw leaderboard with sorting and animation
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} players - Array of player objects with username and wins/score
 * @param {LeaderboardAnimationState} animationState - Animation state manager (optional)
 */
function drawLeaderboard(ctx, players, animationState = null) {
  // Sort players by score (descending) - highest to lowest
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = a.wins || a.score || 0;
    const scoreB = b.wins || b.score || 0;
    return scoreB - scoreA; // Descending order
  });

  // Update animation state if provided
  if (animationState) {
    animationState.update(sortedPlayers);
  }
  // Increased width and moved further left for more space
  const lbWidth = 600; // Increased from 460 to 600
  const lbX = WIDTH - lbWidth - 40; // Moved left (reduced right margin from 100 to 40)
  const lbY = 220; // Moved down from 180 to 220 to prevent mobile keyboard cropping

  // Draw leaderboard background - MODIFY: Change colors and dimensions to customize leaderboard appearance
  // Reduced height from 650 to 600 to prevent cropping when mobile keyboard appears
  drawRoundedRect(ctx, lbX, lbY, lbWidth, 600, 20, "rgba(0, 0, 0, 0.6)");

  ctx.fillStyle = "#FFD700";
  ctx.font = "40px 'MouldyCheese'";
  ctx.textAlign = "left";
  ctx.fillText("LEADERBOARD", lbX + 40, lbY + 70);

  // Calculate max score for proportional bar scaling
  // Handle empty players array
  const playerScores = sortedPlayers.slice(0, 10).map((p) => p.wins || p.score || 0);
  const maxScore = playerScores.length > 0 ? Math.max(1, ...playerScores) : 1;

  // Score bar dimensions - adjusted for wider leaderboard
  const barHeight = 14; // Increased thickness from 8 to 14
  const nameEndX = lbX + 240; // End of name area (increased from 200)
  const scoreStartX = lbX + lbWidth - 80; // Start of score number area
  const barSpacing = 30; // Space between name and bar (increased from 20)
  const barWidth = Math.max(0, scoreStartX - nameEndX - barSpacing); // Reduced width with more spacing
  const rowHeight = 45; // Height between rows
  const baseRowY = lbY + 160; // Base Y position for first row

  sortedPlayers.slice(0, 10).forEach((player, i) => {
    // Get animated Y position if animation state is provided
    const rowY = animationState
      ? animationState.getAnimatedY(player.username, i, baseRowY, rowHeight)
      : baseRowY + i * rowHeight;
    const score = player.wins || player.score || 0;
    const scoreRatio = maxScore > 0 ? score / maxScore : 0; // 0 to 1
    const barFillWidth = Math.max(0, Math.min(barWidth, barWidth * scoreRatio)); // Clamp to valid range

    // Draw player name (keep original colors - gold for first, white for others)
    ctx.font = "24px 'MouldyCheese'";
    ctx.fillStyle = i === 0 ? "#FFD700" : "white";
    ctx.textAlign = "left";
    // Truncate username to 10 characters with ellipses
    const fullName = String(player.username || "Anonymous");
    const name = fullName.length > 10 ? fullName.substring(0, 10) + "..." : fullName;
    ctx.fillText(`${i === 0 ? "👑 " : i + 1 + ". "}${name}`, lbX + 40, rowY);

    // Draw score bar background (subtle gray) - only if barWidth is valid
    if (barWidth > 0) {
      const barX = nameEndX + barSpacing; // Use barSpacing for consistent spacing
      const barY = rowY - barHeight / 2; // Center vertically with text

      // Draw background bar
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4, "rgba(255, 255, 255, 0.1)");

      // Draw score bar fill (proportional to score)
      if (barFillWidth > 0) {
        // Use light green for highest scorer, gray for others
        const barColor = i === 0 && score === maxScore
          ? "#66BB6A" // Light green for highest scorer
          : "#9E9E9E"; // Gray for others

        drawRoundedRect(ctx, barX, barY, barFillWidth, barHeight, 4, barColor);
      }
    }

    // Draw score number - use green for highest scorer, gray for others
    ctx.textAlign = "right";
    // Use light green for highest scorer, gray for others (only for score text)
    ctx.fillStyle = i === 0 && score === maxScore
      ? "#66BB6A" // Light green for highest scorer
      : "#9E9E9E"; // Gray for others
    ctx.fillText(String(score), lbX + lbWidth - 40, rowY);
    ctx.textAlign = "left";
  });
}

/**
 * Draw FPS counter
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} fpsState - FPS state object with currentFPS, lastFrameTime properties
 * @returns {Object} - Updated FPS state
 */
function drawFPSCounter(ctx, fpsState) {
  const now = Date.now();
  const dt = now - (fpsState.lastFrameTime || now);
  fpsState.currentFPS = (fpsState.currentFPS || 30) * 0.9 + (1000 / Math.max(dt, 1)) * 0.1;
  fpsState.lastFrameTime = now;

  // FPS counter container dimensions
  // Moved higher up to avoid mobile keyboard overlap
  const fpsBoxX = WIDTH - 250;
  const fpsBoxY = HEIGHT - 180; // Changed from HEIGHT - 80 to HEIGHT - 180 for mobile spacing
  const fpsBoxWidth = 220;
  const fpsBoxHeight = 60;

  // Draw FPS counter background - MODIFY: Change color and dimensions to customize FPS display
  drawRect(ctx, fpsBoxX, fpsBoxY, fpsBoxWidth, fpsBoxHeight, "rgba(0, 0, 0, 0.8)");

  // Set text style
  ctx.fillStyle = fpsState.currentFPS < 25 ? "#FF3B30" : "#4CD964";
  ctx.font = "bold 24px 'MouldyCheese'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Center text in container
  const fpsTextX = fpsBoxX + fpsBoxWidth / 2;
  const fpsTextY = fpsBoxY + fpsBoxHeight / 2;
  ctx.fillText(`${Math.round(fpsState.currentFPS)} FPS`, fpsTextX, fpsTextY);

  return fpsState;
}

/**
 * Draw logo and brand text
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Image} logoImage - Logo image object (can be null)
 */
function drawLogoAndBrand(ctx, logoImage) {
  // --- UI Group: Title & Logo (Aligned above Leaderboard) ---
  // Moved down to prevent cropping when mobile keyboard appears in YouTube live
  const rightAnchor = WIDTH - 560; // Matches the Leaderboard X position

  // 1. Draw Logo (centered vertically)
  // Moved down from 40 to 60 to prevent mobile keyboard cropping
  const logoY = 60;
  const logoHeight = 120;
  const logoCenterY = logoY + logoHeight / 2; // Center of logo at y=120
  if (logoImage) {
    ctx.drawImage(logoImage, rightAnchor, logoY, 120, logoHeight);
  }

  // 2. Draw Title (Vertically aligned with logo center)
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 70px 'MouldyCheese'";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle"; // Center text vertically on the y coordinate
  // Positioned to the right of the logo, vertically centered with logo
  ctx.fillText("TOPIX99", rightAnchor + 140, logoCenterY);
}

module.exports = {
  // Constants
  WIDTH,
  HEIGHT,
  FPS,
  palettes,

  // Drawing functions
  drawBackground,
  drawWinnerUI,
  drawNormalAnswer,
  drawWheelAndUI,
  drawLeaderboard,
  drawFPSCounter,
  drawLogoAndBrand,

  // State management
  WheelRotationState,
  LeaderboardAnimationState,
};
