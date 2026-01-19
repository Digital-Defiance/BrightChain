import fc from 'fast-check';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { DeliveryTimeoutService } from './deliveryTimeoutService';

/**
 * Property tests for delivery timeout and failure handling
 * Validates Requirement 10.5
 */
describe('Feature: message-passing-and-events, Property: Delivery Timeout and Failure', () => {
  /**
   * Property 27a: Delivery attempts are tracked correctly
   * For any message and recipient, tracking should increment attempt count
   */
  it('Property 27a: should track delivery attempts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        async (messageId, recipientId, numAttempts) => {
          const mockStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new DeliveryTimeoutService(mockStore);

          for (let i = 0; i < numAttempts; i++) {
            service.trackDeliveryAttempt(messageId, recipientId);
          }

          expect(service.getAttemptCount(messageId, recipientId)).toBe(
            numAttempts,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27b: Timeouts mark delivery as FAILED
   * After timeout period, delivery status should be updated to FAILED
   */
  it('Property 27b: should mark delivery as FAILED after timeout', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (messageId, recipientId) => {
        const mockStore = {
          updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IMessageMetadataStore>;

        const service = new DeliveryTimeoutService(mockStore, {
          timeoutMs: 50,
          checkIntervalMs: 25,
        });

        service.trackDeliveryAttempt(messageId, recipientId);
        service.start();

        await new Promise((resolve) => setTimeout(resolve, 100));

        service.stop();

        expect(mockStore.updateDeliveryStatus).toHaveBeenCalledWith(
          messageId,
          recipientId,
          MessageDeliveryStatus.FAILED,
        );
      }),
      { numRuns: 50 },
    );
  }, 10000);

  /**
   * Property 27c: Failure callback is invoked on timeout
   * When delivery times out, registered failure callback should be called
   */
  it('Property 27c: should invoke failure callback on timeout', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (messageId, recipientId) => {
        const mockStore = {
          updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IMessageMetadataStore>;

        const failureCallback = jest.fn();
        const service = new DeliveryTimeoutService(mockStore, {
          timeoutMs: 50,
          checkIntervalMs: 25,
        });

        service.onDeliveryFailure(failureCallback);
        service.trackDeliveryAttempt(messageId, recipientId);
        service.start();

        await new Promise((resolve) => setTimeout(resolve, 100));

        service.stop();

        expect(failureCallback).toHaveBeenCalledWith(messageId, recipientId);
      }),
      { numRuns: 50 },
    );
  }, 10000);

  /**
   * Property 27d: Cleared attempts do not timeout
   * If delivery attempt is cleared before timeout, no failure should occur
   */
  it('Property 27d: should not timeout if attempt is cleared', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (messageId, recipientId) => {
        const mockStore = {
          updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IMessageMetadataStore>;

        const service = new DeliveryTimeoutService(mockStore, {
          timeoutMs: 100,
          checkIntervalMs: 25,
        });

        service.trackDeliveryAttempt(messageId, recipientId);
        service.start();

        await new Promise((resolve) => setTimeout(resolve, 30));
        service.clearDeliveryAttempt(messageId, recipientId);

        await new Promise((resolve) => setTimeout(resolve, 100));

        service.stop();

        expect(mockStore.updateDeliveryStatus).not.toHaveBeenCalled();
      }),
      { numRuns: 50 },
    );
  }, 10000);

  /**
   * Property 27e: Multiple deliveries timeout independently
   * Each delivery should timeout independently based on its own timestamp
   */
  it('Property 27e: should handle multiple deliveries timing out independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(fc.uuid(), fc.uuid()), {
          minLength: 2,
          maxLength: 5,
        }),
        async (deliveries) => {
          const mockStore = {
            updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new DeliveryTimeoutService(mockStore, {
            timeoutMs: 50,
            checkIntervalMs: 25,
          });

          // Track all deliveries
          for (const [messageId, recipientId] of deliveries) {
            service.trackDeliveryAttempt(messageId, recipientId);
          }

          service.start();

          await new Promise((resolve) => setTimeout(resolve, 100));

          service.stop();

          // All should have timed out
          expect(mockStore.updateDeliveryStatus).toHaveBeenCalledTimes(
            deliveries.length,
          );

          for (const [messageId, recipientId] of deliveries) {
            expect(mockStore.updateDeliveryStatus).toHaveBeenCalledWith(
              messageId,
              recipientId,
              MessageDeliveryStatus.FAILED,
            );
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
