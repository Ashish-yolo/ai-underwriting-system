import { pool } from '../config/database';
import { encrypt, isEncrypted } from '../services/encryption.service';
import logger from '../utils/logger';

/**
 * One-time script to encrypt existing plaintext credentials
 * Run this after:
 * 1. Running the database migration (010_encrypt_connector_credentials.sql)
 * 2. Adding ENCRYPTION_KEY to .env file
 */

async function encryptExistingCredentials() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting credential encryption...');
    console.log('');

    await client.query('BEGIN');

    // Get all connector credentials
    const result = await client.query(`
      SELECT id, credentials, access_token, refresh_token,
             credentials_encrypted, access_token_encrypted, refresh_token_encrypted
      FROM connector_credentials
    `);

    console.log(`Found ${result.rows.length} connector credential records`);
    console.log('');

    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;

    for (const row of result.rows) {
      try {
        // Check if already encrypted
        if (row.credentials_encrypted && isEncrypted(row.credentials_encrypted)) {
          console.log(`  ⏭  Credential ${row.id}: Already encrypted, skipping`);
          alreadyEncrypted++;
          continue;
        }

        // Encrypt credentials JSONB
        let credentialsEncrypted = null;
        if (row.credentials) {
          const credentialsString = JSON.stringify(row.credentials);
          credentialsEncrypted = encrypt(credentialsString);
        }

        // Encrypt access token
        let accessTokenEncrypted = null;
        if (row.access_token && !isEncrypted(row.access_token)) {
          accessTokenEncrypted = encrypt(row.access_token);
        }

        // Encrypt refresh token
        let refreshTokenEncrypted = null;
        if (row.refresh_token && !isEncrypted(row.refresh_token)) {
          refreshTokenEncrypted = encrypt(row.refresh_token);
        }

        // Update with encrypted values
        await client.query(
          `UPDATE connector_credentials
           SET credentials_encrypted = $1,
               access_token_encrypted = $2,
               refresh_token_encrypted = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [credentialsEncrypted, accessTokenEncrypted, refreshTokenEncrypted, row.id]
        );

        console.log(`  ✅ Credential ${row.id}: Encrypted successfully`);
        encrypted++;
      } catch (error: any) {
        console.error(`  ❌ Credential ${row.id}: Failed - ${error.message}`);
        errors++;
      }
    }

    await client.query('COMMIT');

    console.log('');
    console.log('='.repeat(70));
    console.log('Encryption Summary:');
    console.log('='.repeat(70));
    console.log(`✅ Encrypted: ${encrypted}`);
    console.log(`⏭  Already encrypted: ${alreadyEncrypted}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${result.rows.length}`);
    console.log('='.repeat(70));
    console.log('');

    if (errors === 0) {
      console.log('🎉 All credentials encrypted successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify encryption works by testing a connector');
      console.log('2. After verification, old columns can be dropped in a future migration');
    } else {
      console.log('⚠️  Some credentials failed to encrypt. Please review errors above.');
      console.log('   The transaction has been committed for successful encryptions.');
    }

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ Encryption failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
encryptExistingCredentials()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
