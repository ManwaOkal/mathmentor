#!/bin/bash
# Kill all MathMentor server processes

echo "🧹 Killing all server processes..."

# Kill uvicorn processes
pkill -9 -f "uvicorn" 2>/dev/null

# Kill any Python processes running api.main
ps aux | grep -E "[p]ython.*api.main" | awk '{print $2}' | xargs kill -9 2>/dev/null

# Kill anything using port 8000
lsof -ti :8000 | xargs kill -9 2>/dev/null

sleep 1

# Verify
if ps aux | grep -E "[u]vicorn|[p]ython.*api.main" > /dev/null; then
    echo "⚠️  Some processes may still be running"
    ps aux | grep -E "[u]vicorn|[p]ython.*api.main"
else
    echo "✅ All server processes killed"
fi

if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is still in use"
    lsof -i :8000
else
    echo "✅ Port 8000 is free"
fi
