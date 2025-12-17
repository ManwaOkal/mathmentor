# How to Add Students to a Classroom

## Overview

Students join classrooms using a **join code** that teachers can share. Each classroom has a unique 6-character join code (e.g., `ABC123`).

## Method 1: Students Join via Student Portal (Recommended)

### Step 1: Teacher Gets the Join Code

1. Go to `http://localhost:3000/teacher`
2. Select a classroom from the sidebar
3. The join code is displayed in the header (top right)
4. Click the join code to copy it to clipboard
5. Share this code with students

### Step 2: Student Joins the Classroom

1. **Student signs in**:
   - Go to `http://localhost:3000`
   - Click "Sign In" or "Sign Up"
   - Enter email/password (creates a UUID-based user_id)

2. **Student goes to student portal**:
   - Navigate to `http://localhost:3000/student`

3. **Student enters join code**:
   - Click "Join a Classroom" button
   - Enter the 6-character join code (e.g., `ABC123`)
   - Click "Join Classroom"
   - Success! Student is now enrolled

### Step 3: Verify Enrollment

**Teacher view**:
- Go to `http://localhost:3000/teacher`
- Select the classroom
- Check analytics/students section (when implemented)

**Student view**:
- Go to `http://localhost:3000/student`
- Should see the classroom in the list

## Method 2: Via API (For Testing)

### Using curl:

```bash
# Student needs to be logged in first (get user_id from localStorage)
# In browser console: localStorage.getItem('user_id')

curl -X POST "http://localhost:8000/api/student/classrooms/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_USER_ID" \
  -d '{"join_code": "ABC123"}'
```

### Using JavaScript:

```javascript
// In browser console (on student portal):
const joinCode = "ABC123" // Get from teacher
const userId = localStorage.getItem('user_id')

const response = await fetch('http://localhost:8000/api/student/classrooms/join', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userId}`
  },
  body: JSON.stringify({ join_code: joinCode })
})

const result = await response.json()
console.log(result)
```

## Method 3: Direct Database Insert (Advanced)

⚠️ **Only for development/testing**

```sql
-- In Supabase SQL Editor:
INSERT INTO public.student_enrollments (classroom_id, student_id)
VALUES (
  'CLASSROOM_UUID_HERE',
  'STUDENT_UUID_HERE'
);
```

## Components Created

### Frontend:
- ✅ `frontend/components/student/JoinClassroom.tsx` - Join classroom UI
- ✅ `frontend/app/student/page.tsx` - Updated student dashboard

### Backend:
- ✅ `POST /api/student/classrooms/join` - Join endpoint
- ✅ `GET /api/student/classrooms` - List enrolled classrooms

## Features

### For Teachers:
- ✅ View join code in classroom header
- ✅ Copy join code to clipboard
- ✅ Share join code with students

### For Students:
- ✅ Join classroom with join code
- ✅ View enrolled classrooms
- ✅ See classroom details
- ✅ Paste join code from clipboard

## Troubleshooting

### "Invalid join code"
- **Cause**: Join code doesn't exist or is incorrect
- **Fix**: 
  - Check join code is correct (case-insensitive)
  - Verify classroom exists
  - Make sure you're using the right code

### "Already enrolled"
- **Cause**: Student is already in the classroom
- **Fix**: This is normal - student is already enrolled

### "Please log in first"
- **Cause**: Student not logged in
- **Fix**: 
  - Go to home page (`/`)
  - Sign in or sign up
  - Then try joining again

### "User not found in database"
- **Cause**: Student UUID doesn't exist in `auth.users`
- **Fix**: 
  - Run migration `004_fix_teacher_user_creation.sql` (also works for students)
  - Or create user manually in Supabase Auth

## Testing Flow

1. **Teacher creates classroom**:
   ```
   Teacher → /teacher → Create Classroom → Get Join Code: ABC123
   ```

2. **Student signs in**:
   ```
   Student → / → Sign In → Gets UUID user_id
   ```

3. **Student joins**:
   ```
   Student → /student → Join Classroom → Enter ABC123 → Success!
   ```

4. **Verify**:
   ```
   Student → /student → See classroom in list
   Teacher → /teacher → See student in analytics (when implemented)
   ```

## Next Steps

After students join:
- ⏳ Assign activities to students
- ⏳ Students complete activities
- ⏳ View student progress in teacher dashboard
- ⏳ Generate reports

## API Reference

### Join Classroom
```http
POST /api/student/classrooms/join
Authorization: Bearer {student_user_id}
Content-Type: application/json

{
  "join_code": "ABC123"
}
```

**Response**:
```json
{
  "message": "Successfully joined classroom",
  "classroom_id": "uuid-here",
  "classroom_name": "Math 101"
}
```

### Get Student Classrooms
```http
GET /api/student/classrooms
Authorization: Bearer {student_user_id}
```

**Response**:
```json
[
  {
    "enrollment_id": "uuid",
    "classroom_id": "uuid",
    "student_id": "uuid",
    "enrolled_at": "2024-...",
    "classrooms": {
      "classroom_id": "uuid",
      "name": "Math 101",
      "description": "...",
      "join_code": "ABC123"
    }
  }
]
```











