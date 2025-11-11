# Fix Production Database Connection on Render

## Problem
Production login is failing with IPv6 ENETUNREACH errors. Node.js on Render is resolving the Supabase hostname to IPv6 addresses which are unreachable.

## Root Cause
- Node.js DNS resolver prefers IPv6 when available
- Render's infrastructure cannot connect to Supabase's IPv6 addresses
- Supabase pooler uses AWS load balancer which requires hostname (not direct IP)

## Solution Steps

### 1. Update DATABASE_URL on Render

Try the **direct connection** first (bypasses pooler/load balancer):

**Option 1: Direct Connection (RECOMMENDED)**
```
postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@db.glejgqtveeywjppbsxxv.supabase.co:5432/postgres
```

**Option 2: Pooler Connection (if Option 1 fails)**
```
postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

The direct connection (db.glejgqtveeywjppbsxxv.supabase.co) avoids load balancer issues that were causing ECONNREFUSED errors.

### 2. Step-by-Step Instructions

1. Go to https://dashboard.render.com
2. Select your service: `ai-underwriting-system`
3. Click on **Environment** in the left sidebar
4. Find `DATABASE_URL` variable and click **Edit**
5. Replace with the **direct connection** URL:
   ```
   postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@db.glejgqtveeywjppbsxxv.supabase.co:5432/postgres
   ```
6. **Remove DB_HOST_IPV4** if you added it
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
3. Look for: `📊 Using DATABASE_URL: aws-1-us-east-1.pooler.supabase.com:6543`
4. Look for: `✅ Connected to PostgreSQL database`

## Technical Details

The pgbouncer connection string parameter:
- Enables transaction pooling mode
- Works with Supabase's pgBouncer pooler on port 6543
- Allows external connections through AWS load balancer
- Requires hostname (not direct IP) for proper load balancing

## Why Previous Fixes Didn't Work

1. **Port 5432**: Blocked for external connections
2. **Direct IPv4 address**: Bypasses load balancer, connections refused
3. **Missing pgbouncer parameter**: Connection not properly routed
4. **`setDefaultResultOrder('ipv4first')`**: Still resolves to IPv6 on Render

The correct connection string with pgbouncer mode and port 6543 is required.
