import { createECDH } from 'crypto';
import { ECIES } from '../../constants';
import { ServiceProvider } from '../service.provider';

/**
 * This script simulates how BrightChainMember handles encryption/decryption
 * to help debug issues with the ECIES implementation.
 */
function debugEciesBrightChain() {
  console.log('=== ECIES BrightChainMember Debug Test ===\n');

  try {
    // Get the ECIES service from the service provider (exactly like in the tests)
    const eciesService = ServiceProvider.getInstance().eciesService;

    // Step 1: Generate a mnemonic and wallet (like BrightChainMember.newMember does)
    console.log('Generating wallet...');
    const mnemonic = eciesService.generateNewMnemonic();
    console.log(`Mnemonic: ${mnemonic.toString().substring(0, 20)}...`);

    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

    // Step 2: Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    console.log(
      `Private Key: ${privateKey.toString('hex').substring(0, 16)}...`,
    );

    // Step 3: Get public key with 0x04 prefix (as BrightChainMember does)
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);
    console.log(
      `Public Key with Prefix: ${publicKeyWithPrefix.toString('hex').substring(0, 16)}...`,
    );
    console.log(`Public Key Length: ${publicKeyWithPrefix.length} bytes`);

    // Validate the key format
    if (
      publicKeyWithPrefix.length === 65 &&
      publicKeyWithPrefix[0] === ECIES.PUBLIC_KEY_MAGIC
    ) {
      console.log('Public key format is correct (65 bytes with 0x04 prefix)');
    } else {
      console.error('Public key format is INCORRECT!');
      console.log(
        `Actual format: ${publicKeyWithPrefix.length} bytes, prefix: 0x${publicKeyWithPrefix[0].toString(16)}`,
      );
    }

    // Step 4: Create a test message
    const message = Buffer.from(
      'This is a test message for BrightChainMember encryption/decryption',
    );
    console.log(`\nOriginal Message: ${message.toString()}`);

    // Step 5: Encrypt the message using the public key
    console.log('\nEncrypting message...');
    const encrypted = eciesService.encrypt(publicKeyWithPrefix, message);
    console.log(`Encrypted size: ${encrypted.length} bytes`);
    console.log(
      `Encrypted data (hex): ${encrypted.toString('hex').substring(0, 32)}...`,
    );

    // Step 6: Log header information
    console.log('\nHeader Information:');
    // Extract the ephemeral public key (first 65 bytes)
    const ephPublicKey = encrypted.subarray(0, ECIES.PUBLIC_KEY_LENGTH);
    console.log(
      `Ephemeral Public Key (${ephPublicKey.length} bytes): ${ephPublicKey.toString('hex').substring(0, 32)}...`,
    );
    console.log(
      `Ephemeral Public Key Prefix: 0x${ephPublicKey[0].toString(16)}`,
    );

    // Step 7: Decrypt the message using the private key
    console.log('\nDecrypting message...');
    try {
      const decrypted = eciesService.decryptSingleWithHeader(
        privateKey,
        encrypted,
      );
      console.log(`Decrypted Message: ${decrypted.toString()}`);
      console.log('Decryption successful!');

      // Verify that the decrypted message matches the original
      if (decrypted.equals(message)) {
        console.log('✅ Decrypted message matches original!');
      } else {
        console.log('❌ Decrypted message does NOT match original!');
      }
    } catch (error) {
      console.error('Decryption failed:', error);

      // Try manual decryption for debugging
      console.log('\n--- Attempting manual decryption for debugging ---');
      try {
        // Set up ECDH with the private key
        const ecdh = createECDH(eciesService.curveName);
        ecdh.setPrivateKey(privateKey);

        // Extract header components
        const ephemeralPublicKey = encrypted.subarray(
          0,
          ECIES.PUBLIC_KEY_LENGTH,
        );
        const iv = encrypted.subarray(
          ECIES.PUBLIC_KEY_LENGTH,
          ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
        );
        const authTag = encrypted.subarray(
          ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
          ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
        );
        const encryptedData = encrypted.subarray(
          ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
        );

        console.log(
          `Ephemeral Public Key: ${ephemeralPublicKey.toString('hex').substring(0, 16)}...`,
        );
        console.log(`IV: ${iv.toString('hex')}`);
        console.log(`Auth Tag: ${authTag.toString('hex')}`);
        console.log(`Encrypted Data Length: ${encryptedData.length} bytes`);

        // Try to compute shared secret with both full and raw ephemeral key formats
        console.log('\nTrying to compute shared secret...');

        // First try with full key (with 0x04 prefix)
        try {
          const sharedSecretFull = ecdh.computeSecret(ephemeralPublicKey);
          console.log(
            `✅ Shared secret computed with full key format: ${sharedSecretFull.toString('hex').substring(0, 16)}...`,
          );
        } catch (e) {
          console.error(
            `❌ Failed to compute shared secret with full key: ${e instanceof Error ? e.message : String(e)}`,
          );
        }

        // Then try with raw key (without prefix)
        if (
          ephemeralPublicKey.length === 65 &&
          ephemeralPublicKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ) {
          try {
            const ephRawKey = ephemeralPublicKey.subarray(1);
            const sharedSecretRaw = ecdh.computeSecret(ephRawKey);
            console.log(
              `✅ Shared secret computed with raw key format: ${sharedSecretRaw.toString('hex').substring(0, 16)}...`,
            );
          } catch (e) {
            console.error(
              `❌ Failed to compute shared secret with raw key: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (innerError) {
        console.error('Manual decryption debugging failed:', innerError);
      }
    }
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

// Run the debug test
debugEciesBrightChain();
