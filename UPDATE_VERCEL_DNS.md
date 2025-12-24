# Update Vercel DNS Records - New IP Address

## What Changed

Vercel has updated their IP addresses as part of a planned expansion. You need to update your DNS records in Namecheap.

---

## ✅ Step-by-Step: Update DNS in Namecheap

### Step 1: Remove Old A Record

1. **Go to Namecheap Dashboard**
   - Navigate to: Domain List → `mathmentor.academy` → **Advanced DNS**

2. **Find and Remove Old A Record**
   - Look for: `A Record` with `Host: @` and `Value: 192.64.119.41`
   - Click **Remove** on that record

### Step 2: Add New A Record

1. **Click "Add New Record"**
2. **Select "A Record"**
3. **Fill in the details:**
   ```
   Type: A Record
   Host: @
   Value: 216.198.79.1
   TTL: Automatic (or 30 min)
   ```
4. **Click Save** (checkmark icon)

### Step 3: Verify Other Records

Make sure you have these records (don't change them):

**CNAME for www:**
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

**CNAME for api (Railway backend):**
```
Type: CNAME Record
Host: api
Value: [Your Railway CNAME, e.g., cname.railway.app]
TTL: Automatic
```

**TXT Record (SPF - keep this):**
```
Type: TXT Record
Host: @
Value: v=spf1 include:spf.efwd.registrar-servers.com ~all
TTL: Automatic
```

---

## 📝 Expected Final DNS Configuration

After updating, your DNS records should look like:

```
Type          Host    Value                              TTL
A Record       @       216.198.79.1                      Automatic
CNAME Record   www     cname.vercel-dns.com             Automatic
CNAME Record   api     [Railway CNAME]                  Automatic
TXT Record     @       v=spf1 include:spf...            Automatic
```

---

## ⏱️ DNS Propagation

After making changes:
- **Wait 5 minutes to 2 hours** for DNS to propagate
- Changes usually take effect within 30-60 minutes
- Check propagation: https://dnschecker.org

---

## ✅ Verification Steps

### 1. Check DNS Propagation

Visit [dnschecker.org](https://dnschecker.org) and check:
- `mathmentor.academy` → Should resolve to `216.198.79.1`

### 2. Verify in Vercel Dashboard

1. Go to Vercel → Your project → Settings → Domains
2. Check that `mathmentor.academy` shows **"Valid Configuration"**
3. Wait for SSL certificate to be issued (may take a few minutes)

### 3. Test Your Domain

1. Visit `https://mathmentor.academy` - should load your frontend
2. Visit `https://www.mathmentor.academy` - should load or redirect
3. Check browser shows valid SSL certificate (green lock)

---

## 🐛 Troubleshooting

### Problem: Vercel still shows "Invalid Configuration"

**Solutions:**
- Wait 1-2 hours for DNS propagation
- Double-check the A record value is exactly `216.198.79.1` (no spaces)
- Verify you removed the old A record (`192.64.119.41`)
- Check TTL is set to Automatic or a low value (30 min)

### Problem: Domain not resolving after update

**Solutions:**
- Check DNS propagation globally: https://dnschecker.org
- Verify A record is saved correctly in Namecheap
- Clear your DNS cache: `sudo dscacheutil -flushcache` (Mac) or restart router
- Wait longer - DNS can take up to 48 hours (usually much faster)

### Problem: SSL certificate not provisioning

**Solutions:**
- Ensure DNS records are correct and propagated
- Wait 10-30 minutes after DNS propagation
- Check Vercel dashboard for SSL status
- Try removing and re-adding the domain in Vercel (if needed)

---

## 📞 Need Help?

- **Namecheap Support**: Live chat available in dashboard
- **Vercel Support**: Check Vercel dashboard → Help/Support
- **DNS Checker**: https://dnschecker.org to verify propagation

---

## 🎯 Quick Checklist

- [ ] Removed old A record: `@` → `192.64.119.41`
- [ ] Added new A record: `@` → `216.198.79.1`
- [ ] Verified CNAME for `www` is still set
- [ ] Verified CNAME for `api` is still set
- [ ] Kept TXT record for SPF
- [ ] Waited for DNS propagation (check dnschecker.org)
- [ ] Verified domain in Vercel dashboard shows "Valid Configuration"
- [ ] Tested `https://mathmentor.academy` loads correctly

---

Good luck! 🚀




