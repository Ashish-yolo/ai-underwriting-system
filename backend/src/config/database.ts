import { Pool } from 'pg';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection Pool
// Use DATABASE_URL in production, fall back to hardcoded values for local development
const getDatabaseConfig = () => {
  // Hardcoded production config to bypass all DNS issues
  if (process.env.NODE_ENV === 'production') {
    console.log('📊 Using production hardcoded config: pooler IPv4');
    return {
      host: '3.227.209.82', // aws-1-us-east-1.pooler.supabase.com IPv4
      port: 6543,
      database: 'postgres',
      user: 'postgres.glejgqtveeywjppbsxxv',
      password: 'Ashi08gmail.com',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      ssl: {
        rejectUnauthorized: false
      },
    };
  }

  if (process.env.DATABASE_URL) {
    // Development: parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    const host = url.hostname;
    const port = parseInt(url.port) || 5432;

    console.log(`📊 Using DATABASE_URL: ${host}:${port}`);

    return {
      host,
      port,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: {
        rejectUnauthorized: false
      },
    };
  }

  // Local development fallback
  console.log('📊 Using hardcoded database configuration');
  return {
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.glejgqtveeywjppbsxxv',
    password: 'Ashi08gmail.com',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false
    },
  };
};

// Set Node.js to prefer IPv4
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

export const pool = new Pool(getDatabaseConfig());

// Test PostgreSQL connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// MongoDB Connection
export const connectMongoDB = async (): Promise<void> => {
  if (!process.env.MONGODB_URL || process.env.MONGODB_URL === '') {
    console.log('⚠️  MongoDB URL not configured, skipping MongoDB connection');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️  Continuing without MongoDB...');
  }
};

// Redis Connection
let redis: Redis | null = null;

if (process.env.REDIS_URL && process.env.REDIS_URL !== '') {
  redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times: number) => {
      if (times > 3) {
        console.log('⚠️  Redis connection failed after 3 retries, continuing without Redis...');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
    console.log('⚠️  Continuing without Redis...');
  });
} else {
  console.log('⚠️  Redis URL not configured, skipping Redis connection');
}

export { redis };

// Helper function to execute PostgreSQL queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Close all database connections gracefully
export const closeConnections = async (): Promise<void> => {
  await pool.end();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (redis) {
    redis.disconnect();
  }
  console.log('🔌 All database connections closed');
};
