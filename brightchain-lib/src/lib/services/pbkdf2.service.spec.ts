import { randomBytes } from 'crypto';
import { ECIES, PBKDF2 } from '../constants';
import { Pbkdf2ErrorType } from '../enumerations/pbkdf2ErrorType';
import { Pbkdf2Error } from '../errors/pbkdf2';
import { Pbkdf2Service } from './pbkdf2.service';

describe('Pbkdf2Service', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  const testPassword = Buffer.from('test-password');
  const testSalt = randomBytes(16); // Must be 16 bytes

  describe('key derivation', () => {
    it('should derive consistent keys with same parameters', () => {
      const derivedKey = Pbkdf2Service.deriveKeyFromPassword(testPassword);
      const derivedKey2 = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        derivedKey.salt,
        derivedKey.iterations,
      );
      expect(derivedKey.hash).toEqual(derivedKey2.hash);
      expect(derivedKey.salt).toEqual(derivedKey2.salt);
      expect(derivedKey.iterations).toEqual(derivedKey2.iterations);
    });

    it('should derive different keys with different salts', () => {
      const derivedKey1 = Pbkdf2Service.deriveKeyFromPassword(testPassword);
      const derivedKey2 = Pbkdf2Service.deriveKeyFromPassword(testPassword);
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
        const derivedKey = Pbkdf2Service.deriveKeyFromPassword(password);
        expect(derivedKey.hash.length).toBe(ECIES.SYMMETRIC.KEY_LENGTH);
        expect(derivedKey.salt.length).toBe(16);
        expect(derivedKey.iterations).toBe(PBKDF2.ITERATIONS_PER_SECOND);
      }
    });

    it('should derive keys with custom iterations', () => {
      const iterations = [500, 1000]; // Reduced iterations for faster tests
      const results = iterations.map((iter) =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, iter),
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
        Pbkdf2Service.deriveKeyFromPassword(testPassword, shortSalt),
      ).toThrowType(Pbkdf2Error, (error: Pbkdf2Error) => {
        expect(error.type).toBe(Pbkdf2ErrorType.InvalidSaltLength);
      });

      // Test salt too long
      const longSalt = Buffer.alloc(17);
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, longSalt),
      ).toThrowType(Pbkdf2Error, (error: Pbkdf2Error) => {
        expect(error.type).toBe(Pbkdf2ErrorType.InvalidSaltLength);
      });
    });

    it('should handle invalid inputs', () => {
      // Test invalid password
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(undefined as unknown as Buffer),
      ).toThrow(
        'The "password" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received undefined',
      );

      // Test invalid iterations
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, -1),
      ).toThrow(
        'The value of "iterations" is out of range. It must be >= 1 && <= 2147483647. Received -1',
      );
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, 0),
      ).toThrow(
        'The value of "iterations" is out of range. It must be >= 1 && <= 2147483647. Received 0',
      );
    });
  });
});
