import { createServer, Server } from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from './webSocketMessageServer';

describe('WebSocketMessageServer', () => {
  let httpServer: Server;
  let wsServer: WebSocketMessageServer;
  let port: number;

  beforeEach(async () => {
    port = 8765 + Math.floor(Math.random() * 1000);
    httpServer = createServer();
    wsServer = new WebSocketMessageServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      wsServer.close(() => {
        httpServer.close(() => {
          setTimeout(resolve, 50);
        });
      });
    });
  });

  it('should accept WebSocket connections', async () => {
    const client = new WebSocket(`ws://localhost:${port}/test-node`);

    await new Promise<void>((resolve) => {
      client.on('open', () => resolve());
    });

    expect(wsServer.getConnectedNodes()).toContain('test-node');
    client.close();
  });

  it('should remove disconnected nodes', async () => {
    const client = new WebSocket(`ws://localhost:${port}/temp-node`);

    await new Promise<void>((resolve) => {
      client.on('open', () => resolve());
    });

    expect(wsServer.getConnectedNodes()).toContain('temp-node');

    await new Promise<void>((resolve) => {
      client.on('close', () => resolve());
      client.close();
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wsServer.getConnectedNodes()).not.toContain('temp-node');
  });

  it('should track multiple connected nodes', async () => {
    const client1 = new WebSocket(`ws://localhost:${port}/node1`);
    const client2 = new WebSocket(`ws://localhost:${port}/node2`);

    await Promise.all([
      new Promise<void>((resolve) => client1.on('open', () => resolve())),
      new Promise<void>((resolve) => client2.on('open', () => resolve())),
    ]);

    const connectedNodes = wsServer.getConnectedNodes();
    expect(connectedNodes).toContain('node1');
    expect(connectedNodes).toContain('node2');
    client1.close();
    client2.close();
  });

  it('should reject connections without a valid node ID', async () => {
    const client = new WebSocket(`ws://localhost:${port}/`);

    await new Promise<void>((resolve) => {
      client.on('close', () => resolve());
    });

    expect(wsServer.getConnectedNodes()).toHaveLength(0);
  });

  it('should close all connections on server close', async () => {
    const client = new WebSocket(`ws://localhost:${port}/test-node`);

    await new Promise<void>((resolve) => {
      client.on('open', () => resolve());
    });

    expect(wsServer.getConnectedNodes()).toContain('test-node');

    await new Promise<void>((resolve) => {
      wsServer.close(() => resolve());
    });

    expect(wsServer.getConnectedNodes()).toHaveLength(0);

    // Re-create for afterEach cleanup
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        httpServer = createServer();
        wsServer = new WebSocketMessageServer(httpServer);
        httpServer.listen(port, () => resolve());
      });
    });
  });
});
