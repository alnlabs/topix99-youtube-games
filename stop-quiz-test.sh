#!/bin/bash
# Script to stop quiz test process on port 5002

echo "=== Stopping Quiz Test Process ==="
echo ""

# Find process on port 5002
PID=$(lsof -ti :5002 2>/dev/null)

if [ -z "$PID" ]; then
  echo "✅ No process found on port 5002"
  echo "Port is free!"
else
  echo "Found process PID: $PID"
  echo "Stopping process..."
  kill $PID 2>/dev/null

  # Wait a bit
  sleep 1

  # Check if still running
  if lsof -ti :5002 >/dev/null 2>&1; then
    echo "⚠️  Process still running, force killing..."
    kill -9 $PID 2>/dev/null
    sleep 1
  fi

  if lsof -ti :5002 >/dev/null 2>&1; then
    echo "❌ Failed to stop process"
  else
    echo "✅ Process stopped successfully"
    echo "Port 5002 is now free"
  fi
fi

echo ""
echo "You can now run: npm run quiz:test"
