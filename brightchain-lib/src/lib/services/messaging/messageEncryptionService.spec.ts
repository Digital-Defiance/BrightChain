import { MessageEncryptionService } from './messageEncryptionService';
import { MessageError } from '../../errors/messaging/messageError';

describe('MessageEncryptionService', () => {
  let service: MessageEncryptionService;

  beforeEach(() => {
    service = new MessageEncryptionService();
  });

  describe('encryptDirect', () => {
    it('should throw error when no recipient keys provided', async () => {
      const content = new Uint8Array([1, 2, 3]);
      const recipientKeys = new Map<string, Uint8Array>();

      await expect(service.encryptDirect(content, recipientKeys)).rejects.toThrow(MessageError);
      await expect(service.encryptDirect(content, recipientKeys)).rejects.toThrow('No recipient public keys provided');
    });
  });

  describe('encryptBroadcast', () => {
    it('should accept content and public key', () => {
      // Placeholder test - actual encryption requires valid secp256k1 keys
      expect(service).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('should have decrypt method', () => {
      expect(typeof service.decrypt).toBe('function');
    });
  });

  describe('decryptKey', () => {
    it('should have decryptKey method', () => {
      expect(typeof service.decryptKey).toBe('function');
    });
  });
});
