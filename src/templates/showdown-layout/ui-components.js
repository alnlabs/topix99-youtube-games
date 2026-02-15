/**
 * Reusable UI Components
 *
 * Pure UI components for templates - layout, styling, animations only.
 * No game logic, just visual presentation.
 *
 * Games provide data, these components render the UI.
 */

const {
  THEME,
  COLORS,
  TYPOGRAPHY,
  LAYOUT,
  TIMER,
  TIMING,
} = require("./design-system");
const {
  drawRoundedRect,
  drawCircle,
  drawMultilingualText,
  drawWrappedText,
  hslAlpha,
  createGradient,
  PATTERNS,
  measureMultilingualText,
} = require("./utils");

/**
 * UI Component: Header
 * Renders title, subtitle, badges, timer
 */
const Header = {
  /**
   * Render header with title and optional elements
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - Header data
   * @param {string} data.title - Main title
   * @param {string} [data.subtitle] - Optional subtitle
   * @param {string} [data.badge] - Optional badge text
   * @param {Object} [data.timer] - Optional timer { timeLeft, totalTime }
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Available width
   */
  render(ctx, data, x, y, width) {
    const { title, subtitle, badge, timer } = data;

    // Main title with neon glow
    ctx.save();
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 20;
    ctx.font = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title || "", x, y);
    ctx.restore();

    // Badge (if provided)
    if (badge) {
      ctx.font = `bold ${TYPOGRAPHY.SIZE_SMALL}px ${TYPOGRAPHY.FONT_TITLE}`;
      const badgeW = ctx.measureText(badge).width + 20;
      const badgeX = x + ctx.measureText(title || "").width + 20;
      const badgeY = y + 4;
      drawRoundedRect(
        ctx,
        badgeX,
        badgeY,
        badgeW,
        24,
        12,
        hslAlpha(COLORS.NEON_BLUE, 0.12),
        hslAlpha(COLORS.NEON_BLUE, 0.3),
        1
      );
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badge, badgeX + badgeW / 2, badgeY + 12);
    }

    // Timer (if provided)
    if (timer) {
      const timerX = x + width - 100;
      Timer.render(ctx, timer, timerX, y + 20);
    }
  },
};

/**
 * UI Component: Timer
 * Circular countdown timer
 */
const Timer = {
  /**
   * Render circular timer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - Timer data
   * @param {number} data.timeLeft - Time remaining in seconds
   * @param {number} data.totalTime - Total time in seconds
   * @param {number} x - X position (left edge)
   * @param {number} y - Y position (top edge)
   */
  render(ctx, data, x, y) {
    const { timeLeft, totalTime, timerEnd } = data;
    const size = TIMER.SIZE;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2 - TIMER.STROKE_WIDTH;

    // Calculate smooth time remaining for continuous animation
    // If timerEnd is available, use it for precise calculation
    let smoothTimeLeft = timeLeft;
    if (timerEnd && timerEnd > 0) {
      const now = Date.now();
      const remainingMs = Math.max(0, timerEnd - now);
      smoothTimeLeft = remainingMs / 1000; // Convert to seconds with decimals
    }

    // Background circle
    drawCircle(
      ctx,
      centerX,
      centerY,
      radius,
      hslAlpha(COLORS.CARD_BACKGROUND, 0.5),
      null,
      0
    );

    // Timer arc - use smooth time for continuous animation
    const progress = Math.max(0, Math.min(1, smoothTimeLeft / totalTime));
    const isUrgent = smoothTimeLeft <= TIMING.TIMER_URGENT_THRESHOLD;
    const color = isUrgent ? COLORS.NEON_PINK : COLORS.NEON_BLUE;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + 2 * Math.PI * progress
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = TIMER.STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Timer text - show whole seconds (ensure it doesn't show negative)
    ctx.save();
    ctx.font = `bold ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_SECONDARY}`;
    ctx.fillStyle = isUrgent ? COLORS.NEON_PINK : COLORS.FOREGROUND;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Use Math.max(0, ...) to ensure we never display negative numbers
    ctx.fillText(
      Math.max(0, Math.ceil(smoothTimeLeft)).toString(),
      centerX,
      centerY
    );
    ctx.restore();
  },
};

/**
 * UI Component: Card
 * Generic card container with rounded corners
 */
const Card = {
  /**
   * Render a card container
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - Card data
   * @param {string} [data.title] - Optional card title
   * @param {string} [data.bgColor] - Background color
   * @param {string} [data.borderColor] - Border color
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   */
  render(ctx, data, x, y, width, height) {
    const { title, bgColor, borderColor } = data;
    const bg = bgColor || hslAlpha(COLORS.CARD_BACKGROUND, 0.5);
    const border = borderColor || COLORS.BORDER;

    drawRoundedRect(ctx, x, y, width, height, 12, bg, border, 2);

    if (title) {
      ctx.save();
      ctx.font = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = COLORS.FOREGROUND;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(title, x + LAYOUT.SPACING_MEDIUM, y + LAYOUT.SPACING_SMALL);
      ctx.restore();
    }
  },
};

/**
 * UI Component: Button/Option
 * Interactive button or option card
 */
const Button = {
  /**
   * Render a button/option
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - Button data
   * @param {string|Object} data.label - Button label (text or multilingual)
   * @param {string} [data.prefix] - Optional prefix (A, B, C, D, etc.)
   * @param {string} [data.status] - Status: 'default', 'selected', 'correct', 'incorrect'
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Button width
   * @param {number} height - Button height
   */
  render(ctx, data, x, y, width, height) {
    const { label, prefix, status = "default" } = data;

    // Slightly increased font size for options
    const fontSize = height > 120 ? TYPOGRAPHY.SIZE_SUBTITLE : TYPOGRAPHY.SIZE_BODY;
    const font = `${fontSize}px ${TYPOGRAPHY.FONT_DISPLAY}`;

    const optionColors = [
      COLORS.OPTION_A,
      COLORS.OPTION_B,
      COLORS.OPTION_C,
      COLORS.OPTION_D,
    ];
    const prefixIndex = prefix ? prefix.charCodeAt(0) - 65 : 0; // A=0, B=1, etc.

    let bgColor, borderColor, textColor;

    switch (status) {
      case "selected":
        bgColor = hslAlpha(COLORS.SELECTED, 0.3);
        borderColor = COLORS.SELECTED;
        textColor = COLORS.FOREGROUND;
        break;
      case "correct":
      case "incorrect":
      default:
        bgColor = hslAlpha(optionColors[prefixIndex % 4], 0.3);
        borderColor = hslAlpha(optionColors[prefixIndex % 4], 0.6);
        textColor = COLORS.FOREGROUND;
    }

    // Draw button
    drawRoundedRect(ctx, x, y, width, height, 12, bgColor, borderColor, 2);

    // Draw check mark for correct answer
    if (status === "correct") {
      ctx.save();
      ctx.font = `bold ${fontSize * 1.5}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = COLORS.CORRECT;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("✅", x + width - LAYOUT.SPACING_MEDIUM, y + height / 2);
      ctx.restore();
    }

    // Prefix (A, B, C, D, etc.) - positioned with a background circle
    const prefixCircleRadius = 25;
    const prefixX = x + LAYOUT.SPACING_MEDIUM + prefixCircleRadius;
    const prefixY = y + height / 2;

    if (prefix) {
      // Draw background circle for prefix
      ctx.save();
      ctx.beginPath();
      ctx.arc(prefixX, prefixY, prefixCircleRadius, 0, Math.PI * 2);
      ctx.fillStyle = hslAlpha(COLORS.FOREGROUND, 0.1);
      ctx.fill();
      ctx.strokeStyle = hslAlpha(textColor, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Draw prefix letter (larger)
      ctx.save();
      const prefixFontSize = TYPOGRAPHY.SIZE_SUBTITLE;
      ctx.font = `bold ${prefixFontSize}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(prefix, prefixX, prefixY);
      ctx.restore();
    }

    // Calculate available space for text (accounting for circled prefix and status icon)
    const hasStatusIcon = status === "correct" || status === "incorrect";
    const iconWidth = hasStatusIcon ? 40 : 0;
    const prefixAreaWidth = prefix ? (prefixCircleRadius * 2 + LAYOUT.SPACING_LARGE) : 0;
    const horizontalPadding = LAYOUT.SPACING_MEDIUM;
    const verticalPadding = LAYOUT.SPACING_MEDIUM;

    const textWidth = width - prefixAreaWidth - iconWidth - horizontalPadding * 2;

    // Center text vertically
    const textHeight = measureMultilingualText(ctx, label, textWidth, font, true);
    const textX = x + prefixAreaWidth + horizontalPadding;
    const textY = y + (height - textHeight) / 2;

    // Draw text with proper constraints
    if (typeof label === "string") {
      drawWrappedText(
        ctx,
        label,
        textX,
        textY,
        textWidth,
        font,
        textColor,
        "left"
      );
    } else {
      // For multilingual text, use joinLines: true
      drawMultilingualText(
        ctx,
        label,
        textX,
        textY,
        textWidth,
        font,
        textColor,
        "left",
        true // joinLines: true
      );
    }

    // Status icon - centered vertically
    if (status === "correct") {
      ctx.save();
      const iconSize = TYPOGRAPHY.SIZE_LARGE;
      ctx.font = `bold ${iconSize}px Arial`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.CORRECT;
      ctx.fillText("✓", x + width - horizontalPadding, y + height / 2);
      ctx.restore();
    } else if (status === "incorrect") {
      ctx.save();
      const iconSize = TYPOGRAPHY.SIZE_LARGE;
      ctx.font = `bold ${iconSize}px Arial`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.INCORRECT;
      ctx.fillText("✗", x + width - horizontalPadding, y + height / 2);
      ctx.restore();
    }
  },
};

/**
 * UI Component: List
 * Vertical list of items (leaderboard, recent items, etc.)
 */
const List = {
  /**
   * Render a list
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} data - List data
   * @param {string} data.title - List title
   * @param {Array} data.items - List items [{ label, value, highlight?, avatar? }]
   * @param {string} [data.emptyMessage] - Custom empty state message
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - List width
   * @param {number} [height] - Optional fixed height (if not provided, calculates from items)
   */
  render(ctx, data, x, y, width, height) {
    const { title, items = [], emptyMessage } = data;

    // Calculate total height needed
    const itemHeight = 70; // Increased from 60 for better visibility
    const titleHeight = title ? 45 : 0; // Increased from 40
    const totalItemsHeight =
      items.length * (itemHeight + LAYOUT.SPACING_SMALL) -
      (items.length > 0 ? LAYOUT.SPACING_SMALL : 0);
    const calculatedHeight =
      titleHeight +
      totalItemsHeight +
      (items.length > 0 ? LAYOUT.SPACING_MEDIUM : 50); // Extra space if empty

    // Use provided height or calculated height
    const totalHeight = height || calculatedHeight;

    // Draw background card for the entire list
    drawRoundedRect(
      ctx,
      x,
      y,
      width,
      totalHeight,
      12,
      hslAlpha(COLORS.CARD_BACKGROUND, 0.6),
      COLORS.BORDER,
      1
    );

    // Title
    if (title) {
      ctx.save();
      ctx.font = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
      ctx.fillStyle = COLORS.FOREGROUND;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(title, x + LAYOUT.SPACING_MEDIUM, y + LAYOUT.SPACING_MEDIUM);
      ctx.restore();
    }

    // Items - calculate available space for items
    const startY = y + titleHeight + LAYOUT.SPACING_MEDIUM;
    // Calculate available height for items (accounting for title and padding)
    const itemsAreaPadding = LAYOUT.SPACING_MEDIUM * 2; // Top and bottom padding
    const availableItemsHeight = totalHeight - titleHeight - itemsAreaPadding;
    const itemSpacing = LAYOUT.SPACING_SMALL;
    const maxVisibleItems = Math.max(
      0,
      Math.floor(
        (availableItemsHeight + itemSpacing) / (itemHeight + itemSpacing)
      )
    );
    const visibleItems = items.slice(0, maxVisibleItems);

    if (items.length === 0) {
      // Show empty state message
      ctx.save();
      ctx.font = `${TYPOGRAPHY.SIZE_SMALL}px ${TYPOGRAPHY.FONT_DISPLAY}`;
      ctx.fillStyle = COLORS.MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        emptyMessage || "No items yet",
        x + width / 2,
        y + totalHeight / 2
      );
      ctx.restore();
    } else {
      visibleItems.forEach((item, index) => {
        const itemY = startY + index * (itemHeight + LAYOUT.SPACING_SMALL);
        const isHighlighted = item.highlight;

        const itemX = x + LAYOUT.SPACING_SMALL;
        const itemWidth = width - LAYOUT.SPACING_SMALL * 2;

        // Only draw background for highlighted items, not nested cards for all items
        if (isHighlighted) {
          const bgColor = hslAlpha(COLORS.NEON_PINK, 0.2);
          const borderColor = COLORS.NEON_PINK;
          drawRoundedRect(
            ctx,
            itemX,
            itemY,
            itemWidth,
            itemHeight,
            8,
            bgColor,
            borderColor,
            2
          );
        }

        // Item content with proper padding and text truncation
        const itemPadding = LAYOUT.SPACING_SMALL;
        const labelX = itemX + itemPadding;
        const valueX = itemX + itemWidth - itemPadding;
        const textY = itemY + itemHeight / 2;
        const labelMaxWidth =
          item.value !== undefined
            ? valueX - labelX - LAYOUT.SPACING_XLARGE // Increased space for value
            : itemWidth - itemPadding * 2;

        ctx.save();
        ctx.font = `${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_DISPLAY}`;
        ctx.fillStyle = COLORS.FOREGROUND;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const label = item.label || item.name || item.text || "";
        // Truncate label if too long to prevent overflow
        const metrics = ctx.measureText(label);
        if (metrics.width > labelMaxWidth) {
          // Truncate with ellipsis
          let truncated = label;
          while (
            ctx.measureText(truncated + "...").width > labelMaxWidth &&
            truncated.length > 0
          ) {
            truncated = truncated.slice(0, -1);
          }
          ctx.fillText(truncated + "...", labelX, textY);
        } else {
          ctx.fillText(label, labelX, textY);
        }

        if (item.value !== undefined) {
          ctx.textAlign = "right";
          ctx.fillText(String(item.value), valueX, textY);
        }

        ctx.restore();
      });
    }
  },
};

/**
 * UI Component: Celebration
 * Full-screen celebration overlay with confetti
 */
const Celebration = {
  confetti: [],

  initConfetti(ctx) {
    this.confetti = Array.from({ length: 60 }, (_, i) => ({
      x: Math.random() * ctx.canvas.width,
      y: -20,
      size: 6 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 10,
      vy: 5 + Math.random() * 5,
      color: [
        COLORS.NEON_BLUE,
        COLORS.NEON_PINK,
        COLORS.NEON_GREEN,
        COLORS.NEON_YELLOW,
        COLORS.NEON_PURPLE,
        COLORS.NEON_ORANGE,
      ][i % 6],
      rotation: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      isCircle: Math.random() > 0.5,
    }));
  },

  /**
   * Render celebration overlay
   */
  render(ctx, data, timestamp) {
    const { winnerName, winnerAvatar, isVisible } = data;
    if (!isVisible) {
      this.confetti = [];
      return;
    }

    if (this.confetti.length === 0) {
      this.initConfetti(ctx);
    }

    // Draw confetti
    ctx.save();
    this.confetti.forEach((p) => {
      // Update
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vrot;

      if (p.y > ctx.canvas.height) {
        p.y = -20;
        p.x = Math.random() * ctx.canvas.width;
      }

      // Draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.isCircle) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    });
    ctx.restore();

    // Draw winner card (centered)
    const cardW = 600;
    const cardH = 400;
    const x = (ctx.canvas.width - cardW) / 2;
    const y = (ctx.canvas.height - cardH) / 2;

    // Use a spring-like entrance animation based on isVisible start time would be better,
    // but here we just render it. For a server-side canvas, we don't have easy hooks,
    // so we'll just draw the card with a slight glow.

    drawRoundedRect(
      ctx,
      x,
      y,
      cardW,
      cardH,
      24,
      hslAlpha(COLORS.CARD_BACKGROUND, 0.9),
      COLORS.NEON_PINK,
      2
    );

    // Winner Icon/Avatar
    ctx.save();
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(winnerAvatar || "🏆", x + cardW / 2, y + 100);
    ctx.restore();

    // Winner Name
    ctx.save();
    ctx.font = `bold ${TYPOGRAPHY.SIZE_LARGE}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "center";
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 20;
    ctx.fillText(winnerName || "WINNER!", x + cardW / 2, y + 220);
    ctx.restore();

    // Points message
    ctx.save();
    ctx.font = `bold ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_DISPLAY}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.textAlign = "center";
    ctx.fillText("+100 points!", x + cardW / 2, y + 300);
    ctx.restore();

    // Progress bar at bottom of card
    const barW = (Math.sin(timestamp * 0.005) * 0.5 + 0.5) * (cardW - 80);
    drawRoundedRect(
      ctx,
      x + 40,
      y + 350,
      cardW - 80,
      10,
      5,
      hslAlpha(COLORS.BORDER, 0.3),
      null,
      0
    );
    drawRoundedRect(
      ctx,
      x + 40,
      y + 350,
      barW,
      10,
      5,
      COLORS.NEON_BLUE,
      null,
      0
    );
  },
};

/**
 * UI Component: Background
 * Animated background with patterns, stars, and particles
 */
const Background = {
  stars: [],
  particles: [],
  lastPatternIdx: 0,
  lastSwitchTime: 0,
  transitioning: false,
  nextPatternIdx: 0,

  init(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const areaK = (w * h) / 1000;

    this.stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.002 + 0.0005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    this.particles = Array.from({ length: 5 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 20 + 10,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.1 - 0.05,
      opacity: 0.08,
      color: "200, 210, 255",
      pulseSpeed: 0.001,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    this.lastSwitchTime = Date.now();
  },

  /**
   * Render background
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} timestamp - Current timestamp
   */
  render(ctx, timestamp) {
    if (this.stars.length === 0) {
      this.init(ctx);
      this.lastSwitchTime = timestamp; // Initialize relative to stream start
    }

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 1. Static Dark Background (much faster than radial gradient every frame)
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, w, h);

    // Subtle overlay gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hslAlpha(COLORS.BACKGROUND, 0.4));
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Cycling Pattern
    const patternKeys = Object.keys(PATTERNS);
    const interval = 10000; // 10s
    const fade = 1500;
    const elapsed = timestamp - this.lastSwitchTime;

    if (!this.transitioning && elapsed >= interval - fade) {
      this.transitioning = true;
      this.nextPatternIdx = (this.lastPatternIdx + 1) % patternKeys.length;
    }

    if (this.transitioning) {
      const fadeProgress = Math.min((elapsed - (interval - fade)) / fade, 1);
      PATTERNS[patternKeys[this.lastPatternIdx]]({
        ctx,
        t: timestamp,
        w,
        h,
        speed: 1,
        opacity: 0.4 * (1 - fadeProgress),
        scale: 60,
      });
      PATTERNS[patternKeys[this.nextPatternIdx]]({
        ctx,
        t: timestamp,
        w,
        h,
        speed: 1,
        opacity: 0.4 * fadeProgress,
        scale: 60,
      });
      if (fadeProgress >= 1) {
        this.lastPatternIdx = this.nextPatternIdx;
        this.lastSwitchTime = timestamp;
        this.transitioning = false;
      }
    } else {
      PATTERNS[patternKeys[this.lastPatternIdx]]({
        ctx,
        t: timestamp,
        w,
        h,
        speed: 1,
        opacity: 0.4,
        scale: 60,
      });
    }

    // 3. Twinkling Stars
    this.stars.forEach((s) => {
      const twinkle =
        Math.sin(timestamp * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
      const alpha = s.opacity * (0.4 + twinkle * 0.6);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    });

    // 4. Floating Particles & Connections
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -p.size) p.x = w + p.size;
      if (p.x > w + p.size) p.x = -p.size;
      if (p.y < -p.size) {
        p.y = h + p.size;
        p.x = Math.random() * w;
      }

      const pulse = Math.sin(timestamp * p.pulseSpeed + p.pulseOffset) * 0.5 + 0.5;
      const alpha = p.opacity * (0.5 + pulse * 0.5);
      const radius = p.size * (0.8 + pulse * 0.2);

      const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      pGrad.addColorStop(0, `rgba(${p.color}, ${alpha})`);
      pGrad.addColorStop(1, `rgba(${p.color}, 0)`);
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Connections REMOVED for performance
  },
};

module.exports = {
  Header,
  Timer,
  Card,
  Button,
  List,
  Background,
  Celebration,
};
