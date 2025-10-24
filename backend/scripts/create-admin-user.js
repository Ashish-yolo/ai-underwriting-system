/**
 * Script to create default admin user
 * Run with: node scripts/create-admin-user.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail%2Ecom@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminUser() {
  try {
    const email = 'admin@underwriting.com';
    const password = 'admin123';
    const fullName = 'System Administrator';
    const role = 'admin';

    console.log('Checking if admin user already exists...');

    // Check if user exists
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`✓ Admin user already exists: ${email}`);
      console.log(`User ID: ${existing.rows[0].id}`);
      process.exit(0);
    }

    console.log('Creating admin user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email, passwordHash, fullName, role]
    );

    const user = result.rows[0];

    console.log('\n✓ Admin user created successfully!');
    console.log('\nUser Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Full Name: ${user.full_name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.is_active}`);
    console.log(`  Created At: ${user.created_at}`);
    console.log('\nLogin Credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUser();
