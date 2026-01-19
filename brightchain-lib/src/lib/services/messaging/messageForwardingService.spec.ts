import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { MessageForwardingService } from './messageForwardingService';

describe('MessageForwardingService', () => {
  let service: MessageForwardingService;
  let mockTransport: jest.Mocked<INetworkTransport>;
  let mockMetadataStore: jest.Mocked<IMessageMetadataStore>;
  const nodeId = 'node-self';

  beforeEach(() => {
    mockTransport = {
      sendToNode: jest.fn(),
      isNodeReachable: jest.fn(),
    };

    mockMetadataStore = {
      updateDeliveryStatus: jest.fn(),
    } as unknown as jest.Mocked<IMessageMetadataStore>;

    service = new MessageForwardingService(
      mockTransport,
      mockMetadataStore,
      nodeId,
    );
  });

  describe('forwardMessage', () => {
    it('should forward message through intermediate node', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(true);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'recipient1',
        MessageDeliveryStatus.IN_TRANSIT,
      );
      expect(mockTransport.sendToNode).toHaveBeenCalledWith(
        'intermediate1',
        'msg1',
      );
    });

    it('should detect forwarding loop to same intermediate node', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      await service.forwardMessage('msg1', 'recipient1', 'intermediate1');
      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(false);
      expect(mockTransport.sendToNode).toHaveBeenCalledTimes(1);
    });

    it('should detect forwarding loop back to self', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      await service.forwardMessage('msg1', 'recipient1', 'intermediate1');
      const result = await service.forwardMessage('msg1', 'recipient1', nodeId);

      expect(result).toBe(false);
    });

    it('should allow forwarding through different intermediate nodes', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      const result1 = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );
      const result2 = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate2',
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockTransport.sendToNode).toHaveBeenCalledTimes(2);
    });

    it('should mark delivery as FAILED when transport fails', async () => {
      mockTransport.sendToNode.mockResolvedValue(false);

      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(false);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'recipient1',
        MessageDeliveryStatus.FAILED,
      );
    });

    it('should handle transport exceptions', async () => {
      mockTransport.sendToNode.mockRejectedValue(new Error('Network error'));

      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(false);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'recipient1',
        MessageDeliveryStatus.FAILED,
      );
    });

    it('should track separate paths for different messages', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      await service.forwardMessage('msg1', 'recipient1', 'intermediate1');
      await service.forwardMessage('msg2', 'recipient2', 'intermediate1');
      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(false);
      expect(mockTransport.sendToNode).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearPath', () => {
    it('should clear forwarding path for message', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      await service.forwardMessage('msg1', 'recipient1', 'intermediate1');
      service.clearPath('msg1');
      const result = await service.forwardMessage(
        'msg1',
        'recipient1',
        'intermediate1',
      );

      expect(result).toBe(true);
      expect(mockTransport.sendToNode).toHaveBeenCalledTimes(2);
    });
  });
});
