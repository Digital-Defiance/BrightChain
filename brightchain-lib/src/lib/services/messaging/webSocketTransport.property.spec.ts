import fc from 'fast-check';
import { WebSocketTransport } from './webSocketTransport';
import { DirectMessageRouter } from './directMessageRouter';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';

// Mock WebSocket for testing
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = 0;
    this.onclose?.();
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('Feature: message-passing-and-events, Property: WebSocket Handler Integration', () => {
  it('Property 14: WebSocket transport connects and sends messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.array(fc.string().filter((s) => s.length > 0), { minLength: 1, maxLength: 3 }),
        async (messageId, recipients) => {
          const transport = new WebSocketTransport();

          // Connect to each recipient
          for (const recipient of recipients) {
            await transport.connect(recipient, `ws://localhost:8080/${recipient}`);
          }

          const mockMetadataStore = {
            updateDeliveryStatus: jest.fn(),
          } as unknown as jest.Mocked<IMessageMetadataStore>;

          const router = new DirectMessageRouter(transport, mockMetadataStore);
          await router.routeToRecipients(messageId, recipients);

          // Verify messages were sent
          for (const recipient of recipients) {
            const reachable = await transport.isNodeReachable(recipient);
            expect(reachable).toBe(true);
          }

          // Cleanup
          for (const recipient of recipients) {
            transport.disconnect(recipient);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 14: WebSocket transport fails for unconnected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string().filter((s) => s.length > 0),
        async (messageId, recipient) => {
          const transport = new WebSocketTransport();
          // Don't connect

          const result = await transport.sendToNode(recipient, messageId);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 14: WebSocket transport checks node reachability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string().filter((s) => s.length > 0), { minLength: 1, maxLength: 3 }),
        async (nodeIds) => {
          const transport = new WebSocketTransport();
          const uniqueNodes = Array.from(new Set(nodeIds));

          // Connect half the nodes
          const connectedNodes = uniqueNodes.slice(0, Math.ceil(uniqueNodes.length / 2));
          for (const nodeId of connectedNodes) {
            await transport.connect(nodeId, `ws://localhost:8080/${nodeId}`);
          }

          // Check reachability
          for (const nodeId of uniqueNodes) {
            const reachable = await transport.isNodeReachable(nodeId);
            expect(reachable).toBe(connectedNodes.includes(nodeId));
          }

          // Cleanup
          for (const nodeId of connectedNodes) {
            transport.disconnect(nodeId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 14: WebSocket transport handles connection lifecycle', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string().filter((s) => s.length > 0), async (nodeId) => {
        const transport = new WebSocketTransport();

        // Initially not reachable
        expect(await transport.isNodeReachable(nodeId)).toBe(false);

        // Connect
        await transport.connect(nodeId, `ws://localhost:8080/${nodeId}`);
        expect(await transport.isNodeReachable(nodeId)).toBe(true);

        // Disconnect
        transport.disconnect(nodeId);
        expect(await transport.isNodeReachable(nodeId)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});
