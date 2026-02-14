# Project Structure

This document describes the scalable project structure for topix99-youtube-games.

## Directory Structure

```
topix99-youtube-games/
├── src/                          # Source code
│   ├── core/                     # Core libraries (reusable)
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
│   ├── games/                    # Game implementations
│   │   └── luckywheel/
│   │       ├── index.js         # Game exports & registration
│   │       ├── game.js          # Game logic class
│   │       ├── constants.js     # Game constants
│   │       ├── logic.js         # Winner calculation logic
│   │       ├── state.js         # State management
│   │       ├── renderer.js      # Rendering functions
│   │       ├── live.js          # Live streaming setup
│   │       └── test.js          # Test mode setup
│   │
│   └── entry/                    # Application entry points
│       └── server.js            # Main server (production)
│
├── config/                       # Configuration files
│   └── modes.js                  # Game mode configurations
│
├── assets/                       # Static assets
│   ├── fonts/                    # Font files
│   ├── images/                   # Image files
│   └── sounds/                   # Audio files
│
├── scripts/                      # Utility scripts
│
├── tests/                        # Test files
│
├── logs/                         # Log files (gitignored)
│
├── server.js                     # Legacy entry (redirects to src/entry/server.js)
├── package.json                  # Package configuration
├── ecosystem.config.js           # PM2 configuration
└── README.md                     # Project documentation
```

## Key Concepts

### 1. Core Libraries (`src/core/`)
Reusable libraries that can be used across all games:
- **youtube-streamer.js**: Handles YouTube Live streaming
- **game-registry.js**: Manages game registration and loading

### 2. Services (`src/services/`)
Shared services used by games and the server:
- **logger.js**: Centralized logging
- **redis.js**: Redis database client
- **topix99-api.js**: Topix99 API integration
- **ytchat.js**: YouTube chat monitoring
- **config-validator.js**: Configuration validation
- **font-helper.js**: Font utilities
- **shapes.js**: Canvas drawing utilities

### 3. Games (`src/games/`)
Each game is self-contained in its own directory:
- **index.js**: Exports game class, renderer, and configuration
- **game.js**: Main game logic class
- **constants.js**: Game-specific constants
- **logic.js**: Game-specific logic (e.g., winner calculation)
- **state.js**: State management (Redis integration)
- **renderer.js**: Rendering functions (canvas drawing)
- **live.js**: Live streaming setup
- **test.js**: Test mode setup

### 4. Entry Points (`src/entry/`)
Application entry points:
- **server.js**: Main production server

## Adding a New Game

1. Create game directory:
```bash
mkdir -p src/games/mynewgame
```

2. Create required files:
- `index.js` - Game exports
- `game.js` - Game class
- `constants.js` - Game constants
- `logic.js` - Game logic
- `state.js` - State management
- `renderer.js` - Rendering functions
- `live.js` - Live streaming
- `test.js` - Test mode

3. Register game in `src/entry/server.js`:
```javascript
const mynewgame = require("../games/mynewgame");
gameRegistry.register("mynewgame", {
  GameClass: mynewgame.GameClass,
  renderer: mynewgame.renderer,
  startLive: mynewgame.startLive,
  startTest: mynewgame.startTest,
  config: mynewgame.config,
});
```

4. Add game mode to `config/modes.js`:
```javascript
mynewgame: {
  port: 4002,
  topicId: 109,
  // ... other config
}
```

## Import Patterns

### From Services
```javascript
const { logger, redisClient, YTChat } = require("../../services");
```

### From Core
```javascript
const { YouTubeStreamer, gameRegistry } = require("../../core");
```

### Within Game
```javascript
const state = require("./state");
const C = require("./constants");
const { calculateWinners } = require("./logic");
```

### From Other Games (if needed)
```javascript
const otherGame = require("../othergame");
```

## Benefits

1. **Scalability**: Easy to add new games
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Core libraries shared across games
4. **Testability**: Each game is self-contained
5. **Organization**: Logical file structure

## Migration

See `RESTRUCTURE_GUIDE.md` for detailed migration instructions.
