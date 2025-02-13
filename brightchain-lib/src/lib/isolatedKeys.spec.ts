import { createHash, createHmac } from 'crypto';
import { generateRandomKeys } from 'paillier-bigint';
import { VOTING } from './constants';
import { IsolatedKeyErrorType } from './enumerations/isolatedKeyErrorType';
import { IsolatedKeyError } from './errors/isolatedKeyError';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';

// Test key types and cache
const KEY_BITS = 256; // Need to keep 256 bits due to fixed padding in IsolatedPublicKey
type TestKeys = {
  isolatedPublicKey: IsolatedPublicKey;
  isolatedPrivateKey: IsolatedPrivateKey;
  n: bigint;
  keyId: Buffer;
};

// Global key caches to avoid regeneration
let primaryKeyCache: TestKeys | null = null;
let otherKeyCache: TestKeys | null = null;

// Helper to generate keys with caching
const generateTestKeys = async (
  useCache: TestKeys | null = null,
): Promise<TestKeys> => {
  if (useCache) return useCache;

  // Generate keys with required size
  const { publicKey, privateKey } = await generateRandomKeys(KEY_BITS);
  const n = publicKey.n;
  const nHex = n.toString(16).padStart(VOTING.PUB_KEY_OFFSET, '0'); // Match padding in IsolatedPublicKey
  const nBuffer = Buffer.from(nHex, VOTING.KEY_FORMAT);
  const keyId = createHash(VOTING.HASH_ALGORITHM).update(nBuffer).digest();

  const isolatedPublicKey = new IsolatedPublicKey(n, publicKey.g, keyId);
  const isolatedPrivateKey = new IsolatedPrivateKey(
    privateKey.lambda,
    privateKey.mu,
    isolatedPublicKey,
  );

  return { isolatedPublicKey, isolatedPrivateKey, n, keyId };
};

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
    VOTING.HASH_ALGORITHM,
    Buffer.concat([isolatedPublicKey.keyId, isolatedPublicKey.getInstanceId()]),
  )
    .update(calculatedCiphertext.toString(16))
    .digest(VOTING.DIGEST_FORMAT);

  return hmac === receivedHmac
    ? isolatedPublicKey.getInstanceId()
    : Buffer.from([0]);
};

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('Isolated Keys', () => {
  let keys: TestKeys;
  let otherKeys: TestKeys;

  // Generate all keys once before any tests
  beforeAll(async () => {
    // Generate primary and other key caches if not already generated
    if (!primaryKeyCache || !otherKeyCache) {
      [primaryKeyCache, otherKeyCache] = await Promise.all([
        generateTestKeys(),
        generateTestKeys(),
      ]);
    }

    // Use cached keys for test instances
    [keys, otherKeys] = [primaryKeyCache, otherKeyCache];
  });

  describe('IsolatedPublicKey', () => {
    it('should create a valid key with correct ID', () => {
      expect(keys.isolatedPublicKey.n).toBe(keys.n);
      expect(keys.isolatedPublicKey.getKeyId().equals(keys.keyId)).toBe(true);
    });

    it('should encrypt and tag ciphertext with instance ID', () => {
      const message = 2n;
      const taggedCiphertext = keys.isolatedPublicKey.encrypt(message);

      const extractedInstanceId =
        keys.isolatedPublicKey.extractInstanceId(taggedCiphertext);

      expect(
        extractedInstanceId.equals(keys.isolatedPublicKey.getInstanceId()),
      ).toBe(true);

      const decryptedMessage =
        keys.isolatedPrivateKey.decrypt(taggedCiphertext);
      expect(decryptedMessage).toEqual(message);
    });

    it('should perform homomorphic addition with instance verification', () => {
      const m1 = 1n;
      const m2 = 2n;
      const c1 = keys.isolatedPublicKey.encrypt(m1);
      const c2 = keys.isolatedPublicKey.encrypt(m2);

      const sum = keys.isolatedPublicKey.addition(c1, c2);
      expect(sum).toBeDefined();

      const extractedInstanceId = extractInstanceId(
        keys.isolatedPublicKey,
        sum,
      );
      expect(
        extractedInstanceId.equals(keys.isolatedPublicKey.getInstanceId()),
      ).toBe(true);

      const decryptedSum = keys.isolatedPrivateKey.decrypt(sum);
      expect(decryptedSum).toBe(m1 + m2);
    });

    it('should reject addition with mismatched instance IDs', () => {
      const c1 = keys.isolatedPublicKey.encrypt(1n);
      const c2 = otherKeys.isolatedPublicKey.encrypt(2n);

      expect(() => keys.isolatedPublicKey.addition(c1, c2)).toThrowType(
        IsolatedKeyError,
        (error: IsolatedKeyError) => {
          expect(error.type).toBe(IsolatedKeyErrorType.KeyIsolationViolation);
        },
      );
    });
  });

  describe('IsolatedPrivateKey', () => {
    it('should create a valid key pair', () => {
      expect(keys.isolatedPrivateKey.publicKey.g).toEqual(
        keys.isolatedPublicKey.g,
      );
      expect(keys.isolatedPrivateKey.publicKey.n).toEqual(
        keys.isolatedPublicKey.n,
      );
    });

    it('should reject non-isolated public key', () => {
      const g = keys.isolatedPublicKey.g;
      const lambda = keys.isolatedPrivateKey.lambda;
      const mu = keys.isolatedPrivateKey.mu;
      const regularPublicKey = {
        n: keys.isolatedPublicKey.n,
        g,
        encrypt: () => 0n,
        addition: () => 0n,
      } as unknown as IsolatedPublicKey;

      expect(
        () => new IsolatedPrivateKey(lambda, mu, regularPublicKey),
      ).toThrowType(IsolatedKeyError, (error: IsolatedKeyError) => {
        expect(error.type).toBe(IsolatedKeyErrorType.InvalidPublicKey);
      });
    });

    it('should decrypt tagged ciphertext correctly', () => {
      const message = 2n;
      const ciphertext = keys.isolatedPublicKey.encrypt(message);
      const decrypted = keys.isolatedPrivateKey.decrypt(ciphertext);
      expect(decrypted).toBe(message);
    });

    it('should reject ciphertext from different key instance', () => {
      const message = 2n;
      const ciphertext = otherKeys.isolatedPublicKey.encrypt(message);

      expect(() => keys.isolatedPrivateKey.decrypt(ciphertext)).toThrowType(
        IsolatedKeyError,
        (error: IsolatedKeyError) => {
          expect(error.type).toBe(IsolatedKeyErrorType.InvalidKeyFormat);
        },
      );
    });

    it('should perform full encryption/decryption cycle with homomorphic operation', () => {
      const m1 = 1n;
      const m2 = 2n;
      const c1 = keys.isolatedPublicKey.encrypt(m1);
      const c2 = keys.isolatedPublicKey.encrypt(m2);

      const sum = keys.isolatedPublicKey.addition(c1, c2);
      const decrypted = keys.isolatedPrivateKey.decrypt(sum);

      expect(decrypted).toBe(m1 + m2);
    });
  });
});
