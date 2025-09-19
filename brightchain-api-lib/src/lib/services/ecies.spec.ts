// brightchain-api-lib/src/lib/services/ecies.spec.ts
import {
  AppConstants,
  ECIES,
  EciesError,
  EciesErrorType,
  EmailString,
  IECIESConfig,
  MemberType,
  SecureString,
} from '@brightchain/brightchain-lib';
import { randomBytes } from 'crypto';
import { BackendMember } from '../backendMember';

import { ECIESService } from './ecies/service';

describe('ECIESService', () => {
  let service: ECIESService;
  let sender: BackendMember;
  let recipient1: BackendMember;
  let recipient2: BackendMember;
  let eciesService: ECIESService;
  let consoleError: typeof console.error;

  beforeAll(() => {
    // mock out console error
    consoleError = console.error;
    console.error = jest.fn();

    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    eciesService = new ECIESService(config);
    service = eciesService;

    sender = BackendMember.newMember(
      eciesService,
      MemberType.User,
      'sender',
      new EmailString('sender@example.com'),
    ).member;
    recipient1 = BackendMember.newMember(
      eciesService,
      MemberType.User,
      'recipient1',
      new EmailString('recipient1@example.com'),
    ).member;
    recipient2 = BackendMember.newMember(
      eciesService,
      MemberType.User,
      'recipient2',
      new EmailString('recipient2@example.com'),
    ).member;
  });

  afterAll(() => {
    // Restore console error
    console.error = consoleError;
  });

  describe('Mnemonic and Wallet Operations', () => {
    it('should generate and validate mnemonics', () => {
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should throw error for invalid mnemonic', () => {
      expect(() =>
        service.walletAndSeedFromMnemonic(new SecureString('invalid mnemonic')),
      ).toThrow(EciesError);
    });

    it('should convert wallet to key pair buffer', () => {
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = service.walletToSimpleKeyPairBuffer(wallet);
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.publicKey[0]).toBe(ECIES.PUBLIC_KEY_MAGIC); // Check for 0x04 prefix
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt a message in simple mode', () => {
      if (recipient1.privateKey === undefined) {
        throw new Error('Recipient private key is undefined');
      }
      const message = Buffer.from('test message');
      const encrypted = service.encryptSimpleOrSingle(
        true, // simple mode
        recipient1.publicKey,
        message,
      );
      const decrypted = service.decryptSimpleOrSingleWithHeader(
        true, // simple mode
        Buffer.from(recipient1.privateKey.value),
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });

    it('should encrypt and decrypt a message in single mode (with length and CRC)', () => {
      if (recipient1.privateKey === undefined) {
        throw new Error('Recipient private key is undefined');
      }
      const message = Buffer.from(
        'test message with more data for single mode',
      );
      const encrypted = service.encryptSimpleOrSingle(
        false, // single mode
        recipient1.publicKey,
        message,
      );
      const decrypted = service.decryptSimpleOrSingleWithHeader(
        false, // single mode
        Buffer.from(recipient1.privateKey.value),
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });

    it('should handle multiple recipients with in-memory objects', () => {
      const message = Buffer.from('test message for multiple recipients');
      const recipients = [sender, recipient1];
      const encrypted = service.encryptMultiple(recipients, message);

      // Test decryption for each recipient
      recipients.forEach((member) => {
        if (!member.privateKey) {
          throw new Error(
            'Recipient private key is undefined for decryption test',
          );
        }
        const decrypted = service.decryptMultipleECIEForRecipient(
          encrypted,
          member,
        );
        expect(decrypted).toEqual(message);
      });
    });

    it('should correctly serialize, parse, and decrypt a multi-recipient message', () => {
      const message = Buffer.from(
        'This is a test of the full multi-recipient lifecycle',
      );
      const recipients = [recipient1, recipient2];

      // 1. Encrypt the message for multiple recipients to get the object representation
      const encryptedObject = service.encryptMultiple(recipients, message);
      expect(encryptedObject.recipientKeys[0].length).toBe(
        ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );

      // 2. Serialize the object into a single buffer
      const headerBuffer =
        service.buildECIESMultipleRecipientHeader(encryptedObject);
      const fullMessageBuffer = Buffer.concat([
        headerBuffer,
        encryptedObject.encryptedMessage,
      ]);

      // 3. Parse the buffer back into an object
      const parsedObject = service.parseMultiEncryptedBuffer(fullMessageBuffer);
      expect(parsedObject.dataLength).toBe(encryptedObject.dataLength);
      expect(parsedObject.recipientCount).toBe(2);
      expect(parsedObject.recipientIds[0].equals(recipient1.id)).toBe(true);
      expect(parsedObject.recipientIds[1].equals(recipient2.id)).toBe(true);

      // 4. Decrypt for each recipient and verify
      if (!recipient1.privateKey || !recipient2.privateKey) {
        throw new Error('Private keys are not defined for recipients');
      }

      const decryptedForRecipient1 = service.decryptMultipleECIEForRecipient(
        parsedObject,
        recipient1,
      );
      const decryptedForRecipient2 = service.decryptMultipleECIEForRecipient(
        parsedObject,
        recipient2,
      );

      expect(decryptedForRecipient1).toEqual(message);
      expect(decryptedForRecipient2).toEqual(message);
    });

    it('should throw error for invalid public key', () => {
      const message = Buffer.from('test message');
      const invalidPublicKey = randomBytes(ECIES.RAW_PUBLIC_KEY_LENGTH); // Wrong length
      expect(() =>
        service.encryptSimpleOrSingle(true, invalidPublicKey, message),
      ).toThrow(EciesError);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw error for too many recipients', () => {
      const message = Buffer.from('test message');
      const tooManyRecipients = Array(70000).fill(recipient1); // More than uint16 max
      expect(() => service.encryptMultiple(tooManyRecipients, message)).toThrow(
        EciesError,
      );
    });
  });

  describe('Message Signing and Verification', () => {
    it('should sign and verify message', () => {
      if (sender.privateKey === undefined) {
        throw new Error('Sender private key is undefined');
      }
      const message = Buffer.from('test message');
      const signature = service.signMessage(
        Buffer.from(sender.privateKey.value),
        message,
      );
      const isValid = service.verifyMessage(
        sender.publicKey,
        message,
        signature,
      );
      expect(isValid).toBe(true);
    });

    it('should detect invalid signature', () => {
      if (sender.privateKey === undefined) {
        throw new Error('Sender private key is undefined');
      }
      const message = Buffer.from('test message');
      const differentMessage = Buffer.from('different message');
      const invalidSignature = service.signMessage(
        Buffer.from(sender.privateKey.value),
        differentMessage,
      );
      const isValid = service.verifyMessage(
        sender.publicKey,
        message,
        invalidSignature,
      );
      expect(isValid).toBe(false);
    });

    it('should handle signature string conversion', () => {
      if (sender.privateKey === undefined) {
        throw new Error('Sender private key is undefined');
      }
      const message = Buffer.from('test message');
      const signature = service.signMessage(
        Buffer.from(sender.privateKey.value),
        message,
      );
      const signatureString =
        service.signatureBufferToSignatureString(signature);
      const recoveredSignature =
        service.signatureStringToSignatureBuffer(signatureString);
      expect(recoveredSignature).toEqual(signature);
    });
  });

  describe('Length Calculations', () => {
    it('should compute encrypted length correctly', () => {
      const dataLength = 1000;
      const result = service.computeEncryptedLengthFromDataLength(
        dataLength,
        'single',
      );
      expect(result).toBe(dataLength + ECIES.SINGLE.FIXED_OVERHEAD_SIZE);
    });

    it('should compute decrypted length correctly', () => {
      const encryptedLength = 8192;
      const overhead = ECIES.SINGLE.FIXED_OVERHEAD_SIZE;
      const padding = 100;

      const decryptedLength =
        service.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          padding,
        );

      expect(decryptedLength).toBe(encryptedLength - overhead - padding);
    });

    it('should throw error for invalid encrypted data length', () => {
      expect(() =>
        service.computeDecryptedLengthFromEncryptedDataLength(123, 4096),
      ).toThrow(EciesError);
    });
  });

  describe('Multi-Recipient Encryption Header Operations', () => {
    it('should calculate ECIES multiple recipient overhead correctly', () => {
      const recipientsCount = 5;
      const overhead = service.calculateECIESMultipleRecipientOverhead(
        recipientsCount,
        false, // includeMessageOverhead = false
      );
      expect(overhead).toBe(
        ECIES.MULTIPLE.DATA_LENGTH_SIZE +
          ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
          recipientsCount * AppConstants.OBJECT_ID_LENGTH +
          recipientsCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );
    });

    it('should build ECIES multiple recipient header correctly', () => {
      const recipientIds = [sender.id, recipient1.id];
      const recipientKeys = recipientIds.map(() =>
        randomBytes(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
      );
      const dataLength = 1000;
      const headerSize = service.calculateECIESMultipleRecipientOverhead(
        recipientIds.length,
        false,
      );

      const header = service.buildECIESMultipleRecipientHeader({
        recipientIds,
        recipientKeys,
        dataLength: dataLength,
        encryptedMessage: randomBytes(dataLength), // Placeholder
        recipientCount: recipientIds.length,
        headerSize: headerSize,
      });

      const expectedHeaderLength =
        service.calculateECIESMultipleRecipientOverhead(
          recipientIds.length,
          false,
        );

      expect(header.length).toBe(expectedHeaderLength);
    });

    it('should parse multi-encrypted header correctly', () => {
      const recipientIds = [sender.id, recipient1.id];
      const recipientKeys = recipientIds.map(() =>
        randomBytes(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
      );
      const dataLength = 1000;
      const headerSize = service.calculateECIESMultipleRecipientOverhead(
        recipientIds.length,
        false,
      );

      const header = service.buildECIESMultipleRecipientHeader({
        recipientIds,
        recipientKeys,
        dataLength: dataLength,
        encryptedMessage: randomBytes(dataLength), // Placeholder
        recipientCount: recipientIds.length,
        headerSize: headerSize,
      });

      const parsedHeader = service.parseMultiEncryptedHeader(header);

      expect(parsedHeader.dataLength).toBe(dataLength);
      expect(parsedHeader.recipientCount).toBe(recipientIds.length);
      expect(parsedHeader.recipientIds).toEqual(recipientIds);
      expect(parsedHeader.recipientKeys).toEqual(recipientKeys);
      expect(parsedHeader.headerSize).toBe(headerSize);
    });

    it('should throw error for invalid data length in parseMultiEncryptedHeader', () => {
      const invalidDataLength = ECIES.MAX_RAW_DATA_SIZE + 1;
      const invalidData = Buffer.alloc(ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE);
      let offset = 0;
      invalidData.writeBigUInt64BE(BigInt(invalidDataLength), offset);
      offset += ECIES.MULTIPLE.DATA_LENGTH_SIZE;
      invalidData.writeUInt16BE(2, offset); // Valid recipient count

      expect(() => service.parseMultiEncryptedHeader(invalidData)).toThrowType(
        EciesError,
        (error: EciesError) => {
          expect(error.type).toBe(EciesErrorType.InvalidDataLength);
        },
      );
    });

    it('should throw error for invalid recipient count in parseMultiEncryptedHeader', () => {
      const dataLength = 1000;
      const invalidRecipientCount = 0; // Invalid: must be > 0

      const minimalHeaderBuffer = Buffer.alloc(
        ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE,
      );
      let offset = 0;

      minimalHeaderBuffer.writeBigUInt64BE(BigInt(dataLength), offset);
      offset += ECIES.MULTIPLE.DATA_LENGTH_SIZE;

      minimalHeaderBuffer.writeUInt16BE(invalidRecipientCount, offset);

      expect(() =>
        service.parseMultiEncryptedHeader(minimalHeaderBuffer),
      ).toThrowType(EciesError, (error: EciesError) => {
        expect(error.type).toBe(EciesErrorType.InvalidRecipientCount);
      });
    });
  });
});
