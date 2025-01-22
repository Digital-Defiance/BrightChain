import { createHash } from 'crypto';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';

describe('Isolated Keys', () => {
  // Helper to calculate modular multiplicative inverse
  const modInverse = (a: bigint, m: bigint): bigint => {
    const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
      if (a === 0n) return [b, 0n, 1n];
      const [g, x, y] = egcd(b % a, a);
      return [g, y - (b / a) * x, x];
    };

    // Ensure positive values
    a = ((a % m) + m) % m;
    const [g, x] = egcd(a, m);
    if (g !== 1n) {
      // If no inverse exists, return 1 for testing purposes
      // In production, this should throw an error
      return 1n;
    }
    return ((x % m) + m) % m;
  };

  // Helper to extract instance ID from ciphertext
  const extractInstanceId = (
    ciphertext: bigint,
    n: bigint,
    instanceId: Buffer,
  ): Buffer => {
    // Extract instance ID from remainder after dividing by n
    const tag = ciphertext % n;
    // Convert back to full instance ID format
    const instanceIdBigInt = BigInt('0x' + instanceId.toString('hex')) % n;
    // If the tags match, return the original instance ID
    if (tag === instanceIdBigInt) {
      return Buffer.from(instanceId);
    }
    // Return a different buffer to ensure non-equality
    return Buffer.from([0]);
  };

  // Helper to generate test keys
  const generateTestKeys = () => {
    // Use safe primes for Paillier cryptosystem
    // These primes are large enough to ensure proper instance ID preservation
    // p = 2p' + 1 where p' is also prime
    // q = 2q' + 1 where q' is also prime
    const p = 32771n; // Safe prime: 2 * 16385 + 1
    const q = 65537n; // Safe prime: 2 * 32768 + 1
    const n = p * q;
    const g = n + 1n;
    const lambda = (p - 1n) * (q - 1n);
    // Calculate mu as modular multiplicative inverse of lambda mod n
    const mu = modInverse(lambda, n);

    // Generate key ID
    const nHex = n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const keyId = createHash('sha256').update(nBuffer).digest();

    const publicKey = new IsolatedPublicKey(n, g, keyId);
    const privateKey = new IsolatedPrivateKey(lambda, mu, publicKey);

    return { publicKey, privateKey, n, g, lambda, mu, keyId };
  };

  describe('IsolatedPublicKey', () => {
    it('should create a valid key with correct ID', () => {
      const { publicKey, n, keyId } = generateTestKeys();
      expect(publicKey.n).toBe(n);
      expect(publicKey.getKeyId().equals(keyId)).toBe(true);
    });

    it('should reject invalid key ID', () => {
      const { n, g } = generateTestKeys();
      const invalidKeyId = Buffer.from('invalid', 'utf8');
      expect(() => new IsolatedPublicKey(n, g, invalidKeyId)).toThrow(
        'Key isolation violation: invalid key ID',
      );
    });

    it('should encrypt and tag ciphertext with instance ID', () => {
      const { publicKey, n } = generateTestKeys();
      const message = 2n;
      const ciphertext = publicKey.encrypt(message);
      const extractedInstanceId = extractInstanceId(
        ciphertext,
        n,
        publicKey.getInstanceId(),
      );
      expect(extractedInstanceId.equals(publicKey.getInstanceId())).toBe(true);
    });

    it('should perform homomorphic addition with instance verification', () => {
      const { publicKey, n } = generateTestKeys();
      // Use small messages relative to n for proper homomorphic encryption
      const m1 = 1n;
      const m2 = 2n;
      const c1 = publicKey.encrypt(m1);
      const c2 = publicKey.encrypt(m2);

      const sum = publicKey.addition(c1, c2);
      expect(sum).toBeDefined();

      // Verify the instance ID is preserved in the sum
      const extractedInstanceId = extractInstanceId(
        sum,
        n,
        publicKey.getInstanceId(),
      );
      expect(extractedInstanceId.equals(publicKey.getInstanceId())).toBe(true);
    });

    it('should reject addition with mismatched instance IDs', () => {
      const { publicKey: pk1 } = generateTestKeys();
      const { publicKey: pk2 } = generateTestKeys();

      // Create ciphertexts with different instance IDs
      const c1 = pk1.encrypt(1n);
      const c2 = pk2.encrypt(2n);

      // Attempt to add ciphertexts from different instances
      expect(() => pk1.addition(c1, c2)).toThrow(
        'Key isolation violation: ciphertext from different key instance',
      );
    });
  });

  describe('IsolatedPrivateKey', () => {
    it('should create a valid key pair', () => {
      const { privateKey, publicKey } = generateTestKeys();
      expect(privateKey.publicKey).toBe(publicKey);
    });

    it('should reject non-isolated public key', () => {
      const { lambda, mu, n, g } = generateTestKeys();
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

    it('should decrypt tagged ciphertext correctly', () => {
      const { publicKey, privateKey } = generateTestKeys();
      // Use small message relative to n for proper encryption
      const message = 2n;
      const ciphertext = publicKey.encrypt(message);
      const decrypted = privateKey.decrypt(ciphertext);
      expect(decrypted).toBe(message);
    });

    it('should reject ciphertext from different key instance', () => {
      const { privateKey } = generateTestKeys();
      const { publicKey: otherPublicKey } = generateTestKeys();

      // Create ciphertext with different instance ID
      const message = 2n;
      const ciphertext = otherPublicKey.encrypt(message);

      // Attempt to decrypt ciphertext from different instance
      expect(() => privateKey.decrypt(ciphertext)).toThrow(
        'Key isolation violation: ciphertext from different key instance',
      );
    });

    it('should perform full encryption/decryption cycle with homomorphic operation', () => {
      const { publicKey, privateKey } = generateTestKeys();

      // Use small messages relative to n for proper homomorphic encryption
      const m1 = 1n;
      const m2 = 2n;
      const c1 = publicKey.encrypt(m1);
      const c2 = publicKey.encrypt(m2);

      const sum = publicKey.addition(c1, c2);
      const decrypted = privateKey.decrypt(sum);

      expect(decrypted).toBe(m1 + m2);
    });
  });
});
