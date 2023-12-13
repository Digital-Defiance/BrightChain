import { StaticHelpersKeyPair } from './staticHelpers.keypair';
import { randomBytes } from 'crypto';
import { faker } from '@faker-js/faker';

describe('brightchain staticHelpers.keyPair', () => {
  it('should symmetric encrypt and decrypt with provided key', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');
    const testKey = randomBytes(StaticHelpersKeyPair.SymmetricKeyBytes);

    const encrypted = StaticHelpersKeyPair.symmetricEncryptBuffer(testData, testKey);
    expect(encrypted).toBeDefined();
    expect(encrypted.encryptedData).not.toEqual(testData);

    const decrypted = StaticHelpersKeyPair.symmetricDecryptBuffer(encrypted.encryptedData, testKey);
    expect(decrypted.toString('utf-8')).toEqual(testData.toString('utf-8'));
  });

  it('should symmetric encrypt and decrypt with generated key', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');

    const encrypted = StaticHelpersKeyPair.symmetricEncryptBuffer(testData);
    expect(encrypted).toBeDefined();
    expect(encrypted.encryptedData).not.toEqual(testData);

    const decrypted = StaticHelpersKeyPair.symmetricDecryptBuffer(encrypted.encryptedData, encrypted.key);
    expect(decrypted.toString('utf-8')).toEqual(testData.toString('utf-8'));
  });

  it('should throw an error with incorrect key length', () => {
    const testData = Buffer.from(faker.lorem.sentence(), 'utf-8');
    const shortKey = Buffer.alloc(StaticHelpersKeyPair.SymmetricKeyBytes - 1, 'a');

    expect(() => {
      StaticHelpersKeyPair.symmetricEncryptBuffer(testData, shortKey);
    }).toThrow(Error);
  });
});
