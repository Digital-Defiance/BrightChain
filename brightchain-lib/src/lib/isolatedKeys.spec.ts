import { createHash, createHmac } from 'crypto';
import { generateRandomKeys } from 'paillier-bigint';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';

describe('Isolated Keys', () => {
  const KEY_BITS = 1024;
  let isolatedPublicKey: IsolatedPublicKey;
  let isolatedPrivateKey: IsolatedPrivateKey;
  let keyId: Buffer;
  let n: bigint;

  // Helper to generate test keys
  const generateTestKeys = async () => {
    const { publicKey, privateKey } = await generateRandomKeys(KEY_BITS); // Reduced bit length for faster tests

    const n = publicKey.n;
    const nHex = n.toString(16).padStart(768, '0');
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

  beforeAll(async () => {
    const {
      isolatedPublicKey: ipubkey,
      isolatedPrivateKey: iprivkey,
      n: nValue,
      keyId: kValue,
    } = await generateTestKeys();
    isolatedPublicKey = ipubkey;
    isolatedPrivateKey = iprivkey;
    n = nValue;
    keyId = kValue;

    const nHex = n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    keyId = createHash('sha256').update(nBuffer).digest();

    isolatedPublicKey = new IsolatedPublicKey(n, ipubkey.g, keyId);
    isolatedPrivateKey = new IsolatedPrivateKey(
      iprivkey.lambda,
      iprivkey.mu,
      isolatedPublicKey,
    );
  }, 25000);

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

    const hmac = createHmac(
      'sha256',
      Buffer.concat([
        isolatedPublicKey.keyId,
        isolatedPublicKey.getInstanceId(),
      ]),
    )
      .update(calculatedCiphertext.toString(16))
      .digest('hex');

    return hmac === receivedHmac
      ? isolatedPublicKey.getInstanceId()
      : Buffer.from([0]);
  };

  describe('IsolatedPublicKey', () => {
    it('should create a valid key with correct ID', async () => {
      expect(isolatedPublicKey.n).toBe(n);
      expect(isolatedPublicKey.getKeyId().equals(keyId)).toBe(true);
    });

    it('should encrypt and tag ciphertext with instance ID', async () => {
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
      const { isolatedPublicKey: pk2 } = await generateTestKeys();

      const c1 = isolatedPublicKey.encrypt(1n);
      const c2 = pk2.encrypt(2n);

      expect(() => isolatedPublicKey.addition(c1, c2)).toThrow(
        'Key isolation violation: ciphertexts from different key instances',
      );
    }, 30000);
  });

  describe('IsolatedPrivateKey', () => {
    it('should create a valid key pair', async () => {
      expect(isolatedPrivateKey.publicKey).toBe(isolatedPublicKey);
    });

    it('should reject non-isolated public key', async () => {
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
    });

    it('should decrypt tagged ciphertext correctly', async () => {
      // Use small message relative to n for proper encryption
      const message = 2n;
      const ciphertext = isolatedPublicKey.encrypt(message);
      const decrypted = isolatedPrivateKey.decrypt(ciphertext);
      expect(decrypted).toBe(message);
    });

    it('should reject ciphertext from different key instance', async () => {
      const { isolatedPublicKey: otherPublicKey } = await generateTestKeys();

      // Create ciphertext with different instance ID
      const message = 2n;
      const ciphertext = otherPublicKey.encrypt(message);

      // Attempt to decrypt ciphertext from different instance
      expect(() => isolatedPrivateKey.decrypt(ciphertext)).toThrow(
        'Key isolation violation: ciphertext from different key instance',
      );
    }, 30000);

    it('should perform full encryption/decryption cycle with homomorphic operation', async () => {
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
