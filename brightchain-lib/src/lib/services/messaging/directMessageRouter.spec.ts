import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { DirectMessageRouter } from './directMessageRouter';

describe('DirectMessageRouter', () => {
  let router: DirectMessageRouter;
  let mockTransport: jest.Mocked<INetworkTransport>;
  let mockMetadataStore: jest.Mocked<IMessageMetadataStore>;

  beforeEach(() => {
    mockTransport = {
      sendToNode: jest.fn(),
      isNodeReachable: jest.fn(),
    };

    mockMetadataStore = {
      updateDeliveryStatus: jest.fn(),
    } as unknown as jest.Mocked<IMessageMetadataStore>;

    router = new DirectMessageRouter(mockTransport, mockMetadataStore);
  });

  describe('routeToRecipients', () => {
    it('should route message to single recipient successfully', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      const results = await router.routeToRecipients('msg1', ['node1']);

      expect(results.get('node1')).toBe(true);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'node1',
        MessageDeliveryStatus.IN_TRANSIT,
      );
      expect(mockTransport.sendToNode).toHaveBeenCalledWith('node1', 'msg1');
    });

    it('should route message to multiple recipients', async () => {
      mockTransport.sendToNode.mockResolvedValue(true);

      const results = await router.routeToRecipients('msg1', [
        'node1',
        'node2',
        'node3',
      ]);

      expect(results.size).toBe(3);
      expect(results.get('node1')).toBe(true);
      expect(results.get('node2')).toBe(true);
      expect(results.get('node3')).toBe(true);
      expect(mockTransport.sendToNode).toHaveBeenCalledTimes(3);
    });

    it('should mark delivery as FAILED when transport fails', async () => {
      mockTransport.sendToNode.mockResolvedValue(false);

      const results = await router.routeToRecipients('msg1', ['node1']);

      expect(results.get('node1')).toBe(false);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'node1',
        MessageDeliveryStatus.FAILED,
      );
    });

    it('should handle transport exceptions', async () => {
      mockTransport.sendToNode.mockRejectedValue(new Error('Network error'));

      const results = await router.routeToRecipients('msg1', ['node1']);

      expect(results.get('node1')).toBe(false);
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg1',
        'node1',
        MessageDeliveryStatus.FAILED,
      );
    });

    it('should handle mixed success and failure', async () => {
      mockTransport.sendToNode
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const results = await router.routeToRecipients('msg1', [
        'node1',
        'node2',
        'node3',
      ]);

      expect(results.get('node1')).toBe(true);
      expect(results.get('node2')).toBe(false);
      expect(results.get('node3')).toBe(true);
    });
  });

  describe('checkReachability', () => {
    it('should check reachability for single recipient', async () => {
      mockTransport.isNodeReachable.mockResolvedValue(true);

      const results = await router.checkReachability(['node1']);

      expect(results.get('node1')).toBe(true);
      expect(mockTransport.isNodeReachable).toHaveBeenCalledWith('node1');
    });

    it('should check reachability for multiple recipients', async () => {
      mockTransport.isNodeReachable.mockResolvedValue(true);

      const results = await router.checkReachability(['node1', 'node2']);

      expect(results.size).toBe(2);
      expect(results.get('node1')).toBe(true);
      expect(results.get('node2')).toBe(true);
    });

    it('should handle unreachable nodes', async () => {
      mockTransport.isNodeReachable.mockResolvedValue(false);

      const results = await router.checkReachability(['node1']);

      expect(results.get('node1')).toBe(false);
    });

    it('should handle reachability check exceptions', async () => {
      mockTransport.isNodeReachable.mockRejectedValue(
        new Error('Network error'),
      );

      const results = await router.checkReachability(['node1']);

      expect(results.get('node1')).toBe(false);
    });
  });
});
