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
      autoRestart: config.autoRestart !== false,
      restartBaseDelayMs: config.restartBaseDelayMs || 2000,
      restartMaxDelayMs: config.restartMaxDelayMs || 30000,
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
    this.frameCount = 0;
    this.lastLogTime = 0;
    this.isStopping = false;
    this.restartAttempts = 0;
    this.restartTimer = null;

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
      this.isStopping = false;
      this.restartAttempts = 0;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      // Initialize canvas
      this.canvas = createCanvas(this.config.width, this.config.height);
      this.ctx = this.canvas.getContext("2d");

      // Start state synchronization if provided
      if (this.config.syncState) {
        await this._syncState();
        this.syncInterval = setInterval(
          () => this._syncState(),
          this.config.syncInterval
        );
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
    this.isStopping = true;
    this.isRunning = false;
    this.restartAttempts = 0;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

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
    const width = this.config.width;
    const height = this.config.height;
    const fps = this.config.fps;

    const ffmpegArgs = [
      "-loglevel",
      "info",

      "-re", // Read input at native frame rate (crucial for real-time pipes)
      "-fflags",
      "+genpts",

      // ===== INPUT (Raw canvas frames) =====
      "-f",
      "rawvideo",
      "-pixel_format",
      "bgra",
      "-video_size",
      `${width}x${height}`,
      "-framerate",
      `${fps}`,
      "-r",
      `${fps}`,
      "-thread_queue_size",
      "512",
      "-i",
      "pipe:0",
    ];

    // ===== OPTIONAL BACKGROUND MUSIC =====
    if (this.config.bgmPath) {
      ffmpegArgs.push(
        "-stream_loop",
        "-1",
        "-thread_queue_size",
        "512",
        "-i",
        this.config.bgmPath
      );
    }

    // ===== VIDEO ENCODING (1080p Stable) =====
    ffmpegArgs.push(
      "-c:v",
      this.config.ffmpegOptions.videoEncoder || "libx264",
      "-preset",
      this.config.ffmpegOptions.preset || "veryfast",
      "-tune",
      this.config.ffmpegOptions.tune || "zerolatency",

      // Stable bitrate for 1080p
      "-b:v",
      this.config.ffmpegOptions.videoBitrate || "3500k",
      "-maxrate",
      this.config.ffmpegOptions.maxBitrate || "3500k",
      "-bufsize",
      this.config.ffmpegOptions.bufsize || "7000k",

      // Strict 2-second keyframe interval
      "-g",
      this.config.ffmpegOptions.gop || `${fps * 2}`,
      "-keyint_min",
      `${fps * 2}`,
      "-sc_threshold",
      "0",
      "-x264-params",
      `nal-hrd=cbr:force-cfr=1:scenecut=0:keyint=${fps * 2}:min-keyint=${fps * 2}`,

      // High profile for YouTube
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-fps_mode",
      "cfr"
    );

    // ===== AUDIO ENCODING =====
    if (this.config.bgmPath) {
      ffmpegArgs.push(
        "-c:a",
        "aac",
        "-b:a",
        this.config.ffmpegOptions.audioBitrate || "128k",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0"
      );
    }

    // ===== OUTPUT =====
    ffmpegArgs.push(
      "-f",
      "flv",
      "-flvflags",
      "no_duration_filesize",
      "-rtmp_live",
      "live",
      "-rtmp_buffer",
      this.config.ffmpegOptions.rtmpBuffer || "1000",
      this.config.rtmpUrl
    );

    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    this.ffmpegInstance = spawn(ffmpegPath, ffmpegArgs);

    this.ffmpegInstance.on("close", this._handleFFmpegClose);
    this.ffmpegInstance.on("error", this._handleFFmpegError);
    this.ffmpegInstance.stdin.on("error", this._handleStdinError);

    this.ffmpegInstance.stderr.on("data", (data) => {
      const message = data.toString();
      this.lastFFmpegErrors = (this.lastFFmpegErrors || []).concat(message.split("\n")).slice(-20);
      if (message.includes("Error") || message.includes("error") || message.includes("fatal")) {
        logger.error(`[streamer] FFmpeg Error: ${message.trim()}`);
      } else if (this.frameCount % 500 === 0) {
        // Log general info less frequently to avoid flooding
        logger.info(`[streamer] FFmpeg: ${message.trim()}`);
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
      if (
        !this.errorThrottle.lastSyncError ||
        now - this.errorThrottle.lastSyncError > 5000
      ) {
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
      if (
        !this.errorThrottle.lastFrameError ||
        now - this.errorThrottle.lastFrameError > 5000
      ) {
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

          // Performance Logging (every 100 frames)
          this.frameCount++;
          if (this.frameCount % 100 === 0) {
            const now = Date.now();
            if (this.lastLogTime) {
              const elapsed = (now - this.lastLogTime) / 1000;
              const actualFps = (100 / elapsed).toFixed(1);
              const speed = (actualFps / this.config.fps).toFixed(2);
              logger.info(`[streamer] Performance: ${actualFps} FPS (${speed}x speed)`);
            }
            this.lastLogTime = now;
          }

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
            logger.error(
              `[streamer] FFmpeg pipe error (${error.code}), stopping render loop`
            );
            this.ffmpegInstance = null;
            if (!this.isStopping) {
              this._scheduleRestart("pipe_error");
              return;
            }
            if (this.syncInterval) {
              clearInterval(this.syncInterval);
            }
            this.isRunning = false;
            return;
          }
          // Log other errors (throttled)
          const now = Date.now();
          if (
            !this.errorThrottle.lastFrameError ||
            now - this.errorThrottle.lastFrameError > 5000
          ) {
            logger.error(
              `[streamer] Failed to write frame: ${error.message} (${error.code})`
            );
            this.errorThrottle.lastFrameError = now;
          }
        }
      } else {
        logger.error(
          "[streamer] FFmpeg stdin not writable, stopping render loop"
        );
        this.ffmpegInstance = null;
        if (!this.isStopping) {
          this._scheduleRestart("stdin_not_writable");
          return;
        }
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
        }
        this.isRunning = false;
        return;
      }
    } else {
      logger.error(
        "[streamer] FFmpeg stdin not available, stopping render loop"
      );
      if (!this.isStopping) {
        this._scheduleRestart("stdin_unavailable");
        return;
      }
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
      this.isRunning = false;
      return;
    }

    // Schedule next frame with precise timing
    const elapsedMs = Date.now() - startTime;
    const targetMs = 1000 / this.config.fps;
    const delay = Math.max(1, targetMs - elapsedMs);
    setTimeout(() => this._render(), delay);
  }

  /**
   * Handle FFmpeg process close
   * @private
   */
  _handleFFmpegClose(code) {
    if (code !== 0 && code !== null) {
      logger.error(`[streamer] FFmpeg process exited with code ${code}`);
      if (this.lastFFmpegErrors && this.lastFFmpegErrors.length > 0) {
        logger.error(`[streamer] Last FFmpeg output:\n${this.lastFFmpegErrors.join("\n")}`);
      }
    } else {
      logger.info(`[streamer] FFmpeg process exited with code ${code}`);
    }

    this.ffmpegInstance = null;
    if (!this.isStopping) {
      this._scheduleRestart("ffmpeg_close");
      return;
    }
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
    if (!this.isStopping) {
      this._scheduleRestart("ffmpeg_error");
      return;
    }
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
      logger.error(
        `[streamer] FFmpeg stdin error: ${error.message} (${error.code})`
      );
    }
    this.ffmpegInstance = null;
    if (!this.isStopping) {
      this._scheduleRestart("stdin_error");
      return;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
  }

  _scheduleRestart(reason) {
    if (!this.config.autoRestart || !this.isRunning || this.isStopping) {
      return;
    }
    if (this.restartTimer) {
      return;
    }

    this.restartAttempts += 1;
    const delay = Math.min(
      this.config.restartBaseDelayMs * Math.pow(2, this.restartAttempts - 1),
      this.config.restartMaxDelayMs
    );
    logger.warn(
      `[streamer] FFmpeg interrupted (${reason}). Restarting in ${Math.round(
        delay / 1000
      )}s (attempt ${this.restartAttempts})`
    );

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.isRunning || this.isStopping) {
        return;
      }
      try {
        this._startFFmpeg();
        // Render loop may have exited while ffmpeg was down.
        this._render();
      } catch (error) {
        logger.error(`[streamer] FFmpeg restart failed: ${error.message}`);
        this._scheduleRestart("restart_failed");
      }
    }, delay);
  }
}

module.exports = { YouTubeStreamer };
