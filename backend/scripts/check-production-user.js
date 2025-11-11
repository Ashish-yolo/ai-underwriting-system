const { Pool } = require('pg');

const pool = new Pool({
  host: '3.227.209.82',
  port: 5432,
  database: 'postgres',
  user: 'postgres.glejgqtveeywjppbsxxv',
  password: 'Ashi08gmail.com',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUser() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking production database...\n');

    // Check all users
    const allUsers = await client.query(
      "SELECT id, email, full_name, role, is_active FROM users ORDER BY created_at DESC"
    );

    console.log(`📊 Total users in database: ${allUsers.rows.length}\n`);

    if (allUsers.rows.length > 0) {
      console.log('Users:');
      allUsers.rows.forEach((user, idx) => {
        console.log(`  ${idx + 1}. ${user.email} (${user.role}, active: ${user.is_active})`);
      });
    } else {
      console.log('⚠️  No users found in database!');
    }

    console.log('\n🔍 Checking for admin users specifically...');
    const adminUsers = await client.query(
      "SELECT email, role FROM users WHERE email LIKE '%admin%'"
    );

    if (adminUsers.rows.length > 0) {
      console.log('Admin users found:');
      adminUsers.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    } else {
      console.log('⚠️  No admin users found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUser();
