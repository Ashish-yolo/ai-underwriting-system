import { Pool } from 'pg';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { promisify } from 'util';
import * as dns from 'dns';

dotenv.config();

const resolve4 = promisify(dns.resolve4);

// PostgreSQL Connection Pool
// Use DATABASE_URL in production, fall back to hardcoded values for local development
const getDatabaseConfig = async () => {
  if (process.env.DATABASE_URL) {
    // Production: parse DATABASE_URL and resolve hostname to IPv4
    const url = new URL(process.env.DATABASE_URL);
    const hostname = url.hostname;
    const port = parseInt(url.port) || 5432;

    // Manually resolve to IPv4 to avoid IPv6
    let host = hostname;
    try {
      const addresses = await resolve4(hostname);
      if (addresses && addresses.length > 0) {
        host = addresses[0]; // Use first IPv4 address
        console.log(`📊 Resolved ${hostname} to IPv4: ${host}:${port}`);
      }
    } catch (err) {
      console.log(`⚠️  Could not resolve ${hostname}, using as-is`);
    }

    return {
      host,
      port,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false
      },
    };
  }

  // Local development fallback - resolve to IPv4
  let host = 'aws-1-us-east-1.pooler.supabase.com';
  try {
    const addresses = await resolve4(host);
    if (addresses && addresses.length > 0) {
      host = addresses[0];
      console.log(`📊 Resolved to IPv4: ${host}:5432`);
    }
  } catch (err) {
    console.log('📊 Using hardcoded database configuration');
  }

  return {
    host,
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

let poolInstance: Pool;

// Initialize pool asynchronously
(async () => {
  const config = await getDatabaseConfig();
  poolInstance = new Pool(config);

  poolInstance.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  poolInstance.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(-1);
  });
})();

// Export pool - will be initialized after async config
export const pool = new Proxy({} as Pool, {
  get: (target, prop) => {
    if (!poolInstance) {
      throw new Error('Database pool not yet initialized');
    }
    const value = (poolInstance as any)[prop];
    return typeof value === 'function' ? value.bind(poolInstance) : value;
  }
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
    const res = await poolInstance.query(text, params);
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
  await poolInstance.end();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (redis) {
    redis.disconnect();
  }
  console.log('🔌 All database connections closed');
};
