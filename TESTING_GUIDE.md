# AI Underwriting System - Complete Testing Guide

## Date: November 10, 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [API Testing with curl](#api-testing-with-curl)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete testing procedure for the AI Underwriting System, including:
- Connector variable discovery and registration
- Policy creation with connector variables
- Policy evaluation with real connector data
- Frontend variable selector integration

---

## Prerequisites

### 1. Environment Setup

Ensure your environment is properly configured:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add:
# - DATABASE_URL
# - ENCRYPTION_KEY (run: npx ts-node src/scripts/generate-encryption-key.ts)
# - REDIS_URL
```

### 2. Database Setup

```bash
# Run migrations
cd backend
npm run migrate

# Or manually:
psql $DATABASE_URL < src/database/migrations/008_create_connector_variables_tables_v2.sql
psql $DATABASE_URL < src/database/migrations/009_add_execution_type.sql
psql $DATABASE_URL < src/database/migrations/010_encrypt_connector_credentials.sql
```

### 3. Start Services

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Ensure Redis is running
redis-server
```

---

## Backend Testing

### Test 1: Encryption System

```bash
cd backend
npx ts-node src/scripts/test-encryption.ts
```

**Expected Output:**
```
✅ Passed: 6
❌ Failed: 0
🎉 All tests passed!
```

### Test 2: Variable Discovery

Create sample connectors first:

```sql
-- In psql
INSERT INTO connectors (name, type, protocol, endpoint_url, is_active)
VALUES
  ('Experian', 'credit_bureau', 'rest', 'https://api.experian.com/v1', true),
  ('BankStatement', 'bank_analysis', 'rest', 'https://api.perfios.com/v1', true);
```

Then test variable discovery:

```bash
npx ts-node src/scripts/test-variable-discovery.ts
```

Or use the end-to-end script:

```bash
npx ts-node src/scripts/test-end-to-end.ts
```

---

## Frontend Testing

### Test 1: Variable Selector Component

1. Start the frontend: `npm run dev`
2. Navigate to Policy Builder
3. Create a new Strategy node
4. Click on the variable field
5. **Expected**: Dropdown shows all connector variables grouped by connector

### Test 2: Variable Loading

Open browser console and check for:
```javascript
// Should see API call to:
GET /api/policies/builder/variables

// Should return format:
[
  {
    connectorName: "Experian",
    variables: [
      {
        variableName: "Score",
        dataType: "number",
        sampleValue: 750,
        description: "Credit score"
      },
      ...
    ]
  }
]
```

---

## End-to-End Testing

### Complete Workflow Test

This tests the entire flow: Sample Upload → Variable Discovery → Policy Creation → Evaluation

```bash
cd backend
npx ts-node src/scripts/test-end-to-end.ts
```

**What it does:**
1. ✅ Uploads sample connector responses
2. ✅ Discovers and registers variables
3. ✅ Creates a test policy using connector variables
4. ✅ Creates a test application with connector data
5. ✅ Prepares data for policy evaluation

**Expected Output:**
```
================================================================================
AI Underwriting System - End-to-End Test
================================================================================

Step 1: Uploading Sample Connector Responses
--------------------------------------------------------------------------------
  ✓ Uploading Experian sample...
    - Execution ID: xxx
    - Variables Discovered: 10

Step 2: Verifying Variable Discovery
--------------------------------------------------------------------------------
  ✓ Total Connectors: 2
  ✓ Experian: 10 variables
    - Score (number): 750
    - TotalAccounts (number): 5
    ...

Step 3: Creating Test Policy with Connector Variables
--------------------------------------------------------------------------------
  ✓ Policy Created: E2E Test Policy - Credit Approval
    - Policy ID: xxx
    - Nodes: 3

Step 4: Testing Policy Evaluation
--------------------------------------------------------------------------------
  ✓ Test Application Created: xxx
  ✓ Connector data stored for application

================================================================================
✅ End-to-end test completed successfully
```

---

## API Testing with curl

### 1. Upload Manual Sample Response

```bash
# Get connector ID first
curl http://localhost:3000/api/connectors | jq '.[] | {id, name}'

# Upload sample
curl -X POST http://localhost:3000/api/connectors/{CONNECTOR_ID}/sample \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "requestPayload": {
      "pan": "ABCDE1234F"
    },
    "responsePayload": {
      "score": 750,
      "totalAccounts": 5,
      "delinquentAccounts": 0,
      "totalOutstanding": 125000
    }
  }'
```

**Expected Response:**
```json
{
  "executionId": "xxx",
  "status": "success",
  "variablesDiscovered": 4
}
```

### 2. Get Connector Variables

```bash
curl http://localhost:3000/api/connectors/{CONNECTOR_ID}/variables \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

**Expected Response:**
```json
{
  "connectorId": "xxx",
  "connectorName": "Experian",
  "variables": [
    {
      "id": "xxx",
      "variableName": "Score",
      "variablePath": "score",
      "dataType": "number",
      "sampleValue": 750,
      "description": null
    },
    ...
  ]
}
```

### 3. Get All Variables for Policy Builder

```bash
curl http://localhost:3000/api/policies/builder/variables \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

**Expected Response:**
```json
[
  {
    "connectorName": "Experian",
    "connectorId": "xxx",
    "variables": [
      {
        "variableName": "Score",
        "dataType": "number",
        "sampleValue": 750
      },
      ...
    ]
  }
]
```

### 4. Create Policy with Connector Variables

```bash
curl -X POST http://localhost:3000/api/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Credit Approval Policy",
    "description": "Uses Experian credit score",
    "version": "1.0.0",
    "workflow_json": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {"label": "Start"}
        },
        {
          "id": "strategy-1",
          "type": "strategy",
          "data": {
            "label": "Credit Check",
            "conditions": [
              {
                "variable": "Experian.Score",
                "operator": ">=",
                "value": "700",
                "decision": "Approved"
              }
            ]
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "strategy-1"}
      ]
    }
  }'
```

### 5. Test Policy Evaluation

```bash
# First, create application with connector data
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "policyId": "POLICY_ID",
    "applicationData": {
      "applicantName": "John Doe",
      "loanAmount": 500000
    }
  }'

# Then evaluate (assumes connector data is stored)
curl -X POST http://localhost:3000/api/policies/{POLICY_ID}/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "applicationId": "APPLICATION_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "decision": "approved",
  "reason": "All 1 strategy block(s) approved",
  "details": {
    "strategyResults": {
      "total": 1,
      "approved": 1,
      "rejected": 0,
      "manualReview": 0
    }
  },
  "executionTrace": [...],
  "totalExecutionTimeMs": 150
}
```

---

## Troubleshooting

### Issue 1: No Variables Showing in Frontend

**Symptoms:**
- Variable dropdown is empty
- Console shows "No variables found"

**Solutions:**

1. Check if sample responses are uploaded:
```bash
curl http://localhost:3000/api/policies/builder/variables \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. If empty, upload samples:
```bash
npx ts-node src/scripts/test-end-to-end.ts
```

3. Check backend logs for errors:
```bash
# Look for errors in terminal running `npm run dev`
```

### Issue 2: Policy Evaluation Fails

**Symptoms:**
- Error: "Variable not found in connector data"
- Decision is "manual_review" with error message

**Solutions:**

1. Verify connector data exists for the application:
```sql
SELECT * FROM application_connector_data WHERE application_id = 'YOUR_APP_ID';
```

2. Check variable names match exactly (case-sensitive):
```sql
SELECT variable_name FROM connector_variables WHERE connector_id = 'YOUR_CONNECTOR_ID';
```

3. Ensure connector data is stored before evaluation:
```bash
# Execute connector for application first
curl -X POST http://localhost:3000/api/connectors/{CONNECTOR_ID}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "YOUR_APP_ID",
    "requestPayload": {...}
  }'
```

### Issue 3: Encryption Key Error

**Symptoms:**
- Error: "ENCRYPTION_KEY not found"
- Backend won't start

**Solution:**
```bash
cd backend
npx ts-node src/scripts/generate-encryption-key.ts
# Copy output to .env file
# Restart backend
```

### Issue 4: Database Connection Error

**Symptoms:**
- Error: "Connection refused" or "Database not found"

**Solutions:**

1. Check PostgreSQL is running:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

2. Run migrations:
```bash
cd backend
npm run migrate
```

3. Check DATABASE_URL in .env:
```bash
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/dbname
```

### Issue 5: Variable Resolution Fails

**Symptoms:**
- Variables show in UI but policy evaluation doesn't find them
- Error in logs: "Variable X not found"

**Solutions:**

1. Check variable naming convention:
   - UI shows: `Experian.Score`
   - Database stores: `Score` (without connector name)
   - System resolves: `Experian.Score` → looks up Experian connector → finds `Score`

2. Verify connector name matches exactly:
```sql
SELECT name FROM connectors;
-- Use EXACT name in policy (case-sensitive)
```

3. Check application_connector_data has the variable:
```sql
SELECT data FROM application_connector_data
WHERE application_id = 'YOUR_APP_ID'
AND connector_id = (SELECT id FROM connectors WHERE name = 'Experian');
-- Should contain {"Score": 750, ...}
```

---

## Test Checklist

Use this checklist to verify all features:

### Backend
- [ ] Encryption system works (`test-encryption.ts`)
- [ ] Sample upload creates execution record
- [ ] Variables are discovered and registered
- [ ] Variables API returns correct format
- [ ] Policy evaluation resolves connector variables
- [ ] Workflow executor loads connector data

### Frontend
- [ ] Variable selector shows loading state
- [ ] Variables grouped by connector
- [ ] Variable search/filter works
- [ ] Variable selection updates form
- [ ] Sample values displayed correctly
- [ ] Type badges shown for each variable

### End-to-End
- [ ] Sample upload → variables discovered
- [ ] Policy creation with connector variables
- [ ] Application evaluation uses connector data
- [ ] Decision output is correct
- [ ] Execution trace includes all steps

### API
- [ ] POST /api/connectors/:id/sample works
- [ ] GET /api/connectors/:id/variables works
- [ ] GET /api/policies/builder/variables works
- [ ] POST /api/connectors/:id/execute works
- [ ] POST /api/policies/:id/evaluate works

---

## Performance Testing

### Load Test: Variable Discovery

```bash
# Install Apache Bench
brew install ab

# Test variable loading endpoint
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/policies/builder/variables
```

**Expected:**
- Requests per second: > 100
- Mean response time: < 100ms
- No failed requests

### Load Test: Policy Evaluation

```bash
# Test policy evaluation endpoint
ab -n 100 -c 5 -p payload.json -T application/json \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/policies/POLICY_ID/evaluate
```

Where `payload.json` contains:
```json
{
  "applicationId": "YOUR_APP_ID"
}
```

**Expected:**
- Requests per second: > 50
- Mean response time: < 500ms
- No failed requests

---

## Summary

This testing guide ensures that:

1. ✅ **Backend** correctly processes connector responses and discovers variables
2. ✅ **Frontend** displays and allows selection of connector variables
3. ✅ **Integration** between backend and frontend works seamlessly
4. ✅ **Policy Evaluation** resolves and uses connector variables correctly
5. ✅ **End-to-End** workflow from sample upload to decision works

For additional help or issues not covered here, check:
- Backend logs: `tail -f backend/logs/app.log`
- Frontend console: Browser DevTools → Console
- Database queries: Use psql or pgAdmin

---

## Next Steps

After successful testing:

1. **Production Setup**
   - Generate new encryption key for production
   - Configure production database
   - Set up proper authentication/authorization
   - Enable HTTPS/TLS

2. **Monitoring**
   - Set up logging aggregation
   - Configure error tracking (Sentry)
   - Add performance monitoring (New Relic)
   - Create alerting rules

3. **Documentation**
   - Document connector integration process
   - Create user guide for policy builders
   - Write API documentation
   - Create runbooks for common issues

4. **Optimization**
   - Add Redis caching for variables
   - Optimize database queries
   - Implement connection pooling
   - Add rate limiting

---

**Last Updated:** November 10, 2024
**Version:** 1.0.0
**Status:** ✅ Complete
