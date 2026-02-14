# Quiz Game - Safe Margins Implementation

## Overview

The quiz game renderer now respects safe margins to ensure all UI elements remain visible on mobile devices (avoiding keyboard overlap) and YouTube Live streams (avoiding edge overlays).

## Safe Margin Configuration

Safe margins are defined in `constants.js` and match `config/modes.js`:

```javascript
SAFE_MARGINS: {
  top: 40,    // YouTube title bar
  bottom: 300, // Mobile keyboard + progress bar
  left: 40,   // Left edge
  right: 40,   // Chat overlay
}
```

## Safe Area Calculation

The renderer calculates a safe area within which all UI elements are positioned:

- **Safe X**: `safeLeft` (40px)
- **Safe Y**: `safeTop` (40px)
- **Safe Width**: `WIDTH - safeLeft - safeRight` (1920 - 40 - 40 = 1840px)
- **Safe Height**: `HEIGHT - safeTop - safeBottom` (1080 - 40 - 300 = 740px)

## UI Elements Positioning

All UI elements are positioned within the safe area:

1. **Game Title**: `(safeX, safeY)` - Top left corner
2. **Question Counter**: `(safeX, safeY + 50)` - Below title
3. **Timer**: `(WIDTH - safeRight - 100, safeY + 40)` - Top right
4. **Question Text**: Centered horizontally, starts at `safeY + 120`
5. **Answer Options**:
   - Positioned to ensure all 4 options fit within safe height
   - Automatically adjusted if needed to prevent overflow
6. **Leaderboard**: Right-aligned within safe area, starts at `safeY + 60`
7. **Recent Answers**: Right-aligned, below leaderboard, within safe area
8. **Celebration**: Centered within safe area

## Dynamic Sizing

The renderer automatically adjusts element sizes to fit within safe margins:

- **Question text**: Word wrap respects `safeWidth - 40`
- **Answer options**: Width limited to `safeWidth - 40`
- **Options positioning**: Automatically calculated to prevent bottom overflow
- **Leaderboard height**: Limited to available safe height
- **Recent answers height**: Limited to available safe height

## Benefits

✅ **Mobile Safe**: All content visible even when keyboard is open
✅ **YouTube Safe**: No overlap with title bar, progress bar, or chat overlay
✅ **Responsive**: Automatically adjusts to available space
✅ **Consistent**: Same safe margins across all games

## Configuration

To adjust safe margins, edit:
- `src/games/quiz/constants.js` - `SAFE_MARGINS` object
- `config/modes.js` - `quiz.safeMargins` object (should match)

Both should be kept in sync for consistency.
