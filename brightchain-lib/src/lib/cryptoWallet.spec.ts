import { EthereumECIES } from './cryptoWallet'; // Adjust the import path based on your project structure

describe('EthereumECIES', () => {
  const testMnemonic = 'test test test test test test test test test test test junk';
  let keyPair: { privateKey: string; publicKey: string };

  beforeAll(() => {
    keyPair = EthereumECIES.generateKeyPairFromMnemonic(testMnemonic);
  });

  test('generateKeyPairFromMnemonic should generate valid key pair', () => {
    expect(keyPair).toHaveProperty('privateKey');
    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair.privateKey).toHaveLength(64); // Private key should be 32 bytes (64 hex characters)
    expect(keyPair.publicKey).toHaveLength(130); // Uncompressed public key (65 bytes, 130 hex characters)
  });

  test('encrypt and decrypt should return original message', () => {
    const message = 'Hello, Ethereum!';
    const encrypted = EthereumECIES.encrypt(keyPair.publicKey, message);
    expect(encrypted).toBeDefined();

    const decrypted = EthereumECIES.decrypt(keyPair.privateKey, encrypted);
    expect(decrypted).toBe(message);
  });

  test('decrypt with wrong private key should throw error', () => {
    const message = 'Hello, Ethereum!';
    const encrypted = EthereumECIES.encrypt(keyPair.publicKey, message);
    expect(encrypted).toBeDefined();

    const wrongPrivateKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    expect(() => {
      EthereumECIES.decrypt(wrongPrivateKey, encrypted);
    }).toThrow();
  });
});
