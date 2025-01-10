import { createECDH } from 'crypto';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVotingDerivation } from './staticHelpers.voting.derivation';

describe('staticHelpers.voting.derivation', () => {
  describe('deriveVotingKeysFromECDH', () => {
    it('should derive consistent voting keys from same ECDH keys', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const privateKey = ecdh.getPrivateKey();
      const publicKey = ecdh.getPublicKey();

      const votingKeys1 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKey,
        );
      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKey,
        );

      expect(votingKeys1.publicKey.n).toEqual(votingKeys2.publicKey.n);
      expect(votingKeys1.privateKey.lambda).toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should derive different voting keys from different ECDH keys', () => {
      const ecdh1 = createECDH(StaticHelpersECIES.curveName);
      const ecdh2 = createECDH(StaticHelpersECIES.curveName);
      ecdh1.generateKeys();
      ecdh2.generateKeys();

      const votingKeys1 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          ecdh1.getPrivateKey(),
          ecdh1.getPublicKey(),
        );
      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          ecdh2.getPrivateKey(),
          ecdh2.getPublicKey(),
        );

      expect(votingKeys1.publicKey.n).not.toEqual(votingKeys2.publicKey.n);
      expect(votingKeys1.privateKey.lambda).not.toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should generate valid key pairs that can encrypt and decrypt', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const privateKey = ecdh.getPrivateKey();
      const publicKey = ecdh.getPublicKey();

      const votingKeys = StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
        privateKey,
        publicKey,
      );

      // Test encryption/decryption
      const testValue = 42n;
      const encrypted = votingKeys.publicKey.encrypt(testValue);
      const decrypted = votingKeys.privateKey.decrypt(encrypted);
      expect(decrypted).toBe(testValue);

      // Test homomorphic properties
      const value1 = 10n;
      const value2 = 20n;
      const enc1 = votingKeys.publicKey.encrypt(value1);
      const enc2 = votingKeys.publicKey.encrypt(value2);
      const encSum = votingKeys.publicKey.addition(enc1, enc2);
      const decSum = votingKeys.privateKey.decrypt(encSum);
      expect(decSum).toBe(value1 + value2);
    });

    it('should handle public keys with and without 0x04 prefix', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();

      // Correctly get the private key, stripping 0x04 prefix if present and ensuring 32 bytes
      const privateKey = ecdh.getPrivateKey('hex');
      let privateKeyBuffer = Buffer.from(privateKey, 'hex');
      if (privateKeyBuffer.length > 32) {
        privateKeyBuffer = privateKeyBuffer.subarray(1, 33);
      }

      // Get public key with prefix
      const publicKeyWithPrefix = ecdh.getPublicKey(null, 'uncompressed');
      // Get public key without prefix
      const publicKeyWithoutPrefix = ecdh.getPublicKey();

      const votingKeys1 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKeyBuffer,
          publicKeyWithPrefix,
        );
      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKeyBuffer,
          publicKeyWithoutPrefix,
        );

      // Both should generate the same keys
      expect(votingKeys1.publicKey.n).toEqual(votingKeys2.publicKey.n);
      expect(votingKeys1.privateKey.lambda).toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should handle invalid inputs', () => {
      const invalidPrivKey = Buffer.from('invalid');
      const invalidPubKey = Buffer.from('invalid');
      const validEcdh = createECDH(StaticHelpersECIES.curveName);
      validEcdh.generateKeys();

      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          invalidPrivKey,
          validEcdh.getPublicKey(),
        ),
      ).toThrow();

      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          validEcdh.getPrivateKey(),
          invalidPubKey,
        ),
      ).toThrow();
    });
  });
});
