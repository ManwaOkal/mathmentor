# Fix 502 Bad Gateway Error

## Problem

You're seeing `502 Bad Gateway` errors, which means Railway's gateway can't reach your backend server. This typically happens when:

1. **Server crashed during startup**
2. **Server is restarting**
3. **Import/syntax errors preventing startup**
4. **Port mismatch**
5. **Server taking too long to start**

---

## ✅ Step-by-Step Troubleshooting

### Step 1: Check Railway Logs

1. **Go to Railway Dashboard** → Your service → **Logs** tab
2. **Look for errors** - especially:
   - Import errors
   - Syntax errors
   - Missing dependencies
   - Port binding errors
   - Environment variable errors

3. **Check the most recent logs** - Look for:
   - `Starting Container`
   - `Uvicorn running on...`
   - Any error messages or tracebacks

### Step 2: Common Issues to Check

#### Issue A: Missing Environment Variables

**Check if required variables are set:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (optional but may cause issues)

**Fix:**
- Go to Railway → Variables tab
- Add any missing variables
- Redeploy

#### Issue B: Import Errors

**Look for errors like:**
```
ModuleNotFoundError: No module named 'X'
ImportError: cannot import name 'X'
```

**Fix:**
- Check `requirements.txt` includes all dependencies
- Verify imports in your code match installed packages
- Railway should auto-install from `requirements.txt`

#### Issue C: Port Mismatch

**Check logs for:**
```
Uvicorn running on http://0.0.0.0:XXXX
```

**Verify:**
- Custom domain port matches the port Uvicorn is using
- Railway's `PORT` env var matches (if set)

#### Issue D: Syntax Errors

**Look for:**
```
SyntaxError: invalid syntax
SyntaxWarning: invalid escape sequence
```

**Fix:**
- Fix syntax errors in Python files
- For escape sequences, use raw strings (`r"..."`) or double backslashes

#### Issue E: Startup Timeout

**If server takes too long to start:**
- Check for slow imports
- Check database connection timeouts
- Optimize startup code

---

## 🔍 Quick Diagnostic Steps

### 1. Check if Server is Running

**In Railway Logs, look for:**
```
INFO:     Uvicorn running on http://0.0.0.0:8080
INFO:     Application startup complete.
```

If you see this, server is running. If not, it crashed during startup.

### 2. Test Backend Directly

Try accessing:
- Railway default domain: `https://mathmentor-api-production.up.railway.app/`
- Custom domain: `https://api.mathmentor.academy/`

If both return 502, the server isn't starting.

### 3. Check Recent Deployments

1. Go to Railway → **Deployments** tab
2. Check if latest deployment succeeded
3. If failed, check the build logs

### 4. Check Build Logs

1. Go to Railway → **Deployments** → Click on latest deployment
2. Check **Build Logs** for errors during:
   - Dependency installation
   - Build process
   - Docker build (if using Dockerfile)

---

## 🛠️ Common Fixes

### Fix 1: Restart the Service

1. Go to Railway → Your service → **Settings**
2. Scroll to bottom → **Delete Service** (don't actually delete)
3. Or use Railway CLI: `railway restart`

**Actually, better way:**
- Go to **Deployments** tab
- Click **3 dots** (⋯) on latest deployment
- Click **Redeploy**

### Fix 2: Check Requirements.txt

Make sure `requirements.txt` includes all dependencies:

```txt
fastapi
uvicorn[standard]
python-dotenv
supabase
openai
# ... all other dependencies
```

### Fix 3: Fix Syntax Warnings

If you see syntax warnings in logs, fix them:

**Example - Invalid escape sequence:**
```python
# Bad
pattern = "\s+"

# Good
pattern = r"\s+"  # Raw string
# OR
pattern = "\\s+"  # Escaped backslash
```

### Fix 4: Add Health Check Endpoint

Make sure your root endpoint (`/`) works:

```python
@app.get("/")
async def root():
    return {"message": "MathMentor API", "status": "running"}
```

### Fix 5: Check Startup Command

Verify start command in Railway Settings → Deploy:
```
python -c "import os; import uvicorn; uvicorn.run('api.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))"
```

**Note:** Railway sets `PORT` automatically. Your logs show port 8080, so make sure start command uses `PORT` env var.

---

## 🚨 Emergency Fixes

### If Server Won't Start at All

1. **Check Railway Logs** - Look for the exact error
2. **Try Simplifying Startup** - Comment out complex imports temporarily
3. **Test Locally** - Run the same command locally to see if it works
4. **Check Python Version** - Railway might be using wrong Python version

### If It's a Dependency Issue

1. **Check `requirements.txt`** - Make sure all packages are listed
2. **Pin versions** - Use specific versions instead of latest
3. **Check compatibility** - Some packages might not work together

### If It's an Environment Variable Issue

1. **Check all required vars are set** in Railway Variables
2. **Verify values are correct** - No typos, correct format
3. **Check for sensitive data** - Make sure keys/tokens are valid

---

## 📝 Checklist

- [ ] Check Railway logs for errors
- [ ] Verify all environment variables are set
- [ ] Check `requirements.txt` is complete
- [ ] Test backend URL directly (Railway default domain)
- [ ] Check deployment status (succeeded/failed)
- [ ] Verify start command is correct
- [ ] Check port configuration matches
- [ ] Look for syntax/import errors in logs
- [ ] Try redeploying the service

---

## 🔍 What to Look For in Logs

### Good Signs ✅
```
Starting Container
INFO:     Uvicorn running on http://0.0.0.0:8080
INFO:     Application startup complete.
INFO:     GET / HTTP/1.1 200 OK
```

### Bad Signs ❌
```
ModuleNotFoundError: No module named 'X'
SyntaxError: invalid syntax
Error: Port 8080 is already in use
Failed to connect to database
Application startup failed
```

---

## 💡 Pro Tips

1. **Always check logs first** - They tell you exactly what's wrong
2. **Test locally first** - If it works locally, it should work on Railway
3. **Use Railway's default domain** - Test with `*.up.railway.app` first before custom domain
4. **Check recent changes** - Did you recently change code? That might be the issue
5. **Use Railway CLI** - `railway logs` gives you real-time logs

---

## 🆘 Still Stuck?

If none of the above works:

1. **Share Railway logs** - Copy the error messages
2. **Check Railway status** - https://status.railway.app/
3. **Contact Railway support** - They can help debug
4. **Try creating a minimal test** - Deploy a simple FastAPI app to verify Railway works

---

## 🎯 Quick Action Plan

1. **Go to Railway → Logs**
2. **Find the error** (look for red text or exceptions)
3. **Fix the error** (missing import, syntax error, etc.)
4. **Redeploy** (Railway will auto-redeploy on git push, or manually redeploy)
5. **Check logs again** - Should see "Application startup complete"
6. **Test** - Visit backend URL

Good luck! 🚀




