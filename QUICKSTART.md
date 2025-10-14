# Quick Start Guide - AI Underwriting System

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- Git

### Step 1: Start the Services

```bash
cd ~/Desktop/underwriting-system

# Start PostgreSQL, MongoDB, and Redis with Docker
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose ps
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# (Frontend will be built later)
```

### Step 3: Run Database Migrations

The database schema is automatically loaded when PostgreSQL starts (see docker-compose.yml).

Verify the database:
```bash
# Connect to PostgreSQL
docker exec -it underwriting-postgres psql -U underwriting_user -d underwriting

# List tables
\dt

# Exit
\q
```

You should see 13 tables including users, policies, connectors, etc.

### Step 4: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ PostgreSQL connected
✅ MongoDB connected
✅ Redis connected
🚀 AI Underwriting System
📍 Environment: development
🌐 Server running on port 3000
```

### Step 5: Test the API

#### 1. **Health Check**
```bash
curl http://localhost:3000/health
```

#### 2. **Login (Default Admin User)**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@underwriting.com",
    "password": "admin123"
  }'
```

Save the `token` from the response.

#### 3. **Create a Connector** (Example: Mock Credit Bureau)
```bash
curl -X POST http://localhost:3000/api/connectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Mock CIBIL",
    "type": "bureau",
    "provider": "CIBIL",
    "config": {
      "api_url": "https://api.example.com/credit-score",
      "api_key": "mock-key-123",
      "auth_type": "api_key",
      "timeout": 5000,
      "cache_ttl": 3600
    }
  }'
```

#### 4. **Create a Simple Policy**
```bash
curl -X POST http://localhost:3000/api/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Basic Personal Loan Policy",
    "description": "Simple underwriting policy for personal loans",
    "product_type": "personal_loan",
    "workflow_json": {
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "data": {},
          "position": {"x": 100, "y": 100}
        },
        {
          "id": "age_check",
          "type": "condition",
          "data": {
            "config": {
              "condition": {
                "left": "age",
                "operator": ">=",
                "right": 21
              }
            }
          },
          "position": {"x": 100, "y": 200}
        },
        {
          "id": "approve",
          "type": "decision",
          "data": {
            "config": {
              "decision": "approved",
              "reason": "All criteria met"
            }
          },
          "position": {"x": 300, "y": 300}
        },
        {
          "id": "reject",
          "type": "decision",
          "data": {
            "config": {
              "decision": "rejected",
              "reason": "Age below minimum"
            }
          },
          "position": {"x": 100, "y": 400}
        }
      ],
      "edges": [
        {"id": "e1", "source": "start", "target": "age_check"},
        {"id": "e2", "source": "age_check", "target": "approve", "sourceHandle": "true"},
        {"id": "e3", "source": "age_check", "target": "reject", "sourceHandle": "false"}
      ]
    },
    "rules_summary": "Minimum age 21 years"
  }'
```

Save the `policy_id` from the response.

#### 5. **Deploy the Policy and Get API Key**
```bash
curl -X POST http://localhost:3000/api/deployment/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "policy_id": "YOUR_POLICY_ID",
    "environment": "staging"
  }'
```

Save the `api_key` from the response.

#### 6. **Test Underwriting (Approve)**
```bash
curl -X POST http://localhost:3000/api/v1/underwrite/YOUR_POLICY_ID \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "application_id": "APP_001",
    "applicant": {
      "name": "John Doe",
      "age": 30,
      "pan": "ABCDE1234F",
      "monthly_income": 50000,
      "requested_loan_amount": 500000
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "application_id": "APP_001",
  "underwriting_id": "uuid-here",
  "decision": "approved",
  "reason": "All criteria met",
  "details": {...},
  "timestamp": "2025-10-13T...",
  "execution_time_ms": 45
}
```

#### 7. **Test Underwriting (Reject)**
```bash
curl -X POST http://localhost:3000/api/v1/underwrite/YOUR_POLICY_ID \
  -H "Content-Type: application/json" \
  -H "X-API-Key": "YOUR_API_KEY" \
  -d '{
    "application_id": "APP_002",
    "applicant": {
      "name": "Jane Doe",
      "age": 18,
      "pan": "FGHIJ5678K",
      "monthly_income": 40000,
      "requested_loan_amount": 300000
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "application_id": "APP_002",
  "underwriting_id": "uuid-here",
  "decision": "rejected",
  "reason": "Age below minimum",
  ...
}
```

## 🎉 Success!

You now have a working AI Underwriting System! The system can:
- ✅ Authenticate users
- ✅ Manage data connectors
- ✅ Execute policy workflows
- ✅ Make automated decisions
- ✅ Provide REST API for LOS integration

## 📚 Next Steps

1. **Explore the API**: Check out all endpoints in the documentation
2. **Create Complex Policies**: Add more nodes (calculation, score, dataSource)
3. **Integrate with LOS**: Connect your intelligent-loan-platform
4. **Set Up Manual Review**: Configure the review queue
5. **View Analytics**: Monitor decisions and performance

## 🐛 Troubleshooting

**Database connection error:**
```bash
# Check if containers are running
docker-compose ps

# Restart services
docker-compose restart
```

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3001
```

**Reset everything:**
```bash
# Stop and remove all containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

## 📖 Documentation

- Full API Docs: `http://localhost:3000/api-docs` (when implemented)
- README: `README.md`
- Progress Tracker: `PROGRESS.md`

## 🔗 Integration with LOS

To integrate with your intelligent-loan-platform at `https://new-age-los.netlify.app`:

1. Deploy a policy to production
2. Get the API key
3. Configure webhook URL in LOS
4. Make POST requests to `/api/v1/underwrite/{policy_id}`
5. Handle webhook callbacks for decisions

See `docs/LOS_INTEGRATION.md` for detailed integration steps.

---

**Default Credentials:**
- Email: `admin@underwriting.com`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the default password immediately!

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "your-secure-password"
  }'
```
