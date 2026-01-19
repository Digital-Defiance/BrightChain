import fc from 'fast-check';
import { WebSocketTransport } from './webSocketTransport';

// Helper to access private connections property for testing
function getConnections(transport: WebSocketTransport): Map<string, unknown> {
  return (transport as any).connections;
}

/**
 * Property tests for message acknowledgment
 * Validates Requirements 10.1, 10.2
 */
describe('Feature: message-passing-and-events, Property: Message Acknowledgment', () => {
  /**
   * Property 25a: Acknowledgment sending succeeds for connected nodes
   * For any message ID and status, sendAck should succeed when node is connected
   */
  it('Property 25a: should send acknowledgments for connected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.constantFrom('DELIVERED', 'RECEIVED', 'FAILED'),
        async (recipientId, messageId, status) => {
          const transport = new WebSocketTransport();

          // Mock WebSocket connection
          const mockWs = {
            readyState: 1, // OPEN
            send: jest.fn(),
          };

          // Inject mock connection
          getConnections(transport).set(recipientId, mockWs);

          const result = await transport.sendAck(
            recipientId,
            messageId,
            status,
          );

          expect(result).toBe(true);
          expect(mockWs.send).toHaveBeenCalledWith(
            JSON.stringify({ type: 'ack', messageId, status }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 25b: Acknowledgment sending fails for unconnected nodes
   * sendAck should return false when node is not connected
   */
  it('Property 25b: should fail to send acknowledgments for unconnected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.constantFrom('DELIVERED', 'RECEIVED', 'FAILED'),
        async (recipientId, messageId, status) => {
          const transport = new WebSocketTransport();

          const result = await transport.sendAck(
            recipientId,
            messageId,
            status,
          );

          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 25c: Acknowledgment includes correct message ID and status
   * The acknowledgment message should contain the provided messageId and status
   */
  it('Property 25c: should include correct messageId and status in acknowledgment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.uuid(),
        fc.constantFrom('DELIVERED', 'RECEIVED', 'FAILED'),
        async (recipientId, messageId, status) => {
          const transport = new WebSocketTransport();

          const mockWs = {
            readyState: 1,
            send: jest.fn(),
          };

          (transport as any).connections.set(recipientId, mockWs);

          await transport.sendAck(recipientId, messageId, status);

          const sentData = mockWs.send.mock.calls[0][0];
          const parsed = JSON.parse(sentData);

          expect(parsed.type).toBe('ack');
          expect(parsed.messageId).toBe(messageId);
          expect(parsed.status).toBe(status);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 25d: Acknowledgment fails for closed connections
   * sendAck should return false when WebSocket is not in OPEN state
   */
  it('Property 25d: should fail for closed connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.constantFrom('DELIVERED', 'RECEIVED', 'FAILED'),
        fc.constantFrom(0, 2, 3), // CONNECTING, CLOSING, CLOSED
        async (recipientId, messageId, status, readyState) => {
          const transport = new WebSocketTransport();

          const mockWs = {
            readyState,
            send: jest.fn(),
          };

          getConnections(transport).set(recipientId, mockWs);

          const result = await transport.sendAck(
            recipientId,
            messageId,
            status,
          );

          expect(result).toBe(false);
          expect(mockWs.send).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 25e: Multiple acknowledgments can be sent independently
   * Each acknowledgment should be sent independently without interference
   */
  it('Property 25e: should send multiple acknowledgments independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 32 }),
            fc.string({ minLength: 1, maxLength: 32 }),
            fc.constantFrom('DELIVERED', 'RECEIVED', 'FAILED'),
          ),
          { minLength: 2, maxLength: 5 },
        ),
        async (acks) => {
          const transport = new WebSocketTransport();
          const mockConnections = new Map();

          // Setup mock connections
          for (const [recipientId] of acks) {
            if (!mockConnections.has(recipientId)) {
              const mockWs = {
                readyState: 1,
                send: jest.fn(),
              };
              mockConnections.set(recipientId, mockWs);
              getConnections(transport).set(recipientId, mockWs);
            }
          }

          // Send all acknowledgments
          const results = await Promise.all(
            acks.map(([recipientId, messageId, status]) =>
              transport.sendAck(recipientId, messageId, status),
            ),
          );

          // All should succeed
          expect(results.every((r) => r === true)).toBe(true);

          // Verify each was sent
          for (const [recipientId, messageId, status] of acks) {
            const mockWs = mockConnections.get(recipientId);
            expect(mockWs.send).toHaveBeenCalledWith(
              JSON.stringify({ type: 'ack', messageId, status }),
            );
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
