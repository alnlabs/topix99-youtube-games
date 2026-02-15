/**
 * Neon Dream Layout Renderer
 */

const designSystem = require("./design-system");
const uiComponents = require("./ui-components");
const { COLORS, LAYOUT, TYPOGRAPHY } = designSystem;
const { Background, Card, List, Timer, Button } = uiComponents;
const { hslAlpha, getCachedMeasure } = require("./utils");
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
    console.log("[neon-dream-layout] Logo image loaded successfully");
  } catch (err) {
    console.error("[neon-dream-layout] Failed to load logo image:", err.message);
    logoImage = null;
  } finally {
    logoLoading = false;
  }
  return logoImage;
}

function renderDefaultLayout(ctx, uiData, options = {}) {
  if (!options.skipBackground) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    Background.render(ctx, Date.now());
  }

  const safeX = LAYOUT.SAFE_MARGINS.left;
  const safeY = LAYOUT.SAFE_MARGINS.top;
  const safeW = WIDTH - LAYOUT.SAFE_MARGINS.left - LAYOUT.SAFE_MARGINS.right;
  const safeH = HEIGHT - LAYOUT.SAFE_MARGINS.top - LAYOUT.SAFE_MARGINS.bottom;

  // Layout Ratios (75% Main, 25% Sidebar)
  const mainW = Math.floor(safeW * 0.75);
  const sidebarW = safeW - mainW - LAYOUT.SPACING.M;

  // Header Row (Fixed Height)
  const headerH = 120;

  // Main Content Rows
  const questionH = Math.floor((safeH - headerH) * 0.55);
  const optionsH = safeH - headerH - questionH - LAYOUT.SPACING.M;

  // Render Header
  renderHeader(ctx, uiData.layout || {}, safeX, safeY, mainW, headerH);

  // Sidebar Row 1: Leaderboard
  const sideRow1H = Math.floor(safeH * LAYOUT.SIDEBAR_ROW1_HEIGHT_RATIO);
  if (uiData.sidebar) {
    List.render(ctx, {
      title: "LEADERBOARD",
      items: uiData.sidebar.leaderboard || []
    }, safeX + mainW + LAYOUT.SPACING.M, safeY, sidebarW, sideRow1H);

    // Sidebar Row 2: Recent
    List.render(ctx, {
      title: "RECENT",
      items: uiData.sidebar.recentAnswers || []
    }, safeX + mainW + LAYOUT.SPACING.M, safeY + sideRow1H + LAYOUT.SPACING.M, sidebarW, safeH - sideRow1H - LAYOUT.SPACING.M);
  }

  return {
    mainRow2: { x: safeX, y: safeY + headerH + LAYOUT.SPACING.S, width: mainW, height: questionH },
    mainRow3: { x: safeX, y: safeY + headerH + questionH + LAYOUT.SPACING.M, width: mainW, height: optionsH }
  };
}

function renderHeader(ctx, data, x, y, w, h) {
  const { title, badge, timer } = data;

  // Trigger logo load (async, will be available in next frames)
  if (!logoImage && !logoLoading) {
    loadLogo();
  }

  const iconSize = LAYOUT.LOGO_ICON_SIZE || 64;
  const brandY = y + h / 2;
  let currentX = x;

  // Draw Logo Image if loaded
  if (logoImage) {
    const imgWidth = iconSize;
    const imgHeight = (logoImage.height / logoImage.width) * imgWidth;
    // Vertically center the image exactly on brandY (which is the baseline for textBaseline middle)
    ctx.drawImage(logoImage, x, brandY - imgHeight / 2, imgWidth, imgHeight);
    currentX += imgWidth + LAYOUT.SPACING.L; // Increased spacing after larger logo
  }

  // TOPIX99 Brand
  ctx.font = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
  ctx.fillStyle = COLORS.NEON_PINK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("TOPIX99", currentX, brandY);

  const brandFont = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
  const brandW = getCachedMeasure(ctx, "TOPIX99", brandFont);

  // Game Title
  ctx.font = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_SECONDARY}`;
  ctx.fillStyle = COLORS.FOREGROUND;
  ctx.fillText(title || "QUIZ SHOWDOWN", currentX + brandW + LAYOUT.SPACING.L, brandY);

  // Timer (Right side of header)
  if (timer) {
    Timer.render(ctx, timer, x + w - 80, y + (h - 66) / 2);
  }
}

module.exports = {
  renderDefaultLayout,
  WIDTH,
  HEIGHT
};
