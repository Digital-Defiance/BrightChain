import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import CONSTANTS, { ECIES } from '../constants';
import { EmailString } from '../emailString';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import MemberType from '../enumerations/memberType';
import { EciesError } from '../errors/eciesError';
import { GuidV4 } from '../guid';
import { SecureString } from '../secureString';
import { ECIESService } from './ecies.service';

describe('ECIESService', () => {
  let service: ECIESService;
  let sender: BrightChainMember;
  let recipient: BrightChainMember;

  beforeAll(() => {
    sender = BrightChainMember.newMember(
      MemberType.User,
      'sender',
      new EmailString('sender@example.com'),
    ).member;
    recipient = BrightChainMember.newMember(
      MemberType.User,
      'recipient',
      new EmailString('recipient@example.com'),
    ).member;
  });

  beforeEach(() => {
    service = new ECIESService();
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
    it('should encrypt and decrypt message', () => {
      if (recipient.privateKey === undefined) {
        throw new Error('Recipient public key is undefined');
      }
      const message = Buffer.from('test message');
      const encrypted = service.encrypt(recipient.publicKey, message);
      const decrypted = service.decryptWithHeader(
        recipient.privateKey,
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });

    it('should handle multiple recipients', () => {
      const message = Buffer.from('test message for multiple recipients');
      const recipients = [sender, recipient];
      const encrypted = service.encryptMultiple(recipients, message);

      // Test decryption for each recipient
      recipients.forEach((recipient) => {
        const decrypted = service.decryptMultipleECIEForRecipient(
          encrypted,
          recipient,
        );
        expect(decrypted).toEqual(message);
      });
    });

    it('should throw error for invalid public key', () => {
      const message = Buffer.from('test message');
      const invalidPublicKey = randomBytes(ECIES.RAW_PUBLIC_KEY_LENGTH); // Wrong length
      expect(() => service.encrypt(invalidPublicKey, message)).toThrow(
        EciesError,
      );
    });

    it('should throw error for too many recipients', () => {
      const message = Buffer.from('test message');
      const tooManyRecipients = Array(70000).fill(recipient); // More than uint16 max
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
      const signature = service.signMessage(sender.privateKey, message);
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
      // Create an invalid signature by using a different message
      const differentMessage = Buffer.from('different message');
      const invalidSignature = service.signMessage(
        sender.privateKey,
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
      const signature = service.signMessage(sender.privateKey, message);
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
      const blockSize = 4096;
      const result = service.computeEncryptedLengthFromDataLength(
        dataLength,
        blockSize,
      );
      expect(result.capacityPerBlock).toBe(blockSize - ECIES.OVERHEAD_SIZE);
      expect(result.blocksNeeded).toBeGreaterThan(0);
      expect(result.totalEncryptedSize).toBe(blockSize * result.blocksNeeded);
    });

    it('should compute decrypted length correctly', () => {
      const blockSize = 4096;
      const encryptedLength = blockSize * 2; // Two full blocks
      const overhead = ECIES.OVERHEAD_SIZE * 2; // Overhead for two blocks
      const padding = 100;

      const decryptedLength =
        service.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          blockSize,
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
      const overhead =
        service.calculateECIESMultipleRecipientOverhead(recipientsCount);
      expect(overhead).toBe(
        ECIES.MULTIPLE.IV_LENGTH +
          ECIES.MULTIPLE.AUTH_TAG_LENGTH +
          CONSTANTS.UINT64_SIZE +
          CONSTANTS.UINT16_SIZE +
          recipientsCount *
            GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer) +
          recipientsCount * ECIES.MULTIPLE.ENCRYPTED_KEY_LENGTH,
      );
    });

    it('should build ECIES multiple recipient header correctly', () => {
      const iv = randomBytes(ECIES.MULTIPLE.IV_LENGTH);
      const authTag = randomBytes(ECIES.MULTIPLE.AUTH_TAG_LENGTH);
      const recipients = [sender, recipient];
      const encryptedKeys = recipients.map(() =>
        randomBytes(ECIES.MULTIPLE.ENCRYPTED_KEY_LENGTH),
      );
      const dataLength = 1000;

      const header = service.buildECIESMultipleRecipientHeader(
        iv,
        authTag,
        recipients,
        encryptedKeys,
        dataLength,
      );

      const expectedHeaderLengthV1 =
        service.calculateECIESMultipleRecipientOverhead(recipients.length);
      const expectedHeaderLengthV2 =
        ECIES.MULTIPLE.IV_LENGTH +
        ECIES.MULTIPLE.AUTH_TAG_LENGTH +
        CONSTANTS.UINT64_SIZE +
        CONSTANTS.UINT16_SIZE +
        recipients.length *
          GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer) +
        encryptedKeys.length * ECIES.MULTIPLE.ENCRYPTED_KEY_LENGTH;

      expect(header.length).toBe(expectedHeaderLengthV1);
      expect(header.length).toBe(expectedHeaderLengthV2);
    });

    it('should parse multi-encrypted header correctly', () => {
      const iv = randomBytes(ECIES.MULTIPLE.IV_LENGTH);
      const authTag = randomBytes(ECIES.MULTIPLE.AUTH_TAG_LENGTH);
      const recipients = [sender, recipient];
      const encryptedKeys = recipients.map(() =>
        randomBytes(ECIES.MULTIPLE.ENCRYPTED_KEY_LENGTH),
      );
      const dataLength = 1000;

      const header = service.buildECIESMultipleRecipientHeader(
        iv,
        authTag,
        recipients,
        encryptedKeys,
        dataLength,
      );

      const parsedHeader = service.parseMultiEncryptedHeader(header);

      expect(parsedHeader.iv).toEqual(iv);
      expect(parsedHeader.authTag).toEqual(authTag);
      expect(parsedHeader.dataLength).toBe(dataLength);
      expect(parsedHeader.recipientCount).toBe(recipients.length);
      expect(parsedHeader.recipientIds).toEqual(recipients.map((r) => r.id));
      expect(parsedHeader.recipientKeys).toEqual(encryptedKeys);
    });

    it('should throw error for invalid data length in parseMultiEncryptedHeader', () => {
      const invalidData = Buffer.alloc(
        ECIES.MULTIPLE.IV_LENGTH +
          ECIES.MULTIPLE.AUTH_TAG_LENGTH +
          CONSTANTS.UINT64_SIZE +
          CONSTANTS.UINT16_SIZE,
      );
      invalidData.writeBigUint64BE(
        BigInt(ECIES.MULTIPLE.MAX_DATA_LENGTH + 1),
        ECIES.MULTIPLE.IV_LENGTH + ECIES.MULTIPLE.AUTH_TAG_LENGTH,
      );

      expect(() => service.parseMultiEncryptedHeader(invalidData)).toThrowType(
        EciesError,
        (error: EciesError) => {
          expect(error.type).toBe(EciesErrorType.InvalidDataLength);
        },
      );
    });

    it('should throw error for invalid recipient count in parseMultiEncryptedHeader', () => {
      const iv = randomBytes(ECIES.MULTIPLE.IV_LENGTH);
      const authTag = randomBytes(ECIES.MULTIPLE.AUTH_TAG_LENGTH);
      const dataLength = 1000;
      const invalidRecipientCount = ECIES.MULTIPLE.MAX_RECIPIENTS + 1;
      const dataLengthBuffer = Buffer.alloc(CONSTANTS.UINT64_SIZE);
      dataLengthBuffer.writeBigUint64BE(BigInt(dataLength));
      const invalidData = Buffer.concat([
        iv,
        authTag,
        dataLengthBuffer,
        Buffer.alloc(CONSTANTS.UINT16_SIZE, invalidRecipientCount),
      ]);

      expect(() => service.parseMultiEncryptedHeader(invalidData)).toThrowType(
        EciesError,
        (error: EciesError) => {
          expect(error.type).toBe(EciesErrorType.InvalidRecipientCount);
        },
      );
    });
  });
});
