# How to View Logs

## Quick Commands

### Check PM2 Status
```bash
npm run pm2:status
# or
pm2 status
```

### View Live Logs (Streaming)
```bash
npm run pm2:logs
# or
pm2 logs topix99-luckywheel
```

### View Last N Lines (Non-streaming)
```bash
pm2 logs topix99-luckywheel --lines 50 --nostream
```

### View Log Files Directly
```bash
# Output logs
tail -f logs/out.log

# Error logs
tail -f logs/err.log

# Both
tail -f logs/*.log
```

### Check Application Status
```bash
npm run check-status
```

## Troubleshooting

### If PM2 logs show nothing:

1. **Check if PM2 is running:**
   ```bash
   pm2 status
   ```

2. **Check if process is actually running:**
   ```bash
   ps aux | grep node
   ```

3. **Check log files exist:**
   ```bash
   ls -la logs/
   ```

4. **Check if application started:**
   ```bash
   pm2 describe topix99-luckywheel
   ```

### If logs are empty:

1. **Application might not be running:**
   ```bash
   npm run pm2:start
   ```

2. **Check for startup errors:**
   ```bash
   pm2 logs topix99-luckywheel --err --lines 50
   ```

3. **Check if port is in use:**
   ```bash
   lsof -i :4001  # Check if port 4001 is in use
   ```

### If you see errors:

1. **Check the error log file:**
   ```bash
   cat logs/err.log | tail -50
   ```

2. **Check output log file:**
   ```bash
   cat logs/out.log | tail -50
   ```

3. **Restart the application:**
   ```bash
   npm run pm2:restart
   ```

## Common Issues

### "No process found"
- Application is not running
- Start it: `npm run pm2:start`

### "Logs are empty"
- Application might have crashed
- Check error logs: `pm2 logs topix99-luckywheel --err`

### "Can't see recent logs"
- Logs might be buffered
- Use `--nostream` flag: `pm2 logs topix99-luckywheel --nostream --lines 100`

### "Permission denied"
- Check log file permissions
- PM2 might need to be run with proper user

## Real-time Monitoring

For continuous monitoring:
```bash
# Watch logs in real-time
pm2 logs topix99-luckywheel

# Watch with filtering
pm2 logs topix99-luckywheel | grep -i error

# Watch only errors
pm2 logs topix99-luckywheel --err
```
