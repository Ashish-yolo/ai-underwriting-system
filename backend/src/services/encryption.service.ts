import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Simple encryption service for connector credentials
 * Uses AES-256-GCM for bank-level security
 */

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

/**
 * Get encryption key from environment
 * Validates key length on startup
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error(
      'ENCRYPTION_KEY not found in environment variables. ' +
      'Run: npx ts-node src/scripts/generate-encryption-key.ts'
    );
  }

  try {
    const key = Buffer.from(keyString, 'base64');

    if (key.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be 32 bytes (256 bits). Current length: ${key.length} bytes. ` +
        'Generate a new key with: npx ts-node src/scripts/generate-encryption-key.ts'
      );
    }

    return key;
  } catch (error: any) {
    throw new Error(
      `Invalid ENCRYPTION_KEY format: ${error.message}. ` +
      'Generate a new key with: npx ts-node src/scripts/generate-encryption-key.ts'
    );
  }
}

// Initialize and validate key on module load
let ENCRYPTION_KEY: Buffer;
try {
  ENCRYPTION_KEY = getEncryptionKey();
  logger.info('✅ Encryption service initialized successfully');
} catch (error: any) {
  logger.error(`❌ Encryption service initialization failed: ${error.message}`);
  // In development, we can continue without encryption
  // In production, this should fail hard
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  // Create a dummy key for development if not set
  ENCRYPTION_KEY = crypto.randomBytes(32);
  logger.warn('⚠️  Using temporary encryption key for development. DO NOT USE IN PRODUCTION!');
}

/**
 * Encrypt text using AES-256-GCM
 * Returns encrypted text as: iv:authTag:encrypted
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted text (safe to store in database) or null if input is null/empty
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  try {
    // Generate random IV (initialization vector) for each encryption
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    // Get authentication tag (for GCM mode integrity verification)
    const authTag = cipher.getAuthTag();

    // Return everything in one string: iv:authTag:encrypted
    // This makes storage simple - just one TEXT column needed
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  } catch (error: any) {
    logger.error(`Encryption error: ${error.message}`);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text encrypted with encrypt()
 * Expects format: iv:authTag:encrypted
 *
 * @param encryptedText - Encrypted text from database
 * @returns Original plain text or null if input is null/empty
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || encryptedText.trim() === '') {
    return null;
  }

  try {
    // Split the encrypted string into parts
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected format: iv:authTag:encrypted');
    }

    const iv = Buffer.from(parts[0], ENCODING);
    const authTag = Buffer.from(parts[1], ENCODING);
    const encrypted = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    logger.error(`Decryption error: ${error.message}`);
    throw new Error('Failed to decrypt data. Data may be corrupted or encrypted with a different key.');
  }
}

/**
 * Check if a string appears to be encrypted
 * (has the format iv:authTag:encrypted with hex characters)
 *
 * @param text - Text to check
 * @returns true if text appears to be encrypted
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  const parts = text.split(':');
  if (parts.length !== 3) {
    return false;
  }

  // Check if all parts are valid hex strings
  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every(part => hexPattern.test(part));
}

/**
 * Encrypt an object's sensitive fields
 *
 * @param obj - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns New object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (obj[field] && typeof obj[field] === 'string') {
      result[field] = encrypt(obj[field] as string) as any;
    }
  }

  return result;
}

/**
 * Decrypt an object's encrypted fields
 *
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns New object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (obj[field] && typeof obj[field] === 'string') {
      result[field] = decrypt(obj[field] as string) as any;
    }
  }

  return result;
}
