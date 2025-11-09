const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSchema() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking policies table schema...\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'policies'
      ORDER BY ordinal_position;
    `);

    console.log('Policies table columns:');
    console.log('========================');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n🔍 Checking api_requests table schema...\n');

    const requestsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'api_requests'
      ORDER BY ordinal_position;
    `);

    console.log('API Requests table columns:');
    console.log('============================');
    requestsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n🔍 Checking manual_reviews table schema...\n');

    const reviewsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'manual_reviews'
      ORDER BY ordinal_position;
    `);

    console.log('Manual Reviews table columns:');
    console.log('==============================');
    reviewsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
