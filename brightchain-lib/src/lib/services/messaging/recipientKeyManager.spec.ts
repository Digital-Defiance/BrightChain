import { RecipientKeyManager, IPublicKeyProvider } from './recipientKeyManager';
import { MessageError } from '../../errors/messaging/messageError';

class MockKeyProvider implements IPublicKeyProvider {
  private keys = new Map<string, Uint8Array>();

  setKey(nodeId: string, publicKey: Uint8Array): void {
    this.keys.set(nodeId, publicKey);
  }

  async getPublicKey(nodeId: string): Promise<Uint8Array | null> {
    return this.keys.get(nodeId) || null;
  }
}

describe('RecipientKeyManager', () => {
  let manager: RecipientKeyManager;
  let provider: MockKeyProvider;

  beforeEach(() => {
    provider = new MockKeyProvider();
    manager = new RecipientKeyManager(provider);
  });

  describe('validatePublicKey', () => {
    it('should accept 65-byte uncompressed key starting with 0x04', () => {
      const key = new Uint8Array(65);
      key[0] = 0x04;
      expect(manager.validatePublicKey(key)).toBe(true);
    });

    it('should accept 33-byte compressed key starting with 0x02', () => {
      const key = new Uint8Array(33);
      key[0] = 0x02;
      expect(manager.validatePublicKey(key)).toBe(true);
    });

    it('should accept 33-byte compressed key starting with 0x03', () => {
      const key = new Uint8Array(33);
      key[0] = 0x03;
      expect(manager.validatePublicKey(key)).toBe(true);
    });

    it('should reject key with invalid length', () => {
      const key = new Uint8Array(32);
      expect(manager.validatePublicKey(key)).toBe(false);
    });

    it('should reject 65-byte key not starting with 0x04', () => {
      const key = new Uint8Array(65);
      key[0] = 0x02;
      expect(manager.validatePublicKey(key)).toBe(false);
    });

    it('should reject 33-byte key not starting with 0x02 or 0x03', () => {
      const key = new Uint8Array(33);
      key[0] = 0x04;
      expect(manager.validatePublicKey(key)).toBe(false);
    });
  });

  describe('fetchPublicKeys', () => {
    it('should fetch keys for all recipients', async () => {
      const key1 = new Uint8Array(33);
      key1[0] = 0x02;
      const key2 = new Uint8Array(33);
      key2[0] = 0x03;

      provider.setKey('recipient1', key1);
      provider.setKey('recipient2', key2);

      const keys = await manager.fetchPublicKeys(['recipient1', 'recipient2']);

      expect(keys.size).toBe(2);
      expect(keys.get('recipient1')).toEqual(key1);
      expect(keys.get('recipient2')).toEqual(key2);
    });

    it('should throw error when key is missing', async () => {
      const key1 = new Uint8Array(33);
      key1[0] = 0x02;
      provider.setKey('recipient1', key1);

      await expect(manager.fetchPublicKeys(['recipient1', 'recipient2'])).rejects.toThrow(MessageError);
      await expect(manager.fetchPublicKeys(['recipient1', 'recipient2'])).rejects.toThrow('Missing or invalid public keys');
    });

    it('should throw error when key is invalid', async () => {
      const invalidKey = new Uint8Array(32); // Wrong length
      provider.setKey('recipient1', invalidKey);

      await expect(manager.fetchPublicKeys(['recipient1'])).rejects.toThrow(MessageError);
    });
  });

  describe('fetchPublicKeyOptional', () => {
    it('should return key when available and valid', async () => {
      const key = new Uint8Array(33);
      key[0] = 0x02;
      provider.setKey('recipient1', key);

      const result = await manager.fetchPublicKeyOptional('recipient1');
      expect(result).toEqual(key);
    });

    it('should return null when key is missing', async () => {
      const result = await manager.fetchPublicKeyOptional('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when key is invalid', async () => {
      const invalidKey = new Uint8Array(32);
      provider.setKey('recipient1', invalidKey);

      const result = await manager.fetchPublicKeyOptional('recipient1');
      expect(result).toBeNull();
    });
  });
});
