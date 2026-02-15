# Quiz Showdown - YouTube Edition

An interactive, multilingual trivia game for YouTube Live. Viewers answer multiple-choice questions in real-time via chat.

## 📺 YouTube Gameplay

### How to Join
1. **New Question**: A question is displayed with options A, B, C, and D.
2. **Submit Answer**: Type the correct option letter (e.g., `A`) or the full answer text (e.g., `Earth`) in the chat.
3. **Countdown**: You must answer before the timer reaches zero.
4. **Scoring**: Correct answers add points to your total score. Fast and consistent answers will help you climb the leaderboard.

### Language Support
This game supports multiple languages automatically:
- 🇺🇸 English
- 🇮🇳 Hindi (हिन्दी)
- 🇮🇳 Telugu (తెలుగు)

## 🛠️ Technical Details

### Game Logic
- **File**: `game.js` - Manages question cycling, answer validation, and cooldowns.
- **Data**: Questions are loaded from the `data/` directory, supporting multilingual JSON formats.

### Rendering
- **File**: `renderer.js` - Draws the questions, options, and countdown timer.
- **Optimization**: Uses a custom **Text Measurement Cache** (`getCachedMeasure`) to ensure high FPS even with complex, wrapped multilingual text.

### Local Testing
To test the Quiz implementation locally:
```bash
npm run game:quiz:test
```
This starts an Express server where you can preview the rendering and game state.

## 📊 Leaderboard
The real-time leaderboard tracks player accuracy and speed. Viewers can see their ranking live on stream.

---
*Powered by Topix99 Game Engine*
