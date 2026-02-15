# Quiz Game - Run Guide

## Overview

- **Test Mode**: Can run with both `npm run quiz:test` (direct) and PM2
- **Live/YouTube Mode**: **ONLY** runs with PM2 (for safety and stability)

## Test Mode (Both Options Available)

### Option 1: Direct Run (npm)
```bash
npm run quiz:test
```
- Runs directly in terminal
- Good for development and quick testing
- Stops when you close terminal or press Ctrl+C

### Option 2: PM2 (Background)
```bash
# Start
npm run pm2:start:quiz:test

# Stop
npm run pm2:stop:quiz:test

# Restart
npm run pm2:restart:quiz:test

# View logs
npm run pm2:logs:quiz:test

# Delete
npm run pm2:delete:quiz:test
```

## Live/YouTube Mode (PM2 Only)

### ⚠️ Important: Live mode REQUIRES PM2

If you try to run `npm run quiz` directly, you'll get an error:
```
❌ ERROR: Live/YouTube mode requires PM2!
```

### Start Live Mode with PM2
```bash
# Start
npm run pm2:start:quiz

# Stop
npm run pm2:stop:quiz

# Restart
npm run pm2:restart:quiz

# View logs
npm run pm2:logs:quiz

# Delete
npm run pm2:delete:quiz
```

### Direct PM2 Commands
```bash
# Start
pm2 start ecosystem.config.js --only topix99-quiz

# Stop
pm2 stop topix99-quiz

# Restart
pm2 restart topix99-quiz

# View logs
pm2 logs topix99-quiz

# View status
pm2 status
```

## Quick Reference

| Mode | Direct Run | PM2 |
|------|-----------|-----|
| **Test** | ✅ `npm run quiz:test` | ✅ `npm run pm2:start:quiz:test` |
| **Live/YouTube** | ❌ Blocked | ✅ `npm run pm2:start:quiz` |

## Emergency Override (Not Recommended)

If you absolutely need to run live mode without PM2 (NOT RECOMMENDED):
```bash
ALLOW_NON_PM2=true npm run quiz
```

⚠️ **Warning**: This bypasses the safety check. Use only for debugging.

## PM2 Status Check

```bash
# View all PM2 processes
npm run pm2:status
# or
pm2 status

# View all quiz processes
pm2 list | grep quiz
```

## Logs Location

- **Test Mode (PM2)**: `logs/quiz-test-*.log`
- **Live Mode (PM2)**: `logs/quiz-*.log`

## Troubleshooting

### "Live/YouTube mode requires PM2" Error
- **Solution**: Use PM2 to run live mode: `npm run pm2:start:quiz`

### Test mode not starting
- Check if port is already in use
- Check Redis is running: `redis-cli ping`
- View logs: `npm run pm2:logs:quiz:test` or check terminal output

### PM2 process not found
- Check status: `pm2 status`
- If not listed, start it: `npm run pm2:start:quiz` or `npm run pm2:start:quiz:test`
