# StaticHelpersECIESSpec

## Overview

The `StaticHelpersECIESSpec` file contains unit tests for the `StaticHelpersECIES` class. These tests ensure the correctness and reliability of ECIES (Elliptic Curve Integrated Encryption Scheme) functionalities, including mnemonic generation, wallet creation, key pair conversion, encryption, decryption, and signature verification.

## File Definition

```typescript
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
  CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import {
  ecrecover,
  ecsign,
  hashPersonalMessage,
  publicToAddress,
  toBuffer,
} from 'ethereumjs-util';
import Wallet, { hdkey } from 'ethereumjs-wallet';
import { BrightChainMember } from './brightChainMember';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidV4 } from './guid';
import { IEncryptionLength } from './interfaces/encryptionLength';
import { MultiRecipientEncryption as IMultiRecipientEncryption } from './interfaces/multiRecipientEncryption';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { SecureBuffer } from './secureBuffer';
import {
  HexString,
  RawGuidBuffer,
  SignatureBuffer,
  SignatureString,
} from './types';

describe('StaticHelpersECIES', () => {
  describe('mnemonic generation', () => {
    it('should generate a valid mnemonic', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate a mnemonic with the correct strength', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const seed = mnemonicToSeedSync(mnemonic);
      expect(seed.length).toBe(64); // 512 bits
    });
  });

  describe('wallet creation', () => {
    it('should create a wallet from a seed', () => {
      const seed = randomBytes(32);
      const wallet = StaticHelpersECIES.walletFromSeed(seed);
      expect(wallet).toBeInstanceOf(Wallet);
    });

    it('should create a wallet and seed from a mnemonic', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const { seed, wallet } =
        StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
      expect(seed).toBeInstanceOf(SecureBuffer);
      expect(wallet).toBeInstanceOf(Wallet);
    });
  });

  describe('key pair conversion', () => {
    it('should convert a wallet to a simple key pair buffer', () => {
      const seed = randomBytes(32);
      const wallet = StaticHelpersECIES.walletFromSeed(seed);
      const keyPair = StaticHelpersECIES.walletToSimpleKeyPairBuffer(wallet);
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
    });

    it('should convert a seed to a simple key pair buffer', () => {
      const seed = randomBytes(32);
      const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
    });

    it('should compute a key pair from a mnemonic', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const keyPair =
        StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt a buffer', () => {
      const seed = randomBytes(32);
      const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
      const message = Buffer.from('hello world');
      const encrypted = StaticHelpersECIES.encrypt(keyPair.publicKey, message);
      const decrypted = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });

    it('should encrypt and decrypt a string', () => {
      const seed = randomBytes(32);
      const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
      const message = 'hello world';
      const encrypted = StaticHelpersECIES.encryptString(
        keyPair.publicKey.toString('hex'),
        message,
      );
      const decrypted = StaticHelpersECIES.decryptString(
        keyPair.privateKey.toString('hex'),
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });

    it('should encrypt and decrypt for multiple recipients', () => {
      const seed1 = randomBytes(32);
      const seed2 = randomBytes(32);
      const keyPair1 = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed1);
      const keyPair2 = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed2);
      const message = Buffer.from('hello world');
      const recipients = [
        new BrightChainMember(keyPair1.publicKey, keyPair1.privateKey),
        new BrightChainMember(keyPair2.publicKey, keyPair2.privateKey),
      ];
      const encrypted = StaticHelpersECIES.encryptMultiple(recipients, message);
      const decrypted1 = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipients[0],
      );
      const decrypted2 = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipients[1],
      );
      expect(decrypted1).toEqual(message);
      expect(decrypted2).toEqual(message);
    });
  });

  describe('signature verification', () => {
    it('should sign and verify a message', () => {
      const seed = randomBytes(32);
      const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
      const message = Buffer.from('hello world');
      const signature = StaticHelpersECIES.signMessage(
        keyPair.privateKey,
        message,
      );
      const isValid = StaticHelpersECIES.verifyMessage(
        keyPair.publicKey,
        message,
        signature,
      );
      expect(isValid).toBe(true);
    });

    it('should fail to verify a message with an invalid signature', () => {
      const seed = randomBytes(32);
      const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
      const message = Buffer.from('hello world');
      const signature = StaticHelpersECIES.signMessage(
        keyPair.privateKey,
        message,
      );
      const tamperedSignature = Buffer.from(signature);
      tamperedSignature[0] = ~tamperedSignature[0];
      const isValid = StaticHelpersECIES.verifyMessage(
        keyPair.publicKey,
        message,
        tamperedSignature as SignatureBuffer,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('encryption length calculation', () => {
    it('should compute the encrypted length from data length', () => {
      const dataLength = 1024;
      const blockSize = 2048;
      const encryptionLength =
        StaticHelpersECIES.computeEncryptedLengthFromDataLength(
          dataLength,
          blockSize,
        );
      expect(encryptionLength).toHaveProperty('capacityPerBlock');
      expect(encryptionLength).toHaveProperty('blocksNeeded');
      expect(encryptionLength).toHaveProperty('padding');
      expect(encryptionLength).toHaveProperty('encryptedDataLength');
      expect(encryptionLength).toHaveProperty('totalEncryptedSize');
    });

    it('should compute the decrypted length from encrypted data length', () => {
      const encryptedDataLength = 2048;
      const blockSize = 2048;
      const padding = 0;
      const decryptedLength =
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          encryptedDataLength,
          blockSize,
          padding,
        );
      expect(decryptedLength).toBe(1024);
    });
  });
});
```

## Tests

### mnemonic generation

#### should generate a valid mnemonic

- **Purpose**: Ensures that a valid mnemonic is generated.
- **Example**:
  ```typescript
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  expect(validateMnemonic(mnemonic)).toBe(true);
  ```

#### should generate a mnemonic with the correct strength

- **Purpose**: Ensures that the generated mnemonic has the correct strength.
- **Example**:
  ```typescript
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  expect(seed.length).toBe(64); // 512 bits
  ```

### wallet creation

#### should create a wallet from a seed

- **Purpose**: Ensures that a wallet can be created from a seed.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const wallet = StaticHelpersECIES.walletFromSeed(seed);
  expect(wallet).toBeInstanceOf(Wallet);
  ```

#### should create a wallet and seed from a mnemonic

- **Purpose**: Ensures that a wallet and seed can be created from a mnemonic.
- **Example**:
  ```typescript
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const { seed, wallet } =
    StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
  expect(seed).toBeInstanceOf(SecureBuffer);
  expect(wallet).toBeInstanceOf(Wallet);
  ```

### key pair conversion

#### should convert a wallet to a simple key pair buffer

- **Purpose**: Ensures that a wallet can be converted to a simple key pair buffer.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const wallet = StaticHelpersECIES.walletFromSeed(seed);
  const keyPair = StaticHelpersECIES.walletToSimpleKeyPairBuffer(wallet);
  expect(keyPair).toHaveProperty('privateKey');
  expect(keyPair).toHaveProperty('publicKey');
  ```

#### should convert a seed to a simple key pair buffer

- **Purpose**: Ensures that a seed can be converted to a simple key pair buffer.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
  expect(keyPair).toHaveProperty('privateKey');
  expect(keyPair).toHaveProperty('publicKey');
  ```

#### should compute a key pair from a mnemonic

- **Purpose**: Ensures that a key pair can be computed from a mnemonic.
- **Example**:
  ```typescript
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const keyPair = StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);
  expect(keyPair).toHaveProperty('privateKey');
  expect(keyPair).toHaveProperty('publicKey');
  ```

### encryption and decryption

#### should encrypt and decrypt a buffer

- **Purpose**: Ensures that a buffer can be encrypted and decrypted.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
  const message = Buffer.from('hello world');
  const encrypted = StaticHelpersECIES.encrypt(keyPair.publicKey, message);
  const decrypted = StaticHelpersECIES.decrypt(keyPair.privateKey, encrypted);
  expect(decrypted).toEqual(message);
  ```

#### should encrypt and decrypt a string

- **Purpose**: Ensures that a string can be encrypted and decrypted.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
  const message = 'hello world';
  const encrypted = StaticHelpersECIES.encryptString(
    keyPair.publicKey.toString('hex'),
    message,
  );
  const decrypted = StaticHelpersECIES.decryptString(
    keyPair.privateKey.toString('hex'),
    encrypted,
  );
  expect(decrypted).toEqual(message);
  ```

#### should encrypt and decrypt for multiple recipients

- **Purpose**: Ensures that a message can be encrypted and decrypted for multiple recipients.
- **Example**:
  ```typescript
  const seed1 = randomBytes(32);
  const seed2 = randomBytes(32);
  const keyPair1 = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed1);
  const keyPair2 = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed2);
  const message = Buffer.from('hello world');
  const recipients = [
    new BrightChainMember(keyPair1.publicKey, keyPair1.privateKey),
    new BrightChainMember(keyPair2.publicKey, keyPair2.privateKey),
  ];
  const encrypted = StaticHelpersECIES.encryptMultiple(recipients, message);
  const decrypted1 = StaticHelpersECIES.decryptMultipleECIEForRecipient(
    encrypted,
    recipients[0],
  );
  const decrypted2 = StaticHelpersECIES.decryptMultipleECIEForRecipient(
    encrypted,
    recipients[1],
  );
  expect(decrypted1).toEqual(message);
  expect(decrypted2).toEqual(message);
  ```

### signature verification

#### should sign and verify a message

- **Purpose**: Ensures that a message can be signed and verified.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
  const message = Buffer.from('hello world');
  const signature = StaticHelpersECIES.signMessage(keyPair.privateKey, message);
  const isValid = StaticHelpersECIES.verifyMessage(
    keyPair.publicKey,
    message,
    signature,
  );
  expect(isValid).toBe(true);
  ```

#### should fail to verify a message with an invalid signature

- **Purpose**: Ensures that a message cannot be verified with an invalid signature.
- **Example**:
  ```typescript
  const seed = randomBytes(32);
  const keyPair = StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed);
  const message = Buffer.from('hello world');
  const signature = StaticHelpersECIES.signMessage(keyPair.privateKey, message);
  const tamperedSignature = Buffer.from(signature);
  tamperedSignature[0] = ~tamperedSignature[0];
  const isValid = StaticHelpersECIES.verifyMessage(
    keyPair.publicKey,
    message,
    tamperedSignature as SignatureBuffer,
  );
  expect(isValid).toBe(false);
  ```

### encryption length calculation

#### should compute the encrypted length from data length

- **Purpose**: Ensures that the encrypted length can be computed from the data length.
- **Example**:
  ```typescript
  const dataLength = 1024;
  const blockSize = 2048;
  const encryptionLength =
    StaticHelpersECIES.computeEncryptedLengthFromDataLength(
      dataLength,
      blockSize,
    );
  expect(encryptionLength).toHaveProperty('capacityPerBlock');
  expect(encryptionLength).toHaveProperty('blocksNeeded');
  expect(encryptionLength).toHaveProperty('padding');
  expect(encryptionLength).toHaveProperty('encryptedDataLength');
  expect(encryptionLength).toHaveProperty('totalEncryptedSize');
  ```

#### should compute the decrypted length from encrypted data length

- **Purpose**: Ensures that the decrypted length can be computed from the encrypted data length.
- **Example**:
  ```typescript
  const encryptedDataLength = 2048;
  const blockSize = 2048;
  const padding = 0;
  const decryptedLength =
    StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
      encryptedDataLength,
      blockSize,
      padding,
    );
  expect(decryptedLength).toBe(1024);
  ```

## Conclusion

The `StaticHelpersECIESSpec` file provides comprehensive unit tests for the `StaticHelpersECIES` class, ensuring the correctness and reliability of ECIES functionalities.
