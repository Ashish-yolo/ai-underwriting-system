import { encrypt, decrypt, isEncrypted } from '../services/encryption.service';

/**
 * Simple test script to verify encryption functionality
 * Run this after setting ENCRYPTION_KEY in .env
 */

console.log('='.repeat(70));
console.log('Testing Encryption Service');
console.log('='.repeat(70));
console.log('');

// Test data
const testCases = [
  {
    name: 'API Key',
    plaintext: 'sk_test_1234567890abcdef',
  },
  {
    name: 'Password',
    plaintext: 'MySecurePassword123!',
  },
  {
    name: 'Bearer Token',
    plaintext: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  },
  {
    name: 'JSON Credentials',
    plaintext: JSON.stringify({
      username: 'admin',
      password: 'password123',
      apiKey: 'abc123',
    }),
  },
];

let passed = 0;
let failed = 0;

console.log('Running encryption tests...\n');

for (const testCase of testCases) {
  try {
    console.log(`Testing: ${testCase.name}`);
    console.log(`  Original: ${testCase.plaintext.substring(0, 30)}...`);

    // Encrypt
    const encrypted = encrypt(testCase.plaintext);
    if (!encrypted) {
      throw new Error('Encryption returned null');
    }

    console.log(`  Encrypted: ${encrypted.substring(0, 50)}...`);

    // Check if it looks encrypted
    if (!isEncrypted(encrypted)) {
      throw new Error('Encrypted text does not match expected format');
    }

    // Decrypt
    const decrypted = decrypt(encrypted);
    if (!decrypted) {
      throw new Error('Decryption returned null');
    }

    console.log(`  Decrypted: ${decrypted.substring(0, 30)}...`);

    // Verify match
    if (decrypted !== testCase.plaintext) {
      throw new Error(`Decrypted text does not match original!\nExpected: ${testCase.plaintext}\nGot: ${decrypted}`);
    }

    console.log(`  ✅ PASSED\n`);
    passed++;
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}\n`);
    failed++;
  }
}

// Test null/undefined handling
console.log('Testing null/undefined handling...');
try {
  const encryptedNull = encrypt(null);
  const encryptedUndefined = encrypt(undefined);
  const encryptedEmpty = encrypt('');

  if (encryptedNull !== null || encryptedUndefined !== null || encryptedEmpty !== null) {
    throw new Error('Expected null for null/undefined/empty inputs');
  }

  console.log('  ✅ PASSED\n');
  passed++;
} catch (error: any) {
  console.log(`  ❌ FAILED: ${error.message}\n`);
  failed++;
}

// Test multiple encryptions produce different outputs (due to random IV)
console.log('Testing random IV generation...');
try {
  const plaintext = 'test-data';
  const encrypted1 = encrypt(plaintext);
  const encrypted2 = encrypt(plaintext);

  if (encrypted1 === encrypted2) {
    throw new Error('Multiple encryptions of same data produced identical output (IV not random)');
  }

  const decrypted1 = decrypt(encrypted1!);
  const decrypted2 = decrypt(encrypted2!);

  if (decrypted1 !== plaintext || decrypted2 !== plaintext) {
    throw new Error('Decryption failed');
  }

  console.log('  ✅ PASSED (Different IVs generated)\n');
  passed++;
} catch (error: any) {
  console.log(`  ❌ FAILED: ${error.message}\n`);
  failed++;
}

// Summary
console.log('='.repeat(70));
console.log('Test Summary:');
console.log('='.repeat(70));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n🎉 All tests passed! Encryption is working correctly.');
  console.log('\nYou can now:');
  console.log('1. Run the database migration: npx ts-node src/scripts/run-encryption-migration.ts');
  console.log('2. Encrypt existing data: npx ts-node src/scripts/encrypt-existing-credentials.ts');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please check the errors above.');
  console.log('\nMake sure ENCRYPTION_KEY is set in your .env file.');
  console.log('Run: npx ts-node src/scripts/generate-encryption-key.ts');
  process.exit(1);
}
