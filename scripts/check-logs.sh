#!/bin/bash
# Check PM2 logs and status

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Last 30 lines of Error Log ==="
if [ -f logs/err.log ]; then
  tail -30 logs/err.log
else
  echo "Error log file not found"
fi

echo ""
echo "=== Last 30 lines of Output Log ==="
if [ -f logs/out.log ]; then
  tail -30 logs/out.log
else
  echo "Output log file not found"
fi

echo ""
echo "=== PM2 Process Info ==="
pm2 describe topix99-luckywheel 2>&1 | head -30
