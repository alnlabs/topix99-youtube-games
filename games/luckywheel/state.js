const { redisClient } = require("../../utils/redis");

module.exports = {
  gameState: {
    round: 0,
    status: "waiting", // waiting | spinning | finished
    currentNumber: null,
    winners: [],
    participants: new Map(), // userId -> { username, guess }
    wheelPosition: 0,
    spinSpeed: 0,
    lastSpinTime: null,

    // Celebration state
    celebration: {
      active: false,
      username: null,
      startTime: 0,
    },
  },

  // -------------------------------
  // Save core state to Redis
  // -------------------------------
  async save() {
    await redisClient.hSet("game:luckwheel", {
      round: this.gameState.round,
      status: this.gameState.status,
      currentNumber: this.gameState.currentNumber,
      wheelPosition: this.gameState.wheelPosition,
      spinSpeed: this.gameState.spinSpeed,
      celebration: JSON.stringify(this.gameState.celebration),
      lastUpdate: Date.now(),
    });
  },

  // -------------------------------
  // Load state from Redis (for restarts)
  // -------------------------------
  async load() {
    const data = await redisClient.hGetAll("game:luckwheel");
    if (!data || !data.round) return;

    this.gameState.round = parseInt(data.round);
    this.gameState.status = data.status;
    this.gameState.currentNumber = parseInt(data.currentNumber);
    this.gameState.wheelPosition = parseFloat(data.wheelPosition || 0);
    this.gameState.spinSpeed = parseFloat(data.spinSpeed || 0);
    this.gameState.celebration = data.celebration
      ? JSON.parse(data.celebration)
      : { active: false, username: null, startTime: 0 };
  },

  // -------------------------------
  // Leaderboard (Redis Sorted Set)
  // -------------------------------
  async addWin(userId, username) {
    await redisClient.zIncrBy(
      "leaderboard:luckwheel",
      1,
      `${userId}|${username}`
    );
  },

  async getTopPlayers(limit = 5) {
    const data = await redisClient.zRangeWithScores(
      "leaderboard:luckwheel",
      -limit,
      -1
    );

    return data.reverse().map((e) => {
      const [userId, username] = e.value.split("|");
      return {
        userId,
        username,
        score: e.score,
      };
    });
  },

  // -------------------------------
  // Trigger celebration (used by game logic)
  // -------------------------------
  async triggerCelebration(username) {
    this.gameState.celebration.active = true;
    this.gameState.celebration.username = username;
    this.gameState.celebration.startTime = Date.now();
    await this.save();
  },

  clearCelebration() {
    this.gameState.celebration.active = false;
    this.gameState.celebration.username = null;
    this.gameState.celebration.startTime = 0;
  },

  // -------------------------------
  // Reset everything
  // -------------------------------
  async reset() {
    await redisClient.del("game:luckwheel");
    await redisClient.del("leaderboard:luckwheel");

    this.gameState.round = 0;
    this.gameState.status = "waiting";
    this.gameState.currentNumber = null;
    this.gameState.winners = [];
    this.gameState.participants.clear();
    this.gameState.spinSpeed = 0;
    this.gameState.wheelPosition = 0;

    this.clearCelebration();
  },
};
