import * as fc from 'fast-check';
import { createServer, Server } from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from './webSocketMessageServer';

/**
 * Property-based tests for WebSocketMessageServer
 * Validates Requirements 4.4: WebSocket handler integration
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
   * Property 14a: WebSocket transport connects and sends messages
   * For any valid node ID and message ID, the server should accept connections
   * and successfully deliver messages to connected nodes
   */
  it('Property 14a: should connect and send messages for any valid node/message IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
        fc.uuid(),
        async (nodeId: string, messageId: string) => {
          const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);

          const messagePromise = new Promise<string>((resolve) => {
            client.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              resolve(msg.messageId);
            });
          });

          await new Promise<void>((resolve) => {
            client.on('open', () => resolve());
          });

          const sent = await wsServer.sendToNode(nodeId, messageId);
          expect(sent).toBe(true);

          const receivedMessageId = await messagePromise;
          expect(receivedMessageId).toBe(messageId);

          client.close();
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 14b: WebSocket transport fails for unconnected nodes
   * Attempting to send to a node that is not connected should return false
   */
  it('Property 14b: should fail to send messages to unconnected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
        fc.uuid(),
        async (nodeId: string, messageId: string) => {
          const sent = await wsServer.sendToNode(nodeId, messageId);
          expect(sent).toBe(false);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 14c: WebSocket transport checks node reachability
   * The server should accurately track which nodes are connected
   */
  it('Property 14c: should accurately track connected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 32 })
            .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
          { minLength: 1, maxLength: 5 }, // Reduced max to avoid flakiness
        ),
        async (nodeIds: string[]) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          const clients: WebSocket[] = [];

          // Connect all clients with proper waiting
          for (const nodeId of uniqueNodeIds) {
            const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);
            await new Promise<void>((resolve) => {
              client.on('open', () => {
                setTimeout(resolve, 10); // Small delay for server to register
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
   * Property 14d: WebSocket transport handles connection lifecycle
   * Nodes should be removed from tracking when they disconnect
   */
  it('Property 14d: should handle connection lifecycle correctly', async () => {
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
   * Property 14e: Broadcast delivers to all connected nodes
   * Broadcasting a message should deliver it to all currently connected nodes
   */
  it('Property 14e: should broadcast messages to all connected nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 32 })
            .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
          { minLength: 2, maxLength: 4 }, // Reduced max for stability
        ),
        fc.uuid(),
        async (nodeIds: string[], messageId: string) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          if (uniqueNodeIds.length < 2) return; // Skip if not enough unique nodes

          const clients: WebSocket[] = [];
          const receivedMessages: string[] = [];

          // Connect all clients with message handlers
          for (const nodeId of uniqueNodeIds) {
            const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);

            client.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              receivedMessages.push(msg.messageId);
            });

            await new Promise<void>((resolve) => {
              client.on('open', () => {
                setTimeout(resolve, 10); // Small delay for server registration
              });
            });

            clients.push(client);
          }

          // Wait for all connections to be fully established
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Broadcast message
          wsServer.broadcast(messageId);

          // Wait for all messages to be received with longer timeout
          await new Promise<void>((resolve) => {
            const checkMessages = () => {
              if (receivedMessages.length >= uniqueNodeIds.length) {
                resolve();
              } else {
                setTimeout(checkMessages, 10);
              }
            };
            setTimeout(checkMessages, 50);
          });

          // Verify all nodes received the message
          expect(receivedMessages.length).toBe(uniqueNodeIds.length);
          expect(receivedMessages.every((id) => id === messageId)).toBe(true);

          // Clean up broadcast clients
          for (const client of clients) {
            client.close();
          }

          // Wait for cleanup
          await new Promise((resolve) => setTimeout(resolve, 50));
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property 14f: Message handler receives all incoming messages
   * The registered message handler should be called for every message received
   */
  it('Property 14f: should invoke message handler for all incoming messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (nodeId: string, messageIds: string[]) => {
          const receivedMessages: Array<{ nodeId: string; messageId: string }> =
            [];

          wsServer.onMessage(async (nId, mId) => {
            receivedMessages.push({ nodeId: nId, messageId: mId });
          });

          const client = new WebSocket(`ws://localhost:${port}/${nodeId}`);

          await new Promise<void>((resolve) => {
            client.on('open', () => resolve());
          });

          // Send all messages
          for (const messageId of messageIds) {
            client.send(JSON.stringify({ type: 'message', messageId }));
          }

          // Wait for all messages to be processed
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 100);
          });

          // Verify all messages were received
          expect(receivedMessages.length).toBe(messageIds.length);
          for (let i = 0; i < messageIds.length; i++) {
            expect(receivedMessages[i].nodeId).toBe(nodeId);
            expect(receivedMessages[i].messageId).toBe(messageIds[i]);
          }

          client.close();
        },
      ),
      { numRuns: 15 },
    );
  });

  /**
   * Property 14g: Invalid connections are rejected
   * Connections without a valid node ID should be rejected
   */
  it('Property 14g: should reject connections without node ID', async () => {
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
   * Property 14h: Concurrent connections are handled correctly
   * Multiple simultaneous connections should all be tracked and functional
   */
  it('Property 14h: should handle concurrent connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            fc
              .string({ minLength: 1, maxLength: 32 })
              .filter((s) => /^[a-z0-9_-]+$/i.test(s)),
            fc.uuid(),
          ),
          { minLength: 3, maxLength: 6 }, // Reduced max
        ),
        async (nodeMessagePairs: Array<[string, string]>) => {
          const uniquePairs = Array.from(
            new Map(
              nodeMessagePairs.map(([nodeId, messageId]) => [
                nodeId,
                messageId,
              ]),
            ).entries(),
          );

          const clients: Array<{
            client: WebSocket;
            nodeId: string;
            messageId: string;
          }> = [];

          // Connect all clients concurrently
          await Promise.all(
            uniquePairs.map(([nodeId, messageId]) => {
              return new Promise<void>((resolve) => {
                const client = new WebSocket(
                  `ws://localhost:${port}/${nodeId}`,
                );
                client.on('open', () => {
                  clients.push({ client, nodeId, messageId });
                  setTimeout(resolve, 10); // Small delay
                });
              });
            }),
          );

          // Wait for all connections to be registered
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify all nodes are connected
          const connectedNodes = wsServer.getConnectedNodes();
          expect(connectedNodes.length).toBe(uniquePairs.length);

          // Send messages to all nodes concurrently
          const sendResults = await Promise.all(
            uniquePairs.map(([nodeId, messageId]) =>
              wsServer.sendToNode(nodeId, messageId),
            ),
          );

          // All sends should succeed
          expect(sendResults.every((result) => result === true)).toBe(true);

          // Clean up concurrent clients
          for (const { client } of clients) {
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
