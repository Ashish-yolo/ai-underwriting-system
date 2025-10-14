# Deployment Guide - AI Underwriting System

## 🚀 Quick Deployment

The system is ready to deploy! Code is on GitHub at: https://github.com/Ashish-yolo/ai-underwriting-system

---

## Option 1: Netlify + Render (Recommended)

### Frontend Deployment (Netlify)

1. **Go to Netlify**: https://app.netlify.com
2. **Click "Add new site" → "Import an existing project"**
3. **Connect to GitHub** and select: `Ashish-yolo/ai-underwriting-system`
4. **Configure build settings:**
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`
   - Node version: `18`
5. **Add environment variable:**
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com` (will get this from Render)
6. **Click "Deploy site"**

### Backend Deployment (Render)

1. **Go to Render**: https://dashboard.render.com
2. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - Name: `underwriting-postgres`
   - Plan: Free
   - Click "Create Database"
   - **Copy the "Internal Database URL"** (you'll need this)

3. **Deploy Backend:**
   - Click "New +" → "Web Service"
   - Connect to GitHub: `Ashish-yolo/ai-underwriting-system`
   - Name: `underwriting-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<paste Internal Database URL from step 2>
   JWT_SECRET=<generate a random 64-char string>
   ENCRYPTION_KEY=<generate a random 64-char hex string>
   WEBHOOK_SECRET=<generate a random 32-char string>
   SESSION_SECRET=<generate a random 32-char string>
   FRONTEND_URL=<your netlify URL from frontend deployment>
   REDIS_URL=<optional: add if you have Redis instance>
   MONGODB_URL=<optional: add if you have MongoDB instance>
   ```

5. **Generate Random Secrets:**
   ```bash
   # JWT_SECRET (64 characters)
   openssl rand -hex 32

   # ENCRYPTION_KEY (64 characters)
   openssl rand -hex 32

   # WEBHOOK_SECRET (32 characters)
   openssl rand -base64 32

   # SESSION_SECRET (32 characters)
   openssl rand -base64 32
   ```

6. **Deploy:** Click "Create Web Service"

7. **Run Database Migration:**
   - Once deployed, go to Shell tab
   - Run: `cd backend && npm run migrate`
   - Or manually run the schema.sql file

### Update Frontend with Backend URL

1. Go back to Netlify
2. Navigate to: Site settings → Environment variables
3. Update `VITE_API_URL` with your Render backend URL
4. Trigger redeploy: Deploys → Trigger deploy

---

## Option 2: Vercel (Frontend + Backend)

### Deploy Both Together

1. **Go to Vercel**: https://vercel.com
2. **Import project** from GitHub: `Ashish-yolo/ai-underwriting-system`
3. **Configure:**
   - Framework: Vite
   - Root Directory: `./`
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
4. **Add environment variables** (same as Render above)
5. **Deploy**

---

## Option 3: Railway (All-in-One)

1. **Go to Railway**: https://railway.app
2. **Create new project** from GitHub repo
3. Railway will auto-detect and deploy both frontend and backend
4. **Add PostgreSQL plugin** from Railway marketplace
5. **Configure environment variables** (same as above)
6. **Deploy**

---

## Option 4: Docker (Self-Hosted)

### Using Docker Compose

1. **On your server:**
   ```bash
   git clone https://github.com/Ashish-yolo/ai-underwriting-system.git
   cd ai-underwriting-system
   ```

2. **Create .env file** with production values

3. **Build and run:**
   ```bash
   docker-compose up -d --build
   ```

4. **Run migrations:**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Access:**
   - Frontend: http://your-server:5173
   - Backend: http://your-server:3000

---

## Post-Deployment Setup

### 1. Initialize Database

Run the database schema:
```bash
# If using Render Shell or SSH to server
psql $DATABASE_URL < database/schema.sql
```

Or use the migration script:
```bash
npm run migrate
```

### 2. Create Admin User

The default admin user is created automatically:
- Email: `admin@underwriting.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change this password immediately after first login!

### 3. Test the Deployment

1. Access the frontend URL
2. Login with default credentials
3. Change the admin password
4. Test creating a policy
5. Test the underwriting API endpoint

### 4. Configure CORS

Make sure your backend allows requests from your frontend domain:
- Update `FRONTEND_URL` environment variable
- Check CORS configuration in `backend/src/app.ts`

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Backend port | `3000` or `10000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT tokens | Generate with `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Secret for data encryption | Generate with `openssl rand -hex 32` |
| `WEBHOOK_SECRET` | Secret for webhook HMAC | Generate with `openssl rand -base64 32` |
| `SESSION_SECRET` | Secret for sessions | Generate with `openssl rand -base64 32` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.netlify.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection for caching | `redis://localhost:6379` |
| `MONGODB_URL` | MongoDB for logs | `mongodb://localhost:27017/underwriting` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASSWORD` | Email password | - |

---

## Testing the Deployment

### 1. Health Check
```bash
curl https://your-backend-url.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T...",
  "uptime": 123.45
}
```

### 2. Test Login
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@underwriting.com",
    "password": "admin123"
  }'
```

### 3. Test Frontend
Open browser → https://your-frontend-url.netlify.app
- Should see login page
- Login with default credentials
- Should see dashboard

---

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` environment variable
- Verify backend CORS allows frontend domain
- Check browser console for errors

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check database is running
- Run migrations if tables don't exist

### Build failures
- Check Node version (should be 18+)
- Clear npm cache: `npm cache clean --force`
- Check build logs for specific errors

### Authentication not working
- Verify `JWT_SECRET` is set
- Check token expiration settings
- Clear browser localStorage

---

## Production Checklist

- [ ] Database schema initialized
- [ ] Environment variables configured
- [ ] Admin password changed
- [ ] CORS properly configured
- [ ] HTTPS enabled (Netlify/Render do this automatically)
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation reviewed

---

## Monitoring & Maintenance

### Logs
- **Render**: Dashboard → Logs tab
- **Netlify**: Dashboard → Deploys → Logs

### Metrics
- Backend response times
- Database query performance
- API error rates
- User activity

### Backups
- Database: Use Render's backup feature or pg_dump
- Code: Already on GitHub

---

## Support

For deployment issues:
- Check logs in deployment platform
- Review environment variables
- Test API endpoints individually
- Check database connectivity

---

**Your AI Underwriting System is ready to deploy! 🚀**

Choose your platform and follow the steps above.
