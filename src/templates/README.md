# Template System for YouTube Streams

This folder contains reusable UI templates for YouTube streaming. Each template is a pure UI system - layout, animations, and visual experience only.

## Structure

```
youtube-streams/templates/
  ├── index.js              # Main entry point (exports default template)
  ├── showdown-layout/      # Showdown Layout Template
  │   ├── index.js          # Template registry and API
  │   ├── design-system.js  # Design constants
  │   ├── utils.js          # Rendering utilities
  │   ├── ui-components.js  # Reusable UI components
  │   └── README.md         # Template documentation
  └── README.md            # This file
```

## Available Templates

### Showdown Layout (`showdown-layout`)

A reusable UI template for game showdown layouts (quiz, trivia, etc.).

**Features:**
- Pure UI - no game logic
- Matches React frontend design
- Reusable components (Header, Timer, Button, List, Card, Background)
- Supports multilingual text
- Stream-safe layout

**Usage:**
```javascript
const template = require("./templates/showdown-layout");

// Register a layout using this template
template.registerTemplate("my-game", {
  render: myRenderer,
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 30,
});

// Use the template
template.renderTemplate("my-game", ctx, uiData);
```

## Philosophy

- **Templates = UI Only**: Layout, styling, animations, visual effects
- **Games = Data + State**: Games provide data, templates render the UI
- **Separation of Concerns**: Clean separation between game logic and presentation

## Adding New Templates

1. Create a new folder: `youtube-streams/templates/[template-name]/`
2. Create template files (index.js, design-system.js, utils.js, etc.)
3. Export from the template's index.js
4. Update this README with template documentation

## See Also

- `showdown-layout/README.md` - Detailed documentation for Showdown Layout template
