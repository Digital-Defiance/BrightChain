import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EciesSignature, EciesCryptoCore } from '@digitaldefiance/node-ecies-lib';

/**
 * WebSocket message handler callback
 */
export type MessageHandler = (nodeId: string, messageId: string) => Promise<void>;
export type AckHandler = (nodeId: string, messageId: string, status: string) => Promise<void>;

/**
 * Node.js WebSocket server for message passing with ECIES authentication
 * Manages WebSocket connections and routes messages between nodes
 */
export class WebSocketMessageServer {
  private wss: WebSocketServer;
  private connections = new Map<string, WebSocket>();
  private authenticatedNodes = new Map<string, string>(); // ws -> nodeId
  private publicKeys = new Map<string, Buffer>(); // nodeId -> publicKey
  private messageHandler?: MessageHandler;
  private ackHandler?: AckHandler;
  private eciesSignature: EciesSignature;
  private requireAuth: boolean;

  constructor(server: Server, requireAuth = false) {
    this.wss = new WebSocketServer({ server });
    this.requireAuth = requireAuth;
    const config = { enableCompression: false };
    const cryptoCore = new EciesCryptoCore(config as any);
    this.eciesSignature = new EciesSignature(cryptoCore);
    this.setupConnectionHandler();
  }

  /**
   * Register public key for a node
   */
  registerNodeKey(nodeId: string, publicKey: Buffer): void {
    this.publicKeys.set(nodeId, publicKey);
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Register acknowledgment handler
   */
  onAck(handler: AckHandler): void {
    this.ackHandler = handler;
  }

  /**
   * Send message to specific node
   */
  async sendToNode(nodeId: string, messageId: string): Promise<boolean> {
    const ws = this.connections.get(nodeId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify({ type: 'message', messageId }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast message to all connected nodes
   */
  broadcast(messageId: string): void {
    const message = JSON.stringify({ type: 'message', messageId });
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Get connected node IDs
   */
  getConnectedNodes(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections and shutdown server
   */
  close(callback?: () => void): void {
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();
    this.authenticatedNodes.clear();
    if (callback) {
      this.wss.close(callback);
    } else {
      this.wss.close();
    }
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const nodeId = this.extractNodeId(req.url);
      if (!nodeId) {
        ws.close();
        return;
      }

      let authenticated = !this.requireAuth;
      
      if (!this.requireAuth) {
        this.connections.set(nodeId, ws);
        this.authenticatedNodes.set(ws as any, nodeId);
      }

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth') {
            const publicKey = this.publicKeys.get(message.nodeId);
            if (publicKey && await this.verifySignature(message.nodeId, message.timestamp, message.signature, publicKey)) {
              authenticated = true;
              this.connections.set(message.nodeId, ws);
              this.authenticatedNodes.set(ws as any, message.nodeId);
              ws.send(JSON.stringify({ type: 'auth_success' }));
            } else {
              ws.close();
            }
            return;
          }

          if (!authenticated) {
            ws.close();
            return;
          }

          if (message.type === 'message' && this.messageHandler) {
            await this.messageHandler(nodeId, message.messageId);
          } else if (message.type === 'ack' && this.ackHandler) {
            await this.ackHandler(nodeId, message.messageId, message.status);
          }
        } catch {
          // Invalid message format
        }
      });

      ws.on('close', () => {
        const authenticatedNodeId = this.authenticatedNodes.get(ws as any);
        if (authenticatedNodeId) {
          this.connections.delete(authenticatedNodeId);
          this.authenticatedNodes.delete(ws as any);
        }
      });
    });
  }

  private async verifySignature(nodeId: string, timestamp: string, signature: string, publicKey: Buffer): Promise<boolean> {
    try {
      const message = Buffer.from(`${nodeId}:${timestamp}`);
      const signatureBuffer = Buffer.from(signature, 'hex');
      return this.eciesSignature.verifyMessage(publicKey, message, signatureBuffer as any);
    } catch {
      return false;
    }
  }

  private extractNodeId(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/\/([^/?]+)/);
    return match ? match[1] : null;
  }
}
