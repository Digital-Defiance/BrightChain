/* eslint-disable @nx/enforce-module-boundaries */
/**
 * @fileoverview Availability Service Implementation
 *
 * Main service for coordinating block availability tracking across the distributed
 * storage system. Integrates BlockRegistry, DiscoveryProtocol, GossipService,
 * ReconciliationService, and HeartbeatMonitor.
 *
 * @see Requirements 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import {
  AvailabilityEvent,
  AvailabilityEventHandler,
  AvailabilityServiceConfig,
  AvailabilityState,
  AvailabilityStatistics,
  DEFAULT_AVAILABILITY_SERVICE_CONFIG,
  EventFilter,
  IAvailabilityService,
  IBlockRegistry,
  IDiscoveryProtocol,
  IGossipService,
  IHeartbeatMonitor,
  ILocationRecord,
  IReconciliationService,
  LocationQueryResult,
  ReconciliationResult,
} from '@brightchain/brightchain-lib';

/**
 * Internal structure for tracking block metadata with location.
 */
interface BlockLocationData {
  /**
   * Current availability state
   */
  state: AvailabilityState;

  /**
   * Known locations for this block
   */
  locations: ILocationRecord[];

  /**
   * When the location data was last updated
   */
  lastUpdated: Date;
}

/**
 * Handler registration with optional filter.
 */
interface HandlerRegistration {
  handler: AvailabilityEventHandler;
  filter?: EventFilter;
}

/**
 * Availability Service Implementation
 *
 * Coordinates block availability tracking, discovery, partition handling,
 * and event emission across the distributed storage system.
 *
 * @see Requirements 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export class AvailabilityService implements IAvailabilityService {
  /**
   * Block location data indexed by block ID.
   */
  private readonly blockData: Map<string, BlockLocationData> = new Map();

  /**
   * Registered event handlers with filters.
   */
  private readonly handlers: Set<HandlerRegistration> = new Set();

  /**
   * Whether the service is currently in partition mode.
   */
  private partitionMode = false;

  /**
   * Peers that were disconnected when entering partition mode.
   */
  private disconnectedPeers: string[] = [];

  /**
   * Whether the service is running.
   */
  private running = false;

  /**
   * Create a new AvailabilityService.
   *
   * @param registry - Block registry for local block tracking
   * @param discoveryProtocol - Protocol for discovering blocks on the network
   * @param gossipService - Service for announcing blocks
   * @param reconciliationService - Service for state reconciliation
   * @param heartbeatMonitor - Monitor for peer connectivity
   * @param config - Service configuration
   */
  constructor(
    private readonly registry: IBlockRegistry,
    private readonly discoveryProtocol: IDiscoveryProtocol,
    private readonly gossipService: IGossipService,
    private readonly reconciliationService: IReconciliationService,
    private readonly heartbeatMonitor: IHeartbeatMonitor,
    private readonly config: AvailabilityServiceConfig = DEFAULT_AVAILABILITY_SERVICE_CONFIG,
  ) {
    // Set up heartbeat monitor connectivity handler
    this.heartbeatMonitor.onConnectivityChange((event) => {
      this.handleConnectivityChange(event);
    });
  }

  // === State Queries ===

  /**
   * Get the availability state for a block.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to the block's availability state
   * @see Requirements 1.7, 11.1
   */
  async getAvailabilityState(blockId: string): Promise<AvailabilityState> {
    // Check local registry first
    if (this.registry.hasLocal(blockId)) {
      return AvailabilityState.Local;
    }

    // Check cached location data
    const data = this.blockData.get(blockId);
    if (data) {
      return data.state;
    }

    // Unknown state
    return AvailabilityState.Unknown;
  }

  /**
   * Get all known locations for a block.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to array of location records
   * @see Requirements 11.2
   */
  async getBlockLocations(blockId: string): Promise<ILocationRecord[]> {
    const data = this.blockData.get(blockId);
    if (data) {
      return [...data.locations];
    }

    // If local, return local node as location
    if (this.registry.hasLocal(blockId)) {
      return [
        {
          nodeId: this.config.localNodeId,
          lastSeen: new Date(),
          isAuthoritative: true,
        },
      ];
    }

    return [];
  }

  /**
   * Get detailed location query result with staleness indication.
   *
   * @param blockId - The block ID to query
   * @returns Promise resolving to location query result
   * @see Requirements 11.5, 11.6
   */
  async queryBlockLocation(blockId: string): Promise<LocationQueryResult> {
    const state = await this.getAvailabilityState(blockId);
    const locations = await this.getBlockLocations(blockId);

    const data = this.blockData.get(blockId);
    const lastUpdated = data?.lastUpdated ?? new Date();

    // Check staleness
    const age = Date.now() - lastUpdated.getTime();
    const isStale = age > this.config.stalenessThresholdMs;

    return {
      blockId,
      state,
      locations,
      isStale,
      lastUpdated,
    };
  }

  /**
   * List all blocks in a specific availability state.
   *
   * @param state - The availability state to filter by
   * @returns Promise resolving to array of block IDs
   * @see Requirements 11.3
   */
  async listBlocksByState(state: AvailabilityState): Promise<string[]> {
    const blockIds: string[] = [];

    // For Local state, use registry
    if (state === AvailabilityState.Local) {
      return this.registry.getLocalBlockIds();
    }

    // For other states, scan block data
    for (const [blockId, data] of this.blockData) {
      if (data.state === state) {
        blockIds.push(blockId);
      }
    }

    return blockIds;
  }

  /**
   * Get statistics about block availability distribution.
   *
   * @returns Promise resolving to availability statistics
   * @see Requirements 11.4
   */
  async getStatistics(): Promise<AvailabilityStatistics> {
    let localCount = 0;
    let remoteCount = 0;
    let cachedCount = 0;
    let orphanedCount = 0;
    let unknownCount = 0;
    let totalKnownLocations = 0;

    // Count local blocks from registry
    localCount = this.registry.getLocalCount();

    // Count other states from block data
    for (const data of this.blockData.values()) {
      switch (data.state) {
        case AvailabilityState.Remote:
          remoteCount++;
          break;
        case AvailabilityState.Cached:
          cachedCount++;
          break;
        case AvailabilityState.Orphaned:
          orphanedCount++;
          break;
        case AvailabilityState.Unknown:
          unknownCount++;
          break;
        // Local is counted from registry
      }
      totalKnownLocations += data.locations.length;
    }

    // Add local block locations
    totalKnownLocations += localCount;

    const totalBlocks =
      localCount + remoteCount + cachedCount + orphanedCount + unknownCount;
    const averageLocationsPerBlock =
      totalBlocks > 0 ? totalKnownLocations / totalBlocks : 0;

    return {
      localCount,
      remoteCount,
      cachedCount,
      orphanedCount,
      unknownCount,
      totalKnownLocations,
      averageLocationsPerBlock,
    };
  }

  // === Location Updates ===

  /**
   * Update or add a location record for a block.
   *
   * @param blockId - The block ID to update
   * @param location - The location record to add or update
   * @see Requirements 2.4, 14.2
   */
  async updateLocation(
    blockId: string,
    location: ILocationRecord,
  ): Promise<void> {
    let data = this.blockData.get(blockId);
    const isNewLocation =
      !data || !data.locations.some((l) => l.nodeId === location.nodeId);

    if (!data) {
      // Determine initial state based on location
      const state =
        location.nodeId === this.config.localNodeId
          ? AvailabilityState.Local
          : AvailabilityState.Remote;

      data = {
        state,
        locations: [],
        lastUpdated: new Date(),
      };
      this.blockData.set(blockId, data);
    }

    // Update or add location
    const existingIndex = data.locations.findIndex(
      (l) => l.nodeId === location.nodeId,
    );
    if (existingIndex >= 0) {
      data.locations[existingIndex] = { ...location };
    } else {
      data.locations.push({ ...location });
    }

    data.lastUpdated = new Date();

    // Emit event if this is a new location
    if (isNewLocation) {
      this.emitEvent({
        type: 'location_added',
        blockId,
        location,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Remove a location record for a block.
   *
   * @param blockId - The block ID to update
   * @param nodeId - The node ID to remove from locations
   * @see Requirements 2.5, 14.3
   */
  async removeLocation(blockId: string, nodeId: string): Promise<void> {
    const data = this.blockData.get(blockId);
    if (!data) {
      return;
    }

    const initialLength = data.locations.length;
    data.locations = data.locations.filter((l) => l.nodeId !== nodeId);

    if (data.locations.length < initialLength) {
      data.lastUpdated = new Date();

      // Emit event
      this.emitEvent({
        type: 'location_removed',
        blockId,
        nodeId,
        timestamp: new Date(),
      });

      // Check if block should become orphaned
      if (
        data.locations.length === 0 &&
        data.state === AvailabilityState.Remote
      ) {
        await this.setAvailabilityState(blockId, AvailabilityState.Orphaned);
      }
    }
  }

  /**
   * Set the availability state for a block.
   *
   * @param blockId - The block ID to update
   * @param state - The new availability state
   * @see Requirements 14.1
   */
  async setAvailabilityState(
    blockId: string,
    state: AvailabilityState,
  ): Promise<void> {
    let data = this.blockData.get(blockId);
    const oldState = data?.state ?? AvailabilityState.Unknown;

    if (oldState === state) {
      return; // No change
    }

    if (!data) {
      data = {
        state,
        locations: [],
        lastUpdated: new Date(),
      };
      this.blockData.set(blockId, data);
    } else {
      data.state = state;
      data.lastUpdated = new Date();
    }

    // Emit state change event
    this.emitEvent({
      type: 'state_changed',
      blockId,
      oldState,
      newState: state,
      timestamp: new Date(),
    });
  }

  // === Partition Mode Handling ===

  /**
   * Check if the service is currently in partition mode.
   *
   * @returns True if in partition mode
   * @see Requirements 7.2
   */
  isInPartitionMode(): boolean {
    return this.partitionMode;
  }

  /**
   * Enter partition mode.
   *
   * @see Requirements 7.2, 7.3, 7.7, 14.4
   */
  enterPartitionMode(): void {
    if (this.partitionMode) {
      return; // Already in partition mode
    }

    this.partitionMode = true;
    this.disconnectedPeers = this.heartbeatMonitor.getUnreachablePeers();

    // Mark all Remote blocks as Orphaned
    this.markRemoteBlocksAsOrphaned();

    // Emit partition entered event
    this.emitEvent({
      type: 'partition_entered',
      timestamp: new Date(),
      disconnectedPeers: [...this.disconnectedPeers],
    });
  }

  /**
   * Exit partition mode and initiate reconciliation.
   *
   * @returns Promise resolving to reconciliation result
   * @see Requirements 7.5, 9.1, 14.4, 14.5
   */
  async exitPartitionMode(): Promise<ReconciliationResult> {
    if (!this.partitionMode) {
      // Not in partition mode, return empty result
      return {
        success: true,
        peersReconciled: 0,
        blocksDiscovered: 0,
        blocksUpdated: 0,
        orphansResolved: 0,
        conflictsResolved: 0,
        errors: [],
        duration: 0,
      };
    }

    const reconnectedPeers = this.heartbeatMonitor.getReachablePeers();

    this.partitionMode = false;

    // Emit partition exited event
    this.emitEvent({
      type: 'partition_exited',
      timestamp: new Date(),
      reconnectedPeers: [...reconnectedPeers],
    });

    // Emit reconciliation started event
    this.emitEvent({
      type: 'reconciliation_started',
      timestamp: new Date(),
      peerIds: reconnectedPeers,
    });

    // Start reconciliation
    const result = await this.reconciliationService.reconcile(reconnectedPeers);

    // Emit reconciliation completed event
    this.emitEvent({
      type: 'reconciliation_completed',
      timestamp: new Date(),
      result,
    });

    this.disconnectedPeers = [];

    return result;
  }

  /**
   * Get the list of peers that were disconnected when entering partition mode.
   *
   * @returns Array of disconnected peer IDs
   */
  getDisconnectedPeers(): string[] {
    return [...this.disconnectedPeers];
  }

  // === Event Subscription ===

  /**
   * Subscribe to availability events.
   *
   * @param handler - Function to call when events occur
   * @param filter - Optional filter to receive only specific events
   * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
   */
  onEvent(handler: AvailabilityEventHandler, filter?: EventFilter): void {
    this.handlers.add({ handler, filter });
  }

  /**
   * Remove an event handler.
   *
   * @param handler - The handler to remove
   */
  offEvent(handler: AvailabilityEventHandler): void {
    for (const registration of this.handlers) {
      if (registration.handler === handler) {
        this.handlers.delete(registration);
        break;
      }
    }
  }

  // === Lifecycle ===

  /**
   * Start the availability service.
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    // Start integrated services
    this.heartbeatMonitor.start();
    this.gossipService.start();

    // Rebuild registry from storage
    await this.registry.rebuild();
  }

  /**
   * Stop the availability service.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop integrated services
    this.heartbeatMonitor.stop();
    await this.gossipService.stop();
  }

  /**
   * Check if the service is running.
   *
   * @returns True if the service is active
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current configuration.
   *
   * @returns The availability service configuration
   */
  getConfig(): AvailabilityServiceConfig {
    return { ...this.config };
  }

  /**
   * Get the local node ID.
   *
   * @returns The local node's unique identifier
   */
  getLocalNodeId(): string {
    return this.config.localNodeId;
  }

  // === Private Methods ===

  /**
   * Handle connectivity change events from heartbeat monitor.
   */
  private handleConnectivityChange(event: {
    type: string;
    peerId?: string;
    timestamp: Date;
  }): void {
    if (event.type === 'all_disconnected') {
      this.enterPartitionMode();
    } else if (event.type === 'some_reconnected' && this.partitionMode) {
      // Auto-exit partition mode when peers reconnect
      this.exitPartitionMode().catch(() => {
        // Ignore reconciliation errors during auto-exit
      });
    }
  }

  /**
   * Mark all Remote blocks as Orphaned when entering partition mode.
   *
   * @see Requirements 7.3
   */
  private markRemoteBlocksAsOrphaned(): void {
    for (const [blockId, data] of this.blockData) {
      if (data.state === AvailabilityState.Remote) {
        const oldState = data.state;
        data.state = AvailabilityState.Orphaned;
        data.lastUpdated = new Date();

        this.emitEvent({
          type: 'state_changed',
          blockId,
          oldState,
          newState: AvailabilityState.Orphaned,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Emit an event to all matching handlers.
   *
   * @param event - The event to emit
   */
  private emitEvent(AvailabilityEvent: AvailabilityEvent): void {
    for (const registration of this.handlers) {
      if (this.eventMatchesFilter(AvailabilityEvent, registration.filter)) {
        try {
          registration.handler(AvailabilityEvent);
        } catch {
          // Ignore handler errors to prevent one handler from affecting others
        }
      }
    }
  }

  /**
   * Check if an event matches a filter.
   *
   * @param event - The event to check
   * @param filter - The filter to match against
   * @returns True if the event matches the filter
   * @see Requirements 14.6
   */
  private eventMatchesFilter(
    event: AvailabilityEvent,
    filter?: EventFilter,
  ): boolean {
    if (!filter) {
      return true; // No filter means all events
    }

    // Check event type filter
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      if (!filter.eventTypes.includes(event.type)) {
        return false;
      }
    }

    // Check block ID pattern filter
    if (filter.blockIdPatterns && filter.blockIdPatterns.length > 0) {
      const blockId = this.getBlockIdFromEvent(event);
      if (blockId) {
        const matches = filter.blockIdPatterns.some((pattern) =>
          this.matchesGlobPattern(blockId, pattern),
        );
        if (!matches) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract block ID from an event if present.
   */
  private getBlockIdFromEvent(event: AvailabilityEvent): string | null {
    if ('blockId' in event) {
      return event.blockId;
    }
    return null;
  }

  /**
   * Simple glob pattern matching (supports * wildcard).
   */
  private matchesGlobPattern(value: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(value);
  }

  // === Testing Helpers ===

  /**
   * Clear all block data (for testing).
   */
  clear(): void {
    this.blockData.clear();
    this.partitionMode = false;
    this.disconnectedPeers = [];
  }

  /**
   * Get block data directly (for testing).
   */
  getBlockData(blockId: string): BlockLocationData | undefined {
    return this.blockData.get(blockId);
  }

  /**
   * Set block data directly (for testing).
   */
  setBlockData(blockId: string, data: BlockLocationData): void {
    this.blockData.set(blockId, data);
  }
}
