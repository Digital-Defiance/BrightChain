import { createHash, createHmac } from 'crypto';
import { generateRandomKeys } from 'paillier-bigint';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';

describe('Isolated Keys', () => {
  // Helper to extract instance ID from ciphertext
  const extractInstanceId = (
    isolatedPublicKey: IsolatedPublicKey,
    ciphertext: bigint,
  ): Buffer => {
    const hmacLength = 64;
    const ciphertextString = ciphertext.toString(16);
    const receivedHmac = ciphertextString.slice(-hmacLength);
    const calculatedCiphertext = BigInt(
      `0x${ciphertextString.slice(0, -hmacLength)}`,
    );

    const hmac = createHmac('sha256', isolatedPublicKey.keyId)
      .update(calculatedCiphertext.toString(16))
      .digest('hex');

    return hmac === receivedHmac
      ? isolatedPublicKey.instanceId
      : Buffer.from([0]);
  };

  // Helper to generate test keys
  const generateTestKeys = async () => {
    const { publicKey, privateKey } = await generateRandomKeys(2048); // Adjust bit length as needed (2048 is a common secure size)

    // Assuming generatePaillierKeypair gives you an object with publicKey and privateKey already formed
    // If it does not you need to get the 'n', 'g', 'lambda', and 'mu' separately and construct
    // IsolatedPublicKey and IsolatedPrivateKey accordingly.

    const n = publicKey.n;
    const nHex = n.toString(16).padStart(768, '0'); // 768 is arbitrary; adjust as needed
    const nBuffer = Buffer.from(nHex, 'hex');
    const keyId = createHash('sha256').update(nBuffer).digest();

    const isolatedPublicKey = new IsolatedPublicKey(n, publicKey.g, keyId);
    const isolatedPrivateKey = new IsolatedPrivateKey(
      privateKey.lambda,
      privateKey.mu,
      isolatedPublicKey,
    );

    return { isolatedPublicKey, isolatedPrivateKey, n, keyId };
  };

  describe('IsolatedPublicKey', () => {
    it('should create a valid key with correct ID', async () => {
      const { isolatedPublicKey, n, keyId } = await generateTestKeys();
      expect(isolatedPublicKey.n).toBe(n);
      expect(isolatedPublicKey.getKeyId().equals(keyId)).toBe(true);
    });

    it('should encrypt and tag ciphertext with instance ID', async () => {
      const { isolatedPublicKey, isolatedPrivateKey } =
        await generateTestKeys();
      const message = 2n;
      const taggedCiphertext = isolatedPublicKey.encrypt(message);

      // Extract the instance ID from the tagged ciphertext
      const extractedInstanceId =
        isolatedPublicKey.extractInstanceId(taggedCiphertext);

      //Assert that the extracted instance ID matches the key's instance ID.
      expect(
        extractedInstanceId.equals(isolatedPublicKey.getInstanceId()),
      ).toBe(true);

      // Decrypt to verify the whole process
      const decryptedMessage = isolatedPrivateKey.decrypt(taggedCiphertext);
      expect(decryptedMessage).toEqual(message);
    });

    it('should perform homomorphic addition with instance verification', async () => {
      const { isolatedPublicKey, isolatedPrivateKey } =
        await generateTestKeys();
      // Use small messages relative to n for proper homomorphic encryption
      const m1 = 1n;
      const m2 = 2n;
      const c1 = isolatedPublicKey.encrypt(m1);
      const c2 = isolatedPublicKey.encrypt(m2);

      const sum = isolatedPublicKey.addition(c1, c2);
      expect(sum).toBeDefined();

      // Verify the instance ID is preserved in the sum
      const extractedInstanceId = extractInstanceId(isolatedPublicKey, sum); // Use the helper function here

      expect(
        extractedInstanceId.equals(isolatedPublicKey.getInstanceId()),
      ).toBe(true);

      const decryptedSum = isolatedPrivateKey.decrypt(sum);
      expect(decryptedSum).toBe(m1 + m2);
    });

    it('should reject addition with mismatched instance IDs', async () => {
      const { isolatedPublicKey: pk1 } = await generateTestKeys();
      const { isolatedPublicKey: pk2 } = await generateTestKeys();

      const c1 = pk1.encrypt(1n);
      const c2 = pk2.encrypt(2n);

      expect(() => pk1.addition(c1, c2)).toThrow(
        'Key isolation violation: ciphertexts from different key instances',
      );
    }, 10000); // Increased timeout to 10 seconds
  });

  describe('IsolatedPrivateKey', () => {
    it('should create a valid key pair', async () => {
      const { isolatedPrivateKey, isolatedPublicKey } =
        await generateTestKeys();
      expect(isolatedPrivateKey.publicKey).toBe(isolatedPublicKey);
    });

    it('should reject non-isolated public key', async () => {
      const { n, isolatedPublicKey, isolatedPrivateKey } =
        await generateTestKeys();
      const g = isolatedPublicKey.g;
      const lambda = isolatedPrivateKey.lambda;
      const mu = isolatedPrivateKey.mu;
      // Mock a regular Paillier public key without isolation features
      const regularPublicKey = {
        n,
        g,
        encrypt: () => 0n,
        addition: () => 0n,
      } as unknown as IsolatedPublicKey;

      expect(
        () => new IsolatedPrivateKey(lambda, mu, regularPublicKey),
      ).toThrow('Invalid public key: must be an isolated key');
    }, 10000); // Increased timeout to 10 seconds

    it('should decrypt tagged ciphertext correctly', async () => {
      const { isolatedPublicKey, isolatedPrivateKey } =
        await generateTestKeys();
      // Use small message relative to n for proper encryption
      const message = 2n;
      const ciphertext = isolatedPublicKey.encrypt(message);
      const decrypted = isolatedPrivateKey.decrypt(ciphertext);
      expect(decrypted).toBe(message);
    });

    it('should reject ciphertext from different key instance', async () => {
      const { isolatedPrivateKey } = await generateTestKeys();
      const { isolatedPublicKey: otherPublicKey } = await generateTestKeys();

      // Create ciphertext with different instance ID
      const message = 2n;
      const ciphertext = otherPublicKey.encrypt(message);

      // Attempt to decrypt ciphertext from different instance
      expect(() => isolatedPrivateKey.decrypt(ciphertext)).toThrow(
        'Key isolation violation: ciphertext from different key instance',
      );
    });

    it('should perform full encryption/decryption cycle with homomorphic operation', async () => {
      const { isolatedPublicKey, isolatedPrivateKey } =
        await generateTestKeys();

      // Use small messages relative to n for proper homomorphic encryption
      const m1 = 1n;
      const m2 = 2n;
      const c1 = isolatedPublicKey.encrypt(m1);
      const c2 = isolatedPublicKey.encrypt(m2);

      const sum = isolatedPublicKey.addition(c1, c2);
      const decrypted = isolatedPrivateKey.decrypt(sum);

      expect(decrypted).toBe(m1 + m2);
    });
  });
});
