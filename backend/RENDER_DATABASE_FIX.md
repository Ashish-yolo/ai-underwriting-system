# Fix Production Database Connection on Render

## Problem
Production login is failing with IPv6 ENETUNREACH errors. Node.js on Render is resolving the Supabase hostname to IPv6 addresses which are unreachable.

## Root Cause
- Node.js DNS resolver prefers IPv6 when available
- Render's infrastructure cannot connect to Supabase's IPv6 addresses
- Standard DNS override methods (`setDefaultResultOrder`) don't work on Render's Node.js version

## Solution Steps

### 1. Add IPv4 Override Environment Variable on Render

Go to your Render dashboard and add a new environment variable:

**Variable Name:** `DB_HOST_IPV4`
**Value:** `3.227.209.82`

This forces the connection to use the IPv4 address directly, bypassing DNS resolution.

### 2. How to Add Environment Variable on Render

1. Go to https://dashboard.render.com
2. Select your service: `ai-underwriting-system`
3. Click on **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Enter:
   - **Key:** `DB_HOST_IPV4`
   - **Value:** `3.227.209.82`
6. Click **Save Changes**
7. Render will automatically redeploy your service

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
3. Look for: `📊 Using DB_HOST_IPV4 override: 3.227.209.82:5432`
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
