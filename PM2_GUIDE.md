# PM2 Background Process Guide

This guide explains how to run the Topix99 YouTube Games application in the background using PM2.

## Prerequisites

Install PM2 globally:
```bash
npm install -g pm2
```

## Quick Start

### Start Live Server (Production)
```bash
npm run pm2:start
```

### Start Test Server
```bash
npm run pm2:start:test
```

## Available Commands

### Start/Stop
- `npm run pm2:start` - Start live server in background
- `npm run pm2:start:test` - Start test server in background
- `npm run pm2:stop` - Stop live server
- `npm run pm2:stop:test` - Stop test server
- `npm run pm2:restart` - Restart live server
- `npm run pm2:restart:test` - Restart test server

### Management
- `npm run pm2:status` - View status of all PM2 processes
- `npm run pm2:logs` - View logs for live server
- `npm run pm2:logs:test` - View logs for test server
- `npm run pm2:delete` - Delete live server from PM2
- `npm run pm2:delete:test` - Delete test server from PM2

### Persistence
- `npm run pm2:save` - Save current PM2 process list
- `npm run pm2:startup` - Generate startup script (run once, then follow instructions)

## Direct PM2 Commands

You can also use PM2 directly:

```bash
# Start
pm2 start ecosystem.config.js --only topix99-luckywheel

# Stop
pm2 stop topix99-luckywheel

# Restart
pm2 restart topix99-luckywheel

# View logs
pm2 logs topix99-luckywheel

# View status
pm2 status

# Monitor (real-time)
pm2 monit

# Delete
pm2 delete topix99-luckywheel
```

## Logs

Logs are stored in the `logs/` directory:
- `logs/out.log` - Standard output
- `logs/err.log` - Error output
- `logs/combined.log` - Combined logs

## Auto-Start on System Boot

1. Generate startup script:
```bash
npm run pm2:startup
```

2. Follow the instructions shown (usually requires running a sudo command)

3. Save your PM2 process list:
```bash
npm run pm2:save
```

Now your application will automatically start when the system reboots.

## Environment Variables

Edit `ecosystem.config.js` to add environment variables:

```javascript
env: {
  NODE_ENV: 'production',
  MODE: 'luckywheel',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  TOPIX99_API_TOKEN: 'your-token-here'
}
```

## Monitoring

### View Real-time Monitoring
```bash
pm2 monit
```

### View Detailed Info
```bash
pm2 show topix99-luckywheel
```

### View Memory Usage
```bash
pm2 list
```

## Troubleshooting

### Process won't start
- Check logs: `pm2 logs topix99-luckywheel`
- Verify environment variables are set
- Ensure Redis is running
- Check if port is already in use

### Process keeps restarting
- Check error logs: `pm2 logs topix99-luckywheel --err`
- Verify all dependencies are installed
- Check system resources (memory, CPU)

### View all logs
```bash
pm2 logs --lines 100
```

### Clear logs
```bash
pm2 flush
```

## Notes

- PM2 will automatically restart the process if it crashes
- Memory limit is set to 1GB (adjust in ecosystem.config.js if needed)
- Logs are rotated automatically by PM2
- Use `pm2 save` after making changes to persist them
