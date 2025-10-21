# ✅ Deployment Checklist

## Quick Reference - What You Need

### 🔑 Information to Collect

As you deploy, save these in a secure place:

```
SUPABASE:
- Project URL: _______________________
- Database Password: _______________________
- Connection String: _______________________

RENDER:
- Backend URL: _______________________

NETLIFY:
- Frontend URL: _______________________

SECRETS (Generated):
- JWT_SECRET: _______________________
- ENCRYPTION_KEY: _______________________
- WEBHOOK_SECRET: _______________________
- SESSION_SECRET: _______________________
```

---

## 📋 Step-by-Step Checklist

### Part 1: Supabase (5 min)
- [ ] Create Supabase account
- [ ] Create new project: `ai-underwriting-system`
- [ ] Save database password
- [ ] Copy connection string
- [ ] Run schema.sql in SQL Editor
- [ ] Verify 13 tables created

### Part 2: Render Backend (8 min)
- [ ] Create Render account
- [ ] Connect GitHub repository
- [ ] Configure web service:
  - [ ] Root Directory: `backend`
  - [ ] Build: `npm install && npm run build`
  - [ ] Start: `npm start`
- [ ] Add environment variables (11 total)
- [ ] Generate secrets with openssl
- [ ] Deploy and wait for "Service is live"
- [ ] Copy backend URL
- [ ] Test `/health` endpoint

### Part 3: Netlify Frontend (5 min)
- [ ] Create Netlify account
- [ ] Import GitHub repository
- [ ] Configure build:
  - [ ] Base directory: `frontend`
  - [ ] Build: `npm install && npm run build`
  - [ ] Publish: `frontend/dist`
- [ ] Add `VITE_API_URL` environment variable
- [ ] Deploy and wait for "Site is live"
- [ ] Customize domain name (optional)
- [ ] Copy frontend URL

### Part 4: Connect (2 min)
- [ ] Add `FRONTEND_URL` to Render
- [ ] Wait for Render to redeploy
- [ ] Test frontend can call backend

### Part 5: Test (2 min)
- [ ] Open frontend URL
- [ ] Login with admin@underwriting.com / admin123
- [ ] See dashboard
- [ ] Change admin password (important!)

---

## 🔐 Generate Secrets

Run these in Terminal (Mac/Linux) or Git Bash (Windows):

```bash
# Copy these exact commands:

echo "JWT_SECRET:"
openssl rand -hex 32

echo "ENCRYPTION_KEY:"
openssl rand -hex 32

echo "WEBHOOK_SECRET:"
openssl rand -base64 32

echo "SESSION_SECRET:"
openssl rand -base64 32
```

Copy each output value.

---

## 📝 Environment Variables Reference

### Render Backend (Required)

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `NODE_ENV` | `production` | Type manually |
| `PORT` | `10000` | Type manually |
| `DATABASE_URL` | `postgresql://...` | Supabase → Settings → Database |
| `JWT_SECRET` | (64 chars) | Generate with openssl |
| `ENCRYPTION_KEY` | (64 chars) | Generate with openssl |
| `WEBHOOK_SECRET` | (32 chars) | Generate with openssl |
| `SESSION_SECRET` | (32 chars) | Generate with openssl |
| `FRONTEND_URL` | `https://....netlify.app` | From Netlify after deploy |

### Netlify Frontend (Required)

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_API_URL` | `https://....onrender.com` | From Render after deploy |

---

## ⚠️ Common Issues & Fixes

### Issue: Frontend shows error "Network Error"
**Fix:**
- Check `VITE_API_URL` is correct in Netlify
- Verify Render backend is running
- Add `FRONTEND_URL` to Render

### Issue: Login fails with 401
**Fix:**
- Check `JWT_SECRET` is set in Render
- Verify database has admin user (check Supabase)
- Check Render logs for errors

### Issue: Backend crashes on startup
**Fix:**
- Check `DATABASE_URL` is correct
- Verify all required env vars are set
- Check Render logs for specific error

### Issue: Tables not found
**Fix:**
- Go to Supabase SQL Editor
- Run schema.sql again
- Check Tables section to verify

---

## 🎯 Post-Deployment Tasks

### Immediate (Do Now)
- [ ] Test login
- [ ] Change admin password
- [ ] Test creating a policy
- [ ] Bookmark dashboard URLs

### Soon (Within 24 hours)
- [ ] Set up monitoring
- [ ] Test all API endpoints
- [ ] Configure webhooks
- [ ] Add more users

### Later (This week)
- [ ] Custom domain (optional)
- [ ] Add Redis for caching
- [ ] Add MongoDB for logs
- [ ] Enable analytics

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Render Docs:** https://render.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **GitHub Issues:** https://github.com/Ashish-yolo/ai-underwriting-system/issues

---

## ✨ Your Live URLs

Once deployed, fill these in:

```
🌐 Frontend: https://________________________________.netlify.app
⚙️  Backend:  https://________________________________.onrender.com
💾 Database: https://app.supabase.com/project/____________

📧 Login: admin@underwriting.com
🔑 Initial Password: admin123 (CHANGE THIS!)
```

---

**Total Time:** ~20 minutes
**Total Cost:** $0 (Free tiers)
**Status:** Production-ready! 🚀
