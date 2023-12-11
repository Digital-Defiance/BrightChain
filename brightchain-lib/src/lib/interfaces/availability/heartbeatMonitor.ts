/**
 * @fileoverview Heartbeat Monitor Interface
 *
 * Defines the interface for monitoring peer connectivity through heartbeat messages.
 * Enables nodes to detect network partitions and track peer reachability.
 *
 * @see Requirements 7.1, 7.2, 7.5
 */

/**
 * Connectivity event types emitted by the heartbeat monitor.
 *
 * @see Requirements 7.2, 7.5, 7.7
 */
export interface ConnectivityEvent {
  /**
   * Type of connectivity change:
   * - 'peer_connected': A single peer became reachable
   * - 'peer_disconnected': A single peer became unreachable
   * - 'all_disconnected': All peers became unreachable (partition detected)
   * - 'some_reconnected': At least one peer reconnected after partition
   */
  type:
    | 'peer_connected'
    | 'peer_disconnected'
    | 'all_disconnected'
    | 'some_reconnected';

  /**
   * The peer ID involved in the event (for peer_connected/peer_disconnected)
   */
  peerId?: string;

  /**
   * Timestamp when the event occurred
   */
  timestamp: Date;
}

/**
 * Configuration for the heartbeat monitor.
 *
 * @see Requirements 7.1, 7.2
 */
export interface HeartbeatConfig {
  /**
   * Interval between heartbeat pings in milliseconds.
   * Lower values detect failures faster but increase network traffic.
   *
   * @see Requirements 7.1
   */
  intervalMs: number;

  /**
   * Timeout for heartbeat response in milliseconds.
   * If a peer doesn't respond within this time, the heartbeat is considered missed.
   *
   * @see Requirements 7.1
   */
  timeoutMs: number;

  /**
   * Number of consecutive missed heartbeats before marking a peer as unreachable.
   * Higher values reduce false positives but increase detection latency.
   *
   * @see Requirements 7.2
   */
  missedThreshold: number;
}

/**
 * Default heartbeat configuration values.
 */
export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 5000,
  timeoutMs: 2000,
  missedThreshold: 3,
};

/**
 * Handler function type for connectivity events.
 */
export type ConnectivityEventHandler = (event: ConnectivityEvent) => void;

/**
 * Heartbeat Monitor Interface
 *
 * Monitors peer connectivity using periodic heartbeat messages.
 * Detects network partitions when all peers become unreachable and
 * triggers reconnection events when peers become available again.
 *
 * @see Requirements 7.1, 7.2, 7.5
 */
export interface IHeartbeatMonitor {
  /**
   * Start the heartbeat monitor.
   * Begins sending periodic heartbeat pings to all known peers.
   *
   * @see Requirements 7.1
   */
  start(): void;

  /**
   * Stop the heartbeat monitor.
   * Stops sending heartbeats and clears all tracking state.
   */
  stop(): void;

  /**
   * Check if the monitor is currently running.
   *
   * @returns True if the monitor is active
   */
  isRunning(): boolean;

  /**
   * Check if a specific peer is currently reachable.
   *
   * @param peerId - The peer ID to check
   * @returns True if the peer is reachable (responding to heartbeats)
   * @see Requirements 7.5
   */
  isPeerReachable(peerId: string): boolean;

  /**
   * Get all peers that are currently reachable.
   *
   * @returns Array of peer IDs that are responding to heartbeats
   * @see Requirements 7.5
   */
  getReachablePeers(): string[];

  /**
   * Get all peers that are currently unreachable.
   *
   * @returns Array of peer IDs that have exceeded the missed threshold
   * @see Requirements 7.5
   */
  getUnreachablePeers(): string[];

  /**
   * Get the number of consecutive missed heartbeats for a peer.
   *
   * @param peerId - The peer ID to check
   * @returns Number of missed heartbeats, or 0 if peer is unknown
   */
  getMissedCount(peerId: string): number;

  /**
   * Add a peer to be monitored.
   *
   * @param peerId - The peer ID to start monitoring
   */
  addPeer(peerId: string): void;

  /**
   * Remove a peer from monitoring.
   *
   * @param peerId - The peer ID to stop monitoring
   */
  removePeer(peerId: string): void;

  /**
   * Get all peers being monitored.
   *
   * @returns Array of all peer IDs being monitored
   */
  getMonitoredPeers(): string[];

  /**
   * Subscribe to connectivity change events.
   * The handler will be called when peer connectivity changes.
   *
   * @param handler - Function to call when connectivity changes
   * @see Requirements 7.2, 7.5, 7.7
   */
  onConnectivityChange(handler: ConnectivityEventHandler): void;

  /**
   * Remove a connectivity change handler.
   *
   * @param handler - The handler to remove
   */
  offConnectivityChange(handler: ConnectivityEventHandler): void;

  /**
   * Record a successful heartbeat response from a peer.
   * Called when a pong is received in response to a ping.
   *
   * @param peerId - The peer that responded
   * @param latencyMs - Round-trip latency in milliseconds
   */
  recordHeartbeatResponse(peerId: string, latencyMs: number): void;

  /**
   * Get the last recorded latency for a peer.
   *
   * @param peerId - The peer ID to check
   * @returns Last recorded latency in milliseconds, or undefined if unknown
   */
  getLastLatency(peerId: string): number | undefined;

  /**
   * Get the current configuration.
   *
   * @returns The heartbeat configuration
   */
  getConfig(): HeartbeatConfig;
}
