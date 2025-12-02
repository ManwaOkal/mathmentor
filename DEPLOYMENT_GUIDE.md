# MathMentor Deployment Guide

Complete guide for deploying MathMentor to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Variables](#environment-variables)
4. [Deployment Options](#deployment-options)
   - [Option 1: Vercel (Frontend) + Railway (Backend)](#option-1-vercel-frontend--railway-backend)
   - [Option 2: Vercel (Frontend) + Render (Backend)](#option-2-vercel-frontend--render-backend)
   - [Option 3: Full Vercel Deployment](#option-3-full-vercel-deployment)
   - [Option 4: Docker Deployment](#option-4-docker-deployment)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account and repository
- ✅ Supabase project set up
- ✅ OpenAI API key
- ✅ Domain name (optional, but recommended)

---

## Architecture Overview

```
┌─────────────────┐
│   Next.js App   │  → Frontend (Port 3000)
│    (Vercel)     │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│  FastAPI Backend│  → API Server (Port 8000)
│  (Railway/Render)│
└────────┬────────┘
         │
         │
┌────────▼────────┐
│    Supabase     │  → Database & Auth
│   (Cloud)       │
└─────────────────┘
```

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo

# Server Configuration (optional)
PORT=8000
HOST=0.0.0.0
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important:** 
- Never commit `.env` or `.env.local` files to git
- Use environment variable settings in your hosting platform
- `NEXT_PUBLIC_*` variables are exposed to the browser

---

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### Step 1: Deploy Backend to Railway

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your MathMentor repository

3. **Configure Backend Service**
   - Railway will auto-detect Python
   - Set the **Root Directory** to `/` (root)
   - Set **Start Command**: `python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - Railway automatically sets `$PORT` environment variable

4. **Set Environment Variables**
   - Go to "Variables" tab
   - Add all backend environment variables:
     ```
     SUPABASE_URL=...
     SUPABASE_SERVICE_ROLE_KEY=...
     SUPABASE_ANON_KEY=...
     OPENAI_API_KEY=...
     OPENAI_MODEL=gpt-4
     ```

5. **Deploy**
   - Railway will automatically deploy
   - Copy the generated domain (e.g., `your-app.railway.app`)

6. **Get Backend URL**
   - Railway provides a public URL
   - Use this for `NEXT_PUBLIC_API_URL`

#### Step 2: Deploy Frontend to Vercel

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as the root directory

3. **Configure Build Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. **Set Environment Variables**
   - Go to "Environment Variables"
   - Add:
     ```
     NEXT_PUBLIC_API_URL=https://your-app.railway.app
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - You'll get a URL like `your-app.vercel.app`

#### Step 3: Update CORS Settings

Update `api/main.py` to allow your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy the backend after this change.

---

### Option 2: Vercel (Frontend) + Render (Backend)

#### Step 1: Deploy Backend to Render

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name**: `mathmentor-api`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or paid for better performance)

4. **Set Environment Variables**
   - Add all backend environment variables in the dashboard

5. **Deploy**
   - Render will build and deploy
   - Get your backend URL (e.g., `mathmentor-api.onrender.com`)

#### Step 2: Deploy Frontend to Vercel

Follow the same steps as Option 1, Step 2, but use your Render backend URL.

---

### Option 3: Full Vercel Deployment

Vercel supports both frontend and serverless functions. You can deploy the backend as Vercel serverless functions.

#### Step 1: Create Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/main.py",
      "use": "@vercel/python"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/main.py"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

#### Step 2: Deploy to Vercel

1. Import project to Vercel
2. Set all environment variables
3. Deploy

**Note:** This approach requires converting FastAPI routes to Vercel serverless functions, which may need code modifications.

---

### Option 4: Docker Deployment

#### Step 1: Create Dockerfile for Backend

Create `Dockerfile` in the root:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Step 2: Create Dockerfile for Frontend

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

#### Step 3: Create docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    env_file:
      - .env

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      - backend
```

#### Step 4: Deploy

Deploy to any Docker-compatible platform:
- **DigitalOcean App Platform**
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **Fly.io**

---

## Post-Deployment Checklist

### ✅ Backend Verification

- [ ] Backend health check: `GET https://your-api.com/`
- [ ] API docs accessible: `https://your-api.com/docs`
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Database migrations applied (if needed)

### ✅ Frontend Verification

- [ ] Frontend loads at production URL
- [ ] API calls work (check browser console)
- [ ] Authentication works (Supabase auth)
- [ ] Environment variables set correctly
- [ ] Build completed without errors

### ✅ Database Setup

- [ ] Supabase migrations applied
- [ ] RLS policies configured
- [ ] Storage buckets created (if using file uploads)
- [ ] Database indexes created

### ✅ Security

- [ ] `.env` files not committed to git
- [ ] CORS restricted to production domains
- [ ] API keys secured (not exposed in frontend)
- [ ] HTTPS enabled on all services

---

## Troubleshooting

### Backend Issues

**Problem: Backend won't start**
- Check environment variables are set
- Verify Python version (3.12+)
- Check logs for import errors

**Problem: CORS errors**
- Update `allow_origins` in `api/main.py`
- Ensure frontend URL is included
- Redeploy backend

**Problem: Database connection fails**
- Verify Supabase credentials
- Check network connectivity
- Verify RLS policies allow access

### Frontend Issues

**Problem: API calls fail**
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running
- Check browser console for CORS errors

**Problem: Build fails**
- Check Node.js version (20+)
- Clear `.next` folder and rebuild
- Check for TypeScript errors

**Problem: Environment variables not working**
- Ensure `NEXT_PUBLIC_*` prefix for client-side vars
- Rebuild after adding new variables
- Check variable names match exactly

### Database Issues

**Problem: Migrations not applied**
- Run migrations manually in Supabase SQL editor
- Check migration files in `supabase/migrations/`
- Verify service role key has permissions

---

## Quick Reference

### Backend Commands

```bash
# Local development
python -m uvicorn api.main:app --reload

# Production
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Frontend Commands

```bash
# Development
cd frontend && npm run dev

# Production build
cd frontend && npm run build && npm start
```

### Environment Variable Checklist

**Backend:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

**Frontend:**
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Support

If you encounter issues:

1. Check the logs in your hosting platform
2. Verify all environment variables
3. Test locally first
4. Check Supabase dashboard for database issues
5. Review CORS and security settings

---

## Next Steps

After deployment:

1. Set up custom domain (optional)
2. Configure SSL certificates (usually automatic)
3. Set up monitoring and alerts
4. Configure backups for Supabase
5. Set up CI/CD for automatic deployments

Good luck with your deployment! 🚀

