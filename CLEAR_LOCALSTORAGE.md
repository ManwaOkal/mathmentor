# Clear localStorage to Fix UUID Error

## The Problem

You're still seeing the error because your browser has an **old timestamp-based user_id** stored in localStorage:
- Old format: `"1764620706177"` ❌ (timestamp, not UUID)
- New format: `"550e8400-e29b-41d4-a716-446655440000"` ✅ (proper UUID)

## Quick Fix - Step by Step

### Option 1: Clear via Browser Console (Easiest)

1. **Open your browser** at `http://localhost:3000`
2. **Open Developer Tools**:
   - Press `F12` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)
   - Or right-click → "Inspect"
3. **Go to Console tab**
4. **Type this command** and press Enter:
   ```javascript
   localStorage.clear()
   ```
5. **Refresh the page** (F5 or Cmd+R)
6. **Sign in again** - This will create a new UUID-based user_id

### Option 2: Clear via Application Tab

1. **Open Developer Tools** (F12)
2. **Go to "Application" tab** (Chrome) or "Storage" tab (Firefox)
3. **Click "Local Storage"** → `http://localhost:3000`
4. **Right-click** and select "Clear" or delete individual items:
   - `user`
   - `user_id`
5. **Refresh the page**
6. **Sign in again**

### Option 3: Clear Specific Items Only

If you want to keep other data, just clear the user-related items:

```javascript
// In browser console:
localStorage.removeItem('user')
localStorage.removeItem('user_id')
```

Then refresh and sign in again.

## Verify It Worked

After clearing and signing in again, check your user_id:

```javascript
// In browser console:
localStorage.getItem('user_id')
```

**Should return something like:**
```
"550e8400-e29b-41d4-a716-446655440000"
```

**NOT:**
```
"1764620706177"  ❌
```

## Then Try Creating Classroom

1. Go to `http://localhost:3000/teacher`
2. Click "New Classroom"
3. Enter a name
4. Click "Create"
5. Should work! ✅

## Why This Happened

The code was updated to generate UUIDs, but your browser still had the old timestamp-based user_id stored. Clearing localStorage removes the old data so a new UUID can be generated.

## Still Having Issues?

If you still see the error after clearing localStorage:

1. **Check the code is updated**:
   - The `handleLogin` function should have `generateUUID()` not `Date.now().toString()`
   - File: `frontend/app/page.tsx` line ~49

2. **Hard refresh**:
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

3. **Check backend logs** for the actual error

4. **Verify user_id format**:
   ```javascript
   console.log(localStorage.getItem('user_id'))
   ```








