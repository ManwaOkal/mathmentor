#!/bin/bash
# Run both backend and frontend development servers

echo "🚀 Starting MathMentor Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}📡 Starting Backend Server...${NC}"
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
fi

# Start backend in background
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
  --reload-exclude "frontend/*" > /tmp/mathmentor_backend.log 2>&1 &

BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""

# Wait a bit for backend to start
sleep 2

# Start frontend server
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev > /tmp/mathmentor_frontend.log 2>&1 &

FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   App: http://localhost:3000"
echo ""

echo -e "${GREEN}🎉 Both servers are running!${NC}"
echo ""
echo "Backend logs: tail -f /tmp/mathmentor_backend.log"
echo "Frontend logs: tail -f /tmp/mathmentor_frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

