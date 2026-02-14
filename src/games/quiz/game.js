const state = require("./state");
const C = require("./constants");
const { logger } = require("../../services");
const { questions } = require("./data");

class QuizGame {
  constructor() {
    this.timeouts = new Set();
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
      this.goToQuestion();
    } catch (err) {
      logger.error(`[quiz-game] Failed to start new round: ${err.message}`);
      throw err;
    }
  }

  async goToQuestion() {
    try {
      state.gameState.status = "question";
      state.gameState.round++;

      // Track used questions - if all questions used, reset cycle
      if (!state.gameState.usedQuestionIndices) {
        state.gameState.usedQuestionIndices = [];
      }

      // If all questions have been used, reset the cycle
      if (state.gameState.usedQuestionIndices.length >= questions.length) {
        state.gameState.usedQuestionIndices = [];
        logger.info(`[quiz-game] All questions used, starting new cycle`);
      }

      // Get available (unused) question indices
      const availableIndices = [];
      for (let i = 0; i < questions.length; i++) {
        if (!state.gameState.usedQuestionIndices.includes(i)) {
          availableIndices.push(i);
        }
      }

      // Randomly pick from available questions
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      state.gameState.currentQuestionIndex = availableIndices[randomIndex];

      // Mark this question as used
      state.gameState.usedQuestionIndices.push(state.gameState.currentQuestionIndex);

      state.gameState.winnerId = null;
      state.gameState.selectedAnswerIndex = null;
      state.gameState.participants = new Map(); // Clear participants for new question

      const question = questions[state.gameState.currentQuestionIndex];
      state.gameState.timeLeft = question.timeLimit;
      state.gameState.timerEnd = Date.now() + (question.timeLimit * 1000);

      await state.save();
      const { getQuestionDisplayString } = require("./utils");
      logger.info(`[quiz-game] Round ${state.gameState.round} - Question: ${getQuestionDisplayString(question)}`);

      // Update timer countdown
      const updateTimer = () => {
        if (state.gameState.status !== "question") return;
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((state.gameState.timerEnd - now) / 1000));
        state.gameState.timeLeft = remaining;

        if (remaining <= 0) {
          this.goToReveal();
        } else {
          this._setTimeout(updateTimer, 1000);
        }
      };
      updateTimer();
    } catch (err) {
      logger.error(`[quiz-game] Failed to start question: ${err.message}`);
      throw err;
    }
  }

  async goToReveal() {
    try {
      await state.load(); // Reload to get latest participants
      state.gameState.status = "reveal";

      const question = questions[state.gameState.currentQuestionIndex];
      if (!question) {
        await state.save();
        this._setTimeout(() => this.goToNext(), C.REVEAL_DURATION);
        return;
      }

      // Find correct answerers (those who answered the correct option)
      const correctAnswerers = [];
      if (state.gameState.participants && state.gameState.participants instanceof Map) {
        state.gameState.participants.forEach((participant, key) => {
          if (participant.answerIndex === question.correctIndex) {
            const [userId, username] = key.split("|");
            correctAnswerers.push({
              userId: userId || username,
              username: participant.username || username,
              timestamp: participant.timestamp || Date.now(),
            });
          }
        });
      }

      // Sort by timestamp (fastest first)
      correctAnswerers.sort((a, b) => a.timestamp - b.timestamp);

      // Determine winner (80% chance someone answered correctly, and we have correct answers)
      const hasWinner = correctAnswerers.length > 0 && Math.random() < C.CORRECT_ANSWER_CHANCE;
      let winnerId = null;

      if (hasWinner && correctAnswerers.length > 0) {
        // Fastest correct answerer wins
        const winner = correctAnswerers[0];
        winnerId = winner.userId;

        const bonus = C.BASE_SCORE + Math.floor(Math.random() * C.BONUS_SCORE_RANGE);
        await state.addScore(winnerId, winner.username, bonus);

        // Reload to get updated score
        await state.load();
        const updatedWinner = state.cachedLeaderboard.find(p =>
          (p.userId || p.username) === winnerId
        );

        if (updatedWinner) {
          // Add to recent answers
          state.gameState.recentAnswers.push({
            playerId: winnerId,
            playerName: winner.username,
            playerAvatar: "🎉",
            questionId: question.id,
            correct: true,
            timestamp: Date.now(),
            score: updatedWinner.score || bonus,
          });

          // Keep only last N recent answers
          if (state.gameState.recentAnswers.length > C.RECENT_ANSWERS_COUNT) {
            state.gameState.recentAnswers = state.gameState.recentAnswers.slice(-C.RECENT_ANSWERS_COUNT);
          }

          state.gameState.winnerId = winnerId;
          logger.info(`[quiz-game] Winner: ${winner.username} (fastest correct answer)`);
        }
      } else {
        logger.info(`[quiz-game] No winner this round (no correct answers or random chance)`);
      }

      await state.save();

      if (winnerId) {
        this._setTimeout(() => this.goToCelebration(), C.REVEAL_DURATION);
      } else {
        this._setTimeout(() => this.goToNext(), C.REVEAL_DURATION + C.NEXT_QUESTION_DELAY);
      }
    } catch (err) {
      logger.error(`[quiz-game] Failed to reveal answer: ${err.message}`);
      this._setTimeout(() => this.goToNext(), 1000);
    }
  }

  async goToCelebration() {
    try {
      state.gameState.status = "celebration";
      await state.save();
      logger.info(`[quiz-game] Celebrating winner: ${state.gameState.winnerId}`);

      this._setTimeout(() => this.goToNext(), C.CELEBRATION_DURATION);
    } catch (err) {
      logger.error(`[quiz-game] Failed to celebrate: ${err.message}`);
      this._setTimeout(() => this.goToNext(), 1000);
    }
  }

  async goToNext() {
    try {
      state.gameState.status = "next";
      await state.save();
      this._setTimeout(() => this.goToQuestion(), C.NEXT_QUESTION_DELAY);
    } catch (err) {
      logger.error(`[quiz-game] Failed to go to next: ${err.message}`);
      this._setTimeout(() => this.goToQuestion(), 1000);
    }
  }

  async processChatMessage(userId, username, message) {
    // Only accept answers during question phase
    if (state.gameState.status !== "question") {
      return;
    }

    const question = questions[state.gameState.currentQuestionIndex];
    if (!question) return;

    // Extract answer option (A, B, C, D or 1, 2, 3, 4)
    const normalized = message.trim().toUpperCase();
    let answerIndex = -1;

    // Check for letter answers (A, B, C, D) - can be standalone or with period
    if (normalized === "A" || normalized === "A." || normalized.startsWith("A ")) answerIndex = 0;
    else if (normalized === "B" || normalized === "B." || normalized.startsWith("B ")) answerIndex = 1;
    else if (normalized === "C" || normalized === "C." || normalized.startsWith("C ")) answerIndex = 2;
    else if (normalized === "D" || normalized === "D." || normalized.startsWith("D ")) answerIndex = 3;
    // Check for number answers (1, 2, 3, 4)
    else if (normalized === "1" || normalized === "1." || normalized.startsWith("1 ")) answerIndex = 0;
    else if (normalized === "2" || normalized === "2." || normalized.startsWith("2 ")) answerIndex = 1;
    else if (normalized === "3" || normalized === "3." || normalized.startsWith("3 ")) answerIndex = 2;
    else if (normalized === "4" || normalized === "4." || normalized.startsWith("4 ")) answerIndex = 3;

    if (answerIndex < 0 || answerIndex >= question.options.length) {
      return; // Invalid answer
    }

    const labels = ["A", "B", "C", "D"];

    // Store participant answer
    try {
      // For quiz, we only keep the first answer per user per question
      // (unlike luckywheel which allows multiple guesses)
      const key = `${userId}|${username}`;
      const existing = state.gameState.participants?.get?.(key);

      if (!existing) {
        // First answer from this user for this question
        if (!state.gameState.participants) {
          state.gameState.participants = new Map();
        }
        state.gameState.participants.set(key, {
          userId,
          username: username || "Anonymous",
          answerIndex,
          timestamp: Date.now(),
        });
        logger.debug(`[quiz-game] User ${username} (${userId}) answered: ${question.options[answerIndex]}`);
        await state.save();
      }
      // If user already answered, ignore (only first answer counts)
    } catch (err) {
      logger.error(`[quiz-game] Failed to save answer: ${err.message}`);
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

  cleanup() {
    this._clearAllTimeouts();
    logger.info("[quiz-game] Game cleanup completed");
  }
}

module.exports = QuizGame;
