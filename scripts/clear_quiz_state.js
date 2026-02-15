// File: scripts/clear_quiz_state.js
const { createClient } = require("redis");
const path = require("path");

async function clearState() {
  const client = createClient();
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();

  const keys = [
    "game:quiz",
    "game:quiz:test",
    "leaderboard:quiz",
    "leaderboard:quiz:test"
  ];

  for (const key of keys) {
    const deleted = await client.del(key);
    console.log(`Deleted key: ${key} (${deleted})`);
  }

  await client.disconnect();
  console.log("Database cleared successfully.");
}

clearState().catch(console.error);
