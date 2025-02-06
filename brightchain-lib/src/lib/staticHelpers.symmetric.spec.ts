import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { SymmetricErrorType } from './enumerations/symmetricErrorType';
import { SymmetricError } from './errors/symmetricError';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';

describe('brightchain staticHelpers.symmetric', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  const testData = {
    string: faker.lorem.word(), // Use shorter strings for faster tests
    empty: '',
    object: { message: faker.lorem.word() }, // Use shorter strings for faster tests
    buffer: Buffer.from(faker.lorem.word(), 'utf-8'), // Use shorter strings for faster tests
  };
  const testKey = randomBytes(StaticHelpersSymmetric.SymmetricKeyBytes);

  describe('buffer encryption', () => {
    it('should encrypt and decrypt with provided key', () => {
      const encrypted = StaticHelpersSymmetric.symmetricEncryptBuffer(
        testData.buffer,
        testKey,
      );
      expect(encrypted.encryptedData).not.toEqual(testData.buffer);

      const decrypted = StaticHelpersSymmetric.symmetricDecryptBuffer(
        encrypted.encryptedData,
        testKey,
      );
      expect(decrypted.toString('utf-8')).toEqual(
        testData.buffer.toString('utf-8'),
      );
    });

    it('should encrypt and decrypt with generated key', () => {
      const encrypted = StaticHelpersSymmetric.symmetricEncryptBuffer(
        testData.buffer,
      );
      expect(encrypted.encryptedData).not.toEqual(testData.buffer);

      const decrypted = StaticHelpersSymmetric.symmetricDecryptBuffer(
        encrypted.encryptedData,
        encrypted.key,
      );
      expect(decrypted.toString('utf-8')).toEqual(
        testData.buffer.toString('utf-8'),
      );
    });

    it('should throw error with incorrect key length', () => {
      const shortKey = Buffer.alloc(
        StaticHelpersSymmetric.SymmetricKeyBytes - 1,
        'a',
      );
      expect(() =>
        StaticHelpersSymmetric.symmetricEncryptBuffer(
          testData.buffer,
          shortKey,
        ),
      ).toThrowType(SymmetricError, (error: SymmetricError) => {
        expect(error.reason).toBe(SymmetricErrorType.InvalidKeyLength);
      });
    });
  });

  describe('json encryption', () => {
    it('should handle various data types', () => {
      // Test string encryption
      const encryptedString =
        StaticHelpersSymmetric.symmetricEncryptJson<string>(testData.string);
      const decryptedString =
        StaticHelpersSymmetric.symmetricDecryptJson<string>(
          encryptedString.encryptedData,
          encryptedString.key,
        );
      expect(decryptedString).toEqual(testData.string);

      // Test object encryption
      const encryptedObject =
        StaticHelpersSymmetric.symmetricEncryptJson<object>(testData.object);
      const decryptedObject =
        StaticHelpersSymmetric.symmetricDecryptJson<object>(
          encryptedObject.encryptedData,
          encryptedObject.key,
        );
      expect(decryptedObject).toEqual(testData.object);

      // Test empty string
      const encryptedEmpty =
        StaticHelpersSymmetric.symmetricEncryptJson<string>(testData.empty);
      const decryptedEmpty =
        StaticHelpersSymmetric.symmetricDecryptJson<string>(
          encryptedEmpty.encryptedData,
          encryptedEmpty.key,
        );
      expect(decryptedEmpty).toEqual(testData.empty);
    });

    it('should handle error cases', () => {
      // Test null input
      expect(() =>
        StaticHelpersSymmetric.symmetricEncryptJson<unknown>(null),
      ).toThrowType(SymmetricError, (error: SymmetricError) => {
        expect(error.reason).toBe(SymmetricErrorType.DataNullOrUndefined);
      });

      // Test undefined input
      expect(() =>
        StaticHelpersSymmetric.symmetricEncryptJson<unknown>(undefined),
      ).toThrowType(SymmetricError, (error: SymmetricError) => {
        expect(error.reason).toBe(SymmetricErrorType.DataNullOrUndefined);
      });

      // Test invalid key
      const encrypted = StaticHelpersSymmetric.symmetricEncryptJson<string>(
        testData.string,
      );
      const invalidKey = Buffer.alloc(
        StaticHelpersSymmetric.SymmetricKeyBytes,
        'x',
      );
      expect(() =>
        StaticHelpersSymmetric.symmetricDecryptJson<string>(
          encrypted.encryptedData,
          invalidKey,
        ),
      ).toThrowType(SyntaxError, (error: SyntaxError) => {
        expect(error.message.startsWith('Unexpected token'));
      });
    });
  });
});
