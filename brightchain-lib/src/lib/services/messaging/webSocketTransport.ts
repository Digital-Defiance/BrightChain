import { ECIESService } from '@digitaldefiance/ecies-lib';
import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { SystemKeyring } from '../../systemKeyring';
import { EciesConfig } from '../../ecies-config';

/**
 * Browser-compatible WebSocket network transport for message transmission
 * Uses native browser WebSocket API with ECIES authentication
 */
export class WebSocketTransport implements INetworkTransport {
  private connections = new Map<string, WebSocket>();
  private messageHandlers = new Map<string, (data: string) => void>();
  private keyring: SystemKeyring;
  private eciesService: ECIESService;

  constructor() {
    this.keyring = SystemKeyring.getInstance();
    this.eciesService = new ECIESService(EciesConfig);
  }

  /**
   * Connect to a node via WebSocket with authentication
   * @param nodeId Node identifier
   * @param url WebSocket URL (e.g., ws://localhost:8080)
   * @param password Password to unlock system key
   */
  async connect(nodeId: string, url: string, password?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.onopen = async () => {
        try {
          if (password) {
            const keyData = await this.keyring.retrieveKey('system', password);
            const timestamp = Date.now().toString();
            const message = new Uint8Array(
              Buffer.from(`${nodeId}:${timestamp}`),
            );
            const signature = this.eciesService.signMessage(keyData, message);
            const sigHex =
              this.eciesService.signatureBufferToSignatureString(signature);

            ws.send(
              JSON.stringify({
                type: 'auth',
                nodeId,
                timestamp,
                signature: sigHex,
              }),
            );
          }
          this.connections.set(nodeId, ws);
          resolve();
        } catch (err) {
          ws.close();
          reject(err);
        }
      };

      ws.onerror = (err) => {
        reject(err);
      };

      ws.onmessage = (event) => {
        const handler = this.messageHandlers.get(nodeId);
        if (handler) {
          handler(event.data);
        }
      };

      ws.onclose = () => {
        this.connections.delete(nodeId);
      };
    });
  }

  /**
   * Disconnect from a node
   */
  disconnect(nodeId: string): void {
    const ws = this.connections.get(nodeId);
    if (ws) {
      ws.close();
      this.connections.delete(nodeId);
    }
  }

  /**
   * Register message handler for a node
   */
  onMessage(nodeId: string, handler: (data: string) => void): void {
    this.messageHandlers.set(nodeId, handler);
  }

  async sendToNode(recipientId: string, messageId: string): Promise<boolean> {
    const ws = this.connections.get(recipientId);
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
   * Send acknowledgment for received message
   */
  async sendAck(
    recipientId: string,
    messageId: string,
    status: string,
  ): Promise<boolean> {
    const ws = this.connections.get(recipientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify({ type: 'ack', messageId, status }));
      return true;
    } catch {
      return false;
    }
  }

  async isNodeReachable(nodeId: string): Promise<boolean> {
    const ws = this.connections.get(nodeId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
}
