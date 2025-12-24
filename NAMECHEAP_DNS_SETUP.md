# Namecheap DNS Setup for mathmentor.academy

Step-by-step guide to configure your domain DNS records in Namecheap.

## 📋 Prerequisites

Before configuring DNS, you need to:

1. ✅ **Add domain in Vercel** (for frontend)
   - Go to Vercel dashboard → Your project → Settings → Domains
   - Add `mathmentor.academy` and `www.mathmentor.academy`
   - Vercel will show you the DNS records needed

2. ✅ **Add domain in Railway/Render** (for backend API)
   - Go to Railway/Render dashboard → Your service → Settings → Custom Domains
   - Add `api.mathmentor.academy`
   - Platform will show you the DNS record needed

---

## 🔧 Step-by-Step: Configure DNS in Namecheap

### Step 1: Remove Existing Parking Page Records

1. **Remove the CNAME record for www:**
   - Find the record: `CNAME www → parkingpage.namecheap.com.`
   - Click **Remove**

2. **Remove the URL Redirect record:**
   - Find the record: `URL Redirect @ → http://www.mathmentor.academy/`
   - Click **Remove**

### Step 2: Add Vercel DNS Records

After adding your domain in Vercel, you'll get specific DNS records. Here's what to add:

#### Option A: If Vercel provides A records (for apex domain)

1. **Add A record for apex domain (@):**
   ```
   Type: A Record
   Host: @
   Value: [IP address from Vercel, e.g., 76.76.21.21]
   TTL: Automatic (or 30 min)
   ```
   - Click **Add New Record**
   - Select **A Record**
   - Host: `@`
   - Value: [The IP address Vercel provides]
   - TTL: Automatic
   - Click **Save**

2. **Add CNAME record for www:**
   ```
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic (or 30 min)
   ```
   - Click **Add New Record**
   - Select **CNAME Record**
   - Host: `www`
   - Value: `cname.vercel-dns.com` (or what Vercel provides)
   - TTL: Automatic
   - Click **Save**

#### Option B: If Vercel provides CNAME for apex (using ALIAS/ANAME)

Some registrars support CNAME for apex via ALIAS. Namecheap may support this, but check Vercel's instructions.

**Note:** Vercel will show you the exact records to add in their dashboard. Use those values!

### Step 3: Add Backend API DNS Record

After adding `api.mathmentor.academy` in Railway/Render:

1. **Add CNAME record for api subdomain:**
   ```
   Type: CNAME Record
   Host: api
   Value: [CNAME from Railway/Render, e.g., cname.railway.app or your-service.onrender.com]
   TTL: Automatic (or 30 min)
   ```
   - Click **Add New Record**
   - Select **CNAME Record**
   - Host: `api`
   - Value: [The CNAME value from Railway/Render]
   - TTL: Automatic
   - Click **Save**

### Step 4: Keep Existing Records (if needed)

- **TXT Record for SPF:** Keep the existing SPF record:
  ```
  Type: TXT Record
  Host: @
  Value: v=spf1 include:spf.efwd.registrar-servers.com ~all
  ```
  (This is for email, you can keep it)

---

## 📝 Expected Final DNS Configuration

After setup, your DNS records should look like this:

```
Type          Host    Value                              TTL
A Record       @       [Vercel IP, e.g., 76.76.21.21]   Automatic
CNAME Record  www     cname.vercel-dns.com              Automatic
CNAME Record  api     [Railway/Render CNAME]             Automatic
TXT Record    @       v=spf1 include:spf...             Automatic
```

---

## ⚠️ Important Notes for Namecheap

1. **TTL Settings:**
   - Use "Automatic" or "30 min" for faster propagation during setup
   - You can increase to "1 hour" or "4 hours" later for better performance

2. **DNS Propagation:**
   - Changes can take 5 minutes to 48 hours
   - Usually propagates within 1-2 hours
   - Use [dnschecker.org](https://dnschecker.org) to check propagation globally

3. **Namecheap Specific:**
   - Make sure you're editing DNS records, not domain redirects
   - The `@` symbol represents the apex/root domain
   - Don't include a trailing dot in CNAME values (unless Namecheap requires it)

4. **SSL Certificates:**
   - Vercel and Railway/Render will automatically provision SSL certificates
   - This happens after DNS propagates (can take a few minutes to hours)

---

## ✅ Verification Steps

### 1. Check DNS Propagation

Visit [dnschecker.org](https://dnschecker.org) and check:
- `mathmentor.academy` → Should resolve to Vercel IP
- `www.mathmentor.academy` → Should resolve to Vercel
- `api.mathmentor.academy` → Should resolve to Railway/Render

### 2. Verify in Vercel Dashboard

- Go to Vercel → Settings → Domains
- Check that `mathmentor.academy` shows "Valid Configuration"
- Wait for SSL certificate to be issued (may take a few minutes)

### 3. Verify in Railway/Render Dashboard

- Check that `api.mathmentor.academy` shows as verified
- SSL certificate should be automatically provisioned

### 4. Test Your Application

1. **Frontend:**
   - Visit `https://mathmentor.academy` (should load your app)
   - Visit `https://www.mathmentor.academy` (should load or redirect)

2. **Backend:**
   - Visit `https://api.mathmentor.academy/` (should show API health check)
   - Visit `https://api.mathmentor.academy/docs` (should show API docs)

3. **Integration:**
   - Test that frontend can make API calls to backend
   - Check browser console for any CORS errors

---

## 🐛 Troubleshooting

### Problem: DNS changes not showing up

**Solutions:**
- Wait 1-2 hours for propagation
- Clear your DNS cache: `sudo dscacheutil -flushcache` (Mac) or restart router
- Check DNS propagation globally using dnschecker.org
- Verify records are saved correctly in Namecheap

### Problem: SSL certificate not provisioning

**Solutions:**
- Ensure DNS records are correct and propagated
- Wait 10-30 minutes after DNS propagation
- Check Vercel/Railway/Render dashboard for SSL status
- Try removing and re-adding the domain in the platform

### Problem: Domain shows "Invalid Configuration" in Vercel

**Solutions:**
- Double-check DNS records match exactly what Vercel shows
- Ensure A record IP is correct (if using apex domain)
- Ensure CNAME value is exactly `cname.vercel-dns.com` (no trailing dot)
- Wait for DNS propagation

### Problem: CORS errors after domain setup

**Solutions:**
- Set `ALLOWED_ORIGINS` environment variable in Railway/Render:
  ```
  ALLOWED_ORIGINS=https://mathmentor.academy,https://www.mathmentor.academy
  ```
- Or set `CUSTOM_DOMAIN=https://mathmentor.academy`
- Redeploy backend after setting environment variables
- Check browser console for exact error message

---

## 📞 Getting Help

If you encounter issues:

1. **Namecheap Support:**
   - Live Chat: Available in Namecheap dashboard
   - Help Center: https://www.namecheap.com/support/

2. **Vercel Support:**
   - Documentation: https://vercel.com/docs/concepts/projects/domains
   - Support: Available in Vercel dashboard

3. **Railway/Render Support:**
   - Check their documentation for custom domain setup
   - Use their support channels

---

## 🎯 Quick Checklist

- [ ] Removed parking page CNAME record
- [ ] Removed URL redirect record
- [ ] Added A record for `@` (apex domain) → Vercel IP
- [ ] Added CNAME record for `www` → Vercel
- [ ] Added CNAME record for `api` → Railway/Render
- [ ] Verified DNS propagation (dnschecker.org)
- [ ] Verified domain in Vercel dashboard
- [ ] Verified domain in Railway/Render dashboard
- [ ] Set `ALLOWED_ORIGINS` environment variable in backend
- [ ] Updated `NEXT_PUBLIC_API_URL` in Vercel environment variables
- [ ] Tested frontend at `https://mathmentor.academy`
- [ ] Tested backend at `https://api.mathmentor.academy`
- [ ] Verified SSL certificates are active

---

Good luck! 🚀




