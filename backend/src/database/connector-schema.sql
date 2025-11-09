-- Enhanced Connector System Database Schema
-- This extends the existing connectors table with additional features

-- ============================================================================
-- CORE CONNECTOR MANAGEMENT
-- ============================================================================

-- Main connectors table (enhanced version)
CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bureau', 'verification', 'database', 'los', 'api', 'custom')),
  provider VARCHAR(100),
  protocol VARCHAR(50) NOT NULL DEFAULT 'rest' CHECK (protocol IN ('rest', 'soap', 'graphql', 'grpc', 'websocket')),

  -- Configuration (encrypted)
  config JSONB NOT NULL,

  -- Status management
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'not_tested' CHECK (status IN ('connected', 'failed', 'not_tested', 'degraded')),

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_tested_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT unique_connector_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_connectors_type ON connectors(type);
CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON connectors(is_active);
CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);
CREATE INDEX IF NOT EXISTS idx_connectors_protocol ON connectors(protocol);

-- ============================================================================
-- AUTHENTICATION & CREDENTIALS
-- ============================================================================

-- Connector credentials (separate table for better security)
CREATE TABLE IF NOT EXISTS connector_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('api_key', 'bearer', 'basic', 'oauth2', 'jwt', 'mtls', 'none')),

  -- Encrypted credentials
  credentials JSONB NOT NULL, -- { api_key, client_id, client_secret, token_url, refresh_token, certificate, private_key, etc }

  -- OAuth specific
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Rate limiting per credential
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_connector_auth UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_credentials_connector ON connector_credentials(connector_id);

-- ============================================================================
-- REQUEST/RESPONSE SCHEMAS
-- ============================================================================

-- Request/Response schemas for validation
CREATE TABLE IF NOT EXISTS connector_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  schema_type VARCHAR(50) NOT NULL CHECK (schema_type IN ('request', 'response')),
  schema_format VARCHAR(50) NOT NULL CHECK (schema_format IN ('json_schema', 'xml_schema', 'graphql_schema', 'protobuf')),
  schema_definition JSONB NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_schemas_connector ON connector_schemas(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_schemas_type ON connector_schemas(schema_type);

-- ============================================================================
-- DATA TRANSFORMATION
-- ============================================================================

-- Data transformation rules
CREATE TABLE IF NOT EXISTS connector_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  transformation_type VARCHAR(50) NOT NULL CHECK (transformation_type IN ('request', 'response')),

  -- Transformation rules (JSON-to-JSON mapping, field extraction, etc)
  rules JSONB NOT NULL,
  -- Example: {
  --   "mappings": [
  --     {"source": "input.user.firstName", "target": "applicant.first_name", "transform": "uppercase"},
  --     {"source": "input.user.credit", "target": "credit_score", "transform": "parseInt"}
  --   ],
  --   "filters": ["remove_pii", "sanitize_html"]
  -- }

  execution_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_transformations_connector ON connector_transformations(connector_id);

-- ============================================================================
-- LOGGING & MONITORING
-- ============================================================================

-- Enhanced connector logs
CREATE TABLE IF NOT EXISTS connector_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Request details
  request_method VARCHAR(10),
  request_url TEXT,
  request_headers JSONB,
  request_data JSONB,

  -- Response details
  response_data JSONB,
  response_headers JSONB,
  status_code INTEGER,

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),
  error_stack TEXT,

  -- Performance metrics
  execution_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,

  -- Caching
  cache_hit BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Partitioning hint for large datasets
  PARTITION BY RANGE (created_at)
);

CREATE INDEX IF NOT EXISTS idx_connector_logs_connector ON connector_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_logs_created_at ON connector_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_logs_status ON connector_logs(status_code);

-- ============================================================================
-- RATE LIMITING
-- ============================================================================

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS connector_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Rate limit configuration
  requests_per_second INTEGER,
  requests_per_minute INTEGER,
  requests_per_hour INTEGER,
  requests_per_day INTEGER,

  -- Burst allowance
  burst_size INTEGER DEFAULT 10,

  -- Current usage (reset periodically)
  current_minute_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,

  -- Reset timestamps
  minute_reset_at TIMESTAMP WITH TIME ZONE,
  hour_reset_at TIMESTAMP WITH TIME ZONE,
  day_reset_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_connector_rate_limit UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_rate_limits_connector ON connector_rate_limits(connector_id);

-- ============================================================================
-- CIRCUIT BREAKER
-- ============================================================================

-- Circuit breaker state management
CREATE TABLE IF NOT EXISTS connector_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Circuit state
  state VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),

  -- Thresholds
  failure_threshold INTEGER DEFAULT 5, -- Open after N failures
  success_threshold INTEGER DEFAULT 2, -- Close after N successes in half-open
  timeout_duration_ms INTEGER DEFAULT 60000, -- Time before trying half-open

  -- Counters
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,

  -- Timestamps
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  half_opened_at TIMESTAMP WITH TIME ZONE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_connector_circuit_breaker UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_circuit_breakers_connector ON connector_circuit_breakers(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_circuit_breakers_state ON connector_circuit_breakers(state);

-- ============================================================================
-- HEALTH MONITORING
-- ============================================================================

-- Connector health metrics (aggregated)
CREATE TABLE IF NOT EXISTS connector_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Time window
  metric_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  window_size_minutes INTEGER DEFAULT 5,

  -- Request metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  cached_requests INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms DECIMAL(10,2),
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,

  -- Error breakdown
  error_4xx_count INTEGER DEFAULT 0,
  error_5xx_count INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,

  -- Rate limiting
  rate_limited_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_health_metrics_connector ON connector_health_metrics(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_health_metrics_timestamp ON connector_health_metrics(metric_timestamp DESC);

-- ============================================================================
-- CONNECTOR DEPENDENCIES
-- ============================================================================

-- Track dependencies between connectors
CREATE TABLE IF NOT EXISTS connector_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  depends_on_connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) CHECK (dependency_type IN ('required', 'optional', 'fallback')),
  execution_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT no_self_dependency CHECK (connector_id != depends_on_connector_id),
  CONSTRAINT unique_dependency UNIQUE (connector_id, depends_on_connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_dependencies_connector ON connector_dependencies(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_dependencies_depends_on ON connector_dependencies(depends_on_connector_id);

-- ============================================================================
-- WEBHOOK SUPPORT
-- ============================================================================

-- Webhook configurations for connectors
CREATE TABLE IF NOT EXISTS connector_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Webhook details
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255), -- For signature verification

  -- Events to trigger webhook
  events JSONB NOT NULL, -- ["connection.failed", "rate.limit.exceeded", "circuit.opened"]

  -- Retry configuration
  retry_count INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_webhooks_connector ON connector_webhooks(connector_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_connectors_updated_at BEFORE UPDATE ON connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_credentials_updated_at BEFORE UPDATE ON connector_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_schemas_updated_at BEFORE UPDATE ON connector_schemas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_transformations_updated_at BEFORE UPDATE ON connector_transformations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_rate_limits_updated_at BEFORE UPDATE ON connector_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_circuit_breakers_updated_at BEFORE UPDATE ON connector_circuit_breakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_webhooks_updated_at BEFORE UPDATE ON connector_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA COMMENTS
-- ============================================================================

COMMENT ON TABLE connectors IS 'Core connector registry with basic configuration';
COMMENT ON TABLE connector_credentials IS 'Secure storage for authentication credentials';
COMMENT ON TABLE connector_schemas IS 'Request/response validation schemas';
COMMENT ON TABLE connector_transformations IS 'Data transformation and mapping rules';
COMMENT ON TABLE connector_logs IS 'Comprehensive logging for all connector calls';
COMMENT ON TABLE connector_rate_limits IS 'Rate limiting configuration and tracking';
COMMENT ON TABLE connector_circuit_breakers IS 'Circuit breaker pattern implementation';
COMMENT ON TABLE connector_health_metrics IS 'Aggregated health and performance metrics';
COMMENT ON TABLE connector_dependencies IS 'Dependency graph between connectors';
COMMENT ON TABLE connector_webhooks IS 'Webhook notifications for connector events';
