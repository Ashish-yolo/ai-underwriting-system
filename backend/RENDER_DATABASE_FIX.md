# Fix Production Database Connection on Render

## Problem
Production login is failing with IPv6 ENETUNREACH errors. Node.js on Render is resolving the Supabase hostname to IPv6 addresses which are unreachable.

## Root Cause
- Node.js DNS resolver prefers IPv6 when available
- Render's infrastructure cannot connect to Supabase's IPv6 addresses
- Standard DNS override methods (`setDefaultResultOrder`) don't work on Render's Node.js version

## Solution Steps

### 1. Update Environment Variables on Render

Go to your Render dashboard and update these environment variables:

**A. Update DATABASE_URL to use port 6543:**
- Find `DATABASE_URL` variable
- Change from: `...supabase.com:5432/postgres...`
- Change to: `...supabase.com:6543/postgres...`

**B. Add IPv4 Override:**
- Add new variable: `DB_HOST_IPV4`
- Value: `3.227.209.82`

Port 6543 is Supabase's Transaction Pooler which allows external connections.
Port 5432 is blocked for external connections.

### 2. Step-by-Step Instructions

1. Go to https://dashboard.render.com
2. Select your service: `ai-underwriting-system`
3. Click on **Environment** in the left sidebar

**Update DATABASE_URL:**
4. Find `DATABASE_URL` variable and click **Edit**
5. Change the port from `:5432` to `:6543` in the URL
6. Should look like: `postgresql://...@...supabase.com:6543/postgres?sslmode=require`

**Add DB_HOST_IPV4:**
7. Click **Add Environment Variable**
8. Enter:
   - **Key:** `DB_HOST_IPV4`
   - **Value:** `3.227.209.82`
9. Click **Save Changes**
10. Render will automatically redeploy your service

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
3. Look for: `📊 Using DB_HOST_IPV4 override: 3.227.209.82:6543`
4. Look for: `✅ Connected to PostgreSQL database`

## Technical Details

The code in `src/config/database.ts` now:
- Checks for `DB_HOST_IPV4` environment variable
- If set, uses that IPv4 address directly instead of DNS hostname
- Bypasses all DNS resolution, avoiding IPv6 completely

This ensures external connections from Render work properly.

## Why Previous Fixes Didn't Work

1. **Adding `family: 4`**: Node.js pg library still resolved to IPv6
2. **`setDefaultResultOrder('ipv4first')`**: Not supported on Render's Node.js version
3. **Async DNS resolution**: Caused pool initialization timeout

The IPv4 override environment variable bypasses DNS entirely.
