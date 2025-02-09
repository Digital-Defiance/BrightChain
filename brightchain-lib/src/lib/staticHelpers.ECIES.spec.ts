import { faker } from '@faker-js/faker';
import { createECDH, randomBytes } from 'crypto';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { EciesErrorType } from './enumerations/eciesErrorType';
import MemberType from './enumerations/memberType';
import { EciesError } from './errors/eciesError';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

describe('StaticHelpersECIES', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let keyPair: { privateKey: Buffer; publicKey: Buffer };
  let keyPairHex: { privateKey: string; publicKey: string };
  let testData: Buffer;

  beforeAll(() => {
    // Create key pairs once for all tests
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    keyPair = {
      privateKey: ecdh.getPrivateKey(),
      publicKey: ecdh.getPublicKey(),
    };
    keyPairHex = {
      privateKey: keyPair.privateKey.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
    };
    testData = Buffer.from('test data');
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data with proper structure', () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        testData,
      );

      // Verify encrypted data structure
      expect(encryptedData.length).toBeGreaterThan(
        StaticHelpersECIES.eciesOverheadLength,
      );

      // Extract and verify components
      const ephemeralPublicKey = encryptedData.subarray(
        0,
        StaticHelpersECIES.publicKeyLength,
      );
      const iv = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength,
        StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      );
      const authTag = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
        StaticHelpersECIES.publicKeyLength +
          StaticHelpersECIES.ivLength +
          StaticHelpersECIES.authTagLength,
      );
      const encrypted = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength +
          StaticHelpersECIES.ivLength +
          StaticHelpersECIES.authTagLength,
      );

      expect(ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(authTag.length).toBe(StaticHelpersECIES.authTagLength);
      expect(encrypted.length).toBeGreaterThanOrEqual(testData.length);

      // Test both decryption methods
      const decryptedWithComponents = StaticHelpersECIES.decryptWithComponents(
        keyPair.privateKey,
        ephemeralPublicKey,
        iv,
        authTag,
        encrypted,
      );
      expect(decryptedWithComponents).toEqual(testData);

      const decryptedWithHeader = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedData,
      );
      expect(decryptedWithHeader).toEqual(testData);
    });

    it('should handle empty and large data', () => {
      // Empty data
      const emptyData = Buffer.alloc(0);
      const encryptedEmpty = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        emptyData,
      );
      const decryptedEmpty = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedEmpty,
      );
      expect(decryptedEmpty).toEqual(emptyData);

      // Large data (64KB - sufficient for testing encryption/decryption of larger payloads)
      const largeData = randomBytes(64 * 1024);
      const encryptedLarge = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        largeData,
      );
      const decryptedLarge = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedLarge,
      );
      expect(decryptedLarge).toEqual(largeData);
    });

    it('should fail with invalid data or mismatched keys', () => {
      // Invalid data
      const invalidData = Buffer.alloc(10);
      expect(() => {
        return StaticHelpersECIES.decrypt(keyPair.privateKey, invalidData);
      }).toThrowType(EciesError, (error: EciesError) => {
        expect(error.reason).toBe(EciesErrorType.InvalidEphemeralPublicKey);
      });

      // Mismatched keys
      const otherEcdh = createECDH(StaticHelpersECIES.curveName);
      otherEcdh.generateKeys();
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        testData,
      );
      expect(() => {
        return StaticHelpersECIES.decrypt(
          otherEcdh.getPrivateKey(),
          encryptedData,
        );
      }).toThrowType(EciesError, (error: EciesError) => {
        expect(error.reason).toBe(EciesErrorType.InvalidEphemeralPublicKey);
      });
    });
  });

  describe('string encryption and decryption', () => {
    const testStrings = {
      normal: 'test string',
      empty: '',
      unicode: '🚀 Hello, 世界!',
    };

    it('should handle various string types correctly', () => {
      // Test all string types
      for (const str of Object.values(testStrings)) {
        const encryptedHex = StaticHelpersECIES.encryptString(
          keyPairHex.publicKey,
          str,
        );
        const decrypted = StaticHelpersECIES.decryptString(
          keyPairHex.privateKey,
          encryptedHex,
        );
        expect(decrypted).toBe(str);
      }
    });

    it('should fail with invalid hex strings', () => {
      const invalidHex = 'not a hex string';
      expect(() => {
        return StaticHelpersECIES.decryptString(
          keyPairHex.privateKey,
          invalidHex,
        );
      }).toThrowType(EciesError, (error: EciesError) => {
        expect(error.reason).toBe(EciesErrorType.InvalidEphemeralPublicKey);
      });
    });
  });

  describe('overhead calculations', () => {
    const blockSize = 4096;

    it('should calculate encrypted length correctly', () => {
      const dataLength = 1000;
      const result = StaticHelpersECIES.computeEncryptedLengthFromDataLength(
        dataLength,
        blockSize,
      );

      const expectedCapacityPerBlock =
        blockSize - StaticHelpersECIES.eciesOverheadLength;
      const expectedPadding =
        blockSize -
        StaticHelpersECIES.eciesOverheadLength -
        (dataLength % expectedCapacityPerBlock);

      expect(result.capacityPerBlock).toBe(expectedCapacityPerBlock);
      expect(result.blocksNeeded).toBe(1);
      expect(result.padding).toBe(expectedPadding);
      expect(result.encryptedDataLength).toBe(blockSize - result.padding);
      expect(result.totalEncryptedSize).toBe(blockSize);
    });

    it('should calculate decrypted length correctly', () => {
      const encryptedLength = blockSize;
      const padding = 100;

      const result =
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          blockSize,
          padding,
        );

      expect(result).toBe(
        encryptedLength - StaticHelpersECIES.eciesOverheadLength - padding,
      );

      // Test invalid length
      expect(() => {
        return StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          blockSize + 1,
          blockSize,
        );
      }).toThrowType(EciesError, (error: EciesError) => {
        expect(error.reason).toBe(EciesErrorType.InvalidEncryptedDataLength);
      });
    });
  });
});

describe('multi-recipient encryption', () => {
  const recipients = Array.from({ length: 3 }).map(() => {
    return BrightChainMember.newMember(
      MemberType.System,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    ).member;
  });

  const testData = Buffer.from('test data for multiple recipients');

  it('should encrypt for multiple recipients and allow each to decrypt', () => {
    // Encrypt for all recipients
    const encrypted = StaticHelpersECIES.encryptMultiple(recipients, testData);
    const encryptedBuffer =
      StaticHelpersECIES.multipleEncryptResultsToBuffer(encrypted);
    const expectedOverheadLength =
      StaticHelpersECIES.computeMultipleECIESOverheadLength(recipients.length);
    const expectedHeaderLength =
      expectedOverheadLength -
      StaticHelpersECIES.eciesMultipleMessageOverheadLength;
    if (encryptedBuffer.headerLength != expectedHeaderLength) {
      throw new EciesError(EciesErrorType.InvalidHeaderLength);
    }
    if (
      encryptedBuffer.data.length !=
      expectedOverheadLength + testData.length
    ) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }

    // Verify structure
    expect(encrypted.recipientIds.length).toBe(recipients.length);
    expect(encrypted.encryptedKeys.length).toBe(recipients.length);
    expect(encrypted.encryptedMessage).toBeDefined();

    // Each recipient should be able to decrypt
    for (const recipient of recipients) {
      const decrypted = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipient,
      );
      expect(decrypted).toEqual(testData);
    }
  });

  it('should correctly encode and decode multi-recipient encryption to buffer', () => {
    const encrypted = StaticHelpersECIES.encryptMultiple(recipients, testData);

    // Convert to buffer
    const { data } =
      StaticHelpersECIES.multipleEncryptResultsToBuffer(encrypted);

    // Decode from buffer
    const decoded = StaticHelpersECIES.bufferToMultiRecipientEncryption(data);

    // Verify structure matches
    expect(decoded.recipientIds.length).toBe(encrypted.recipientIds.length);
    expect(
      decoded.recipientIds.every((id, i) =>
        id.equals(encrypted.recipientIds[i]),
      ),
    ).toBe(true);
    expect(decoded.encryptedKeys).toEqual(encrypted.encryptedKeys);
    expect(decoded.encryptedMessage).toEqual(encrypted.encryptedMessage);

    // Verify each recipient can still decrypt
    for (const recipient of recipients) {
      const decrypted = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        decoded,
        recipient,
      );
      expect(decrypted).toEqual(testData);
    }
  });

  it('should reject decryption for non-recipient', () => {
    const encrypted = StaticHelpersECIES.encryptMultiple(
      recipients.slice(0, 2), // Only encrypt for first two recipients
      testData,
    );

    // Try to decrypt with the third recipient
    expect(() => {
      return StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipients[2],
      );
    }).toThrowType(EciesError, (error: EciesError) => {
      expect(error.reason).toBe(EciesErrorType.RecipientNotFound);
    });
  });

  it('should handle empty data', () => {
    const emptyData = Buffer.alloc(0);
    const encrypted = StaticHelpersECIES.encryptMultiple(recipients, emptyData);

    for (const recipient of recipients) {
      const decrypted = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipient,
      );
      expect(decrypted).toEqual(emptyData);
    }
  });

  it('should handle large data', () => {
    const largeData = randomBytes(64 * 1024); // 64KB
    const encrypted = StaticHelpersECIES.encryptMultiple(recipients, largeData);

    for (const recipient of recipients) {
      const decrypted = StaticHelpersECIES.decryptMultipleECIEForRecipient(
        encrypted,
        recipient,
      );
      expect(decrypted).toEqual(largeData);
    }
  });

  it('should throw error when recipient count exceeds uint16', () => {
    const tooManyRecipients = Array.from({ length: 65536 }).map(
      () => recipients[0],
    );

    expect(() => {
      return StaticHelpersECIES.encryptMultiple(tooManyRecipients, testData);
    }).toThrowType(EciesError, (error: EciesError) => {
      expect(error.reason).toBe(EciesErrorType.TooManyRecipients);
    });
  });
});
