const { redisClient } = require("../../services");
const C = require("./constants");

// Determine if we're in test mode (test.js) or live mode (server.js)
// Use different Redis keys to keep test and live data separate
// Test mode is detected via TEST_MODE environment variable set in test.js
const IS_TEST_MODE = process.env.TEST_MODE === "true";
const GAME_KEY = IS_TEST_MODE ? "game:luckwheel:test" : "game:luckwheel";
const LEADERBOARD_KEY = IS_TEST_MODE ? "leaderboard:luckwheel:test" : "leaderboard:luckwheel";

// Log which mode we're in for debugging
console.log(`[state] Running in ${IS_TEST_MODE ? "TEST" : "LIVE"} mode`);
console.log(`[state] Using Redis keys: GAME_KEY="${GAME_KEY}", LEADERBOARD_KEY="${LEADERBOARD_KEY}"`);

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
    lastSpinEnd: 0, // NEW: Track when the last spin/round ended to calculate drift
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
    try {
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
        lastSpinEnd: String(this.gameState.lastSpinEnd || 0),
        lastUpdate: String(Date.now()),
      };

      await redisClient.hSet(GAME_KEY, payload);
    } catch (err) {
      console.error("[state] Redis Save Error:", err.message);
      throw err;
    }
  },

  async load() {
    try {
      const [data, lbData] = await Promise.all([
        redisClient.hGetAll(GAME_KEY),
        redisClient.zRangeWithScores(LEADERBOARD_KEY, 0, 4, {
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
      this.gameState.lastSpinEnd = parseInt(data.lastSpinEnd || 0);

      // Load dynamic wheel slices
      if (data.wheelValues) {
        this.gameState.wheelValues = JSON.parse(data.wheelValues);
      }

      this.gameState.celebration = data.celebration
        ? JSON.parse(data.celebration)
        : { active: false, username: null, startTime: 0 };

      // Update cached leaderboard
      // Leaderboard now uses username (lowercase) as key, not userId|username
      this.cachedLeaderboard = lbData.map((e) => {
        // Handle both old format (userId|username) and new format (just username)
        const value = e.value;
        if (value.includes("|")) {
          const [userId, username] = value.split("|");
          return { username, score: e.score };
        } else {
          // New format: value is just the username
          return { username: value, score: e.score };
        }
      });
    } catch (err) {
      console.error("[state] Redis Load Error:", err.message);
      throw err;
    }
  },

  async startSpin() {
    this.gameState.status = "spinning";
    // currentNumber is null until the spin finishes, so we don't announce early
    this.gameState.currentNumber = null;

    // --- PHYSICS FIRST LOGIC ---
    // 1. Calculate Drift from idle time
    let currentBasis = this.gameState.wheelPosition;
    if (this.gameState.lastSpinEnd) {
        const diff = Date.now() - this.gameState.lastSpinEnd;
        // 0.005 rad per frame * 30 fps = 0.15 rad/sec = 0.00015 rad/ms
        const drift = diff * 0.00015;
        currentBasis += drift;
    }

    // 2. Add Random Force (Spin)
    // Spin between 5 and 10 full rotations + random slice offset
    const randomSpins = 5 + Math.random() * 5;
    const randomAngle =  randomSpins * Math.PI * 2;

    // Target is simply where we are + random spin
    this.gameState.targetRotation = currentBasis + randomAngle;

    // Commit to this rotation
    this.gameState.wheelPosition = this.gameState.targetRotation;

    // 3. Calculate the winning number IMMEDIATELY (no delay)
    // This ensures the number is available as soon as the wheel stops visually
    const finalAngle = this.gameState.targetRotation;
    const slices = this.gameState.wheelValues.length;
    const sliceAngle = (Math.PI * 2) / slices;

    // Normalize targetRotation to [0, 2PI] (same as renderer does)
    let renderRotation = finalAngle % (Math.PI * 2);
    if (renderRotation < 0) renderRotation += Math.PI * 2;

    // The wheel is rotated by: renderRotation - PI/2
    // Slice i starts at angle: i * sliceAngle (in wheel's local coordinates)
    // After rotation, slice i is at: i * sliceAngle + (renderRotation - PI/2) (in global coordinates)
    // Pointer is at: -PI/2 = 3*PI/2 (in global coordinates)
    // We need to find which slice contains the pointer position

    // Working backwards: if pointer is at 3*PI/2, and wheel is rotated by (renderRotation - PI/2),
    // then in wheel's local coordinates, the pointer is at: 3*PI/2 - (renderRotation - PI/2)
    // = 3*PI/2 - renderRotation + PI/2 = 2*PI - renderRotation
    let pointerInLocalCoords = (2 * Math.PI - renderRotation) % (Math.PI * 2);
    if (pointerInLocalCoords < 0) pointerInLocalCoords += Math.PI * 2;

    // Find which slice contains this angle
    const winningIndex = Math.floor(pointerInLocalCoords / sliceAngle) % slices;
    const winner = this.gameState.wheelValues[winningIndex];

    // Set the winning number IMMEDIATELY (no delay)
    this.gameState.currentNumber = winner;

    console.log(`[Physics] Calculated winner immediately: Stopped at ${finalAngle.toFixed(3)}. RenderRot=${renderRotation.toFixed(3)}. PointerLocal=${pointerInLocalCoords.toFixed(3)}. Index=${winningIndex}. Winner=${winner}`);

    await this.save();

    // 4. Update status to "finished" when the spin animation completes (matches visual stop)
    // This happens at the end of SPIN_DURATION, so the number is already set and can be displayed immediately
    setTimeout(async () => {
      this.gameState.status = "finished";
      await this.save();
    }, C.SPIN_DURATION);
  },

  async addWin(userId, username, score = 1) {
    try {
      // Use username as the key to ensure same user always gets same entry
      // This prevents duplicates when userId changes but username stays the same
      const leaderboardKey = username.toLowerCase().trim();

      await redisClient.zIncrBy(
        LEADERBOARD_KEY,
        score,
        leaderboardKey
      );
      // Refresh leaderboard cache
      const lbData = await redisClient.zRangeWithScores(LEADERBOARD_KEY, 0, 4, {
        REV: true,
      });
      this.cachedLeaderboard = lbData.map((e) => {
        // The value is now just the username (lowercase), score is the score
        return { username: e.value, score: e.score };
      });
    } catch (err) {
      console.error("[state] Error adding win:", err.message);
      throw err;
    }
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
    // REMOVED: this.gameState.wheelPosition = 0; -> We MUST persist this to prevent backwards spin
    // Track when we started waiting, to calculate drift later
    this.gameState.lastSpinEnd = Date.now();
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

  // Clean database - removes all game and leaderboard data for current mode (test or live)
  async cleanDatabase() {
    try {
      await redisClient.del(GAME_KEY);
      await redisClient.del(LEADERBOARD_KEY);
      console.log(`[state] Cleaned database for ${IS_TEST_MODE ? "TEST" : "LIVE"} mode`);
      console.log(`[state] Removed keys: ${GAME_KEY}, ${LEADERBOARD_KEY}`);
      // Reset in-memory state
      this.gameState.round = 0;
      this.gameState.status = "waiting";
      this.gameState.currentNumber = null;
      this.gameState.participants.clear();
      this.gameState.winners = [];
      this.gameState.wheelPosition = 0;
      this.gameState.targetRotation = 0;
      this.gameState.timerEnd = 0;
      this.gameState.lastSpinEnd = 0;
      this.cachedLeaderboard = [];
    } catch (err) {
      console.error("[state] Error cleaning database:", err.message);
      throw err;
    }
  },
};
