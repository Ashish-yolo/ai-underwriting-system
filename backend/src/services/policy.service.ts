import { pool } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  product_type: string;
  status: 'draft' | 'active' | 'archived';
  workflow_json: any;
  rules_summary?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  effective_from?: Date;
  effective_to?: Date;
}

/**
 * Create a new policy
 */
export const createPolicy = async (
  name: string,
  description: string,
  productType: string,
  workflowJson: any,
  rulesSummary: string,
  userId: string
): Promise<Policy> => {
  try {
    const result = await pool.query(
      `INSERT INTO policies (name, description, product_type, workflow_json, rules_summary, created_by, version)
       VALUES ($1, $2, $3, $4, $5, $6, '1.0')
       RETURNING *`,
      [name, description, productType, JSON.stringify(workflowJson), rulesSummary, userId]
    );

    logger.info(`Policy created: ${name}`);

    return result.rows[0];
  } catch (error) {
    logger.error(`Create policy error: ${error.message}`);
    throw error;
  }
};

/**
 * Get policy by ID
 */
export const getPolicyById = async (policyId: string): Promise<Policy | null> => {
  try {
    const result = await pool.query(
      'SELECT * FROM policies WHERE id = $1',
      [policyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const policy = result.rows[0];
    // Parse workflow_json if it's a string, otherwise use as-is
    if (typeof policy.workflow_json === 'string') {
      policy.workflow_json = JSON.parse(policy.workflow_json);
    }

    return policy;
  } catch (error) {
    logger.error(`Get policy error: ${error.message}`);
    throw error;
  }
};

/**
 * Get all policies
 */
export const getAllPolicies = async (filters?: {
  status?: string;
  product_type?: string;
}): Promise<Policy[]> => {
  try {
    let query = 'SELECT * FROM policies WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    if (filters?.product_type) {
      params.push(filters.product_type);
      query += ` AND product_type = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return result.rows.map(policy => ({
      ...policy,
      workflow_json: typeof policy.workflow_json === 'string'
        ? JSON.parse(policy.workflow_json)
        : policy.workflow_json,
    }));
  } catch (error) {
    logger.error(`Get all policies error: ${error.message}`);
    throw error;
  }
};

/**
 * Update policy
 */
export const updatePolicy = async (
  policyId: string,
  updates: {
    name?: string;
    description?: string;
    workflow_json?: any;
    rules_summary?: string;
    status?: string;
  }
): Promise<void> => {
  try {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name) {
      params.push(updates.name);
      setClauses.push(`name = $${params.length}`);
    }

    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }

    if (updates.workflow_json) {
      params.push(JSON.stringify(updates.workflow_json));
      setClauses.push(`workflow_json = $${params.length}`);
    }

    if (updates.rules_summary !== undefined) {
      params.push(updates.rules_summary);
      setClauses.push(`rules_summary = $${params.length}`);
    }

    if (updates.status) {
      params.push(updates.status);
      setClauses.push(`status = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(policyId);
    const query = `UPDATE policies SET ${setClauses.join(', ')}, updated_at = NOW()
                   WHERE id = $${params.length}`;

    await pool.query(query, params);

    logger.info(`Policy updated: ${policyId}`);
  } catch (error) {
    logger.error(`Update policy error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete policy
 */
export const deletePolicy = async (policyId: string): Promise<void> => {
  try {
    await pool.query('DELETE FROM policies WHERE id = $1', [policyId]);
    logger.info(`Policy deleted: ${policyId}`);
  } catch (error) {
    logger.error(`Delete policy error: ${error.message}`);
    throw error;
  }
};

/**
 * Create policy version (for version control)
 */
export const createPolicyVersion = async (
  policyId: string,
  version: string,
  workflowJson: any,
  changeNotes: string,
  userId: string
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO policy_versions (policy_id, version, workflow_json, change_notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [policyId, version, JSON.stringify(workflowJson), changeNotes, userId]
    );

    logger.info(`Policy version created: ${policyId} v${version}`);
  } catch (error) {
    logger.error(`Create policy version error: ${error.message}`);
    throw error;
  }
};

/**
 * Get policy versions
 */
export const getPolicyVersions = async (policyId: string): Promise<any[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM policy_versions
       WHERE policy_id = $1
       ORDER BY created_at DESC`,
      [policyId]
    );

    return result.rows.map(version => ({
      ...version,
      workflow_json: typeof version.workflow_json === 'string'
        ? JSON.parse(version.workflow_json)
        : version.workflow_json,
    }));
  } catch (error) {
    logger.error(`Get policy versions error: ${error.message}`);
    throw error;
  }
};

/**
 * Activate policy (set as active, deactivate others of same product type)
 */
export const activatePolicy = async (policyId: string): Promise<void> => {
  try {
    // Get policy
    const policy = await getPolicyById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Start transaction
    await pool.query('BEGIN');

    // Deactivate all other policies of same product type
    await pool.query(
      `UPDATE policies SET status = 'archived'
       WHERE product_type = $1 AND status = 'active' AND id != $2`,
      [policy.product_type, policyId]
    );

    // Activate this policy
    await pool.query(
      `UPDATE policies SET status = 'active', effective_from = NOW()
       WHERE id = $1`,
      [policyId]
    );

    await pool.query('COMMIT');

    logger.info(`Policy activated: ${policyId}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error(`Activate policy error: ${error.message}`);
    throw error;
  }
};

/**
 * Validate policy workflow
 */
export const validatePolicy = async (workflowJson: any, strict: boolean = false): Promise<{
  valid: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];

  try {
    const nodes = workflowJson.nodes || [];
    const edges = workflowJson.edges || [];

    // Check for start node
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
      errors.push('Workflow must have a start node');
    }

    // Only enforce decision node requirement in strict mode (for activation/publishing)
    if (strict) {
      // Check for at least one decision node
      const decisionNodes = nodes.filter((n: any) => n.type === 'decision');
      if (decisionNodes.length === 0) {
        errors.push('Workflow must have at least one decision node');
      }

      // Check for orphaned nodes
      const connectedNodes = new Set<string>();
      edges.forEach((edge: any) => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });

      const orphanedNodes = nodes.filter((n: any) =>
        n.type !== 'start' && !connectedNodes.has(n.id)
      );

      if (orphanedNodes.length > 0) {
        errors.push(`Found ${orphanedNodes.length} orphaned node(s)`);
      }

      // Check all paths lead to decision
      const hasPathToDecision = decisionNodes.length > 0;
      if (!hasPathToDecision) {
        errors.push('Not all paths lead to a decision node');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Validation error: ${error.message}`);
    return { valid: false, errors };
  }
};

/**
 * Clone policy
 */
export const clonePolicy = async (
  policyId: string,
  newName: string,
  userId: string
): Promise<Policy> => {
  try {
    const original = await getPolicyById(policyId);
    if (!original) {
      throw new Error('Policy not found');
    }

    const result = await pool.query(
      `INSERT INTO policies (name, description, product_type, workflow_json, rules_summary, created_by, version, status)
       VALUES ($1, $2, $3, $4, $5, $6, '1.0', 'draft')
       RETURNING *`,
      [
        newName,
        original.description,
        original.product_type,
        JSON.stringify(original.workflow_json),
        original.rules_summary,
        userId,
      ]
    );

    logger.info(`Policy cloned: ${policyId} -> ${result.rows[0].id}`);

    return result.rows[0];
  } catch (error) {
    logger.error(`Clone policy error: ${error.message}`);
    throw error;
  }
};
