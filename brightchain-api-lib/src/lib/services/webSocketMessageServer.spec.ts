import { createServer, Server } from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from './webSocketMessageServer';

describe('WebSocketMessageServer', () => {
  let httpServer: Server;
  let wsServer: WebSocketMessageServer;
  let port: number;

  beforeEach((done) => {
    port = 8765 + Math.floor(Math.random() * 1000);
    httpServer = createServer();
    wsServer = new WebSocketMessageServer(httpServer);
    httpServer.listen(port, done);
  });

  afterEach((done) => {
    wsServer.close(() => {
      httpServer.close(() => {
        setTimeout(done, 50);
      });
    });
  });

  it('should accept WebSocket connections', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/test-node`);

    client.on('open', () => {
      expect(wsServer.getConnectedNodes()).toContain('test-node');
      client.close();
      done();
    });
  });

  it('should remove disconnected nodes', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/temp-node`);

    client.on('open', () => {
      expect(wsServer.getConnectedNodes()).toContain('temp-node');
      client.close();
    });

    client.on('close', () => {
      setTimeout(() => {
        expect(wsServer.getConnectedNodes()).not.toContain('temp-node');
        done();
      }, 100);
    });
  });

  it('should track multiple connected nodes', (done) => {
    const client1 = new WebSocket(`ws://localhost:${port}/node1`);
    const client2 = new WebSocket(`ws://localhost:${port}/node2`);
    let openCount = 0;

    const checkConnections = () => {
      openCount++;
      if (openCount === 2) {
        const connectedNodes = wsServer.getConnectedNodes();
        expect(connectedNodes).toContain('node1');
        expect(connectedNodes).toContain('node2');
        client1.close();
        client2.close();
        done();
      }
    };

    client1.on('open', checkConnections);
    client2.on('open', checkConnections);
  });

  it('should reject connections without a valid node ID', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/`);

    client.on('close', () => {
      expect(wsServer.getConnectedNodes()).toHaveLength(0);
      done();
    });
  });

  it('should close all connections on server close', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/test-node`);

    client.on('open', () => {
      expect(wsServer.getConnectedNodes()).toContain('test-node');
      wsServer.close(() => {
        // After close, connections should be cleared
        expect(wsServer.getConnectedNodes()).toHaveLength(0);
        httpServer.close(() => {
          // Re-create for afterEach cleanup
          httpServer = createServer();
          wsServer = new WebSocketMessageServer(httpServer);
          httpServer.listen(port, done);
        });
      });
    });
  });
});
