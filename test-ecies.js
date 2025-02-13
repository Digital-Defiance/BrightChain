const crypto = require('crypto');

// Constants matching the library's settings
const CURVE_NAME = 'secp256k1';
const PUBLIC_KEY_MAGIC = 0x04;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SYMMETRIC_ALGORITHM = 'aes-256-gcm';

// Simple test for encryption and decryption
function testEciesEncryption() {
  console.log('ECIES Test');
  console.log('==========');

  try {
    // Generate an EC key pair
    console.log('\nGenerating key pair...');
    const ecdh = crypto.createECDH(CURVE_NAME);
    ecdh.generateKeys();

    const privateKey = ecdh.getPrivateKey();
    let publicKey = ecdh.getPublicKey();

    // Ensure public key has the 0x04 prefix
    if (publicKey.length === 64) {
      // No prefix
      publicKey = Buffer.concat([Buffer.from([PUBLIC_KEY_MAGIC]), publicKey]);
    }

    console.log(
      `Private key (${privateKey.length} bytes): ${privateKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Public key (${publicKey.length} bytes): ${publicKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(`Public key prefix: 0x${publicKey[0].toString(16)}`);

    // Test message
    const message = Buffer.from(
      'This is a secret message for testing ECIES encryption and decryption',
    );
    console.log(
      `\nOriginal message (${message.length} bytes): ${message.toString()}`,
    );

    // Encrypt the message
    console.log('\n--- Encryption ---');

    // Generate ephemeral key pair for this message
    const ephemeralEcdh = crypto.createECDH(CURVE_NAME);
    ephemeralEcdh.generateKeys();

    let ephemeralPublicKey = ephemeralEcdh.getPublicKey();
    // Ensure ephemeral public key has 0x04 prefix
    if (ephemeralPublicKey.length === 64) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    console.log(
      `Ephemeral public key (${ephemeralPublicKey.length} bytes): ${ephemeralPublicKey.toString('hex').substring(0, 16)}...`,
    );

    // Compute shared secret
    const sharedSecret = ephemeralEcdh.computeSecret(publicKey);
    console.log(
      `Shared secret (${sharedSecret.length} bytes): ${sharedSecret.toString('hex').substring(0, 16)}...`,
    );

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    console.log(`IV (${iv.length} bytes): ${iv.toString('hex')}`);

    // Create cipher with shared secret (use first 32 bytes as key)
    const cipher = crypto.createCipheriv(
      SYMMETRIC_ALGORITHM,
      sharedSecret.subarray(0, 32),
      iv,
    );

    // Encrypt the message
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    console.log(
      `Encrypted data (${encrypted.length} bytes): ${encrypted.toString('hex').substring(0, 32)}...`,
    );

    // Get authentication tag
    const authTag = cipher.getAuthTag();
    console.log(
      `Auth tag (${authTag.length} bytes): ${authTag.toString('hex')}`,
    );

    // Format complete encrypted message
    const completeEncrypted = Buffer.concat([
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    ]);
    console.log(
      `Complete encrypted (${completeEncrypted.length} bytes): ${completeEncrypted.toString('hex').substring(0, 32)}...`,
    );

    // Decrypt the message
    console.log('\n--- Decryption ---');

    // Extract components
    const extractedEphemeralPublicKey = completeEncrypted.subarray(
      0,
      ephemeralPublicKey.length,
    );
    const extractedIv = completeEncrypted.subarray(
      ephemeralPublicKey.length,
      ephemeralPublicKey.length + IV_LENGTH,
    );
    const extractedAuthTag = completeEncrypted.subarray(
      ephemeralPublicKey.length + IV_LENGTH,
      ephemeralPublicKey.length + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const extractedEncrypted = completeEncrypted.subarray(
      ephemeralPublicKey.length + IV_LENGTH + AUTH_TAG_LENGTH,
    );

    console.log(`Extracted components matched:
      Ephemeral public key: ${extractedEphemeralPublicKey.equals(ephemeralPublicKey)}
      IV: ${extractedIv.equals(iv)}
      Auth tag: ${extractedAuthTag.equals(authTag)}
      Encrypted data: ${extractedEncrypted.equals(encrypted)}
    `);

    // Set up ECDH with the original private key
    const decryptEcdh = crypto.createECDH(CURVE_NAME);
    decryptEcdh.setPrivateKey(privateKey);

    // Compute shared secret with ephemeral public key
    const decryptSharedSecret = decryptEcdh.computeSecret(
      extractedEphemeralPublicKey,
    );
    console.log(
      `Decryption shared secret matches: ${decryptSharedSecret.equals(sharedSecret)}`,
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(
      SYMMETRIC_ALGORITHM,
      decryptSharedSecret.subarray(0, 32),
      extractedIv,
    );

    // Set authentication tag
    decipher.setAuthTag(extractedAuthTag);

    // Decrypt
    let decrypted = decipher.update(extractedEncrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    console.log(
      `\nDecrypted message (${decrypted.length} bytes): ${decrypted.toString()}`,
    );
    console.log(`Decryption successful: ${decrypted.equals(message)}`);

    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testEciesEncryption();
