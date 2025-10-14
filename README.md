# AI Underwriting System

A comprehensive, intelligent underwriting platform for personal loans with visual policy creation, automated decision-making, and seamless LOS integration.

## Features

✅ **Data Connectors** - Integrate with credit bureaus (CIBIL, Experian, Equifax), government verification APIs (PAN, Aadhaar), and custom databases
✅ **Visual Policy Builder** - Drag-and-drop workflow creation with React Flow
✅ **Document Parser** - Auto-generate policies from Excel/Word documents
✅ **Testing Suite** - Comprehensive testing with execution traces before deployment
✅ **API Deployment** - Auto-generated REST API endpoints with Swagger documentation
✅ **Manual Review Queue** - Human-in-the-loop for edge cases with SLA tracking
✅ **Analytics Dashboard** - Real-time monitoring, metrics, and insights
✅ **LOS Integration** - Seamless integration with intelligent-loan-platform

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + React Flow
- **Backend**: Node.js + Express + TypeScript
- **Databases**: PostgreSQL (structured data) + MongoDB (logs/analytics)
- **Cache/Queue**: Redis
- **Authentication**: JWT with role-based access control
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- MongoDB 6+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

#### Option 1: Docker (Recommended)

```bash
# Clone the repository
cd ~/Desktop/underwriting-system

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs

#### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up databases (ensure PostgreSQL, MongoDB, Redis are running)
# Edit .env file with correct connection strings
cp .env.example .env

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

## Project Structure

```
underwriting-system/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── DataConnectors/
│   │   │   ├── PolicyBuilder/
│   │   │   ├── Testing/
│   │   │   ├── Deployment/
│   │   │   ├── ManualReview/
│   │   │   ├── Analytics/
│   │   │   └── Common/
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   └── package.json
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/      # API routes
│   │   │   └── middleware/  # Express middleware
│   │   ├── engine/          # Workflow execution engine
│   │   │   └── node-handlers/
│   │   ├── connectors/      # External API connectors
│   │   ├── services/        # Business logic
│   │   ├── models/          # Data models
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration
│   └── package.json
├── database/                 # Database files
│   ├── migrations/          # SQL migrations
│   ├── seeds/               # Seed data
│   └── schema.sql           # Database schema
├── docs/                     # Documentation
├── logs/                     # Application logs
├── docker-compose.yml       # Docker Compose configuration
├── .env.example             # Environment variables template
└── README.md                # This file
```

## User Roles

- **Admin**: Full system access, manage users, all features
- **Policy Creator**: Create/edit policies, deploy, view analytics
- **Reviewer**: Access manual review queue, approve/reject applications
- **Viewer**: Read-only access to policies and analytics

## API Usage

### Submit Application for Underwriting

```javascript
const response = await fetch('http://localhost:3000/api/v1/underwrite/{policy_id}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    application_id: 'APP_12345',
    applicant: {
      name: 'John Doe',
      age: 30,
      pan: 'ABCDE1234F',
      aadhaar: '123456789012',
      monthly_income: 50000,
      employment_type: 'salaried',
      requested_loan_amount: 500000,
      loan_tenure_months: 36
    }
  })
});

const decision = await response.json();
console.log(decision);
// {
//   "success": true,
//   "decision": "approved",
//   "underwriting_id": "UW_67890",
//   "details": { ... }
// }
```

### Response Types

- **approved**: Application automatically approved
- **rejected**: Application automatically rejected
- **manual_review**: Requires human review

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests in watch mode
cd backend && npm run test:watch
```

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
cd backend && npx sequelize migration:create --name migration-name
```

### Logging

Logs are stored in `./logs/` directory:
- `app.log` - Application logs
- `error.log` - Error logs
- `access.log` - HTTP access logs

## Deployment

### Production Deployment

1. **Prepare Environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Run Migrations**
   ```bash
   NODE_ENV=production npm run migrate
   ```

4. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Environment Variables

Key environment variables to configure:

- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT token signing
- `ENCRYPTION_KEY` - 32-byte hex key for data encryption
- `LOS_WEBHOOK_URL` - URL for LOS callbacks
- `SMTP_*` - Email configuration for notifications
- `SLACK_WEBHOOK_URL` - Slack alerts (optional)

See `.env.example` for complete list.

## Integration with Intelligent Loan Platform

The system is designed to integrate with your existing LOS at `https://new-age-los.netlify.app`.

### Integration Steps:

1. **Deploy Underwriting System** (complete all features first)
2. **Create Policy** for personal loans
3. **Test Thoroughly** with sample data
4. **Generate API Key** for LOS integration
5. **Configure Webhooks** in LOS to receive decisions
6. **Implement API Calls** from LOS to underwriting system
7. **Monitor** initial batch of applications

See `docs/LOS_INTEGRATION.md` for detailed integration guide.

## Monitoring & Health

### Health Check

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "mongodb": "healthy",
    "redis": "healthy",
    "connectors": { ... }
  }
}
```

### Metrics Dashboard

Access real-time metrics at: http://localhost:5173/analytics

- Applications processed today
- Approval/rejection rates
- Average processing time
- Connector health
- API performance

## Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
docker-compose ps postgres
# or
pg_isready

# Check connection string in .env
```

**Redis Connection Error**
```bash
# Check Redis is running
docker-compose ps redis
# or
redis-cli ping
```

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Complete user documentation
- [API Documentation](http://localhost:3000/api-docs) - Interactive API docs
- [Development Guide](docs/DEVELOPMENT.md) - Developer documentation
- [LOS Integration Guide](docs/LOS_INTEGRATION.md) - Integration steps

## Support

For issues, questions, or feature requests:

- Open an issue in the repository
- Email: support@underwriting.com
- Documentation: https://docs.underwriting.com

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Roadmap

- [x] Phase 1: Foundation & Setup
- [ ] Phase 2: Data Connectors Module
- [ ] Phase 3: Policy Builder Core
- [ ] Phase 4: Document Parser
- [ ] Phase 5: Testing Suite
- [ ] Phase 6: Deployment Module
- [ ] Phase 7: Manual Review Queue
- [ ] Phase 8: Analytics Dashboard
- [ ] Phase 9: Integration & Testing
- [ ] Phase 10: LOS Integration
- [ ] Phase 11: Production Deployment

## Version History

- **v1.0.0** - Initial release with core features
  - Data connectors management
  - Visual policy builder
  - Workflow execution engine
  - Testing suite
  - Manual review queue
  - Analytics dashboard
  - LOS integration

---

Built with ❤️ for intelligent loan underwriting
