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

  // 3. Winner Detection - Only exact matches win
  // Check if ANY of the user's guesses match the target
  let winners = [];

  for (const [userId, p] of s.participants) {
    // Get all guesses (support both new format with guesses array and old format with single guess)
    const guesses = p.guesses || (p.guess ? [p.guess] : []);

    // Check if any of the user's guesses match the target
    const hasMatch = guesses.includes(target);

    if (hasMatch) {
      // User has a winning guess - use the first matching guess (or latest if multiple match)
      const winningGuess = guesses.find(g => g === target) || guesses[guesses.length - 1];
      winners.push({
        userId,
        username: p.username,
        guess: winningGuess, // The guess that matched
        guesses: guesses, // All guesses
        guessCount: p.guessCount || guesses.length,
        d: 0
      });
    }
  }
  s.winners = winners;
};
