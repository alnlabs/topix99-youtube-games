/**
 * Helper function to calculate font size based on target text height
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to measure
 * @param {string} fontFamily - Font family name
 * @param {number} targetHeight - Desired text height in pixels
 * @returns {number} Font size in pixels that will achieve the target height
 */
function calculateFontSizeForHeight(ctx, text, fontFamily, targetHeight) {
  // Start with an initial guess based on typical font metrics
  // Most fonts have actual height around 0.7-0.9 of font size
  let fontSize = targetHeight * 1.2; // Start with a reasonable multiplier
  let minSize = 1;
  let maxSize = targetHeight * 3; // Reasonable upper bound
  let bestSize = fontSize;
  let bestDiff = Infinity;

  // Binary search to find the font size that gives us closest to target height
  for (let i = 0; i < 20; i++) { // Max 20 iterations
    ctx.font = `bold ${fontSize}px '${fontFamily}'`;
    const metrics = ctx.measureText(text);
    const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const diff = Math.abs(actualHeight - targetHeight);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestSize = fontSize;
    }

    // If we're close enough (within 1px), we're done
    if (diff < 1) {
      return fontSize;
    }

    // Adjust font size based on whether actual height is too big or too small
    if (actualHeight > targetHeight) {
      maxSize = fontSize;
      fontSize = (minSize + fontSize) / 2;
    } else {
      minSize = fontSize;
      fontSize = (fontSize + maxSize) / 2;
    }
  }

  return bestSize;
}

module.exports = {
  calculateFontSizeForHeight,
};
