-- Migration: Create Manual Review Tables
-- Created: 2025-11-10
-- Description: Tables for manual review queue, activities, and workflow

-- Manual Reviews Table
CREATE TABLE IF NOT EXISTS manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(255) UNIQUE NOT NULL,
  underwriting_id UUID NOT NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,

  -- Application data
  applicant_data JSONB NOT NULL,
  execution_context JSONB,

  -- Review details
  review_reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,

  -- Review outcome
  review_decision VARCHAR(50) CHECK (review_decision IN ('approved', 'rejected')),
  review_notes TEXT,
  approved_amount DECIMAL(15, 2),
  interest_rate DECIMAL(5, 2),
  conditions JSONB,

  -- SLA tracking
  sla_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- Review Activities Table (for audit trail and comments)
CREATE TABLE IF NOT EXISTS review_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES manual_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL, -- 'assigned', 'comment', 'decision', 'status_change'
  details JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_review FOREIGN KEY (review_id) REFERENCES manual_reviews(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_reviews_status ON manual_reviews(status);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_priority ON manual_reviews(priority);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_assigned_to ON manual_reviews(assigned_to);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_created_at ON manual_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_sla_deadline ON manual_reviews(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_application_id ON manual_reviews(application_id);

CREATE INDEX IF NOT EXISTS idx_review_activities_review_id ON review_activities(review_id);
CREATE INDEX IF NOT EXISTS idx_review_activities_created_at ON review_activities(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_manual_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manual_reviews_updated_at
  BEFORE UPDATE ON manual_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_reviews_updated_at();

-- Comments
COMMENT ON TABLE manual_reviews IS 'Queue for applications requiring manual review';
COMMENT ON TABLE review_activities IS 'Audit trail and activities for manual reviews';

COMMENT ON COLUMN manual_reviews.status IS 'Current status: pending, in_review, approved, rejected';
COMMENT ON COLUMN manual_reviews.priority IS 'Review priority: urgent, high, medium, low';
COMMENT ON COLUMN manual_reviews.sla_deadline IS 'Target completion time based on priority';
COMMENT ON COLUMN manual_reviews.execution_context IS 'Workflow execution context and trace';
