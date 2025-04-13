const crypto = require('crypto');

// Constants matching the library's settings
const CURVE_NAME = 'secp256k1';
const PUBLIC_KEY_MAGIC = 0x04;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SYMMETRIC_ALGORITHM = 'aes-256-gcm';

// Simplified version of BrightChainMember for testing
class Member {
  constructor() {
    // Generate keys
    this.ecdh = crypto.createECDH(CURVE_NAME);
    this.ecdh.generateKeys();

    this.privateKey = this.ecdh.getPrivateKey();

    // Get public key with 0x04 prefix
    const rawPublicKey = this.ecdh.getPublicKey();
    if (rawPublicKey.length === 64) {
      this.publicKey = Buffer.concat([
        Buffer.from([PUBLIC_KEY_MAGIC]),
        rawPublicKey,
      ]);
    } else {
      this.publicKey = rawPublicKey;
    }
  }
}

// Simulate the key normalization function from crypto-core.ts
function normalizePublicKey(publicKey) {
  const keyLength = publicKey.length;

  // Already in correct format (65 bytes with 0x04 prefix)
  if (keyLength === 65 && publicKey[0] === PUBLIC_KEY_MAGIC) {
    return publicKey;
  }

  // Raw key without prefix (64 bytes) - add the 0x04 prefix
  if (keyLength === 64) {
    return Buffer.concat([Buffer.from([PUBLIC_KEY_MAGIC]), publicKey]);
  }

  // Invalid format
  throw new Error(`Invalid public key format or length: ${keyLength}`);
}

// Test ECIES with member keys
function testEciesWithMembers() {
  console.log('\n===== Testing ECIES with Member Keys =====\n');

  try {
    // Create a recipient member (simulates the test)
    const recipient = new Member();
    console.log(
      `Recipient public key (${recipient.publicKey.length} bytes): ${recipient.publicKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Recipient private key (${recipient.privateKey.length} bytes): ${recipient.privateKey.toString('hex').substring(0, 16)}...`,
    );

    // Verify the key formats
    console.log(
      `Public key has 0x04 prefix: ${recipient.publicKey[0] === PUBLIC_KEY_MAGIC}`,
    );

    // Create message
    const message = Buffer.from('Test message for ECIES with member keys');
    console.log(
      `\nOriginal message (${message.length} bytes): ${message.toString()}`,
    );

    // === Encrypt the message ===
    console.log('\n--- ENCRYPTION ---');

    // 1. Create ephemeral key pair for this message
    const ephemeralEcdh = crypto.createECDH(CURVE_NAME);
    ephemeralEcdh.generateKeys();

    // Get ephemeral public key with 0x04 prefix if needed
    let ephemeralPublicKey = ephemeralEcdh.getPublicKey();
    if (ephemeralPublicKey.length === 64) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }
    console.log(
      `Ephemeral public key (${ephemeralPublicKey.length} bytes): ${ephemeralPublicKey.toString('hex').substring(0, 16)}...`,
    );

    // 2. Normalize recipient public key
    const normalizedRecipientPublicKey = normalizePublicKey(
      recipient.publicKey,
    );
    console.log(
      `Normalized recipient public key (${normalizedRecipientPublicKey.length} bytes): ${normalizedRecipientPublicKey.toString('hex').substring(0, 16)}...`,
    );

    // 3. Compute shared secret
    const sharedSecret = ephemeralEcdh.computeSecret(
      normalizedRecipientPublicKey,
    );
    console.log(
      `Shared secret (${sharedSecret.length} bytes): ${sharedSecret.toString('hex').substring(0, 16)}...`,
    );

    // 4. Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    console.log(`IV (${iv.length} bytes): ${iv.toString('hex')}`);

    // 5. Create cipher with derived shared secret (use only first 32 bytes as the key)
    const cipher = crypto.createCipheriv(
      SYMMETRIC_ALGORITHM,
      sharedSecret.subarray(0, 32),
      iv,
    );

    // 6. Encrypt the message
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    console.log(
      `Encrypted data (${encrypted.length} bytes): ${encrypted.toString('hex').substring(0, 32)}...`,
    );

    // 7. Get the authentication tag
    const authTag = cipher.getAuthTag();
    console.log(
      `Auth tag (${authTag.length} bytes): ${authTag.toString('hex')}`,
    );

    // 8. Format: | ephemeralPublicKey (65) | iv (16) | authTag (16) | encryptedData |
    const completeEncrypted = Buffer.concat([
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    ]);
    console.log(
      `Complete encrypted (${completeEncrypted.length} bytes): ${completeEncrypted.toString('hex').substring(0, 32)}...`,
    );

    // === Decrypt the message ===
    console.log('\n--- DECRYPTION ---');

    // 1. Parse the header components
    const extractedEphemeralPublicKey = completeEncrypted.subarray(0, 65); // Fixed size of 65 with 0x04 prefix
    const extractedIv = completeEncrypted.subarray(65, 65 + IV_LENGTH);
    const extractedAuthTag = completeEncrypted.subarray(
      65 + IV_LENGTH,
      65 + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const extractedEncrypted = completeEncrypted.subarray(
      65 + IV_LENGTH + AUTH_TAG_LENGTH,
    );

    console.log(
      `Extracted ephemeral public key (${extractedEphemeralPublicKey.length} bytes): ${extractedEphemeralPublicKey.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Extracted IV (${extractedIv.length} bytes): ${extractedIv.toString('hex')}`,
    );
    console.log(
      `Extracted auth tag (${extractedAuthTag.length} bytes): ${extractedAuthTag.toString('hex')}`,
    );
    console.log(
      `Extracted encrypted data (${extractedEncrypted.length} bytes): ${extractedEncrypted.toString('hex').substring(0, 32)}...`,
    );

    // 2. Normalize ephemeral public key
    const normalizedEphemeralKey = normalizePublicKey(
      extractedEphemeralPublicKey,
    );
    console.log(
      `Normalized ephemeral key (${normalizedEphemeralKey.length} bytes): ${normalizedEphemeralKey.toString('hex').substring(0, 16)}...`,
    );

    // 3. Set up ECDH with recipient's private key
    const decryptEcdh = crypto.createECDH(CURVE_NAME);
    decryptEcdh.setPrivateKey(recipient.privateKey);

    // 4. Compute shared secret with ephemeral public key
    const decryptSharedSecret = decryptEcdh.computeSecret(
      normalizedEphemeralKey,
    );
    console.log(
      `Decryption shared secret (${decryptSharedSecret.length} bytes): ${decryptSharedSecret.toString('hex').substring(0, 16)}...`,
    );
    console.log(
      `Encryption and decryption secrets match: ${sharedSecret.equals(decryptSharedSecret)}`,
    );

    // 5. Create decipher with shared secret
    const decipher = crypto.createDecipheriv(
      SYMMETRIC_ALGORITHM,
      decryptSharedSecret.subarray(0, 32),
      extractedIv,
    );

    // 6. Set authentication tag
    decipher.setAuthTag(extractedAuthTag);

    // 7. Decrypt
    let decrypted;
    try {
      const firstPart = decipher.update(extractedEncrypted);
      const finalPart = decipher.final();
      decrypted = Buffer.concat([firstPart, finalPart]);
      console.log(
        `\nDecrypted message (${decrypted.length} bytes): ${decrypted.toString()}`,
      );
      console.log(`Decryption successful: ${decrypted.equals(message)}`);
    } catch (err) {
      console.error('Decryption failed:', err.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testEciesWithMembers();
