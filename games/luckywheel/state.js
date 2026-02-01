const { redisClient } = require("../../utils/redis");

module.exports = {
  gameState: {
    round: 0,
    status: "waiting", // waiting | spinning | finished | cooldown
    currentNumber: null,
    winners: [],
    participants: new Map(),

    // --- ANIMATION & UI STATE ---
    wheelPosition: 0,
    targetRotation: 0,
    timerEnd: 0,
    spinSpeed: 0,
    lastSpinTime: null,

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
    // Ensure we are saving clean strings/numbers to Redis
    const payload = {
      round: String(this.gameState.round),
      status: this.gameState.status,
      currentNumber: String(this.gameState.currentNumber || 0),
      wheelPosition: String(this.gameState.wheelPosition),
      targetRotation: String(this.gameState.targetRotation || 0),
      timerEnd: String(this.gameState.timerEnd || 0),
      spinSpeed: String(this.gameState.spinSpeed),
      celebration: JSON.stringify(this.gameState.celebration),
      lastUpdate: String(Date.now()),
    };

    await redisClient.hSet("game:luckwheel", payload);
  },

  // -------------------------------
  // Load state from Redis
  // -------------------------------
  async load() {
    const data = await redisClient.hGetAll("game:luckwheel");
    if (!data || !data.status) return;

    this.gameState.round = parseInt(data.round || 0);
    this.gameState.status = data.status;
    this.gameState.currentNumber = parseInt(data.currentNumber || 0);
    this.gameState.wheelPosition = parseFloat(data.wheelPosition || 0);
    this.gameState.targetRotation = parseFloat(data.targetRotation || 0);
    this.gameState.timerEnd = parseInt(data.timerEnd || 0);
    this.gameState.spinSpeed = parseFloat(data.spinSpeed || 0);
    this.gameState.celebration = data.celebration
      ? JSON.parse(data.celebration)
      : { active: false, username: null, startTime: 0 };
  },

  // -------------------------------
  // Game Logic Actions
  // -------------------------------

  async startSpin(winningNumber) {
    // 1. Update status and winner
    this.gameState.status = "spinning";
    this.gameState.currentNumber = winningNumber;

    // 2. Math: 10 slices, so each slice is 36° or (PI * 2) / 10
    const sliceAngle = (Math.PI * 2) / 10;
    const sliceIndex = winningNumber / 10 - 1;

    // 3. Normalize the current position to be within 0 and 2PI
    // This prevents the rotation value from growing to infinity
    this.gameState.wheelPosition = this.gameState.wheelPosition % (Math.PI * 2);

    // 4. Calculate target:
    // We want the wheel to spin 6 times (extraSpins)
    // and stop precisely at the targetAngle relative to the top pointer
    const targetAngle = sliceIndex * sliceAngle + sliceAngle / 2;
    const extraSpins = Math.PI * 2 * 6;

    // We subtract targetAngle because the wheel usually rotates clockwise
    // against a fixed pointer at the top
    this.gameState.targetRotation =
      this.gameState.wheelPosition + extraSpins - targetAngle;

    await this.save();

    // 5. Auto-transition to 'finished' after the animation completes (approx 6-7s)
    setTimeout(async () => {
      this.gameState.status = "finished";
      // Update wheelPosition to the final stopped rotation for the next round
      this.gameState.wheelPosition = this.gameState.targetRotation;
      await this.save();
    }, 7000);
  },

  async addWin(userId, username) {
    // Standard Redis Sorted Set for leaderboard
    await redisClient.zIncrBy(
      "leaderboard:luckwheel",
      1,
      `${userId}|${username}`
    );
  },

  async getTopPlayers(limit = 5) {
    const data = await redisClient.zRangeWithScores(
      "leaderboard:luckwheel",
      0,
      limit - 1,
      { REV: true }
    );

    return data.map((e) => {
      const [userId, username] = e.value.split("|");
      return { userId, username, score: e.score };
    });
  },

  async triggerCelebration(username) {
    this.gameState.celebration = {
      active: true,
      username: username,
      startTime: Date.now(),
    };
    await this.save();
  },

  async reset() {
    await redisClient.del("game:luckwheel");
    // Note: Usually you don't want to delete the leaderboard on every game reset
    // await redisClient.del("leaderboard:luckwheel");

    this.gameState.round = 0;
    this.gameState.status = "waiting";
    this.gameState.currentNumber = null;
    this.gameState.wheelPosition = 0;
    this.gameState.targetRotation = 0;
    this.gameState.timerEnd = 0;
    this.gameState.celebration = {
      active: false,
      username: null,
      startTime: 0,
    };

    await this.save();
  },
};
