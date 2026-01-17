/**
 * @fileoverview Heartbeat Monitor Implementation
 *
 * Implements peer connectivity monitoring through periodic heartbeat messages.
 * Detects network partitions when all peers become unreachable and
 * triggers reconnection events when peers become available again.
 *
 * @see Requirements 7.1, 7.2, 7.5, 7.6
 */

import {
  ConnectivityEvent,
  ConnectivityEventHandler,
  HeartbeatConfig,
  IHeartbeatMonitor,
} from '@brightchain/brightchain-lib';

// Re-export DEFAULT_HEARTBEAT_CONFIG from brightchain-lib for convenience
export { DEFAULT_HEARTBEAT_CONFIG } from '@brightchain/brightchain-lib';

/**
 * Default heartbeat configuration values (local copy for use in this module).
 */
const defaultHeartbeatConfig: HeartbeatConfig = {
  intervalMs: 5000,
  timeoutMs: 2000,
  missedThreshold: 3,
};

/**
 * Interface for heartbeat transport operations.
 * Abstracts the underlying transport mechanism (WebSocket, etc.).
 */
export interface IHeartbeatTransport {
  /**
   * Send a ping to a peer.
   *
   * @param peerId - The peer to ping
   * @returns Promise that resolves with latency in ms, or rejects on timeout/error
   */
  sendPing(peerId: string): Promise<number>;
}

/**
 * Internal state for tracking a peer's heartbeat status.
 */
interface PeerHeartbeatState {
  /**
   * Number of consecutive missed heartbeats.
   */
  missedCount: number;

  /**
   * Whether the peer is currently considered reachable.
   */
  reachable: boolean;

  /**
   * Last recorded round-trip latency in milliseconds.
   */
  lastLatencyMs?: number;

  /**
   * Timestamp of last successful heartbeat.
   */
  lastSuccessAt?: Date;
}

/**
 * Heartbeat Monitor Implementation
 *
 * Monitors peer connectivity using periodic heartbeat messages.
 * Detects network partitions when all peers become unreachable and
 * triggers reconnection events when peers become available again.
 *
 * @see Requirements 7.1, 7.2, 7.5, 7.6
 */
export class HeartbeatMonitor implements IHeartbeatMonitor {
  /**
   * Map of peer ID to heartbeat state.
   */
  private peerStates: Map<string, PeerHeartbeatState> = new Map();

  /**
   * Registered connectivity event handlers.
   */
  private handlers: Set<ConnectivityEventHandler> = new Set();

  /**
   * Heartbeat interval timer handle.
   */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Whether the monitor is currently running.
   */
  private running = false;

  /**
   * Whether we are currently in a partition state (all peers unreachable).
   */
  private inPartition = false;

  /**
   * Create a new HeartbeatMonitor.
   *
   * @param transport - Transport for sending heartbeat pings
   * @param config - Heartbeat configuration (uses defaults if not provided)
   */
  constructor(
    private readonly transport: IHeartbeatTransport,
    private readonly config: HeartbeatConfig = defaultHeartbeatConfig,
  ) {}

  /**
   * Start the heartbeat monitor.
   * Begins sending periodic heartbeat pings to all known peers.
   *
   * @see Requirements 7.1
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats().catch(() => {
        // Ignore heartbeat errors - they're handled per-peer
      });
    }, this.config.intervalMs);

    // Send initial heartbeats immediately
    this.sendHeartbeats().catch(() => {
      // Ignore initial heartbeat errors
    });
  }

  /**
   * Stop the heartbeat monitor.
   * Stops sending heartbeats and clears all tracking state.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check if the monitor is currently running.
   *
   * @returns True if the monitor is active
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if a specific peer is currently reachable.
   *
   * @param peerId - The peer ID to check
   * @returns True if the peer is reachable (responding to heartbeats)
   * @see Requirements 7.5
   */
  isPeerReachable(peerId: string): boolean {
    const state = this.peerStates.get(peerId);
    return state?.reachable ?? false;
  }

  /**
   * Get all peers that are currently reachable.
   *
   * @returns Array of peer IDs that are responding to heartbeats
   * @see Requirements 7.5
   */
  getReachablePeers(): string[] {
    const reachable: string[] = [];
    for (const [peerId, state] of this.peerStates) {
      if (state.reachable) {
        reachable.push(peerId);
      }
    }
    return reachable;
  }

  /**
   * Get all peers that are currently unreachable.
   *
   * @returns Array of peer IDs that have exceeded the missed threshold
   * @see Requirements 7.5
   */
  getUnreachablePeers(): string[] {
    const unreachable: string[] = [];
    for (const [peerId, state] of this.peerStates) {
      if (!state.reachable) {
        unreachable.push(peerId);
      }
    }
    return unreachable;
  }

  /**
   * Get the number of consecutive missed heartbeats for a peer.
   *
   * @param peerId - The peer ID to check
   * @returns Number of missed heartbeats, or 0 if peer is unknown
   */
  getMissedCount(peerId: string): number {
    return this.peerStates.get(peerId)?.missedCount ?? 0;
  }

  /**
   * Add a peer to be monitored.
   *
   * @param peerId - The peer ID to start monitoring
   */
  addPeer(peerId: string): void {
    if (!this.peerStates.has(peerId)) {
      this.peerStates.set(peerId, {
        missedCount: 0,
        reachable: true, // Assume reachable until proven otherwise
      });
    }
  }

  /**
   * Remove a peer from monitoring.
   *
   * @param peerId - The peer ID to stop monitoring
   */
  removePeer(peerId: string): void {
    this.peerStates.delete(peerId);
  }

  /**
   * Get all peers being monitored.
   *
   * @returns Array of all peer IDs being monitored
   */
  getMonitoredPeers(): string[] {
    return Array.from(this.peerStates.keys());
  }

  /**
   * Subscribe to connectivity change events.
   *
   * @param handler - Function to call when connectivity changes
   * @see Requirements 7.2, 7.5, 7.7
   */
  onConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Remove a connectivity change handler.
   *
   * @param handler - The handler to remove
   */
  offConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Record a successful heartbeat response from a peer.
   * Called when a pong is received in response to a ping.
   *
   * @param peerId - The peer that responded
   * @param latencyMs - Round-trip latency in milliseconds
   */
  recordHeartbeatResponse(peerId: string, latencyMs: number): void {
    let state = this.peerStates.get(peerId);
    if (!state) {
      state = {
        missedCount: 0,
        reachable: true,
      };
      this.peerStates.set(peerId, state);
    }

    const wasUnreachable = !state.reachable;

    state.missedCount = 0;
    state.reachable = true;
    state.lastLatencyMs = latencyMs;
    state.lastSuccessAt = new Date();

    // Emit peer_connected if peer was previously unreachable
    if (wasUnreachable) {
      this.emitEvent({
        type: 'peer_connected',
        peerId,
        timestamp: new Date(),
      });

      // Check if we're exiting partition mode
      this.checkPartitionExit();
    }
  }

  /**
   * Get the last recorded latency for a peer.
   *
   * @param peerId - The peer ID to check
   * @returns Last recorded latency in milliseconds, or undefined if unknown
   */
  getLastLatency(peerId: string): number | undefined {
    return this.peerStates.get(peerId)?.lastLatencyMs;
  }

  /**
   * Get the current configuration.
   *
   * @returns The heartbeat configuration
   */
  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }

  /**
   * Send heartbeats to all monitored peers.
   * @private
   */
  private async sendHeartbeats(): Promise<void> {
    const peers = this.getMonitoredPeers();
    if (peers.length === 0) {
      return;
    }

    const heartbeatPromises = peers.map((peerId) =>
      this.sendHeartbeatToPeer(peerId),
    );

    await Promise.all(heartbeatPromises);
  }

  /**
   * Send a heartbeat to a specific peer and handle the response.
   * @private
   */
  private async sendHeartbeatToPeer(peerId: string): Promise<void> {
    try {
      const latencyMs = await this.transport.sendPing(peerId);
      this.recordHeartbeatResponse(peerId, latencyMs);
    } catch {
      // Heartbeat failed - record missed
      this.recordMissedHeartbeat(peerId);
    }
  }

  /**
   * Record a missed heartbeat for a peer.
   * @private
   */
  private recordMissedHeartbeat(peerId: string): void {
    let state = this.peerStates.get(peerId);
    if (!state) {
      state = {
        missedCount: 0,
        reachable: true,
      };
      this.peerStates.set(peerId, state);
    }

    state.missedCount++;

    // Check if peer has exceeded missed threshold
    if (state.reachable && state.missedCount >= this.config.missedThreshold) {
      state.reachable = false;

      this.emitEvent({
        type: 'peer_disconnected',
        peerId,
        timestamp: new Date(),
      });

      // Check if all peers are now unreachable (partition)
      this.checkPartitionEntry();
    }
  }

  /**
   * Check if we should enter partition mode (all peers unreachable).
   * @private
   */
  private checkPartitionEntry(): void {
    if (this.inPartition) {
      return; // Already in partition
    }

    const monitoredPeers = this.getMonitoredPeers();
    if (monitoredPeers.length === 0) {
      return; // No peers to monitor
    }

    const reachablePeers = this.getReachablePeers();
    if (reachablePeers.length === 0) {
      // All peers are unreachable - enter partition mode
      this.inPartition = true;

      this.emitEvent({
        type: 'all_disconnected',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check if we should exit partition mode (at least one peer reachable).
   * @private
   */
  private checkPartitionExit(): void {
    if (!this.inPartition) {
      return; // Not in partition
    }

    const reachablePeers = this.getReachablePeers();
    if (reachablePeers.length > 0) {
      // At least one peer is reachable - exit partition mode
      this.inPartition = false;

      this.emitEvent({
        type: 'some_reconnected',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Emit a connectivity event to all handlers.
   * @private
   */
  private emitEvent(event: ConnectivityEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors to prevent one handler from affecting others
      }
    }
  }

  /**
   * Check if currently in partition mode.
   *
   * @returns True if all peers are unreachable
   */
  isInPartition(): boolean {
    return this.inPartition;
  }

  /**
   * Clear all peer states (for testing).
   */
  clearPeers(): void {
    this.peerStates.clear();
    this.inPartition = false;
  }
}
