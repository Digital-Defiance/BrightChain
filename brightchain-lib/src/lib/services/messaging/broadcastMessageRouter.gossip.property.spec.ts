import fc from 'fast-check';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IGossipService } from '../../interfaces/availability/gossipService';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { BroadcastMessageRouter } from './broadcastMessageRouter';

describe('Feature: message-passing-and-events, Property: Broadcast Gossip Protocol Usage', () => {
  it('Property 12: Broadcast uses gossip protocol for any message ID', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (messageId) => {
        const mockGossipService = {
          announceBlock: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IGossipService>;

        const mockMetadataStore = {
          updateDeliveryStatus: jest.fn(),
        } as unknown as jest.Mocked<IMessageMetadataStore>;

        const router = new BroadcastMessageRouter(
          mockGossipService,
          mockMetadataStore,
        );
        await router.broadcastMessage(messageId);

        expect(mockGossipService.announceBlock).toHaveBeenCalledWith(messageId);
        expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
          messageId,
          'broadcast',
          MessageDeliveryStatus.IN_TRANSIT,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12: Broadcast marks FAILED when gossip service fails', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (messageId) => {
        const mockGossipService = {
          announceBlock: jest
            .fn()
            .mockRejectedValue(new Error('Gossip failed')),
        } as unknown as jest.Mocked<IGossipService>;

        const mockMetadataStore = {
          updateDeliveryStatus: jest.fn(),
        } as unknown as jest.Mocked<IMessageMetadataStore>;

        const router = new BroadcastMessageRouter(
          mockGossipService,
          mockMetadataStore,
        );
        const result = await router.broadcastMessage(messageId);

        expect(result).toBe(false);
        expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
          messageId,
          'broadcast',
          MessageDeliveryStatus.FAILED,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12: Broadcast accepts optional TTL parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.integer({ min: 1, max: 10 }),
        async (messageId, ttl) => {
          const mockGossipService = {
            announceBlock: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<IGossipService>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const router = new BroadcastMessageRouter(
            mockGossipService,
            mockMetadataStore,
          );
          const result = await router.broadcastMessage(messageId, ttl);

          expect(result).toBe(true);
          expect(mockGossipService.announceBlock).toHaveBeenCalledWith(
            messageId,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
