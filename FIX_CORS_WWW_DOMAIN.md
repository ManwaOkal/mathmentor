# Fix CORS Error for www.mathmentor.academy

## Problem

You're getting CORS errors when accessing the backend from `https://www.mathmentor.academy`:

```
Access to fetch at 'https://mathmentor-api-production.up.railway.app/api/teacher/classrooms' 
from origin 'https://www.mathmentor.academy' has been blocked by CORS policy
```

---

## ✅ Solution: Two Fixes Needed

### Fix 1: Set CORS Environment Variable in Railway (Immediate)

The backend needs to allow your frontend domain. Set this in Railway:

1. **Go to Railway Dashboard** → Your service → **Variables** tab
2. **Add environment variable:**
   ```
   ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
   ```
3. **Save** - Railway will auto-redeploy
4. **Wait** 1-2 minutes for deployment

### Fix 2: Update Frontend to Use Custom API Domain (Better)

Your frontend is currently using the Railway default domain. Update it to use your custom domain:

1. **Go to Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. **Update `NEXT_PUBLIC_API_URL`:**
   - **Old:** `https://mathmentor-api-production.up.railway.app`
   - **New:** `https://api.mathmentor.academy`
3. **Save** and **Redeploy** frontend

---

## 🔍 Why This Happens

1. **CORS Issue**: Backend doesn't recognize `https://www.mathmentor.academy` as an allowed origin
2. **Wrong API URL**: Frontend is using Railway's default domain instead of your custom domain

---

## 📝 Complete Environment Variables Checklist

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

---

## ✅ Verification Steps

After making changes:

1. **Check Railway logs** - Should see `200 OK` for OPTIONS requests instead of `400 Bad Request`
2. **Test frontend** - Visit `https://www.mathmentor.academy` and try loading classrooms
3. **Check browser console** - Should see no CORS errors
4. **Check Network tab** - API calls should go to `https://api.mathmentor.academy`

---

## 🐛 Troubleshooting

### Problem: Still getting CORS errors after setting ALLOWED_ORIGINS

**Solutions:**
- Make sure you **redeployed** after adding the environment variable
- Verify the variable name is exactly `ALLOWED_ORIGINS` (case-sensitive)
- Check that domains include `https://` and no trailing slashes
- Wait for Railway to finish redeploying (check deployment status)

### Problem: Frontend still using old API URL

**Solutions:**
- Make sure you **redeployed** frontend after updating `NEXT_PUBLIC_API_URL`
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check Vercel deployment logs to verify environment variable is set
- Verify in browser: Open DevTools → Console → Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`

### Problem: Custom domain not working

**Solutions:**
- Verify `api.mathmentor.academy` DNS is configured correctly
- Test backend directly: Visit `https://api.mathmentor.academy/` (should show API health check)
- Check Railway custom domain configuration is correct
- Verify SSL certificate is active

---

## 🎯 Quick Action Plan

1. **Railway**: Add `ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy`
2. **Vercel**: Update `NEXT_PUBLIC_API_URL=https://api.mathmentor.academy`
3. **Wait** for both to redeploy (1-2 minutes each)
4. **Test** - Visit frontend and try loading classrooms
5. **Verify** - Check browser console for errors

---

## 💡 Pro Tip

**Best Practice**: Always use your custom domains (`api.mathmentor.academy`) instead of platform default domains (`*.railway.app`). This gives you:
- Better branding
- Easier to remember URLs
- More control over DNS
- Professional appearance

---

Good luck! 🚀
