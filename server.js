const express = require("express");
const { getTopicStream } = require("./utils/topix99-api");
const { startLive } = require("./live");
const LuckyWheelGame = require("./games/luckywheel");
const { YTChat } = require("./utils/ytchat");
const { connectRedis } = require("./utils/redis");
const modes = require("./config/modes");

// Select mode
const MODE = process.env.MODE || "luckywheel";
const modeConfig = modes[MODE];

if (!modeConfig) {
  console.error(`Invalid MODE: ${MODE}`);
  process.exit(1);
}

const PORT = modeConfig.port;
const TOPIC_ID = modeConfig.topicId;

console.log(`[server] Mode=${MODE}, Port=${PORT}, Topic=${TOPIC_ID}`);

const app = express();
let ffmpeg = null;
let ytChat = null;

async function boot() {
  await connectRedis();

  console.log("[server] Fetching stream from Topix99...");
  const { rtmpUrl, broadcastId } = await getTopicStream(TOPIC_ID);

  console.log(`[server] Starting live stream topic ${TOPIC_ID}`);

  if (!rtmpUrl || !broadcastId) {
    throw new Error("Invalid stream data from Topix99");
  }

  console.log("[server] RTMP:", rtmpUrl);
  console.log("[server] Broadcast:", broadcastId);

  // Start video pipeline
  ffmpeg = startLive(rtmpUrl, LuckyWheelGame);

  // Start game
  if (MODE === "luckywheel") {
    await LuckyWheelGame.startNewRound();
  }

  // Start chat
  ytChat = new YTChat(broadcastId);
  await ytChat.start(async ({ author, message }) => {
    console.log(`[chat] ${author}: ${message}`);

    if (MODE === "luckywheel") {
      await LuckyWheelGame.processChatMessage(author, author, message);
    }
  });
}

app.get("/health", (req, res) => {
  res.json({
    mode: MODE,
    port: PORT,
    topicId: TOPIC_ID,
    streaming: !!ffmpeg,
  });
});

app.listen(PORT, async () => {
  console.log(`[server] ${MODE} listening on ${PORT}`);
  try {
    await boot();
  } catch (err) {
    console.error("[server] Boot failed:", err.message);
    process.exit(1);
  }
});
