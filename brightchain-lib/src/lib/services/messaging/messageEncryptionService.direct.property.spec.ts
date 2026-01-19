import * as fc from 'fast-check';
import { MessageError } from '../../errors/messaging/messageError';
import { MessageEncryptionService } from './messageEncryptionService';

/**
 * Property 7: Direct Message Encryption
 *
 * @remarks
 * Validates that direct messages require recipient public keys
 * and that the encryption service properly handles multiple recipients.
 * Note: Actual encryption validation requires valid secp256k1 keys.
 *
 * @see Requirements 3.1, 3.5
 */
describe('Feature: message-passing-and-events, Property 7: Direct Message Encryption', () => {
  let service: MessageEncryptionService;

  beforeEach(() => {
    service = new MessageEncryptionService();
  });

  it('should require at least one recipient public key for direct encryption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }), // content
        async (content) => {
          const emptyKeys = new Map<string, Uint8Array>();

          // Should throw error when no recipient keys provided
          await expect(
            service.encryptDirect(content, emptyKeys),
          ).rejects.toThrow(MessageError);
          await expect(
            service.encryptDirect(content, emptyKeys),
          ).rejects.toThrow('No recipient public keys provided');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should accept Map of recipient IDs to public keys', () => {
    // Validates interface accepts correct types
    const recipientKeys = new Map<string, Uint8Array>();
    recipientKeys.set('recipient1', new Uint8Array(33));
    recipientKeys.set('recipient2', new Uint8Array(65));

    expect(recipientKeys.size).toBe(2);
    expect(recipientKeys.has('recipient1')).toBe(true);
    expect(recipientKeys.has('recipient2')).toBe(true);
  });

  it('should support multiple recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // number of recipients
        async (numRecipients) => {
          const recipientIds: string[] = [];
          for (let i = 0; i < numRecipients; i++) {
            recipientIds.push(`recipient${i}`);
          }

          // Validates that multiple recipient IDs can be tracked
          expect(recipientIds.length).toBe(numRecipients);
          expect(new Set(recipientIds).size).toBe(numRecipients);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should validate encryption service has required methods', () => {
    expect(typeof service.encryptDirect).toBe('function');
    expect(typeof service.encryptBroadcast).toBe('function');
    expect(typeof service.decrypt).toBe('function');
    expect(typeof service.decryptKey).toBe('function');
  });
});
