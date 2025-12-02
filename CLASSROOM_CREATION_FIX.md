# Classroom Creation Fix

## Issue Fixed ✅

The classroom creation functionality was not working because the API calls were commented out in `TeacherLayout.tsx`.

## What Was Fixed

1. **Uncommented API calls** in `TeacherLayout.tsx`:
   - `loadClassrooms()` - Now actually fetches classrooms from API
   - `handleClassroomCreate()` - Now actually creates classrooms via API

2. **Added error handling**:
   - Checks if user is logged in
   - Shows helpful error messages
   - Reloads classrooms after creation

## How to Use

### Step 1: Make Sure You're Logged In

1. Go to the home page: `http://localhost:3000`
2. Click "Sign In" or "Sign Up" in the top right
3. Enter any email/password (authentication is simplified for now)
4. This sets `user_id` in localStorage

### Step 2: Access Teacher Portal

1. Navigate to: `http://localhost:3000/teacher`
2. You should see the classroom sidebar

### Step 3: Create a Classroom

1. Click "New Classroom" button in the sidebar
2. Enter a classroom name (required)
3. Optionally add a description
4. Click "Create"
5. The classroom should appear in the sidebar

## Troubleshooting

### "Please log in first"
- **Solution**: Go to home page (`/`) and sign in first

### "Failed to create classroom"
Check:

1. **Backend is running**:
   ```bash
   # Should see: Uvicorn running on http://127.0.0.1:8000
   uvicorn api.main:app --reload --port 8000
   ```

2. **Database migration applied**:
   - Go to Supabase Dashboard → SQL Editor
   - Run migration: `supabase/migrations/003_teacher_student_platform.sql`
   - Verify `create_classroom` function exists

3. **Check browser console**:
   - Open DevTools (F12)
   - Look for error messages
   - Check Network tab for API request/response

4. **Check backend logs**:
   - Look at terminal where backend is running
   - Check for error messages

### Common Errors

#### "Authentication required"
- **Cause**: Not logged in or `user_id` missing from localStorage
- **Fix**: Sign in on home page

#### "Failed to create classroom" (500 error)
- **Cause**: Database function doesn't exist or RPC call failed
- **Fix**: 
  1. Verify migration `003_teacher_student_platform.sql` is applied
  2. Check Supabase logs for RPC errors
  3. Verify `create_classroom` function exists in database

#### "Failed to fetch"
- **Cause**: Backend not running or CORS issue
- **Fix**: 
  1. Start backend: `uvicorn api.main:app --reload --port 8000`
  2. Check `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:8000`)

## Testing

### Test via API directly:

```bash
# First, get your user_id from localStorage (in browser console):
# localStorage.getItem('user_id')

# Then test API:
curl -X POST "http://localhost:8000/api/teacher/classrooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -d '{"name": "Test Classroom", "description": "Test description"}'
```

Expected response:
```json
{
  "classroom_id": "uuid-here",
  "teacher_id": "your-user-id",
  "name": "Test Classroom",
  "description": "Test description",
  "join_code": "ABC123",
  "created_at": "2024-..."
}
```

## Files Changed

- `frontend/components/teacher/TeacherLayout.tsx` - Fixed API calls

## Next Steps

1. ✅ Classroom creation now works
2. ⏳ Implement proper Supabase Auth (replace localStorage auth)
3. ⏳ Add loading states during creation
4. ⏳ Add success notifications






