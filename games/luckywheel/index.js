const state = require("./state");
const { calculateWinners } = require("./logic");
const C = require("./constants");

class LuckyWheelGame {
  async startNewRound() {
    await state.load();
    this.goToWaiting();
  }

  // Phase 1: Guessing (15s)
  async goToWaiting() {
    const SLICES = 10;
    const wheelNumbers = [];
    while (wheelNumbers.length < SLICES) {
      const num = Math.floor(Math.random() * 100) + 1;
      if (!wheelNumbers.includes(num)) wheelNumbers.push(num);
    }

    const winningIndex = Math.floor(Math.random() * SLICES);
    const luckyNumber = wheelNumbers[winningIndex];

    // 5 full spins + offset to land on the winner
    const targetRotation =
      Math.PI * 2 * 5 - winningIndex * ((Math.PI * 2) / SLICES);

    state.gameState.status = "waiting";
    state.gameState.round++;
    state.gameState.participants.clear();
    state.gameState.winners = [];
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
    if (!state.gameState.wheelValues.includes(guess)) return;

    state.gameState.participants.set(userId, { username, guess });
    await state.save();
  }

  /* --- BRIDGE METHODS FOR LIVE.JS --- */
  async load() {
    return await state.load();
  }

  getStateSync() {
    return state.getStateSync();
  }

  getLeaderboardSync() {
    return state.getLeaderboardSync();
  }
}

module.exports = new LuckyWheelGame();
