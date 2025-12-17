# Fix: "Cannot connect to backend server" Error

## Problem

You're seeing the error: **"Cannot connect to backend server. Make sure it's running at http://localhost:8000"**

This happens because the frontend is trying to connect to `localhost:8000` instead of your production backend API.

---

## ✅ Solution: Set Environment Variable in Vercel

The frontend uses `NEXT_PUBLIC_API_URL` to know where to connect. You need to set this in Vercel.

### Step 1: Get Your Backend URL

First, identify where your backend is deployed:

- **Railway**: Check your Railway dashboard → Your service → Settings → Networking
  - URL will be something like: `https://your-app.railway.app` or `https://api.yourdomain.com`
  
- **Render**: Check your Render dashboard → Your service → Settings
  - URL will be something like: `https://your-service.onrender.com` or `https://api.yourdomain.com`

- **Custom Domain**: If you've set up `api.mathmentor.academy`, use: `https://api.mathmentor.academy`

### Step 2: Set Environment Variable in Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Add the Variable**
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your backend URL (e.g., `https://api.mathmentor.academy` or `https://your-app.railway.app`)
   - **Environment**: Select **Production** (and optionally **Preview** and **Development**)

3. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** tab
   - Click the **3 dots** (⋯) on the latest deployment
   - Click **Redeploy**

### Step 3: Verify It Works

After redeployment:
1. Visit your frontend URL
2. Try loading classrooms or any feature that uses the backend
3. Check browser console (F12) → Network tab to see if requests are going to the correct URL

---

## 🔍 How to Check Current Configuration

### Check What URL Frontend is Using

1. Open your deployed frontend in browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`
5. Or check **Network** tab to see what URL requests are being made to

### Verify Backend is Running

Test your backend directly:
- Visit: `https://your-backend-url.com/` (should show `{"message": "MathMentor API", "status": "running"}`)
- Visit: `https://your-backend-url.com/docs` (should show API documentation)

---

## 🐛 Troubleshooting

### Problem: Still seeing localhost error after setting env var

**Solutions:**
- Make sure you **redeployed** after adding the environment variable
- Check that the variable name is exactly `NEXT_PUBLIC_API_URL` (case-sensitive)
- Verify the variable is set for the correct environment (Production)
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Problem: Backend URL is correct but still can't connect

**Solutions:**
- Check if backend is actually running (visit backend URL directly)
- Check CORS settings in backend - make sure your frontend domain is allowed
- Check browser console for CORS errors
- Verify backend environment variable `ALLOWED_ORIGINS` includes your frontend domain

### Problem: Works locally but not in production

**Solutions:**
- Make sure `NEXT_PUBLIC_API_URL` is set in Vercel (not just `.env.local`)
- Environment variables in `.env.local` only work locally
- Vercel needs environment variables set in their dashboard

---

## 📝 Environment Variables Checklist

Make sure you have these set in **Vercel**:

- ✅ `NEXT_PUBLIC_API_URL` → Your backend URL (e.g., `https://api.mathmentor.academy`)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your Supabase anon key

And in your **Backend** (Railway/Render):

- ✅ `SUPABASE_URL` → Your Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` → Your Supabase service role key
- ✅ `SUPABASE_ANON_KEY` → Your Supabase anon key
- ✅ `OPENAI_API_KEY` → Your OpenAI API key
- ✅ `ALLOWED_ORIGINS` → Your frontend domain (e.g., `https://mathmentor.academy,https://www.mathmentor.academy`)

---

## 🎯 Quick Fix Summary

1. **Get backend URL** (from Railway/Render dashboard)
2. **Set in Vercel**: `NEXT_PUBLIC_API_URL` = your backend URL
3. **Redeploy** frontend
4. **Test** - should work now!

---

If you're still having issues, share:
- Your backend URL
- Your frontend URL  
- Browser console errors (F12 → Console)
- Network tab showing failed requests

Good luck! 🚀

