-- Migration: Extend Connector Schema
-- Description: Safely extends existing connectors table and adds new tables for enhanced features
-- Date: 2025-10-27
-- IMPORTANT: This migration preserves all existing data and functionality

BEGIN;

-- ============================================================================
-- STEP 1: Extend existing connectors table (non-breaking)
-- ============================================================================

-- Add new columns to connectors table if they don't exist
DO $$
BEGIN
  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connectors' AND column_name = 'description'
  ) THEN
    ALTER TABLE connectors ADD COLUMN description TEXT;
  END IF;

  -- Add protocol column with default 'rest'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connectors' AND column_name = 'protocol'
  ) THEN
    ALTER TABLE connectors ADD COLUMN protocol VARCHAR(50) NOT NULL DEFAULT 'rest'
      CHECK (protocol IN ('rest', 'soap', 'graphql', 'grpc', 'websocket'));
  END IF;

  -- Expand type enum to include 'custom'
  -- Note: In PostgreSQL, we can't easily modify CHECK constraints, so we'll drop and recreate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connectors' AND column_name = 'type'
  ) THEN
    -- Drop existing constraint if any
    ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_type_check;
    -- Add new constraint with expanded values
    ALTER TABLE connectors ADD CONSTRAINT connectors_type_check
      CHECK (type IN ('bureau', 'verification', 'database', 'los', 'api', 'custom'));
  END IF;

  -- Update status enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connectors' AND column_name = 'status'
  ) THEN
    ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_status_check;
    ALTER TABLE connectors ADD CONSTRAINT connectors_status_check
      CHECK (status IN ('connected', 'failed', 'not_tested', 'degraded'));
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_connectors_type ON connectors(type);
CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON connectors(is_active);
CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);
CREATE INDEX IF NOT EXISTS idx_connectors_protocol ON connectors(protocol);

-- ============================================================================
-- STEP 2: Create new tables for enhanced features
-- ============================================================================

-- Connector credentials (separate table for better security)
CREATE TABLE IF NOT EXISTS connector_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('api_key', 'bearer', 'basic', 'oauth2', 'jwt', 'mtls', 'none')),
  credentials JSONB NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_connector_auth UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_credentials_connector ON connector_credentials(connector_id);

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

-- Data transformation rules
CREATE TABLE IF NOT EXISTS connector_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  transformation_type VARCHAR(50) NOT NULL CHECK (transformation_type IN ('request', 'response')),
  rules JSONB NOT NULL,
  execution_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_transformations_connector ON connector_transformations(connector_id);

-- Extend connector_logs if it exists, or create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'connector_logs'
  ) THEN
    CREATE TABLE connector_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
      request_method VARCHAR(10),
      request_url TEXT,
      request_headers JSONB,
      request_data JSONB,
      response_data JSONB,
      response_headers JSONB,
      status_code INTEGER,
      error_message TEXT,
      error_code VARCHAR(100),
      error_stack TEXT,
      execution_time_ms INTEGER,
      retry_count INTEGER DEFAULT 0,
      cache_hit BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Add new columns to existing connector_logs table
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS request_method VARCHAR(10);
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS request_url TEXT;
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS request_headers JSONB;
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS response_headers JSONB;
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS error_stack TEXT;
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    ALTER TABLE connector_logs ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_connector_logs_connector ON connector_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_logs_created_at ON connector_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_logs_status ON connector_logs(status_code);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS connector_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  requests_per_second INTEGER,
  requests_per_minute INTEGER,
  requests_per_hour INTEGER,
  requests_per_day INTEGER,
  burst_size INTEGER DEFAULT 10,
  current_minute_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,
  minute_reset_at TIMESTAMP WITH TIME ZONE,
  hour_reset_at TIMESTAMP WITH TIME ZONE,
  day_reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_connector_rate_limit UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_rate_limits_connector ON connector_rate_limits(connector_id);

-- Circuit breaker state management
CREATE TABLE IF NOT EXISTS connector_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  state VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_threshold INTEGER DEFAULT 5,
  success_threshold INTEGER DEFAULT 2,
  timeout_duration_ms INTEGER DEFAULT 60000,
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  half_opened_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_connector_circuit_breaker UNIQUE (connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_circuit_breakers_connector ON connector_circuit_breakers(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_circuit_breakers_state ON connector_circuit_breakers(state);

-- Connector health metrics
CREATE TABLE IF NOT EXISTS connector_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  metric_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  window_size_minutes INTEGER DEFAULT 5,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  cached_requests INTEGER DEFAULT 0,
  avg_response_time_ms DECIMAL(10,2),
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  error_4xx_count INTEGER DEFAULT 0,
  error_5xx_count INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,
  rate_limited_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_health_metrics_connector ON connector_health_metrics(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_health_metrics_timestamp ON connector_health_metrics(metric_timestamp DESC);

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

-- Webhook configurations
CREATE TABLE IF NOT EXISTS connector_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255),
  events JSONB NOT NULL,
  retry_count INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_webhooks_connector ON connector_webhooks(connector_id);

-- ============================================================================
-- STEP 3: Create triggers for updated_at columns
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
DROP TRIGGER IF EXISTS update_connectors_updated_at ON connectors;
CREATE TRIGGER update_connectors_updated_at BEFORE UPDATE ON connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_credentials_updated_at ON connector_credentials;
CREATE TRIGGER update_connector_credentials_updated_at BEFORE UPDATE ON connector_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_schemas_updated_at ON connector_schemas;
CREATE TRIGGER update_connector_schemas_updated_at BEFORE UPDATE ON connector_schemas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_transformations_updated_at ON connector_transformations;
CREATE TRIGGER update_connector_transformations_updated_at BEFORE UPDATE ON connector_transformations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_rate_limits_updated_at ON connector_rate_limits;
CREATE TRIGGER update_connector_rate_limits_updated_at BEFORE UPDATE ON connector_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_circuit_breakers_updated_at ON connector_circuit_breakers;
CREATE TRIGGER update_connector_circuit_breakers_updated_at BEFORE UPDATE ON connector_circuit_breakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connector_webhooks_updated_at ON connector_webhooks;
CREATE TRIGGER update_connector_webhooks_updated_at BEFORE UPDATE ON connector_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Add table comments for documentation
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

-- ============================================================================
-- STEP 5: Migrate existing connector data (if needed)
-- ============================================================================

-- Create circuit breaker records for existing connectors
INSERT INTO connector_circuit_breakers (connector_id)
SELECT id FROM connectors
WHERE NOT EXISTS (
  SELECT 1 FROM connector_circuit_breakers WHERE connector_id = connectors.id
)
ON CONFLICT (connector_id) DO NOTHING;

-- Create rate limit records for existing connectors (default values)
INSERT INTO connector_rate_limits (
  connector_id,
  requests_per_minute,
  requests_per_hour,
  minute_reset_at,
  hour_reset_at
)
SELECT
  id,
  60, -- Default 60 req/min
  1000, -- Default 1000 req/hour
  NOW() + INTERVAL '1 minute',
  NOW() + INTERVAL '1 hour'
FROM connectors
WHERE NOT EXISTS (
  SELECT 1 FROM connector_rate_limits WHERE connector_id = connectors.id
)
ON CONFLICT (connector_id) DO NOTHING;

COMMIT;

-- Migration complete
SELECT 'Migration 001_extend_connector_schema completed successfully' AS status;
