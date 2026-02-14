#!/bin/bash
# Script to find running quiz processes

echo "=== Searching for Quiz/Node processes ==="
echo ""

echo "1. Node processes related to quiz:"
ps aux | grep -E "node.*quiz|node.*server.js" | grep -v grep

echo ""
echo "2. Processes using common quiz ports (3000, 3001, etc):"
lsof -i :3000 -i :3001 -i :3002 2>/dev/null || echo "No processes found on ports 3000-3002"

echo ""
echo "3. All node processes:"
ps aux | grep node | grep -v grep

echo ""
echo "4. Check if running in background jobs:"
jobs

echo ""
echo "=== To stop a process, use: ==="
echo "kill <PID>"
echo "or"
echo "kill -9 <PID> (force kill)"
