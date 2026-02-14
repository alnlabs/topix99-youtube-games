const { redisClient } = require("../../services");
const C = require("./constants");

// Determine if we're in test mode or live mode
const IS_TEST_MODE = process.env.TEST_MODE === "true";
const GAME_KEY = IS_TEST_MODE ? "game:quiz:test" : "game:quiz";
const LEADERBOARD_KEY = IS_TEST_MODE ? "leaderboard:quiz:test" : "leaderboard:quiz";

console.log(`[quiz-state] Running in ${IS_TEST_MODE ? "TEST" : "LIVE"} mode`);
console.log(`[quiz-state] Using Redis keys: GAME_KEY="${GAME_KEY}", LEADERBOARD_KEY="${LEADERBOARD_KEY}"`);

module.exports = {
  gameState: {
    round: 0,
    status: "question", // question | reveal | celebration | next
    currentQuestionIndex: 0,
    timeLeft: 0,
    timerEnd: 0,
    winnerId: null,
    selectedAnswerIndex: null,
    recentAnswers: [],
    participants: new Map(), // Track participants and their answers
    usedQuestionIndices: [], // Track which questions have been used in current cycle
    lastUpdate: 0,
  },

  cachedLeaderboard: [],

  getStateSync() {
    return this.gameState;
  },

  getLeaderboardSync() {
    return this.cachedLeaderboard;
  },

  async save() {
    try {
      // Convert participants Map to array for JSON serialization
      const participantsArray = [];
      if (this.gameState.participants && this.gameState.participants instanceof Map) {
        this.gameState.participants.forEach((value, key) => {
          participantsArray.push({ key, value });
        });
      }

      const payload = {
        round: String(this.gameState.round),
        status: this.gameState.status,
        currentQuestionIndex: String(this.gameState.currentQuestionIndex || 0),
        timeLeft: String(this.gameState.timeLeft || 0),
        timerEnd: String(this.gameState.timerEnd || 0),
        winnerId: String(this.gameState.winnerId || ""),
        selectedAnswerIndex: String(this.gameState.selectedAnswerIndex !== null ? this.gameState.selectedAnswerIndex : ""),
        participants: JSON.stringify(participantsArray),
        usedQuestionIndices: JSON.stringify(this.gameState.usedQuestionIndices || []),
        recentAnswers: JSON.stringify(this.gameState.recentAnswers || []),
        lastUpdate: String(Date.now()),
      };

      await redisClient.hSet(GAME_KEY, payload);
    } catch (err) {
      console.error("[quiz-state] Redis Save Error:", err.message);
      throw err;
    }
  },

  async load() {
    try {
      const [data, lbData] = await Promise.all([
        redisClient.hGetAll(GAME_KEY),
        redisClient.zRangeWithScores(LEADERBOARD_KEY, 0, C.TOP_PLAYERS_COUNT - 1, {
          REV: true,
        }),
      ]);

      if (!data || !data.status) return;

      this.gameState.round = parseInt(data.round || 0);
      this.gameState.status = data.status;
      this.gameState.currentQuestionIndex = parseInt(data.currentQuestionIndex || 0);
      this.gameState.timeLeft = parseInt(data.timeLeft || 0);
      this.gameState.timerEnd = parseInt(data.timerEnd || 0);
      this.gameState.winnerId = data.winnerId || null;
      this.gameState.selectedAnswerIndex = data.selectedAnswerIndex !== undefined && data.selectedAnswerIndex !== ""
        ? parseInt(data.selectedAnswerIndex)
        : null;

      // Restore used question indices
      if (data.usedQuestionIndices) {
        this.gameState.usedQuestionIndices = JSON.parse(data.usedQuestionIndices);
      } else {
        this.gameState.usedQuestionIndices = [];
      }

      // Restore participants Map
      if (data.participants) {
        const participantsArray = JSON.parse(data.participants);
        this.gameState.participants = new Map();
        participantsArray.forEach(({ key, value }) => {
          this.gameState.participants.set(key, value);
        });
      } else {
        this.gameState.participants = new Map();
      }

      if (data.recentAnswers) {
        this.gameState.recentAnswers = JSON.parse(data.recentAnswers);
      }

      // Update cached leaderboard
      this.cachedLeaderboard = lbData.map((e) => {
        const value = e.value;
        if (value.includes("|")) {
          const [userId, username] = value.split("|");
          return { username, score: e.score, userId };
        } else {
          return { username: value, score: e.score, userId: value };
        }
      });
    } catch (err) {
      console.error("[quiz-state] Redis Load Error:", err.message);
      throw err;
    }
  },

  async addScore(userId, username, points) {
    try {
      const key = `${userId}|${username}`;
      const newScore = await redisClient.zIncrBy(LEADERBOARD_KEY, points, key);
      return newScore;
    } catch (err) {
      console.error("[quiz-state] Add Score Error:", err.message);
      throw err;
    }
  },

  async cleanDatabase() {
    try {
      await redisClient.del(GAME_KEY);
      await redisClient.del(LEADERBOARD_KEY);
      this.gameState = {
        round: 0,
        status: "question",
        currentQuestionIndex: 0,
        timeLeft: 0,
        timerEnd: 0,
        winnerId: null,
        selectedAnswerIndex: null,
        recentAnswers: [],
        participants: new Map(),
        usedQuestionIndices: [],
        lastUpdate: 0,
      };
      this.cachedLeaderboard = [];
      console.log("[quiz-state] Database cleaned");
    } catch (err) {
      console.error("[quiz-state] Clean Database Error:", err.message);
      throw err;
    }
  },
};
