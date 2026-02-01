// utils/topix99-api.js
const apiBaseUrl = `https://topix99.com/api`;
const authToken =
  process.env.TOPIX99_API_TOKEN || `eghGjpy28dLEDDrNx38EnGDjsg6SA4f8`;

async function getTopicStream(topicId) {
  const url = `${apiBaseUrl}/v1/topics/${topicId}/streams`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch topic stream: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  const stream = data.data && data.data[0];
  return {
    rtmpUrl: stream ? stream.streamUrl || stream.url : null,
    liveChatId: stream ? stream.extra?.liveChatId : null,
    broadcastId: stream ? stream.extra?.broadcastId : null,
  };
}

async function getOauthTokens() {
  const url = `${apiBaseUrl}/config?authToken=${authToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OAuth tokens: ${response.status} ${response.statusText}`
    );
  }
  const { tokens } = await response.json();
  return { token: tokens.access_token };
}

module.exports = {
  apiBaseUrl,
  getTopicStream,
  getOauthTokens,
};
