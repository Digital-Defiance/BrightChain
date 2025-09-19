/**
 * Simple integration tests for the browser ECIES service
 * These tests can be run in the browser console to verify functionality
 */

import { SecureString } from '../../secure-string';
import {
  stringToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToString,
} from '../../utils';
import { ECIESService } from './service';

/**
 * Test basic encryption/decryption roundtrip
 */
export async function testBasicEncryption(): Promise<boolean> {
  try {
    const ecies = new ECIESService();
    const mnemonic = ecies.generateNewMnemonic();
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

    const message = stringToUint8Array('Test message');
    const encrypted = await ecies.encryptSimpleOrSingle(
      false,
      publicKey,
      message,
    );
    const decrypted = await ecies.decryptSimpleOrSingleWithHeader(
      false,
      privateKey,
      encrypted,
    );

    return uint8ArrayToString(message) === uint8ArrayToString(decrypted);
  } catch (error) {
    console.error('Basic encryption test failed:', error);
    return false;
  }
}

/**
 * Test simple mode encryption
 */
export async function testSimpleEncryption(): Promise<boolean> {
  try {
    const ecies = new ECIESService();
    const mnemonic = ecies.generateNewMnemonic();
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

    const message = stringToUint8Array('Simple test message');
    const encrypted = await ecies.encryptSimpleOrSingle(
      true,
      publicKey,
      message,
    );
    const decrypted = await ecies.decryptSimpleOrSingleWithHeader(
      true,
      privateKey,
      encrypted,
    );

    return uint8ArrayToString(message) === uint8ArrayToString(decrypted);
  } catch (error) {
    console.error('Simple encryption test failed:', error);
    return false;
  }
}

/**
 * Test signature operations
 */
export async function testSignatures(): Promise<boolean> {
  try {
    const ecies = new ECIESService();
    const mnemonic = ecies.generateNewMnemonic();
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

    const message = stringToUint8Array('Message to sign');
    const signature = ecies.signMessage(privateKey, message);
    const isValid = ecies.verifyMessage(publicKey, message, signature);

    // Test with wrong message
    const wrongMessage = stringToUint8Array('Wrong message');
    const isInvalid = ecies.verifyMessage(publicKey, wrongMessage, signature);

    return isValid && !isInvalid;
  } catch (error) {
    console.error('Signature test failed:', error);
    return false;
  }
}

/**
 * Test mnemonic validation
 */
export async function testMnemonicValidation(): Promise<boolean> {
  try {
    const ecies = new ECIESService();

    // Test valid mnemonic
    const validMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    const { wallet: wallet1 } = ecies.walletAndSeedFromMnemonic(validMnemonic);
    const { wallet: wallet2 } = ecies.walletAndSeedFromMnemonic(validMnemonic);

    // Should produce same keys
    const sameKeys =
      uint8ArrayToHex(wallet1.getPrivateKey()) ===
      uint8ArrayToHex(wallet2.getPrivateKey());

    // Test invalid mnemonic
    try {
      ecies.walletAndSeedFromMnemonic(
        new SecureString('invalid mnemonic phrase'),
      );
      return false; // Should have thrown
    } catch {
      return sameKeys; // Expected to throw
    }
  } catch (error) {
    console.error('Mnemonic validation test failed:', error);
    return false;
  }
}

/**
 * Test cross-party encryption (Alice encrypts for Bob)
 */
export async function testCrossPartyEncryption(): Promise<boolean> {
  try {
    const ecies = new ECIESService();

    // Alice generates her keys
    const aliceMnemonic = ecies.generateNewMnemonic();
    const aliceKeys = ecies.mnemonicToSimpleKeyPair(aliceMnemonic);

    // Bob generates his keys
    const bobMnemonic = ecies.generateNewMnemonic();
    const bobKeys = ecies.mnemonicToSimpleKeyPair(bobMnemonic);

    // Alice encrypts a message for Bob
    const message = stringToUint8Array('Secret message from Alice to Bob');
    const encrypted = await ecies.encryptSimpleOrSingle(
      false,
      bobKeys.publicKey,
      message,
    );

    // Bob decrypts the message
    const decrypted = await ecies.decryptSimpleOrSingleWithHeader(
      false,
      bobKeys.privateKey,
      encrypted,
    );

    // Alice should not be able to decrypt (wrong private key)
    try {
      await ecies.decryptSimpleOrSingleWithHeader(
        false,
        aliceKeys.privateKey,
        encrypted,
      );
      return false; // Should have failed
    } catch {
      // Expected to fail
    }

    return uint8ArrayToString(message) === uint8ArrayToString(decrypted);
  } catch (error) {
    console.error('Cross-party encryption test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('Running browser ECIES service tests...\n');

  const tests = [
    { name: 'Basic Encryption', test: testBasicEncryption },
    { name: 'Simple Encryption', test: testSimpleEncryption },
    { name: 'Digital Signatures', test: testSignatures },
    { name: 'Mnemonic Validation', test: testMnemonicValidation },
    { name: 'Cross-Party Encryption', test: testCrossPartyEncryption },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ERROR - ${error}`);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log(
      '🎉 All tests passed! The browser ECIES service is working correctly.',
    );
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}
