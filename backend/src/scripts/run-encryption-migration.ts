import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

async function runMigration() {
  try {
    console.log('🔄 Running encryption migration...');

    const migrationPath = path.join(__dirname, '../database/migrations/010_encrypt_connector_credentials.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Generate encryption key: npx ts-node src/scripts/generate-encryption-key.ts');
    console.log('2. Add ENCRYPTION_KEY to .env file');
    console.log('3. Encrypt existing data: npx ts-node src/scripts/encrypt-existing-credentials.ts');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigration();
