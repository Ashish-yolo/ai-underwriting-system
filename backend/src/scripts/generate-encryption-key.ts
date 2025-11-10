import crypto from 'crypto';

/**
 * Generate a secure encryption key for the application
 * Run this once during setup and add the output to your .env file
 */

console.log('='.repeat(70));
console.log('Encryption Key Generator');
console.log('='.repeat(70));
console.log('');

const key = crypto.randomBytes(32).toString('base64');

console.log('Add this line to your .env file:');
console.log('');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('');
console.log('='.repeat(70));
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('='.repeat(70));
console.log('1. Keep this key SECRET - never commit it to version control');
console.log('2. Store it securely - losing it means losing access to encrypted data');
console.log('3. Use different keys for development, staging, and production');
console.log('4. Back up this key in a secure location (password manager, vault)');
console.log('='.repeat(70));
