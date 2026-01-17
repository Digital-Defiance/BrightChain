/**
 * @fileoverview Availability Service Interface
 *
 * Defines the main service interface for coordinating block availability tracking,
 * discovery, partition handling, and event emission. This service integrates
 * BlockRegistry, DiscoveryProtocol, GossipService, ReconciliationService, and
 * HeartbeatMonitor to provide a unified availability management layer.
 *
 * @see Requirements 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { AvailabilityState } from '../../enumerations/availabilityState';
import { ILocationRecord } from './locationRecord';
import { ReconciliationResult } from './reconciliationService';

/**
 * Statistics about block availability across the system.
 *
 * @see Requirements 11.4, 15.1
 */
export interface AvailabilityStatistics {
  /**
   * Number of blocks stored locally as authoritative copies
   */
  localCount: number;

  /**
   * Number of blocks known to exist only on remote nodes
   */
  remoteCount: number;

  /**
   * Number of blocks cached locally with remote authoritative copies
   */
  cachedCount: number;

  /**
   * Number of blocks whose source nodes are unreachable
   */
  orphanedCount: number;

  /**
   * Number of blocks with unknown location
   */
  unknownCount: number;

  /**
   * Total number of known location records across all blocks
   */
  totalKnownLocations: number;

  /**
   * Average number of locations per block
   */
  averageLocationsPerBlock: number;
}

/**
 * Event types emitted by the availability service.
 *
 * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */
export type AvailabilityEvent =
  | {
      type: 'state_changed';
      blockId: string;
      oldState: AvailabilityState;
      newState: AvailabilityState;
      timestamp: Date;
    }
  | {
      type: 'location_added';
      blockId: string;
      location: ILocationRecord;
      timestamp: Date;
    }
  | {
      type: 'location_removed';
      blockId: string;
      nodeId: string;
      timestamp: Date;
    }
  | {
      type: 'partition_entered';
      timestamp: Date;
      disconnectedPeers: string[];
    }
  | {
      type: 'partition_exited';
      timestamp: Date;
      reconnectedPeers: string[];
    }
  | {
      type: 'reconciliation_started';
      timestamp: Date;
      peerIds: string[];
    }
  | {
      type: 'reconciliation_completed';
      timestamp: Date;
      result: ReconciliationResult;
    };

/**
 * Handler function type for availability events.
 */
export type AvailabilityEventHandler = (event: AvailabilityEvent) => void;

/**
 * Filter options for event subscriptions.
 *
 * @see Requirements 14.6
 */
export interface EventFilter {
  /**
   * Event types to receive. If empty or undefined, receives all types.
   */
  eventTypes?: AvailabilityEvent['type'][];

  /**
   * Block ID patterns to match. Supports glob patterns.
   * If empty or undefined, receives events for all blocks.
   */
  blockIdPatterns?: string[];
}

/**
 * Result of a location query with staleness indication.
 *
 * @see Requirements 11.5, 11.6
 */
export interface LocationQueryResult {
  /**
   * The block ID queried
   */
  blockId: string;

  /**
   * Current availability state
   */
  state: AvailabilityState;

  /**
   * Known locations for the block
   */
  locations: ILocationRecord[];

  /**
   * Whether the location information is considered stale
   *
   * @see Requirements 11.6
   */
  isStale: boolean;

  /**
   * When the location information was last updated
   */
  lastUpdated: Date;
}

/**
 * Configuration for the availability service.
 */
export interface AvailabilityServiceConfig {
  /**
   * The local node's unique identifier
   */
  localNodeId: string;

  /**
   * Threshold in milliseconds after which location data is considered stale
   *
   * @see Requirements 11.6
   */
  stalenessThresholdMs: number;

  /**
   * Timeout for availability queries in milliseconds
   *
   * @see Requirements 11.5
   */
  queryTimeoutMs: number;
}

/**
 * Default availability service configuration values.
 */
export const DEFAULT_AVAILABILITY_SERVICE_CONFIG: AvailabilityServiceConfig = {
  localNodeId: '',
  stalenessThresholdMs: 300000, // 5 minutes
  queryTimeoutMs: 10000, // 10 seconds
};

/**
 * Availability Service Interface
 *
 * Main service for coordinating block availability tracking across the distributed
 * storage system. Integrates with BlockRegistry, DiscoveryProtocol, GossipService,
 * ReconciliationService, and HeartbeatMonitor to provide:
 *
 * - State queries and updates for block availability
 * - Partition mode handling when network connectivity is lost
 * - Event emission for availability changes
 * - Statistics about block distribution
 *
 * @see Requirements 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export interface IAvailabilityService {
  // === State Queries ===

  /**
   * Get the availability state for a block.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to the block's availability state
   * @see Requirements 1.7, 11.1
   */
  getAvailabilityState(blockId: string): Promise<AvailabilityState>;

  /**
   * Get all known locations for a block.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to array of location records
   * @see Requirements 11.2
   */
  getBlockLocations(blockId: string): Promise<ILocationRecord[]>;

  /**
   * Get detailed location query result with staleness indication.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to location query result
   * @see Requirements 11.5, 11.6
   */
  queryBlockLocation(blockId: string): Promise<LocationQueryResult>;

  /**
   * List all blocks in a specific availability state.
   *
   * @param state - The availability state to filter by
   * @returns Promise resolving to array of block IDs
   * @see Requirements 11.3
   */
  listBlocksByState(state: AvailabilityState): Promise<string[]>;

  /**
   * Get statistics about block availability distribution.
   *
   * @returns Promise resolving to availability statistics
   * @see Requirements 11.4
   */
  getStatistics(): Promise<AvailabilityStatistics>;

  // === Location Updates ===

  /**
   * Update or add a location record for a block.
   * Emits a location_added event if this is a new location.
   *
   * @param blockId - The block ID to update
   * @param location - The location record to add or update
   * @returns Promise that resolves when the update is complete
   * @see Requirements 2.4, 14.2
   */
  updateLocation(blockId: string, location: ILocationRecord): Promise<void>;

  /**
   * Remove a location record for a block.
   * Emits a location_removed event.
   *
   * @param blockId - The block ID to update
   * @param nodeId - The node ID to remove from locations
   * @returns Promise that resolves when the removal is complete
   * @see Requirements 2.5, 14.3
   */
  removeLocation(blockId: string, nodeId: string): Promise<void>;

  /**
   * Set the availability state for a block.
   * Emits a state_changed event if the state changes.
   *
   * @param blockId - The block ID to update
   * @param state - The new availability state
   * @returns Promise that resolves when the update is complete
   * @see Requirements 14.1
   */
  setAvailabilityState(
    blockId: string,
    state: AvailabilityState,
  ): Promise<void>;

  // === Partition Mode Handling ===

  /**
   * Check if the service is currently in partition mode.
   * Partition mode is entered when all peers become unreachable.
   *
   * @returns True if in partition mode
   * @see Requirements 7.2
   */
  isInPartitionMode(): boolean;

  /**
   * Enter partition mode.
   * Called when all peers become unreachable.
   * Marks all Remote blocks as Orphaned and emits partition_entered event.
   *
   * @see Requirements 7.2, 7.3, 7.7, 14.4
   */
  enterPartitionMode(): void;

  /**
   * Exit partition mode and initiate reconciliation.
   * Called when at least one peer becomes reachable.
   * Emits partition_exited event and starts reconciliation.
   *
   * @returns Promise resolving to reconciliation result
   * @see Requirements 7.5, 9.1, 14.4, 14.5
   */
  exitPartitionMode(): Promise<ReconciliationResult>;

  /**
   * Get the list of peers that were disconnected when entering partition mode.
   *
   * @returns Array of disconnected peer IDs, or empty if not in partition mode
   */
  getDisconnectedPeers(): string[];

  // === Event Subscription ===

  /**
   * Subscribe to availability events.
   *
   * @param handler - Function to call when events occur
   * @param filter - Optional filter to receive only specific events
   * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
   */
  onEvent(handler: AvailabilityEventHandler, filter?: EventFilter): void;

  /**
   * Remove an event handler.
   *
   * @param handler - The handler to remove
   */
  offEvent(handler: AvailabilityEventHandler): void;

  // === Lifecycle ===

  /**
   * Start the availability service.
   * Initializes all integrated services and begins monitoring.
   */
  start(): Promise<void>;

  /**
   * Stop the availability service.
   * Stops all integrated services and cleans up resources.
   */
  stop(): Promise<void>;

  /**
   * Check if the service is running.
   *
   * @returns True if the service is active
   */
  isRunning(): boolean;

  /**
   * Get the current configuration.
   *
   * @returns The availability service configuration
   */
  getConfig(): AvailabilityServiceConfig;

  /**
   * Get the local node ID.
   *
   * @returns The local node's unique identifier
   */
  getLocalNodeId(): string;
}
