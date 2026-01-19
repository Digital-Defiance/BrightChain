/**
 * Integration tests for WebSocket communication between
 * browser client (WebSocketTransport) and Node.js server (WebSocketMessageServer)
 */
import { createServer, Server as HttpServer } from 'http';
import { WebSocketTransport } from '@brightchain/brightchain-lib/lib/services/messaging/webSocketTransport';
import { WebSocketMessageServer } from './webSocketMessageServer';

describe('WebSocket Client-Server Integration', () => {
  let httpServer: HttpServer;
  let wsServer: WebSocketMessageServer;
  let wsClient: WebSocketTransport;
  const TEST_PORT = 8765;

  beforeEach((done) => {
    httpServer = createServer();
    wsServer = new WebSocketMessageServer(httpServer, false);
    httpServer.listen(TEST_PORT, () => {
      wsClient = new WebSocketTransport();
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

  it('should establish connection between client and server', async () => {
    const nodeId = 'test-node-1';
    
    await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    
    // Wait a bit for connection to be established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const connectedNodes = wsServer.getConnectedNodes();
    expect(connectedNodes).toContain(nodeId);
    
    wsClient.disconnect(nodeId);
  });

  it('should send message from server to client', async () => {
    const nodeId = 'test-node-2';
    const messageId = 'msg-123';
    
    let receivedMessage: any = null;
    wsClient.onMessage(nodeId, (data) => {
      receivedMessage = JSON.parse(data);
    });
    
    await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await wsServer.sendToNode(nodeId, messageId);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(receivedMessage).not.toBeNull();
    expect(receivedMessage.type).toBe('message');
    expect(receivedMessage.messageId).toBe(messageId);
    
    wsClient.disconnect(nodeId);
  });

  it('should send message from client to server', async () => {
    const nodeId = 'test-node-3';
    const messageId = 'msg-456';
    
    let receivedNodeId: string | null = null;
    let receivedMessageId: string | null = null;
    
    wsServer.onMessage(async (nId, mId) => {
      receivedNodeId = nId;
      receivedMessageId = mId;
    });
    
    await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await wsClient.sendToNode(nodeId, messageId);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(receivedNodeId).toBe(nodeId);
    expect(receivedMessageId).toBe(messageId);
    
    wsClient.disconnect(nodeId);
  });

  it('should handle acknowledgments between client and server', async () => {
    const nodeId = 'test-node-4';
    const messageId = 'msg-789';
    const status = 'DELIVERED';
    
    let receivedAck: any = null;
    wsClient.onMessage(nodeId, (data) => {
      const parsed = JSON.parse(data);
      if (parsed.type === 'ack') {
        receivedAck = parsed;
      }
    });
    
    await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Client sends ack to server
    await wsClient.sendAck(nodeId, messageId, status);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    wsClient.disconnect(nodeId);
  });

  it('should handle multiple concurrent connections', async () => {
    const nodeIds = ['node-1', 'node-2', 'node-3'];
    
    // Connect all clients
    for (const nodeId of nodeIds) {
      await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const connectedNodes = wsServer.getConnectedNodes();
    for (const nodeId of nodeIds) {
      expect(connectedNodes).toContain(nodeId);
    }
    
    // Disconnect all
    for (const nodeId of nodeIds) {
      wsClient.disconnect(nodeId);
    }
  });

  it('should detect when node is reachable', async () => {
    const nodeId = 'test-node-5';
    
    // Not connected yet
    expect(await wsClient.isNodeReachable(nodeId)).toBe(false);
    
    await wsClient.connect(nodeId, `ws://localhost:${TEST_PORT}/${nodeId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now connected
    expect(await wsClient.isNodeReachable(nodeId)).toBe(true);
    
    wsClient.disconnect(nodeId);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Disconnected
    expect(await wsClient.isNodeReachable(nodeId)).toBe(false);
  });
});
