const state = require("./state");
const { calculateWinners } = require("./logic");
const C = require("./constants");

class LuckyWheelGame {
  async startNewRound() {
    await state.load();

    state.gameState.round++;
    state.gameState.status = "waiting";
    state.gameState.currentNumber = Math.floor(Math.random() * 100) + 1;
    state.gameState.participants.clear();
    state.gameState.winners = [];
    state.gameState.spinSpeed = 0;
    state.gameState.celebration.active = false;
    state.gameState.lastSpinTime = Date.now();

    await state.save();

    // Schedule spin
    setTimeout(() => this.spin(), C.ROUND_INTERVAL);
  }

  async spin() {
    state.gameState.status = "spinning";
    state.gameState.spinSpeed = 0.25;
    state.gameState.lastSpinTime = Date.now();

    calculateWinners(state);
    await state.save();

    // Schedule end
    setTimeout(() => this.endRound(), C.SPIN_DURATION);
  }

  async endRound() {
    state.gameState.status = "finished";
    state.gameState.spinSpeed = 0;

    if (state.gameState.winners.length > 0) {
      const winner = state.gameState.winners[0];

      // 🏆 Save leaderboard
      await state.addWin(winner.userId || winner.username, winner.username);

      // 🎉 Trigger celebration
      await state.triggerCelebration(winner.username);
    }

    await state.save();

    // Start next round
    setTimeout(() => this.startNewRound(), 5000);
  }

  async processChatMessage(userId, username, message) {
    if (state.gameState.status !== "waiting") return;

    const match = message.match(/\b(\d+)\b/);
    if (!match) return;

    const guess = parseInt(match[1]);
    if (guess < C.MIN_NUMBER || guess > C.MAX_NUMBER) return;
    if (state.gameState.participants.has(userId)) return;

    state.gameState.participants.set(userId, { username, guess });
    await state.save();
  }

  // 🔥 REQUIRED BY live.js
  getState() {
    return state.gameState;
  }

  // 🔥 Leaderboard for canvas
  async getLeaderboard() {
    return state.getTopPlayers(5);
  }

  // 🔥 Overlay text for stream
  getOverlayText() {
    const s = state.gameState;

    if (s.status === "waiting")
      return `Round ${s.round} — Guess a number (1–100)`;

    if (s.status === "spinning") return `Spinning the wheel…`;

    if (s.status === "finished") {
      if (!s.winners.length) return "No winners 😢";
      return `Winner: ${s.winners[0].username} (${s.winners[0].guess})`;
    }

    return "Starting…";
  }
}

module.exports = new LuckyWheelGame();
