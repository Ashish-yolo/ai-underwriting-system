import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  // Application
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;

  // Database
  DATABASE_URL: string;
  MONGODB_URL: string;
  REDIS_URL: string;

  // Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  WEBHOOK_SECRET: string;

  // LOS Integration
  LOS_WEBHOOK_URL: string;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;

  // Slack
  SLACK_WEBHOOK_URL?: string;

  // File Upload
  MAX_FILE_SIZE_MB: number;
  ALLOWED_FILE_TYPES: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Session
  SESSION_SECRET: string;
  SESSION_TIMEOUT_HOURS: number;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;

  // Feature Flags
  ENABLE_ASYNC_PROCESSING: boolean;
  ENABLE_WEBHOOK_RETRIES: boolean;
  ENABLE_ANALYTICS: boolean;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value!;
};

const getEnvVarAsNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvVarAsBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

export const config: EnvConfig = {
  // Application
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvVarAsNumber('PORT', 3000),
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  MONGODB_URL: getEnvVar('MONGODB_URL'),
  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

  // Security
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  ENCRYPTION_KEY: getEnvVar('ENCRYPTION_KEY'),
  WEBHOOK_SECRET: getEnvVar('WEBHOOK_SECRET'),

  // LOS Integration
  LOS_WEBHOOK_URL: getEnvVar('LOS_WEBHOOK_URL', 'https://new-age-los.netlify.app/api/underwriting/callback'),

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: getEnvVarAsNumber('SMTP_PORT', 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,

  // Slack
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,

  // File Upload
  MAX_FILE_SIZE_MB: getEnvVarAsNumber('MAX_FILE_SIZE_MB', 10),
  ALLOWED_FILE_TYPES: getEnvVar('ALLOWED_FILE_TYPES', '.xlsx,.xls,.docx,.json,.csv'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // Session
  SESSION_SECRET: getEnvVar('SESSION_SECRET'),
  SESSION_TIMEOUT_HOURS: getEnvVarAsNumber('SESSION_TIMEOUT_HOURS', 24),

  // Logging
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  LOG_FILE_PATH: getEnvVar('LOG_FILE_PATH', './logs/app.log'),

  // Feature Flags
  ENABLE_ASYNC_PROCESSING: getEnvVarAsBoolean('ENABLE_ASYNC_PROCESSING', true),
  ENABLE_WEBHOOK_RETRIES: getEnvVarAsBoolean('ENABLE_WEBHOOK_RETRIES', true),
  ENABLE_ANALYTICS: getEnvVarAsBoolean('ENABLE_ANALYTICS', true),
};

// Validate critical configuration
export const validateConfig = (): void => {
  const requiredVars = [
    'DATABASE_URL',
    'MONGODB_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'WEBHOOK_SECRET',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Configuration validated successfully');
};
