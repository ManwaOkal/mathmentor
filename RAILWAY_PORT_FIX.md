# Fix Railway Custom Domain Port Configuration

## Problem

Your custom domain `api.mathmentor.academy` is configured to use **port 8080**, but Railway automatically sets the `PORT` environment variable (usually to a different port). This causes the domain to not work correctly.

---

## ✅ Solution: Update Custom Domain Port

### Step 1: Check What Port Railway is Using

Railway automatically sets the `PORT` environment variable. To find it:

1. **Go to Railway Dashboard** → Your service → **Variables** tab
2. Look for `PORT` environment variable
3. **OR** check the **Logs** tab - Railway usually logs what port it's using
4. **OR** Railway typically uses port that matches the service (often the default port from your start command)

### Step 2: Update Custom Domain Port

1. **Go to Railway Dashboard** → Your service → **Settings** → **Networking**
2. Find your custom domain: `api.mathmentor.academy`
3. Click **Edit Port** or the port number (currently showing 8080)
4. **Change it to match Railway's PORT** (usually Railway uses the port from your start command, which defaults to 8000)
5. **OR** better yet: **Remove the port specification** - Railway should auto-detect it

### Step 3: Alternative - Let Railway Auto-Detect

If Railway supports it, you can:
- Remove the custom port configuration
- Let Railway automatically route to the correct port
- Railway's custom domains should automatically use the service's exposed port

---

## 🔍 How Railway Ports Work

Railway:
1. Sets `PORT` environment variable automatically
2. Your app reads `PORT` and starts on that port
3. Railway's networking routes traffic to that port
4. Custom domains should point to Railway's internal port (which matches `PORT`)

**The issue**: Your custom domain is hardcoded to port 8080, but your app is running on whatever `PORT` is set to (likely 8000).

---

## 🎯 Recommended Fix

### Option 1: Update Port to Match (Quick Fix)

1. In Railway → Settings → Networking → Custom Domain
2. Change port from **8080** to **8000** (or whatever `PORT` env var is)
3. Click **Update**

### Option 2: Use Railway's Default Port (Best)

1. Check what port your start command uses (defaults to 8000)
2. Make sure Railway's `PORT` env var matches (Railway usually sets this automatically)
3. Update custom domain to use that port

### Option 3: Update Start Command to Use 8080

If you want to keep port 8080:

1. **Update start command** in Railway Settings → Deploy:
   ```
   python -c "import os; import uvicorn; uvicorn.run('api.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))"
   ```

2. **Set PORT environment variable** in Railway Variables:
   ```
   PORT=8080
   ```

3. **Keep custom domain** pointing to port 8080

---

## ✅ Verification Steps

After fixing the port:

1. **Test Railway default domain:**
   - Visit: `https://mathmentor-api-production.up.railway.app/`
   - Should show: `{"message": "MathMentor API", "status": "running"}`

2. **Test custom domain:**
   - Visit: `https://api.mathmentor.academy/`
   - Should show the same response

3. **Check API docs:**
   - Visit: `https://api.mathmentor.academy/docs`
   - Should show FastAPI documentation

4. **Test from frontend:**
   - Make sure `NEXT_PUBLIC_API_URL` in Vercel is set to `https://api.mathmentor.academy`
   - Test loading classrooms or any API call

---

## 🐛 Troubleshooting

### Problem: Still can't connect after fixing port

**Solutions:**
- Wait 1-2 minutes for Railway to update routing
- Check Railway logs to see what port the app is actually running on
- Verify `PORT` environment variable matches custom domain port
- Try accessing the Railway default domain first to confirm backend works

### Problem: Port keeps changing

**Solutions:**
- Railway may change ports on redeploy
- Better to use Railway's automatic port detection
- Or set `PORT` environment variable explicitly in Railway Variables

### Problem: Custom domain shows "Invalid Configuration"

**Solutions:**
- Check DNS records in Namecheap are correct
- Verify CNAME record for `api` subdomain points to Railway
- Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)

---

## 📝 Quick Checklist

- [ ] Check Railway `PORT` environment variable (or check logs)
- [ ] Update custom domain port to match `PORT` (or remove port to auto-detect)
- [ ] Verify Railway default domain works: `https://mathmentor-api-production.up.railway.app/`
- [ ] Verify custom domain works: `https://api.mathmentor.academy/`
- [ ] Update Vercel `NEXT_PUBLIC_API_URL` to `https://api.mathmentor.academy`
- [ ] Test frontend can connect to backend

---

## 💡 Pro Tip

**Best Practice**: Let Railway handle ports automatically. Railway sets `PORT` and routes traffic correctly. Your custom domain should just point to Railway's service, and Railway handles the port routing internally.

If Railway's custom domain setup requires a port, use the same port that your start command defaults to (8000 in your case).

---

Good luck! 🚀

