import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive data before storing in database
 */
export const encryptData = (data: any): EncryptedData => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data from database
 */
export const decryptData = (encryptedData: EncryptedData): any => {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Hash API key for storage
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
};

/**
 * Generate random API key
 */
export const generateApiKey = (): string => {
  return `uw_${crypto.randomBytes(32).toString('hex')}`;
};

/**
 * Generate HMAC signature for webhooks
 */
export const generateHMACSignature = (data: any, secret: string = config.WEBHOOK_SECRET): string => {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Verify HMAC signature
 */
export const verifyHMACSignature = (
  data: any,
  signature: string,
  secret: string = config.WEBHOOK_SECRET
): boolean => {
  const expectedSignature = generateHMACSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Mask PII data for logging
 */
export const maskPII = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked = { ...data };

  // Mask PAN
  if (masked.pan) {
    masked.pan = masked.pan.slice(0, 4) + 'X'.repeat(6);
  }

  // Mask Aadhaar
  if (masked.aadhaar) {
    masked.aadhaar = 'XXXX-XXXX-' + masked.aadhaar.slice(-4);
  }

  // Mask mobile
  if (masked.mobile) {
    masked.mobile = masked.mobile.slice(0, 3) + 'XXXXX' + masked.mobile.slice(-2);
  }

  // Mask email
  if (masked.email) {
    const [local, domain] = masked.email.split('@');
    masked.email = local.slice(0, 2) + '***@' + domain;
  }

  return masked;
};
