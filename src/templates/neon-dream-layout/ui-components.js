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
  particles: [],
  stars: [],

  init(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    this.particles = Array.from({ length: 4 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 40 + 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: 0.05,
      color: "200, 210, 255",
      pulseSpeed: 0.001,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));
  },

  drawHexGrid(ctx, t, w, h) {
    const scale = 50;
    const hexH = scale * Math.sqrt(3);
    const cols = Math.ceil(w / (scale * 1.5)) + 2;
    const rows = Math.ceil(h / hexH) + 2;
    const offsetX = (t * 0.01) % (scale * 3);

    ctx.save();
    ctx.strokeStyle = `rgba(100, 150, 255, 0.08)`;
    ctx.lineWidth = 1;

    for (let col = -1; col < cols; col++) {
      for (let row = -1; row < rows; row++) {
        const cx = col * scale * 1.5 + offsetX;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
        const pulse = Math.sin(t * 0.001 + col * 0.3 + row * 0.3) * 0.5 + 0.5;
        const r = scale * 0.5 * (0.8 + pulse * 0.2);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  render(ctx, timestamp) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (!this.stars.length) this.init(ctx);

    // 1. Dynamic Radial Gradient (Shifts slightly)
    const cx = w * 0.5 + Math.sin(timestamp * 0.0001) * w * 0.1;
    const cy = h * 0.5 + Math.cos(timestamp * 0.0001) * h * 0.1;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
    grad.addColorStop(0, "hsl(230, 30%, 15%)");
    grad.addColorStop(1, COLORS.BACKGROUND);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Hex Grid Pattern
    this.drawHexGrid(ctx, timestamp, w, h);

    // 3. Twinkling Stars
    ctx.fillStyle = "white";
    this.stars.forEach(s => {
      const twinkle = Math.sin(timestamp * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
      ctx.globalAlpha = s.opacity * (0.4 + twinkle * 0.6);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 4. Moving Particles
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -p.size) p.x = w + p.size;
      if (p.x > w + p.size) p.x = -p.size;
      if (p.y < -p.size) p.y = h + p.size;
      if (p.y > h + p.size) p.y = -p.size;

      const pulse = Math.sin(timestamp * p.pulseSpeed + p.pulseOffset) * 0.5 + 0.5;
      const alpha = p.opacity * (0.5 + pulse * 0.5);
      const radius = p.size * (1 + pulse * 0.2);

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
    // Shadow removed for performance
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

    drawMultilingualText(ctx, label, textX, y, textW, font, textColor, "left", true, h, "middle");

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
      let displayName = name;
      // Truncate to max 15 chars
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 15) + "...";
      }
      if (displayName) {
          ctx.fillText(displayName, x + 40, iy);
          ctx.textAlign = "right";
          ctx.fillStyle = COLORS.NEON_YELLOW;
          ctx.fillText(item.score?.toString() || "0", x + w - 15, iy);
          ctx.textAlign = "left";
      }
    });
  }
};

/**
 * Celebration Overlay
 */
const Celebration = {
  confetti: [],

  initConfetti(ctx) {
    const colors = [
      COLORS.NEON_BLUE,
      COLORS.NEON_PINK,
      COLORS.NEON_GREEN,
      COLORS.NEON_YELLOW,
      COLORS.NEON_PURPLE,
      COLORS.NEON_ORANGE,
    ];

    this.confetti = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * ctx.canvas.width,
      y: -20,
      size: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 8,
      vy: 4 + Math.random() * 6,
      color: colors[i % colors.length],
      rotation: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      isCircle: Math.random() > 0.5,
      opacity: 0.6 + Math.random() * 0.4
    }));
  },

  render(ctx, data, timestamp) {
    const { winnerName, winnerAvatar, isVisible, startTime, duration } = data;
    if (!isVisible) {
      this.confetti = [];
      return;
    }

    if (this.confetti.length === 0) {
      this.initConfetti(ctx);
    }

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 1. Render Confetti
    ctx.save();
    this.confetti.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vrot;

      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
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

    // 2. Winner Card
    const cardW = 700;
    const cardH = 450;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    // Pulse effect
    const pulse = Math.sin(timestamp * 0.005) * 0.05 + 1;
    drawNeonRect(ctx, cardX, cardY, cardW, cardH, 24, COLORS.NEON_PINK, "rgba(5, 5, 20, 0.95)", 20);

    // Avatar with pulse
    ctx.save();
    ctx.translate(w / 2, cardY + 120);
    ctx.scale(pulse, pulse);
    ctx.font = "bold 140px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(winnerAvatar || "🏆", 0, 0);
    ctx.restore();

    // Winner Name
    ctx.font = `bold ${TYPOGRAPHY.SIZE_TITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.FOREGROUND;
    ctx.textAlign = "center";
    let winnerDisplayName = winnerName || "WINNER!";
    if (winnerDisplayName.length > 15) {
      winnerDisplayName = winnerDisplayName.substring(0, 15) + "...";
    }
    // Shadow removed for performance
    ctx.fillText(winnerDisplayName, w / 2, cardY + 260);

    // Points
    ctx.font = `bold ${TYPOGRAPHY.SIZE_SUBTITLE}px ${TYPOGRAPHY.FONT_TITLE}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.fillText("+100 POINTS!", w / 2, cardY + 330);


    const barWidth = 400;
    const barHeight = 8;
    const barX = (w - barWidth) / 2;
    const barY = cardY + 380;
    // Calculate linear progress from 0 to 1 over the duration
    const elapsed = timestamp - (startTime || timestamp);
    const progress = Math.max(0, Math.min(1, elapsed / (duration || 3000)));

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.NEON_BLUE;
    // Shadow removed for performance
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
    ctx.fill();
    ctx.restore();
  }
};

module.exports = {
  Background,
  Timer,
  Button,
  Card,
  List,
  Celebration
};
