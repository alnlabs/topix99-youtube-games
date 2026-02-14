const state = require("./state");
const { calculateWinners } = require("./logic");
const C = require("./constants");
const { logger } = require("../../services");

class LuckyWheelGame {
  constructor() {
    this.timeouts = new Set(); // Track timeouts for cleanup
  }

  _setTimeout(callback, delay) {
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout);
      callback();
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  _clearAllTimeouts() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }

  async startNewRound() {
    try {
      await state.load();
      this.goToWaiting();
    } catch (err) {
      logger.error(`[game] Failed to start new round: ${err.message}`);
      throw err;
    }
  }

  // Phase 1: Guessing
  async goToWaiting() {
    const SLICES = 10;
    const wheelNumbers = [];

    // Generate unique random numbers for wheel
    while (wheelNumbers.length < SLICES) {
      const num = Math.floor(Math.random() * (C.MAX_NUMBER - C.MIN_NUMBER + 1)) + C.MIN_NUMBER;
      if (!wheelNumbers.includes(num)) {
        wheelNumbers.push(num);
      }
    }

    // Sort for better visual display
    wheelNumbers.sort((a, b) => a - b);

    // Update state (excluding targetRotation, which is now handled by startSpin)
    state.gameState.status = "waiting";
    state.gameState.round++;
    state.gameState.participants.clear();
    state.gameState.winners = [];
    state.gameState.wheelValues = wheelNumbers;
    state.gameState.currentNumber = null; // Unknown yet
    state.gameState.timerEnd = Date.now() + C.WAITING_DURATION;
    // Clear celebration for new round
    state.gameState.celebration = { active: false, username: null, startTime: 0 };

    try {
      await state.save();
      logger.info(`[game] Round ${state.gameState.round} started - waiting for guesses`);
      this._setTimeout(() => this.goToSpinning(), C.WAITING_DURATION);
    } catch (err) {
      logger.error(`[game] Failed to save waiting state: ${err.message}`);
      throw err;
    }
  }

  // Phase 2: Spinning
  async goToSpinning() {
    try {
      // Spin randomly using physics
      await state.startSpin();
      logger.info("[game] Wheel spinning...");

      // Note: state.startSpin sets a timeout to change status to "finished" after 4.9s
      // We synchronize our controller to that.
      this._setTimeout(() => this.goToWinner(), C.SPIN_DURATION);
    } catch (err) {
      logger.error(`[game] Failed to start spin: ${err.message}`);
      // Try to recover by going to cooldown
      this._setTimeout(() => this.goToCooldown(), 1000);
    }
  }

  // Phase 3: Winner Announcement
  async goToWinner() {
    try {
      // Reload state to ensure we have the latest data including currentNumber and all participants
      // This fixes timing issues where answers might not be received/saved in time
      await state.load();

      // Wait a bit if currentNumber is not set yet (should be set by startSpin after 4900ms)
      // But we're called after 7000ms, so it should be set. Add retry just in case.
      let retries = 0;
      while (!state.gameState.currentNumber && retries < 5) {
        logger.warn(`[game] currentNumber not set yet, waiting... (retry ${retries + 1}/5)`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        await state.load(); // Reload state
        retries++;
      }

      if (!state.gameState.currentNumber) {
        logger.error(`[game] currentNumber still not set after ${retries} retries, cannot calculate winners`);
        state.gameState.status = "cooldown";
        await state.save();
        this._setTimeout(() => this.goToCooldown(), 1000);
        return;
      }

      state.gameState.status = "winner";

      // NOW we calculate winners, because currentNumber is set by state.js completion
      calculateWinners(state);

      const winners = state.gameState.winners;

      // Debug logging
      logger.info(`[game] Winner calculation: target=${state.gameState.currentNumber}, participants=${state.gameState.participants.size}, winners found=${winners.length}`);
      if (state.gameState.participants.size > 0) {
        const participantList = Array.from(state.gameState.participants.entries()).map(([id, p]) =>
          `${p.username}(${id}): guesses=[${(p.guesses || [p.guess]).join(',')}]`
        );
        logger.debug(`[game] Participants: ${participantList.join('; ')}`);
      }

      if (winners.length > 0) {
        const w = winners[0];
        // Calculate score based on number of guesses
        // Single guess = higher score, multiple guesses = lower score
        const guessCount = w.guessCount || 1;
        let score = 0;
        if (guessCount === 1) {
          // Single guess that matches = full points
          score = C.BASE_SCORE_SINGLE_GUESS;
        } else {
          // Multiple guesses = base score divided by guess count (minimum 1 point)
          score = Math.max(1, Math.floor(C.BASE_SCORE_MULTIPLE_GUESSES / guessCount));
        }

        logger.info(`[game] Winner: ${w.username} (guess: ${w.guess}, actual: ${state.gameState.currentNumber}, guesses: ${guessCount}, score: ${score})`);
        await state.addWin(w.userId || w.username, w.username, score);
        // Trigger celebration only if there's a winner
        await state.triggerCelebration(w.username);
      } else {
        logger.info(`[game] No winners this round (winning number: ${state.gameState.currentNumber})`);
        // Clear celebration if no winner
        state.gameState.celebration = { active: false, username: null, startTime: 0 };
      }

      await state.save();
      this._setTimeout(() => this.goToCooldown(), C.WINNER_DURATION);
    } catch (err) {
      logger.error(`[game] Failed to process winner: ${err.message}`);
      // Continue to cooldown anyway
      this._setTimeout(() => this.goToCooldown(), 1000);
    }
  }

  // Phase 4: Cooldown
  async goToCooldown() {
    try {
      state.gameState.status = "cooldown";
      state.gameState.timerEnd = Date.now() + C.COOLDOWN_DURATION;
      await state.save();
      logger.info("[game] Cooldown phase - next round starting soon");
      this._setTimeout(() => this.startNewRound(), C.COOLDOWN_DURATION);
    } catch (err) {
      logger.error(`[game] Failed to start cooldown: ${err.message}`);
      // Retry starting new round after a delay
      this._setTimeout(() => this.startNewRound(), 2000);
    }
  }

  async processChatMessage(userId, username, message) {
    // Only accept guesses during waiting phase
    if (state.gameState.status !== "waiting") {
      return;
    }

    // Extract number from message
    const match = message.match(/\b(\d+)\b/);
    if (!match) {
      return;
    }

    const guess = parseInt(match[1], 10);

    // Validate guess range
    if (guess < C.MIN_NUMBER || guess > C.MAX_NUMBER) {
      return;
    }

    // Validate guess is on the wheel
    if (!state.gameState.wheelValues || !state.gameState.wheelValues.includes(guess)) {
      return;
    }

    // Store participant - allow multiple guesses from same user
    // Track all guesses to calculate score (single guess = more points, multiple = less points)
    try {
      const existingParticipant = state.gameState.participants.get(userId);

      if (existingParticipant) {
        // User already has guesses - add this new one to the list
        const guesses = existingParticipant.guesses || [existingParticipant.guess]; // Support old format
        guesses.push(guess);

        // Keep only the last MAX_GUESSES_PER_USER guesses (slice to last 5)
        const maxGuesses = C.MAX_GUESSES_PER_USER;
        const trimmedGuesses = guesses.length > maxGuesses
          ? guesses.slice(-maxGuesses) // Keep only last 5
          : guesses;
        const guessCount = trimmedGuesses.length;

        state.gameState.participants.set(userId, {
          username: username || "Anonymous",
          guess: guess, // Keep latest guess for backward compatibility
          guesses: trimmedGuesses, // Store all guesses (max 5)
          guessCount: guessCount
        });
        logger.debug(`[game] User ${username} (${userId}) submitted guess #${guesses.length}: ${guess} (keeping last ${guessCount} guesses: ${trimmedGuesses.join(', ')})`);
      } else {
        // First guess from this user
        state.gameState.participants.set(userId, {
          username: username || "Anonymous",
          guess: guess, // Keep for backward compatibility
          guesses: [guess], // Store all guesses in array
          guessCount: 1
        });
        logger.debug(`[game] User ${username} (${userId}) submitted first guess: ${guess}`);
      }
      await state.save();
    } catch (err) {
      logger.error(`[game] Failed to save participant guess: ${err.message}`);
      // Don't throw - this is non-critical
    }
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

  // Cleanup method for graceful shutdown
  cleanup() {
    this._clearAllTimeouts();
    logger.info("[game] Game cleanup completed");
  }
}

// Export the class for registry to instantiate
module.exports = LuckyWheelGame;
