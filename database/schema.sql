-- AI Underwriting System - PostgreSQL Database Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'policy_creator', 'reviewer', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================================================
-- DATA CONNECTORS
-- ============================================================================

CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bureau', 'verification', 'database', 'los', 'api')),
  provider VARCHAR(100), -- 'CIBIL', 'Experian', 'NSDL', etc.
  config JSONB NOT NULL, -- encrypted credentials and settings
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_tested_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'not_tested' CHECK (status IN ('connected', 'failed', 'not_tested'))
);

CREATE INDEX idx_connectors_type ON connectors(type);
CREATE INDEX idx_connectors_is_active ON connectors(is_active);
CREATE INDEX idx_connectors_status ON connectors(status);

CREATE TABLE connector_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
  request_data JSONB,
  response_data JSONB,
  status_code INT,
  error_message TEXT,
  execution_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connector_logs_connector_id ON connector_logs(connector_id);
CREATE INDEX idx_connector_logs_created_at ON connector_logs(created_at);
CREATE INDEX idx_connector_logs_status_code ON connector_logs(status_code);

-- ============================================================================
-- POLICIES & WORKFLOWS
-- ============================================================================

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  product_type VARCHAR(50) DEFAULT 'personal_loan',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effective_from DATE,
  effective_to DATE,
  workflow_json JSONB NOT NULL, -- React Flow JSON
  rules_summary TEXT
);

CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_product_type ON policies(product_type);
CREATE INDEX idx_policies_created_by ON policies(created_by);
CREATE INDEX idx_policies_effective_from ON policies(effective_from);

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  workflow_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT
);

CREATE INDEX idx_policy_versions_policy_id ON policy_versions(policy_id);
CREATE INDEX idx_policy_versions_version ON policy_versions(version);

-- ============================================================================
-- TESTING
-- ============================================================================

CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  expected_decision VARCHAR(20) CHECK (expected_decision IN ('approved', 'rejected', 'manual_review')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_policy_id ON test_cases(policy_id);
CREATE INDEX idx_test_cases_created_by ON test_cases(created_by);

CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  policy_version_id UUID REFERENCES policy_versions(id),
  decision VARCHAR(20) NOT NULL,
  execution_trace JSONB,
  execution_time_ms INT,
  passed BOOLEAN,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_results_test_case_id ON test_results(test_case_id);
CREATE INDEX idx_test_results_executed_at ON test_results(executed_at);

-- ============================================================================
-- API DEPLOYMENT
-- ============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('staging', 'production')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  rate_limit INT DEFAULT 100, -- requests per minute
  last_used_at TIMESTAMP
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_policy_id ON api_keys(policy_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

CREATE TABLE api_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  application_id VARCHAR(255),
  request_data JSONB,
  response_data JSONB,
  decision VARCHAR(20),
  execution_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

CREATE INDEX idx_api_requests_api_key_id ON api_requests(api_key_id);
CREATE INDEX idx_api_requests_policy_id ON api_requests(policy_id);
CREATE INDEX idx_api_requests_application_id ON api_requests(application_id);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX idx_api_requests_decision ON api_requests(decision);

-- ============================================================================
-- MANUAL REVIEW QUEUE
-- ============================================================================

CREATE TABLE manual_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id VARCHAR(255) UNIQUE NOT NULL,
  underwriting_id UUID,
  policy_id UUID REFERENCES policies(id),
  applicant_data JSONB NOT NULL,
  execution_context JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'info_requested')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  review_reason TEXT,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewer_notes TEXT,
  final_decision VARCHAR(20),
  rejection_reason TEXT,
  additional_info_requested TEXT,
  sla_deadline TIMESTAMP,
  tags TEXT[]
);

CREATE INDEX idx_manual_reviews_status ON manual_reviews(status);
CREATE INDEX idx_manual_reviews_priority ON manual_reviews(priority);
CREATE INDEX idx_manual_reviews_assigned_to ON manual_reviews(assigned_to);
CREATE INDEX idx_manual_reviews_sla_deadline ON manual_reviews(sla_deadline);
CREATE INDEX idx_manual_reviews_application_id ON manual_reviews(application_id);

CREATE TABLE review_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES manual_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_activities_review_id ON review_activities(review_id);
CREATE INDEX idx_review_activities_user_id ON review_activities(user_id);
CREATE INDEX idx_review_activities_created_at ON review_activities(created_at);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

CREATE TABLE analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  total_applications INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  rejected_count INT DEFAULT 0,
  manual_review_count INT DEFAULT 0,
  avg_execution_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, policy_id)
);

CREATE INDEX idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX idx_analytics_summary_policy_id ON analytics_summary(policy_id);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id UUID
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- ============================================================================
-- WEBHOOKS
-- ============================================================================

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url VARCHAR(500) NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP
);

CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  application_id VARCHAR(255),
  payload JSONB,
  response_code INT,
  response_body TEXT,
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'pending')),
  attempt INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(50) NOT NULL,
  environment VARCHAR(20) NOT NULL,
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployed_by VARCHAR(100),
  notes TEXT
);

CREATE INDEX idx_deployments_environment ON deployments(environment);
CREATE INDEX idx_deployments_deployed_at ON deployments(deployed_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connectors_updated_at BEFORE UPDATE ON connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA - Default Admin User
-- ============================================================================

-- Password: admin123 (change this in production!)
-- Hashed using bcrypt with 10 rounds
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@underwriting.com', '$2b$10$rXLJqLGXPZUwJxQq7HQnxujhfKwlLbpWiZLM6lT5WQnx1lY7Hzi/u', 'System Administrator', 'admin');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE connectors IS 'External API connectors for bureaus, verification services, and databases';
COMMENT ON TABLE policies IS 'Underwriting policies with visual workflow definitions';
COMMENT ON TABLE manual_reviews IS 'Applications requiring human review with SLA tracking';
COMMENT ON TABLE api_requests IS 'Log of all underwriting API requests';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all system actions';

-- ============================================================================
-- GRANTS (adjust based on your user setup)
-- ============================================================================

-- Grant necessary permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO underwriting_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO underwriting_user;
