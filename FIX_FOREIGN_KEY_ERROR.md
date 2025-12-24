# Fix Foreign Key Constraint Error

## Problem

```
'insert or update on table "classrooms" violates foreign key constraint "classrooms_teacher_id_fkey"'
'Key (teacher_id)=(2fb54ff1-16f3-479e-812a-1fed249927cb) is not present in table "users".'
```

The UUID generated on the frontend doesn't exist in `auth.users` table, causing a foreign key constraint violation.

## Solution

I've created a new migration (`004_fix_teacher_user_creation.sql`) that:

1. **Creates a helper function** `ensure_user_exists()` that automatically creates a user in `auth.users` if they don't exist
2. **Updates the `create_classroom` function** to call `ensure_user_exists()` before creating the classroom

## How to Apply

### Step 1: Run the New Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase/migrations/004_fix_teacher_user_creation.sql`
3. Copy and paste the entire contents
4. Click **Run**

### Step 2: Verify It Works

1. Go to `http://localhost:3000`
2. Make sure you're signed in (clear localStorage if needed)
3. Go to `http://localhost:3000/teacher`
4. Try creating a classroom - it should work now! ✅

## What the Migration Does

The migration creates two functions:

1. **`ensure_user_exists(p_user_id UUID, p_email TEXT)`**
   - Checks if user exists in `auth.users`
   - If not, creates the user automatically
   - Returns `TRUE` if user was created, `FALSE` if already existed

2. **Updated `create_classroom()`**
   - Calls `ensure_user_exists()` before creating classroom
   - This ensures the user exists before the foreign key constraint is checked

## Alternative: Manual User Creation

If you prefer to create users manually:

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"**
3. Use the UUID from localStorage as the User ID:
   ```javascript
   // In browser console:
   localStorage.getItem('user_id')
   ```
4. Fill in email and password
5. Click **"Create User"**

## Testing

After applying the migration, test with:

```bash
# Test via API
curl -X POST "http://localhost:8000/api/teacher/classrooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_UUID_HERE" \
  -d '{"name": "Test Classroom", "description": "Test"}'
```

Should return:
```json
{
  "classroom_id": "uuid-here",
  "teacher_id": "your-uuid",
  "name": "Test Classroom",
  "description": "Test",
  "join_code": "ABC123",
  "created_at": "2024-..."
}
```

## Important Notes

⚠️ **This is a development solution**. In production:
- Use proper Supabase Auth for user creation
- Users should sign up through Supabase Auth, not localStorage
- The `ensure_user_exists` function should be removed or secured

## Files Created

- `supabase/migrations/004_fix_teacher_user_creation.sql` - New migration
- `FIX_FOREIGN_KEY_ERROR.md` - This file

## Next Steps

1. ✅ Run migration `004_fix_teacher_user_creation.sql`
2. ✅ Try creating a classroom
3. ⏳ Later: Implement proper Supabase Auth integration














