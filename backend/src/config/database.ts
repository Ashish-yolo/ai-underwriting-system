import { Pool } from 'pg';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  }
});

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
  await mongoose.connection.close();
  redis.disconnect();
  console.log('🔌 All database connections closed');
};
