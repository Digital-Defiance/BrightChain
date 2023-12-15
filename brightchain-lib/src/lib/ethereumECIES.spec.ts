import { EthereumECIES } from './ethereumECIES';
import { faker } from '@faker-js/faker';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { randomBytes } from 'crypto';
import Wallet from 'ethereumjs-wallet';

describe('EthereumECIES', () => {
  const testMnemonic = EthereumECIES.generateNewMnemonic();
  let keyPair: ISimpleKeyPairBuffer;

  beforeAll(() => {
    keyPair = EthereumECIES.mnemonicToSimpleKeyPairBuffer(testMnemonic);
  });

  test('generateNewMnemonic should generate valid mnemonic', () => {
    const mnemonic = EthereumECIES.generateNewMnemonic();
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  test('walletFromSeed should generate valid wallet', () => {
    const seed = mnemonicToSeedSync(testMnemonic);
    const wallet = EthereumECIES.walletFromSeed(seed);
    expect(wallet).toBeDefined();
    expect(wallet.getPrivateKey()).toHaveLength(32);
    expect(wallet.getPublicKey()).toHaveLength(64);
  });

  test('walletAndSeedFromMnemonic should generate valid wallet and seed', () => {
    const { seed, wallet } =
      EthereumECIES.walletAndSeedFromMnemonic(testMnemonic);
    expect(seed).toBeDefined();
    expect(wallet).toBeDefined();
    expect(wallet.getPrivateKey()).toHaveLength(32);
    expect(wallet.getPublicKey()).toHaveLength(64);
  });

  test('walletToSimpleKeyPairBuffer should generate valid key pair', () => {
    const seed = mnemonicToSeedSync(testMnemonic);
    const wallet = EthereumECIES.walletFromSeed(seed);
    const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
    expect(keyPair).toHaveProperty('privateKey');
    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair.privateKey).toHaveLength(32);
    expect(keyPair.publicKey).toHaveLength(65);
  });

  test('seedToSimpleKeyPairBuffer should generate valid key pair', () => {
    const seed = mnemonicToSeedSync(testMnemonic);
    const testKeyPair = EthereumECIES.seedToSimpleKeyPairBuffer(seed);
    expect(testKeyPair).toHaveProperty('privateKey');
    expect(testKeyPair).toHaveProperty('publicKey');
    expect(testKeyPair.privateKey).toHaveLength(32);
    expect(testKeyPair.publicKey).toHaveLength(65);
  });

  test('mnemonicToSimpleKeyPairBuffer should generate valid key pair', () => {
    const testKeyPair =
      EthereumECIES.mnemonicToSimpleKeyPairBuffer(testMnemonic);
    expect(testKeyPair).toHaveProperty('privateKey');
    expect(testKeyPair).toHaveProperty('publicKey');
    expect(testKeyPair.privateKey).toHaveLength(32);
    expect(testKeyPair.publicKey).toHaveLength(65);
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
    const encrypted = EthereumECIES.encryptString(
      keyPair.publicKey.toString('hex'),
      message
    );
    expect(encrypted).toBeDefined();

    const decrypted = EthereumECIES.decryptString(
      keyPair.privateKey.toString('hex'),
      encrypted
    );
    expect(decrypted).toBe(message);
  });

  test('decrypt (buffer version) with wrong private key should throw error', () => {
    const message = Buffer.from(faker.lorem.sentence());
    const encrypted = EthereumECIES.encrypt(keyPair.publicKey, message);
    expect(encrypted).toBeDefined();

    const wrongPrivateKey = Buffer.from(
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      'hex'
    );
    expect(() => {
      EthereumECIES.decrypt(wrongPrivateKey, encrypted);
    }).toThrow();
  });

  test('decryptString with wrong private key should throw error', () => {
    const message = faker.lorem.sentence();
    const encrypted = EthereumECIES.encryptString(
      keyPair.publicKey.toString('hex'),
      message
    );
    expect(encrypted).toBeDefined();

    const wrongPrivateKey =
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    expect(() => {
      EthereumECIES.decryptString(wrongPrivateKey, encrypted);
    }).toThrow();
  });
  it('should derive a known key', () => {
    // https://medium.com/@alexberegszaszi/why-do-my-bip32-wallets-disagree-6f3254cc5846#.6tqszlvf4
    const mnemonic =
      'radar blur cabbage chef fix engine embark joy scheme fiction master release';
    const expectedSeed =
      'ed37b3442b3d550d0fbb6f01f20aac041c245d4911e13452cac7b1676a070eda66771b71c0083b34cc57ca9c327c459a0ec3600dbaf7f238ff27626c8430a806';
    const expectedPrivateKey =
      'b96e9ccb774cc33213cbcb2c69d3cdae17b0fe4888a1ccd343cbd1a17fd98b18';
    const expectedPublicKey =
      '0405b7d0996e99c4a49e6c3b83288f4740d53662839eab1d97d14660696944b8bbe24fabdd03888410ace3fa4c5a809e398f036f7b99d04f82a012dca95701d103';
    const seed = EthereumECIES.walletAndSeedFromMnemonic(mnemonic).seed.value;
    const testKeyPair = EthereumECIES.seedToSimpleKeyPairBuffer(seed);

    expect(seed.toString('hex')).toEqual(expectedSeed);
    expect(testKeyPair.privateKey.toString('hex')).toEqual(expectedPrivateKey);
    expect(testKeyPair.publicKey.toString('hex')).toEqual(expectedPublicKey);
  });
  it('should sign a message', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    expect(signature).toBeDefined();
    expect(signature).toBeInstanceOf(Buffer);
  });
  it('should verify a signature using a 04 prefixed public key', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    const verified: boolean = EthereumECIES.verifyMessage(
      keyPair.publicKey,
      message,
      signature
    );
    expect(verified).toBe(true);
  });
  it('should verify a signature using a public key straight from the wallet', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const wallet: Wallet = EthereumECIES.walletFromSeed(
      mnemonicToSeedSync(testMnemonic)
    );
    expect(wallet).toBeInstanceOf(Wallet);
    const signature: Buffer = EthereumECIES.signMessage(
      wallet.getPrivateKey(),
      message
    );
    const verified: boolean = EthereumECIES.verifyMessage(
      wallet.getPublicKey(),
      message,
      signature
    );
    expect(verified).toBe(true);
  });
  it('should throw when an invalid public key is given that is 65 bytes but not prefixed with 04', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    // mangle the public key by changing the 04 prefix
    const newPublicKey: Buffer = Buffer.from(keyPair.publicKey);
    newPublicKey[0] = 0x03;
    expect(() => {
      EthereumECIES.verifyMessage(newPublicKey, message, signature);
    }).toThrow('Invalid sender public key');
  });
  it('should throw when an invalid public key is given that is neither 64 nor 65 bytes', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    const newPublicKey: Buffer = randomBytes(63);
    expect(() => {
      EthereumECIES.verifyMessage(newPublicKey, message, signature);
    }).toThrow('Invalid sender public key');
  });
  it('should return false when a different public key is given', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    const newPublicKey: Buffer = randomBytes(64);
    expect(EthereumECIES.verifyMessage(newPublicKey, message, signature)).toBe(
      false
    );
  });
  it('should return false when a the message is altered', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    message[0] = ' '.charCodeAt(0);
    expect(
      EthereumECIES.verifyMessage(keyPair.publicKey, message, signature)
    ).toBe(false);
  });

  it('should return false when a the signature is altered', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const signature: Buffer = EthereumECIES.signMessage(
      keyPair.privateKey,
      message
    );
    const modifiedSignature: Buffer = Buffer.copyBytesFrom(signature);
    modifiedSignature[62] = 0;
    modifiedSignature[63] = 0;
    expect(
      EthereumECIES.verifyMessage(keyPair.publicKey, message, signature)
    ).toBe(true);
    expect(
      EthereumECIES.verifyMessage(keyPair.publicKey, message, modifiedSignature)
    ).toBe(false);
  });
  it('should throw when an invalid signature is given to verify', () => {
    const message: Buffer = Buffer.from(faker.lorem.sentence());
    const badSignature: Buffer = randomBytes(1);
    expect(() => {
      EthereumECIES.verifyMessage(keyPair.publicKey, message, badSignature);
    }).toThrow('Invalid signature');
  });
});
