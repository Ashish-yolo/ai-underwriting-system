import { pool } from '../config/database';
import { redis } from '../config/database';
import { encryptData, decryptData } from '../utils/encryption';
import logger from '../utils/logger';
import axios, { AxiosRequestConfig } from 'axios';

export interface Connector {
  id: string;
  name: string;
  type: 'bureau' | 'verification' | 'database' | 'los' | 'api';
  provider?: string;
  config: any;
  is_active: boolean;
  status: 'connected' | 'failed' | 'not_tested';
  created_at: Date;
  updated_at: Date;
  last_tested_at?: Date;
}

export interface ConnectorConfig {
  api_url?: string;
  api_key?: string;
  auth_type?: 'api_key' | 'bearer' | 'basic' | 'oauth';
  timeout?: number;
  retry_count?: number;
  cache_ttl?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

/**
 * Create a new connector
 */
export const createConnector = async (
  name: string,
  type: string,
  provider: string,
  config: ConnectorConfig,
  userId: string
): Promise<Connector> => {
  try {
    // Encrypt sensitive configuration
    const encryptedConfig = encryptData(config);

    const result = await pool.query(
      `INSERT INTO connectors (name, type, provider, config, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, type, provider, is_active, status, created_at, updated_at`,
      [name, type, provider, JSON.stringify(encryptedConfig), userId]
    );

    logger.info(`Connector created: ${name} (${type})`);

    return {
      ...result.rows[0],
      config: config, // Return decrypted config
    };
  } catch (error) {
    logger.error(`Create connector error: ${error.message}`);
    throw error;
  }
};

/**
 * Get connector by ID
 */
export const getConnectorById = async (connectorId: string): Promise<Connector | null> => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, provider, config, is_active, status, created_at, updated_at, last_tested_at
       FROM connectors
       WHERE id = $1`,
      [connectorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const connector = result.rows[0];

    // Decrypt configuration
    const decryptedConfig = decryptData(connector.config);

    return {
      ...connector,
      config: decryptedConfig,
    };
  } catch (error) {
    logger.error(`Get connector error: ${error.message}`);
    throw error;
  }
};

/**
 * Get all connectors
 */
export const getAllConnectors = async (filters?: {
  type?: string;
  is_active?: boolean;
}): Promise<Connector[]> => {
  try {
    let query = `SELECT id, name, type, provider, is_active, status, created_at, updated_at, last_tested_at
                 FROM connectors WHERE 1=1`;
    const params: any[] = [];

    if (filters?.type) {
      params.push(filters.type);
      query += ` AND type = $${params.length}`;
    }

    if (filters?.is_active !== undefined) {
      params.push(filters.is_active);
      query += ` AND is_active = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    // Don't decrypt config for list view (performance)
    return result.rows;
  } catch (error) {
    logger.error(`Get all connectors error: ${error.message}`);
    throw error;
  }
};

/**
 * Update connector
 */
export const updateConnector = async (
  connectorId: string,
  updates: {
    name?: string;
    config?: ConnectorConfig;
    is_active?: boolean;
  }
): Promise<void> => {
  try {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name) {
      params.push(updates.name);
      setClauses.push(`name = $${params.length}`);
    }

    if (updates.config) {
      const encryptedConfig = encryptData(updates.config);
      params.push(JSON.stringify(encryptedConfig));
      setClauses.push(`config = $${params.length}`);
    }

    if (updates.is_active !== undefined) {
      params.push(updates.is_active);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(connectorId);
    const query = `UPDATE connectors SET ${setClauses.join(', ')}, updated_at = NOW()
                   WHERE id = $${params.length}`;

    await pool.query(query, params);

    // Clear cache
    await redis.del(`connector:${connectorId}`);

    logger.info(`Connector updated: ${connectorId}`);
  } catch (error) {
    logger.error(`Update connector error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete connector
 */
export const deleteConnector = async (connectorId: string): Promise<void> => {
  try {
    await pool.query('DELETE FROM connectors WHERE id = $1', [connectorId]);

    // Clear cache
    await redis.del(`connector:${connectorId}`);

    logger.info(`Connector deleted: ${connectorId}`);
  } catch (error) {
    logger.error(`Delete connector error: ${error.message}`);
    throw error;
  }
};

/**
 * Test connector connection
 */
export const testConnector = async (connectorId: string): Promise<{
  success: boolean;
  response_time_ms: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {
    const connector = await getConnectorById(connectorId);

    if (!connector) {
      throw new Error('Connector not found');
    }

    const config = connector.config as ConnectorConfig;

    // Make test API call
    const axiosConfig: AxiosRequestConfig = {
      method: 'GET',
      url: config.api_url,
      timeout: config.timeout || 5000,
      headers: config.headers || {},
    };

    // Add authentication
    if (config.auth_type === 'api_key' && config.api_key) {
      axiosConfig.headers['X-API-Key'] = config.api_key;
    } else if (config.auth_type === 'bearer' && config.api_key) {
      axiosConfig.headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    const response = await axios(axiosConfig);

    const responseTime = Date.now() - startTime;

    // Update connector status
    await pool.query(
      `UPDATE connectors SET status = 'connected', last_tested_at = NOW()
       WHERE id = $1`,
      [connectorId]
    );

    // Log success
    await logConnectorCall(connectorId, {}, response.data, response.status, null, responseTime);

    logger.info(`Connector test successful: ${connector.name}`);

    return {
      success: true,
      response_time_ms: responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Update connector status
    await pool.query(
      `UPDATE connectors SET status = 'failed', last_tested_at = NOW()
       WHERE id = $1`,
      [connectorId]
    );

    // Log failure
    await logConnectorCall(connectorId, {}, null, 0, error.message, responseTime);

    logger.error(`Connector test failed: ${error.message}`);

    return {
      success: false,
      response_time_ms: responseTime,
      error: error.message,
    };
  }
};

/**
 * Call connector API
 */
export const callConnector = async (
  connectorId: string,
  params: Record<string, any>,
  cacheEnabled: boolean = true
): Promise<any> => {
  const startTime = Date.now();

  try {
    // Check cache first
    if (cacheEnabled) {
      const cacheKey = `connector:${connectorId}:${JSON.stringify(params)}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info(`Connector cache hit: ${connectorId}`);
        return JSON.parse(cached);
      }
    }

    const connector = await getConnectorById(connectorId);

    if (!connector) {
      throw new Error('Connector not found');
    }

    if (!connector.is_active) {
      throw new Error('Connector is not active');
    }

    const config = connector.config as ConnectorConfig;

    // Build request
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: config.api_url,
      data: params,
      timeout: config.timeout || 10000,
      headers: config.headers || {},
    };

    // Add authentication
    if (config.auth_type === 'api_key' && config.api_key) {
      axiosConfig.headers['X-API-Key'] = config.api_key;
    } else if (config.auth_type === 'bearer' && config.api_key) {
      axiosConfig.headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    // Make API call with retry logic
    const maxRetries = config.retry_count || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios(axiosConfig);
        const responseTime = Date.now() - startTime;

        // Cache response
        if (cacheEnabled && config.cache_ttl) {
          const cacheKey = `connector:${connectorId}:${JSON.stringify(params)}`;
          await redis.setex(cacheKey, config.cache_ttl, JSON.stringify(response.data));
        }

        // Log success
        await logConnectorCall(connectorId, params, response.data, response.status, null, responseTime);

        logger.info(`Connector call successful: ${connector.name}`);

        return response.data;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.warn(`Connector call failed, retrying (${attempt}/${maxRetries})...`);
        }
      }
    }

    // All retries failed
    throw lastError;

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failure
    await logConnectorCall(connectorId, params, null, 0, error.message, responseTime);

    logger.error(`Connector call error: ${error.message}`);
    throw error;
  }
};

/**
 * Log connector call
 */
const logConnectorCall = async (
  connectorId: string,
  requestData: any,
  responseData: any,
  statusCode: number,
  errorMessage: string | null,
  executionTimeMs: number
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO connector_logs (connector_id, request_data, response_data, status_code, error_message, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        connectorId,
        JSON.stringify(requestData),
        responseData ? JSON.stringify(responseData) : null,
        statusCode,
        errorMessage,
        executionTimeMs,
      ]
    );
  } catch (error) {
    logger.error(`Log connector call error: ${error.message}`);
  }
};

/**
 * Get connector logs
 */
export const getConnectorLogs = async (
  connectorId: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    const result = await pool.query(
      `SELECT id, request_data, response_data, status_code, error_message, execution_time_ms, created_at
       FROM connector_logs
       WHERE connector_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [connectorId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error(`Get connector logs error: ${error.message}`);
    throw error;
  }
};

/**
 * Get connector health metrics
 */
export const getConnectorHealth = async (connectorId: string): Promise<{
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_response_time_ms: number;
  last_24h_calls: number;
}> => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status_code = 0 OR status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        AVG(execution_time_ms) as avg_response_time_ms,
        SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as last_24h_calls
       FROM connector_logs
       WHERE connector_id = $1`,
      [connectorId]
    );

    const stats = result.rows[0];
    const successRate = stats.total_calls > 0
      ? (stats.success_count / stats.total_calls) * 100
      : 0;

    return {
      total_calls: parseInt(stats.total_calls),
      success_count: parseInt(stats.success_count),
      error_count: parseInt(stats.error_count),
      success_rate: parseFloat(successRate.toFixed(2)),
      avg_response_time_ms: Math.round(parseFloat(stats.avg_response_time_ms) || 0),
      last_24h_calls: parseInt(stats.last_24h_calls),
    };
  } catch (error) {
    logger.error(`Get connector health error: ${error.message}`);
    throw error;
  }
};
