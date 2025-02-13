import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { EmailString } from '../emailString';
import MemberType from '../enumerations/memberType';
import { EciesError } from '../errors/eciesError';
import { ECIESService } from './ecies.service';

describe('ECIESService', () => {
  let service: ECIESService;
  let sender: BrightChainMember;
  let recipient: BrightChainMember;

  beforeEach(() => {
    service = new ECIESService();
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

  describe('Mnemonic and Wallet Operations', () => {
    it('should generate and validate mnemonics', () => {
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should throw error for invalid mnemonic', () => {
      expect(() =>
        service.walletAndSeedFromMnemonic('invalid mnemonic'),
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
      const message = Buffer.from('test message');
      const encrypted = service.encrypt(recipient.publicKey, message);
      const decrypted = service.decrypt(recipient.privateKey, encrypted);
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
      expect(result.capacityPerBlock).toBe(
        blockSize - service.eciesOverheadLength,
      );
      expect(result.blocksNeeded).toBeGreaterThan(0);
      expect(result.totalEncryptedSize).toBe(blockSize * result.blocksNeeded);
    });

    it('should compute decrypted length correctly', () => {
      const blockSize = 4096;
      const encryptedLength = blockSize * 2; // Two full blocks
      const overhead = service.eciesOverheadLength * 2; // Overhead for two blocks
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
});
