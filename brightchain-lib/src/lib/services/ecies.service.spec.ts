import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import CONSTANTS, { ECIES } from '../constants';
import { EmailString } from '../emailString';
// Removed BlockType import as it's not used correctly here
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import MemberType from '../enumerations/memberType';
import { EciesError } from '../errors/eciesError';
import { GuidV4 } from '../guid';
import { SecureString } from '../secureString';
import { ECIESService } from './ecies.service';
import { ServiceProvider } from './service.provider'; // Added
import { VotingService } from './voting.service'; // Added

describe('ECIESService', () => {
  let service: ECIESService;
  let sender: BrightChainMember;
  let recipient: BrightChainMember;
  let eciesService: ECIESService; // Added
  let votingService: VotingService; // Added
  let consoleError: typeof console.error;

  beforeAll(() => {
    // mock out console error
    consoleError = console.error;
    console.error = jest.fn();

    // Get service instances
    eciesService = ServiceProvider.getInstance().eciesService;
    votingService = ServiceProvider.getInstance().votingService;
    // Use the same service instance throughout the tests
    service = eciesService;

    sender = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.User,
      'sender',
      new EmailString('sender@example.com'),
    ).member;
    recipient = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.User,
      'recipient',
      new EmailString('recipient@example.com'),
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
    it('should encrypt and decrypt message', () => {
      if (recipient.privateKey === undefined) {
        throw new Error('Recipient private key is undefined');
      }
      const message = Buffer.from('test message');
      const encrypted = service.encryptSimpleOrSingle(
        recipient.publicKey,
        message,
      );
      // Use decryptSingleWithHeader instead of decryptWithHeader
      const decrypted = service.decryptSimpleOrSingleWithHeader(
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
      recipients.forEach((recipientMember) => {
        // Renamed inner variable to avoid conflict
        if (!recipientMember.privateKey) {
          throw new Error(
            'Recipient private key is undefined for decryption test',
          );
        }
        const decrypted = service.decryptMultipleECIEForRecipient(
          encrypted,
          recipientMember,
        );
        expect(decrypted).toEqual(message);
      });
    });

    it('should throw error for invalid public key', () => {
      const message = Buffer.from('test message');
      const invalidPublicKey = randomBytes(ECIES.RAW_PUBLIC_KEY_LENGTH); // Wrong length
      expect(() =>
        service.encryptSimpleOrSingle(invalidPublicKey, message),
      ).toThrow(EciesError);
      expect(console.error).toHaveBeenCalledTimes(1);
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
      // Add the missing boolean argument (false for header only)
      const overhead = service.calculateECIESMultipleRecipientOverhead(
        recipientsCount,
        false, // includeMessageOverhead = false
      );
      // Overhead calculation should NOT include IV and AuthTag for header only
      expect(overhead).toBe(
        ECIES.MULTIPLE.DATA_LENGTH_SIZE +
          ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
          recipientsCount *
            GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer) +
          recipientsCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );
    });

    it('should build ECIES multiple recipient header correctly', () => {
      // Removed unused iv and authTag declarations
      const recipientIds = [sender.id, recipient.id];
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
        encryptedMessage: randomBytes(dataLength), // Placeholder, not used by header builder
        recipientCount: recipientIds.length,
        headerSize: headerSize,
      });

      // Add the missing boolean argument (false for header only)
      const expectedHeaderLength =
        service.calculateECIESMultipleRecipientOverhead(
          recipientIds.length,
          false,
        );

      expect(header.length).toBe(expectedHeaderLength);
    });

    it('should parse multi-encrypted header correctly', () => {
      // Removed unused iv and authTag declarations
      const recipientIds = [sender.id, recipient.id];
      const recipientKeys = recipientIds.map(() =>
        randomBytes(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
      );
      const dataLength = 1000;
      const headerSize = service.calculateECIESMultipleRecipientOverhead(
        recipientIds.length,
        false,
      );

      // Build the header using the corrected object structure
      const header = service.buildECIESMultipleRecipientHeader({
        recipientIds,
        recipientKeys,
        dataLength: dataLength,
        encryptedMessage: randomBytes(dataLength), // Placeholder
        recipientCount: recipientIds.length,
        headerSize: headerSize,
      });

      const parsedHeader = service.parseMultiEncryptedHeader(header);

      // Remove checks for iv and authTag as they are not part of the parsed header
      expect(parsedHeader.dataLength).toBe(dataLength);
      expect(parsedHeader.recipientCount).toBe(recipientIds.length);
      expect(parsedHeader.recipientIds).toEqual(recipientIds);
      expect(parsedHeader.recipientKeys).toEqual(recipientKeys);
      expect(parsedHeader.headerSize).toBe(headerSize);
    });

    it('should throw error for invalid data length in parseMultiEncryptedHeader', () => {
      // Construct a buffer just large enough for fixed overhead but with invalid data length value
      const invalidDataLength = ECIES.MULTIPLE.MAX_DATA_SIZE + 1;
      const invalidData = Buffer.alloc(ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE);
      let offset = 0;
      invalidData.writeBigUInt64BE(BigInt(invalidDataLength), offset);
      offset += CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE;
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
      const invalidRecipientCount = ECIES.MULTIPLE.MAX_RECIPIENTS + 1; // 65536

      // Create buffers for header parts
      const dataLengthBuffer = Buffer.alloc(
        CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE,
      );
      dataLengthBuffer.writeBigUInt64BE(BigInt(dataLength));

      // Use a temporary buffer that can hold the overflowing value,
      // even though the function reads it as UInt16BE.
      const recipientCountBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE); // Use UINT32 temporarily
      recipientCountBuffer.writeUInt32BE(invalidRecipientCount); // Write the overflowing value

      // Construct a buffer that is *at least* long enough for the fixed parts
      const minimalHeaderBuffer = Buffer.concat([
        dataLengthBuffer,
        recipientCountBuffer.subarray(2, 4), // Take the last 2 bytes which represent the UInt16BE value
      ]);

      expect(() =>
        service.parseMultiEncryptedHeader(minimalHeaderBuffer),
      ).toThrowType(EciesError, (error: EciesError) => {
        // Now it should correctly throw InvalidRecipientCount
        expect(error.type).toBe(EciesErrorType.InvalidRecipientCount);
      });
    });
  });
});
