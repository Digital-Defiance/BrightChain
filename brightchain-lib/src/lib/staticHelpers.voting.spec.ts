import { createECDH, ECDH } from 'crypto';
import { KeyPair } from 'paillier-bigint';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';

type TestKeyPair = {
  publicKey: IsolatedPublicKey;
  privateKey: IsolatedPrivateKey;
};

/**
 * Much of this will be deprecated pending confirmation that
 * the staticHelpers.voting.derivation functions work as expected and hold up mathematically
 */
// Set a longer timeout for all tests in this file
jest.setTimeout(30000);

describe('staticHelpers.voting', () => {
  // Create shared test keys once for all tests
  let ecdh: ECDH;
  let keyPair: { privateKey: Buffer; publicKey: Buffer };
  let votingKeypair: TestKeyPair;
  let testKeypairs: TestKeyPair[];

  beforeAll(() => {
    // Create ECDH key pair
    ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    // Get raw private key without 0x04 prefix
    const privateKey = ecdh.getPrivateKey();
    // Get public key in uncompressed format (with 0x04 prefix)
    const publicKey = ecdh.getPublicKey();
    keyPair = { privateKey, publicKey };
    votingKeypair = StaticHelpersVoting.generateVotingKeyPair() as TestKeyPair;

    // Pre-generate test keypairs
    testKeypairs = Array(3)
      .fill(null)
      .map(() => StaticHelpersVoting.generateVotingKeyPair() as TestKeyPair);
  });

  describe('private key algorithms', () => {
    it('should encrypt and decrypt a private key', () => {
      const encryptedPrivateKey =
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair as unknown as KeyPair,
          keyPair.publicKey,
        );
      expect(encryptedPrivateKey).toBeDefined();
      expect(encryptedPrivateKey.length).toBeGreaterThan(0);
      const decryptedPrivateKey =
        StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
          encryptedPrivateKey,
          keyPair.privateKey,
          votingKeypair.publicKey,
        );
      expect(decryptedPrivateKey.lambda.toString()).toEqual(
        votingKeypair.privateKey.lambda.toString(),
      );
      expect(decryptedPrivateKey.mu.toString()).toEqual(
        votingKeypair.privateKey.mu.toString(),
      );
    });

    it('should handle invalid private key encryption', () => {
      const invalidPublicKey = Buffer.from('invalid');
      expect(() => {
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair as unknown as KeyPair,
          invalidPublicKey,
        );
      }).toThrow();
    });

    it('should maintain key security through encryption/decryption cycle', () => {
      // Test with pre-generated key pairs
      for (const testKeypair of testKeypairs) {
        const encryptedPrivateKey =
          StaticHelpersVoting.keyPairToEncryptedPrivateKey(
            testKeypair as unknown as KeyPair,
            keyPair.publicKey,
          );

        // Verify encryption is non-deterministic
        const encryptedPrivateKey2 =
          StaticHelpersVoting.keyPairToEncryptedPrivateKey(
            testKeypair as unknown as KeyPair,
            keyPair.publicKey,
          );

        expect(encryptedPrivateKey.toString('hex')).not.toEqual(
          encryptedPrivateKey2.toString('hex'),
        );

        const decryptedPrivateKey =
          StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
            encryptedPrivateKey,
            keyPair.privateKey,
            testKeypair.publicKey,
          );

        // Test key functionality after decryption
        const testValue = BigInt(42);
        const encrypted = testKeypair.publicKey.encrypt(testValue);
        const decrypted = decryptedPrivateKey.decrypt(encrypted);
        expect(decrypted.toString()).toEqual(testValue.toString());
      }
    });
  });

  describe('public key algorithms', () => {
    it('should encode and decode a public key', () => {
      const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(
        votingKeypair.publicKey,
      );
      expect(votingPublicKeyBuffer).toBeDefined();
      expect(votingPublicKeyBuffer.length).toBeGreaterThan(0);

      const recoveredPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(
        votingPublicKeyBuffer,
      );

      // Verify key ID matches (should be the same)
      const originalKeyId = votingKeypair.publicKey.getKeyId();
      const recoveredKeyId = recoveredPublicKey.getKeyId();
      expect(recoveredKeyId.equals(originalKeyId)).toBeTruthy();

      // Instance IDs should be different as this is a new instance
      const originalInstanceId = votingKeypair.publicKey.getInstanceId();
      const recoveredInstanceId = recoveredPublicKey.getInstanceId();
      expect(recoveredInstanceId.equals(originalInstanceId)).toBeFalsy();
    });

    it('should handle invalid public key buffer', () => {
      const invalidBuffer = Buffer.from('invalid');
      expect(() => {
        StaticHelpersVoting.bufferToVotingPublicKey(invalidBuffer);
      }).toThrow();
    });

    it('should preserve key properties through buffer conversion', () => {
      // Test with pre-generated key pairs
      for (const testKeypair of testKeypairs) {
        const buffer = StaticHelpersVoting.votingPublicKeyToBuffer(
          testKeypair.publicKey,
        );
        const recoveredKey =
          StaticHelpersVoting.bufferToVotingPublicKey(buffer);

        // Verify key IDs match (should be the same)
        const originalKeyId = testKeypair.publicKey.getKeyId();
        const recoveredKeyId = recoveredKey.getKeyId();
        expect(recoveredKeyId.equals(originalKeyId)).toBeTruthy();

        // Instance IDs should be different
        const originalInstanceId = testKeypair.publicKey.getInstanceId();
        const recoveredInstanceId = recoveredKey.getInstanceId();
        expect(recoveredInstanceId.equals(originalInstanceId)).toBeFalsy();

        // Test encryption with recovered key
        const testValue = BigInt(42);
        const encryptedRecovered = recoveredKey.encrypt(testValue);

        // This should now throw due to instance mismatch
        expect(() => {
          testKeypair.privateKey.decrypt(encryptedRecovered);
        }).toThrow(
          'Key isolation violation: ciphertext from different key instance',
        );
      }
    });
  });
});
