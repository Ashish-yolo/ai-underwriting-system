# Fix Production Database Connection on Render

## Problem
Production login is failing with IPv6 ENETUNREACH errors because the DATABASE_URL environment variable on Render is using the wrong port.

## Root Cause
- Port **5432** is for direct PostgreSQL connections (blocked from external IPs like Render)
- Port **6543** is the Transaction Pooler/pgBouncer (designed for external connections)

## Solution Steps

### 1. Update Render Environment Variable

Go to your Render dashboard and update the DATABASE_URL:

**Current (incorrect) value:**
```
postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**New (correct) value:**
```
postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Notice:** Only the port changed from `5432` to `6543`

### 2. How to Update on Render

1. Go to https://dashboard.render.com
2. Select your service: `ai-underwriting-system`
3. Click on **Environment** in the left sidebar
4. Find the `DATABASE_URL` variable
5. Click **Edit** next to it
6. Change the port in the URL from `5432` to `6543`
7. Click **Save Changes**
8. Render will automatically redeploy your service

### 3. Verify the Fix

After Render redeploys (takes ~2-3 minutes), test the login:

```bash
curl -X POST https://ai-underwriting-system.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@underwriting.com","password":"admin123"}'
```

**Expected successful response:**
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "email": "admin@underwriting.com",
      "role": "admin"
    }
  }
}
```

### 4. Check Logs

You can also check the Render logs to confirm the connection:

1. Go to your service on Render
2. Click **Logs** in the left sidebar
3. Look for: `📊 Using DATABASE_URL: aws-1-us-east-1.pooler.supabase.com:6543 (pooler: true)`
4. Look for: `✅ Connected to PostgreSQL database`

## Technical Details

The code in `src/config/database.ts` now:
- Detects production environment via `NODE_ENV=production`
- Automatically uses port 6543 (pooler) in production
- Falls back to the hardcoded configuration with port 6543

This ensures external connections from Render work properly.

## Why Previous Fixes Didn't Work

1. **Adding `family: 4`**: Node.js pg library still resolved to IPv6
2. **Using direct IPv4 `3.227.209.82`**: Port 5432 blocks external connections
3. **Port 6543 in code only**: Render's DATABASE_URL still had port 5432

The DATABASE_URL environment variable takes precedence, so we must update it on Render.
