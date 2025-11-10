-- Migration: Create Connector Variables System Tables (V2 - Simplified)
-- Description: Tables for storing connector executions, response data, and variable registry
-- Works with existing connectors table

-- 1. Connector Executions Table
-- Stores each execution of a connector with request/response data
CREATE TABLE IF NOT EXISTS connector_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  application_id VARCHAR(255), -- external application ID
  execution_type VARCHAR(20) NOT NULL DEFAULT 'live', -- 'live', 'test', 'manual_sample'
  request_payload JSONB, -- what was sent to the connector
  response_payload JSONB NOT NULL, -- raw response from connector
  response_status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout'
  http_status_code INTEGER,
  execution_time_ms INTEGER, -- time taken for API call
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_connector_executions_connector_id ON connector_executions(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_executions_application_id ON connector_executions(application_id);
CREATE INDEX IF NOT EXISTS idx_connector_executions_executed_at ON connector_executions(executed_at DESC);

-- 2. Connector Variables Registry Table
-- Stores discovered variables from connector responses
CREATE TABLE IF NOT EXISTS connector_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  variable_name VARCHAR(255) NOT NULL, -- e.g., 'Score', 'TotalAccounts'
  variable_path TEXT NOT NULL, -- JSON path in response, e.g., 'data.score'
  data_type VARCHAR(50) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'date', 'array', 'object'
  display_name VARCHAR(255), -- user-friendly name
  description TEXT,
  is_array BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false, -- hide from policy builder if not useful
  sample_value TEXT, -- example value from latest execution
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(connector_id, variable_name)
);

-- Create indexes for faster variable lookups
CREATE INDEX IF NOT EXISTS idx_connector_variables_connector_id ON connector_variables(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_variables_is_hidden ON connector_variables(is_hidden);

-- 3. Application Connector Data Table
-- Stores resolved connector data for each underwriting application
CREATE TABLE IF NOT EXISTS application_connector_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(255) NOT NULL, -- external application ID
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES connector_executions(id) ON DELETE SET NULL,
  data JSONB NOT NULL, -- flattened key-value pairs of variables
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id, connector_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_application_connector_data_application_id ON application_connector_data(application_id);
CREATE INDEX IF NOT EXISTS idx_application_connector_data_connector_id ON application_connector_data(connector_id);

-- 4. Policy Variable Usage Tracking Table
-- Tracks which policies use which variables (for impact analysis)
CREATE TABLE IF NOT EXISTS policy_variable_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  variable_name VARCHAR(255) NOT NULL,
  usage_count INTEGER DEFAULT 1, -- how many times used in policy
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(policy_id, connector_id, variable_name)
);

-- Create indexes for impact analysis queries
CREATE INDEX IF NOT EXISTS idx_policy_variable_usage_policy_id ON policy_variable_usage(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_variable_usage_variable ON policy_variable_usage(connector_id, variable_name);

-- Add comments for documentation
COMMENT ON TABLE connector_executions IS 'Logs each connector execution with request/response data';
COMMENT ON TABLE connector_variables IS 'Registry of all variables discovered from connector responses';
COMMENT ON TABLE application_connector_data IS 'Stores flattened connector data for each application';
COMMENT ON TABLE policy_variable_usage IS 'Tracks which policies use which connector variables';
