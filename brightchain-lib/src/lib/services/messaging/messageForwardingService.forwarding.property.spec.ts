import fc from 'fast-check';
import { MessageForwardingService } from './messageForwardingService';
import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';

describe('Feature: message-passing-and-events, Property: Message Forwarding', () => {
  /**
   * Property 15a: Message forwarding uses intermediate nodes
   * For any message, recipient, and intermediate node, forwarding should
   * send the message to the intermediate node and update delivery status
   */
  it('Property 15a: should forward messages through intermediate nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        fc.string(),
        async (messageId, recipientId, intermediateNodeId, currentNodeId) => {
          fc.pre(intermediateNodeId !== currentNodeId);

          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new MessageForwardingService(
            mockTransport,
            mockMetadataStore,
            currentNodeId
          );

          const result = await service.forwardMessage(
            messageId,
            recipientId,
            intermediateNodeId
          );

          expect(result).toBe(true);
          expect(mockTransport.sendToNode).toHaveBeenCalledWith(
            intermediateNodeId,
            messageId
          );
          expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
            messageId,
            recipientId,
            MessageDeliveryStatus.IN_TRANSIT
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15b: Loop detection prevents forwarding to same node
   * Forwarding should detect and prevent loops when the same node
   * appears multiple times in the forwarding path
   */
  it('Property 15b: should detect and prevent forwarding loops', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        async (messageId, recipientId, nodeId) => {
          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new MessageForwardingService(
            mockTransport,
            mockMetadataStore,
            'current-node'
          );

          // First forward should succeed
          const result1 = await service.forwardMessage(messageId, recipientId, nodeId);
          expect(result1).toBe(true);

          // Second forward to same node should fail (loop detected)
          const result2 = await service.forwardMessage(messageId, recipientId, nodeId);
          expect(result2).toBe(false);

          // Transport should only be called once
          expect(mockTransport.sendToNode).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15c: Forwarding to self is prevented
   * The service should detect when trying to forward to the current node
   * and reject it to prevent loops
   */
  it('Property 15c: should prevent forwarding to self', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        async (messageId, recipientId, currentNodeId) => {
          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new MessageForwardingService(
            mockTransport,
            mockMetadataStore,
            currentNodeId
          );

          const result = await service.forwardMessage(
            messageId,
            recipientId,
            currentNodeId
          );

          expect(result).toBe(false);
          expect(mockTransport.sendToNode).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15d: Failed forwarding updates delivery status
   * When forwarding fails, the delivery status should be updated to FAILED
   */
  it('Property 15d: should update status to FAILED when forwarding fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        fc.string(),
        async (messageId, recipientId, intermediateNodeId, currentNodeId) => {
          fc.pre(intermediateNodeId !== currentNodeId);

          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(false),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new MessageForwardingService(
            mockTransport,
            mockMetadataStore,
            currentNodeId
          );

          const result = await service.forwardMessage(
            messageId,
            recipientId,
            intermediateNodeId
          );

          expect(result).toBe(false);
          expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
            messageId,
            recipientId,
            MessageDeliveryStatus.FAILED
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 15e: Path clearing allows re-forwarding
   * After clearing the forwarding path, the same node can be used again
   */
  it('Property 15e: should allow re-forwarding after path is cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        async (messageId, recipientId, nodeId) => {
          const mockTransport = {
            sendToNode: jest.fn().mockResolvedValue(true),
            isNodeReachable: jest.fn(),
          } as jest.Mocked<INetworkTransport>;

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const service = new MessageForwardingService(
            mockTransport,
            mockMetadataStore,
            'current-node'
          );

          // First forward
          const result1 = await service.forwardMessage(messageId, recipientId, nodeId);
          expect(result1).toBe(true);

          // Clear path
          service.clearPath(messageId);

          // Second forward should succeed after clearing
          const result2 = await service.forwardMessage(messageId, recipientId, nodeId);
          expect(result2).toBe(true);

          // Transport should be called twice
          expect(mockTransport.sendToNode).toHaveBeenCalledTimes(2);
        }
      ),
      { numRuns: 50 }
    );
  });
});
