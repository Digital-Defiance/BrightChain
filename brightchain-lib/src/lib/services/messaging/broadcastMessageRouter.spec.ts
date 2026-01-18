import { BroadcastMessageRouter } from './broadcastMessageRouter';
import { IGossipService } from '../../interfaces/availability/gossipService';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';

describe('BroadcastMessageRouter', () => {
  let router: BroadcastMessageRouter;
  let mockGossipService: jest.Mocked<IGossipService>;
  let mockMetadataStore: jest.Mocked<IMessageMetadataStore>;

  beforeEach(() => {
    mockGossipService = {
      announceBlock: jest.fn(),
    } as unknown as jest.Mocked<IGossipService>;

    mockMetadataStore = {
      updateDeliveryStatus: jest.fn(),
    } as unknown as jest.Mocked<IMessageMetadataStore>;

    router = new BroadcastMessageRouter(mockGossipService, mockMetadataStore);
  });

  describe('broadcastMessage', () => {
    it('should broadcast message via gossip protocol', async () => {
      mockGossipService.announceBlock.mockResolvedValue(undefined);

      const result = await router.broadcastMessage('msg1');

      expect(result).toBe(true);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'broadcast',
        MessageDeliveryStatus.IN_TRANSIT
      );
      expect(mockGossipService.announceBlock).toHaveBeenCalledWith('msg1');
    });

    it('should mark delivery as FAILED when gossip fails', async () => {
      mockGossipService.announceBlock.mockRejectedValue(new Error('Gossip error'));

      const result = await router.broadcastMessage('msg1');

      expect(result).toBe(false);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'broadcast',
        MessageDeliveryStatus.FAILED
      );
    });

    it('should handle multiple broadcast attempts', async () => {
      mockGossipService.announceBlock.mockResolvedValue(undefined);

      await router.broadcastMessage('msg1');
      await router.broadcastMessage('msg2');
      await router.broadcastMessage('msg3');

      expect(mockGossipService.announceBlock).toHaveBeenCalledTimes(3);
      expect(mockGossipService.announceBlock).toHaveBeenCalledWith('msg1');
      expect(mockGossipService.announceBlock).toHaveBeenCalledWith('msg2');
      expect(mockGossipService.announceBlock).toHaveBeenCalledWith('msg3');
    });

    it('should accept optional TTL parameter', async () => {
      mockGossipService.announceBlock.mockResolvedValue(undefined);

      const result = await router.broadcastMessage('msg1', 5);

      expect(result).toBe(true);
      expect(mockGossipService.announceBlock).toHaveBeenCalledWith('msg1');
    });
  });
});
