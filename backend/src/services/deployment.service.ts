import { pool } from '../config/database';
import logger from '../utils/logger';
import { generateApiKey, hashApiKey } from '../utils/encryption';
import { validatePolicy } from './policy.service';

export interface APIKey {
  id: string;
  key: string; // Only returned once during creation
  policy_id: string;
  environment: 'staging' | 'production';
  created_at: Date;
  expires_at?: Date;
  rate_limit: number;
}

/**
 * Generate API key for policy deployment
 */
export const generatePolicyAPIKey = async (
  policyId: string,
  environment: 'staging' | 'production',
  userId: string,
  expiresInDays?: number
): Promise<APIKey> => {
  try {
    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresInDays);
      expiresAt = expDate;
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO api_keys (key_hash, policy_id, environment, created_by, expires_at, rate_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, policy_id, environment, created_at, expires_at, rate_limit`,
      [keyHash, policyId, environment, userId, expiresAt, 100]
    );

    logger.info(`API key generated for policy: ${policyId} (${environment})`);

    return {
      ...result.rows[0],
      key: apiKey, // Only returned once
    };
  } catch (error) {
    logger.error(`Generate API key error: ${error.message}`);
    throw error;
  }
};

/**
 * Revoke API key
 */
export const revokeAPIKey = async (apiKeyId: string): Promise<void> => {
  try {
    await pool.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1',
      [apiKeyId]
    );

    logger.info(`API key revoked: ${apiKeyId}`);
  } catch (error) {
    logger.error(`Revoke API key error: ${error.message}`);
    throw error;
  }
};

/**
 * Get all API keys for a policy
 */
export const getPolicyAPIKeys = async (policyId: string): Promise<any[]> => {
  try {
    const result = await pool.query(
      `SELECT id, policy_id, environment, is_active, created_at, expires_at, rate_limit, last_used_at
       FROM api_keys
       WHERE policy_id = $1
       ORDER BY created_at DESC`,
      [policyId]
    );

    return result.rows;
  } catch (error) {
    logger.error(`Get API keys error: ${error.message}`);
    throw error;
  }
};

/**
 * Pre-deployment validation
 */
export const validateDeployment = async (policyId: string): Promise<{
  valid: boolean;
  checks: Record<string, boolean>;
  errors: string[];
}> => {
  const checks: Record<string, boolean> = {};
  const errors: string[] = [];

  try {
    // Get policy
    const policyResult = await pool.query(
      'SELECT workflow_json, status FROM policies WHERE id = $1',
      [policyId]
    );

    if (policyResult.rows.length === 0) {
      errors.push('Policy not found');
      return { valid: false, checks, errors };
    }

    const policy = policyResult.rows[0];
    const workflowJson = JSON.parse(policy.workflow_json);

    // Check 1: Workflow is valid
    const workflowValidation = await validatePolicy(workflowJson);
    checks.workflow_valid = workflowValidation.valid;
    if (!workflowValidation.valid) {
      errors.push(...workflowValidation.errors);
    }

    // Check 2: All connectors are active
    const connectorIds = extractConnectorIds(workflowJson);
    if (connectorIds.length > 0) {
      const connectorResult = await pool.query(
        `SELECT id, is_active FROM connectors WHERE id = ANY($1)`,
        [connectorIds]
      );

      const activeConnectors = connectorResult.rows.filter(c => c.is_active);
      checks.connectors_active = activeConnectors.length === connectorIds.length;

      if (!checks.connectors_active) {
        errors.push('Some connectors are not active');
      }
    } else {
      checks.connectors_active = true;
    }

    // Check 3: At least one test case exists
    const testResult = await pool.query(
      'SELECT COUNT(*) as count FROM test_cases WHERE policy_id = $1',
      [policyId]
    );
    checks.has_test_cases = parseInt(testResult.rows[0].count) > 0;
    if (!checks.has_test_cases) {
      errors.push('No test cases found for this policy');
    }

    // Check 4: Recent tests passed
    const recentTestResult = await pool.query(
      `SELECT COUNT(*) as count FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       WHERE tc.policy_id = $1 AND tr.passed = true AND tr.executed_at > NOW() - INTERVAL '7 days'`,
      [policyId]
    );
    checks.recent_tests_passed = parseInt(recentTestResult.rows[0].count) >= 3;
    if (!checks.recent_tests_passed) {
      errors.push('At least 3 successful test runs required in the last 7 days');
    }

    const isValid = Object.values(checks).every(check => check);

    return {
      valid: isValid,
      checks,
      errors,
    };
  } catch (error) {
    logger.error(`Deployment validation error: ${error.message}`);
    errors.push(`Validation error: ${error.message}`);
    return { valid: false, checks, errors };
  }
};

/**
 * Deploy policy
 */
export const deployPolicy = async (
  policyId: string,
  environment: 'staging' | 'production',
  userId: string
): Promise<{
  success: boolean;
  api_key?: string;
  endpoint_url: string;
  errors?: string[];
}> => {
  try {
    // Validate deployment
    const validation = await validateDeployment(policyId);

    if (!validation.valid) {
      return {
        success: false,
        endpoint_url: '',
        errors: validation.errors,
      };
    }

    // Generate API key
    const apiKey = await generatePolicyAPIKey(policyId, environment, userId);

    // Activate policy if production
    if (environment === 'production') {
      await pool.query(
        'UPDATE policies SET status = $1 WHERE id = $2',
        ['active', policyId]
      );
    }

    // Log deployment
    await pool.query(
      `INSERT INTO deployments (version, environment, deployed_by)
       VALUES ($1, $2, $3)`,
      ['1.0.0', environment, userId]
    );

    const endpointUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/v1/underwrite/${policyId}`;

    logger.info(`Policy deployed: ${policyId} to ${environment}`);

    return {
      success: true,
      api_key: apiKey.key,
      endpoint_url: endpointUrl,
    };
  } catch (error) {
    logger.error(`Deploy policy error: ${error.message}`);
    return {
      success: false,
      endpoint_url: '',
      errors: [error.message],
    };
  }
};

/**
 * Extract connector IDs from workflow
 */
const extractConnectorIds = (workflowJson: any): string[] => {
  const connectorIds: string[] = [];

  if (!workflowJson.nodes) {
    return connectorIds;
  }

  workflowJson.nodes.forEach((node: any) => {
    if (node.type === 'dataSource' && node.data?.config?.connector_id) {
      connectorIds.push(node.data.config.connector_id);
    }
  });

  return connectorIds;
};

/**
 * Get API key usage stats
 */
export const getAPIKeyStats = async (apiKeyId: string): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        AVG(execution_time_ms) as avg_execution_time
       FROM api_requests
       WHERE api_key_id = $1`,
      [apiKeyId]
    );

    return result.rows[0];
  } catch (error) {
    logger.error(`Get API key stats error: ${error.message}`);
    throw error;
  }
};
