import { createECDH } from 'crypto';
import { ECIES } from '../../constants';
import { ServiceProvider } from '../service.provider';

/**
 * Debug utility for testing ECIES encryption and decryption with fixed keys
 */
function debugEciesFunctions() {
  // Get the actual ECIES service from the service provider, same as the tests
  const service = ServiceProvider.getInstance().eciesService;
  console.log('\n=== ECIES Debug Test ===\n');

  try {
    // Create fixed key pairs for reproducibility
    const aliceEcdh = createECDH(ECIES.CURVE_NAME);
    // Use a fixed seed for deterministic key generation
    const aliceSeed = Buffer.from(
      'alice_fixed_seed_for_reproducible_tests',
      'utf8',
    );
    aliceEcdh.setPrivateKey(aliceSeed.subarray(0, 32));
    aliceEcdh.generateKeys();

    const bobEcdh = createECDH(ECIES.CURVE_NAME);
    const bobSeed = Buffer.from(
      'bob_fixed_seed_for_reproducible_tests_',
      'utf8',
    );
    bobEcdh.setPrivateKey(bobSeed.subarray(0, 32));
    bobEcdh.generateKeys();

    // Get Alice's keys
    const alicePrivateKey = aliceEcdh.getPrivateKey();
    const alicePublicKey = aliceEcdh.getPublicKey();
    const alicePublicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      alicePublicKey.length === 64
        ? alicePublicKey
        : alicePublicKey.subarray(1),
    ]);

    // Get Bob's keys
    const bobPrivateKey = bobEcdh.getPrivateKey();
    const bobPublicKey = bobEcdh.getPublicKey();
    const bobPublicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      bobPublicKey.length === 64 ? bobPublicKey : bobPublicKey.subarray(1),
    ]);

    // Log key information
    console.log(
      `Alice Private Key (${alicePrivateKey.length} bytes): ${alicePrivateKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Alice Public Key (${alicePublicKeyWithPrefix.length} bytes): ${alicePublicKeyWithPrefix.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Alice Public Key Prefix: 0x${alicePublicKeyWithPrefix[0].toString(16)}\n`,
    );

    console.log(
      `Bob Private Key (${bobPrivateKey.length} bytes): ${bobPrivateKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Bob Public Key (${bobPublicKeyWithPrefix.length} bytes): ${bobPublicKeyWithPrefix.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Bob Public Key Prefix: 0x${bobPublicKeyWithPrefix[0].toString(16)}\n`,
    );

    // Test simple message encryption/decryption
    console.log('--- Test 1: Simple Encryption/Decryption ---');
    const message = Buffer.from(
      'This is a test message for ECIES encryption and decryption',
    );
    console.log(
      `Original Message (${message.length} bytes): ${message.toString()}\n`,
    );

    // Alice encrypts a message for Bob
    console.log('Alice encrypts a message for Bob...');
    const encrypted = service.encryptSimpleOrSingle(
      bobPublicKeyWithPrefix,
      message,
    );
    console.log(
      `Encrypted Data (${encrypted.length} bytes): ${encrypted.toString('hex').substring(0, 32)}...\n`,
    );

    // Direct computations of shared secret for comparison (should match)
    const aliceSharedSecret = aliceEcdh.computeSecret(bobPublicKeyWithPrefix);
    const bobSharedSecret = bobEcdh.computeSecret(alicePublicKeyWithPrefix);
    console.log(
      'Pre-computed shared secrets match:',
      aliceSharedSecret.equals(bobSharedSecret),
    );
    console.log(
      `Shared Secret: ${aliceSharedSecret.toString('hex').substring(0, 32)}...\n`,
    );

    // Bob decrypts the message
    console.log('Bob decrypts the message...');
    try {
      const decrypted = service.decryptSimpleOrSingleWithHeader(
        bobPrivateKey,
        encrypted,
      );
      console.log(
        `Decrypted Message (${decrypted.length} bytes): ${decrypted.toString()}`,
      );
      console.log('Decryption successful:', decrypted.equals(message));
    } catch (error) {
      console.error('Decryption failed:', error);

      // Extract components for manual debugging
      console.log('\n--- Manual Debug of Encrypted Data ---');

      // The first 65 bytes should be the ephemeral public key
      const ephPublicKey = encrypted.subarray(0, ECIES.PUBLIC_KEY_LENGTH);
      console.log(
        `Ephemeral Public Key (${ephPublicKey.length} bytes): ${ephPublicKey.toString('hex').substring(0, 32)}...`,
      );
      console.log(
        `Ephemeral Public Key Prefix: 0x${ephPublicKey[0].toString(16)}`,
      );

      // Next 16 bytes are the IV
      const iv = encrypted.subarray(
        ECIES.PUBLIC_KEY_LENGTH,
        ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      );
      console.log(`IV (${iv.length} bytes): ${iv.toString('hex')}`);

      // Next 16 bytes are the auth tag
      const authTag = encrypted.subarray(
        ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
        ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
      );
      console.log(
        `Auth Tag (${authTag.length} bytes): ${authTag.toString('hex')}`,
      );

      // Remaining bytes are the encrypted content
      const encryptedContent = encrypted.subarray(
        ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
      );
      console.log(
        `Encrypted Content (${encryptedContent.length} bytes): ${encryptedContent.toString('hex').substring(0, 32)}...`,
      );
    }
  } catch (error) {
    console.error('An error occurred during ECIES debug test:', error);
  }
}

// Run the debug test
debugEciesFunctions();
