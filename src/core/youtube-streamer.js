/**
 * YouTube Streamer Library
 *
 * A reusable library for streaming game content to YouTube Live.
 * Handles FFmpeg setup, canvas rendering, frame encoding, and streaming.
 *
 * Usage:
 *   const streamer = new YouTubeStreamer({
 *     rtmpUrl: 'rtmp://...',
 *     width: 1920,
 *     height: 1080,
 *     fps: 30,
 *     bgmPath: './assets/sounds/bgm.mp3',
 *     renderFrame: (ctx, state) => {
 *       // Your game rendering logic here
 *     }
 *   });
 *   await streamer.start();
 */

const { spawn } = require("child_process");
const { createCanvas } = require("canvas");
const path = require("path");
const { logger } = require("../services");

class YouTubeStreamer {
  /**
   * Create a new YouTube Streamer instance
   * @param {Object} config - Configuration object
   * @param {string} config.rtmpUrl - RTMP URL for YouTube Live stream
   * @param {number} config.width - Canvas width (default: 1920)
   * @param {number} config.height - Canvas height (default: 1080)
   * @param {number} config.fps - Target FPS (default: 30)
   * @param {string} [config.bgmPath] - Path to background music file (optional)
   * @param {Function} config.renderFrame - Callback function to render each frame: (ctx, state) => void
   * @param {Function} [config.syncState] - Optional async function to sync game state: () => Promise<Object>
   * @param {number} [config.syncInterval] - State sync interval in ms (default: 500)
   * @param {Object} [config.ffmpegOptions] - Custom FFmpeg options (optional)
   */
  constructor(config) {
    if (!config.rtmpUrl) {
      throw new Error("rtmpUrl is required");
    }
    if (!config.renderFrame || typeof config.renderFrame !== "function") {
      throw new Error("renderFrame callback function is required");
    }

    this.config = {
      rtmpUrl: config.rtmpUrl,
      width: config.width || 1920,
      height: config.height || 1080,
      fps: config.fps || 30,
      bgmPath: config.bgmPath,
      renderFrame: config.renderFrame,
      syncState: config.syncState,
      syncInterval: config.syncInterval || 500,
      ffmpegOptions: config.ffmpegOptions || {},
    };

    // Internal state
    this.ffmpegInstance = null;
    this.canvas = null;
    this.ctx = null;
    this.isRenderingPaused = false;
    this.isRunning = false;
    this.syncInterval = null;
    this.localState = {};
    this.errorThrottle = {
      lastSyncError: 0,
      lastFrameError: 0,
    };

    // Bind methods
    this.stop = this.stop.bind(this);
    this._handleFFmpegClose = this._handleFFmpegClose.bind(this);
    this._handleFFmpegError = this._handleFFmpegError.bind(this);
    this._handleStdinError = this._handleStdinError.bind(this);
  }

  /**
   * Start streaming to YouTube
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      logger.warn("[streamer] Already running, ignoring start() call");
      return;
    }

    try {
      // Initialize canvas
      this.canvas = createCanvas(this.config.width, this.config.height);
      this.ctx = this.canvas.getContext("2d");

      // Start state synchronization if provided
      if (this.config.syncState) {
        await this._syncState();
        this.syncInterval = setInterval(() => this._syncState(), this.config.syncInterval);
      }

      // Start FFmpeg process
      this._startFFmpeg();

      // Start render loop
      this.isRunning = true;
      this._render();

      logger.success("[streamer] YouTube streaming started");
    } catch (error) {
      logger.error(`[streamer] Failed to start: ${error.message}`);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop streaming and cleanup resources
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("[streamer] Stopping YouTube stream...");
    this.isRunning = false;

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Stop FFmpeg
    if (this.ffmpegInstance) {
      try {
        this.ffmpegInstance.stdin.end();
        this.ffmpegInstance.kill("SIGTERM");
      } catch (err) {
        // Ignore errors during cleanup
      }
      this.ffmpegInstance = null;
    }

    // Clear canvas
    this.canvas = null;
    this.ctx = null;

    logger.info("[streamer] YouTube streaming stopped");
  }

  /**
   * Update local state (can be called externally)
   * @param {Object} state - New state object
   */
  updateState(state) {
    this.localState = { ...this.localState, ...state };
  }

  /**
   * Get current local state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.localState };
  }

  /**
   * Start FFmpeg process for streaming
   * @private
   */
  _startFFmpeg() {
    const ffmpegArgs = [
      "-loglevel",
      "error",
      "-f",
      "rawvideo",
      "-pixel_format",
      "bgra",
      "-video_size",
      `${this.config.width}x${this.config.height}`,
      "-framerate",
      `${this.config.fps}`,
      "-i",
      "pipe:0",
    ];

    // Add background music if provided
    if (this.config.bgmPath) {
      ffmpegArgs.push(
        "-stream_loop",
        "-1",
        "-i",
        this.config.bgmPath
      );
    }

    // Video encoding options
    ffmpegArgs.push(
      "-c:v",
      "libx264",
      "-preset",
      this.config.ffmpegOptions.preset || "veryfast",
      "-b:v",
      this.config.ffmpegOptions.videoBitrate || "4500k",
      "-maxrate",
      this.config.ffmpegOptions.maxBitrate || "4500k",
      "-bufsize",
      this.config.ffmpegOptions.bufsize || "9000k",
      "-tune",
      this.config.ffmpegOptions.tune || "zerolatency",
      "-g",
      this.config.ffmpegOptions.gop || "60"
    );

    // Audio encoding options (if bgm is provided)
    if (this.config.bgmPath) {
      ffmpegArgs.push(
        "-c:a",
        "aac",
        "-b:a",
        this.config.ffmpegOptions.audioBitrate || "128k",
        "-ar",
        this.config.ffmpegOptions.sampleRate || "44100",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0"
      );
    }

    // Output format
    ffmpegArgs.push(
      "-pix_fmt",
      "yuv420p",
      "-f",
      "flv",
      this.config.rtmpUrl
    );

    // Merge any additional custom FFmpeg options
    if (this.config.ffmpegOptions.extraArgs) {
      ffmpegArgs.push(...this.config.ffmpegOptions.extraArgs);
    }

    this.ffmpegInstance = spawn("ffmpeg", ffmpegArgs);

    // Setup event handlers
    this.ffmpegInstance.on("close", this._handleFFmpegClose);
    this.ffmpegInstance.on("error", this._handleFFmpegError);
    this.ffmpegInstance.stdin.on("error", this._handleStdinError);

    // Handle FFmpeg stderr for debugging
    this.ffmpegInstance.stderr.on("data", (data) => {
      const message = data.toString();
      if (message.toLowerCase().includes("error")) {
        logger.error(`[streamer] FFmpeg: ${message.trim()}`);
      }
    });
  }

  /**
   * Sync game state (if syncState callback is provided)
   * @private
   */
  async _syncState() {
    if (!this.config.syncState) return;

    try {
      const newState = await this.config.syncState();
      if (newState) {
        this.localState = newState;
      }
    } catch (error) {
      // Throttle error logging
      const now = Date.now();
      if (!this.errorThrottle.lastSyncError || now - this.errorThrottle.lastSyncError > 5000) {
        logger.error(`[streamer] Sync error: ${error.message}`);
        this.errorThrottle.lastSyncError = now;
      }
    }
  }

  /**
   * Main render loop
   * @private
   */
  _render() {
    if (!this.isRunning || !this.ffmpegInstance) {
      return;
    }

    // Skip rendering if paused due to backpressure
    if (this.isRenderingPaused) {
      return;
    }

    const startTime = Date.now();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.config.width, this.config.height);

    // Call game's render function
    try {
      this.config.renderFrame(this.ctx, this.localState);
    } catch (error) {
      // Throttle error logging
      const now = Date.now();
      if (!this.errorThrottle.lastFrameError || now - this.errorThrottle.lastFrameError > 5000) {
        logger.error(`[streamer] Render error: ${error.message}`);
        this.errorThrottle.lastFrameError = now;
      }
    }

    // Write frame to FFmpeg
    if (this.ffmpegInstance && this.ffmpegInstance.stdin) {
      const isWritable =
        this.ffmpegInstance.stdin.writable &&
        !this.ffmpegInstance.stdin.destroyed &&
        !this.ffmpegInstance.stdin.closed;

      if (isWritable) {
        try {
          const buffer = this.canvas.toBuffer("raw");
          const writeResult = this.ffmpegInstance.stdin.write(buffer);

          // Handle backpressure
          if (!writeResult) {
            this.isRenderingPaused = true;
            this.ffmpegInstance.stdin.once("drain", () => {
              this.isRenderingPaused = false;
              this._render(); // Resume rendering
            });
            return;
          }
        } catch (error) {
          // Handle broken pipe, connection errors, and invalid argument errors
          if (
            error.code === "EPIPE" ||
            error.code === "ECONNRESET" ||
            error.code === "EINVAL"
          ) {
            logger.error(`[streamer] FFmpeg pipe error (${error.code}), stopping render loop`);
            this.ffmpegInstance = null;
            if (this.syncInterval) {
              clearInterval(this.syncInterval);
            }
            this.isRunning = false;
            return;
          }
          // Log other errors (throttled)
          const now = Date.now();
          if (!this.errorThrottle.lastFrameError || now - this.errorThrottle.lastFrameError > 5000) {
            logger.error(`[streamer] Failed to write frame: ${error.message} (${error.code})`);
            this.errorThrottle.lastFrameError = now;
          }
        }
      } else {
        logger.error("[streamer] FFmpeg stdin not writable, stopping render loop");
        this.ffmpegInstance = null;
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
        }
        this.isRunning = false;
        return;
      }
    } else {
      logger.error("[streamer] FFmpeg stdin not available, stopping render loop");
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
      this.isRunning = false;
      return;
    }

    // Schedule next frame
    const frameTime = Date.now() - startTime;
    const nextFrameIn = Math.max(1, 1000 / this.config.fps - frameTime);
    setTimeout(() => this._render(), nextFrameIn);
  }

  /**
   * Handle FFmpeg process close
   * @private
   */
  _handleFFmpegClose(code) {
    logger.error(`[streamer] FFmpeg process exited with code ${code}`);
    this.ffmpegInstance = null;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
  }

  /**
   * Handle FFmpeg process error
   * @private
   */
  _handleFFmpegError(error) {
    logger.error(`[streamer] FFmpeg error: ${error.message}`);
    this.ffmpegInstance = null;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
  }

  /**
   * Handle FFmpeg stdin error
   * @private
   */
  _handleStdinError(error) {
    // EPIPE, ECONNRESET, and EINVAL are expected when FFmpeg closes or has issues
    if (
      error.code !== "EPIPE" &&
      error.code !== "ECONNRESET" &&
      error.code !== "EINVAL"
    ) {
      logger.error(`[streamer] FFmpeg stdin error: ${error.message} (${error.code})`);
    }
    this.ffmpegInstance = null;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
  }
}

module.exports = { YouTubeStreamer };
