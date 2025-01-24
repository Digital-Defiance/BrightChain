import { randomBytes } from 'crypto';
import { StaticHelpersPbkdf2 } from './staticHelpers.pbkdf2';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';

describe('brightchain staticHelpers.pbkdf2', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  const testPassword = Buffer.from('test-password');
  const testSalt = randomBytes(16); // Must be 16 bytes

  describe('key derivation', () => {
    it('should derive consistent keys with same parameters', () => {
      const derivedKey =
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword);
      const derivedKey2 = StaticHelpersPbkdf2.deriveKeyFromPassword(
        testPassword,
        derivedKey.salt,
        derivedKey.iterations,
      );
      expect(derivedKey.hash).toEqual(derivedKey2.hash);
      expect(derivedKey.salt).toEqual(derivedKey2.salt);
      expect(derivedKey.iterations).toEqual(derivedKey2.iterations);
    });

    it('should derive different keys with different salts', () => {
      const derivedKey1 =
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword);
      const derivedKey2 =
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword);
      expect(derivedKey1.hash).not.toEqual(derivedKey2.hash);
      expect(derivedKey1.salt).not.toEqual(derivedKey2.salt);
    });

    it('should handle various password types', () => {
      const passwords = {
        empty: Buffer.from(''),
        ascii: Buffer.from('simple-password'),
        unicode: Buffer.from('password🔑世界'),
        long: Buffer.from('a'.repeat(100)), // Reduced from 1000 to 100 for faster tests
      };

      for (const password of Object.values(passwords)) {
        const derivedKey = StaticHelpersPbkdf2.deriveKeyFromPassword(password);
        expect(derivedKey.hash.length).toBe(
          StaticHelpersSymmetric.SymmetricKeyBytes,
        );
        expect(derivedKey.salt.length).toBe(16);
        expect(derivedKey.iterations).toBe(
          StaticHelpersPbkdf2.Pbkdf2IterationsPerSecond,
        );
      }
    });

    it('should derive keys with custom iterations', () => {
      const iterations = [500, 1000]; // Reduced iterations for faster tests
      const results = iterations.map((iter) =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword, testSalt, iter),
      );

      // Keys should be different with different iterations
      expect(results[0].hash).not.toEqual(results[1].hash);
      // Iterations should be preserved
      expect(results[0].iterations).toBe(iterations[0]);
      expect(results[1].iterations).toBe(iterations[1]);
      // Salt should be reused
      expect(results[0].salt).toEqual(testSalt);
      expect(results[1].salt).toEqual(testSalt);
    });
  });

  describe('validation', () => {
    it('should validate salt length', () => {
      // Test salt too short
      const shortSalt = Buffer.alloc(15);
      expect(() =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword, shortSalt),
      ).toThrow('Salt length does not match expected length');

      // Test salt too long
      const longSalt = Buffer.alloc(17);
      expect(() =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword, longSalt),
      ).toThrow('Salt length does not match expected length');
    });

    it('should handle invalid inputs', () => {
      // Test invalid password
      expect(() =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(
          undefined as unknown as Buffer,
        ),
      ).toThrow();

      // Test invalid iterations
      expect(() =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword, testSalt, -1),
      ).toThrow();
      expect(() =>
        StaticHelpersPbkdf2.deriveKeyFromPassword(testPassword, testSalt, 0),
      ).toThrow();
    });
  });
});
