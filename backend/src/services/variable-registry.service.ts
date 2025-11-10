import { pool } from '../config/database';
import logger from '../utils/logger';
import {
  parseConnectorResponse,
  registerVariables,
  DiscoveredVariable,
} from './connector-response-parser.service';

/**
 * Connector variable with metadata
 */
export interface ConnectorVariable {
  id: string;
  connectorId: string;
  variableName: string;
  variablePath: string;
  dataType: string;
  displayName: string;
  description?: string;
  isArray: boolean;
  isHidden: boolean;
  sampleValue?: string;
  discoveredAt: Date;
  lastSeenAt: Date;
}

/**
 * Get all variables for a connector
 */
export async function getConnectorVariables(
  connectorId: string,
  includeHidden: boolean = false
): Promise<ConnectorVariable[]> {
  try {
    let query = `
      SELECT * FROM connector_variables
      WHERE connector_id = $1
    `;

    const params: any[] = [connectorId];

    if (!includeHidden) {
      query += ' AND is_hidden = false';
    }

    query += ' ORDER BY variable_name ASC';

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      connectorId: row.connector_id,
      variableName: row.variable_name,
      variablePath: row.variable_path,
      dataType: row.data_type,
      displayName: row.display_name,
      description: row.description,
      isArray: row.is_array,
      isHidden: row.is_hidden,
      sampleValue: row.sample_value,
      discoveredAt: row.discovered_at,
      lastSeenAt: row.last_seen_at,
    }));
  } catch (error: any) {
    logger.error(`Error getting connector variables: ${error.message}`);
    throw error;
  }
}

/**
 * Get all available variables for policy building
 * Returns variables grouped by connector
 */
export async function getAllAvailableVariables(): Promise<
  Array<{
    connectorId: string;
    connectorName: string;
    connectorType: string;
    variables: ConnectorVariable[];
  }>
> {
  try {
    const result = await pool.query(`
      SELECT
        c.id as connector_id,
        c.name as connector_name,
        c.type as connector_type,
        cv.id,
        cv.variable_name,
        cv.variable_path,
        cv.data_type,
        cv.display_name,
        cv.description,
        cv.is_array,
        cv.is_hidden,
        cv.sample_value,
        cv.discovered_at,
        cv.last_seen_at
      FROM connectors c
      LEFT JOIN connector_variables cv ON cv.connector_id = c.id AND cv.is_hidden = false
      WHERE c.is_active = true
      ORDER BY c.name, cv.variable_name
    `);

    // Group by connector
    const connectorMap = new Map<
      string,
      {
        connectorId: string;
        connectorName: string;
        connectorType: string;
        variables: ConnectorVariable[];
      }
    >();

    for (const row of result.rows) {
      if (!connectorMap.has(row.connector_id)) {
        connectorMap.set(row.connector_id, {
          connectorId: row.connector_id,
          connectorName: row.connector_name,
          connectorType: row.connector_type,
          variables: [],
        });
      }

      if (row.id) {
        // Variable exists
        connectorMap.get(row.connector_id)!.variables.push({
          id: row.id,
          connectorId: row.connector_id,
          variableName: row.variable_name,
          variablePath: row.variable_path,
          dataType: row.data_type,
          displayName: row.display_name,
          description: row.description,
          isArray: row.is_array,
          isHidden: row.is_hidden,
          sampleValue: row.sample_value,
          discoveredAt: row.discovered_at,
          lastSeenAt: row.last_seen_at,
        });
      }
    }

    return Array.from(connectorMap.values());
  } catch (error: any) {
    logger.error(`Error getting all available variables: ${error.message}`);
    throw error;
  }
}

/**
 * Update variable metadata
 */
export async function updateVariableMetadata(
  variableId: string,
  updates: {
    displayName?: string;
    description?: string;
    isHidden?: boolean;
  }
): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramCounter++}`);
      values.push(updates.displayName);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramCounter++}`);
      values.push(updates.description);
    }

    if (updates.isHidden !== undefined) {
      fields.push(`is_hidden = $${paramCounter++}`);
      values.push(updates.isHidden);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(variableId);

    const query = `
      UPDATE connector_variables
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter}
    `;

    await pool.query(query, values);

    logger.info(`Updated variable metadata: ${variableId}`);
  } catch (error: any) {
    logger.error(`Error updating variable metadata: ${error.message}`);
    throw error;
  }
}

/**
 * Get variable usage in policies
 */
export async function getVariableUsage(
  connectorId: string,
  variableName: string
): Promise<
  Array<{
    policyId: string;
    policyName: string;
    usageCount: number;
  }>
> {
  try {
    const result = await pool.query(
      `SELECT
        p.id as policy_id,
        p.name as policy_name,
        pvu.usage_count
      FROM policy_variable_usage pvu
      JOIN policies p ON p.id = pvu.policy_id
      WHERE pvu.connector_id = $1 AND pvu.variable_name = $2
      ORDER BY p.name`,
      [connectorId, variableName]
    );

    return result.rows.map((row) => ({
      policyId: row.policy_id,
      policyName: row.policy_name,
      usageCount: row.usage_count,
    }));
  } catch (error: any) {
    logger.error(`Error getting variable usage: ${error.message}`);
    throw error;
  }
}

/**
 * Refresh variable registry from latest execution
 */
export async function refreshVariableRegistry(connectorId: string): Promise<{
  discovered: number;
  updated: number;
}> {
  try {
    // Get the latest successful execution
    const executionResult = await pool.query(
      `SELECT response_payload
       FROM connector_executions
       WHERE connector_id = $1 AND response_status = 'success'
       ORDER BY executed_at DESC
       LIMIT 1`,
      [connectorId]
    );

    if (executionResult.rows.length === 0) {
      throw new Error('No successful executions found for this connector');
    }

    const responsePayload = executionResult.rows[0].response_payload;

    // Parse response and discover variables
    const variables = await parseConnectorResponse(connectorId, responsePayload);

    // Get existing variables
    const existingResult = await pool.query(
      'SELECT variable_name FROM connector_variables WHERE connector_id = $1',
      [connectorId]
    );

    const existingVariables = new Set(existingResult.rows.map((row) => row.variable_name));

    // Register variables (will upsert)
    await registerVariables(connectorId, variables);

    const discovered = variables.filter((v) => !existingVariables.has(v.variableName)).length;
    const updated = variables.filter((v) => existingVariables.has(v.variableName)).length;

    logger.info(`Refreshed variable registry: ${discovered} new, ${updated} updated`);

    return { discovered, updated };
  } catch (error: any) {
    logger.error(`Error refreshing variable registry: ${error.message}`);
    throw error;
  }
}

/**
 * Track variable usage in a policy
 */
export async function trackVariableUsage(
  policyId: string,
  connectorId: string,
  variableName: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO policy_variable_usage (policy_id, connector_id, variable_name, usage_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (policy_id, connector_id, variable_name)
       DO UPDATE SET
         usage_count = policy_variable_usage.usage_count + 1,
         updated_at = NOW()`,
      [policyId, connectorId, variableName]
    );

    logger.info(`Tracked variable usage: ${variableName} in policy ${policyId}`);
  } catch (error: any) {
    logger.error(`Error tracking variable usage: ${error.message}`);
    throw error;
  }
}

/**
 * Remove variable usage tracking for a policy
 */
export async function removeVariableUsageTracking(policyId: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM policy_variable_usage WHERE policy_id = $1',
      [policyId]
    );

    logger.info(`Removed variable usage tracking for policy ${policyId}`);
  } catch (error: any) {
    logger.error(`Error removing variable usage tracking: ${error.message}`);
    throw error;
  }
}
