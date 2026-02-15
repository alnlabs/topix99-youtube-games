const { createClient } = require("redis");

async function listKeys() {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
  });

  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();

  const keys = await client.keys("*");
  console.log("Found Redis keys:");
  for (const key of keys) {
    const type = await client.type(key);
    console.log(` - ${key} (${type})`);
    if (type === "hash") {
      const data = await client.hGetAll(key);
      console.log(`   Data:`, data);
    } else if (type === "zset") {
      const members = await client.zRangeWithScores(key, 0, -1);
      console.log(`   Members:`, members);
    }
  }

  await client.disconnect();
}

listKeys().catch(console.error);
