# Custom Domain Setup Guide

Complete guide for connecting your custom domain to MathMentor.

## 📋 Overview

This guide covers how to connect your custom domain to both the frontend and backend of your MathMentor application. You'll need to:

1. **Add your domain** to your hosting platform (Vercel/Railway/Render)
2. **Configure DNS records** at your domain registrar
3. **Update CORS settings** in your backend
4. **Update environment variables** for production

---

## 🎯 Prerequisites

Before starting, ensure you have:
- ✅ A domain name purchased from a registrar (e.g., Namecheap, GoDaddy, Google Domains, Cloudflare)
- ✅ Access to your domain's DNS settings
- ✅ Your application deployed to a hosting platform
- ✅ Basic understanding of DNS records (A, CNAME, etc.)

---

## 🚀 Step-by-Step Instructions

### Option 1: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### Part A: Connect Domain to Vercel (Frontend)

1. **Add Domain in Vercel Dashboard**
   - Go to your project in Vercel dashboard
   - Navigate to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter your domain (e.g., `mathmentor.com` or `www.mathmentor.com`)
   - Click **Add**

2. **Vercel will show DNS configuration**
   - Vercel will display the DNS records you need to add
   - You'll typically see:
     - **A Record** or **CNAME Record** pointing to Vercel's servers
     - Example: `CNAME www 76.76.21.21` or `A @ 76.76.21.21`

3. **Configure DNS at Your Domain Registrar**
   - Log into your domain registrar (where you bought the domain)
   - Navigate to DNS Management / DNS Settings
   - Add the records Vercel provided:
     - For **apex domain** (mathmentor.com): Add **A record** pointing to Vercel's IP
     - For **www subdomain** (www.mathmentor.com): Add **CNAME record** pointing to `cname.vercel-dns.com`
   - Save changes

4. **Wait for DNS Propagation**
   - DNS changes can take 24-48 hours, but usually propagate within minutes to hours
   - Vercel will automatically provision SSL certificate once DNS is verified
   - Check status in Vercel dashboard

#### Part B: Connect Domain to Railway (Backend)

1. **Add Custom Domain in Railway**
   - Go to your Railway project dashboard
   - Click on your backend service
   - Navigate to **Settings** → **Networking**
   - Under **Custom Domain**, click **Add Custom Domain**
   - Enter your API subdomain (e.g., `api.mathmentor.com`)
   - Click **Add**

2. **Configure DNS for API Subdomain**
   - Railway will provide a **CNAME record** to add
   - Example: `CNAME api cname.railway.app`
   - Add this CNAME record at your domain registrar
   - Point `api` subdomain to Railway's provided CNAME

3. **Verify Domain**
   - Railway will automatically verify and provision SSL
   - This may take a few minutes

#### Part C: Update Backend CORS Settings

The backend CORS configuration has been updated to support custom domains via environment variables. You have **two options**:

**Option 1: Use ALLOWED_ORIGINS (Recommended for explicit control)**

1. **Set Environment Variable in Railway/Render**
   - Go to your service dashboard → Variables/Environment
   - Add: `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
   - Include any other domains you need (comma-separated)
   - Redeploy the service

**Option 2: Use CUSTOM_DOMAIN variables (For regex-based matching)**

1. **Set Environment Variables in Railway/Render**
   - Add: `CUSTOM_DOMAIN=https://yourdomain.com` (or just `yourdomain.com`)
   - Add: `CUSTOM_DOMAIN_WWW=https://www.yourdomain.com` (optional, for www subdomain)
   - Redeploy the service

**Note**: The code automatically includes:
- `localhost` for local development
- All `*.vercel.app` domains for Vercel deployments
- Your custom domains (via either method above)

**Which method to use?**
- Use **ALLOWED_ORIGINS** if you want explicit control over exactly which domains are allowed
- Use **CUSTOM_DOMAIN** if you want automatic regex matching (useful if you have multiple subdomains)

#### Part D: Update Frontend Environment Variables

1. **Update Vercel Environment Variables**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_URL` to: `https://api.yourdomain.com`
   - Keep other Supabase variables as they are
   - Redeploy frontend

2. **Update Frontend Code (if needed)**
   - Check `frontend/lib/api.ts` to ensure it uses `NEXT_PUBLIC_API_URL`
   - No code changes needed if using environment variables correctly

---

### Option 2: Vercel (Frontend) + Render (Backend)

#### Part A: Connect Domain to Vercel (Frontend)
Follow the same steps as Option 1, Part A.

#### Part B: Connect Domain to Render (Backend)

1. **Add Custom Domain in Render**
   - Go to Render dashboard → Your service
   - Click **Settings** → **Custom Domains**
   - Click **Add Custom Domain**
   - Enter your API subdomain (e.g., `api.yourdomain.com`)
   - Click **Save**

2. **Configure DNS**
   - Render will provide a **CNAME record**
   - Example: `CNAME api your-service.onrender.com`
   - Add this at your domain registrar
   - Render will automatically provision SSL

#### Part C & D: Same as Option 1
Follow the same CORS and environment variable updates.

---

## 🔧 DNS Record Examples

### Common DNS Configurations

#### Configuration 1: Apex + www (Recommended)
```
Type    Name    Value                    TTL
A       @       76.76.21.21             3600  (Vercel IP for apex)
CNAME   www     cname.vercel-dns.com    3600  (Vercel CNAME for www)
CNAME   api     cname.railway.app       3600  (Railway CNAME for API)
```

#### Configuration 2: www only
```
Type    Name    Value                    TTL
CNAME   www     cname.vercel-dns.com    3600
CNAME   api     cname.railway.app       3600
```

#### Configuration 3: Using Cloudflare (if your domain uses Cloudflare DNS)
```
Type    Name    Value                    Proxy
CNAME   @       cname.vercel-dns.com     Yes (Orange Cloud)
CNAME   www     cname.vercel-dns.com     Yes
CNAME   api     cname.railway.app        Yes
```

**Note**: If using Cloudflare proxy (orange cloud), SSL is handled by Cloudflare. Make sure SSL/TLS mode is set to "Full" or "Full (strict)".

---

## 🔐 SSL/HTTPS Configuration

### Automatic SSL (Recommended)
- **Vercel**: Automatically provisions SSL certificates via Let's Encrypt
- **Railway**: Automatically provisions SSL certificates
- **Render**: Automatically provisions SSL certificates

### Manual SSL (if needed)
Most platforms handle SSL automatically. If you need manual configuration:
- Use Let's Encrypt certificates
- Or use Cloudflare SSL (if using Cloudflare DNS)

---

## ✅ Verification Checklist

After setting up your domain, verify everything works:

### 1. DNS Verification
```bash
# Check DNS records
dig yourdomain.com
dig www.yourdomain.com
dig api.yourdomain.com

# Or use online tools:
# - https://dnschecker.org
# - https://www.whatsmydns.net
```

### 2. Frontend Verification
- [ ] Visit `https://yourdomain.com` - should load your frontend
- [ ] Visit `https://www.yourdomain.com` - should redirect or load frontend
- [ ] Check browser console for errors
- [ ] Verify SSL certificate is valid (green lock icon)

### 3. Backend Verification
- [ ] Visit `https://api.yourdomain.com/` - should return API health check
- [ ] Visit `https://api.yourdomain.com/docs` - should show API documentation
- [ ] Test API calls from frontend - check browser Network tab
- [ ] Verify no CORS errors in browser console

### 4. Environment Variables
- [ ] `NEXT_PUBLIC_API_URL` points to `https://api.yourdomain.com`
- [ ] `ALLOWED_ORIGINS` includes your custom domain
- [ ] All Supabase variables are set correctly

---

## 🐛 Troubleshooting

### Problem: Domain not resolving
**Solution:**
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct using `dig` or online DNS checker
- Verify TTL values aren't too high (use 3600 seconds)

### Problem: SSL certificate not provisioning
**Solution:**
- Ensure DNS records are correctly configured
- Wait a few minutes after DNS propagation
- Check platform dashboard for SSL status
- Some platforms require manual SSL refresh

### Problem: CORS errors after domain setup
**Solution:**
- Verify `ALLOWED_ORIGINS` environment variable includes your domain
- Check CORS regex pattern matches your domain
- Ensure you're using `https://` not `http://`
- Redeploy backend after CORS changes

### Problem: Frontend can't reach backend API
**Solution:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check API subdomain DNS is configured
- Test API endpoint directly in browser
- Check browser console for network errors

### Problem: Mixed content warnings
**Solution:**
- Ensure all URLs use `https://` not `http://`
- Check Supabase URLs are using HTTPS
- Update any hardcoded HTTP URLs in code

---

## 📝 Quick Reference

### Environment Variables Summary

**Backend (Railway/Render):**
```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_ANON_KEY=your-key
OPENAI_API_KEY=your-key

# CORS Configuration (choose one method)
# Method 1: Explicit list (recommended)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Method 2: Regex-based (alternative)
CUSTOM_DOMAIN=https://yourdomain.com
CUSTOM_DOMAIN_WWW=https://www.yourdomain.com
```

**Frontend (Vercel):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### DNS Records Summary
- **Frontend (apex)**: A record → Vercel IP or CNAME → Vercel
- **Frontend (www)**: CNAME → Vercel
- **Backend (api)**: CNAME → Railway/Render

---

## 🎉 Next Steps

After your domain is set up:

1. **Update Supabase Settings**
   - Add your custom domain to Supabase allowed origins (if using Supabase Auth)
   - Update redirect URLs in Supabase Auth settings

2. **Update Social Media & Marketing**
   - Update all links to use your custom domain
   - Update email templates
   - Update documentation

3. **Set up Monitoring**
   - Monitor domain uptime
   - Set up error tracking (Sentry, etc.)
   - Monitor API performance

4. **SEO Optimization**
   - Set up proper meta tags
   - Submit sitemap to search engines
   - Configure robots.txt

---

## 📚 Additional Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/domains)
- [Railway Custom Domains Documentation](https://docs.railway.app/guides/custom-domains)
- [Render Custom Domains Documentation](https://render.com/docs/custom-domains)
- [DNS Propagation Checker](https://dnschecker.org)

---

## 💡 Pro Tips

1. **Use a subdomain for API**: Keep API separate (e.g., `api.yourdomain.com`) for better organization
2. **Set up redirects**: Configure www → apex or apex → www for consistency
3. **Monitor DNS TTL**: Lower TTL (300-600) during setup, increase later (3600) for performance
4. **Use Cloudflare**: Consider using Cloudflare for DNS + CDN + DDoS protection
5. **Test thoroughly**: Test all features after domain setup to ensure nothing broke

---

Good luck with your custom domain setup! 🚀
