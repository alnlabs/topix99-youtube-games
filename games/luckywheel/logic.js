module.exports.calculateWinners = function (state) {
  const s = state.gameState;
  const target = s.currentNumber;

  // 1. Map 1-100 to 10 slices (0-9)
  const sliceIndex = Math.min(Math.floor((target - 1) / 10), 9);
  const sliceAngle = (Math.PI * 2) / 10;

  // 2. Determine target rotation
  // We take current position + 5 full spins (PI*2*5)
  // Then subtract the slice offset to align with the top arrow
  const extraSpins = Math.PI * 2 * 5;
  const sliceOffset = sliceIndex * sliceAngle + sliceAngle / 2;

  // We use current position as the base to ensure it spins forward
  s.targetRotation =
    s.wheelPosition +
    extraSpins -
    (s.wheelPosition % (Math.PI * 2)) -
    sliceOffset;

  // 3. Winner Detection
  let closest = Infinity;
  let winners = [];

  for (const [userId, p] of s.participants) {
    const d = Math.abs(p.guess - target);
    if (d < closest) {
      closest = d;
      winners = [{ userId, ...p, d }];
    } else if (d === closest) {
      winners.push({ userId, ...p, d });
    }
  }
  s.winners = winners;
};
