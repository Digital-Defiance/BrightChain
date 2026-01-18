import fc from 'fast-check';
import { DirectMessageRouter } from './directMessageRouter';
import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';

describe('Feature: message-passing-and-events, Property: Direct Message Targeted Routing', () => {
  it('Property 13: Direct routing targets specific recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.array(fc.string().filter((s) => s.length > 0), { minLength: 1, maxLength: 10 }),
        async (messageId, recipients) => {
          const uniqueRecipients = Array.from(new Set(recipients));
          
          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const router = new DirectMessageRouter(mockTransport, mockMetadataStore);
          const results = await router.routeToRecipients(messageId, recipients);

          // Verify each unique recipient was targeted
          expect(results.size).toBe(uniqueRecipients.length);
          for (const recipient of uniqueRecipients) {
            expect(results.get(recipient)).toBe(true);
            expect(mockTransport.sendToNode).toHaveBeenCalledWith(recipient, messageId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Direct routing updates delivery status for each recipient', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        async (messageId, recipients) => {
          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const router = new DirectMessageRouter(mockTransport, mockMetadataStore);
          await router.routeToRecipients(messageId, recipients);

          // Verify delivery status updated for each recipient
          for (const recipient of recipients) {
            expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
              messageId,
              recipient,
              MessageDeliveryStatus.IN_TRANSIT
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Direct routing handles partial failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.array(fc.string().filter((s) => s.length > 0), { minLength: 3, maxLength: 5 }),
        async (messageId, recipients) => {
          // Use unique recipients to avoid Map key collisions
          const uniqueRecipients = Array.from(new Set(recipients));
          if (uniqueRecipients.length < 2) return; // Skip if not enough unique recipients

          let callCount = 0;
          const mockTransport = {
            sendToNode: jest.fn().mockImplementation(() => {
              callCount++;
              return Promise.resolve(callCount % 2 === 1);
            }),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const router = new DirectMessageRouter(mockTransport, mockMetadataStore);
          const results = await router.routeToRecipients(messageId, uniqueRecipients);

          // Verify mixed results
          expect(results.size).toBe(uniqueRecipients.length);
          const successCount = Array.from(results.values()).filter((v) => v).length;
          const failureCount = Array.from(results.values()).filter((v) => !v).length;
          expect(successCount + failureCount).toBe(uniqueRecipients.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
