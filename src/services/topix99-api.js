// utils/topix99-api.js
const { logger } = require("./logger");

const apiBaseUrl = process.env.TOPIX99_API_BASE_URL || `https://topix99.com/api`;
const authToken = process.env.TOPIX99_API_TOKEN;

if (!authToken) {
  logger.warn("TOPIX99_API_TOKEN not set - API calls may fail");
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

async function getTopicStream(topicId, preferredStreamName = null) {
  const streams = await getTopicStreams(topicId);
  let stream = streams[0];

  if (preferredStreamName) {
    const normalizedPreferred = normalizeName(preferredStreamName);
    const streamNames = streams.map((item) => item.name);

    let matched = streams.find((item) => {
      const candidateName = normalizeName(item?.name || "");
      return candidateName === normalizedPreferred;
    });

    if (!matched) {
      matched = streams.find((item) => {
        const candidateName = normalizeName(item?.name || "");
        return (
          candidateName.includes(normalizedPreferred) ||
          normalizedPreferred.includes(candidateName)
        );
      });
    }

    if (matched) {
      stream = matched;
      logger.info(`[topix99-api] Using preferred stream "${preferredStreamName}" for topic ${topicId}`);
    } else {
      logger.warn(
        `[topix99-api] Preferred stream "${preferredStreamName}" not found for topic ${topicId}. Available streams: ${streamNames.join(
          " | "
        )}. Falling back to first stream.`
      );
    }
  }

  if (!stream?.rtmpUrl) {
    throw new Error(`No RTMP URL found in stream data for topic ${topicId}`);
  }

  if (!stream?.broadcastId) {
    logger.warn(`No broadcast ID found for topic ${topicId} - chat may not work`);
  }

  return {
    rtmpUrl: stream.rtmpUrl,
    liveChatId: stream.liveChatId || null,
    broadcastId: stream.broadcastId || null,
  };
}

async function getTopicStreams(topicId) {
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

    return data.data.map((stream) => ({
      id: stream?.id || null,
      name: pickText(
        stream?.name,
        stream?.streamName,
        stream?.title,
        stream?.stream_title,
        stream?.displayName,
        stream?.display_name,
        stream?.extra?.name,
        stream?.extra?.title
      ) || `Stream ${stream?.id || stream?.extra?.broadcastId || "unknown"}`,
      rtmpUrl: stream?.streamUrl || stream?.url || null,
      liveChatId: stream?.extra?.liveChatId || null,
      broadcastId: stream?.extra?.broadcastId || null,
      raw: stream,
    }));
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

async function getTopics() {
  const url = `${apiBaseUrl}/v1/topics`;

  try {
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
        `Failed to fetch topics: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    const topics = Array.isArray(data?.data) ? data.data : [];

    return topics.map((topic) => ({
      id: topic?.id || null,
      name:
        pickText(topic?.name, topic?.topicName, topic?.title, topic?.displayName) ||
        `Topic ${topic?.id || "unknown"}`,
      raw: topic,
    }));
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timeout: Failed to fetch topics within 10 seconds");
    }
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(`Network error fetching topics: ${err.message}`);
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
  getTopics,
  getTopicStreams,
  getTopicStream,
  getOauthTokens,
};
