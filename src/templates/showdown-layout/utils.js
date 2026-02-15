/**
 * Reusable Template Utilities
 *
 * Common utility functions for canvas rendering that match React frontend behavior.
 * Used by all game templates for consistent rendering.
 */

const { COLORS, TYPOGRAPHY, LAYOUT } = require("./design-system");

/**
 * Convert hex color to rgba with alpha
 * @param {string} hex - Hex color (e.g., "#FF0000")
 * @param {number} alpha - Alpha value 0-1
 * @returns {string} rgba color string
 */
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convert HSL to RGB
 * @param {string} hsl - HSL color string (e.g., "hsl(220, 90%, 56%)")
 * @returns {Object} { r, g, b } values 0-255
 */
function hslToRgb(hsl) {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return { r: 255, g: 255, b: 255 };

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    g = Math.round(hue2rgb(p, q, h) * 255);
    b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  }

  return { r, g, b };
}

/**
 * Convert HSL to rgba string
 * @param {string} hsl - HSL color string
 * @param {number} alpha - Alpha value 0-1
 * @returns {string} rgba color string
 */
function hslAlpha(hsl, alpha) {
  const { r, g, b } = hslToRgb(hsl);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draw rounded rectangle (matches React border-radius behavior)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Border radius
 * @param {string} fillColor - Fill color
 * @param {string} strokeColor - Stroke color
 * @param {number} strokeWidth - Stroke width
 */
function drawRoundedRect(ctx, x, y, width, height, radius, fillColor, strokeColor, strokeWidth) {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw circle (for timer, avatars, etc.)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} radius - Radius
 * @param {string} fillColor - Fill color
 * @param {string} strokeColor - Stroke color
 * @param {number} strokeWidth - Stroke width
 */
function drawCircle(ctx, x, y, radius, fillColor, strokeColor, strokeWidth) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw text with word wrapping (matches React text rendering)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width for wrapping
 * @param {string} font - Font string (e.g., "bold 20px MouldyCheese")
 * @param {string} color - Text color
 * @param {string} align - Text alignment ("left", "center", "right")
 * @returns {number} Height of drawn text
 */
function drawWrappedText(ctx, text, x, y, maxWidth, font, color, align = "left") {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + " " + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const lineHeight = parseInt(font.match(/\d+/)?.[0] || "16") * 1.3;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  ctx.restore();
  return lines.length * lineHeight;
}

/**
 * Measure multilingual text height without drawing
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object|string} text - Text (string or {telugu, hindi, english})
 * @param {number} maxWidth - Maximum width
 * @param {string} font - Font string
 * @returns {number} Total height of text
 */
/**
 * Measure multilingual text height (matches drawMultilingualText logic)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object|string} text - Text to measure
 * @param {number} maxWidth - Maximum width
 * @param {string} font - Font string
 * @param {boolean} joinLines - Whether to join languages with slashes
 * @returns {number} Total height
 */
function measureMultilingualText(ctx, text, maxWidth, font, joinLines = false) {
  if (!text) return 0;

  if (typeof text === "string") {
    ctx.save();
    ctx.font = font;
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";
    const fontSize = parseInt(font.match(/\d+/)?.[0] || "16");
    const lineHeight = fontSize * 1.3;

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    ctx.restore();
    return lines.length * lineHeight;
  }

  // Multilingual object
  const languages = [];
  if (text.telugu) languages.push(text.telugu);
  if (text.hindi) languages.push(text.hindi);
  if (text.english) languages.push(text.english);

  if (languages.length === 0) return 0;

  if (joinLines) {
    const joinedText = languages.join(" / ");
    return measureMultilingualText(ctx, joinedText, maxWidth, font, false);
  }

  const fontSize = parseInt(font.match(/\d+/)?.[0] || "16");
  const lineHeight = fontSize * 1.3;
  const languageSpacing = fontSize * 0.3;
  let totalHeight = 0;

  languages.forEach((langText, langIndex) => {
    if (langIndex > 0) {
      totalHeight += languageSpacing;
    }

    ctx.save();
    ctx.font = font;
    const words = langText.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + " " + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    ctx.restore();
    totalHeight += lines.length * lineHeight;
  });

  return totalHeight;
}

/**
 * Draw multilingual text (matches React MultilingualText component)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object|string} text - Text (string or {telugu, hindi, english})
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width
 * @param {string} font - Font string
 * @param {string} color - Text color
 * @param {string} align - Text alignment
 * @returns {number} Total height of drawn text
 */
function drawMultilingualText(ctx, text, x, y, maxWidth, font, color, align = "left", joinLines = false) {
  if (typeof text === "string") {
    return drawWrappedText(ctx, text, x, y, maxWidth, font, color, align);
  }

  // Multilingual object
  const languages = [];
  if (text.telugu) languages.push({ lang: "Telugu", text: text.telugu });
  if (text.hindi) languages.push({ lang: "Hindi", text: text.hindi });
  if (text.english) languages.push({ lang: "English", text: text.english });

  if (languages.length === 0) return 0;

  if (joinLines) {
    // Join languages into a single string separated by slashes
    const joinedText = languages.map(l => l.text).join(" / ");
    return drawWrappedText(ctx, joinedText, x, y, maxWidth, font, color, align);
  }

  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  const fontSize = parseInt(font.match(/\d+/)?.[0] || "16");
  const lineHeight = fontSize * 1.3;
  const languageSpacing = fontSize * 0.3;
  let currentY = y;

  languages.forEach((lang, langIndex) => {
    if (langIndex > 0) {
      currentY += languageSpacing;
    }

    const words = lang.text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    lines.forEach((line, lineIndex) => {
      // For center/right alignment, calculate proper X position for each line
      let lineX = x;
      if (align === "center") {
        // x is already the center point, fillText will center automatically
        lineX = x;
      } else if (align === "right") {
        // x is the right edge, fillText will align to right
        lineX = x;
      }
      // For left alignment, x is the left edge
      ctx.fillText(line, lineX, currentY + lineIndex * lineHeight);
    });

    currentY += lines.length * lineHeight;
  });

  ctx.restore();
  return currentY - y;
}



/**
 * Create gradient (matches React gradient behavior)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x0 - Start X
 * @param {number} y0 - Start Y
 * @param {number} x1 - End X
 * @param {number} y1 - End Y
 * @param {Array} colorStops - Array of {offset, color}
 * @returns {CanvasGradient} Gradient object
 */
function createGradient(ctx, x0, y0, x1, y1, colorStops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  colorStops.forEach(({ offset, color }) => {
    gradient.addColorStop(offset, color);
  });
  return gradient;
}

/**
 * Linear interpolation
 */
function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

/**
 * Ease out quadratic
 */
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

/**
 * Patterns ported from aln-quiz-app
 */
const PATTERNS = {
  hexGrid({ ctx, t, w, h, speed, opacity, scale }) {
    const hexH = scale * Math.sqrt(3);
    const cols = Math.ceil(w / (scale * 1.5)) + 2;
    const rows = Math.ceil(h / hexH) + 2;
    const offsetX = (t * 0.01 * speed) % (scale * 3);
    ctx.strokeStyle = hslAlpha("hsl(220, 90%, 56%)", opacity); // Use NEON_BLUE base
    ctx.lineWidth = 1;
    for (let col = -1; col < cols; col += 2) { // Skip columns
      for (let row = -1; row < rows; row += 2) { // Skip rows
        const cx = col * scale * 1.5 + offsetX;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
        const pulse = Math.sin(t * 0.001 * speed + col * 0.3 + row * 0.3) * 0.5 + 0.5;
        const r = scale * (0.8 + pulse * 0.2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  },

  waveLines({ ctx, t, w, h, speed, opacity, scale }) {
    const waveCount = Math.ceil(h / scale) + 2;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < waveCount; i += 2) { // Draw half the waves
      const baseY = i * scale;
      const hue = ((t * 0.005 * speed * 20) + i * 30) % 360;
      ctx.strokeStyle = `hsla(${hue}, 60%, 70%, ${opacity})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 40) { // Larger step
        const y = baseY + Math.sin(x * 0.01 + t * 0.001 * speed + i * 0.5) * scale * 0.3
          + Math.sin(x * 0.005 + t * 0.0007 * speed + i * 0.8) * scale * 0.2;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },

  sacredGeometry({ ctx, t, w, h, speed, opacity, scale }) {
    const cx = w / 2, cy = h / 2;
    const layers = Math.ceil(Math.max(w, h) * 0.6 / scale);
    ctx.lineWidth = 1;
    for (let i = 1; i <= layers; i += 2) { // Skip layers
      const r = i * scale;
      const rot = t * 0.0002 * speed * (i % 2 === 0 ? 1 : -1);
      const pulse = Math.sin(t * 0.0008 * speed + i * 0.5) * 0.5 + 0.5;
      const sides = i % 3 === 0 ? 6 : i % 3 === 1 ? 8 : 5;
      const hue = ((t * 0.005 * speed * 10) + i * 40) % 360;
      ctx.strokeStyle = `hsla(${hue}, 50%, 65%, ${opacity * (0.5 + pulse * 0.5)})`;
      ctx.beginPath();
      for (let s = 0; s <= sides; s++) {
        const a = (Math.PI * 2 / sides) * s + rot;
        if (s === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();
    }
  },

  concentricRings({ ctx, t, w, h, speed, opacity, scale }) {
    const cx = w / 2 + Math.sin(t * 0.0003 * speed) * 50;
    const cy = h / 2 + Math.cos(t * 0.0004 * speed) * 30;
    const ringCount = Math.ceil(Math.max(w, h) * 0.7 / (scale * 0.5));
    ctx.lineWidth = 1;
    for (let i = 1; i <= ringCount; i += 3) { // Skip rings
      const pulse = Math.sin(t * 0.001 * speed - i * 0.15) * 0.5 + 0.5;
      const r = i * scale * 0.5 + pulse * 5;
      const hue = ((t * 0.005 * speed * 15) + i * 25) % 360;
      ctx.strokeStyle = `hsla(${hue}, 55%, 65%, ${opacity * (0.3 + pulse * 0.7) * Math.max(0, 1 - i / ringCount)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

module.exports = {
  hexAlpha,
  hslToRgb,
  hslAlpha,
  drawRoundedRect,
  drawCircle,
  drawWrappedText,
  drawMultilingualText,
  measureMultilingualText,
  createGradient,
  lerp,
  easeOutQuad,
  PATTERNS
};
