/**
 * Debug test script for ECIES encryption and decryption
 */
import { ECIES } from '@brightchain/brightchain-lib';
import { createECDH } from 'crypto';
import { decryptDebug, encryptDebug } from './cryptoCore.debug';

async function runTest() {
  try {
    console.log('ECIES Debug Test');
    console.log('=================\n');

    // Generate a key pair for testing
    console.log('Generating key pair...');
    const ecdh = createECDH(ECIES.CURVE_NAME);
    ecdh.generateKeys();

    const privateKey = ecdh.getPrivateKey();
    const publicKey = ecdh.getPublicKey();

    console.log('Private key length:', privateKey.length);
    console.log('Public key length:', publicKey.length);
    console.log('Public key prefix:', publicKey[0].toString(16));

    // Create a test message
    const message = Buffer.from(
      'This is a test message for ECIES encryption and decryption',
    );
    console.log('\nOriginal message length:', message.length);
    console.log('Original message:', message.toString());

    // Encrypt the message
    console.log('\n--- Encryption ---');
    const encrypted = encryptDebug(publicKey, message);

    // Decrypt the message
    console.log('\n--- Decryption ---');
    const decrypted = decryptDebug(privateKey, encrypted);

    // Verify the result
    console.log('\n--- Verification ---');
    console.log('Decrypted message length:', decrypted.length);
    console.log('Decrypted message:', decrypted.toString());

    const success = message.equals(decrypted);
    console.log('Decryption successful:', success);

    // Try with a different key pair to simulate the test scenario
    console.log('\n\n=== Test with different public/private key pairs ===');
    const ecdh2 = createECDH(ECIES.CURVE_NAME);
    ecdh2.generateKeys();

    // Now encrypt with one key and decrypt with another (should fail)
    console.log('\n--- Cross-key encryption/decryption (should fail) ---');
    const encrypted2 = encryptDebug(ecdh2.getPublicKey(), message);

    try {
      const decrypted2 = decryptDebug(privateKey, encrypted2);
      console.log(
        'Unexpectedly decrypted with wrong key:',
        decrypted2.toString(),
      );
    } catch (error) {
      console.log(
        'Expected error when decrypting with wrong key:',
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest().catch(console.error);
