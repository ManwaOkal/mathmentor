# Debugging 500 Error on Classroom Creation

## Error
```
POST /api/teacher/classrooms HTTP/1.1" 500 Internal Server Error
```

## Improved Error Handling

I've updated the backend to provide better error messages. The error handling now:

1. **Validates UUID format** - Checks if user_id is a valid UUID before making the request
2. **Checks for missing RPC function** - Detects if the database function doesn't exist
3. **Shows detailed error messages** - Includes traceback for debugging

## Common Causes & Solutions

### 1. Invalid UUID Format
**Error**: `Invalid user_id format. Expected UUID, got: 1764620706177`

**Solution**:
```javascript
// In browser console:
localStorage.clear()
// Then refresh and sign in again
```

### 2. RPC Function Doesn't Exist
**Error**: `Database function 'create_classroom' not found`

**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration: Copy and paste `supabase/migrations/003_teacher_student_platform.sql`
3. Verify function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'create_classroom';
   ```

### 3. User ID Doesn't Exist in auth.users
**Error**: `foreign key constraint` or `invalid input syntax for type uuid`

**Solution**:
The user_id needs to exist in `auth.users` table. For development:
- Either create a user in Supabase Auth
- Or modify the RPC function to not require the foreign key (development only)

### 4. Missing Helper Function
**Error**: `function generate_join_code() does not exist`

**Solution**:
Make sure the migration includes the `generate_join_code()` function.

## Quick Test

### Test the RPC function directly in Supabase:

```sql
-- Test if function exists
SELECT create_classroom(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'Test Classroom',
    'Test Description'
);
```

### Test via API with curl:

```bash
# Get your UUID from localStorage first
# In browser console: localStorage.getItem('user_id')

curl -X POST "http://localhost:8000/api/teacher/classrooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_UUID_HERE" \
  -d '{"name": "Test Classroom", "description": "Test"}'
```

## Check Backend Logs

Look at the terminal where your backend is running. The improved error handling will show:
- The actual error message
- Full traceback
- What went wrong

## Next Steps

1. **Check the backend terminal** for the detailed error message
2. **Verify migration is applied** in Supabase
3. **Clear localStorage** if UUID format is wrong
4. **Check Supabase logs** for database errors

The improved error messages should now tell you exactly what's wrong!











