-- Migration: Add execution_type column to connector_executions table
-- Description: Adds execution_type field to distinguish between live, test, and manual sample executions

-- Add execution_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connector_executions' AND column_name = 'execution_type'
  ) THEN
    ALTER TABLE connector_executions ADD COLUMN execution_type VARCHAR(20) NOT NULL DEFAULT 'live';
    COMMENT ON COLUMN connector_executions.execution_type IS 'Type of execution: live, test, or manual_sample';
  END IF;
END $$;

-- Add index for execution_type for filtering
CREATE INDEX IF NOT EXISTS idx_connector_executions_execution_type ON connector_executions(execution_type);
