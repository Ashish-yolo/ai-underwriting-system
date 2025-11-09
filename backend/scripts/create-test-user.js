const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestUser() {
  const client = await pool.connect();

  try {
    console.log('🔐 Creating test user...\n');

    // Check if user exists
    const existingUser = await client.query(
      "SELECT id, email FROM users WHERE email = $1",
      ['admin@underwrite.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists:');
      console.log(`   Email: admin@underwrite.com`);
      console.log(`   ID: ${existingUser.rows[0].id}`);
      console.log('\n🔑 Production Login Credentials:');
      console.log('   Email: admin@underwrite.com');
      console.log('   Password: Admin@2024');
      console.log('\n📍 Go to: https://underwriteu.netlify.app/login');
      return;
    }

    // Hash password
    const password = 'Admin@2024';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      ['admin@underwrite.com', passwordHash, 'Admin User', 'admin']
    );

    console.log('✅ Production user created successfully!\n');
    console.log('User Details:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].full_name}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log('\n🔑 Production Login Credentials:');
    console.log('   Email: admin@underwrite.com');
    console.log('   Password: Admin@2024');
    console.log('\n📍 Go to: https://underwriteu.netlify.app/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();
