# UUID Format Fix

## Problem

The error `invalid input syntax for type uuid: "1764620706177"` occurred because:
- The database expects a UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- The code was generating a timestamp string (e.g., `1764620706177`)
- PostgreSQL cannot convert a numeric string to UUID

## Solution

Updated `handleLogin` and `handleSignup` functions in `frontend/app/page.tsx` to generate proper UUID v4 format instead of timestamps.

## What Changed

**Before:**
```typescript
const userData = { email, id: Date.now().toString() }  // ❌ Generates "1764620706177"
```

**After:**
```typescript
const generateUUID = () => {
  // Use browser's crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
const userData = { email, id: generateUUID() }  // ✅ Generates "550e8400-e29b-41d4-a716-446655440000"
```

## How to Test

1. **Clear existing localStorage** (if you have old timestamp-based user_id):
   ```javascript
   // In browser console:
   localStorage.clear()
   ```

2. **Sign in again**:
   - Go to `http://localhost:3000`
   - Click "Sign In" or "Sign Up"
   - Enter email/password

3. **Verify UUID format**:
   ```javascript
   // In browser console:
   localStorage.getItem('user_id')
   // Should return something like: "550e8400-e29b-41d4-a716-446655440000"
   ```

4. **Try creating a classroom**:
   - Go to `http://localhost:3000/teacher`
   - Click "New Classroom"
   - Enter name and create
   - Should work without UUID error!

## Important Notes

⚠️ **If you already have a user_id stored**:
- The old timestamp-based user_id will still cause errors
- **Solution**: Clear localStorage and sign in again to get a new UUID

```javascript
// Clear localStorage in browser console:
localStorage.clear()
// Then refresh page and sign in again
```

## Files Changed

- `frontend/app/page.tsx` - Updated `handleLogin` and `handleSignup` to generate UUIDs

## Next Steps

This is a temporary fix for development. In production, you should:
1. Use Supabase Auth which automatically handles UUID generation
2. Get user ID from Supabase Auth session
3. Remove localStorage-based authentication










