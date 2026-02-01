const { redisClient } = require("../../utils/redis");

module.exports = {
  gameState: {
    round: 0,
    status: "waiting", // waiting | spinning | finished | cooldown
    currentNumber: null,

    // --- DYNAMIC WHEEL CONFIG ---
    // This array defines the slices. Its length determines the number of slices.
    wheelValues: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],

    winners: [],
    participants: new Map(),
    wheelPosition: 0,
    targetRotation: 0,
    timerEnd: 0,
    spinSpeed: 0,
    celebration: { active: false, username: null, startTime: 0 },
  },

  cachedLeaderboard: [],

  // Getter for the 30FPS render loop
  getStateSync() {
    return this.gameState;
  },

  getLeaderboardSync() {
    return this.cachedLeaderboard;
  },

  async save() {
    const payload = {
      round: String(this.gameState.round),
      status: this.gameState.status,
      currentNumber: String(this.gameState.currentNumber || 0),
      wheelPosition: String(this.gameState.wheelPosition),
      targetRotation: String(this.gameState.targetRotation || 0),
      timerEnd: String(this.gameState.timerEnd || 0),
      spinSpeed: String(this.gameState.spinSpeed),
      // Save the wheel configuration so the renderer knows what to draw
      wheelValues: JSON.stringify(this.gameState.wheelValues),
      celebration: JSON.stringify(this.gameState.celebration),
      lastUpdate: String(Date.now()),
    };

    await redisClient.hSet("game:luckwheel", payload);
  },

  async load() {
    try {
      const [data, lbData] = await Promise.all([
        redisClient.hGetAll("game:luckwheel"),
        redisClient.zRangeWithScores("leaderboard:luckwheel", 0, 4, {
          REV: true,
        }),
      ]);

      if (!data || !data.status) return;

      this.gameState.round = parseInt(data.round || 0);
      this.gameState.status = data.status;
      this.gameState.currentNumber = parseInt(data.currentNumber || 0);
      this.gameState.wheelPosition = parseFloat(data.wheelPosition || 0);
      this.gameState.targetRotation = parseFloat(data.targetRotation || 0);
      this.gameState.timerEnd = parseInt(data.timerEnd || 0);
      this.gameState.spinSpeed = parseFloat(data.spinSpeed || 0);

      // Load dynamic wheel slices
      if (data.wheelValues) {
        this.gameState.wheelValues = JSON.parse(data.wheelValues);
      }

      this.gameState.celebration = data.celebration
        ? JSON.parse(data.celebration)
        : { active: false, username: null, startTime: 0 };

      // Update cached leaderboard
      this.cachedLeaderboard = lbData.map((e) => {
        const [userId, username] = e.value.split("|");
        return { username, score: e.score };
      });
    } catch (err) {
      console.error("Redis Load Error:", err);
    }
  },

  async startSpin(winningNumber) {
    this.gameState.status = "spinning";
    this.gameState.currentNumber = winningNumber;

    // --- DYNAMIC MATH ---
    // No longer hardcoded to 10. We use the length of the actual array.
    const slices = this.gameState.wheelValues.length;
    const sliceAngle = (Math.PI * 2) / slices;

    // Find where the winning number is located in the dynamic array
    const sliceIndex = this.gameState.wheelValues.indexOf(winningNumber);

    if (sliceIndex === -1) {
      console.error(`Error: ${winningNumber} is not on the wheel!`);
      return;
    }

    // Normalize current position
    this.gameState.wheelPosition = this.gameState.wheelPosition % (Math.PI * 2);

    // Calculate target angle based on dynamic slice index
    const targetAngle = sliceIndex * sliceAngle + sliceAngle / 2;
    const extraSpins = Math.PI * 2 * 6;

    this.gameState.targetRotation =
      this.gameState.wheelPosition + extraSpins - targetAngle;

    await this.save();

    setTimeout(async () => {
      this.gameState.status = "finished";
      this.gameState.wheelPosition = this.gameState.targetRotation;
      await this.save();
    }, 7000);
  },

  async addWin(userId, username) {
    await redisClient.zIncrBy(
      "leaderboard:luckwheel",
      1,
      `${userId}|${username}`
    );
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
    // We keep wheelValues during reset unless you want a new set of numbers
    await this.save();
  },
};
