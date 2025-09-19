import { ECIES } from '@brightchain/brightchain-lib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * This script isolates the symmetric encryption (AES-GCM) part of ECIES
 * to help diagnose issues with the implementation.
 */
function debugAesGcm() {
  console.log('=== AES-GCM Encryption/Decryption Debug Test ===\n');

  try {
    // Create a test message
    const message = Buffer.from(
      'This is a test message for AES-GCM encryption/decryption',
    );
    console.log(
      `Original Message (${message.length} bytes): ${message.toString()}`,
    );

    // Generate a random key (32 bytes for AES-256-GCM) and IV (16 bytes)
    const key = randomBytes(32);
    const iv = randomBytes(16);

    console.log(
      `\nKey (${key.length} bytes): ${key.toString('hex').substring(0, 32)}...`,
    );
    console.log(`IV (${iv.length} bytes): ${iv.toString('hex')}`);

    // Step 1: Encrypt using AES-GCM
    console.log('\nStep 1: Encrypting message...');

    // Create cipher with the key and IV
    const cipher = createCipheriv(
      ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      key,
      iv,
    );

    // Encrypt the message
    const encrypted = Buffer.concat([cipher.update(message), cipher.final()]);

    // Get the authentication tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authTag = (cipher as any).getAuthTag();

    console.log(`Encrypted size: ${encrypted.length} bytes`);
    console.log(
      `Encrypted data (hex): ${encrypted.toString('hex').substring(0, 32)}...`,
    );
    console.log(
      `Auth Tag (${authTag.length} bytes): ${authTag.toString('hex')}`,
    );

    // Step 2: Decrypt using AES-GCM
    console.log('\nStep 2: Decrypting message...');
    try {
      // Create decipher with the same key and IV
      const decipher = createDecipheriv(
        ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
        key,
        iv,
      );

      // Set the authentication tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (decipher as any).setAuthTag(authTag);

      // Decrypt the message
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      console.log(
        `Decrypted Message (${
          decrypted.length
        } bytes): ${decrypted.toString()}`,
      );

      // Verify that the decrypted message matches the original
      if (decrypted.equals(message)) {
        console.log('✅ Decrypted message matches original!');
      } else {
        console.log('❌ Decrypted message does NOT match original!');
        console.log(`Original: ${message.toString('hex')}`);
        console.log(`Decrypted: ${decrypted.toString('hex')}`);
      }
    } catch (error) {
      console.error('Decryption failed:', error);
    }

    // Step 3: Test with incomplete data
    console.log('\nStep 3: Testing with incomplete data...');
    try {
      // Create decipher with the same key and IV
      const decipher = createDecipheriv(
        ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
        key,
        iv,
      );

      // Set the authentication tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (decipher as any).setAuthTag(authTag);

      // Try to decrypt with incomplete data (missing the last byte)
      const incompleteEncrypted = encrypted.subarray(0, encrypted.length - 1);
      console.log(
        `Incomplete encrypted size: ${incompleteEncrypted.length} bytes (missing 1 byte)`,
      );

      const decrypted = Buffer.concat([
        decipher.update(incompleteEncrypted),
        decipher.final(),
      ]);

      console.log(`Decrypted from incomplete data: ${decrypted.toString()}`);
    } catch (error) {
      console.error('Decryption of incomplete data failed:', error);
      console.log('✅ Expected failure for incomplete data!');
    }

    // Step 4: Test with incorrect auth tag
    console.log('\nStep 4: Testing with incorrect auth tag...');
    try {
      // Create decipher with the same key and IV
      const decipher = createDecipheriv(
        ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
        key,
        iv,
      );

      // Set an incorrect authentication tag
      const wrongAuthTag = Buffer.from(authTag);
      wrongAuthTag[0] = (wrongAuthTag[0] + 1) % 256; // Change the first byte
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (decipher as any).setAuthTag(wrongAuthTag);

      console.log(`Incorrect Auth Tag: ${wrongAuthTag.toString('hex')}`);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      console.log(`Decrypted with wrong auth tag: ${decrypted.toString()}`);
    } catch (error) {
      console.error('Decryption with wrong auth tag failed:', error);
      console.log('✅ Expected failure for incorrect auth tag!');
    }
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

// Run the debug test
debugAesGcm();
