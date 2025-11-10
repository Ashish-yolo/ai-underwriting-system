#!/usr/bin/env ts-node
/**
 * Run Migration 011: Create Manual Review Tables
 *
 * This script runs the manual review tables migration on the production database.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const pool = new Pool({
    host: '3.227.209.82', // Resolved IPv4 address for aws-1-us-east-1.pooler.supabase.com
    port: 6543,
    database: 'postgres',
    user: 'postgres.glejgqtveeywjppbsxxv',
    password: 'Ashi08gmail.com',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '011_create_manual_reviews_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: 011_create_manual_reviews_tables.sql\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - manual_reviews');
    console.log('  - review_activities');
    console.log('\nIndexes created:');
    console.log('  - idx_manual_reviews_status');
    console.log('  - idx_manual_reviews_priority');
    console.log('  - idx_manual_reviews_assigned_to');
    console.log('  - idx_manual_reviews_created_at');
    console.log('  - idx_manual_reviews_sla_deadline');
    console.log('  - idx_manual_reviews_application_id');
    console.log('  - idx_review_activities_review_id');
    console.log('  - idx_review_activities_created_at');
    console.log('\nTriggers created:');
    console.log('  - trigger_update_manual_reviews_updated_at\n');

    client.release();
    await pool.end();

    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
