// File: src/games/quiz/game.js

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
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
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
    this._clearAllTimeouts();
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

      // --- CATEGORY-BASED SELECTION ---
      const { categorizedQuestions } = require("./data");

      // 1. Identify categories with available (unused) questions
      const availableCategories = Object.keys(categorizedQuestions).filter(cat => {
        const indices = categorizedQuestions[cat];
        return indices.some(idx => !state.gameState.usedQuestionIndices.includes(idx));
      });

      if (availableCategories.length === 0) {
        state.gameState.usedQuestionIndices = [];
        logger.info(`[quiz-game] All questions in all categories used, resetting cycle`);
        // Recalculate available categories after reset
        return this.goToQuestion(); // Restart with fresh indices
      }

      // 2. Pick a random category
      const randomCat = availableCategories[Math.floor(Math.random() * availableCategories.length)];

      // 3. Pick random unused question from that category
      const catIndices = categorizedQuestions[randomCat];
      const availableInCat = catIndices.filter(idx => !state.gameState.usedQuestionIndices.includes(idx));
      const randomIndex = Math.floor(Math.random() * availableInCat.length);
      state.gameState.currentQuestionIndex = availableInCat[randomIndex];

      logger.info(`[quiz-game] Cycle: ${state.gameState.usedQuestionIndices.length + 1}/${questions.length}. Category: ${randomCat} (${availableInCat.length} left). Index: ${state.gameState.currentQuestionIndex}`);
      logger.info(`[quiz-game] Questions remaining in current cycle: ${questions.length - (state.gameState.usedQuestionIndices.length + 1)}`);

      // Mark this question as used
      state.gameState.usedQuestionIndices.push(
        state.gameState.currentQuestionIndex
      );

      state.gameState.winnerId = null;
      state.gameState.selectedAnswerIndex = null;
      state.gameState.participants = new Map(); // Clear participants for new question

      const question = questions[state.gameState.currentQuestionIndex];
      const timeLimit = Math.max(20, question.timeLimit || 20); // Enforce minimum 25s for latency
      state.gameState.timeLeft = timeLimit;
      state.gameState.totalTime = timeLimit;
      state.gameState.timerEnd = Date.now() + timeLimit * 1000;

      await state.save();
      const { getQuestionDisplayString, transformQuestionMultilingual } = require("./utils");

      // Populate state with localized question data for renderer (multilingual)
      const transformed = transformQuestionMultilingual(question);
      state.gameState.questionText = transformed.questionText;
      state.gameState.options = transformed.options;
      state.gameState.correctAnswerIndex = transformed.correctIndex;

      await state.save();

      logger.info(
        `[quiz-game] Round ${
          state.gameState.round
        } - Question: ${getQuestionDisplayString(question)}`
      );

      // Update timer countdown
      let lastSaveTime = Date.now();
      const SAVE_INTERVAL = 1000; // Save once per second instead of every 100ms

      const updateTimer = async () => {
        try {
          // Double-check status before continuing
          if (state.gameState.status !== "question") return;

          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((state.gameState.timerEnd - now) / 1000));
          state.gameState.timeLeft = remaining;

          // Only save state every second to reduce Redis writes
          if (now - lastSaveTime >= SAVE_INTERVAL) {
            lastSaveTime = now;
            // Save state to ensure timer updates are reflected in UI
            try {
              await state.save();
            } catch (err) {
              logger.error(`[quiz-game] Error saving timer state: ${err.message}`);
            }
          }

          if (remaining <= 0) {
            // Timer reached zero, go to reveal phase
            state.gameState.timeLeft = 0;
            try {
              await state.save();
            } catch (err) {
              logger.error(`[quiz-game] Error saving final timer state: ${err.message}`);
            }
            // Use setTimeout to ensure we're not in a tight call stack
            this._setTimeout(async () => {
              try {
                await this.goToReveal();
              } catch (e) {
                logger.error(`[quiz-game] Error in goToReveal transition: ${e.message}`);
              }
            }, 3000);
          } else {
            // Continue updating every 100ms for smoother UI updates but save less frequently
            this._setTimeout(updateTimer, 100);
          }
        } catch (err) {
          logger.error(`[quiz-game] Uncaught error in updateTimer: ${err.message}`);
          // Recover by trying to go to reveal if we're stuck
          this._setTimeout(() => this.goToReveal(), 5000);
        }
      };

      // Start the timer
      updateTimer().catch(err => {
        logger.error(`[quiz-game] Fatal error in updateTimer start: ${err.message}`);
      });
    } catch (err) {
      logger.error(`[quiz-game] Failed to start question: ${err.message}`);
      // Don't throw, just retry
      this._setTimeout(() => this.goToQuestion(), 5000);
    }
  }

  async goToReveal() {
    this._clearAllTimeouts();
    // Prevent multiple executions if already transitioning
    if (state.gameState.status !== "question") {
      logger.debug(
        `[quiz-game] goToReveal called but status is ${state.gameState.status}, skipping`
      );
      return;
    }

    try {
      // Check participants BEFORE changing status to reveal
      const totalParticipants = state.gameState.participants?.size || 0;
      logger.info(`[quiz-game] Revel Transition: participants=${totalParticipants}, instanceOfMap=${state.gameState.participants instanceof Map}`);

      if (totalParticipants === 0) {
        logger.info("[quiz-game] No participants this round, skipping reveal phase");
        // Update status to reveal briefly or skip to next?
        // User said "dont show answer", so let's skip reveal status.
        this._setTimeout(async () => {
          try {
            await this.goToNext();
          } catch (e) {
            logger.error(`[quiz-game] Error skipping to next: ${e.message}`);
          }
        }, 1000);
        return;
      }

      state.gameState.status = "reveal";

      const question = questions[state.gameState.currentQuestionIndex];
      const correctAnswerers = []; // Fix: Declare correctAnswerers

      if (
        state.gameState.participants &&
        state.gameState.participants instanceof Map
      ) {
        state.gameState.participants.forEach((participant, key) => {
          logger.debug(`[quiz-game] Checking participant ${key}: answerIndex=${participant.answerIndex}`);
          if (participant.answerIndex === question.correctIndex) {
            const [userId, username] = key.split("|");
            correctAnswerers.push({
              userId: userId || username,
              username: participant.username || username,
              timestamp: participant.timestamp || Date.now(),
            });
            logger.info(`[quiz-game] Matched correct answerer: ${username}`);
          }
        });
      }

      // Sort by timestamp (fastest first)
      correctAnswerers.sort((a, b) => a.timestamp - b.timestamp);

      // Determine winner (80% chance someone answered correctly, and we have correct answers)
      const hasWinner = correctAnswerers.length > 0 && Math.random() < C.CORRECT_ANSWER_CHANCE;
      let winnerId = null;

      logger.info(`[quiz-game] Reveal Phase: Total participants=${totalParticipants}, Correct answerers=${correctAnswerers.length}, Correct index was=${question.correctIndex}`);

      if (hasWinner && correctAnswerers.length > 0) {
        // Fastest correct answerer wins
        const winner = correctAnswerers[0];
        winnerId = winner.userId;

        const bonus =
          C.BASE_SCORE + Math.floor(Math.random() * C.BONUS_SCORE_RANGE);
        await state.addScore(winnerId, winner.username, bonus);

        // Reload to get updated score
        await state.load();
        const updatedWinner = state.cachedLeaderboard.find(
          (p) => (p.userId || p.username) === winnerId
        );

        if (updatedWinner) {
          // Add to recent answers (maintain uniqueness)
          // Look for existing entry for this player by ID or Name (Case-Insensitive)
          const candidateName = (winner.username || "").toLowerCase().trim();
          const candidateId = String(winnerId || "").toLowerCase();

          const existingIdx = state.gameState.recentAnswers.findIndex(a => {
            const entryId = String(a.playerId || "").toLowerCase();
            const entryName = (a.playerName || "").toLowerCase().trim();
            return (candidateId && entryId === candidateId) ||
                   (candidateName && entryName === candidateName);
          });

          if (existingIdx !== -1) {
            logger.info(`[quiz-game] Deduplicating recent answer for ${winner.username} (Removed index ${existingIdx})`);
            state.gameState.recentAnswers.splice(existingIdx, 1);
          }

          // Add to recent answers (limit to last N)
          // Add to beginning of array so newest are on top
          state.gameState.recentAnswers.unshift({
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
            state.gameState.recentAnswers = state.gameState.recentAnswers.slice(
              0, C.RECENT_ANSWERS_COUNT
            );
          }

          state.gameState.winnerId = winnerId;
          state.gameState.winnerUsername = winner.username;
          logger.info(
            `[quiz-game] Winner: ${winner.username} (fastest correct answer)`
          );
        }
      } else {
        logger.info(
          `[quiz-game] No winner this round (no correct answers or random chance)`
        );
      }

      await state.save();

      if (winnerId) {
        this._setTimeout(async () => {
          try {
            await this.goToCelebration();
          } catch (e) {
            logger.error(`[quiz-game] Error in goToCelebration transition: ${e.message}`);
          }
        }, C.REVEAL_DURATION);
      } else {
        this._setTimeout(async () => {
          try {
            await this.goToNext();
          } catch (e) {
            logger.error(`[quiz-game] Error in goToNext transition: ${e.message}`);
          }
        }, C.REVEAL_DURATION + C.NEXT_QUESTION_DELAY);
      }
    } catch (err) {
      logger.error(`[quiz-game] Failed to reveal answer: ${err.message}`);
      this._setTimeout(() => this.goToNext(), 1000);
    }
  }

  async goToCelebration() {
    this._clearAllTimeouts();
    try {
      state.gameState.status = "celebration";
      state.gameState.celebrationStartTime = Date.now();
      state.gameState.celebrationDuration = C.CELEBRATION_DURATION;
      await state.save();
      logger.info(
        `[quiz-game] Celebrating winner: ${state.gameState.winnerId}`
      );

      this._setTimeout(() => this.goToNext(), C.CELEBRATION_DURATION);
    } catch (err) {
      logger.error(`[quiz-game] Failed to celebrate: ${err.message}`);
      this._setTimeout(() => this.goToNext(), 1000);
    }
  }

  async goToNext() {
    this._clearAllTimeouts();
    try {
      logger.info(`[quiz-game] Transitioning to next round...`);
      state.gameState.status = "next";
      await state.save();
      this._setTimeout(async () => {
        try {
          await this.goToQuestion();
        } catch (e) {
          logger.error(`[quiz-game] Error in goToQuestion transition from next: ${e.message}`);
        }
      }, C.NEXT_QUESTION_DELAY);
    } catch (err) {
      logger.error(`[quiz-game] Failed to go to next: ${err.message}`);
      this._setTimeout(() => this.goToQuestion(), 1000);
    }
  }

  async processChatMessage(userId, username, message) {
    logger.info(`[quiz-game] Processing message from ${username}: "${message}" (Status: ${state.gameState.status})`);

    // Only accept answers during question phase
    if (state.gameState.status !== "question") {
      return;
    }

    const question = questions[state.gameState.currentQuestionIndex];
    if (!question) return;

    // Normalized for Regex matching (uppercase and trimmed)
    const cleaned = String(message || "").trim().toUpperCase();
    let answerIndex = -1;

    // Robust Regex: Matches A-D or 1-4
    // 1. Matches at the start (e.g., "A", "A.", "A)", "1", "1.")
    // 2. Matches with space/brace before it (e.g., " (A", " A")
    const match = cleaned.match(/^([A-D1-4])([\s.,)\-]|$)/) || cleaned.match(/[\s(]([A-D1-4])([\s.,)\-]|$)/);

    if (match) {
        const char = match[1];

        // Map A-D to 0-3
        if (char >= 'A' && char <= 'D') {
            answerIndex = char.charCodeAt(0) - 65;
        }
        // Map 1-4 to 0-3
        else if (char >= '1' && char <= '4') {
            answerIndex = parseInt(char) - 1;
        }
    }

    if (answerIndex < 0 || answerIndex >= question.options.length) {
      return; // Invalid answer
    }

    // Store participant answer
    try {
      const { status } = state.gameState;
      const numOptions = question.options?.length || 0;

      // Allow late answers during the reveal phase (up to 5 seconds) to account for stream latency
      if (status !== "question" && status !== "reveal") {
        return;
      }

      const key = `${userId}|${username}`;
      if (!state.gameState.participants || !(state.gameState.participants instanceof Map)) {
        state.gameState.participants = new Map();
        logger.info(`[quiz-game] (Re)initialized participants Map (was ${typeof state.gameState.participants})`);
      }

      const existing = state.gameState.participants.get(key);

      if (!existing) {
        state.gameState.participants.set(key, {
          userId,
          username: username || "Anonymous",
          answerIndex,
          timestamp: Date.now(),
        });

        const count = state.gameState.participants.size;
        logger.info(`[quiz-game] User ${username} answered: ${answerIndex} (Correct: ${question.correctIndex})`);
        await state.save();
      } else {
        logger.debug(`[quiz-game] User ${username} already answered, skipping`);
      }
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
