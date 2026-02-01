const state = require("./state");
const { calculateWinners } = require("./logic");
const C = require("./constants");

class LuckyWheelGame {
  async startNewRound() {
    await state.load();
    this.goToWaiting();
  }

  // Phase 1: Guessing (15s recommended to give users time)
  async goToWaiting() {
    const SLICES = 10;

    // 1. Generate 10 unique random numbers for the wheel slices
    const wheelNumbers = [];
    while (wheelNumbers.length < SLICES) {
      const num = Math.floor(Math.random() * 100) + 1;
      if (!wheelNumbers.includes(num)) wheelNumbers.push(num);
    }

    // 2. Pick one of THESE numbers to be the winner
    const winningIndex = Math.floor(Math.random() * SLICES);
    const luckyNumber = wheelNumbers[winningIndex];

    // 3. Calculate exact rotation to land on that index
    // (5 full spins) - (index offset). Index 0 is top, clockwise.
    const targetRotation =
      Math.PI * 2 * 5 - winningIndex * ((Math.PI * 2) / SLICES);

    state.gameState.status = "waiting";
    state.gameState.round++;
    state.gameState.participants.clear();
    state.gameState.winners = [];

    // NEW: Store wheel data in state so live.js can see it
    state.gameState.wheelValues = wheelNumbers;
    state.gameState.currentNumber = luckyNumber;
    state.gameState.targetRotation = targetRotation;

    state.gameState.timerEnd = Date.now() + 15000;
    await state.save();

    setTimeout(() => this.goToSpinning(), 15000);
  }

  // Phase 2: Spinning (5s)
  async goToSpinning() {
    state.gameState.status = "spinning";
    // Important: calculateWinners should compare participant guesses
    // against state.gameState.currentNumber
    calculateWinners(state);
    await state.save();

    setTimeout(() => this.goToWinner(), 5000);
  }

  // Phase 3: Winner Announcement (5s)
  async goToWinner() {
    state.gameState.status = "winner";
    const winners = state.gameState.winners;

    if (winners.length > 0) {
      const w = winners[0];
      await state.addWin(w.userId || w.username, w.username);
      // Optional: Add logic here to trigger visual celebration
    }
    await state.save();

    setTimeout(() => this.goToCooldown(), 5000);
  }

  // Phase 4: Cooldown (5s)
  async goToCooldown() {
    state.gameState.status = "cooldown";
    state.gameState.timerEnd = Date.now() + 5000;
    await state.save();

    setTimeout(() => this.startNewRound(), 5000);
  }

  async processChatMessage(userId, username, message) {
    if (state.gameState.status !== "waiting") return;
    const match = message.match(/\b(\d+)\b/);
    if (!match) return;

    const guess = parseInt(match[1]);
    if (guess < 1 || guess > 100) return;

    // Check if the guess exists on the current wheel
    if (!state.gameState.wheelValues.includes(guess)) return;

    state.gameState.participants.set(userId, { username, guess });
    await state.save();
  }

  getState() {
    return state.gameState;
  }

  async getLeaderboard() {
    return state.getTopPlayers(5);
  }
}

module.exports = new LuckyWheelGame();
