# Project Restructuring Guide

This document explains the new scalable project structure and how to migrate.

## New Directory Structure

```
topix99-youtube-games/
├── src/
│   ├── core/                    # Core libraries (reusable across games)
│   │   ├── youtube-streamer.js  # YouTube streaming library
│   │   ├── game-registry.js     # Game registration system
│   │   └── index.js             # Core exports
│   │
│   ├── services/                 # Shared services
│   │   ├── logger.js            # Logging service
│   │   ├── redis.js             # Redis client
│   │   ├── topix99-api.js       # Topix99 API client
│   │   ├── ytchat.js            # YouTube chat service
│   │   ├── config-validator.js  # Configuration validation
│   │   ├── font-helper.js       # Font utilities
│   │   ├── shapes.js            # Drawing utilities
│   │   └── index.js             # Services exports
│   │
│   ├── games/                   # Game implementations
│   │   └── luckywheel/
│   │       ├── index.js         # Game exports & registration
│   │       ├── game.js          # Game logic class
│   │       ├── constants.js     # Game constants
│   │       ├── logic.js         # Winner calculation logic
│   │       ├── state.js         # State management
│   │       ├── renderer.js       # Rendering functions
│   │       ├── live.js          # Live streaming setup
│   │       └── test.js          # Test mode setup
│   │
│   └── entry/                   # Application entry points
│       ├── server.js            # Main server (production)
│       └── test-server.js      # Test server
│
├── config/                      # Configuration files
│   └── modes.js                 # Game mode configurations
│
├── assets/                      # Static assets
│   ├── fonts/
│   ├── images/
│   └── sounds/
│
├── scripts/                     # Utility scripts
│   └── (migration scripts, etc.)
│
├── tests/                       # Test files
│
├── lib/                         # Legacy (deprecated, use src/core)
│
├── utils/                       # Legacy (deprecated, use src/services)
│
├── live/                        # Legacy (deprecated, use src/games/*/live.js)
│
└── games/                       # Legacy (deprecated, use src/games)
```

## Key Improvements

### 1. **Separation of Concerns**
- **Core**: Reusable libraries (streaming, registry)
- **Services**: Shared services (Redis, API, chat)
- **Games**: Self-contained game implementations
- **Entry**: Application entry points

### 2. **Game Registry System**
Games are now registered centrally, making it easy to add new games:

```javascript
const { gameRegistry } = require('./src/core');
const luckywheel = require('./src/games/luckywheel');

gameRegistry.register('luckywheel', {
  GameClass: luckywheel.GameClass,
  renderer: luckywheel.renderer,
  startLive: luckywheel.startLive,
  startTest: luckywheel.startTest,
  config: luckywheel.config,
});
```

### 3. **Self-Contained Games**
Each game is now self-contained with:
- Game logic
- Renderer
- State management
- Live streaming setup
- Test mode setup

### 4. **Centralized Services**
All services are exported from `src/services/index.js`:

```javascript
const { logger, redisClient, YTChat } = require('./src/services');
```

## Migration Steps

### Step 1: Update Imports in Game Files

**Old:**
```javascript
const { logger } = require("../../utils/logger");
```

**New:**
```javascript
const { logger } = require("../../src/services");
```

### Step 2: Update Game State Imports

**Old:**
```javascript
const state = require("./state");
```

**New:**
```javascript
const state = require("./state"); // Same, but in new location
```

### Step 3: Update Server Entry Point

**Old:**
```javascript
const { startLive } = require("./live");
const LuckyWheelGame = require("./games/luckywheel");
```

**New:**
```javascript
const { gameRegistry } = require("./src/core");
const luckywheel = require("./src/games/luckywheel");

// Register game
gameRegistry.register('luckywheel', {
  GameClass: luckywheel.GameClass,
  renderer: luckywheel.renderer,
  startLive: luckywheel.startLive,
  startTest: luckywheel.startTest,
  config: luckywheel.config,
});

// Use registry
const gameConfig = gameRegistry.get('luckywheel');
const game = gameRegistry.createInstance('luckywheel');
```

### Step 4: Update Renderer Imports

**Old:**
```javascript
const C = require("../games/luckywheel/constants");
const { drawRoundedRect } = require("../utils/shapes");
```

**New:**
```javascript
const C = require("./constants");
const { shapes } = require("../../src/services");
const { drawRoundedRect } = shapes;
```

## Adding a New Game

1. Create game directory:
```bash
mkdir -p src/games/mynewgame
```

2. Create game files:
- `game.js` - Game class
- `constants.js` - Game constants
- `logic.js` - Game logic
- `state.js` - State management
- `renderer.js` - Rendering functions
- `live.js` - Live streaming setup
- `test.js` - Test mode setup
- `index.js` - Game exports

3. Register game in server:
```javascript
const mynewgame = require('./src/games/mynewgame');
gameRegistry.register('mynewgame', {
  GameClass: mynewgame.GameClass,
  renderer: mynewgame.renderer,
  startLive: mynewgame.startLive,
  startTest: mynewgame.startTest,
  config: mynewgame.config,
});
```

## Benefits

1. **Scalability**: Easy to add new games without modifying core code
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Core libraries can be shared across games
4. **Testability**: Each game is self-contained and testable
5. **Organization**: Logical file structure

## Backward Compatibility

The old structure is maintained temporarily for migration. Update imports gradually:

1. Update game files first
2. Update server entry point
3. Remove old directories once migration is complete

## Next Steps

1. Update all imports to use new paths
2. Test each game thoroughly
3. Remove legacy directories
4. Update documentation
