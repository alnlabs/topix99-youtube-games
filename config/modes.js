// config/modes.js
const modes = {
  default: {
    port: 4000,
    topicId: 59,
    orientation: "portrait",
    fps: 30,
    safeMargins: {
      top: 40,
      bottom: 300,
      left: 40,
      right: 40,
    },
    contentOffsetTop: 120,
  },

  luckywheel: {
    port: 4001,
    topicId: 108,
    orientation: "portrait",
    fps: 30,
    safeMargins: {
      top: 40,
      bottom: 300,
      left: 40,
      right: 40,
    },
    contentOffsetTop: 120,
  },

  quiz: {
    port: 4002,
    topicId: 119,
    orientation: "portrait",
    fps: 30,
    safeMargins: {
      top: 40,
      bottom: 300,
      left: 40,
      right: 40,
    },
    contentOffsetTop: 120,
  },
};

module.exports = modes;
