-- Migration: Fix Manual Reviews Table
-- Created: 2025-11-10
-- Description: Add missing columns to existing manual_reviews table

-- Add missing columns
ALTER TABLE manual_reviews
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS review_decision VARCHAR(50) CHECK (review_decision IN ('approved', 'rejected')),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS conditions JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_manual_reviews_reviewed_by ON manual_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_updated_at ON manual_reviews(updated_at);

-- Create or replace update timestamp trigger
CREATE OR REPLACE FUNCTION update_manual_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_manual_reviews_updated_at ON manual_reviews;

CREATE TRIGGER trigger_update_manual_reviews_updated_at
  BEFORE UPDATE ON manual_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_reviews_updated_at();

-- Comments
COMMENT ON COLUMN manual_reviews.reviewed_by IS 'User who reviewed and made final decision';
COMMENT ON COLUMN manual_reviews.review_decision IS 'Final decision: approved or rejected';
COMMENT ON COLUMN manual_reviews.review_notes IS 'Notes from reviewer explaining decision';
COMMENT ON COLUMN manual_reviews.approved_amount IS 'Approved loan amount (if approved)';
COMMENT ON COLUMN manual_reviews.interest_rate IS 'Approved interest rate (if approved)';
COMMENT ON COLUMN manual_reviews.conditions IS 'Additional conditions for approval (if any)';
