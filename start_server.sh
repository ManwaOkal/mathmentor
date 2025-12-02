#!/bin/bash
# Clean server startup script

echo "🧹 Cleaning up old processes..."
pkill -f "uvicorn api.main:app" 2>/dev/null
sleep 1

echo "🚀 Starting MathMentor API Server..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start server
echo "✅ Server starting on http://127.0.0.1:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000 \
  --reload-exclude "venv/*" \
  --reload-exclude "*.pyc" \
  --reload-exclude "__pycache__/*" \
  --reload-exclude "node_modules/*" \
  --reload-exclude "frontend/*" \
  --reload-dir api \
  --reload-dir lib \
  --reload-dir tutoring \
  --reload-dir rag_engine \
  --reload-dir data_processing
