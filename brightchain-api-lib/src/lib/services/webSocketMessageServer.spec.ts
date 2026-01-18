import { WebSocketMessageServer } from './webSocketMessageServer';
import { createServer, Server } from 'http';
import { WebSocket } from 'ws';

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

  it('should send messages to specific nodes', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/node1`);

    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('message');
      expect(message.messageId).toBe('msg1');
      client.close();
      done();
    });

    client.on('open', async () => {
      await wsServer.sendToNode('node1', 'msg1');
    });
  });

  it('should broadcast messages to all connected nodes', (done) => {
    const client1 = new WebSocket(`ws://localhost:${port}/node1`);
    const client2 = new WebSocket(`ws://localhost:${port}/node2`);
    let receivedCount = 0;

    const checkDone = () => {
      receivedCount++;
      if (receivedCount === 2) {
        client1.close();
        client2.close();
        done();
      }
    };

    client1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.messageId).toBe('broadcast-msg');
      checkDone();
    });

    client2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.messageId).toBe('broadcast-msg');
      checkDone();
    });

    let openCount = 0;
    const checkBroadcast = () => {
      openCount++;
      if (openCount === 2) {
        wsServer.broadcast('broadcast-msg');
      }
    };

    client1.on('open', checkBroadcast);
    client2.on('open', checkBroadcast);
  });

  it('should handle incoming messages', (done) => {
    const client = new WebSocket(`ws://localhost:${port}/sender-node`);

    wsServer.onMessage(async (nodeId, messageId) => {
      expect(nodeId).toBe('sender-node');
      expect(messageId).toBe('incoming-msg');
      client.close();
      done();
    });

    client.on('open', () => {
      client.send(JSON.stringify({ type: 'message', messageId: 'incoming-msg' }));
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
});
