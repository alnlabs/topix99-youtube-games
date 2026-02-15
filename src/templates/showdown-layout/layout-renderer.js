/**
 * Default Layout Renderer for Showdown Layout Template
 *
 * Reusable container-based layout:
 * - Main container (75%) and Sidebar container (25%)
 * - Main container: 3 rows (Header, Question, Options)
 * - Sidebar container: 2 rows (Leaderboard, Recent Winners)
 */

const designSystem = require("./design-system");
const uiComponents = require("./ui-components");
const { COLORS, LAYOUT, TYPOGRAPHY } = designSystem;
const { Background, Header, List, Timer } = uiComponents;
const { hslAlpha } = require("./utils");
const { loadImage } = require("canvas");
const path = require("path");

const WIDTH = designSystem.CANVAS.WIDTH;
const HEIGHT = designSystem.CANVAS.HEIGHT;

// Logo image cache
let logoImage = null;
let logoLoading = false;

/**
 * Pre-load logo image
 */
async function loadLogo() {
  if (logoImage || logoLoading) return logoImage;
  logoLoading = true;
  try {
    const logoRelPath = "../../../assets/images/logo.png";
    const logoFullPath = path.resolve(__dirname, logoRelPath);
    logoImage = await loadImage(logoFullPath);
    console.log("[layout-renderer] Logo image loaded successfully");
  } catch (err) {
    console.error("[layout-renderer] Failed to load logo image:", err.message);
    logoImage = null;
  } finally {
    logoLoading = false;
  }
  return logoImage;
}

/**
 * Default layout renderer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} uiData - UI data object
 * @returns {Object} Container dimensions and positions
 */
function renderDefaultLayout(ctx, uiData, options = {}) {
  // Clear canvas (skip if requested)
  if (!options.skipBackground) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    // Render background
    Background.render(ctx, Date.now());
  }

  // Safe area
  const safeX = LAYOUT.SAFE_MARGINS.left;
  const safeY = LAYOUT.SAFE_MARGINS.top;
  const safeWidth = WIDTH - LAYOUT.SAFE_MARGINS.left - LAYOUT.SAFE_MARGINS.right;
  const safeHeight = HEIGHT - LAYOUT.SAFE_MARGINS.top - LAYOUT.SAFE_MARGINS.bottom;

  // Container height (using configurable ratio)
  const { CONTAINER } = designSystem;
  const containerHeight = Math.floor(safeHeight * CONTAINER.HEIGHT_RATIO);

  // Container layout: Main + Sidebar (using configurable ratios)
  const isFullWidth = (LAYOUT.MAIN_CONTAINER_RATIO || 0.75) >= 1.0;
  const mainContainerWidth = isFullWidth
    ? safeWidth
    : Math.floor(safeWidth * (LAYOUT.MAIN_CONTAINER_RATIO || 0.75));
  const sidebarContainerWidth = isFullWidth
    ? 0
    : safeWidth - mainContainerWidth - LAYOUT.SPACING_LARGE;

  // Main container
  const mainContainerX = safeX;
  const mainContainerY = safeY;
  const mainContainerWidthActual = mainContainerWidth;
  const mainContainerHeight = containerHeight;

  // Sidebar container
  const sidebarContainerX = isFullWidth
    ? 0
    : safeX + mainContainerWidthActual + LAYOUT.SPACING_LARGE;
  const sidebarContainerY = safeY;
  const sidebarContainerWidthActual = Math.max(0, sidebarContainerWidth);
  const sidebarContainerHeight = containerHeight;

  // Main container: Split into 3 rows (using configurable heights)
  // Account for container margins
  const containerMargin = CONTAINER.MARGIN;
  const mainRow1Height = LAYOUT.MAIN_ROW1_HEIGHT; // Header row (Topix99 logo + Game name)
  const mainRow2Height = Math.floor((mainContainerHeight - mainRow1Height) * LAYOUT.MAIN_ROW2_HEIGHT_RATIO); // Question row (25% of remaining)
  const mainRow3Height = mainContainerHeight - mainRow1Height - mainRow2Height; // Options row (remaining space)

  // Main Row 1: Header (Topix99 logo + Game name)
  // Apply container margin
  const mainRow1X = mainContainerX + containerMargin;
  const mainRow1Y = mainContainerY + containerMargin;
  const mainRow1Width = mainContainerWidthActual - (containerMargin * 2);
  const mainRow1HeightActual = mainRow1Height - containerMargin; // Account for bottom margin
  renderMainRow1(ctx, uiData.layout || {}, mainRow1X, mainRow1Y, mainRow1Width, mainRow1HeightActual);

  // Main Row 2: Question (will be rendered by game-specific renderer)
  // Apply container margin
  const mainRow2X = mainContainerX + containerMargin;
  const mainRow2Y = mainContainerY + mainRow1Height + containerMargin;
  const mainRow2Width = mainContainerWidthActual - (containerMargin * 2);
  // Use reduced gap for bottom margin (between question and options)
  const questionOptionsGap = LAYOUT.QUESTION_OPTIONS_GAP || containerMargin;
  const mainRow2HeightActual = mainRow2Height - containerMargin - questionOptionsGap; // Account for top margin and reduced bottom gap

  // Main Row 3: Options (will be rendered by game-specific renderer)
  // Apply container margin with reduced gap from question
  const mainRow3X = mainContainerX + containerMargin;
  // Position options closer to question by using reduced gap
  const mainRow3Y = mainRow2Y + mainRow2HeightActual + questionOptionsGap;
  const mainRow3Width = mainContainerWidthActual - (containerMargin * 2);
  // Calculate available height for options (remaining space minus bottom margin)
  const mainRow3HeightActual = mainContainerY + mainContainerHeight - mainRow3Y - containerMargin;

  // Sidebar container: Split into 2 rows using separate configurable ratios
  // Account for container margins
  const availableHeightForPanels = sidebarContainerHeight - (containerMargin * 2) - LAYOUT.SPACING_MEDIUM; // Total height minus margins and spacing
  const sidebarRow1Height = Math.floor(availableHeightForPanels * LAYOUT.SIDEBAR_ROW1_HEIGHT_RATIO); // Leaderboard (65%)
  const sidebarRow2Height = availableHeightForPanels - sidebarRow1Height; // Recent Winners (35% - remaining)

  // Sidebar Row 1: Leaderboard
  if (sidebarContainerWidthActual > 0 && uiData.sidebar) {
    const sidebarRow1X = sidebarContainerX + containerMargin;
    const sidebarRow1Y = sidebarContainerY + containerMargin;
    const sidebarRow1Width = sidebarContainerWidthActual - (containerMargin * 2);
    const sidebarRow1HeightActual = sidebarRow1Height;
    const leaderboardItems = uiData.sidebar.leaderboard || [];
    List.render(ctx, {
      title: "LEADERBOARD",
      items: leaderboardItems,
    }, sidebarRow1X, sidebarRow1Y, sidebarRow1Width, sidebarRow1HeightActual);
  }

  // Sidebar Row 2: Recent Winners
  if (sidebarContainerWidthActual > 0 && uiData.sidebar && uiData.sidebar.recentAnswers !== undefined) {
    const sidebarRow2X = sidebarContainerX + containerMargin;
    const sidebarRow2Y = sidebarContainerY + containerMargin + sidebarRow1Height + LAYOUT.SPACING_MEDIUM;
    const sidebarRow2Width = sidebarContainerWidthActual - (containerMargin * 2);
    const sidebarRow2HeightActual = sidebarRow2Height;
    const recentAnswersItems = uiData.sidebar.recentAnswers || [];
    List.render(ctx, {
      title: "⚡ RECENT",
      items: recentAnswersItems,
      emptyMessage: "Waiting for answers…",
    }, sidebarRow2X, sidebarRow2Y, sidebarRow2Width, sidebarRow2HeightActual);
  }

  // Return container dimensions for game-specific content rendering
  return {
    // Main container
    mainContainer: {
      x: mainContainerX,
      y: mainContainerY,
      width: mainContainerWidthActual,
      height: mainContainerHeight,
    },
    // Main rows
    mainRow1: {
      x: mainRow1X,
      y: mainRow1Y,
      width: mainRow1Width,
      height: mainRow1Height,
    },
    mainRow2: {
      x: mainRow2X,
      y: mainRow2Y,
      width: mainRow2Width,
      height: mainRow2HeightActual,
    },
    mainRow3: {
      x: mainRow3X,
      y: mainRow3Y,
      width: mainRow3Width,
      height: mainRow3HeightActual,
    },
    // Sidebar container
    sidebarContainer: {
      x: sidebarContainerX,
      y: sidebarContainerY,
      width: sidebarContainerWidthActual,
      height: sidebarContainerHeight,
    },
    // Sidebar rows
    sidebarRow1: {
      x: sidebarRow1X,
      y: sidebarRow1Y,
      width: sidebarRow1Width,
      height: sidebarRow1HeightActual,
    },
    sidebarRow2: {
      x: sidebarRow2X,
      y: sidebarRow2Y,
      width: sidebarRow2Width,
      height: sidebarRow2HeightActual,
    },
    // Legacy support (for backward compatibility)
    contentX: mainRow2X,
    contentY: mainRow2Y,
    contentWidth: mainRow2Width,
    contentHeight: mainRow2Height + mainRow3HeightActual,
    safeX,
    safeY,
    safeWidth,
    safeHeight,
  };
}

/**
 * Render Main Row 1: Header (Topix99 logo + Game name + Timer)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} layoutData - Layout data (title, badge, timer)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Available width
 * @param {number} height - Available height
 */
function renderMainRow1(ctx, layoutData, x, y, width, height) {
  const { title, badge, timer } = layoutData;
  const { THEME } = designSystem;

  // Trigger logo load (async, will be available in next frames)
  if (!logoImage && !logoLoading) {
    loadLogo();
  }

  // 1. Logo Icon and Brand (left side)
  const iconSize = LAYOUT.LOGO_ICON_SIZE || 64;
  const brandX = x + LAYOUT.SPACING_LARGE;
  const brandY = y + height / 2;

  let currentX = brandX;

  if (logoImage) {
    // Draw Logo Image
    const imgWidth = iconSize;
    const imgHeight = (logoImage.height / logoImage.width) * imgWidth;
    ctx.drawImage(logoImage, brandX, brandY - imgHeight / 2, imgWidth, imgHeight);
    currentX += imgWidth + LAYOUT.SPACING_MEDIUM;
  } else {
    // Draw Fallback Icon (Circle with gradient) while logo loads
    ctx.save();
    const iconRadius = iconSize / 2;
    const iconCenterX = brandX + iconRadius;
    const iconCenterY = brandY;

    const iconGrad = ctx.createRadialGradient(iconCenterX, iconCenterY, 0, iconCenterX, iconCenterY, iconRadius);
    iconGrad.addColorStop(0, COLORS.NEON_PINK);
    iconGrad.addColorStop(1, hslAlpha(COLORS.NEON_PINK, 0.5));

    ctx.beginPath();
    ctx.arc(iconCenterX, iconCenterY, iconRadius, 0, Math.PI * 2);
    ctx.fillStyle = iconGrad;
    ctx.fill();

    ctx.font = `bold ${iconSize * 0.6}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("T", iconCenterX, iconCenterY);
    ctx.restore();
    currentX += iconSize + LAYOUT.SPACING_MEDIUM;
  }

  // Draw Brand "TOPIX99"
  ctx.save();
  ctx.fillStyle = COLORS.NEON_PINK;
  ctx.font = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("TOPIX99", currentX, brandY);
  const brandWidth = ctx.measureText("TOPIX99").width;
  ctx.restore();

  // 2. Game Title (with gap from brand)
  const gameNameX = currentX + brandWidth + (LAYOUT.TITLE_GAP || 32);
  const gameNameY = brandY;

  if (title) {
    ctx.save();
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 20;
    ctx.font = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Measure title width
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, gameNameX, gameNameY);

    // Question number label (next to game title with increased font)
    if (badge) {
      const questionNumberFontSize = TYPOGRAPHY.SIZE_SUBTITLE;
      ctx.font = `bold ${questionNumberFontSize}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.shadowColor = COLORS.NEON_BLUE;
      ctx.shadowBlur = 10;

      const timerSize = LAYOUT.TIMER_SIZE || 120;
      const maxBadgeX = width - timerSize - LAYOUT.SPACING_LARGE * 4; // Buffer before timer
      const questionNumberX = Math.min(gameNameX + titleWidth + LAYOUT.SPACING_MEDIUM, x + maxBadgeX);
      ctx.fillText(badge, questionNumberX, gameNameY);
    }
    ctx.restore();
  } else if (badge) {
    ctx.save();
    const questionNumberFontSize = TYPOGRAPHY.SIZE_SUBTITLE;
    ctx.font = `bold ${questionNumberFontSize}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.NEON_BLUE;
    ctx.shadowColor = COLORS.NEON_BLUE;
    ctx.shadowBlur = 10;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, gameNameX, gameNameY);
    ctx.restore();
  }

  // Timer (right end of logo container, if provided)
  if (timer) {
    const timerSize = LAYOUT.TIMER_SIZE;
    const timerX = x + width - timerSize - LAYOUT.SPACING_LARGE; // Right end with padding
    const timerY = y + (height - timerSize) / 2; // Vertically centered
    Timer.render(ctx, timer, timerX, timerY);
  }
}

module.exports = {
  renderDefaultLayout,
  WIDTH,
  HEIGHT,
};
