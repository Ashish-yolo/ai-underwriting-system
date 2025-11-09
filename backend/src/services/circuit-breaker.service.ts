import { pool } from '../config/database';
import logger from '../utils/logger';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutDurationMs: number;
}

export interface CircuitBreakerStatus {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  openedAt?: Date;
  halfOpenedAt?: Date;
}

/**
 * Circuit Breaker Service
 * Implements the circuit breaker pattern to prevent cascading failures
 */
export class CircuitBreakerService {
  /**
   * Initialize circuit breaker for a connector
   */
  static async initialize(
    connectorId: string,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<void> {
    try {
      const defaultConfig = {
        failure_threshold: config?.failureThreshold || 5,
        success_threshold: config?.successThreshold || 2,
        timeout_duration_ms: config?.timeoutDurationMs || 60000,
      };

      await pool.query(
        `INSERT INTO connector_circuit_breakers
         (connector_id, failure_threshold, success_threshold, timeout_duration_ms)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (connector_id) DO UPDATE SET
           failure_threshold = EXCLUDED.failure_threshold,
           success_threshold = EXCLUDED.success_threshold,
           timeout_duration_ms = EXCLUDED.timeout_duration_ms`,
        [
          connectorId,
          defaultConfig.failure_threshold,
          defaultConfig.success_threshold,
          defaultConfig.timeout_duration_ms,
        ]
      );

      logger.info(`Circuit breaker initialized for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Initialize circuit breaker error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if request can proceed through circuit breaker
   */
  static async canProceed(connectorId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT state, opened_at, timeout_duration_ms
         FROM connector_circuit_breakers
         WHERE connector_id = $1`,
        [connectorId]
      );

      if (result.rows.length === 0) {
        // No circuit breaker configured, allow request
        return true;
      }

      const { state, opened_at, timeout_duration_ms } = result.rows[0];

      if (state === CircuitState.CLOSED) {
        return true;
      }

      if (state === CircuitState.OPEN) {
        // Check if timeout has elapsed to transition to half-open
        if (opened_at) {
          const elapsedMs = Date.now() - new Date(opened_at).getTime();
          if (elapsedMs >= timeout_duration_ms) {
            await this.transitionToHalfOpen(connectorId);
            return true;
          }
        }
        return false;
      }

      if (state === CircuitState.HALF_OPEN) {
        // Allow limited requests in half-open state
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Circuit breaker canProceed error: ${error.message}`);
      // On error, allow request to proceed (fail-open)
      return true;
    }
  }

  /**
   * Record successful request
   */
  static async recordSuccess(connectorId: string): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE connector_circuit_breakers
         SET
           success_count = success_count + 1,
           consecutive_failures = 0,
           last_success_at = NOW(),
           updated_at = NOW()
         WHERE connector_id = $1
         RETURNING state, success_count, success_threshold`,
        [connectorId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const { state, success_count, success_threshold } = result.rows[0];

      // Transition from half-open to closed if success threshold met
      if (state === CircuitState.HALF_OPEN && success_count >= success_threshold) {
        await this.transitionToClosed(connectorId);
      }

      logger.debug(`Circuit breaker recorded success for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Circuit breaker recordSuccess error: ${error.message}`);
    }
  }

  /**
   * Record failed request
   */
  static async recordFailure(connectorId: string): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE connector_circuit_breakers
         SET
           failure_count = failure_count + 1,
           consecutive_failures = consecutive_failures + 1,
           success_count = 0,
           last_failure_at = NOW(),
           updated_at = NOW()
         WHERE connector_id = $1
         RETURNING state, consecutive_failures, failure_threshold`,
        [connectorId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const { state, consecutive_failures, failure_threshold } = result.rows[0];

      // Transition to open if failure threshold exceeded
      if (
        (state === CircuitState.CLOSED || state === CircuitState.HALF_OPEN) &&
        consecutive_failures >= failure_threshold
      ) {
        await this.transitionToOpen(connectorId);
      }

      logger.debug(`Circuit breaker recorded failure for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Circuit breaker recordFailure error: ${error.message}`);
    }
  }

  /**
   * Get circuit breaker status
   */
  static async getStatus(connectorId: string): Promise<CircuitBreakerStatus | null> {
    try {
      const result = await pool.query(
        `SELECT state, failure_count, success_count, consecutive_failures,
                last_failure_at, last_success_at, opened_at, half_opened_at
         FROM connector_circuit_breakers
         WHERE connector_id = $1`,
        [connectorId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        state: row.state as CircuitState,
        failureCount: parseInt(row.failure_count),
        successCount: parseInt(row.success_count),
        consecutiveFailures: parseInt(row.consecutive_failures),
        lastFailureAt: row.last_failure_at,
        lastSuccessAt: row.last_success_at,
        openedAt: row.opened_at,
        halfOpenedAt: row.half_opened_at,
      };
    } catch (error) {
      logger.error(`Get circuit breaker status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  static async reset(connectorId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE connector_circuit_breakers
         SET
           state = $1,
           failure_count = 0,
           success_count = 0,
           consecutive_failures = 0,
           opened_at = NULL,
           half_opened_at = NULL,
           updated_at = NOW()
         WHERE connector_id = $2`,
        [CircuitState.CLOSED, connectorId]
      );

      logger.info(`Circuit breaker reset for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Reset circuit breaker error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transition to OPEN state
   */
  private static async transitionToOpen(connectorId: string): Promise<void> {
    await pool.query(
      `UPDATE connector_circuit_breakers
       SET state = $1, opened_at = NOW(), updated_at = NOW()
       WHERE connector_id = $2`,
      [CircuitState.OPEN, connectorId]
    );

    logger.warn(`Circuit breaker OPENED for connector: ${connectorId}`);

    // TODO: Trigger webhook notification
  }

  /**
   * Transition to HALF_OPEN state
   */
  private static async transitionToHalfOpen(connectorId: string): Promise<void> {
    await pool.query(
      `UPDATE connector_circuit_breakers
       SET
         state = $1,
         half_opened_at = NOW(),
         success_count = 0,
         updated_at = NOW()
       WHERE connector_id = $2`,
      [CircuitState.HALF_OPEN, connectorId]
    );

    logger.info(`Circuit breaker transitioned to HALF_OPEN for connector: ${connectorId}`);
  }

  /**
   * Transition to CLOSED state
   */
  private static async transitionToClosed(connectorId: string): Promise<void> {
    await pool.query(
      `UPDATE connector_circuit_breakers
       SET
         state = $1,
         failure_count = 0,
         success_count = 0,
         consecutive_failures = 0,
         opened_at = NULL,
         half_opened_at = NULL,
         updated_at = NOW()
       WHERE connector_id = $2`,
      [CircuitState.CLOSED, connectorId]
    );

    logger.info(`Circuit breaker CLOSED for connector: ${connectorId}`);
  }
}
