# Fix Double Slash and CORS Issues

## Problems Identified

1. **Double slash in URL**: `https://api.mathmentor.academy//api/teacher/classrooms`
2. **CORS error**: Backend not allowing `https://www.mathmentor.academy`

---

## ✅ Fix 1: Double Slash Issue (Code Fixed)

The double slash issue has been fixed in the code. The `baseUrl` now automatically removes trailing slashes.

**What was fixed:**
- Updated `ApiClient` constructor to normalize `baseUrl` by removing trailing slashes
- This prevents URLs like `https://api.mathmentor.academy//api/...`

**Next step:** Redeploy frontend to apply the fix.

---

## ✅ Fix 2: CORS Configuration (Action Required)

The backend needs to allow your frontend domain. You must set the environment variable in Railway.

### Step 1: Set ALLOWED_ORIGINS in Railway

1. **Go to Railway Dashboard** → Your service → **Variables** tab
2. **Add environment variable:**
   ```
   ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
   ```
3. **Important:** Make sure there are:
   - ✅ No spaces after commas
   - ✅ `https://` protocol included
   - ✅ No trailing slashes
   - ✅ Both `mathmentor.academy` and `www.mathmentor.academy`

4. **Save** - Railway will auto-redeploy

### Step 2: Verify Railway Deployment

1. **Wait for deployment to complete** (check Railway dashboard)
2. **Check Railway logs** - Look for:
   ```
   INFO:     Application startup complete.
   ```
3. **Test backend directly:**
   - Visit: `https://api.mathmentor.academy/`
   - Should see: `{"message":"MathMentor API","status":"running"}`

### Step 3: Test CORS Preflight

1. **Open browser console** on `https://www.mathmentor.academy`
2. **Run this test:**
   ```javascript
   fetch('https://api.mathmentor.academy/api/teacher/classrooms', {
     method: 'OPTIONS',
     headers: {
       'Origin': 'https://www.mathmentor.academy',
       'Access-Control-Request-Method': 'GET'
     }
   })
   .then(r => {
     console.log('CORS Preflight Status:', r.status)
     console.log('CORS Headers:', {
       'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
       'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods')
     })
   })
   ```
3. **Should see:** Status 200 and proper CORS headers

---

## ✅ Fix 3: Redeploy Frontend

After fixing the double slash issue, redeploy:

1. **Push code changes** (if using git) OR
2. **Manually redeploy in Vercel:**
   - Go to Vercel → Deployments
   - Click 3 dots (⋯) → Redeploy

---

## 🔍 Verification Checklist

After making all changes:

- [ ] **Railway**: `ALLOWED_ORIGINS` environment variable is set
- [ ] **Railway**: Backend redeployed successfully
- [ ] **Railway**: Backend accessible at `https://api.mathmentor.academy/`
- [ ] **Vercel**: `NEXT_PUBLIC_API_URL` = `https://api.mathmentor.academy` (no trailing slash)
- [ ] **Vercel**: Frontend redeployed
- [ ] **Browser**: Clear cache and hard refresh
- [ ] **Browser**: Check Network tab - URLs should be `https://api.mathmentor.academy/api/...` (single slash)
- [ ] **Browser**: No CORS errors in console
- [ ] **Browser**: Classrooms load successfully

---

## 🐛 Troubleshooting

### Problem: Still seeing double slash

**Solutions:**
- Make sure frontend is redeployed with the fix
- Check `NEXT_PUBLIC_API_URL` in Vercel doesn't have trailing slash
- Clear browser cache completely
- Check browser console: `console.log(process.env.NEXT_PUBLIC_API_URL)`

### Problem: Still getting CORS errors

**Solutions:**
- Verify `ALLOWED_ORIGINS` is set correctly in Railway (no typos)
- Check Railway logs for CORS-related errors
- Verify backend is accessible: `https://api.mathmentor.academy/`
- Test CORS preflight manually (see Step 3 above)
- Make sure you redeployed backend after setting `ALLOWED_ORIGINS`

### Problem: Backend not responding

**Solutions:**
- Check Railway logs for errors
- Verify backend is running: Visit `https://api.mathmentor.academy/`
- Check Railway deployment status
- Verify custom domain DNS is configured correctly

---

## 📝 Environment Variables Summary

### Railway (Backend) - Variables Tab

```
ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_ANON_KEY=your-key
OPENAI_API_KEY=your-key
```

### Vercel (Frontend) - Environment Variables

```
NEXT_PUBLIC_API_URL=https://api.mathmentor.academy
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

**Important:** No trailing slashes in URLs!

---

## 🎯 Quick Action Plan

1. **Railway**: Set `ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy`
2. **Railway**: Wait for redeploy (1-2 minutes)
3. **Vercel**: Verify `NEXT_PUBLIC_API_URL=https://api.mathmentor.academy` (no trailing slash)
4. **Vercel**: Redeploy frontend (or push code changes)
5. **Browser**: Clear cache, hard refresh
6. **Test**: Try loading classrooms

---

## 💡 Pro Tips

1. **Always check Railway logs** after setting environment variables
2. **Test backend directly** before testing from frontend
3. **Use browser DevTools** to see exact request URLs and errors
4. **Clear browser cache** after deployments
5. **Check both domains**: `mathmentor.academy` and `www.mathmentor.academy`

---

Good luck! 🚀




