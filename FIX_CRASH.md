# Fixing Application Crash

## Issue Found

The application is in "errored" state with 98 restarts. This indicates it's crashing on startup.

## Root Cause

The `game.js` file was exporting an instance instead of a class, which caused the game registry to fail when trying to create a new instance.

## Fix Applied

✅ Changed `game.js` to export the class instead of an instance
✅ Updated `test.js` to create its own instance

## Next Steps

1. **Delete the errored process:**
   ```bash
   npm run pm2:delete
   ```

2. **Start fresh:**
   ```bash
   npm run pm2:start
   ```

3. **Check status:**
   ```bash
   npm run pm2:status
   ```

4. **View logs:**
   ```bash
   npm run pm2:logs
   ```

## Expected Result

After restart, you should see:
- ✅ Status: "online" (not "errored")
- ✅ Uptime increasing (not 0)
- ✅ Restart count: 0 (not 98)
- ✅ Logs showing successful startup

## If It Still Crashes

Check the error logs:
```bash
pm2 logs topix99-luckywheel --err --lines 100
```

Common issues:
- Missing dependencies
- Import path errors
- Configuration errors
- Redis connection issues
