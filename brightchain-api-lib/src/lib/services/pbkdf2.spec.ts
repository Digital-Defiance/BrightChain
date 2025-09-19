import {
  ECIES,
  Pbkdf2Error,
  Pbkdf2ErrorType,
  SecureString,
} from '@brightchain/brightchain-lib';
import { randomBytes } from 'crypto';
import { ApiConstants, PBKDF2 } from '../constants';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { Pbkdf2Service } from './pbkdf2';

describe('Pbkdf2Service', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  const testPassword = Buffer.from('test-password');
  const testSalt = randomBytes(32); // Must be 32 bytes for new standardized PBKDF2 config

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
        expect(derivedKey.hash.length).toBe(ECIES.SYMMETRIC.KEY_SIZE);
        expect(derivedKey.salt.length).toBe(32); // Updated to new 32-byte default
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

  describe('key-wrapping compatibility', () => {
    it('should derive keys compatible with key-wrapping service parameters', () => {
      // Use key-wrapping service parameters: 32-byte salt, sha256, 100000 iterations
      const keyWrappingSalt = randomBytes(32);
      const result = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        keyWrappingSalt,
        ApiConstants.WRAPPED_KEY.MIN_ITERATIONS,
        ApiConstants.WRAPPED_KEY.SALT_SIZE,
        32, // 32 bytes for AES-256
        'sha256',
      );

      expect(result.salt).toEqual(keyWrappingSalt);
      expect(result.salt.length).toBe(32);
      expect(result.hash.length).toBe(32);
      expect(result.iterations).toBe(ApiConstants.WRAPPED_KEY.MIN_ITERATIONS);
    });

    it('should produce different results with different algorithms', () => {
      const keyWrappingSalt = randomBytes(32);
      const sha256Result = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        keyWrappingSalt,
        1000,
        32,
        32,
        'sha256',
      );

      const sha512Result = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        keyWrappingSalt,
        1000,
        32,
        32,
        'sha512',
      );

      expect(sha256Result.hash).not.toEqual(sha512Result.hash);
      expect(sha256Result.salt).toEqual(sha512Result.salt);
      expect(sha256Result.iterations).toEqual(sha512Result.iterations);
    });

    it('should work with SecureString passwords via buffer conversion', () => {
      const securePassword = new SecureString('test-password-secure');
      const passwordBuffer = securePassword.valueAsBuffer;
      const keyWrappingSalt = randomBytes(32);

      const result = Pbkdf2Service.deriveKeyFromPassword(
        Buffer.from(passwordBuffer),
        keyWrappingSalt,
        ApiConstants.WRAPPED_KEY.MIN_ITERATIONS,
        ApiConstants.WRAPPED_KEY.SALT_SIZE,
        32,
        'sha256',
      );

      expect(result.salt).toEqual(keyWrappingSalt);
      expect(result.hash.length).toBe(32);

      securePassword.dispose();
    });
  });

  describe('async key derivation', () => {
    it('should derive consistent keys async vs sync', async () => {
      const syncResult = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        testSalt,
        1000,
      );

      const asyncResult = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        testPassword,
        testSalt,
        1000,
      );

      expect(asyncResult.hash).toEqual(syncResult.hash);
      expect(asyncResult.salt).toEqual(syncResult.salt);
      expect(asyncResult.iterations).toEqual(syncResult.iterations);
    });

    it('should handle key-wrapping parameters async', async () => {
      const keyWrappingSalt = randomBytes(32);
      const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        testPassword,
        keyWrappingSalt,
        ApiConstants.WRAPPED_KEY.MIN_ITERATIONS,
        ApiConstants.WRAPPED_KEY.SALT_SIZE,
        32,
        'sha256',
      );

      expect(result.salt).toEqual(keyWrappingSalt);
      expect(result.salt.length).toBe(32);
      expect(result.hash.length).toBe(32);
      expect(result.iterations).toBe(ApiConstants.WRAPPED_KEY.MIN_ITERATIONS);
    });

    it('should handle concurrent async operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        Pbkdf2Service.deriveKeyFromPasswordAsync(
          Buffer.from(`password-${i}`),
          undefined, // Let it generate random salt
          500, // Low iterations for speed
        ),
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);

      // Each should have different salts (extremely high probability)
      const salts = results.map((r) => r.salt.toString('hex'));
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(5);
    });
  });

  describe('validation', () => {
    it('should validate salt length', () => {
      // Test salt too short for new 32-byte default
      const shortSalt = Buffer.alloc(31);
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, shortSalt),
      ).toThrowType(Pbkdf2Error, (error: Pbkdf2Error) => {
        expect(error.type).toBe(Pbkdf2ErrorType.InvalidSaltLength);
      });

      // Test salt too long for new 32-byte default
      const longSalt = Buffer.alloc(33);
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, longSalt),
      ).toThrowType(Pbkdf2Error, (error: Pbkdf2Error) => {
        expect(error.type).toBe(Pbkdf2ErrorType.InvalidSaltLength);
      });
    });

    it('should validate salt length for custom configs', () => {
      // Test that 16-byte salt works when explicitly configured for legacy compatibility
      const salt16 = Buffer.alloc(16);
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(
          testPassword,
          salt16,
          1000,
          16, // saltBytes param for legacy config
        ),
      ).not.toThrow();

      // Test that 16-byte salt fails with default 32-byte config
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, salt16),
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

    it('should validate async inputs', async () => {
      // Test invalid password async
      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(
          undefined as unknown as Buffer,
        ),
      ).rejects.toThrow();

      // Test invalid iterations async
      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(testPassword, testSalt, -1),
      ).rejects.toThrow();
    });
  });

  describe('cross-compatibility tests', () => {
    it('should replicate key-wrapping service behavior exactly', () => {
      // This test ensures that Pbkdf2Service can replace direct pbkdf2Sync calls
      // in the key-wrapping service with identical results
      const password = Buffer.from('test-password-123');
      const salt = randomBytes(32);
      const iterations = 100000;

      // What key-wrapping service currently does
      const { pbkdf2Sync } = require('crypto');
      const directResult = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

      // What we want Pbkdf2Service to produce
      const serviceResult = Pbkdf2Service.deriveKeyFromPassword(
        password,
        salt,
        iterations,
        32, // saltBytes
        32, // keySize
        'sha256', // algorithm
      );

      expect(serviceResult.hash).toEqual(directResult);
      expect(serviceResult.salt).toEqual(salt);
      expect(serviceResult.iterations).toBe(iterations);
    });
  });

  describe('configuration profiles', () => {
    it('should provide correct profile configurations', () => {
      const userLoginConfig = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.USER_LOGIN,
      );
      expect(userLoginConfig.saltBytes).toBe(32);
      expect(userLoginConfig.iterations).toBe(1304000);
      expect(userLoginConfig.algorithm).toBe('sha256');
      expect(userLoginConfig.hashBytes).toBe(32);

      const keyWrappingConfig = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.KEY_WRAPPING,
      );
      expect(keyWrappingConfig.saltBytes).toBe(32);
      expect(keyWrappingConfig.iterations).toBe(100000);
      expect(keyWrappingConfig.algorithm).toBe('sha256');
      expect(keyWrappingConfig.hashBytes).toBe(32);

      const highSecurityConfig = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.HIGH_SECURITY,
      );
      expect(highSecurityConfig.saltBytes).toBe(64);
      expect(highSecurityConfig.iterations).toBe(2000000);
      expect(highSecurityConfig.algorithm).toBe('sha512');
      expect(highSecurityConfig.hashBytes).toBe(64);
    });

    it('should derive keys using profiles', () => {
      const password = Buffer.from('test-password');

      const userLoginResult = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        password,
        Pbkdf2ProfileEnum.USER_LOGIN,
      );
      expect(userLoginResult.salt.length).toBe(32);
      expect(userLoginResult.hash.length).toBe(32);
      expect(userLoginResult.iterations).toBe(1304000);

      const keyWrappingResult = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        password,
        Pbkdf2ProfileEnum.KEY_WRAPPING,
      );
      expect(keyWrappingResult.salt.length).toBe(32);
      expect(keyWrappingResult.hash.length).toBe(32);
      expect(keyWrappingResult.iterations).toBe(100000);

      // Results should be different due to different iterations
      expect(userLoginResult.hash).not.toEqual(keyWrappingResult.hash);
    });

    it('should derive consistent keys with same profile and salt', () => {
      const password = Buffer.from('test-password');
      const salt = randomBytes(32);

      const result1 = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        password,
        Pbkdf2ProfileEnum.USER_LOGIN,
        salt,
      );
      const result2 = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        password,
        Pbkdf2ProfileEnum.USER_LOGIN,
        salt,
      );

      expect(result1.hash).toEqual(result2.hash);
      expect(result1.salt).toEqual(result2.salt);
      expect(result1.iterations).toEqual(result2.iterations);
    });

    it('should support async profile-based derivation', async () => {
      const password = Buffer.from('test-password');
      const salt = randomBytes(16); // FAST_TEST profile uses 16-byte salts

      const syncResult = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        password,
        Pbkdf2ProfileEnum.FAST_TEST,
        salt,
      );
      const asyncResult =
        await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
          password,
          Pbkdf2ProfileEnum.FAST_TEST,
          salt,
        );

      expect(syncResult.hash).toEqual(asyncResult.hash);
      expect(syncResult.salt).toEqual(asyncResult.salt);
      expect(syncResult.iterations).toEqual(asyncResult.iterations);
    });
  });
});
