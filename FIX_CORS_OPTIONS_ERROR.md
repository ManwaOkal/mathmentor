# Fix CORS OPTIONS 400 Bad Request Error

## Problem

You're seeing `OPTIONS` requests returning `400 Bad Request` in Railway logs:
```
INFO: "OPTIONS /api/teacher/classrooms HTTP/1.1" 400 Bad Request
INFO: "OPTIONS /api/student/classrooms HTTP/1.1" 400 Bad Request
```

This happens when browsers send CORS preflight requests, but the backend isn't properly configured to handle them.

---

## ✅ Solution: Set CORS Environment Variables

The CORS configuration has been updated to handle OPTIONS requests properly. Now you need to configure your frontend domain.

### Step 1: Identify Your Frontend Domain

Your frontend is likely deployed on:
- Vercel: `https://mathmentor.academy` or `https://www.mathmentor.academy`
- Or a Vercel subdomain: `https://your-app.vercel.app`

### Step 2: Set Environment Variables in Railway

Go to Railway Dashboard → Your service → **Variables** tab and add:

**Option A: Use ALLOWED_ORIGINS (Recommended)**

Add this environment variable:
```
ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
```

**Option B: Use CUSTOM_DOMAIN (Alternative)**

If you prefer regex-based matching:
```
CUSTOM_DOMAIN=https://mathmentor.academy
CUSTOM_DOMAIN_WWW=https://www.mathmentor.academy
```

### Step 3: Redeploy Backend

After adding the environment variable:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy from the Deployments tab

### Step 4: Verify It Works

1. **Check Railway logs** - OPTIONS requests should now return `200 OK` instead of `400 Bad Request`
2. **Test frontend** - Try loading classrooms or making API calls
3. **Check browser console** - Should see no CORS errors

---

## 🔍 What Was Fixed

The CORS configuration was updated to:
1. ✅ Explicitly allow `OPTIONS` method (required for CORS preflight)
2. ✅ Support both `allow_origins` and `allow_origin_regex` simultaneously
3. ✅ Always include regex pattern for Vercel deployments (`.vercel.app`)

---

## 🐛 Troubleshooting

### Problem: Still seeing 400 Bad Request on OPTIONS

**Solutions:**
- Make sure you added the environment variable correctly
- Verify the frontend domain matches exactly (including `https://`)
- Check Railway logs to see if the variable is being read
- Wait for Railway to finish redeploying

### Problem: CORS errors in browser console

**Solutions:**
- Verify `ALLOWED_ORIGINS` includes your exact frontend URL
- Check that `NEXT_PUBLIC_API_URL` in Vercel points to your backend
- Make sure both frontend and backend are using HTTPS
- Clear browser cache and hard refresh

### Problem: Works locally but not in production

**Solutions:**
- Environment variables in `.env` only work locally
- Railway needs environment variables set in their dashboard
- Make sure you set variables for the correct environment (Production)

---

## 📝 Environment Variables Checklist

**In Railway (Backend):**
- ✅ `ALLOWED_ORIGINS` = `https://mathmentor.academy,https://www.mathmentor.academy`
- ✅ OR `CUSTOM_DOMAIN` = `https://mathmentor.academy`
- ✅ `SUPABASE_URL` = Your Supabase URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase key
- ✅ `SUPABASE_ANON_KEY` = Your Supabase key
- ✅ `OPENAI_API_KEY` = Your OpenAI key

**In Vercel (Frontend):**
- ✅ `NEXT_PUBLIC_API_URL` = `https://api.mathmentor.academy`
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase key

---

## 🎯 Quick Fix Summary

1. **Go to Railway** → Variables tab
2. **Add**: `ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy`
3. **Save** - Railway will auto-redeploy
4. **Wait** 1-2 minutes for deployment
5. **Test** - OPTIONS requests should now work

---

## 💡 Understanding CORS Preflight

When your frontend makes a request to the backend:
1. Browser first sends an `OPTIONS` request (preflight)
2. Backend must respond with `200 OK` and CORS headers
3. Then browser sends the actual request (GET, POST, etc.)

The `400 Bad Request` on OPTIONS means the preflight failed, so the actual request never happens.

---

Good luck! 🚀




