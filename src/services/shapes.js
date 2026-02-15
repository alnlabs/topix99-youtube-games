/**
 * Reusable shape drawing functions for canvas
 * All functions handle browser compatibility and provide consistent API
 */

/**
 * Draw a rounded rectangle with fallback to regular rectangle
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (top-left corner)
 * @param {number} y - Y position (top-left corner)
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number} cornerRadius - Corner radius for rounded corners
 * @param {string} fillColor - Fill color (optional, uses current fillStyle if not provided)
 * @param {string} strokeColor - Stroke color (optional, no stroke if not provided)
 * @param {number} lineWidth - Stroke line width (optional, defaults to 1)
 */
function drawRoundedRect(ctx, x, y, width, height, cornerRadius, fillColor = null, strokeColor = null, lineWidth = 1) {
  // Save current fill style if we need to restore it
  const originalFillStyle = fillColor ? ctx.fillStyle : null;
  const originalStrokeStyle = strokeColor ? ctx.strokeStyle : null;
  const originalLineWidth = strokeColor ? ctx.lineWidth : null;

  // Set fill color if provided
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }

  // Set stroke color if provided
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  // Check if browser supports rounded rectangles (newer feature)
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, cornerRadius);
    if (fillColor) ctx.fill();
    if (strokeColor) ctx.stroke();
  } else {
    // Fallback for browsers without roundRect support - draws regular rectangle
    if (fillColor) ctx.fillRect(x, y, width, height);
    if (strokeColor) ctx.strokeRect(x, y, width, height);
  }

  // Restore original styles if we changed them
  if (originalFillStyle) ctx.fillStyle = originalFillStyle;
  if (originalStrokeStyle) ctx.strokeStyle = originalStrokeStyle;
  if (originalLineWidth) ctx.lineWidth = originalLineWidth;
}

/**
 * Draw a regular rectangle
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (top-left corner)
 * @param {number} y - Y position (top-left corner)
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {string} fillColor - Fill color (optional, uses current fillStyle if not provided)
 * @param {string} strokeColor - Stroke color (optional, no stroke if not provided)
 * @param {number} lineWidth - Stroke line width (optional, defaults to 1)
 */
function drawRect(ctx, x, y, width, height, fillColor = null, strokeColor = null, lineWidth = 1) {
  // Save current styles if we need to restore them
  const originalFillStyle = fillColor ? ctx.fillStyle : null;
  const originalStrokeStyle = strokeColor ? ctx.strokeStyle : null;
  const originalLineWidth = strokeColor ? ctx.lineWidth : null;

  // Set fill color if provided
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }

  // Set stroke color if provided
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  // Draw rectangle
  if (fillColor) ctx.fillRect(x, y, width, height);
  if (strokeColor) ctx.strokeRect(x, y, width, height);

  // Restore original styles if we changed them
  if (originalFillStyle) ctx.fillStyle = originalFillStyle;
  if (originalStrokeStyle) ctx.strokeStyle = originalStrokeStyle;
  if (originalLineWidth) ctx.lineWidth = originalLineWidth;
}

/**
 * Draw a circle or arc
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - X position of center
 * @param {number} centerY - Y position of center
 * @param {number} radius - Circle radius
 * @param {number} startAngle - Start angle in radians (optional, defaults to 0)
 * @param {number} endAngle - End angle in radians (optional, defaults to 2π)
 * @param {string} fillColor - Fill color (optional, uses current fillStyle if not provided)
 * @param {string} strokeColor - Stroke color (optional, no stroke if not provided)
 * @param {number} lineWidth - Stroke line width (optional, defaults to 1)
 */
function drawCircle(ctx, centerX, centerY, radius, startAngle = 0, endAngle = Math.PI * 2, fillColor = null, strokeColor = null, lineWidth = 1) {
  // Save current styles if we need to restore them
  const originalFillStyle = fillColor ? ctx.fillStyle : null;
  const originalStrokeStyle = strokeColor ? ctx.strokeStyle : null;
  const originalLineWidth = strokeColor ? ctx.lineWidth : null;

  // Set fill color if provided
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }

  // Set stroke color if provided
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  // Draw circle/arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  if (fillColor) ctx.fill();
  if (strokeColor) ctx.stroke();

  // Restore original styles if we changed them
  if (originalFillStyle) ctx.fillStyle = originalFillStyle;
  if (originalStrokeStyle) ctx.strokeStyle = originalStrokeStyle;
  if (originalLineWidth) ctx.lineWidth = originalLineWidth;
}

/**
 * Draw a triangle
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x1 - X position of first vertex
 * @param {number} y1 - Y position of first vertex
 * @param {number} x2 - X position of second vertex
 * @param {number} y2 - Y position of second vertex
 * @param {number} x3 - X position of third vertex
 * @param {number} y3 - Y position of third vertex
 * @param {string} fillColor - Fill color (optional, uses current fillStyle if not provided)
 * @param {string} strokeColor - Stroke color (optional, no stroke if not provided)
 * @param {number} lineWidth - Stroke line width (optional, defaults to 1)
 */
function drawTriangle(ctx, x1, y1, x2, y2, x3, y3, fillColor = null, strokeColor = null, lineWidth = 1) {
  // Save current styles if we need to restore them
  const originalFillStyle = fillColor ? ctx.fillStyle : null;
  const originalStrokeStyle = strokeColor ? ctx.strokeStyle : null;
  const originalLineWidth = strokeColor ? ctx.lineWidth : null;

  // Set fill color if provided
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }

  // Set stroke color if provided
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  // Draw triangle
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  if (fillColor) ctx.fill();
  if (strokeColor) ctx.stroke();

  // Restore original styles if we changed them
  if (originalFillStyle) ctx.fillStyle = originalFillStyle;
  if (originalStrokeStyle) ctx.strokeStyle = originalStrokeStyle;
  if (originalLineWidth) ctx.lineWidth = originalLineWidth;
}

/**
 * Draw a progress bar
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (center of bar)
 * @param {number} y - Y position (top of bar)
 * @param {number} width - Total width of progress bar
 * @param {number} height - Height of progress bar
 * @param {number} progress - Progress value (0.0 to 1.0)
 * @param {string} bgColor - Background color (optional, defaults to rgba(0,0,0,0.5))
 * @param {string} fillColor - Fill color for progress (optional, defaults to #FFD700)
 */
function drawProgressBar(ctx, x, y, width, height, progress, bgColor = "rgba(0,0,0,0.5)", fillColor = "#FFD700") {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Draw background
  drawRect(ctx, x - width / 2, y, width, height, bgColor);

  // Draw progress fill
  const progressWidth = width * clampedProgress;
  drawRect(ctx, x - width / 2, y, Math.min(width, Math.max(0, progressWidth)), height, fillColor);
}

/**
 * Draw a sector (pie slice) from center point
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - X position of center
 * @param {number} centerY - Y position of center
 * @param {number} radius - Radius of sector
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @param {string} fillColor - Fill color (optional, uses current fillStyle if not provided)
 * @param {string} strokeColor - Stroke color (optional, no stroke if not provided)
 * @param {number} lineWidth - Stroke line width (optional, defaults to 1)
 */
function drawSector(ctx, centerX, centerY, radius, startAngle, endAngle, fillColor = null, strokeColor = null, lineWidth = 1) {
  // Save current styles if we need to restore them
  const originalFillStyle = fillColor ? ctx.fillStyle : null;
  const originalStrokeStyle = strokeColor ? ctx.strokeStyle : null;
  const originalLineWidth = strokeColor ? ctx.lineWidth : null;

  // Set fill color if provided
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }

  // Set stroke color if provided
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  // Draw sector (pie slice)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.closePath();
  if (fillColor) ctx.fill();
  if (strokeColor) ctx.stroke();

  // Restore original styles if we changed them
  if (originalFillStyle) ctx.fillStyle = originalFillStyle;
  if (originalStrokeStyle) ctx.strokeStyle = originalStrokeStyle;
  if (originalLineWidth) ctx.lineWidth = originalLineWidth;
}

module.exports = {
  drawRoundedRect,
  drawRect,
  drawCircle,
  drawTriangle,
  drawProgressBar,
  drawSector,
};
