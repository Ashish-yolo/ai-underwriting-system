import { pool } from '../config/database';
import axios from 'axios';
import logger from '../utils/logger';
import {
  parseConnectorResponse,
  registerVariables,
  storeApplicationConnectorData,
} from './connector-response-parser.service';

/**
 * Connector execution types
 */
export type ExecutionType = 'live' | 'test' | 'manual_sample';

/**
 * Connector configuration interface
 */
export interface Connector {
  id: string;
  name: string;
  type: string;
  protocol: string;
  endpoint_url: string;
  auth_type?: string;
  auth_config?: any;
  headers?: any;
  timeout_ms?: number;
  retry_attempts?: number;
  is_active: boolean;
}

/**
 * Execution result interface
 */
export interface ExecutionResult {
  executionId: string;
  response: any;
  status: 'success' | 'error' | 'timeout';
  httpStatusCode?: number;
  executionTimeMs?: number;
  errorMessage?: string;
  variablesDiscovered?: number;
}

/**
 * Get connector by ID
 */
export async function getConnectorById(connectorId: string): Promise<Connector | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM connectors WHERE id = $1',
      [connectorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error: any) {
    logger.error(`Error getting connector by ID: ${error.message}`);
    throw error;
  }
}

/**
 * Get connector by name
 */
export async function getConnectorByName(name: string): Promise<Connector | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM connectors WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error: any) {
    logger.error(`Error getting connector by name: ${error.message}`);
    throw error;
  }
}

/**
 * Execute connector live (call actual API)
 */
async function executeLive(
  connector: Connector,
  requestPayload: any
): Promise<{ response: any; httpStatusCode: number; executionTimeMs: number }> {
  const startTime = Date.now();

  try {
    // Build request configuration
    const config: any = {
      method: 'POST',
      url: connector.endpoint_url,
      data: requestPayload,
      headers: {
        'Content-Type': 'application/json',
        ...(connector.headers || {}),
      },
      timeout: connector.timeout_ms || 30000,
    };

    // Add authentication
    if (connector.auth_type === 'bearer' && connector.auth_config?.token) {
      config.headers['Authorization'] = `Bearer ${connector.auth_config.token}`;
    } else if (connector.auth_type === 'api_key' && connector.auth_config?.key) {
      const headerName = connector.auth_config.header_name || 'X-API-Key';
      config.headers[headerName] = connector.auth_config.key;
    } else if (connector.auth_type === 'basic' && connector.auth_config?.username) {
      config.auth = {
        username: connector.auth_config.username,
        password: connector.auth_config.password,
      };
    }

    // Make API request
    const response = await axios(config);

    const executionTimeMs = Date.now() - startTime;

    logger.info(`Connector ${connector.name} executed successfully in ${executionTimeMs}ms`);

    return {
      response: response.data,
      httpStatusCode: response.status,
      executionTimeMs,
    };
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    if (error.response) {
      // API responded with error
      return {
        response: error.response.data,
        httpStatusCode: error.response.status,
        executionTimeMs,
      };
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      throw new Error('Request timeout');
    } else {
      // Network error or other issues
      throw error;
    }
  }
}

/**
 * Execute connector (live or test)
 */
export async function executeConnector(
  connectorId: string,
  applicationId: string | null,
  requestPayload: any,
  executionType: ExecutionType = 'live'
): Promise<ExecutionResult> {
  const client = await pool.connect();

  try {
    // Get connector configuration
    const connector = await getConnectorById(connectorId);

    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    if (!connector.is_active) {
      throw new Error(`Connector is not active: ${connector.name}`);
    }

    logger.info(`Executing connector ${connector.name} (${executionType})`);

    // Execute the connector
    const { response, httpStatusCode, executionTimeMs } = await executeLive(
      connector,
      requestPayload
    );

    // Store execution record
    await client.query('BEGIN');

    const executionResult = await client.query(
      `INSERT INTO connector_executions (
        connector_id, application_id, execution_type,
        request_payload, response_payload, response_status,
        http_status_code, execution_time_ms, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        connectorId,
        applicationId,
        executionType,
        JSON.stringify(requestPayload),
        JSON.stringify(response),
        httpStatusCode >= 200 && httpStatusCode < 300 ? 'success' : 'error',
        httpStatusCode,
        executionTimeMs,
      ]
    );

    const executionId = executionResult.rows[0].id;

    // Parse response and discover variables
    const variables = await parseConnectorResponse(connectorId, response);

    // Register variables in database
    await registerVariables(connectorId, variables);

    // Store flattened data for application
    if (applicationId) {
      await storeApplicationConnectorData(applicationId, connectorId, executionId, response);
    }

    await client.query('COMMIT');

    logger.info(`Connector execution completed: ${executionId}`);

    return {
      executionId,
      response,
      status: 'success',
      httpStatusCode,
      executionTimeMs,
      variablesDiscovered: variables.length,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    logger.error(`Connector execution failed: ${error.message}`);

    // Still store the failed execution
    const failedResult = await pool.query(
      `INSERT INTO connector_executions (
        connector_id, application_id, execution_type,
        request_payload, response_payload, response_status,
        error_message, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [
        connectorId,
        applicationId,
        executionType,
        JSON.stringify(requestPayload),
        JSON.stringify({}),
        'error',
        error.message,
      ]
    );

    return {
      executionId: failedResult.rows[0].id,
      response: {},
      status: 'error',
      errorMessage: error.message,
    };
  } finally {
    client.release();
  }
}

/**
 * Store manual sample response
 */
export async function storeManualSample(
  connectorId: string,
  requestPayload: any,
  responsePayload: any
): Promise<ExecutionResult> {
  const client = await pool.connect();

  try {
    // Get connector configuration
    const connector = await getConnectorById(connectorId);

    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    logger.info(`Storing manual sample for connector ${connector.name}`);

    await client.query('BEGIN');

    // Store execution record
    const executionResult = await client.query(
      `INSERT INTO connector_executions (
        connector_id, execution_type,
        request_payload, response_payload, response_status,
        executed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id`,
      [
        connectorId,
        'manual_sample',
        JSON.stringify(requestPayload),
        JSON.stringify(responsePayload),
        'success',
      ]
    );

    const executionId = executionResult.rows[0].id;

    // Parse response and discover variables
    const variables = await parseConnectorResponse(connectorId, responsePayload);

    // Register variables in database
    await registerVariables(connectorId, variables);

    await client.query('COMMIT');

    logger.info(`Manual sample stored: ${executionId}`);

    return {
      executionId,
      response: responsePayload,
      status: 'success',
      variablesDiscovered: variables.length,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error(`Failed to store manual sample: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get execution history for a connector
 */
export async function getExecutionHistory(
  connectorId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM connector_executions
       WHERE connector_id = $1
       ORDER BY executed_at DESC
       LIMIT $2`,
      [connectorId, limit]
    );

    return result.rows;
  } catch (error: any) {
    logger.error(`Error getting execution history: ${error.message}`);
    throw error;
  }
}

/**
 * Get application connector data
 */
export async function getApplicationConnectorData(
  applicationId: string,
  connectorId?: string
): Promise<any> {
  try {
    let query = `
      SELECT acd.*, c.name as connector_name
      FROM application_connector_data acd
      JOIN connectors c ON c.id = acd.connector_id
      WHERE acd.application_id = $1
    `;

    const params: any[] = [applicationId];

    if (connectorId) {
      query += ' AND acd.connector_id = $2';
      params.push(connectorId);
    }

    const result = await pool.query(query, params);

    if (connectorId) {
      return result.rows[0] || null;
    }

    return result.rows;
  } catch (error: any) {
    logger.error(`Error getting application connector data: ${error.message}`);
    throw error;
  }
}
