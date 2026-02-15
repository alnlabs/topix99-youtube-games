/**
 * Neon Dream Utilities
 */

const { COLORS } = require("./design-system");

/**
 * Text Measurement Cache
 */
const textCache = new Map();
const MAX_CACHE_SIZE = 1000;

function getCachedMeasure(ctx, text, font) {
  const key = font + text;
  if (textCache.has(key)) return textCache.get(key);

  ctx.font = font;
  const metrics = ctx.measureText(text);
  const width = metrics.width;

  if (textCache.size >= MAX_CACHE_SIZE) {
    const firstKey = textCache.keys().next().value;
    textCache.delete(firstKey);
  }
  textCache.set(key, width);
  return width;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
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
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * HSL string to RGBA
 */
function hslAlpha(hsl, alpha) {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `rgba(255, 255, 255, ${alpha})`;
  const { r, g, b } = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Drawing a Neon Glow Rect
 */
function drawNeonRect(ctx, x, y, w, h, radius, borderCol, fillCol, glowSize = 10) {
  ctx.save();

  // Shape
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);

  if (fillCol) {
    ctx.fillStyle = fillCol;
    ctx.fill();
  }

  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw wrapped text
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
    const testWidth = getCachedMeasure(ctx, testLine, font);

    if (testWidth > maxWidth && currentLine.length > 0) {
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
 * Draw multilingual text
 */
function drawMultilingualText(ctx, text, x, y, maxWidth, font, color, align = "left", joinLines = false) {
  if (typeof text === "string") {
    return drawWrappedText(ctx, text, x, y, maxWidth, font, color, align);
  }

  const languages = [];
  if (text.telugu) languages.push({ text: text.telugu });
  if (text.hindi) languages.push({ text: text.hindi });
  if (text.english) languages.push({ text: text.english });

  if (languages.length === 0) return 0;

  if (joinLines) {
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

  languages.forEach((lang, idx) => {
    if (idx > 0) currentY += languageSpacing;
    const words = lang.text.split(" ");
    const lines = [];
    let curLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const test = curLine + " " + word;
      if (getCachedMeasure(ctx, test, font) > maxWidth) {
        lines.push(curLine);
        curLine = word;
      } else {
        curLine = test;
      }
    }
    lines.push(curLine);

    lines.forEach((line, lIdx) => {
      ctx.fillText(line, x, currentY + lIdx * lineHeight);
    });
    currentY += lines.length * lineHeight;
  });

  ctx.restore();
  return currentY - y;
}

const easeOutQuad = (t) => t * (2 - t);

module.exports = {
  hslToRgb,
  hslAlpha,
  drawNeonRect,
  drawWrappedText,
  drawMultilingualText,
  getCachedMeasure,
  easeOutQuad
};
