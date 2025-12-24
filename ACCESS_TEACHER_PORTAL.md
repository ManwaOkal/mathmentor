# How to Access the Teacher Portal

## Quick Access

**URL**: `http://localhost:3000/teacher`

## Prerequisites

Before accessing the teacher portal, make sure:

1. ✅ **Backend API is running** (port 8000)
2. ✅ **Frontend is running** (port 3000)
3. ✅ **Supabase Storage bucket is set up** (see `STORAGE_SETUP.md`)
4. ✅ **Environment variables are configured**

## Step-by-Step Setup

### 1. Start the Backend API

```bash
# Navigate to project root
cd /Users/okal/Desktop/mathmentor

# Activate virtual environment (if using one)
source venv/bin/activate

# Start FastAPI server
uvicorn api.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Start the Frontend

Open a **new terminal**:

```bash
# Navigate to frontend directory
cd /Users/okal/Desktop/mathmentor/frontend

# Install dependencies (if not already done)
npm install

# Start Next.js dev server
npm run dev
```

You should see:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

### 3. Access the Teacher Portal

Open your browser and go to:
```
http://localhost:3000/teacher
```

## Current Authentication Status

⚠️ **Note**: Authentication is currently **not enforced** (commented out in code). This means:
- Anyone can access `/teacher` route
- The API uses a simplified auth (Bearer token with user ID)
- In production, you'll need to implement proper Supabase Auth

### Testing Authentication

For now, the API expects an `Authorization` header:
```
Authorization: Bearer YOUR_USER_ID
```

The frontend API client (`frontend/lib/api.ts`) gets the user ID from `localStorage.getItem('user_id')`.

## What You'll See

The teacher portal includes:

1. **Classroom Sidebar** - List of your classrooms
2. **Document Upload** - Upload PDF/DOCX/TXT files
3. **Analytics Dashboard** - View student performance

### First Time Setup

1. **Create a Classroom**:
   - The sidebar will be empty initially
   - You'll need to create a classroom via API or add UI for it
   - Use: `POST /api/teacher/classrooms`

2. **Select a Classroom**:
   - Click on a classroom in the sidebar
   - This activates the document upload and analytics tabs

3. **Upload Documents**:
   - Click "Documents" tab
   - Upload a PDF, DOCX, or TXT file
   - Files are stored in Supabase Storage

## API Endpoints Available

### Teacher Endpoints:
- `POST /api/teacher/classrooms` - Create classroom
- `GET /api/teacher/classrooms` - List classrooms
- `POST /api/teacher/documents/upload` - Upload document
- `GET /api/teacher/documents/{classroom_id}` - Get documents
- `GET /api/teacher/analytics/{classroom_id}` - Get analytics
- `POST /api/teacher/activities/generate` - Generate activities

### Testing with curl:

```bash
# Create a classroom
curl -X POST "http://localhost:8000/api/teacher/classrooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -d '{"name": "Math 101", "description": "Introduction to Math"}'

# Upload a document
curl -X POST "http://localhost:8000/api/teacher/documents/upload" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -F "file=@test.pdf" \
  -F 'metadata={"classroom_id":"CLASSROOM_ID","title":"Test Document","generate_activities":true}'
```

## Troubleshooting

### Port Already in Use
```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

### Frontend Not Loading
- Check if backend is running on port 8000
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:8000`)

### API Errors
- Check backend terminal for error messages
- Verify environment variables are set
- Check Supabase connection

### Storage Errors
- Verify Supabase Storage bucket exists (name: `documents`)
- Check `SUPABASE_STORAGE_BUCKET` env variable
- See `STORAGE_SETUP.md` for setup instructions

## Next Steps

1. ✅ Access teacher portal at `/teacher`
2. ⏳ Create classroom management UI (currently need to use API)
3. ⏳ Implement proper authentication with Supabase Auth
4. ⏳ Add document processing (PDF/DOCX extraction)
5. ⏳ Generate activities from documents

## Quick Reference

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:8000 | 8000 |
| API Docs | http://localhost:8000/docs | 8000 |
| Teacher Portal | http://localhost:3000/teacher | 3000 |
| Student Portal | http://localhost:3000/student | 3000 |

---

**Need Help?** Check:
- `STORAGE_SETUP.md` - Storage configuration
- `FILE_STORAGE_IMPLEMENTATION.md` - Implementation details
- `PROGRESS_SUMMARY.md` - Overall progress














