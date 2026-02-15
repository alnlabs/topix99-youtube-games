# Debugging Empty Logs

## Issue
PM2 logs are empty, which means the application is either:
1. Not starting at all
2. Crashing before writing any logs
3. PM2 hasn't restarted with the new code

## Quick Checks

### 1. Check if PM2 process exists
```bash
pm2 status
```

### 2. Check if process is running
```bash
ps aux | grep "node.*server.js"
```

### 3. Try starting manually (to see errors)
```bash
# Test if server can start
node server.js
```

This will show errors directly in the terminal.

### 4. Check PM2 logs with more lines
```bash
pm2 logs topix99-luckywheel --lines 100 --nostream
```

### 5. Check PM2 error logs specifically
```bash
pm2 logs topix99-luckywheel --err --lines 100 --nostream
```

### 6. Delete and restart PM2
```bash
# Stop and delete
npm run pm2:delete

# Start fresh
npm run pm2:start

# Immediately check logs
pm2 logs topix99-luckywheel --lines 50
```

## Common Causes

### Import Path Errors
If you see `Cannot find module` errors, check:
- `src/services/config-validator.js` - should require `../../config/modes`
- `src/games/luckywheel/game.js` - should export the class, not instance

### Missing Dependencies
```bash
npm install
```

### Environment Variables
Check if required env vars are set:
- `MODE` (defaults to 'luckywheel')
- `TOPIX99_API_TOKEN` (optional but recommended)
- `REDIS_URL` (defaults to 'redis://127.0.0.1:6379')

### Redis Not Running
```bash
redis-cli ping
# Should return: PONG
```

## Manual Test

Run this to test startup without PM2:
```bash
MODE=luckywheel node server.js
```

This will show errors immediately in your terminal.
