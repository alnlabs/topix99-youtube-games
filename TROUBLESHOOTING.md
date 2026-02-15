# Troubleshooting Guide

## Common Issues and Solutions

### 1. YouTube Chat Errors: "Chat container not found"

**Symptoms:**
```
[ytchat] Error during launch/navigation: Chat container not found - live chat may not be available for this video
```

**Causes:**
- YouTube Live stream is not active
- Chat is disabled for the stream
- Stream is in "scheduled" mode (not live yet)
- Network/loading issues

**Solutions:**
- ✅ **Game will continue running** - Chat errors are non-fatal
- ✅ Ensure the YouTube stream is actually live (not scheduled)
- ✅ Check that chat is enabled in YouTube Studio
- ✅ Verify the `broadcastId` is correct from Topix99 API
- ✅ The game will retry chat connection on next restart (every 5 minutes)

**Note:** The game can function without chat - users just won't be able to submit guesses via YouTube chat. Test mode still works for development.

### 2. PM2 Version Mismatch

**Symptoms:**
```
>>>> In-memory PM2 is out-of-date, do:
>>>> $ pm2 update
In memory PM2 version: 5.4.3
Local PM2 version: 6.0.14
```

**Solution:**
```bash
pm2 update
```

This updates the in-memory PM2 daemon to match the local version.

### 3. Game Running but No Participants

**Symptoms:**
```
[game] Winner calculation: target=8, participants=0, winners found=0
[game] No winners this round (winning number: 8)
```

**Causes:**
- Chat is not working (see issue #1)
- No users are submitting guesses
- Guesses are not being processed

**Solutions:**
- Check chat errors in logs
- Verify chat is enabled and stream is live
- Test with test mode: `npm run luckywheel:test`
- Check that guesses are valid numbers on the wheel

### 4. FFmpeg Errors

**Symptoms:**
```
[live] FFmpeg process exited with code X
[live] FFmpeg pipe error (EPIPE)
```

**Causes:**
- FFmpeg not installed
- RTMP URL invalid or expired
- Network connectivity issues
- YouTube stream key invalid

**Solutions:**
- Verify FFmpeg is installed: `ffmpeg -version`
- Check RTMP URL is valid and not expired
- Verify network connectivity
- Check YouTube stream is active

### 5. Redis Connection Errors

**Symptoms:**
```
[state] Redis Load Error: ...
Redis connection failed
```

**Solutions:**
- Verify Redis is running: `redis-cli ping`
- Check Redis connection settings
- Verify `REDIS_URL` or default connection is correct
- Check Redis server is accessible

## Log Analysis

### Normal Operation
```
[game] Round X started - waiting for guesses
[game] Wheel spinning...
[game] Winner calculation: target=Y, participants=Z, winners found=W
[game] Winner: Username (guess: Y, actual: Y, score: S)
```

### Chat Issues (Non-Fatal)
```
[ytchat] Chat container not found - live chat may not be available
```
✅ Game continues running, just without chat input

### Critical Errors
```
[game] Failed to start new round
[live] FFmpeg process exited
```
❌ These require immediate attention

## Getting Help

1. Check logs: `npm run pm2:logs`
2. Check error logs: `npm run pm2:logs` (look for err.log)
3. Test mode: `npm run luckywheel:test` (isolates issues)
4. Check environment variables are set correctly
5. Verify all dependencies are installed

## Health Check

The server provides a health endpoint:
```bash
curl http://localhost:4001/health
```

Response:
```json
{
  "status": "ok",
  "mode": "luckywheel",
  "uptime": 12345,
  "games": ["luckywheel"]
}
```
