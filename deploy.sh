#!/bin/bash

# MathMentor Deployment Helper Script
# This script helps verify your deployment setup

set -e

echo "🚀 MathMentor Deployment Checklist"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
check_env_file() {
    echo "📋 Checking environment files..."
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ .env file exists${NC}"
    else
        echo -e "${YELLOW}⚠️  .env file not found (create it for local development)${NC}"
    fi
    
    if [ -f "frontend/.env.local" ]; then
        echo -e "${GREEN}✅ frontend/.env.local exists${NC}"
    else
        echo -e "${YELLOW}⚠️  frontend/.env.local not found (create it for local development)${NC}"
    fi
    echo ""
}

# Check required environment variables
check_env_vars() {
    echo "🔍 Checking required environment variables..."
    
    REQUIRED_VARS=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_ANON_KEY"
        "OPENAI_API_KEY"
    )
    
    MISSING=0
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env 2>/dev/null; then
            echo -e "${GREEN}✅ ${var}${NC}"
        else
            echo -e "${RED}❌ ${var} missing${NC}"
            MISSING=$((MISSING + 1))
        fi
    done
    
    if [ $MISSING -gt 0 ]; then
        echo -e "\n${RED}⚠️  Missing ${MISSING} required environment variable(s)${NC}"
        echo "   Make sure to set these in your hosting platform!"
    fi
    echo ""
}

# Check Python version
check_python() {
    echo "🐍 Checking Python installation..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        echo -e "${GREEN}✅ Python ${PYTHON_VERSION} installed${NC}"
        
        # Check if version is 3.12+
        MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 12 ]; then
            echo -e "${GREEN}✅ Python version is compatible${NC}"
        else
            echo -e "${YELLOW}⚠️  Python 3.12+ recommended${NC}"
        fi
    else
        echo -e "${RED}❌ Python 3 not found${NC}"
    fi
    echo ""
}

# Check Node.js version
check_node() {
    echo "📦 Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        echo -e "${GREEN}✅ Node.js ${NODE_VERSION} installed${NC}"
        
        # Check if version is 20+
        MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR" -ge 20 ]; then
            echo -e "${GREEN}✅ Node.js version is compatible${NC}"
        else
            echo -e "${YELLOW}⚠️  Node.js 20+ recommended${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js not found${NC}"
    fi
    echo ""
}

# Check dependencies
check_dependencies() {
    echo "📚 Checking dependencies..."
    
    # Backend
    if [ -f "requirements.txt" ]; then
        echo -e "${GREEN}✅ requirements.txt exists${NC}"
        if [ -d "venv" ]; then
            echo -e "${GREEN}✅ Virtual environment exists${NC}"
        else
            echo -e "${YELLOW}⚠️  Virtual environment not found (run: python3 -m venv venv)${NC}"
        fi
    fi
    
    # Frontend
    if [ -f "frontend/package.json" ]; then
        echo -e "${GREEN}✅ frontend/package.json exists${NC}"
        if [ -d "frontend/node_modules" ]; then
            echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend dependencies not installed (run: cd frontend && npm install)${NC}"
        fi
    fi
    echo ""
}

# Check git status
check_git() {
    echo "� Git status..."
    if [ -d ".git" ]; then
        if git diff --quiet HEAD 2>/dev/null; then
            echo -e "${GREEN}✅ Working directory is clean${NC}"
        else
            echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
            echo "   Consider committing before deploying"
        fi
        
        # Check if .env is in .gitignore
        if grep -q "^\.env$" .gitignore 2>/dev/null; then
            echo -e "${GREEN}✅ .env is in .gitignore${NC}"
        else
            echo -e "${RED}⚠️  .env should be in .gitignore${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    fi
    echo ""
}

# Main execution
main() {
    check_env_file
    check_env_vars
    check_python
    check_node
    check_dependencies
    check_git
    
    echo "===================================="
    echo "📖 Next steps:"
    echo "1. Review DEPLOYMENT_GUIDE.md for detailed instructions"
    echo "2. Set environment variables in your hosting platform"
    echo "3. Deploy backend first, then frontend"
    echo "4. Update CORS settings with your frontend URL"
    echo ""
    echo "Good luck! 🚀"
}

main

