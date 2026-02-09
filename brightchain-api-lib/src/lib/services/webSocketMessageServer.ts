import { BlockAnnouncement } from '@brightchain/brightchain-lib';
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService, SignatureBuffer } from '@digitaldefiance/node-ecies-lib';
import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import type { EncryptedBatchPayload } from '../availability/gossipService';

/**
 * Handler for incoming gossip announcement batches.
 * Called when a peer sends a batch of BlockAnnouncements over WebSocket.
 */
export type GossipBatchHandler = (
  fromNodeId: string,
  announcements: BlockAnnouncement[],
  encrypted?: EncryptedBatchPayload,
) => void;

/**
 * Node.js WebSocket server for gossip transport with ECIES authentication
 * Manages WebSocket connections between nodes.
 * Gossip announcement batches are received and dispatched to registered handlers.
 */
export class WebSocketMessageServer {
  private wss: WebSocketServer;
  private connections = new Map<string, WebSocket>();
  private authenticatedNodes = new Map<string, string>(); // ws -> nodeId
  private publicKeys = new Map<string, Buffer>(); // nodeId -> publicKey
  private eciesService: ECIESService;
  private requireAuth: boolean;
  private gossipBatchHandlers: Set<GossipBatchHandler> = new Set();

  constructor(server: Server, requireAuth = false) {
    this.wss = new WebSocketServer({ server });
    this.requireAuth = requireAuth;

    // Create Node.js-compatible ECIES config with full algorithm name
    const config: IECIESConfig = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/0'/0'/0/0",
      mnemonicStrength: 256,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };

    this.eciesService = new ECIESService(config);
    this.setupConnectionHandler();
  }

  /**
   * Register public key for a node
   */
  registerNodeKey(nodeId: string, publicKey: Buffer): void {
    this.publicKeys.set(nodeId, publicKey);
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
    this.gossipBatchHandlers.clear();
    if (callback) {
      this.wss.close(callback);
    } else {
      this.wss.close();
    }
  }

  /**
   * Register a handler for incoming gossip announcement batches.
   * The handler is called when a peer sends a 'gossip_batch' message.
   */
  onGossipBatch(handler: GossipBatchHandler): void {
    this.gossipBatchHandlers.add(handler);
  }

  /**
   * Remove a gossip batch handler.
   */
  offGossipBatch(handler: GossipBatchHandler): void {
    this.gossipBatchHandlers.delete(handler);
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
        this.authenticatedNodes.set(ws as unknown as string, nodeId);
      }

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'auth') {
            const publicKey = this.publicKeys.get(message.nodeId);
            if (
              publicKey &&
              (await this.verifySignature(
                message.nodeId,
                message.timestamp,
                message.signature,
                publicKey,
              ))
            ) {
              authenticated = true;
              this.connections.set(message.nodeId, ws);
              this.authenticatedNodes.set(
                ws as unknown as string,
                message.nodeId,
              );
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

          // Handle gossip announcement batches from peers
          if (message.type === 'gossip_batch') {
            const senderNodeId =
              this.authenticatedNodes.get(ws as unknown as string) ?? nodeId;
            for (const handler of this.gossipBatchHandlers) {
              try {
                handler(
                  senderNodeId,
                  message.announcements ?? [],
                  message.encrypted,
                );
              } catch {
                // Ignore handler errors
              }
            }
            return;
          }
        } catch {
          // Invalid message format
        }
      });

      ws.on('close', () => {
        const authenticatedNodeId = this.authenticatedNodes.get(
          ws as unknown as string,
        );
        if (authenticatedNodeId) {
          this.connections.delete(authenticatedNodeId);
          this.authenticatedNodes.delete(ws as unknown as string);
        }
      });
    });
  }

  private async verifySignature(
    nodeId: string,
    timestamp: string,
    signature: string,
    publicKey: Buffer,
  ): Promise<boolean> {
    try {
      const message = Buffer.from(`${nodeId}:${timestamp}`);
      const signatureBuffer = Buffer.from(signature, 'hex') as SignatureBuffer;
      return this.eciesService.verifyMessage(
        publicKey,
        message,
        signatureBuffer,
      );
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
