# Lucky Wheel - YouTube Edition

An interactive, chat-integrated "Spin the Wheel" game designed for YouTube Live. Viewers compete in real-time by guessing where the wheel will land.

## 📺 YouTube Gameplay

### How to Join
1. **Waiting Phase**: When the screen shows "READY TO SPIN", the guessing period begins (10 seconds).
2. **Submit Guess**: Type any number that appears on the wheel (e.g., `10`, `50`, `100`) in the YouTube chat.
3. **The Spin**: The wheel spins automatically for 7 seconds.
4. **Victory**: If the wheel stops on your guessed number, you win points!

### Rules
- **Max Guesses**: You can submit up to 5 different guesses per round.
- **Scoring**:
  - 1 correct guess out of 1 total = **10 points**.
  - 1 correct guess out of 5 total = **1 point**.
  - *Strategy Tip*: Being precise with fewer guesses yields much higher scores.

## 🛠️ Technical Details

### Game Logic
- **File**: `game.js` - Manages the state machine (Waiting → Spinning → Reveal → Cooldown).
- **Physics**: Uses a mathematical easing function to simulate natural wheel deceleration.
- **State Management**: Persists scores and game state in Redis.

### Rendering
- **File**: `renderer.js` - Handles the canvas-based rendering of the wheel, pointer, and background effects.
- **Assets**: Uses high-resolution textures and font rendering for a premium "neon" look.

### Local Testing
To test the Lucky Wheel implementation without going live:
```bash
npm run game:luckywheel:test
```
Visit `http://localhost:3001` to see the virtual stream.

## 📊 Leaderboard
Scores are persistent and updated instantly. The top 5 players are displayed on the right sidebar during the live stream.

---
*Powered by Topix99 Game Engine*
