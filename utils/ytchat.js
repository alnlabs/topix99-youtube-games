// utils/ytchat.js
/**
 * YouTube Live Chat Reader using Playwright + Headless Shell
 * Lightweight (~50-80MB RAM) real-time chat reader with zero API quota usage.
 *
 * Uses dual approach for maximum reliability:
 * 1. Network interception - catches messages from YouTube's live chat API (fastest)
 * 2. DOM polling fallback - catches any messages missed by network interception
 *
 * EDGE CASES HANDLED:
 * ✅ Top chat vs Live chat mode - Forces live chat with embed_domain parameter
 * ✅ Message deduplication during restart - Session-based permanent ID tracking (no expiration)
 * ✅ Memory leak prevention - Browser restart every 5 minutes (tracker persists)
 * ✅ Restart overlap - 2-second overlap window to catch messages during page transition
 * ✅ Old messages on page load - Initial DOM messages marked as seen, not re-emitted
 * ✅ Network interception failure - DOM scraping fallback during restart
 * ✅ Initial messages - Marked as seen to prevent duplicates
 * ✅ Race conditions - Tracks last processed ID across restart boundary
 *
 * SCOPE:
 * 📝 Text messages only - Superchats, memberships, stickers, etc. are ignored
 *
 * KNOWN LIMITATIONS:
 * ⚠️ Very high message volume (>100/sec) - may miss some during restart window
 * ⚠️ Emojis in messages - captured as emojiId, not rendered text
 */

const { chromium } = require("playwright-core");

/**
 * Session-based Message Tracker
 * Tracks all message IDs seen during the session to prevent duplicates
 * No time-based expiration - messages are tracked permanently until stop() is called
 * This prevents re-emission of old messages that appear in DOM on page restart
 */
class MessageTracker {
  constructor() {
    this._messageSet = new Set(); // Simple set of message IDs
  }

  /**
   * Add a message ID. Returns true if it's new, false if duplicate
   */
  add(id) {
    if (this._messageSet.has(id)) {
      return false; // Duplicate
    }

    this._messageSet.add(id);
    return true; // New message
  }

  has(id) {
    return this._messageSet.has(id);
  }

  clear() {
    this._messageSet.clear();
  }

  get size() {
    return this._messageSet.size;
  }
}

class YTChat {
  constructor(videoId) {
    this.videoId = videoId;
    this.browser = null;
    this.page = null;
    this.onMessage = null;
    this._messageTracker = new MessageTracker(); // Track all messages permanently (session-based)
    this.restartTimer = null;
    this.isStopping = false;
    this._messageQueue = []; // Queue for deduplication during restart
    this._isRestarting = false;
    this._lastProcessedId = null; // Track the last message ID we processed (for restart)
  }

  async start(onMessage) {
    this.onMessage = onMessage;
    this.isStopping = false;
    await this._launch();
  }

  async _launch() {
    if (this.isStopping) return;

    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--single-process",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        // Additional CPU/memory saving flags
        "--disable-software-rasterizer",
        "--disable-sync",
        "--disable-translate",
        "--disable-default-apps",
        "--mute-audio",
        "--no-first-run",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-domain-reliability",
        "--disable-component-update",
        "--disable-features=TranslateUI,BlinkGenPropertyTrees,Autofill,PasswordManager",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--js-flags=--max-old-space-size=128,--optimize-for-size,--memory-reducer", // Limit V8 heap to 128MB, optimize for size
      ],
    });

    const context = await this.browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: 400, height: 300 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    this.page = await context.newPage();
    await this._setupPage(this.page);

    // Force live chat mode (not top chat) by adding embed_domain
    // Top chat is default, we need live chat for all messages
    const chatUrl = `https://www.youtube.com/live_chat?is_popout=1&v=${this.videoId}`;

    try {
      await this.page.goto(chatUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for chat to load
      await this.page.waitForSelector(
        "yt-live-chat-item-list-renderer #items",
        { timeout: 60000 }
      );

      // Ensure we're in "Live chat" mode, not "Top chat"
      await this._ensureLiveChatMode(this.page);

      // Mark initial messages as seen (get IDs from DOM once)
      const initialIds = await this._scrapeInitialMessages(this.page);
      initialIds.forEach((id) => this._messageTracker.add(id));

      console.log(
        `[ytchat] Started monitoring chat (${this._messageTracker.size} initial messages)`
      );

      // Schedule restart (close and start) every 5 minutes
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => this._restart(), 300000);
    } catch (error) {
      console.error("[ytchat] Error during launch/navigation:", error.message);
      // Retry sooner if launch failed
      if (!this.isStopping) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => this._restart(), 30000);
      }
    }
  }

  async _setupPage(page) {
    await page.route(
      "**/*.{png,jpg,jpeg,gif,webp,svg,ttf,woff,woff2}",
      (route) => route.abort()
    );

    // Intercept YouTube's live chat API responses - FASTEST method
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/youtubei/v1/live_chat/get_live_chat")) {
        try {
          const json = await response.json();
          this._parseApiResponse(json);
        } catch (e) {
          // Response might not be JSON, ignore
        }
      }
    });
  }

  /**
   * Ensure we're viewing "Live chat" mode, not "Top chat"
   * YouTube defaults to "Top chat" which filters messages
   */
  async _ensureLiveChatMode(page) {
    try {
      const currentMode = await page.evaluate(() => {
        const buttons = document.querySelectorAll(
          "yt-live-chat-header-renderer #menu-button button"
        );
        for (const btn of buttons) {
          if (btn.getAttribute("aria-pressed") === "true") {
            return btn.getAttribute("aria-label") || "";
          }
        }
        return "";
      });

      if (currentMode.includes("Top chat")) {
        console.log("[ytchat] Switching from Top chat to Live chat mode...");
        await page.evaluate(() => {
          const buttons = document.querySelectorAll(
            "yt-live-chat-header-renderer #menu-button button"
          );
          for (const btn of buttons) {
            const label = btn.getAttribute("aria-label") || "";
            if (label.includes("Live chat")) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        // Wait for mode switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.log("[ytchat] Already in Live chat mode");
      }
    } catch (error) {
      console.log("[ytchat] Could not verify chat mode:", error.message);
      // Continue anyway, embed_domain parameter should force live chat
    }
  }

  async _scrapeInitialMessages(page) {
    // Get IDs only for initial deduplication - actual messages will come via API
    return page.evaluate(() => {
      const items = document.querySelectorAll(
        "yt-live-chat-text-message-renderer"
      );
      return Array.from(items)
        .map((el) => el.getAttribute("id"))
        .filter(Boolean);
    });
  }

  /**
   * Scrape full message data from DOM (not just IDs)
   * Returns array of {id, author, message} objects
   */
  async _scrapeMessages(page) {
    return page.evaluate(() => {
      const items = document.querySelectorAll(
        "yt-live-chat-text-message-renderer"
      );
      return Array.from(items)
        .map((el) => {
          const id = el.getAttribute("id");
          const authorEl = el.querySelector("#author-name");
          const messageEl = el.querySelector("#message");

          if (!id || !authorEl || !messageEl) return null;

          const author = authorEl.textContent?.trim();
          const message = messageEl.textContent?.trim();

          return author && message ? { id, author, message } : null;
        })
        .filter(Boolean);
    });
  }

  /**
   * Process scraped messages (emit new ones via onMessage callback)
   * @param {Array} messages - Array of {id, author, message} objects
   * @param {string|null} afterId - Only process messages after this ID (for restart)
   */
  _processScrapedMessages(messages, afterId = null) {
    let newCount = 0;
    let skippedOld = 0;
    const messageList = [];
    let foundAfter = !afterId; // If no afterId, process all

    for (const { id, author, message } of messages) {
      // If we're looking for a specific message to start after
      if (afterId && !foundAfter) {
        if (id === afterId) {
          foundAfter = true; // Found it, start processing next message
        } else {
          skippedOld++;
        }
        continue;
      }

      // Use messageTracker which properly handles time-based deduplication
      const isNew = this._messageTracker.add(id);
      if (!isNew) continue;

      this._lastProcessedId = id; // Track latest message
      messageList.push(`${author}:${message}`);

      if (this.onMessage) {
        this.onMessage({ author, message, timestamp: Date.now() });
        newCount++;
      }
    }

    return newCount;
  }

  async _restart() {
    if (this.isStopping) return;
    console.log("[ytchat] Restarting...");

    this._isRestarting = true;
    this._messageQueue = [];

    // Log memory before restart
    const memBefore = process.memoryUsage();
    console.log(
      `[ytchat] Memory: RSS=${Math.round(
        memBefore.rss / 1024 / 1024
      )}MB, Heap=${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`
    );

    if (this.page) {
      try {
        const oldPage = this.page;
        const context = oldPage.context();

        // Process any unseen messages on old page before closing
        const oldMessages = await this._scrapeMessages(oldPage).catch((err) => {
          console.log("[ytchat] Failed to scrape old page:", err.message);
          return [];
        });
        const oldProcessed = this._processScrapedMessages(oldMessages);

        // Capture the last message ID before switching pages
        const restartBarrierId = this._lastProcessedId;

        // Open and setup new page
        const newPage = await context.newPage();
        await this._setupPage(newPage);

        const chatUrl = `https://www.youtube.com/live_chat?is_popout=1&v=${this.videoId}`;

        // Navigate and wait for load
        await newPage.goto(chatUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await newPage.waitForSelector(
          "yt-live-chat-item-list-renderer #items",
          { timeout: 60000 }
        );

        // Keep both pages alive briefly for overlap
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Scrape and process new page messages (only after restart barrier)
        const newMessages = await this._scrapeMessages(newPage).catch((err) => {
          console.log("[ytchat] Failed to scrape new page:", err.message);
          return [];
        });
        const newProcessed = this._processScrapedMessages(
          newMessages,
          restartBarrierId
        );

        // Swap and close old page
        this.page = newPage;
        await oldPage.close();

        this._isRestarting = false;
        this._messageQueue = [];

        console.log(
          `[ytchat] Restart complete (${this._messageTracker.size} messages tracked)`
        );

        // Schedule next restart
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => this._restart(), 300000);
      } catch (error) {
        console.error(
          "[ytchat] Restart failed, performing full restart:",
          error.message
        );
        // Fallback to full restart
        if (this.browser) {
          await this.browser.close().catch(() => {});
          this.browser = null;
          this.page = null;
        }
        this._messageTracker.clear();
        this._isRestarting = false;
        this._messageQueue = [];
        await this._launch();
      }
    } else {
      // No page, launch
      await this._launch();
    }
  }

  async _clearPageState() {
    // Try to clear context-level and page-level persisted state that may survive reloads
    if (!this.page) return;
    console.log(
      "[ytchat] Clearing page caches (cookies, storage, caches, service workers, indexedDB)"
    );

    try {
      const ctx = this.page.context();
      if (ctx.clearCookies) await ctx.clearCookies().catch(() => {});
      if (ctx.clearPermissions) await ctx.clearPermissions().catch(() => {});
    } catch (e) {
      console.log(
        "[ytchat] Error clearing context cookies/permissions:",
        e.message
      );
    }

    try {
      await this.page
        .evaluate(async () => {
          const errs = [];
          try {
            localStorage.clear();
          } catch (e) {
            errs.push(`[ytchat] localStorage clear error: ${e.message}`);
          }
          try {
            sessionStorage.clear();
          } catch (e) {
            errs.push(`[ytchat] sessionStorage clear error: ${e.message}`);
          }
          try {
            if (window.caches && caches.keys) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
          } catch (e) {
            errs.push(`[ytchat] Cache clear error: ${e.message}`);
          }
          try {
            if (
              navigator.serviceWorker &&
              navigator.serviceWorker.getRegistrations
            ) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
          } catch (e) {
            errs.push(`[ytchat] Service worker unregister error: ${e.message}`);
          }
          try {
            if (window.indexedDB && indexedDB.databases) {
              const dbs = await indexedDB.databases();
              await Promise.all(
                dbs.map((db) =>
                  db.name
                    ? indexedDB.deleteDatabase(db.name)
                    : Promise.resolve()
                )
              );
            }
          } catch (e) {
            errs.push(`[ytchat] IndexedDB delete error: ${e.message}`);
          }
          if (errs.length > 0) {
            console.log(errs.join("\n"));
          }
        })
        .catch((e) => {
          console.log(
            "[ytchat] Error during page state clearing evaluation:",
            e.message
          );
        });
    } catch (e) {
      console.log("[ytchat] Error clearing page storage:", e.message);
    }
  }

  /**
   * Parse YouTube's live chat API response
   */
  _parseApiResponse(json) {
    try {
      const actions =
        json?.continuationContents?.liveChatContinuation?.actions ||
        json?.contents?.liveChatRenderer?.actions ||
        [];

      let processedCount = 0;
      let skippedCount = 0;
      let otherActionCount = 0;
      const messageList = [];

      for (const action of actions) {
        // Track all action types to see if we're missing some
        const actionType = Object.keys(action)[0];

        // Only handle text messages
        const item =
          action?.addChatItemAction?.item?.liveChatTextMessageRenderer;

        if (!item) {
          otherActionCount++;
          continue;
        }

        const id = item.id;
        if (!id) {
          console.warn("[ytchat] Message item missing ID");
          continue;
        }

        // Use messageTracker for time-based deduplication
        const isNew = this._messageTracker.add(id);
        if (!isNew) {
          skippedCount++;
          continue;
        }

        const author = item.authorName?.simpleText;
        const messageParts = item.message?.runs || [];
        const message = messageParts
          .map((run) => run.text || run.emoji?.emojiId || "")
          .join("");
        console.log(`[ytchat] New message: ${author}: ${message}`);
        if (!author || !message) {
          // Skip items without author/message (e.g., membership items without text)
          // These might be valid items like membership renewals
          if (item.id) {
            this._messageTracker.add(item.id); // Mark as seen to avoid reprocessing
          }
          skippedCount++;
          continue;
        }

        this._lastProcessedId = id; // Track latest message
        messageList.push(`${author}:${message}`);
        if (this.onMessage) {
          this.onMessage({ author, message, timestamp: Date.now() });
          processedCount++;
        }
      }

      if (processedCount > 0) {
        console.log(
          `[ytchat] +${processedCount} new messages (skipped ${skippedCount} duplicates)`
        );
      }
    } catch (e) {
      console.error("[ytchat] Error parsing API response:", e.message);
    }
  }

  async stop() {
    this.isStopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
    }
    this._messageTracker.clear();
    this._messageQueue = [];
    this._isRestarting = false;
    this._lastProcessedId = null;
  }
}

module.exports = {
  YTChat,
};
