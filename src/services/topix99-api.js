// utils/topix99-api.js
const { logger } = require("./logger");

const apiBaseUrl = process.env.TOPIX99_API_BASE_URL || `https://topix99.com/api`;
const authToken = process.env.TOPIX99_API_TOKEN;

if (!authToken) {
  logger.warn("TOPIX99_API_TOKEN not set - API calls may fail");
}

async function getTopicStream(topicId) {
  if (!topicId) {
    throw new Error("Topic ID is required");
  }

  const url = `${apiBaseUrl}/v1/topics/${topicId}/streams`;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "topix99-youtube-games/1.0.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to fetch topic stream: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      throw new Error(`No stream data found for topic ${topicId}`);
    }

    const stream = data.data[0];
    const rtmpUrl = stream?.streamUrl || stream?.url;
    const broadcastId = stream?.extra?.broadcastId;

    if (!rtmpUrl) {
      throw new Error(`No RTMP URL found in stream data for topic ${topicId}`);
    }

    if (!broadcastId) {
      logger.warn(`No broadcast ID found for topic ${topicId} - chat may not work`);
    }

    return {
      rtmpUrl,
      liveChatId: stream?.extra?.liveChatId || null,
      broadcastId: broadcastId || null,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timeout: Failed to fetch topic stream within 10 seconds");
    }
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(`Network error fetching topic stream: ${err.message}`);
    }
    throw err;
  }
}

async function getOauthTokens() {
  if (!authToken) {
    throw new Error("TOPIX99_API_TOKEN is required for OAuth");
  }

  const url = `${apiBaseUrl}/config?authToken=${authToken}`;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "topix99-youtube-games/1.0.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to fetch OAuth tokens: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    if (!data || !data.tokens || !data.tokens.access_token) {
      throw new Error("Invalid OAuth token response");
    }

    return { token: data.tokens.access_token };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timeout: Failed to fetch OAuth tokens within 10 seconds");
    }
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(`Network error fetching OAuth tokens: ${err.message}`);
    }
    throw err;
  }
}

module.exports = {
  apiBaseUrl,
  getTopicStream,
  getOauthTokens,
};
