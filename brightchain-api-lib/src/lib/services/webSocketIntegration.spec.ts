/**
 * Integration tests for WebSocket server infrastructure.
 * Message-specific routing tests have been removed as part of the
 * unified gossip delivery migration (Requirement 9.9).
 * The WebSocketMessageServer now serves as gossip transport only.
 */
import { createServer, Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from './webSocketMessageServer';

describe('WebSocket Server Integration', () => {
  let httpServer: HttpServer;
  let wsServer: WebSocketMessageServer;
  const TEST_PORT = 8765 + Math.floor(Math.random() * 1000);

  beforeEach((done) => {
    httpServer = createServer();
    wsServer = new WebSocketMessageServer(httpServer, false);
    httpServer.listen(TEST_PORT, () => {
      done();
    });
  });

  afterEach((done) => {
    wsServer.close(() => {
      httpServer.close(() => {
        setTimeout(done, 100);
      });
    });
  });

  it('should establish connection and track node', async () => {
    const nodeId = 'test-node-1';
    const client = new WebSocket(`ws://localhost:${TEST_PORT}/${nodeId}`);

    await new Promise<void>((resolve) => {
      client.on('open', () => resolve());
    });

    // Wait a bit for connection to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    const connectedNodes = wsServer.getConnectedNodes();
    expect(connectedNodes).toContain(nodeId);

    client.close();
  });

  it('should handle multiple concurrent connections', async () => {
    const nodeIds = ['node-1', 'node-2', 'node-3'];
    const clients: WebSocket[] = [];

    // Connect all clients
    for (const nodeId of nodeIds) {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}/${nodeId}`);
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });
      clients.push(client);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const connectedNodes = wsServer.getConnectedNodes();
    for (const nodeId of nodeIds) {
      expect(connectedNodes).toContain(nodeId);
    }

    // Disconnect all
    for (const client of clients) {
      client.close();
    }
  });

  it('should remove node on disconnect', async () => {
    const nodeId = 'test-node-disconnect';
    const client = new WebSocket(`ws://localhost:${TEST_PORT}/${nodeId}`);

    await new Promise<void>((resolve) => {
      client.on('open', () => resolve());
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wsServer.getConnectedNodes()).toContain(nodeId);

    await new Promise<void>((resolve) => {
      client.on('close', () => resolve());
      client.close();
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wsServer.getConnectedNodes()).not.toContain(nodeId);
  });
});
