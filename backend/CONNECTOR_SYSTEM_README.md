# Enhanced Data Connector System

## Overview
The Enhanced Data Connector System provides a comprehensive solution for integrating external APIs and data sources into the AI Underwriting System. It supports multiple protocols, advanced resilience patterns, data transformation, and comprehensive monitoring.

## Key Features

### 1. **Multi-Protocol Support**
- REST APIs (GET, POST, PUT, DELETE, PATCH)
- SOAP/XML Web Services
- GraphQL APIs
- gRPC (placeholder for future implementation)
- WebSocket (placeholder for future implementation)

### 2. **Resilience Patterns**
- **Circuit Breaker**: Prevents cascading failures by temporarily blocking requests to failing services
  - Configurable failure threshold
  - Automatic state transitions: CLOSED → OPEN → HALF_OPEN → CLOSED
  - Timeout-based recovery

- **Rate Limiting**: Token bucket algorithm with multiple time windows
  - Per-second, per-minute, per-hour, per-day limits
  - Redis-based for high performance
  - Burst allowance support

- **Retry Logic**: Exponential backoff with configurable attempts
  - Smart retry with increasing delays
  - Circuit breaker integration

### 3. **Data Transformation**
- Field mapping with dot notation (e.g., `input.user.firstName` → `applicant.first_name`)
- Transform functions: uppercase, lowercase, trim, parseInt, parseFloat, mask, hash, etc.
- Data filters: remove_pii, remove_null, sanitize_html, flatten
- Validation rules: type checking, min/max, patterns, required fields

### 4. **Security**
- Multiple authentication methods:
  - API Key (header-based)
  - Bearer Token
  - Basic Auth
  - OAuth 2.0
  - JWT
  - mTLS (mutual TLS)
- Encrypted credential storage
- PII masking in logs

### 5. **Monitoring & Observability**
- Comprehensive logging of all requests/responses
- Health metrics:
  - Total calls, success/error counts
  - Success rate, cache hit rate
  - Average/min/max response times
  - P50, P95, P99 percentiles
- Real-time circuit breaker status
- Rate limit tracking

### 6. **Caching**
- Redis-based response caching
- Configurable TTL per connector
- Cache hit tracking

## Architecture

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│       Enhanced Connector Service            │
│  ┌────────────────────────────────────┐    │
│  │ 1. Circuit Breaker Check           │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 2. Rate Limit Check                │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 3. Cache Check                     │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 4. Request Transformation          │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 5. Protocol Handler                │    │
│  │    (REST/SOAP/GraphQL/gRPC/WS)     │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 6. Response Transformation         │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 7. Cache Response                  │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ 8. Update Metrics & Log            │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Response      │
└─────────────────┘
```

## Database Schema

### Core Tables
1. **connectors** - Main connector registry
2. **connector_credentials** - Secure credential storage
3. **connector_schemas** - Request/response validation schemas
4. **connector_transformations** - Data transformation rules
5. **connector_logs** - Comprehensive call logging
6. **connector_rate_limits** - Rate limit configuration
7. **connector_circuit_breakers** - Circuit breaker state
8. **connector_health_metrics** - Aggregated metrics
9. **connector_dependencies** - Connector dependency graph
10. **connector_webhooks** - Event notifications

## Services

### 1. CircuitBreakerService
Location: `src/services/circuit-breaker.service.ts`

Methods:
- `initialize(connectorId, config)` - Setup circuit breaker
- `canProceed(connectorId)` - Check if request allowed
- `recordSuccess(connectorId)` - Record successful call
- `recordFailure(connectorId)` - Record failed call
- `getStatus(connectorId)` - Get current state
- `reset(connectorId)` - Manually reset

### 2. RateLimiterService
Location: `src/services/rate-limiter.service.ts`

Methods:
- `initialize(connectorId, config)` - Setup rate limits
- `checkLimit(connectorId)` - Check if request allowed
- `recordRequest(connectorId)` - Increment counters
- `getStatus(connectorId)` - Get current usage
- `reset(connectorId)` - Reset counters
- `updateConfig(connectorId, config)` - Update limits

### 3. TransformationService
Location: `src/services/transformation.service.ts`

Methods:
- `createRule(connectorId, rule)` - Create transformation rule
- `getRules(connectorId, type)` - Get rules for connector
- `transformRequest(connectorId, data)` - Transform request data
- `transformResponse(connectorId, data)` - Transform response data
- `deleteRule(ruleId)` - Delete transformation rule

### 4. ProtocolHandlerService
Location: `src/services/protocol-handler.service.ts`

Methods:
- `executeREST(options)` - Execute REST request
- `executeSOAP(options)` - Execute SOAP request
- `executeGraphQL(options)` - Execute GraphQL request
- `executeGRPC(options)` - Execute gRPC request (placeholder)
- `executeWebSocket(options)` - Execute WebSocket (placeholder)
- `execute(protocol, options)` - Execute based on protocol type
- `buildAuthHeaders(authType, credentials)` - Build auth headers
- `parseResponse(data, contentType)` - Parse response by type

### 5. EnhancedConnectorService
Location: `src/services/connector-enhanced.service.ts`

Main orchestrator that integrates all services.

Methods:
- `createConnector(...)` - Create new connector
- `executeConnector(connectorId, data, options)` - Execute connector call
- `testConnector(connectorId)` - Test connection
- `getConnectorById(connectorId)` - Get connector details
- `getAllConnectors(filters)` - List connectors
- `getConnectorStatus(connectorId)` - Get comprehensive status
- `getConnectorLogs(connectorId, limit)` - Get call logs
- `getConnectorHealth(connectorId)` - Get health metrics

## API Endpoints

### Connector Management
```
POST   /api/connectors              - Create connector
GET    /api/connectors              - List connectors
GET    /api/connectors/:id          - Get connector
PUT    /api/connectors/:id          - Update connector
DELETE /api/connectors/:id          - Delete connector
POST   /api/connectors/:id/test     - Test connector
GET    /api/connectors/:id/logs     - Get logs
GET    /api/connectors/:id/health   - Get health metrics
```

### Circuit Breaker
```
GET    /api/connectors/:id/circuit-breaker        - Get status
POST   /api/connectors/:id/circuit-breaker/reset  - Reset
```

### Rate Limiting
```
GET    /api/connectors/:id/rate-limit             - Get status
POST   /api/connectors/:id/rate-limit/reset       - Reset
PUT    /api/connectors/:id/rate-limit             - Update config
```

### Transformations
```
POST   /api/connectors/:id/transformations        - Create rule
GET    /api/connectors/:id/transformations        - List rules
DELETE /api/transformations/:ruleId               - Delete rule
```

## Usage Examples

### 1. Create REST API Connector with Circuit Breaker

```typescript
const connector = await EnhancedConnectorService.createConnector(
  'Experian Credit Bureau',
  'bureau',
  'rest',
  {
    api_url: 'https://api.experian.com/credit-check',
    auth_type: 'bearer',
    credentials: {
      token: 'your-bearer-token'
    },
    timeout: 5000,
    cache_ttl: 300, // 5 minutes
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeoutDurationMs: 60000
    },
    rateLimit: {
      enabled: true,
      requestsPerMinute: 100,
      requestsPerHour: 1000
    },
    transformation: {
      enabled: true
    }
  },
  userId,
  'Credit score verification service',
  'Experian'
);
```

### 2. Create Transformation Rule

```typescript
await TransformationService.createRule(connectorId, {
  name: 'Normalize Credit Request',
  transformationType: 'request',
  rules: {
    mappings: [
      {
        source: 'applicant.firstName',
        target: 'first_name',
        transform: 'uppercase'
      },
      {
        source: 'applicant.ssn',
        target: 'social_security_number',
        transform: 'mask'
      },
      {
        source: 'loan.amount',
        target: 'requested_amount',
        transform: 'parseFloat'
      }
    ],
    filters: ['remove_pii', 'remove_null'],
    validators: [
      {
        field: 'social_security_number',
        type: 'string',
        required: true,
        pattern: '^\\d{3}-\\d{2}-\\d{4}$'
      },
      {
        field: 'requested_amount',
        type: 'number',
        required: true,
        min: 1000,
        max: 1000000
      }
    ]
  },
  executionOrder: 1,
  isActive: true
});
```

### 3. Execute Connector

```typescript
const result = await EnhancedConnectorService.executeConnector(
  connectorId,
  {
    applicant: {
      firstName: 'John',
      lastName: 'Doe',
      ssn: '123-45-6789'
    },
    loan: {
      amount: '50000',
      purpose: 'home'
    }
  },
  {
    skipCache: false,
    skipTransformation: false,
    skipCircuitBreaker: false,
    skipRateLimit: false
  }
);
```

### 4. Get Comprehensive Status

```typescript
const status = await EnhancedConnectorService.getConnectorStatus(connectorId);

console.log(status);
// {
//   connector: { id, name, type, status, ... },
//   circuitBreaker: { state: 'closed', failureCount: 2, ... },
//   rateLimit: {
//     minute: { count: 45, limit: 100, remaining: 55 },
//     hour: { count: 320, limit: 1000, remaining: 680 }
//   },
//   health: {
//     total_calls: 1234,
//     success_count: 1180,
//     error_count: 54,
//     success_rate: 95.63,
//     avg_response_time_ms: 245,
//     cache_hit_rate: 12.5
//   },
//   recentLogs: [...]
// }
```

## Migration

To apply the database schema:

```bash
# Option 1: Run migration script
psql $DATABASE_URL -f src/database/migrations/001_extend_connector_schema.sql

# Option 2: Use migration tool (if available)
npm run migrate
```

## Configuration

### Environment Variables
```env
# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

### Connector Configuration Object
```typescript
{
  api_url: string;
  protocol?: 'rest' | 'soap' | 'graphql' | 'grpc' | 'websocket';
  auth_type?: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'jwt' | 'mtls' | 'none';
  credentials?: any;
  timeout?: number;
  retry_count?: number;
  cache_ttl?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;

  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    successThreshold?: number;
    timeoutDurationMs?: number;
  };

  rateLimit?: {
    enabled: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };

  transformation?: {
    enabled: boolean;
  };
}
```

## Best Practices

1. **Always enable circuit breakers** for external APIs to prevent cascading failures
2. **Set appropriate rate limits** based on provider constraints
3. **Use caching** for frequently accessed, slowly-changing data
4. **Mask PII** in transformation rules for compliance
5. **Monitor health metrics** regularly
6. **Test connectors** after creation and periodically
7. **Use descriptive names** for connectors and transformation rules
8. **Implement proper error handling** in your application code
9. **Set reasonable timeouts** (5-30 seconds for most APIs)
10. **Use retry logic** with exponential backoff

## Troubleshooting

### Circuit Breaker Stuck OPEN
```typescript
// Check status
const status = await CircuitBreakerService.getStatus(connectorId);

// If stuck, manually reset
await CircuitBreakerService.reset(connectorId);
```

### Rate Limit Issues
```typescript
// Check current usage
const status = await RateLimiterService.getStatus(connectorId);

// Reset if needed (use carefully!)
await RateLimiterService.reset(connectorId);

// Or update limits
await RateLimiterService.updateConfig(connectorId, {
  requestsPerMinute: 200 // Increase limit
});
```

### Transformation Errors
- Check transformation rule syntax
- Verify field paths using dot notation
- Test with sample data
- Review logs for detailed error messages

## Future Enhancements

1. **Full gRPC support** with protobuf definitions
2. **WebSocket persistent connections**
3. **OAuth 2.0 automatic token refresh**
4. **Prometheus metrics export**
5. **Grafana dashboard templates**
6. **Webhook event notifications**
7. **Connector dependency resolution**
8. **A/B testing for connector strategies**
9. **Machine learning for auto-scaling rate limits**
10. **GraphQL schema validation**

## Support

For questions or issues:
1. Check logs in `connector_logs` table
2. Review health metrics
3. Verify circuit breaker and rate limit status
4. Test connector independently
5. Check network connectivity and API credentials

---

**Version**: 1.0.0
**Last Updated**: 2025-10-27
**Author**: AI Underwriting Team
