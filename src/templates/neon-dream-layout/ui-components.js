/**
 * Neon Dream UI Components
 */

const { createCanvas } = require("canvas");
const { COLORS, TYPOGRAPHY, LAYOUT } = require("./design-system");
const { hslAlpha, drawNeonRect, easeOutQuad, drawMultilingualText } = require("./utils");

/**
 * Animated Background
 */
const Background = {
  staticCanvas: null,
  staticCtx: null,

  init(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    this.staticCanvas = createCanvas(w, h);
    this.staticCtx = this.staticCanvas.getContext("2d");

    // Pre-render Static Background
    const grad = this.staticCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
    grad.addColorStop(0, "hsl(230, 30%, 15%)");
    grad.addColorStop(1, COLORS.BACKGROUND);
    this.staticCtx.fillStyle = grad;
    this.staticCtx.fillRect(0, 0, w, h);

    // Pre-render Stars (Static)
    this.staticCtx.fillStyle = "white";
    for(let i=0; i<40; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 1.5 + 0.5;
        this.staticCtx.globalAlpha = Math.random() * 0.7 + 0.3;
        this.staticCtx.beginPath();
        this.staticCtx.arc(x, y, size, 0, Math.PI * 2);
        this.staticCtx.fill();
    }
    this.staticCtx.globalAlpha = 1.0;

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
  },

  render(ctx, timestamp) {
    if (!this.staticCanvas) this.init(ctx);
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 1. Draw Cached Static Background
    ctx.drawImage(this.staticCanvas, 0, 0);

    // 2. Dynamic Particles
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -p.size) p.x = w + p.size;
      if (p.x > w + p.size) p.x = -p.size;
      if (p.y < -p.size) p.y = h + p.size;

      const pulse = Math.sin(timestamp * p.pulseSpeed + p.pulseOffset) * 0.5 + 0.5;
      const alpha = p.opacity * (0.5 + pulse * 0.5);
      const radius = p.size * (0.8 + pulse * 0.2);

      const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      pGrad.addColorStop(0, `rgba(${p.color}, ${alpha})`);
      pGrad.addColorStop(1, "transparent");
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
};

/**
 * Circular Timer
 */
const Timer = {
  render(ctx, timer, x, y) {
    const { timeLeft, totalTime } = timer;
    const size = 66; // Scaled
    const radius = 28;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const isUrgent = timeLeft <= 5;

    // Background Circle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress Arc
    const progress = timeLeft / totalTime;
    const endAngle = -Math.PI / 2 + (Math.PI * 2 * progress);

    ctx.strokeStyle = isUrgent ? COLORS.NEON_PINK : COLORS.NEON_BLUE;
    ctx.lineCap = "round";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
    ctx.stroke();

    // Text
    ctx.font = `bold ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.ceil(timeLeft), centerX, centerY);
  }
};

/**
 * Neon Button (Answer Option)
 */
const Button = {
  render(ctx, btn, x, y, w, h) {
    const { label, prefix, status } = btn;
    let color = COLORS.NEON_BLUE;
    let opacity = 0.15;

    if (prefix === "A") color = COLORS.OPTION_A;
    if (prefix === "B") color = COLORS.OPTION_B;
    if (prefix === "C") color = COLORS.OPTION_C;
    if (prefix === "D") color = COLORS.OPTION_D;

    if (status === "correct") {
       color = COLORS.NEON_GREEN;
       opacity = 0.4;
    } else if (status === "incorrect") {
       color = COLORS.NEON_PINK;
       opacity = 0.1;
    } else if (status === "selected") {
       opacity = 0.6;
    }

    // Border and Glow
    drawNeonRect(ctx, x, y, w, h, 12, color, hslAlpha(color, opacity), status === "selected" ? 20 : 10);

    // Prefix Circle (A/B/C/D)
    const px = x + 30;
    const py = y + h / 2;
    ctx.fillStyle = hslAlpha(color, 0.3);
    ctx.beginPath();
    ctx.roundRect(px - 20, py - 20, 40, 40, 8);
    ctx.fill();

    ctx.font = `bold ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_SECONDARY}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(prefix, px, py);

    // Label Text (Multilingual)
    const textX = px + 35;
    const textW = w - (px - x) - 35 - 30; // 30 for icons
    const font = `500 ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_DISPLAY}`;
    const textColor = COLORS.FOREGROUND;

    drawMultilingualText(ctx, label, textX, py - 20, textW, font, textColor, "left", true);

    // Icons
    if (status === "correct") {
      ctx.font = `${TYPOGRAPHY.SIZE_BODY}px MouldyCheese`;
      ctx.textAlign = "right";
      ctx.fillText("✅", x + w - 20, py);
    } else if (status === "incorrect") {
      ctx.font = `${TYPOGRAPHY.SIZE_BODY}px MouldyCheese`;
      ctx.textAlign = "right";
      ctx.fillText("❌", x + w - 20, py);
    }
  }
};

/**
 * Question Card
 */
const Card = {
  render(ctx, card, x, y, w, h) {
    drawNeonRect(ctx, x, y, w, h, 20, COLORS.NEON_BLUE, "rgba(10, 10, 26, 0.7)", 15);

    if (card.title) {
      ctx.font = `bold ${TYPOGRAPHY.SIZE_SMALL}px ${TYPOGRAPHY.FONT_SECONDARY}`;
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.textAlign = "left";
      ctx.fillText(card.title.toUpperCase(), x + 20, y + 30);
    }
  }
};

/**
 * List Component (Leaderboard/Recent)
 */
const List = {
  render(ctx, list, x, y, w, h) {
    const { title, items } = list;
    drawNeonRect(ctx, x, y, w, h, 12, COLORS.BORDER, COLORS.CARD_BG, 5);

    ctx.font = `bold ${TYPOGRAPHY.SIZE_BODY}px ${TYPOGRAPHY.FONT_SECONDARY}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "left";
    ctx.fillText(title, x + 15, y + 35);

    if (!items || items.length === 0) {
      ctx.font = `italic ${TYPOGRAPHY.SIZE_SMALL}px ${TYPOGRAPHY.FONT_DISPLAY}`;
      ctx.fillStyle = COLORS.MUTED;
      ctx.textAlign = "center";
      ctx.fillText("Waiting for players...", x + w / 2, y + h / 2 + 20);
      return;
    }

    items.slice(0, 5).forEach((item, idx) => {
      const iy = y + 70 + idx * 45;
      ctx.font = `${TYPOGRAPHY.SIZE_SMALL}px ${TYPOGRAPHY.FONT_DISPLAY}`;
      ctx.fillStyle = COLORS.MUTED;
      ctx.textAlign = "left";
      ctx.fillText((idx + 1).toString(), x + 15, iy);

      ctx.fillStyle = COLORS.FOREGROUND;
      const name = item.playerName || item.username || item.name || "";
      if (name) {
          ctx.fillText(name, x + 40, iy);
          ctx.textAlign = "right";
          ctx.fillStyle = COLORS.NEON_YELLOW;
          ctx.fillText(item.score?.toString() || "0", x + w - 15, iy);
          ctx.textAlign = "left";
      }
    });
  }
};

module.exports = {
  Background,
  Timer,
  Button,
  Card,
  List
};
