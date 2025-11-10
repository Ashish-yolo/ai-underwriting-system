-- Migration: Create Connector Variables System Tables
-- Description: Tables for storing connector executions, response data, and variable registry

-- 1. Connectors Table
-- Stores metadata about external data connectors
-- First check if table exists and add missing columns
DO $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'display_name') THEN
    ALTER TABLE connectors ADD COLUMN display_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'description') THEN
    ALTER TABLE connectors ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'connector_type') THEN
    ALTER TABLE connectors ADD COLUMN connector_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'api_endpoint') THEN
    ALTER TABLE connectors ADD COLUMN api_endpoint TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'auth_type') THEN
    ALTER TABLE connectors ADD COLUMN auth_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'is_active') THEN
    ALTER TABLE connectors ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'config') THEN
    ALTER TABLE connectors ADD COLUMN config JSONB;
  END IF;

  -- Add unique constraint on name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectors_name_key') THEN
    ALTER TABLE connectors ADD CONSTRAINT connectors_name_key UNIQUE (name);
  END IF;
END $$;

-- 2. Connector Executions Table
-- Stores each execution of a connector with request/response data
CREATE TABLE IF NOT EXISTS connector_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  application_id UUID, -- optional: link to underwriting application
  request_payload JSONB, -- what was sent to the connector
  response_payload JSONB NOT NULL, -- raw response from connector
  response_status VARCHAR(20) NOT NULL, -- 'success', 'error', 'timeout'
  http_status_code INTEGER,
  execution_time_ms INTEGER, -- time taken for API call
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_connector_executions_connector_id ON connector_executions(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_executions_application_id ON connector_executions(application_id);
CREATE INDEX IF NOT EXISTS idx_connector_executions_executed_at ON connector_executions(executed_at DESC);

-- 3. Connector Variables Registry Table
-- Stores discovered variables from connector responses
CREATE TABLE IF NOT EXISTS connector_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  variable_name VARCHAR(255) NOT NULL, -- e.g., 'Score', 'TotalAccounts'
  variable_path TEXT NOT NULL, -- JSON path in response, e.g., 'data.score'
  data_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'date', 'array', 'object'
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

-- Create index for faster variable lookups
CREATE INDEX IF NOT EXISTS idx_connector_variables_connector_id ON connector_variables(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_variables_is_hidden ON connector_variables(is_hidden);

-- 4. Application Connector Data Table
-- Stores resolved connector data for each underwriting application
CREATE TABLE IF NOT EXISTS application_connector_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL, -- link to underwriting application
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES connector_executions(id) ON DELETE SET NULL,
  data JSONB NOT NULL, -- flattened key-value pairs of variables
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id, connector_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_application_connector_data_application_id ON application_connector_data(application_id);
CREATE INDEX IF NOT EXISTS idx_application_connector_data_connector_id ON application_connector_data(connector_id);

-- 5. Policy Variable Usage Tracking Table
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

-- Create index for impact analysis queries
CREATE INDEX IF NOT EXISTS idx_policy_variable_usage_policy_id ON policy_variable_usage(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_variable_usage_variable ON policy_variable_usage(connector_id, variable_name);

-- Insert some example connectors
INSERT INTO connectors (name, display_name, description, connector_type, is_active) VALUES
  ('experian', 'Experian Credit Bureau', 'Fetch credit score and credit report from Experian', 'credit_bureau', true),
  ('cibil', 'CIBIL Credit Bureau', 'Fetch credit score and credit report from CIBIL', 'credit_bureau', true),
  ('bank_statement', 'Bank Statement Analyzer', 'Analyze bank statements for financial health', 'bank_statement', true),
  ('gst', 'GST Verification', 'Verify GST registration and return filing status', 'gst', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  connector_type = EXCLUDED.connector_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE connectors IS 'Stores metadata about external data connectors';
COMMENT ON TABLE connector_executions IS 'Logs each connector execution with request/response data';
COMMENT ON TABLE connector_variables IS 'Registry of all variables discovered from connector responses';
COMMENT ON TABLE application_connector_data IS 'Stores flattened connector data for each application';
COMMENT ON TABLE policy_variable_usage IS 'Tracks which policies use which connector variables';
