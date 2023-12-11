/**
 * WebSocket-based IPeerProvider implementation.
 *
 * Bridges the GossipService's IPeerProvider interface to real WebSocket
 * connections between BrightChain nodes. Each peer is represented by an
 * outbound WebSocket client connection to that peer's WebSocketMessageServer.
 *
 * Used for real cross-node gossip transport in both production and
 * integration testing (multiple servers on different ports).
 */

import { BlockAnnouncement } from '@brightchain/brightchain-lib';
import { WebSocket } from 'ws';
import {
  EncryptedBatchPayload,
  IPeerProvider,
} from '../availability/gossipService';

/**
 * Peer connection info for outbound WebSocket connections.
 */
interface PeerConnection {
  /** The WebSocket client connection to this peer */
  ws: WebSocket;
  /** Whether the connection is open and ready */
  ready: boolean;
  /** The peer's ECIES public key, if registered */
  publicKey: Buffer | null;
}

/**
 * IPeerProvider implementation that sends gossip batches over WebSocket.
 *
 * For each peer, maintains an outbound WebSocket connection to that peer's
 * WebSocketMessageServer. Announcement batches are serialized to JSON and
 * sent as 'gossip_batch' messages.
 */
export class WebSocketPeerProvider implements IPeerProvider {
  private peers = new Map<string, PeerConnection>();

  constructor(private readonly localNodeId: string) {}

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  getConnectedPeerIds(): string[] {
    const connected: string[] = [];
    for (const [peerId, peer] of this.peers) {
      if (peer.ready && peer.ws.readyState === WebSocket.OPEN) {
        connected.push(peerId);
      }
    }
    return connected;
  }

  /**
   * Connect to a peer's WebSocketMessageServer.
   *
   * @param peerId - The peer's node ID
   * @param url - WebSocket URL, e.g. ws://localhost:3001/{localNodeId}
   * @returns Promise that resolves when the connection is open
   */
  async connectToPeer(peerId: string, url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      const peer: PeerConnection = { ws, ready: false, publicKey: null };
      this.peers.set(peerId, peer);

      ws.on('open', () => {
        peer.ready = true;
        resolve();
      });

      ws.on('error', (err) => {
        peer.ready = false;
        if (!peer.ready) {
          reject(err);
        }
      });

      ws.on('close', () => {
        peer.ready = false;
      });
    });
  }

  /**
   * Register a peer's ECIES public key for encrypted gossip.
   */
  registerPeerPublicKey(peerId: string, publicKey: Buffer): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.publicKey = publicKey;
    }
  }

  async sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
    encrypted?: EncryptedBatchPayload,
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer || !peer.ready || peer.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Peer ${peerId} not connected`);
    }

    const message = JSON.stringify({
      type: 'gossip_batch',
      announcements: announcements.map((a) => ({
        type: a.type,
        blockId: a.blockId,
        nodeId: a.nodeId,
        timestamp: a.timestamp,
        ttl: a.ttl,
        ...(a.messageDelivery ? { messageDelivery: a.messageDelivery } : {}),
        ...(a.deliveryAck ? { deliveryAck: a.deliveryAck } : {}),
      })),
      ...(encrypted ? { encrypted } : {}),
    });

    return new Promise<void>((resolve, reject) => {
      peer.ws.send(message, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getPeerPublicKey(peerId: string): Promise<Buffer | null> {
    const peer = this.peers.get(peerId);
    return peer?.publicKey ?? null;
  }

  /**
   * Disconnect from all peers and close all WebSocket connections.
   */
  async disconnectAll(): Promise<void> {
    for (const [, peer] of this.peers) {
      peer.ready = false;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.close();
      }
    }
    this.peers.clear();
  }

  /**
   * Disconnect from a specific peer.
   */
  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.ready = false;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.close();
      }
      this.peers.delete(peerId);
    }
  }
}
