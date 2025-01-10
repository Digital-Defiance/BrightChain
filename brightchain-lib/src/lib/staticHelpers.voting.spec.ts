import { createECDH } from 'crypto';
import { IsolatedPublicKey } from './isolatedPublicKey';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';

/**
 * Much of this will be deprecated pending confirmation that
 * the staticHelpers.voting.derivation functions work as expected and hold up mathematically
 */
describe('staticHelpers.voting', () => {
  // Create ECDH key pair for tests
  const ecdh = createECDH(StaticHelpersECIES.curveName);
  ecdh.generateKeys();
  // Get raw private key without 0x04 prefix
  const privateKey = ecdh.getPrivateKey();
  // Get public key in uncompressed format (with 0x04 prefix)
  const publicKey = ecdh.getPublicKey();
  const keyPair = { privateKey, publicKey };
  const votingKeypair = StaticHelpersVoting.generateVotingKeyPair();

  describe('private key algorithms', () => {
    it('should encrypt and decrypt a private key', () => {
      const encryptedPrivateKey =
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair,
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
          votingKeypair,
          invalidPublicKey,
        );
      }).toThrow();
    });

    it('should maintain key security through encryption/decryption cycle', () => {
      // Test with multiple key pairs
      for (let i = 0; i < 5; i++) {
        const testKeypair = StaticHelpersVoting.generateVotingKeyPair();

        const encryptedPrivateKey =
          StaticHelpersVoting.keyPairToEncryptedPrivateKey(
            testKeypair,
            keyPair.publicKey,
          );

        // Verify encryption is non-deterministic
        const encryptedPrivateKey2 =
          StaticHelpersVoting.keyPairToEncryptedPrivateKey(
            testKeypair,
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
      const votingPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(
        votingPublicKeyBuffer,
      );
      const originalKeyId = (
        votingKeypair.publicKey as IsolatedPublicKey
      ).getKeyId();
      const recoveredKeyId = (votingPublicKey as IsolatedPublicKey).getKeyId();
      expect(recoveredKeyId.equals(originalKeyId)).toBeTruthy();

      // Test key functionality
      const testValue = BigInt(42);
      const encrypted = votingKeypair.publicKey.encrypt(testValue);
      const decrypted = votingKeypair.privateKey.decrypt(encrypted);
      expect(decrypted.toString()).toEqual(testValue.toString());
    });

    it('should handle invalid public key buffer', () => {
      const invalidBuffer = Buffer.from('invalid');
      expect(() => {
        StaticHelpersVoting.bufferToVotingPublicKey(invalidBuffer);
      }).toThrow();
    });

    it('should preserve key properties through buffer conversion', () => {
      // Test with multiple key pairs
      for (let i = 0; i < 5; i++) {
        const testKeypair = StaticHelpersVoting.generateVotingKeyPair();

        const buffer = StaticHelpersVoting.votingPublicKeyToBuffer(
          testKeypair.publicKey,
        );
        const recoveredKey =
          StaticHelpersVoting.bufferToVotingPublicKey(buffer);

        // Verify key IDs match
        const originalKeyId = (
          testKeypair.publicKey as IsolatedPublicKey
        ).getKeyId();
        const recoveredKeyId = (recoveredKey as IsolatedPublicKey).getKeyId();
        expect(recoveredKeyId.equals(originalKeyId)).toBeTruthy();

        // Test encryption/decryption with original key
        const testValue = BigInt(42);
        const encrypted = testKeypair.publicKey.encrypt(testValue);
        const decrypted = testKeypair.privateKey.decrypt(encrypted);
        expect(decrypted.toString()).toEqual(testValue.toString());

        // Test encryption/decryption with recovered key
        const encryptedRecovered = recoveredKey.encrypt(testValue);
        expect(() => {
          // This should throw since we're using a different key instance
          testKeypair.privateKey.decrypt(encryptedRecovered);
        }).toThrow('Key isolation violation');
      }
    });
  });
});
