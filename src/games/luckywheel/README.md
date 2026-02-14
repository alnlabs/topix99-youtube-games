# Lucky Wheel Game Module

This directory contains the complete Lucky Wheel game implementation, organized by concern.

## File Structure

### Core Game Logic
- **`game.js`** - Main game class with game logic only:
  - Game state machine (waiting → spinning → winner → cooldown)
  - Round management
  - Chat message processing
  - Winner calculation coordination
  - **NO rendering, NO streaming, NO state persistence** - pure game logic

### Supporting Modules

- **`logic.js`** - Winner calculation logic (pure functions)
- **`constants.js`** - Game constants and configuration
- **`state.js`** - State persistence layer (Redis integration)
  - Handles saving/loading game state
  - Manages leaderboard
  - **Separated from game logic**

### Rendering & Streaming

- **`renderer.js`** - Canvas rendering functions
  - Drawing wheel, UI, leaderboard
  - Visual effects and animations
  - **Separated from game logic**

- **`live.js`** - Live streaming setup
  - Integrates YouTubeStreamer
  - Connects game state to rendering
  - **Separated from game logic**

- **`test.js`** - Test mode setup
  - Local browser-based testing
  - HTTP server for test UI
  - **Separated from game logic**

### Module Exports

- **`index.js`** - Main entry point
  - Exports GameClass, renderer, startLive, startTest, config
  - Used by game registry

## Separation of Concerns

✅ **`game.js`** = Pure game logic only
- State transitions
- Round management
- Chat processing
- Winner coordination

❌ **`game.js`** does NOT contain:
- Rendering/visual code (in `renderer.js`)
- Streaming setup (in `live.js`)
- State persistence (in `state.js`)
- Winner calculation (in `logic.js`)

## Usage

```javascript
// Get game instance (pure logic)
const game = require('./game');

// Start a new round
await game.startNewRound();

// Process chat message
await game.processChatMessage(userId, username, message);

// Get current state
const state = game.getStateSync();
```

## Architecture

```
game.js (Logic)
    ↓ uses
state.js (Persistence)
    ↓ uses
logic.js (Calculations)
    ↓ uses
constants.js (Config)

renderer.js (Visual)
    ↓ uses
game.js state (Read-only)

live.js (Streaming)
    ↓ uses
game.js + renderer.js
```

This separation allows:
- Game logic to be tested independently
- Rendering to be swapped/changed without affecting logic
- State persistence to be changed (Redis → Database) without affecting logic
- Easy to add new games following the same pattern
