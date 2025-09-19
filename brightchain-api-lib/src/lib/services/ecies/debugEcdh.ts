import { ECIES } from '@brightchain/brightchain-lib';
import { createECDH } from 'crypto';

/**
 * Simple debugging script to test ECDH key compatibility issues directly
 */
function debugEcdhKeys() {
  console.log('=== Testing ECDH Key Compatibility ===\n');

  try {
    // Create an Alice key pair (first party)
    const aliceEcdh = createECDH(ECIES.CURVE_NAME);
    // Generate keys deterministically
    const aliceSeed = Buffer.from('alice_seed_for_testing_crypto_fix', 'utf8');
    aliceEcdh.setPrivateKey(aliceSeed.subarray(0, 32));
    aliceEcdh.generateKeys();

    const alicePrivateKey = aliceEcdh.getPrivateKey();
    const alicePublicKey = aliceEcdh.getPublicKey();

    // Check if we need to add a prefix to Alice's public key
    const aliceRawPublicKey =
      alicePublicKey.length === 64
        ? alicePublicKey
        : alicePublicKey.subarray(1);
    const aliceFullPublicKey = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), // 0x04 prefix
      aliceRawPublicKey,
    ]);

    // Create a Bob key pair (second party)
    const bobEcdh = createECDH(ECIES.CURVE_NAME);
    const bobSeed = Buffer.from('bob_seed_for_testing_crypto_fix____', 'utf8');
    bobEcdh.setPrivateKey(bobSeed.subarray(0, 32));
    bobEcdh.generateKeys();

    const bobPrivateKey = bobEcdh.getPrivateKey();
    const bobPublicKey = bobEcdh.getPublicKey();

    // Check if we need to add a prefix to Bob's public key
    const bobRawPublicKey =
      bobPublicKey.length === 64 ? bobPublicKey : bobPublicKey.subarray(1);
    const bobFullPublicKey = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), // 0x04 prefix
      bobRawPublicKey,
    ]);

    // Log key formats
    console.log('Alice private key length:', alicePrivateKey.length);
    console.log('Alice raw public key length:', aliceRawPublicKey.length);
    console.log('Alice full public key length:', aliceFullPublicKey.length);
    console.log(
      'Alice full public key prefix:',
      aliceFullPublicKey[0].toString(16),
    );

    console.log('\nBob private key length:', bobPrivateKey.length);
    console.log('Bob raw public key length:', bobRawPublicKey.length);
    console.log('Bob full public key length:', bobFullPublicKey.length);
    console.log(
      'Bob full public key prefix:',
      bobFullPublicKey[0].toString(16),
    );

    // Test 1: Try computing shared secret with different key formats
    console.log(
      "\n--- Test 1: Alice computes secret using Bob's public key ---",
    );

    // Try with full key (with 0x04 prefix)
    try {
      const secretWithFullKey = aliceEcdh.computeSecret(bobFullPublicKey);
      console.log('SUCCESS with full key (0x04 prefix)');
      console.log('Shared secret length:', secretWithFullKey.length);
      console.log(
        'Shared secret (hex):',
        secretWithFullKey.toString('hex').substring(0, 32) + '...',
      );
    } catch (error: unknown) {
      console.error(
        'FAILED with full key (0x04 prefix):',
        error instanceof Error ? error.message : String(error),
      );
    }

    // Try with raw key (without prefix)
    try {
      const secretWithRawKey = aliceEcdh.computeSecret(bobRawPublicKey);
      console.log('SUCCESS with raw key (no prefix)');
      console.log('Shared secret length:', secretWithRawKey.length);
      console.log(
        'Shared secret (hex):',
        secretWithRawKey.toString('hex').substring(0, 32) + '...',
      );
    } catch (error: unknown) {
      console.error(
        'FAILED with raw key (no prefix):',
        error instanceof Error ? error.message : String(error),
      );
    }

    // Test 2: Bob computes secret using Alice's public key
    console.log(
      "\n--- Test 2: Bob computes secret using Alice's public key ---",
    );

    // Try with full key (with 0x04 prefix)
    try {
      const secretWithFullKey = bobEcdh.computeSecret(aliceFullPublicKey);
      console.log('SUCCESS with full key (0x04 prefix)');
      console.log('Shared secret length:', secretWithFullKey.length);
      console.log(
        'Shared secret (hex):',
        secretWithFullKey.toString('hex').substring(0, 32) + '...',
      );
    } catch (error: unknown) {
      console.error(
        'FAILED with full key (0x04 prefix):',
        error instanceof Error ? error.message : String(error),
      );
    }

    // Try with raw key (without prefix)
    try {
      const secretWithRawKey = bobEcdh.computeSecret(aliceRawPublicKey);
      console.log('SUCCESS with raw key (no prefix)');
      console.log('Shared secret length:', secretWithRawKey.length);
      console.log(
        'Shared secret (hex):',
        secretWithRawKey.toString('hex').substring(0, 32) + '...',
      );
    } catch (error: unknown) {
      console.error(
        'FAILED with raw key (no prefix):',
        error instanceof Error ? error.message : String(error),
      );
    }

    // Test 3: Verify both sides get the same shared secret
    console.log(
      '\n--- Test 3: Compare computed secrets using consistent format ---',
    );

    // Use the format that worked best in tests 1 and 2
    let aliceSecret, bobSecret;
    try {
      aliceSecret = aliceEcdh.computeSecret(bobRawPublicKey); // Try raw format
      bobSecret = bobEcdh.computeSecret(aliceRawPublicKey);

      console.log(
        "Alice's computed secret:",
        aliceSecret.toString('hex').substring(0, 32) + '...',
      );
      console.log(
        "Bob's computed secret:",
        bobSecret.toString('hex').substring(0, 32) + '...',
      );
      console.log(
        'Secrets match?',
        aliceSecret.equals(bobSecret) ? 'YES' : 'NO',
      );
    } catch (error: unknown) {
      console.error(
        'FAILED comparing secrets:',
        error instanceof Error ? error.message : String(error),
      );

      // Try with full key format if raw format failed
      try {
        aliceSecret = aliceEcdh.computeSecret(bobFullPublicKey);
        bobSecret = bobEcdh.computeSecret(aliceFullPublicKey);

        console.log(
          "Alice's computed secret (full key):",
          aliceSecret.toString('hex').substring(0, 32) + '...',
        );
        console.log(
          "Bob's computed secret (full key):",
          bobSecret.toString('hex').substring(0, 32) + '...',
        );
        console.log(
          'Secrets match?',
          aliceSecret.equals(bobSecret) ? 'YES' : 'NO',
        );
      } catch (innerError: unknown) {
        console.error(
          'FAILED with both key formats. Something is fundamentally wrong with the key exchange.',
          innerError instanceof Error ? innerError.message : String(innerError),
        );
      }
    }
  } catch (error: unknown) {
    console.error(
      'An error occurred during ECDH key testing:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Run the debug test
debugEcdhKeys();
