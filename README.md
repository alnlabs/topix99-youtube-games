# Topix99 YouTube Games

Interactive live game engine for YouTube streaming, featuring real-time chat integration, canvas-based rendering, and automated broadcasting.

## 🎮 Games

### 🎡 Lucky Wheel
An interactive guessing game where viewers type numbers (1-100) in the chat to win points.
- **Phases**: Guessing (10s) → Spinning (7s) → Reveal (5s) → Cooldown (5s).
- **Scoring**: Single correct guess gives 10 points. Multiple guesses reduce the score (5 / guess count).
- [Lucky Wheel Documentation](./src/games/luckywheel/README.md)

### 🧠 Quiz Showdown
A fast-paced trivia game where viewers answer multiple-choice questions via chat.
- **Multilingual Support**: Questions are available in English, Hindi, and Telugu.
- **Optimized Rendering**: Features text measurement caching and efficient layout rendering for stable 1080p streaming.
- [Quiz Showdown Documentation](./src/games/quiz/README.md)

## 🎮 YouTube Gameplay

Want to join the fun? Here's how you can participate directly through the YouTube live chat!

### 🎡 For Lucky Wheel
1. **Wait for the guessing period**: Keep an eye out for the "READY TO SPIN" message and the countdown timer.
2. **Type your guess**: Send any number between **1 and 100** that appears on the wheel in the chat.
   - Example: `50` or `I guess 72`
3. **Spin & Reveal**: The wheel spins for 7 seconds. If it lands on your number, you win!
4. **Scoring**: Submitting a **single guess** yields the highest reward (10 points). Using multiple guesses (up to 5 allowed) reduces the points awarded.

### 🧠 For Quiz Showdown
1. **Wait for the question**: A new question appears every round with A, B, C, D options.
2. **Type your answer**: Simply type the answer or the option letter in the chat.
   - Example: `A` or `Mars`
3. **Timer**: You have a limited time to answer before the correct result is revealed.
4. **Leaderboard**: Correct answers earn you points, and top players are featured on the live leaderboard!

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **Redis**: Required for state management and leaderboard
- **FFmpeg**: Required for video encoding and RTMP streaming
- **PM2**: Recommended for running live streams in the background

### Installation
```bash
npm install
# Install PM2 globally
npm install -g pm2
```

### Running the Games

| Mode | Command |
|------|---------|
| **Quiz (Test)** | `npm run quiz:test` |
| **Quiz (Live)** | `npm run pm2:start:quiz` |
| **Lucky Wheel (Live)**| `npm run pm2:start:luckywheel` |

For detailed instructions on PM2 usage, see the [PM2 Guide](./PM2_GUIDE.md).

## 🎥 YouTube Live Integration

This engine is designed to stream directly to YouTube Live.

### Stream Description Template
Welcome to the TOPIX99 interactive game stream!

**How to Play:**
1. **Interactive Chat**: Type your guesses or answers directly in the YouTube live chat.
2. **Real-time Leaderboard**: See your name and score on the screen as you compete with other viewers.
3. **Automated Rounds**: New rounds start automatically every few seconds.

**Rules & Tips:**
- Quality over quantity! Strategic play often yields higher scores.
- Stay active and play consecutive rounds to climb the leaderboard.

[View Full YouTube Description](./YOUTUBE_DESCRIPTION.md) | [YouTube Channel Guide](./YOUTUBE_CHANNEL_DESCRIPTION.md)

## 📁 Project Structure

```
topix99-youtube-games/
├── src/
│   ├── core/           # YouTube streaming & game registry
│   ├── games/          # Game logic & renderers
│   ├── services/       # Redis, Logger, YT Chat, etc.
│   ├── templates/      # UI Layout templates
│   └── entry/          # Application entry points
├── assets/             # Fonts, Images, Sounds
├── config/             # Environment & game modes
└── logs/               # PM2 logs (err.log, out.log)
```

[Detailed Project Structure](./PROJECT_STRUCTURE.md)

## 🛠️ Performance & Stability
The engine is optimized for 1080p high-quality streaming:
- **Zero-latency tuning**: Optimized FFmpeg settings for real-time interaction.
- **Canvas Rendering**: High-performance frame generation utilizing text measurement caching.
- **Automatic Recovery**: PM2 monitoring with automatic restart on failure.

---
*Built with ❤️ by alnlabs for Topix99*
