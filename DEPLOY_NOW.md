# 🚀 DEPLOY NOW - Step-by-Step Guide

## Complete Deployment: Supabase + Render + Netlify

**Total Time:** ~20 minutes
**Cost:** $0 (Free tiers)

---

## PART 1: Set Up Supabase Database (5 minutes)

### Step 1: Create Supabase Account
1. Go to: **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with GitHub (use your Ashish-yolo account)

### Step 2: Create New Project
1. Click **"New Project"**
2. Fill in:
   - **Name:** `ai-underwriting-system`
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., `US West`)
   - **Pricing Plan:** Free
3. Click **"Create new project"**
4. Wait ~2 minutes for setup to complete

### Step 3: Get Database Connection String
1. In Supabase dashboard, click **"Settings"** (gear icon, bottom left)
2. Click **"Database"**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you created in Step 2
7. **SAVE THIS CONNECTION STRING** - you'll need it multiple times

### Step 4: Run Database Schema
1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open your local file: `underwriting-system/database/schema.sql`
4. Copy the ENTIRE contents
5. Paste into Supabase SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"
8. Click **"Tables"** in left sidebar to verify tables are created

**✅ Checkpoint:** You should see 13 tables created!

---

## PART 2: Deploy Backend to Render (8 minutes)

### Step 1: Create Render Account
1. Go to: **https://dashboard.render.com**
2. Click **"Get Started"**
3. Sign up with GitHub (connect your Ashish-yolo account)

### Step 2: Create New Web Service
1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Connect account"** to connect GitHub
4. Find and select: **`ai-underwriting-system`** repository
5. Click **"Connect"**

### Step 3: Configure Web Service
Fill in the following:

**Basic Settings:**
- **Name:** `underwriting-backend` (or any name you like)
- **Region:** Same as Supabase (e.g., Oregon)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Instance Type:**
- Select: **"Free"** (scroll down to find it)

### Step 4: Add Environment Variables
Click **"Advanced"** → Scroll to **"Environment Variables"**

Add these one by one (click "+ Add Environment Variable" for each):

```bash
# Required Variables
NODE_ENV=production
PORT=10000

# Database (use your Supabase connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Security Secrets (generate these - instructions below)
JWT_SECRET=<generate-this>
ENCRYPTION_KEY=<generate-this>
WEBHOOK_SECRET=<generate-this>
SESSION_SECRET=<generate-this>

# Optional (add later if needed)
REDIS_URL=redis://red-xxxxx:6379
MONGODB_URL=mongodb+srv://...
FRONTEND_URL=https://your-app.netlify.app
```

**🔐 Generate Security Secrets:**

Open Terminal and run these commands:

```bash
# Generate JWT_SECRET (64 chars)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (64 chars)
openssl rand -hex 32

# Generate WEBHOOK_SECRET (32 chars)
openssl rand -base64 32

# Generate SESSION_SECRET (32 chars)
openssl rand -base64 32
```

Copy each output and paste into the corresponding environment variable.

### Step 5: Deploy!
1. Click **"Create Web Service"** (bottom)
2. Wait for deployment (~3-5 minutes)
3. You'll see logs scrolling
4. Wait for: **"Your service is live 🎉"**

### Step 6: Get Your Backend URL
1. At the top, you'll see your URL: `https://underwriting-backend-xxxx.onrender.com`
2. **COPY THIS URL** - you'll need it for Netlify

### Step 7: Test Backend
1. Click the URL or open in browser
2. Add `/health` to the end: `https://underwriting-backend-xxxx.onrender.com/health`
3. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-...",
     "uptime": 123.45
   }
   ```

**✅ Checkpoint:** Backend is live!

---

## PART 3: Deploy Frontend to Netlify (5 minutes)

### Step 1: Create Netlify Account
1. Go to: **https://app.netlify.com**
2. Click **"Sign up"**
3. Sign up with GitHub (connect your Ashish-yolo account)

### Step 2: Import Project
1. Click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Authorize Netlify (if asked)
4. Find and click: **`ai-underwriting-system`**

### Step 3: Configure Build Settings
Fill in:

- **Branch to deploy:** `main`
- **Base directory:** `frontend`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `frontend/dist`

Click **"Show advanced"** → **"New variable"**

### Step 4: Add Environment Variable
Add this environment variable:

- **Key:** `VITE_API_URL`
- **Value:** `https://underwriting-backend-xxxx.onrender.com` (your Render URL from Part 2)

### Step 5: Deploy!
1. Click **"Deploy site"**
2. Wait ~2-3 minutes
3. You'll see: **"Site is live"**

### Step 6: Get Your Frontend URL
1. You'll see a random URL like: `https://rainbow-unicorn-123456.netlify.app`
2. Click **"Domain settings"**
3. You can customize it: Click **"Options"** → **"Edit site name"**
4. Change to: `ai-underwriting-system` (or any available name)
5. Your final URL: `https://ai-underwriting-system.netlify.app`

**✅ Checkpoint:** Frontend is live!

---

## PART 4: Connect Frontend & Backend (2 minutes)

### Update Backend CORS
1. Go back to **Render dashboard**
2. Click your **underwriting-backend** service
3. Click **"Environment"** (left sidebar)
4. Find `FRONTEND_URL` or add it:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://ai-underwriting-system.netlify.app` (your Netlify URL)
5. Click **"Save Changes"**
6. Service will auto-redeploy (~1 minute)

---

## PART 5: Test Everything! (2 minutes)

### Test 1: Open Frontend
1. Go to your Netlify URL: `https://ai-underwriting-system.netlify.app`
2. You should see the **Login page**

### Test 2: Login
1. Email: `admin@underwriting.com`
2. Password: `admin123`
3. Click **"Sign in"**
4. You should see the **Dashboard**

### Test 3: Check Dashboard
- Should see real-time metrics
- Should see "Applications (Last Hour)" stats
- Should see Quick Actions cards

### Test 4: Change Admin Password
1. This is important for security!
2. Go to your backend URL + `/api/auth/change-password`
3. Or implement password change in the UI later

---

## 🎉 YOU'RE LIVE!

Your system is now deployed and accessible at:
- **Frontend:** https://ai-underwriting-system.netlify.app
- **Backend:** https://underwriting-backend-xxxx.onrender.com
- **Database:** Supabase (managed)

---

## OPTIONAL: Add Redis & MongoDB

### Option A: Upstash Redis (Free)
1. Go to: https://upstash.com
2. Create account → Create database
3. Copy Redis URL
4. Add to Render environment variables:
   - `REDIS_URL=redis://...`

### Option B: MongoDB Atlas (Free)
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Get connection string
4. Add to Render environment variables:
   - `MONGODB_URL=mongodb+srv://...`

---

## Troubleshooting

### Frontend shows blank page
- Check browser console (F12)
- Verify `VITE_API_URL` is correct in Netlify
- Check CORS settings in backend

### Backend not connecting to database
- Verify `DATABASE_URL` is correct
- Check Supabase is running
- Check database tables exist

### Login not working
- Verify JWT_SECRET is set
- Check backend logs in Render
- Verify database has default admin user

### 500 errors
- Check Render logs: Dashboard → Logs
- Verify all environment variables are set
- Check database connection

---

## Next Steps

1. ✅ Test all features
2. ✅ Create new policies
3. ✅ Test underwriting endpoint
4. ✅ Integrate with your LOS
5. ✅ Monitor logs and performance

---

## Important URLs

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Render Dashboard:** https://dashboard.render.com
- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Repo:** https://github.com/Ashish-yolo/ai-underwriting-system

---

## 🔒 Security Checklist

- [ ] Changed admin password from default
- [ ] All secrets generated with openssl
- [ ] HTTPS enabled (automatic on Render/Netlify)
- [ ] CORS configured correctly
- [ ] Database password is strong
- [ ] Environment variables never committed to Git

---

**You're done! Your AI Underwriting System is LIVE! 🚀**

Share your deployment URLs in the comments!
