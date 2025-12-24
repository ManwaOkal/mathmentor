# Verify and Fix Environment Variable Setup

## Problem

You're still seeing port/localhost errors even though the API root endpoint works. This means `NEXT_PUBLIC_API_URL` is not set in Vercel, so it's defaulting to `http://localhost:8000`.

---

## ✅ Step 1: Verify Current Setup

### Check What URL Frontend is Using

1. **Open your deployed frontend** in browser: `https://www.mathmentor.academy`
2. **Press F12** to open Developer Tools
3. **Go to Console tab**
4. **Type this command:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
5. **Check the result:**
   - If it shows `undefined` or `http://localhost:8000` → Environment variable is NOT set
   - If it shows `https://api.mathmentor.academy` → Environment variable IS set correctly

### Check Network Tab

1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Try loading classrooms** or making any API call
4. **Look at the request URL:**
   - ❌ Bad: `http://localhost:8000/api/...`
   - ✅ Good: `https://api.mathmentor.academy/api/...`

---

## ✅ Step 2: Set Environment Variable in Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Navigate to: Your project → **Settings** → **Environment Variables**

2. **Add/Update Variable:**
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://api.mathmentor.academy`
   - **Environment:** Select **Production** (and optionally **Preview** and **Development**)

3. **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **3 dots** (⋯) on latest deployment
   - Click **Redeploy**
   - OR push a new commit to trigger auto-deploy

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://api.mathmentor.academy

# Redeploy
vercel --prod
```

---

## ✅ Step 3: Verify It's Set Correctly

### After Redeploying:

1. **Wait for deployment to complete** (check Vercel dashboard)

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

3. **Check again in browser console:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
   Should now show: `https://api.mathmentor.academy`

4. **Check Network tab:**
   - API calls should go to `https://api.mathmentor.academy/api/...`
   - Not `http://localhost:8000/api/...`

---

## 🐛 Troubleshooting

### Problem: Still showing localhost after setting env var

**Solutions:**
- Make sure you **redeployed** after adding the variable
- Clear browser cache completely (or use incognito)
- Verify variable name is exactly `NEXT_PUBLIC_API_URL` (case-sensitive)
- Check that it's set for **Production** environment
- Wait a few minutes - sometimes takes time to propagate

### Problem: Variable shows in Vercel but not in browser

**Solutions:**
- Environment variables starting with `NEXT_PUBLIC_` are exposed to browser
- Make sure variable name starts with `NEXT_PUBLIC_`
- Rebuild/redeploy the frontend
- Check Vercel build logs to see if variable is being read

### Problem: Getting CORS errors with custom domain

**Solutions:**
- Make sure `ALLOWED_ORIGINS` is set in Railway:
  ```
  ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
  ```
- Verify backend is accessible: Visit `https://api.mathmentor.academy/`
- Check Railway logs for CORS errors

---

## 📝 Complete Environment Variables Checklist

### Vercel (Frontend) - Environment Variables

**Required:**
- ✅ `NEXT_PUBLIC_API_URL` = `https://api.mathmentor.academy`
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

### Railway (Backend) - Variables

**Required:**
- ✅ `ALLOWED_ORIGINS` = `https://mathmentor.academy,https://www.mathmentor.academy`
- ✅ `SUPABASE_URL` = Your Supabase URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
- ✅ `SUPABASE_ANON_KEY` = Your Supabase anon key
- ✅ `OPENAI_API_KEY` = Your OpenAI API key

---

## 🎯 Quick Verification Test

Run this in your browser console on the deployed site:

```javascript
// Check API URL
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)

// Should output: API URL: https://api.mathmentor.academy

// Test API connection
fetch(process.env.NEXT_PUBLIC_API_URL + '/')
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err))

// Should output: API Response: {message: "MathMentor API", status: "running"}
```

---

## 💡 Important Notes

1. **Environment variables in `.env.local`** only work locally, not in production
2. **Vercel needs variables set in their dashboard** for production
3. **Variables starting with `NEXT_PUBLIC_`** are exposed to the browser
4. **Always redeploy** after adding/updating environment variables
5. **Clear browser cache** after redeploying to see changes

---

## 🆘 Still Not Working?

If you've verified everything and it's still not working:

1. **Check Vercel build logs:**
   - Go to Vercel → Deployments → Click on deployment → View build logs
   - Look for environment variable warnings

2. **Check browser console:**
   - Look for any errors or warnings
   - Check Network tab for failed requests

3. **Verify backend is accessible:**
   - Visit `https://api.mathmentor.academy/` directly
   - Should see: `{"message":"MathMentor API","status":"running"}`

4. **Share details:**
   - What does `console.log(process.env.NEXT_PUBLIC_API_URL)` show?
   - What URL do you see in Network tab for API requests?
   - Any errors in browser console?

---

Good luck! 🚀




