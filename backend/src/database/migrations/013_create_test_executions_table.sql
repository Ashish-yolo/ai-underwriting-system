-- Migration 013: Create test_executions table for tracking policy tests

CREATE TABLE IF NOT EXISTS test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  test_data JSONB NOT NULL,
  result JSONB NOT NULL,
  final_decision VARCHAR(50) NOT NULL CHECK (final_decision IN ('Approved', 'Rejected', 'Manual Review')),
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_executions_policy_id ON test_executions(policy_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_final_decision ON test_executions(final_decision);
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at_decision ON test_executions(created_at DESC, final_decision);

-- Add comment
COMMENT ON TABLE test_executions IS 'Tracks all policy test executions for analytics and real-time metrics';
