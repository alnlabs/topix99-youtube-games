// live/background.js
// Safe animated geometric pattern generator (Trianglify-style but stable)

const palettes = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#23074d", "#cc5333"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77", "#ffaf7b"],
  ["#1d4350", "#a43931"],
  ["#232526", "#414345"],
  ["#283048", "#859398"],
];

let current = null;
let grid = [];
let seed = Math.random() * 9999;

function rand() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function pickNew() {
  current = palettes[Math.floor(Math.random() * palettes.length)];
  seed = Math.random() * 9999;
  grid = [];
}

/**
 * Build a grid of colored polygons
 */
function buildGrid(w, h) {
  const size = 160;
  grid = [];

  for (let y = -size; y < h + size; y += size) {
    for (let x = -size; x < w + size; x += size) {
      grid.push({
        x,
        y,
        color: current[Math.floor(rand() * current.length)],
        flip: rand() > 0.5,
      });
    }
  }
}

function draw(ctx, w, h, phase) {
  if (!current) pickNew();
  if (grid.length === 0) buildGrid(w, h);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  current.forEach((c, i) => grad.addColorStop(i / (current.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Triangular pattern overlay
  ctx.globalAlpha = 0.35;

  grid.forEach((cell) => {
    ctx.beginPath();
    if (cell.flip) {
      ctx.moveTo(cell.x, cell.y);
      ctx.lineTo(cell.x + 160, cell.y);
      ctx.lineTo(cell.x, cell.y + 160);
    } else {
      ctx.moveTo(cell.x + 160, cell.y);
      ctx.lineTo(cell.x + 160, cell.y + 160);
      ctx.lineTo(cell.x, cell.y + 160);
    }
    ctx.closePath();
    ctx.fillStyle = cell.color;
    ctx.fill();
  });

  ctx.globalAlpha = 1;

  // Phase tint
  if (phase === "spinning") {
    ctx.fillStyle = "rgba(255,215,0,0.12)";
    ctx.fillRect(0, 0, w, h);
  }
  if (phase === "finished") {
    ctx.fillStyle = "rgba(0,255,160,0.12)";
    ctx.fillRect(0, 0, w, h);
  }
}

module.exports = {
  draw,
  pickNew,
};
