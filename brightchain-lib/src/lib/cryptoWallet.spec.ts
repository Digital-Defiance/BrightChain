import { EthereumECIES } from './cryptoWallet';
import { faker } from '@faker-js/faker';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';

describe('EthereumECIES', () => {
  const testMnemonic = 'test test test test test test test test test test test junk';
  let keyPair: ISimpleKeyPairBuffer;

  beforeAll(() => {
    keyPair = EthereumECIES.generateKeyPairFromMnemonic(testMnemonic);
  });

  test('generateKeyPairFromMnemonic should generate valid key pair', () => {
    expect(keyPair).toHaveProperty('privateKey');
    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair.privateKey).toHaveLength(32); // Private key should be 32 bytes (64 hex characters)
    expect(keyPair.publicKey).toHaveLength(65); // Uncompressed public key (65 bytes, 130 hex characters)
  });

  test('encrypt and decrypt (buffer version) should return original message', () => {
    const message = Buffer.from(faker.lorem.sentence());
    const encrypted = EthereumECIES.encrypt(keyPair.publicKey, message);
    expect(encrypted).toBeDefined();

    const decrypted = EthereumECIES.decrypt(keyPair.privateKey, encrypted);
    expect(decrypted.toString()).toBe(message.toString());
  });

  test('encryptString and decryptString should return original message', () => {
    const message = faker.lorem.sentence();
    const encrypted = EthereumECIES.encryptString(keyPair.publicKey.toString('hex'), message);
    expect(encrypted).toBeDefined();

    const decrypted = EthereumECIES.decryptString(keyPair.privateKey.toString('hex'), encrypted);
    expect(decrypted).toBe(message);
  });

  test('decrypt (buffer version) with wrong private key should throw error', () => {
    const message = Buffer.from(faker.lorem.sentence());
    const encrypted = EthereumECIES.encrypt(keyPair.publicKey, message);
    expect(encrypted).toBeDefined();

    const wrongPrivateKey = Buffer.from('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'hex');
    expect(() => {
      EthereumECIES.decrypt(wrongPrivateKey, encrypted);
    }).toThrow();
  });

  test('decryptString with wrong private key should throw error', () => {
    const message = faker.lorem.sentence();
    const encrypted = EthereumECIES.encryptString(keyPair.publicKey.toString('hex'), message);
    expect(encrypted).toBeDefined();

    const wrongPrivateKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    expect(() => {
      EthereumECIES.decryptString(wrongPrivateKey, encrypted);
    }).toThrow();
  });
});