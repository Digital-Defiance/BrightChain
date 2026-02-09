import * as fc from 'fast-check';
import { createServer, Server } from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from './webSocketMessageServer';

/**
 * Property-based tests for WebSocketMessageServer
 * Tests retained WebSocket server infrastructure for gossip transport.
 * Message-specific methods (sendToNode, broadcast, onMessage, onAck) have been
 * removed in favor of gossip-based delivery (Requirement 9.9).
 */
describe('WebSocketMessageServer - Property Tests', () => {
  let httpServer: Server;
  let wsServer: WebSocketMessageServer;
  let port: number;

  beforeEach((done) => {
    port = 8766 + Math.floor(Math.random() * 1000);
    httpServer = createServer();
    wsServer = new WebSocketMessageServer(httpServer);
    httpServer.listen(port, done);
  });

  afterEach((done) => {
    // Close all connections first
    const connectedNodes = wsServer.getConnectedNodes();
    if (connectedNodes.length > 0) {
      // Force close all connections
      wsServer.close(() => {
        httpServer.close(() => {
          setTimeout(done, 200); // Increased timeout
        });
      });
    } else {
      wsServer.close(() => {
        httpServer.close(() => {
          setTimeout(done, 100);
        });
      });
    }
  });

  /**
   * Property: WebSocket transport checks node reachability
   * The server should accurately track which nodes are connected
   */
  it('should accurately track connected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 32 })
            .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
          { minLength: 1, maxLength: 5 },
        ),
        async (nodeIds: string[]) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          const clients: WebSocket[] = [];

          // Connect all clients with proper waiting
          for (const nodeId of uniqueNodeIds) {
            const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);
            await new Promise<void>((resolve) => {
              client.on('open', () => {
                setTimeout(resolve, 10);
              });
            });
            clients.push(client);
          }

          // Wait for all connections to be registered
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Verify all nodes are tracked
          const connectedNodes = wsServer.getConnectedNodes();
          expect(connectedNodes.sort()).toEqual(uniqueNodeIds.sort());

          // Clean up clients
          for (const client of clients) {
            client.close();
          }

          // Wait for cleanup
          await new Promise((resolve) => setTimeout(resolve, 50));
        },
      ),
      { numRuns: 15 },
    );
  });

  /**
   * Property: WebSocket transport handles connection lifecycle
   * Nodes should be removed from tracking when they disconnect
   */
  it('should handle connection lifecycle correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
        async (nodeId: string) => {
          const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);

          await new Promise<void>((resolve) => {
            client.on('open', () => resolve());
          });

          expect(wsServer.getConnectedNodes()).toContain(nodeId);

          await new Promise<void>((resolve) => {
            client.on('close', () => resolve());
            client.close();
          });

          await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
          });

          expect(wsServer.getConnectedNodes()).not.toContain(nodeId);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Invalid connections are rejected
   * Connections without a valid node ID should be rejected
   */
  it('should reject connections without node ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/', '', '//'),
        async (invalidPath: string) => {
          const client = new WebSocket(`ws://localhost:${port}${invalidPath}`);

          const closePromise = new Promise<void>((resolve) => {
            client.on('close', () => resolve());
          });

          await closePromise;

          expect(wsServer.getConnectedNodes()).toHaveLength(0);
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property: Concurrent connections are handled correctly
   * Multiple simultaneous connections should all be tracked
   */
  it('should handle concurrent connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 32 })
            .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
          { minLength: 3, maxLength: 6 },
        ),
        async (nodeIds: string[]) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          const clients: WebSocket[] = [];

          // Connect all clients concurrently
          await Promise.all(
            uniqueNodeIds.map((nodeId) => {
              return new Promise<void>((resolve) => {
                const client = new WebSocket(
                  `ws://localhost:${port}/${nodeId}`,
                );
                client.on('open', () => {
                  clients.push(client);
                  setTimeout(resolve, 10);
                });
              });
            }),
          );

          // Wait for all connections to be registered
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify all nodes are connected
          const connectedNodes = wsServer.getConnectedNodes();
          expect(connectedNodes.length).toBe(uniqueNodeIds.length);

          // Clean up concurrent clients
          for (const client of clients) {
            client.close();
          }

          // Wait for cleanup
          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      ),
      { numRuns: 10 },
    );
  });
});
