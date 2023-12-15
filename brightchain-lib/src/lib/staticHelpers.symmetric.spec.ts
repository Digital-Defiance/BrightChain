import { StaticHelpersSymmetric } from './staticHelpers.symmetric';
import { randomBytes } from 'crypto';
import { faker } from '@faker-js/faker';

describe('brightchain staticHelpers.symmetric', () => {
  it('should symmetric encrypt and decrypt with provided key', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');
    const testKey = randomBytes(StaticHelpersSymmetric.SymmetricKeyBytes);

    const encrypted = StaticHelpersSymmetric.symmetricEncryptBuffer(
      testData,
      testKey
    );
    expect(encrypted).toBeDefined();
    expect(encrypted.encryptedData).not.toEqual(testData);

    const decrypted = StaticHelpersSymmetric.symmetricDecryptBuffer(
      encrypted.encryptedData,
      testKey
    );
    expect(decrypted.toString('utf-8')).toEqual(testData.toString('utf-8'));
  });

  it('should symmetric encrypt and decrypt with generated key', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');

    const encrypted = StaticHelpersSymmetric.symmetricEncryptBuffer(testData);
    expect(encrypted).toBeDefined();
    expect(encrypted.encryptedData).not.toEqual(testData);

    const decrypted = StaticHelpersSymmetric.symmetricDecryptBuffer(
      encrypted.encryptedData,
      encrypted.key
    );
    expect(decrypted.toString('utf-8')).toEqual(testData.toString('utf-8'));
  });

  it('should throw an error with incorrect key length', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');
    const shortKey = Buffer.alloc(
      StaticHelpersSymmetric.SymmetricKeyBytes - 1,
      'a'
    );

    expect(() => {
      StaticHelpersSymmetric.symmetricEncryptBuffer(testData, shortKey);
    }).toThrow(Error);
  });
  it('should symmetrically encrypt and decrypt a string', () => {
    const testString = faker.lorem.sentence();
    const encrypted = StaticHelpersSymmetric.symmetricEncrypt(testString);
    const decrypted = StaticHelpersSymmetric.symmetricDecrypt(
      encrypted.encryptedData,
      encrypted.key
    );
    expect(decrypted).toEqual(testString);
  });

  it('should symmetrically encrypt and decrypt an object', () => {
    const testObject = { message: faker.lorem.sentence() };
    const encrypted = StaticHelpersSymmetric.symmetricEncrypt(testObject);
    const decrypted = StaticHelpersSymmetric.symmetricDecrypt(
      encrypted.encryptedData,
      encrypted.key
    );
    expect(decrypted).toEqual(testObject);
  });

  it('should handle empty string input', () => {
    const encrypted = StaticHelpersSymmetric.symmetricEncrypt('');
    const decrypted = StaticHelpersSymmetric.symmetricDecrypt(
      encrypted.encryptedData,
      encrypted.key
    );
    expect(decrypted).toEqual('');
  });

  it('should throw an error for null input', () => {
    expect(() => {
      StaticHelpersSymmetric.symmetricEncrypt(null);
    }).toThrow(Error);
  });
});
