#!/bin/bash
# Quick start script for MathMentor API server

echo "🚀 Starting MathMentor API Server..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Create .env file with your Supabase and OpenAI credentials"
    echo "   See .env.example for reference"
    echo ""
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Start server
echo ""
echo "✅ Starting FastAPI server..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 \
  --reload-dir api \
  --reload-dir lib \
  --reload-dir tutoring \
  --reload-dir rag_engine \
  --reload-dir data_processing \
  --reload-exclude "venv/*" \
  --reload-exclude "*.pyc" \
  --reload-exclude "__pycache__/*" \
  --reload-exclude "node_modules/*" \
  --reload-exclude "frontend/*"
