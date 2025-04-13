import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { ECIES } from '../constants';
import { SymmetricErrorType } from '../enumerations/symmetricErrorType';
import { SymmetricError } from '../errors/symmetricError';
import { SymmetricService } from './symmetric.service';

describe('SymmetricService', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  const testData = {
    string: faker.lorem.word(), // Use shorter strings for faster tests
    empty: '',
    object: { message: faker.lorem.word() }, // Use shorter strings for faster tests
    buffer: Buffer.from(faker.lorem.word(), 'utf-8'), // Use shorter strings for faster tests
  };
  const testKey = randomBytes(ECIES.SYMMETRIC.KEY_LENGTH);

  describe('buffer encryption', () => {
    it('should encrypt and decrypt with provided key', () => {
      const encrypted = SymmetricService.encryptBuffer(
        testData.buffer,
        testKey,
      );
      expect(encrypted.encryptedData).not.toEqual(testData.buffer);

      const decrypted = SymmetricService.decryptBuffer(
        encrypted.encryptedData,
        testKey,
      );
      expect(decrypted.toString('utf-8')).toEqual(
        testData.buffer.toString('utf-8'),
      );
    });

    it('should encrypt and decrypt with generated key', () => {
      const encrypted = SymmetricService.encryptBuffer(testData.buffer);
      expect(encrypted.encryptedData).not.toEqual(testData.buffer);

      const decrypted = SymmetricService.decryptBuffer(
        encrypted.encryptedData,
        encrypted.key,
      );
      expect(decrypted.toString('utf-8')).toEqual(
        testData.buffer.toString('utf-8'),
      );
    });

    it('should throw error with incorrect key length', () => {
      const shortKey = Buffer.alloc(ECIES.SYMMETRIC.KEY_LENGTH - 1, 'a');
      expect(() =>
        SymmetricService.encryptBuffer(testData.buffer, shortKey),
      ).toThrowType(SymmetricError, (error: SymmetricError) => {
        expect(error.type).toBe(SymmetricErrorType.InvalidKeyLength);
      });
    });
  });

  describe('json encryption', () => {
    it('should handle various data types', () => {
      // Test string encryption
      const encryptedString = SymmetricService.encryptJson<string>(
        testData.string,
      );
      const decryptedString = SymmetricService.decryptJson<string>(
        encryptedString.encryptedData,
        encryptedString.key,
      );
      expect(decryptedString).toEqual(testData.string);

      // Test object encryption
      const encryptedObject = SymmetricService.encryptJson<object>(
        testData.object,
      );
      const decryptedObject = SymmetricService.decryptJson<object>(
        encryptedObject.encryptedData,
        encryptedObject.key,
      );
      expect(decryptedObject).toEqual(testData.object);

      // Test empty string
      const encryptedEmpty = SymmetricService.encryptJson<string>(
        testData.empty,
      );
      const decryptedEmpty = SymmetricService.decryptJson<string>(
        encryptedEmpty.encryptedData,
        encryptedEmpty.key,
      );
      expect(decryptedEmpty).toEqual(testData.empty);
    });

    it('should handle error cases', () => {
      // Test null input
      expect(() => SymmetricService.encryptJson<unknown>(null)).toThrowType(
        SymmetricError,
        (error: SymmetricError) => {
          expect(error.type).toBe(SymmetricErrorType.DataNullOrUndefined);
        },
      );

      // Test undefined input
      expect(() =>
        SymmetricService.encryptJson<unknown>(undefined),
      ).toThrowType(SymmetricError, (error: SymmetricError) => {
        expect(error.type).toBe(SymmetricErrorType.DataNullOrUndefined);
      });

      // Test invalid key - should throw authentication error with AES-GCM
      const encrypted = SymmetricService.encryptJson<string>(testData.string);
      const invalidKey = Buffer.alloc(ECIES.SYMMETRIC.KEY_LENGTH, 'x');
      expect(() =>
        SymmetricService.decryptJson<string>(
          encrypted.encryptedData,
          invalidKey,
        ),
      ).toThrow(); // AES-GCM will throw authentication error
    });
  });
});
