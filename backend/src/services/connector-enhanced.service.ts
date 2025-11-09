import { pool } from '../config/database';
import { redis } from '../config/database';
import { encryptData, decryptData } from '../utils/encryption';
import logger from '../utils/logger';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RateLimiterService } from './rate-limiter.service';
import { TransformationService } from './transformation.service';
import { ProtocolHandlerService, ProtocolType } from './protocol-handler.service';

export interface EnhancedConnector {
  id: string;
  name: string;
  description?: string;
  type: 'bureau' | 'verification' | 'database' | 'los' | 'api' | 'custom';
  provider?: string;
  protocol: ProtocolType;
  config: any;
  is_active: boolean;
  status: 'connected' | 'failed' | 'not_tested' | 'degraded';
  created_at: Date;
  updated_at: Date;
  last_tested_at?: Date;
}

export interface EnhancedConnectorConfig {
  api_url: string;
  protocol?: ProtocolType;
  auth_type?: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'jwt' | 'mtls' | 'none';
  credentials?: any;
  timeout?: number;
  retry_count?: number;
  cache_ttl?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;

  // Circuit breaker config
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    successThreshold?: number;
    timeoutDurationMs?: number;
  };

  // Rate limit config
  rateLimit?: {
    enabled: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };

  // Transformation config
  transformation?: {
    enabled: boolean;
  };
}

/**
 * Enhanced Connector Service
 * Integrates circuit breaker, rate limiting, transformation, and multi-protocol support
 */
export class EnhancedConnectorService {
  /**
   * Create a new enhanced connector
   */
  static async createConnector(
    name: string,
    type: string,
    protocol: ProtocolType,
    config: EnhancedConnectorConfig,
    userId: string,
    description?: string,
    provider?: string
  ): Promise<EnhancedConnector> {
    try {
      // Encrypt sensitive configuration
      const encryptedConfig = encryptData(config);

      const result = await pool.query(
        `INSERT INTO connectors (name, description, type, provider, protocol, config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, description, type, provider, protocol, is_active, status, created_at, updated_at`,
        [name, description || null, type, provider || null, protocol, JSON.stringify(encryptedConfig), userId]
      );

      const connectorId = result.rows[0].id;

      // Initialize circuit breaker if enabled
      if (config.circuitBreaker?.enabled) {
        await CircuitBreakerService.initialize(connectorId, {
          failureThreshold: config.circuitBreaker.failureThreshold,
          successThreshold: config.circuitBreaker.successThreshold,
          timeoutDurationMs: config.circuitBreaker.timeoutDurationMs,
        });
      }

      // Initialize rate limiter if enabled
      if (config.rateLimit?.enabled) {
        await RateLimiterService.initialize(connectorId, {
          requestsPerSecond: config.rateLimit.requestsPerSecond,
          requestsPerMinute: config.rateLimit.requestsPerMinute,
          requestsPerHour: config.rateLimit.requestsPerHour,
          requestsPerDay: config.rateLimit.requestsPerDay,
        });
      }

      logger.info(`Enhanced connector created: ${name} (${type}, ${protocol})`);

      return {
        ...result.rows[0],
        config: config, // Return decrypted config
      };
    } catch (error) {
      logger.error(`Create enhanced connector error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute connector call with all enhancements
   */
  static async executeConnector(
    connectorId: string,
    requestData: any,
    options?: {
      skipCache?: boolean;
      skipTransformation?: boolean;
      skipCircuitBreaker?: boolean;
      skipRateLimit?: boolean;
    }
  ): Promise<any> {
    const startTime = Date.now();
    let transformedRequest = requestData;
    let transformedResponse: any;

    try {
      // Step 1: Get connector configuration
      const connector = await this.getConnectorById(connectorId);

      if (!connector) {
        throw new Error('Connector not found');
      }

      if (!connector.is_active) {
        throw new Error('Connector is not active');
      }

      const config = connector.config as EnhancedConnectorConfig;

      // Step 2: Check circuit breaker
      if (!options?.skipCircuitBreaker && config.circuitBreaker?.enabled) {
        const canProceed = await CircuitBreakerService.canProceed(connectorId);
        if (!canProceed) {
          throw new Error('Circuit breaker is OPEN - connector temporarily unavailable');
        }
      }

      // Step 3: Check rate limit
      if (!options?.skipRateLimit && config.rateLimit?.enabled) {
        const rateLimitStatus = await RateLimiterService.checkLimit(connectorId);
        if (!rateLimitStatus.allowed) {
          throw new Error(
            `Rate limit exceeded. Retry after ${rateLimitStatus.retryAfterMs}ms`
          );
        }
      }

      // Step 4: Check cache
      if (!options?.skipCache && config.cache_ttl) {
        const cacheKey = `connector:${connectorId}:${JSON.stringify(requestData)}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
          logger.info(`Connector cache hit: ${connectorId}`);

          // Record rate limit even for cached requests
          if (!options?.skipRateLimit && config.rateLimit?.enabled) {
            await RateLimiterService.recordRequest(connectorId);
          }

          return JSON.parse(cached);
        }
      }

      // Step 5: Transform request
      if (!options?.skipTransformation && config.transformation?.enabled) {
        transformedRequest = await TransformationService.transformRequest(
          connectorId,
          requestData
        );
        logger.debug(`Request transformation applied for connector: ${connectorId}`);
      }

      // Step 6: Build authentication headers
      const authHeaders = config.auth_type && config.credentials
        ? ProtocolHandlerService.buildAuthHeaders(config.auth_type, config.credentials)
        : {};

      // Step 7: Execute request based on protocol
      const requestOptions: any = {
        method: 'POST',
        url: config.api_url,
        headers: {
          ...config.headers,
          ...authHeaders,
        },
        data: transformedRequest,
        params: config.params,
        timeout: config.timeout || 30000,
      };

      // Handle protocol-specific options
      if (connector.protocol === 'graphql') {
        requestOptions.query = transformedRequest.query || '';
        requestOptions.variables = transformedRequest.variables || {};
      }

      const response = await ProtocolHandlerService.execute(
        connector.protocol,
        requestOptions
      );

      // Step 8: Transform response
      if (!options?.skipTransformation && config.transformation?.enabled) {
        transformedResponse = await TransformationService.transformResponse(
          connectorId,
          response.data
        );
      } else {
        transformedResponse = response.data;
      }

      // Step 9: Cache response
      if (!options?.skipCache && config.cache_ttl) {
        const cacheKey = `connector:${connectorId}:${JSON.stringify(requestData)}`;
        await redis.setex(cacheKey, config.cache_ttl, JSON.stringify(transformedResponse));
      }

      // Step 10: Record success metrics
      if (!options?.skipCircuitBreaker && config.circuitBreaker?.enabled) {
        await CircuitBreakerService.recordSuccess(connectorId);
      }

      if (!options?.skipRateLimit && config.rateLimit?.enabled) {
        await RateLimiterService.recordRequest(connectorId);
      }

      // Step 11: Log success
      await this.logConnectorCall(
        connectorId,
        requestData,
        transformedResponse,
        response.status,
        null,
        response.executionTimeMs,
        false
      );

      logger.info(`Enhanced connector call successful: ${connector.name}`);

      return transformedResponse;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      // Record failure metrics
      if (!options?.skipCircuitBreaker) {
        await CircuitBreakerService.recordFailure(connectorId).catch(err =>
          logger.error(`Failed to record circuit breaker failure: ${err.message}`)
        );
      }

      // Log failure
      await this.logConnectorCall(
        connectorId,
        requestData,
        null,
        0,
        error.message,
        executionTimeMs,
        false
      );

      logger.error(`Enhanced connector call error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test connector with all enhancements
   */
  static async testConnector(connectorId: string): Promise<{
    success: boolean;
    response_time_ms: number;
    error?: string;
    circuitBreakerStatus?: any;
    rateLimitStatus?: any;
  }> {
    const startTime = Date.now();

    try {
      const connector = await this.getConnectorById(connectorId);

      if (!connector) {
        throw new Error('Connector not found');
      }

      const config = connector.config as EnhancedConnectorConfig;

      // Build test request
      const requestOptions: any = {
        method: 'GET',
        url: config.api_url,
        headers: config.headers || {},
        timeout: config.timeout || 5000,
      };

      // Add authentication
      if (config.auth_type && config.credentials) {
        const authHeaders = ProtocolHandlerService.buildAuthHeaders(
          config.auth_type,
          config.credentials
        );
        requestOptions.headers = { ...requestOptions.headers, ...authHeaders };
      }

      // Execute test request
      const response = await ProtocolHandlerService.execute(
        connector.protocol,
        requestOptions
      );

      const responseTime = Date.now() - startTime;

      // Update connector status
      await pool.query(
        `UPDATE connectors SET status = 'connected', last_tested_at = NOW()
         WHERE id = $1`,
        [connectorId]
      );

      // Get additional status
      const circuitBreakerStatus = await CircuitBreakerService.getStatus(connectorId);
      const rateLimitStatus = await RateLimiterService.getStatus(connectorId);

      logger.info(`Enhanced connector test successful: ${connector.name}`);

      return {
        success: true,
        response_time_ms: responseTime,
        circuitBreakerStatus,
        rateLimitStatus,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update connector status
      await pool.query(
        `UPDATE connectors SET status = 'failed', last_tested_at = NOW()
         WHERE id = $1`,
        [connectorId]
      );

      logger.error(`Enhanced connector test failed: ${error.message}`);

      return {
        success: false,
        response_time_ms: responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Get connector by ID with decrypted config
   */
  static async getConnectorById(connectorId: string): Promise<EnhancedConnector | null> {
    try {
      const result = await pool.query(
        `SELECT id, name, description, type, provider, protocol, config, is_active, status,
                created_at, updated_at, last_tested_at
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
      logger.error(`Get enhanced connector error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all connectors
   */
  static async getAllConnectors(filters?: {
    type?: string;
    protocol?: string;
    is_active?: boolean;
  }): Promise<EnhancedConnector[]> {
    try {
      let query = `SELECT id, name, description, type, provider, protocol, is_active, status,
                          created_at, updated_at, last_tested_at
                   FROM connectors WHERE 1=1`;
      const params: any[] = [];

      if (filters?.type) {
        params.push(filters.type);
        query += ` AND type = $${params.length}`;
      }

      if (filters?.protocol) {
        params.push(filters.protocol);
        query += ` AND protocol = $${params.length}`;
      }

      if (filters?.is_active !== undefined) {
        params.push(filters.is_active);
        query += ` AND is_active = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error(`Get all enhanced connectors error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive connector status
   */
  static async getConnectorStatus(connectorId: string): Promise<{
    connector: EnhancedConnector | null;
    circuitBreaker: any;
    rateLimit: any;
    health: any;
    recentLogs: any[];
  }> {
    try {
      const connector = await this.getConnectorById(connectorId);
      const circuitBreaker = await CircuitBreakerService.getStatus(connectorId);
      const rateLimit = await RateLimiterService.getStatus(connectorId);
      const health = await this.getConnectorHealth(connectorId);
      const recentLogs = await this.getConnectorLogs(connectorId, 10);

      return {
        connector,
        circuitBreaker,
        rateLimit,
        health,
        recentLogs,
      };
    } catch (error) {
      logger.error(`Get connector status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log connector call with enhanced details
   */
  private static async logConnectorCall(
    connectorId: string,
    requestData: any,
    responseData: any,
    statusCode: number,
    errorMessage: string | null,
    executionTimeMs: number,
    cacheHit: boolean
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO connector_logs
         (connector_id, request_data, response_data, status_code, error_message, execution_time_ms, cache_hit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          connectorId,
          JSON.stringify(requestData),
          responseData ? JSON.stringify(responseData) : null,
          statusCode,
          errorMessage,
          executionTimeMs,
          cacheHit,
        ]
      );
    } catch (error) {
      logger.error(`Log connector call error: ${error.message}`);
    }
  }

  /**
   * Get connector logs
   */
  static async getConnectorLogs(
    connectorId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT id, request_data, response_data, status_code, error_message,
                execution_time_ms, cache_hit, created_at
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
  }

  /**
   * Get connector health metrics
   */
  static async getConnectorHealth(connectorId: string): Promise<{
    total_calls: number;
    success_count: number;
    error_count: number;
    success_rate: number;
    avg_response_time_ms: number;
    last_24h_calls: number;
    cache_hit_rate: number;
  }> {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total_calls,
          SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status_code = 0 OR status_code >= 400 THEN 1 ELSE 0 END) as error_count,
          AVG(execution_time_ms) as avg_response_time_ms,
          SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as last_24h_calls,
          SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hits
         FROM connector_logs
         WHERE connector_id = $1`,
        [connectorId]
      );

      const stats = result.rows[0];
      const totalCalls = parseInt(stats.total_calls) || 0;
      const successRate = totalCalls > 0 ? (stats.success_count / totalCalls) * 100 : 0;
      const cacheHitRate = totalCalls > 0 ? (stats.cache_hits / totalCalls) * 100 : 0;

      return {
        total_calls: totalCalls,
        success_count: parseInt(stats.success_count) || 0,
        error_count: parseInt(stats.error_count) || 0,
        success_rate: parseFloat(successRate.toFixed(2)),
        avg_response_time_ms: Math.round(parseFloat(stats.avg_response_time_ms) || 0),
        last_24h_calls: parseInt(stats.last_24h_calls) || 0,
        cache_hit_rate: parseFloat(cacheHitRate.toFixed(2)),
      };
    } catch (error) {
      logger.error(`Get connector health error: ${error.message}`);
      throw error;
    }
  }
}
