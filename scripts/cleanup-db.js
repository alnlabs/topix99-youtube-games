// scripts/cleanup-db.js
const { connectRedis, disconnectRedis } = require("../src/services");
const state = require("../src/games/quiz/state");

async function cleanup() {
  const dataMode = process.env.DATA_MODE || "real-live";
  console.log(`[cleanup] Starting cleanup for DATA_MODE="${dataMode}"...`);

  try {
    await connectRedis();
    await state.cleanDatabase();
    console.log(`[cleanup] Successfully cleaned database for DATA_MODE="${dataMode}"`);
  } catch (err) {
    console.error(`[cleanup] Error: ${err.message}`);
  } finally {
    await disconnectRedis();
    process.exit(0);
  }
}

cleanup();
