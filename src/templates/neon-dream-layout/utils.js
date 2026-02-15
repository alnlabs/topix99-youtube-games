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
  // Safer key to avoid collisions
  const key = font + "|" + text;
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
 * Draw wrapped text with auto-scaling
 */
function drawWrappedText(ctx, text, x, y, maxWidth, font, color, align = "left", containerHeight = 0, vAlign = "top") {
  if (!text) return 0;
  ctx.save();

  let currentFontSize = parseInt(font.match(/\d+/)?.[0] || "16");
  const fontName = font.replace(/^\d+px\s+/, "").replace(/^bold\s+\d+px\s+/, "");
  const isBold = font.includes("bold");

  let lines = [];
  let lineHeight = currentFontSize * 1.3;
  let totalTextHeight = 0;
  let scaledFont = font;

  // Font scaling loop
  while (currentFontSize > 12) {
    scaledFont = `${isBold ? "bold " : ""}${currentFontSize}px ${fontName}`;
    ctx.font = scaledFont;
    lineHeight = currentFontSize * 1.3;

    const words = text.toString().trim().split(/\s+/);
    lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + " " + word;
        if (getCachedMeasure(ctx, testLine, scaledFont) > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    totalTextHeight = lines.length * lineHeight;

    if (containerHeight === 0 || totalTextHeight <= containerHeight) {
        break; // Fits vertically or no limit
    }
    currentFontSize -= 2; // Shrink
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let startY = y;
  if (containerHeight > 0) {
    if (vAlign === "middle") {
      startY = y + (containerHeight - totalTextHeight) / 2;
    } else if (vAlign === "bottom") {
      startY = y + containerHeight - totalTextHeight;
    }
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });

  ctx.restore();
  return totalTextHeight;
}

/**
 * Draw multilingual text with auto-scaling
 */
function drawMultilingualText(ctx, text, x, y, maxWidth, font, color, align = "left", joinLines = false, containerHeight = 0, vAlign = "top") {
  if (!text) return 0;
  if (typeof text === "string" || (!text.telugu && !text.hindi && !text.english)) {
    const content = typeof text === "string" ? text : (Object.values(text)[0] || "");
    return drawWrappedText(ctx, content, x, y, maxWidth, font, color, align, containerHeight, vAlign);
  }

  const languages = [];
  if (text.telugu) languages.push({ text: text.telugu.trim() });
  if (text.hindi) languages.push({ text: text.hindi.trim() });
  if (text.english) languages.push({ text: text.english.trim() });

  if (joinLines) {
    const joinedText = languages.map(l => l.text).join(" / ");
    return drawWrappedText(ctx, joinedText, x, y, maxWidth, font, color, align, containerHeight, vAlign);
  }

  ctx.save();
  let currentFontSize = parseInt(font.match(/\d+/)?.[0] || "16");
  const fontName = font.replace(/^\d+px\s+/, "").replace(/^bold\s+\d+px\s+/, "");
  const isBold = font.includes("bold");

  let languagesWithLines = [];
  let totalHeight = 0;
  let lineHeight = currentFontSize * 1.3;
  let languageSpacing = currentFontSize * 0.3;
  let scaledFont = font;

  // Font scaling loop
  while (currentFontSize > 12) {
    scaledFont = `${isBold ? "bold " : ""}${currentFontSize}px ${fontName}`;
    ctx.font = scaledFont;
    lineHeight = currentFontSize * 1.3;
    languageSpacing = currentFontSize * 0.3;

    languagesWithLines = languages.map(lang => {
        const words = lang.text.split(/\s+/);
        const lines = [];
        let curLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const test = curLine + " " + word;
            if (getCachedMeasure(ctx, test, scaledFont) > maxWidth) {
                lines.push(curLine);
                curLine = word;
            } else {
                curLine = test;
            }
        }
        lines.push(curLine);
        return lines;
    });

    totalHeight = languagesWithLines.reduce((acc, lines, idx) => {
        return acc + (lines.length * lineHeight) + (idx > 0 ? languageSpacing : 0);
    }, 0);

    if (containerHeight === 0 || totalHeight <= containerHeight) break;
    currentFontSize -= 2;
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let startY = y;
  if (containerHeight > 0) {
    if (vAlign === "middle") {
      startY = y + (containerHeight - totalHeight) / 2;
    } else if (vAlign === "bottom") {
      startY = y + containerHeight - totalHeight;
    }
  }

  let currentY = startY;
  languagesWithLines.forEach((lines, idx) => {
    if (idx > 0) currentY += languageSpacing;
    lines.forEach((line, lIdx) => {
      ctx.fillText(line, x, currentY + lIdx * lineHeight);
    });
    currentY += lines.length * lineHeight;
  });

  ctx.restore();
  return totalHeight;
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
