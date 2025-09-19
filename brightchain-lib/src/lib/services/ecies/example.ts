/**
 * Example usage of the browser-compatible ECIES service
 * This file demonstrates how to use the web-based ECIES implementation
 */

import { SecureString } from '../../secure-string';
import {
  stringToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToString,
} from '../../utils';
import { ECIESService } from './service';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

/**
 * Example: Basic encryption and decryption
 */
export async function basicEncryptionExample(): Promise<void> {
  console.log('=== Basic ECIES Encryption Example ===');

  // Create ECIES service instance
  const ecies = new ECIESService();

  // Generate a mnemonic and derive keys
  const mnemonic = ecies.generateNewMnemonic();
  console.log('Generated mnemonic:', mnemonic);

  const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);
  console.log('Private key:', uint8ArrayToHex(privateKey));
  console.log('Public key:', uint8ArrayToHex(publicKey));

  // Message to encrypt
  const message = stringToUint8Array('Hello, Digital Burnbag!');
  console.log('Original message:', uint8ArrayToString(message));

  // Encrypt using single mode (with CRC and length)
  const encrypted = await ecies.encryptSimpleOrSingle(
    false,
    publicKey,
    message,
  );
  console.log('Encrypted data length:', encrypted.length);
  console.log('Encrypted data (hex):', uint8ArrayToHex(encrypted));

  // Decrypt the message
  const decrypted = await ecies.decryptSimpleOrSingleWithHeader(
    false,
    privateKey,
    encrypted,
  );
  console.log('Decrypted message:', uint8ArrayToString(decrypted));

  // Verify the message matches
  const matches = uint8ArrayToString(message) === uint8ArrayToString(decrypted);
  console.log('Encryption/Decryption successful:', matches);
}

/**
 * Example: Simple mode encryption (without CRC)
 */
export async function simpleEncryptionExample(): Promise<void> {
  console.log('\n=== Simple ECIES Encryption Example ===');

  const ecies = new ECIESService();

  // Generate keys for sender and receiver
  const senderMnemonic = ecies.generateNewMnemonic();
  const receiverMnemonic = ecies.generateNewMnemonic();

  const senderKeys = ecies.mnemonicToSimpleKeyPair(senderMnemonic);
  const receiverKeys = ecies.mnemonicToSimpleKeyPair(receiverMnemonic);

  console.log('Sender public key:', uint8ArrayToHex(senderKeys.publicKey));
  console.log('Receiver public key:', uint8ArrayToHex(receiverKeys.publicKey));

  // Message to encrypt
  const message = stringToUint8Array('This is a simple encrypted message');
  console.log('Original message:', uint8ArrayToString(message));

  // Encrypt using simple mode (no CRC, no length prefix)
  const encrypted = await ecies.encryptSimpleOrSingle(
    true,
    receiverKeys.publicKey,
    message,
  );
  console.log('Encrypted data length:', encrypted.length);

  // Decrypt the message
  const decrypted = await ecies.decryptSimpleOrSingleWithHeader(
    true,
    receiverKeys.privateKey,
    encrypted,
  );
  console.log('Decrypted message:', uint8ArrayToString(decrypted));

  // Verify the message matches
  const matches = uint8ArrayToString(message) === uint8ArrayToString(decrypted);
  console.log('Simple encryption/decryption successful:', matches);
}

/**
 * Example: Digital signature
 */
export async function signatureExample(): Promise<void> {
  console.log('\n=== Digital Signature Example ===');

  const ecies = new ECIESService();

  // Generate keys
  const mnemonic = ecies.generateNewMnemonic();
  const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

  // Message to sign
  const message = stringToUint8Array('This message is digitally signed');
  console.log('Message to sign:', uint8ArrayToString(message));

  // Sign the message
  const signature = ecies.signMessage(privateKey, message);
  console.log('Signature:', uint8ArrayToHex(signature));

  // Verify the signature
  const isValid = ecies.verifyMessage(publicKey, message, signature);
  console.log('Signature valid:', isValid);

  // Test with tampered message
  const tamperedMessage = stringToUint8Array(
    'This message has been tampered with',
  );
  const isTamperedValid = ecies.verifyMessage(
    publicKey,
    tamperedMessage,
    signature,
  );
  console.log('Tampered message signature valid:', isTamperedValid);
}

/**
 * Example: Wallet derivation from mnemonic
 */
export async function walletDerivationExample(): Promise<void> {
  console.log('\n=== Wallet Derivation Example ===');

  const ecies = new ECIESService();

  // Use a known mnemonic for reproducible results
  const mnemonic = new SecureString(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  );
  console.log('Test mnemonic:', mnemonic);

  // Derive wallet
  const { wallet, seed } = ecies.walletAndSeedFromMnemonic(mnemonic);
  console.log('Seed:', uint8ArrayToHex(seed));
  console.log('Private key:', uint8ArrayToHex(wallet.getPrivateKey()));
  console.log('Public key:', uint8ArrayToHex(wallet.getPublicKey()));

  // Derive the same keys using the simple method
  const simpleKeys = ecies.mnemonicToSimpleKeyPair(mnemonic);
  console.log(
    'Simple private key matches:',
    uint8ArrayToHex(wallet.getPrivateKey()) ===
      uint8ArrayToHex(simpleKeys.privateKey),
  );
  console.log(
    'Simple public key matches:',
    uint8ArrayToHex(wallet.getPublicKey()) ===
      uint8ArrayToHex(simpleKeys.publicKey),
  );
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  try {
    await basicEncryptionExample();
    await simpleEncryptionExample();
    await signatureExample();
    await walletDerivationExample();
    console.log('\n=== All examples completed successfully! ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}
