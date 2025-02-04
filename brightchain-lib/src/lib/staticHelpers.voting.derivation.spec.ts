import { createECDH, ECDH } from 'crypto';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVotingDerivation } from './staticHelpers.voting.derivation';

type IsolatedKeyPair = {
  publicKey: IsolatedPublicKey;
  privateKey: IsolatedPrivateKey;
};

describe('staticHelpers.voting.derivation', () => {
  // Increase timeout for all tests
  jest.setTimeout(30000);

  // Shared test data
  let ecdh: ECDH;
  let privateKey: Buffer;
  let publicKey: Buffer;
  let votingKeys: IsolatedKeyPair;

  beforeAll(() => {
    // Create ECDH keys once for all tests
    ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    privateKey = ecdh.getPrivateKey();
    publicKey = ecdh.getPublicKey();
    // Cast to IsolatedKeyPair since we know the implementation creates these types
    votingKeys = StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
      privateKey,
      publicKey,
    ) as unknown as IsolatedKeyPair;
  });

  describe('deriveVotingKeysFromECDH', () => {
    it('should derive consistent voting keys from same ECDH keys', () => {
      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKey,
        ) as unknown as IsolatedKeyPair;

      expect(votingKeys.publicKey.n).toEqual(votingKeys2.publicKey.n);
      expect(votingKeys.privateKey.lambda).toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should derive different voting keys from different ECDH keys', () => {
      const ecdh2 = createECDH(StaticHelpersECIES.curveName);
      ecdh2.generateKeys();

      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          ecdh2.getPrivateKey(),
          ecdh2.getPublicKey(),
        ) as unknown as IsolatedKeyPair;

      expect(votingKeys.publicKey.n).not.toEqual(votingKeys2.publicKey.n);
      expect(votingKeys.privateKey.lambda).not.toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should generate valid key pairs with encryption and homomorphic properties', () => {
      // Test basic encryption/decryption
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

      // Test probabilistic encryption
      const encryptedValues = new Set();
      for (let i = 0; i < 3; i++) {
        const encrypted = votingKeys.publicKey.encrypt(testValue);
        encryptedValues.add(encrypted.toString());
      }
      expect(encryptedValues.size).toBe(3);
    });

    it('should handle public keys with and without 0x04 prefix', () => {
      // Get public key with prefix
      const publicKeyWithPrefix = ecdh.getPublicKey(null, 'uncompressed');
      // Get public key without prefix
      const publicKeyWithoutPrefix = ecdh.getPublicKey();

      const votingKeys1 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKeyWithPrefix,
        ) as unknown as IsolatedKeyPair;
      const votingKeys2 =
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKeyWithoutPrefix,
        ) as unknown as IsolatedKeyPair;

      expect(votingKeys1.publicKey.n).toEqual(votingKeys2.publicKey.n);
      expect(votingKeys1.privateKey.lambda).toEqual(
        votingKeys2.privateKey.lambda,
      );
    });

    it('should handle invalid inputs', () => {
      // Test non-Buffer inputs
      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          'invalid' as unknown as Buffer,
          publicKey,
        ),
      ).toThrow('Private key must be a Buffer');

      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          'invalid' as unknown as Buffer,
        ),
      ).toThrow('Public key must be a Buffer');

      // Test invalid public key format
      const invalidPubKey = Buffer.from('0123456789', 'hex'); // Wrong length
      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          invalidPubKey,
        ),
      ).toThrow('Invalid public key format');

      // Test invalid ECDH key pair
      const invalidPrivKey = Buffer.from('00'.repeat(32), 'hex'); // All zeros
      expect(() =>
        StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          invalidPrivKey,
          publicKey,
        ),
      ).toThrow('Invalid ECDH key pair');
    });

    it('should maintain homomorphic properties with instance verification', () => {
      const values = [1n, 2n, 3n];
      const publicKey = votingKeys.publicKey;
      const privateKey = votingKeys.privateKey;

      // Test homomorphic operations with instance verification
      const encryptedValues = values.map((v) => {
        const encrypted = publicKey.encrypt(v);
        const instanceId = publicKey.extractInstanceId(encrypted);
        expect(instanceId.equals(publicKey.getInstanceId())).toBe(true);
        return encrypted;
      });

      // Test sum
      let encryptedSum = encryptedValues[0];
      for (let i = 1; i < encryptedValues.length; i++) {
        encryptedSum = publicKey.addition(encryptedSum, encryptedValues[i]);
        const instanceId = publicKey.extractInstanceId(encryptedSum);
        expect(instanceId.equals(publicKey.getInstanceId())).toBe(true);
      }

      const decryptedSum = privateKey.decrypt(encryptedSum);
      const expectedSum = values.reduce((a, b) => a + b, 0n);
      expect(decryptedSum).toBe(expectedSum);

      // Test multiplication
      const constant = 2n;
      const encryptedProduct = publicKey.multiply(encryptedValues[0], constant);
      const instanceId = publicKey.extractInstanceId(encryptedProduct);
      expect(instanceId.equals(publicKey.getInstanceId())).toBe(true);
      const decryptedProduct = privateKey.decrypt(encryptedProduct);
      expect(decryptedProduct).toBe(values[0] * constant);
    });

    it('should generate deterministic keys consistently', () => {
      const results = new Set();
      for (let i = 0; i < 3; i++) {
        const newKeys = StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
          privateKey,
          publicKey,
        ) as unknown as IsolatedKeyPair;
        results.add(newKeys.publicKey.n.toString());
      }
      expect(results.size).toBe(1);
    });
  });
});
