const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration...');
    console.log('📁 Reading migration file...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'database', 'migrations', '001_extend_connector_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('✅ Migration file loaded');
    console.log('⚙️  Executing migration...');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 The following tables were created/updated:');
    console.log('  - connectors (extended)');
    console.log('  - connector_credentials');
    console.log('  - connector_schemas');
    console.log('  - connector_transformations');
    console.log('  - connector_logs (extended)');
    console.log('  - connector_rate_limits');
    console.log('  - connector_circuit_breakers');
    console.log('  - connector_health_metrics');
    console.log('  - connector_dependencies');
    console.log('  - connector_webhooks');
    console.log('');
    console.log('🎉 Your connector system is ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration();
