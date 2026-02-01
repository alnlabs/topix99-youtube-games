// games/luckywheel/logic.js
module.exports.calculateWinners = function (state) {
  const target = state.gameState.currentNumber;
  let closest = Infinity;
  let winners = [];

  for (const [userId, p] of state.gameState.participants) {
    const d = Math.abs(p.guess - target);
    if (d < closest) {
      closest = d;
      winners = [{ userId, ...p, d }];
    } else if (d === closest) {
      winners.push({ userId, ...p, d });
    }
  }

  state.gameState.winners = winners;
};
