import {
  MessageCBLService,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagePassingService } from './messagePassingService';

describe('MessagePassingService', () => {
  describe('sendMessage', () => {
    it('should return messageId and magnetUrl when whitening is supported', async () => {
      const mockMessageCBL = {
        createMessage: jest.fn<any>(),
        getMessageMetadata: jest.fn<any>(),
      } as any;

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
        contentBlockIds: ['block1'],
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
      });

      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
      });

      const mockMetadataStore = {
        updateDeliveryStatus: jest.fn<any>(),
      } as any;

      mockMetadataStore.updateDeliveryStatus.mockResolvedValue(undefined);

      const mockEventSystem = {
        emit: jest.fn(),
      } as any;

      const mockWsServer = {
        sendToNode: jest.fn<any>(),
        broadcast: jest.fn(),
        onMessage: jest.fn(),
        onAck: jest.fn(),
      } as any;

      mockWsServer.sendToNode.mockResolvedValue(undefined);

      const service = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockWsServer,
      );

      const content = Buffer.from('Hello, World!');
      const result = await service.sendMessage(content, 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      expect(result.messageId).toBeDefined();
      expect(result.magnetUrl).toBeDefined();
      expect(result.magnetUrl).toContain('magnet:?');
    });
  });
});
