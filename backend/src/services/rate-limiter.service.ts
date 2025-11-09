import { pool } from '../config/database';
import { redis } from '../config/database';
import logger from '../utils/logger';

export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstSize?: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Rate Limiter Service
 * Implements token bucket algorithm for rate limiting
 */
export class RateLimiterService {
  /**
   * Initialize rate limiter for a connector
   */
  static async initialize(
    connectorId: string,
    config: RateLimitConfig
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO connector_rate_limits
         (connector_id, requests_per_second, requests_per_minute,
          requests_per_hour, requests_per_day, burst_size,
          minute_reset_at, hour_reset_at, day_reset_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 minute',
                 NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 day')
         ON CONFLICT (connector_id) DO UPDATE SET
           requests_per_second = EXCLUDED.requests_per_second,
           requests_per_minute = EXCLUDED.requests_per_minute,
           requests_per_hour = EXCLUDED.requests_per_hour,
           requests_per_day = EXCLUDED.requests_per_day,
           burst_size = EXCLUDED.burst_size`,
        [
          connectorId,
          config.requestsPerSecond || null,
          config.requestsPerMinute || 60,
          config.requestsPerHour || 1000,
          config.requestsPerDay || null,
          config.burstSize || 10,
        ]
      );

      logger.info(`Rate limiter initialized for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Initialize rate limiter error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if request is allowed under rate limit
   * Uses Redis for high-performance rate limiting
   */
  static async checkLimit(connectorId: string): Promise<RateLimitStatus> {
    try {
      // Get rate limit configuration
      const config = await pool.query(
        `SELECT requests_per_second, requests_per_minute, requests_per_hour,
                requests_per_day, burst_size
         FROM connector_rate_limits
         WHERE connector_id = $1`,
        [connectorId]
      );

      if (config.rows.length === 0) {
        // No rate limit configured, allow request
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          resetAt: new Date(Date.now() + 3600000),
        };
      }

      const {
        requests_per_second,
        requests_per_minute,
        requests_per_hour,
        requests_per_day,
      } = config.rows[0];

      // Check rate limits in order of strictness (second > minute > hour > day)
      if (requests_per_second) {
        const status = await this.checkRedisRateLimit(
          connectorId,
          'second',
          requests_per_second,
          1
        );
        if (!status.allowed) return status;
      }

      if (requests_per_minute) {
        const status = await this.checkRedisRateLimit(
          connectorId,
          'minute',
          requests_per_minute,
          60
        );
        if (!status.allowed) return status;
      }

      if (requests_per_hour) {
        const status = await this.checkRedisRateLimit(
          connectorId,
          'hour',
          requests_per_hour,
          3600
        );
        if (!status.allowed) return status;
      }

      if (requests_per_day) {
        const status = await this.checkRedisRateLimit(
          connectorId,
          'day',
          requests_per_day,
          86400
        );
        if (!status.allowed) return status;
      }

      // All checks passed
      return {
        allowed: true,
        limit: requests_per_minute || Infinity,
        remaining: 1,
        resetAt: new Date(Date.now() + 60000),
      };
    } catch (error) {
      logger.error(`Check rate limit error: ${error.message}`);
      // On error, allow request (fail-open)
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 3600000),
      };
    }
  }

  /**
   * Record request for rate limiting
   */
  static async recordRequest(connectorId: string): Promise<void> {
    try {
      // Increment counters for all time windows
      const windows = ['second', 'minute', 'hour', 'day'];
      const ttls = [1, 60, 3600, 86400];

      for (let i = 0; i < windows.length; i++) {
        const key = `ratelimit:${connectorId}:${windows[i]}`;
        const count = await redis.incr(key);

        // Set expiry only on first increment
        if (count === 1) {
          await redis.expire(key, ttls[i]);
        }
      }

      logger.debug(`Rate limit recorded for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Record rate limit error: ${error.message}`);
    }
  }

  /**
   * Get current rate limit status
   */
  static async getStatus(connectorId: string): Promise<{
    minute: { count: number; limit: number; remaining: number };
    hour: { count: number; limit: number; remaining: number };
    day: { count: number; limit: number; remaining: number };
  }> {
    try {
      // Get configuration
      const config = await pool.query(
        `SELECT requests_per_minute, requests_per_hour, requests_per_day
         FROM connector_rate_limits
         WHERE connector_id = $1`,
        [connectorId]
      );

      if (config.rows.length === 0) {
        return {
          minute: { count: 0, limit: Infinity, remaining: Infinity },
          hour: { count: 0, limit: Infinity, remaining: Infinity },
          day: { count: 0, limit: Infinity, remaining: Infinity },
        };
      }

      const { requests_per_minute, requests_per_hour, requests_per_day } = config.rows[0];

      // Get current counts from Redis
      const minuteCount = parseInt((await redis.get(`ratelimit:${connectorId}:minute`)) || '0');
      const hourCount = parseInt((await redis.get(`ratelimit:${connectorId}:hour`)) || '0');
      const dayCount = parseInt((await redis.get(`ratelimit:${connectorId}:day`)) || '0');

      return {
        minute: {
          count: minuteCount,
          limit: requests_per_minute || Infinity,
          remaining: Math.max(0, (requests_per_minute || Infinity) - minuteCount),
        },
        hour: {
          count: hourCount,
          limit: requests_per_hour || Infinity,
          remaining: Math.max(0, (requests_per_hour || Infinity) - hourCount),
        },
        day: {
          count: dayCount,
          limit: requests_per_day || Infinity,
          remaining: Math.max(0, (requests_per_day || Infinity) - dayCount),
        },
      };
    } catch (error) {
      logger.error(`Get rate limit status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset rate limits for a connector
   */
  static async reset(connectorId: string): Promise<void> {
    try {
      const windows = ['second', 'minute', 'hour', 'day'];

      for (const window of windows) {
        const key = `ratelimit:${connectorId}:${window}`;
        await redis.del(key);
      }

      await pool.query(
        `UPDATE connector_rate_limits
         SET
           current_minute_count = 0,
           current_hour_count = 0,
           current_day_count = 0,
           minute_reset_at = NOW() + INTERVAL '1 minute',
           hour_reset_at = NOW() + INTERVAL '1 hour',
           day_reset_at = NOW() + INTERVAL '1 day'
         WHERE connector_id = $1`,
        [connectorId]
      );

      logger.info(`Rate limits reset for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Reset rate limits error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update rate limit configuration
   */
  static async updateConfig(
    connectorId: string,
    config: Partial<RateLimitConfig>
  ): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (config.requestsPerSecond !== undefined) {
        updates.push(`requests_per_second = $${paramIndex++}`);
        values.push(config.requestsPerSecond);
      }

      if (config.requestsPerMinute !== undefined) {
        updates.push(`requests_per_minute = $${paramIndex++}`);
        values.push(config.requestsPerMinute);
      }

      if (config.requestsPerHour !== undefined) {
        updates.push(`requests_per_hour = $${paramIndex++}`);
        values.push(config.requestsPerHour);
      }

      if (config.requestsPerDay !== undefined) {
        updates.push(`requests_per_day = $${paramIndex++}`);
        values.push(config.requestsPerDay);
      }

      if (config.burstSize !== undefined) {
        updates.push(`burst_size = $${paramIndex++}`);
        values.push(config.burstSize);
      }

      if (updates.length === 0) {
        return;
      }

      values.push(connectorId);
      await pool.query(
        `UPDATE connector_rate_limits
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE connector_id = $${paramIndex}`,
        values
      );

      logger.info(`Rate limit configuration updated for connector: ${connectorId}`);
    } catch (error) {
      logger.error(`Update rate limit config error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check rate limit using Redis (sliding window)
   */
  private static async checkRedisRateLimit(
    connectorId: string,
    window: string,
    limit: number,
    windowSizeSeconds: number
  ): Promise<RateLimitStatus> {
    const key = `ratelimit:${connectorId}:${window}`;
    const currentCount = parseInt((await redis.get(key)) || '0');

    if (currentCount >= limit) {
      const ttl = await redis.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
        retryAfterMs: ttl * 1000,
      };
    }

    return {
      allowed: true,
      limit,
      remaining: limit - currentCount - 1,
      resetAt: new Date(Date.now() + windowSizeSeconds * 1000),
    };
  }
}
