# FIX: Render Backend - PostgreSQL Connection Issue

## 🚨 CRITICAL ISSUE IDENTIFIED

**Error**: `Server started but PostgreSQL is not connected`

**Root Cause**: The `DATABASE_URL` environment variable is either:
1. Not set in Render dashboard, OR
2. Set incorrectly (wrong format/credentials)

---

## ✅ IMMEDIATE FIX

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. Find your service: **ai-underwriting-system** (or similar name)
3. Click on it

### Step 2: Add/Update Environment Variable
1. Click **Environment** tab in left sidebar
2. Look for `DATABASE_URL`
3. If it exists, click **Edit**
4. If it doesn't exist, click **Add Environment Variable**

### Step 3: Set the Correct Value

**Key**: `DATABASE_URL`

**Value**:
```
postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**IMPORTANT**: Make sure to use port **6543** (pgbouncer) for pooled connections on Render.

### Step 4: Save and Redeploy
1. Click **Save Changes**
2. Render will automatically redeploy your service
3. Wait 2-3 minutes for deployment to complete

---

## 🧪 VERIFY THE FIX

### After Redeploy Completes:

**1. Check Health Endpoint** (should work now):
```bash
curl https://ai-underwriting-system.onrender.com/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

**2. Test Login Endpoint**:
```bash
curl -X POST https://ai-underwriting-system.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@underwrite.com","password":"Admin@2024"}'
```

Expected:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "email": "admin@underwrite.com",
      ...
    }
  }
}
```

**3. Test in Browser**:
- Go to: https://underwriteu.netlify.app/login
- Enter:
  - Email: admin@underwrite.com
  - Password: Admin@2024
- Should login successfully!

---

## 📋 OTHER ENVIRONMENT VARIABLES YOU SHOULD SET

While you're in the Render Environment tab, make sure these are also set:

| Key | Value | Required? |
|-----|-------|-----------|
| `DATABASE_URL` | `postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | ✅ YES |
| `NODE_ENV` | `production` | ✅ YES |
| `JWT_SECRET` | (any random 32+ character string) | ✅ YES |
| `PORT` | `3000` | ⚠️ Optional (Render sets this automatically) |
| `REDIS_URL` | (if you want Redis in production) | ❌ Optional |

---

## 🔐 SECURITY NOTE

The DATABASE_URL contains the password in plaintext. This is normal for environment variables, but:
- ✅ Render encrypts environment variables
- ✅ Only you can see them in the dashboard
- ✅ They're not exposed in logs or public

---

## ⚡ COMMON ISSUES

### Issue: "Connection timeout" after setting DATABASE_URL
**Cause**: Supabase connection pooler has rate limits
**Fix**: Use port **6543** (pgbouncer pooling) instead of **5432** (direct)

### Issue: "Tenant or user not found"
**Cause**: Wrong credentials in DATABASE_URL
**Fix**: Double-check the connection string (copy-paste from above)

### Issue: Still can't connect after setting env var
**Cause**: Old deployment is cached
**Fix**:
1. Go to Render Dashboard → **Manual Deploy** tab
2. Click **Clear build cache & deploy**

---

## 📞 IF IT STILL DOESN'T WORK

1. **Check Render Logs**:
   - Render Dashboard → Service → **Logs** tab
   - Look for: "✅ Connected to PostgreSQL database"
   - Or errors like: "connection refused", "authentication failed"

2. **Test Supabase Connection** (from your local machine):
   ```bash
   psql "postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
   If this fails, the issue is with Supabase, not Render.

3. **Check Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard
   - Check if database is paused or has connection limits

---

## ✅ SUCCESS CHECKLIST

- [ ] Added DATABASE_URL to Render environment variables
- [ ] Render service redeployed successfully
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Login endpoint returns JWT token
- [ ] Can login via frontend at https://underwriteu.netlify.app/login
- [ ] No more "PostgreSQL is not connected" warnings in logs

---

**This is the actual issue blocking your login!** Fix this and everything will work.
