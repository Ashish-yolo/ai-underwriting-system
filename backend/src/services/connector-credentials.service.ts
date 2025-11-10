import { pool } from '../config/database';
import { encrypt, decrypt, isEncrypted } from './encryption.service';
import logger from '../utils/logger';

/**
 * Service for managing encrypted connector credentials
 * Handles authentication credentials securely using AES-256-GCM encryption
 */

export interface ConnectorCredentials {
  id: string;
  connectorId: string;
  authType: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'jwt' | 'mtls' | 'none';
  credentials: Record<string, any>; // Decrypted credentials object
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update connector credentials
 */
export async function upsertConnectorCredentials(
  connectorId: string,
  authType: string,
  credentials: Record<string, any>,
  options?: {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    rateLimitPerMinute?: number;
    rateLimitPerHour?: number;
  }
): Promise<void> {
  try {
    // Encrypt credentials
    const credentialsString = JSON.stringify(credentials);
    const credentialsEncrypted = encrypt(credentialsString);
    const accessTokenEncrypted = options?.accessToken ? encrypt(options.accessToken) : null;
    const refreshTokenEncrypted = options?.refreshToken ? encrypt(options.refreshToken) : null;

    // Upsert into database
    await pool.query(
      `INSERT INTO connector_credentials (
        connector_id, auth_type, credentials_encrypted,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        rate_limit_per_minute, rate_limit_per_hour
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (connector_id)
      DO UPDATE SET
        auth_type = EXCLUDED.auth_type,
        credentials_encrypted = EXCLUDED.credentials_encrypted,
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
        rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
        updated_at = NOW()`,
      [
        connectorId,
        authType,
        credentialsEncrypted,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        options?.tokenExpiresAt,
        options?.rateLimitPerMinute || 60,
        options?.rateLimitPerHour || 1000,
      ]
    );

    logger.info(`Connector credentials upserted for connector: ${connectorId}`);
  } catch (error: any) {
    logger.error(`Error upserting connector credentials: ${error.message}`);
    throw error;
  }
}

/**
 * Get connector credentials (decrypted)
 */
export async function getConnectorCredentials(
  connectorId: string
): Promise<ConnectorCredentials | null> {
  try {
    const result = await pool.query(
      `SELECT
        id, connector_id, auth_type,
        COALESCE(credentials_encrypted, credentials::text) as credentials_data,
        COALESCE(access_token_encrypted, access_token) as access_token_data,
        COALESCE(refresh_token_encrypted, refresh_token) as refresh_token_data,
        token_expires_at, rate_limit_per_minute, rate_limit_per_hour,
        created_at, updated_at
      FROM connector_credentials
      WHERE connector_id = $1`,
      [connectorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Decrypt credentials
    let credentials: Record<string, any> = {};
    if (row.credentials_data) {
      try {
        const decryptedString = decrypt(row.credentials_data);
        if (decryptedString) {
          credentials = JSON.parse(decryptedString);
        }
      } catch (error) {
        logger.warn(`Failed to decrypt credentials for connector ${connectorId}, using raw data`);
        // Fallback to raw data if decryption fails (for backwards compatibility)
        if (typeof row.credentials_data === 'object') {
          credentials = row.credentials_data;
        } else {
          try {
            credentials = JSON.parse(row.credentials_data);
          } catch {
            credentials = {};
          }
        }
      }
    }

    // Decrypt tokens
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    if (row.access_token_data) {
      try {
        accessToken = decrypt(row.access_token_data) || undefined;
      } catch (error) {
        accessToken = row.access_token_data; // Fallback to raw data
      }
    }

    if (row.refresh_token_data) {
      try {
        refreshToken = decrypt(row.refresh_token_data) || undefined;
      } catch (error) {
        refreshToken = row.refresh_token_data; // Fallback to raw data
      }
    }

    return {
      id: row.id,
      connectorId: row.connector_id,
      authType: row.auth_type,
      credentials,
      accessToken,
      refreshToken,
      tokenExpiresAt: row.token_expires_at,
      rateLimitPerMinute: row.rate_limit_per_minute,
      rateLimitPerHour: row.rate_limit_per_hour,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    logger.error(`Error getting connector credentials: ${error.message}`);
    throw error;
  }
}

/**
 * Delete connector credentials
 */
export async function deleteConnectorCredentials(connectorId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM connector_credentials WHERE connector_id = $1', [connectorId]);

    logger.info(`Connector credentials deleted for connector: ${connectorId}`);
  } catch (error: any) {
    logger.error(`Error deleting connector credentials: ${error.message}`);
    throw error;
  }
}

/**
 * Update OAuth tokens
 */
export async function updateOAuthTokens(
  connectorId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  try {
    const accessTokenEncrypted = encrypt(accessToken);
    const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken) : null;

    await pool.query(
      `UPDATE connector_credentials
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           token_expires_at = $3,
           updated_at = NOW()
       WHERE connector_id = $4`,
      [accessTokenEncrypted, refreshTokenEncrypted, expiresAt, connectorId]
    );

    logger.info(`OAuth tokens updated for connector: ${connectorId}`);
  } catch (error: any) {
    logger.error(`Error updating OAuth tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Check if access token is expired
 */
export async function isTokenExpired(connectorId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT token_expires_at FROM connector_credentials WHERE connector_id = $1',
      [connectorId]
    );

    if (result.rows.length === 0 || !result.rows[0].token_expires_at) {
      return false; // No expiration set
    }

    return new Date(result.rows[0].token_expires_at) <= new Date();
  } catch (error: any) {
    logger.error(`Error checking token expiration: ${error.message}`);
    return true; // Assume expired on error
  }
}
