/**
 * CBLIndex – higher-level CBL index built on top of a brightchain-db Collection.
 *
 * Tracks whitened CBL storage results with metadata, pool scoping,
 * user-level organization, and file version history.
 *
 * Backed by a `Collection<ICBLIndexEntry>` named `__cbl_index__`.
 */

import {
  CBLVisibility,
  isPooledBlockStore,
  type CBLIndexManifest,
  type CBLIndexManifestEntry,
  type IBlockStore,
  type ICBLIndexEntry,
  type ICBLIndexQueryOptions,
  type IGossipService,
  type IHeadRegistry,
} from '@brightchain/brightchain-lib';
import { randomUUID } from 'crypto';
import type { Collection } from './collection';
import type { BrightChainDb } from './database';
import type { BsonDocument, FilterQuery, SortSpec } from './types';

/**
 * Internal document type that satisfies the BsonDocument constraint
 * while preserving ICBLIndexEntry shape.
 */
type CBLIndexDocument = ICBLIndexEntry & BsonDocument;

/** Shorthand for the filter type used throughout this class. */
type CBLFilter = FilterQuery<CBLIndexDocument>;

/** Shorthand for the sort type used throughout this class. */
type CBLSort = SortSpec<CBLIndexDocument>;

/** The well-known collection name for the CBL index. */
const CBL_INDEX_COLLECTION_NAME = '__cbl_index__';

/** Head registry key for the latest snapshot magnet URL. */
const CBL_INDEX_SNAPSHOT_KEY = '__cbl_index_snapshot__';

/**
 * Options for configuring the CBL Index.
 */
export interface CBLIndexOptions {
  /**
   * Number of FEC parity blocks to generate for the collection's metadata
   * blocks after each mutation. Set to 0 (default) to disable FEC redundancy.
   *
   * Uses the existing `IBlockStore.generateParityBlocks()` method.
   */
  parityCount?: number;

  /**
   * Number of index mutations after which an automatic snapshot is taken.
   * Set to 0 to disable auto-snapshots. Default: 100.
   *
   * Auto-snapshots are best-effort — failures are logged but don't break mutations.
   */
  snapshotInterval?: number;

  /**
   * Enable recovery on startup when the index collection is empty.
   * Recovery order: (1) latest snapshot, (2) FEC parity rebuild, (3) block store scan.
   * Default: true.
   */
  enableRecovery?: boolean;

  /**
   * Optional gossip service for announcing CBL index changes to peers.
   * When provided, new entries and soft-deletions are announced to peers
   * in the same pool via cbl_index_update and cbl_index_delete announcements.
   *
   * @see Requirements 8.1, 8.6
   */
  gossipService?: IGossipService;
}

/**
 * Higher-level CBL index built on top of a brightchain-db Collection.
 * Tracks whitened CBL storage results with metadata, pool scoping,
 * and user-level organization.
 */
export class CBLIndex {
  private readonly collection: Collection<CBLIndexDocument>;
  private sequenceCounter = 0;
  private readonly blockStore: IBlockStore;
  private readonly parityCount: number;
  private readonly snapshotInterval: number;
  private mutationsSinceSnapshot = 0;
  private readonly headRegistry: IHeadRegistry;
  private readonly dbName: string;
  private readonly enableRecovery: boolean;
  private readonly gossipService?: IGossipService;

  constructor(
    db: BrightChainDb,
    blockStore: IBlockStore,
    options?: CBLIndexOptions,
  ) {
    this.collection = db.collection<CBLIndexDocument>(
      CBL_INDEX_COLLECTION_NAME,
    );
    this.blockStore = blockStore;
    this.parityCount = options?.parityCount ?? 0;
    this.snapshotInterval = options?.snapshotInterval ?? 100;
    this.headRegistry = db.getHeadRegistry();
    this.dbName = db.name;
    this.enableRecovery = options?.enableRecovery ?? true;
    this.gossipService = options?.gossipService;
  }

  /**
   * Generate FEC parity blocks for the collection's current head (metadata) block.
   * This is a best-effort operation — failures are logged but do not propagate.
   */
  private async generateParityForHead(): Promise<void> {
    if (this.parityCount <= 0) return;

    const headBlockId = this.headRegistry.getHead(
      this.dbName,
      CBL_INDEX_COLLECTION_NAME,
    );
    if (!headBlockId) return;

    try {
      await this.blockStore.generateParityBlocks(headBlockId, this.parityCount);
    } catch (err) {
      // Best-effort: log warning but don't fail the mutation
      console.warn(
        `[CBLIndex] FEC parity generation failed for head block ${headBlockId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Track a mutation and trigger an auto-snapshot if the threshold is reached.
   * Auto-snapshots are best-effort — failures are logged but don't break mutations.
   */
  private async trackMutationForAutoSnapshot(): Promise<void> {
    this.mutationsSinceSnapshot++;
    if (
      this.snapshotInterval > 0 &&
      this.mutationsSinceSnapshot >= this.snapshotInterval
    ) {
      try {
        await this.snapshot();
        // snapshot() resets mutationsSinceSnapshot on success
      } catch (err) {
        // Best-effort: log warning but don't fail the mutation
        console.warn(
          '[CBLIndex] Auto-snapshot failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  /**
   * Create a snapshot of the current index state.
   * Serializes all entries (including soft-deleted) and the sequence counter,
   * stores the data as a CBL via the block store, and returns the magnet URL.
   *
   * Persists the snapshot magnet URL in the head registry so recovery can find it.
   * Resets the mutation counter on success so auto-snapshot tracking restarts.
   */
  async snapshot(): Promise<string> {
    // 1. Get ALL entries including soft-deleted for full state
    const entries = await this.collection.find({} as CBLFilter).toArray();

    // 2. Serialize to JSON
    const snapshotData = {
      entries,
      sequenceCounter: this.sequenceCounter,
    };
    const json = JSON.stringify(snapshotData);

    // 3. Convert to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(json);

    // 4. Store as CBL via blockStore.storeCBLWithWhitening
    const result = await this.blockStore.storeCBLWithWhitening(data);

    // 5. Persist the snapshot magnet URL in the head registry for recovery
    await this.headRegistry.setHead(
      this.dbName,
      CBL_INDEX_SNAPSHOT_KEY,
      result.magnetUrl,
    );

    // 6. Reset mutation counter on success
    this.mutationsSinceSnapshot = 0;

    // 7. Return the magnet URL
    return result.magnetUrl;
  }

  /**
   * Initialize the sequence counter from existing entries.
   * Call this after construction to resume from the highest existing sequence number.
   *
   * If the collection is empty and recovery is enabled, attempts recovery in order:
   * (1) latest snapshot, (2) FEC parity rebuild, (3) block store scan.
   */
  async initialize(): Promise<void> {
    const entries = await this.collection
      .find({} as CBLFilter, {
        sort: { sequenceNumber: -1 } as CBLSort,
        limit: 1,
      })
      .toArray();

    if (entries.length > 0) {
      this.sequenceCounter = entries[0].sequenceNumber;
      return;
    }

    // Collection is empty — attempt recovery if enabled
    if (this.enableRecovery) {
      const recovered = await this.recover();
      if (recovered) {
        // Re-read the sequence counter after recovery
        const restored = await this.collection
          .find({} as CBLFilter, {
            sort: { sequenceNumber: -1 } as CBLSort,
            limit: 1,
          })
          .toArray();
        if (restored.length > 0) {
          this.sequenceCounter = restored[0].sequenceNumber;
        }
      }
    }
  }

  /**
   * Attempt to recover the CBL index from available sources.
   * Recovery order:
   *   1. Latest snapshot (magnet URL stored in head registry)
   *   2. FEC parity rebuild of the collection's head block
   *   3. Block store scan for CBL blocks (partial rebuild — metadata lost)
   *
   * @returns true if any recovery method succeeded, false if all failed
   */
  private async recover(): Promise<boolean> {
    // Strategy 1: Restore from latest snapshot
    if (await this.recoverFromSnapshot()) {
      console.info('[CBLIndex] Recovery: restored from snapshot.');
      return true;
    }

    // Strategy 2: FEC parity rebuild of the collection head block
    if (await this.recoverFromFEC()) {
      console.info('[CBLIndex] Recovery: rebuilt from FEC parity blocks.');
      return true;
    }

    // Strategy 3: Partial rebuild by scanning the block store
    if (await this.recoverFromBlockScan()) {
      console.warn(
        '[CBLIndex] Recovery: partial rebuild from block store scan. ' +
          'User metadata (file names, tags, collections) has been lost — ' +
          'only structural data (block IDs, magnet URLs) was recovered.',
      );
      return true;
    }

    console.error(
      '[CBLIndex] Recovery: all recovery methods failed. Starting with empty index.',
    );
    return false;
  }

  /**
   * Strategy 1: Restore from the latest snapshot whose magnet URL is
   * persisted in the head registry.
   */
  private async recoverFromSnapshot(): Promise<boolean> {
    try {
      const magnetUrl = this.headRegistry.getHead(
        this.dbName,
        CBL_INDEX_SNAPSHOT_KEY,
      );
      if (!magnetUrl) return false;

      await this.restoreFromSnapshot(magnetUrl);
      return true;
    } catch (err) {
      console.warn(
        '[CBLIndex] Snapshot recovery failed:',
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }

  /**
   * Strategy 2: Recover the collection's head metadata block via FEC parity,
   * then let the Collection re-load its documents from the recovered block.
   */
  private async recoverFromFEC(): Promise<boolean> {
    try {
      const headBlockId = this.headRegistry.getHead(
        this.dbName,
        CBL_INDEX_COLLECTION_NAME,
      );
      if (!headBlockId) return false;

      // Check if the head block is already accessible
      const exists = await this.blockStore.has(headBlockId);
      if (exists) {
        // Head block exists — the Collection should load normally.
        // This means the collection wasn't truly empty; nothing to recover.
        return false;
      }

      // Attempt FEC recovery of the head block
      const result = await this.blockStore.recoverBlock(headBlockId);
      if (!result.success) return false;

      // Head block recovered — re-initialize the collection by reading entries
      // The Collection infrastructure will pick up the recovered head block
      // on next access. Verify we now have entries.
      const entries = await this.collection
        .find({} as CBLFilter, { limit: 1 })
        .toArray();
      return entries.length > 0;
    } catch (err) {
      console.warn(
        '[CBLIndex] FEC recovery failed:',
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }

  /**
   * Strategy 3: Scan the block store for CBL blocks and rebuild a minimal
   * index from structural data only. This is a last-resort recovery that
   * loses all user metadata (file names, tags, collections, visibility, etc.).
   *
   * Iterates all blocks in all pools, checks for the BrightChain CBL magic
   * prefix (0xBC), and creates minimal index entries for discovered CBL blocks.
   */
  private async recoverFromBlockScan(): Promise<boolean> {
    try {
      if (!isPooledBlockStore(this.blockStore)) return false;

      const pooledStore = this.blockStore;
      const pools = await pooledStore.listPools();
      if (pools.length === 0) return false;

      let recoveredCount = 0;
      const seenHashes = new Set<string>();

      for (const pool of pools) {
        for await (const hash of pooledStore.listBlocksInPool(pool)) {
          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);

          try {
            const data = await pooledStore.getFromPool(pool, hash);
            if (!this.looksLikeCblBlock(data)) continue;

            // This block has the CBL magic prefix. Create a minimal
            // index entry with structural data only.
            const magnetUrl = this.blockStore.generateCBLMagnetUrl(
              hash,
              hash, // placeholder — the XOR pair is unknown
              data.length,
            );

            this.sequenceCounter++;
            const entry: CBLIndexDocument = {
              _id: randomUUID(),
              magnetUrl,
              blockId1: hash,
              blockId2: hash, // placeholder
              blockSize: data.length,
              poolId: pool,
              createdAt: new Date(),
              visibility: CBLVisibility.Private,
              sequenceNumber: this.sequenceCounter,
            };

            await this.collection.insertOne(entry);
            recoveredCount++;
          } catch {
            // Skip blocks that can't be read
            continue;
          }
        }
      }

      return recoveredCount > 0;
    } catch (err) {
      console.warn(
        '[CBLIndex] Block scan recovery failed:',
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }

  /**
   * Heuristic check for whether block data looks like a CBL block.
   * CBL blocks in BrightChain start with the magic prefix 0xBC.
   */
  private looksLikeCblBlock(data: Uint8Array): boolean {
    if (data.length < 4) return false;
    return data[0] === 0xbc;
  }

  /**
   * Add a new CBL index entry.
   * Validates that both referenced block IDs exist in the block store,
   * assigns a monotonically increasing sequence number, and inserts.
   */
  async addEntry(
    entry: Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>,
  ): Promise<ICBLIndexEntry> {
    // Validate block existence
    const [block1Exists, block2Exists] = await Promise.all([
      this.blockStore.has(entry.blockId1),
      this.blockStore.has(entry.blockId2),
    ]);

    const missingBlocks: string[] = [];
    if (!block1Exists) missingBlocks.push(entry.blockId1);
    if (!block2Exists) missingBlocks.push(entry.blockId2);

    if (missingBlocks.length > 0) {
      throw new Error(
        `Block validation failed: blocks not found in store: ${missingBlocks.join(', ')}`,
      );
    }

    this.sequenceCounter++;
    const fullEntry: CBLIndexDocument = {
      ...entry,
      _id: randomUUID(),
      sequenceNumber: this.sequenceCounter,
    };

    await this.collection.insertOne(fullEntry);
    await this.generateParityForHead();
    await this.trackMutationForAutoSnapshot();

    // Announce new entry to peers in the same pool (Req 8.1)
    if (this.gossipService) {
      try {
        await this.gossipService.announceCBLIndexUpdate(fullEntry);
      } catch {
        // Best-effort: gossip failures should not break index mutations
      }
    }

    return fullEntry;
  }

  /**
   * Look up a single entry by its magnet URL.
   */
  async getByMagnetUrl(magnetUrl: string): Promise<ICBLIndexEntry | null> {
    return this.collection.findOne({
      magnetUrl,
      deletedAt: { $exists: false },
    } as CBLFilter);
  }

  /**
   * Look up entries by block ID (matches either blockId1 or blockId2).
   */
  async getByBlockId(blockId: string): Promise<ICBLIndexEntry[]> {
    return this.collection
      .find({
        $or: [{ blockId1: blockId }, { blockId2: blockId }],
        deletedAt: { $exists: false },
      } as CBLFilter)
      .toArray();
  }

  /**
   * Query entries with multi-attribute filtering, pagination, and sort.
   */
  async query(options: ICBLIndexQueryOptions): Promise<ICBLIndexEntry[]> {
    const filter = this.buildFilter(options);
    const sort = this.buildSort(options);

    const cursor = this.collection.find(filter, { sort });

    if (options.offset !== undefined && options.offset > 0) {
      cursor.skip(options.offset);
    }
    if (options.limit !== undefined && options.limit >= 0) {
      cursor.limit(options.limit);
    }

    return cursor.toArray();
  }

  /**
   * Soft-delete an entry by magnet URL (sets deletedAt timestamp).
   */
  async softDelete(magnetUrl: string): Promise<void> {
    await this.collection.updateOne({ magnetUrl } as CBLFilter, {
      $set: { deletedAt: new Date() },
    });
    await this.generateParityForHead();
    await this.trackMutationForAutoSnapshot();

    // Announce soft-deletion to peers in the same pool (Req 8.6)
    if (this.gossipService) {
      try {
        const deletedEntry = await this.collection.findOne({
          magnetUrl,
        } as CBLFilter);
        if (deletedEntry) {
          await this.gossipService.announceCBLIndexDelete(deletedEntry);
        }
      } catch {
        // Best-effort: gossip failures should not break index mutations
      }
    }
  }

  /**
   * Aggregate CBL counts per pool.
   * Returns a Map of poolId → count for all non-deleted entries.
   */
  async getPoolCBLCounts(): Promise<Map<string, number>> {
    const entries = await this.collection
      .find({
        deletedAt: { $exists: false },
        poolId: { $exists: true },
      } as CBLFilter)
      .toArray();

    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.poolId) {
        counts.set(entry.poolId, (counts.get(entry.poolId) ?? 0) + 1);
      }
    }
    return counts;
  }

  /**
   * Find entries whose XOR component blocks exist in pools other than the given poolId.
   * Returns block IDs and the set of pools they appear in.
   */
  async getCrossPoolDependencies(
    poolId: string,
  ): Promise<{ blockId: string; pools: string[] }[]> {
    // Get all entries in the target pool
    const poolEntries = await this.collection
      .find({
        poolId,
        deletedAt: { $exists: false },
      } as CBLFilter)
      .toArray();

    // Collect all block IDs from this pool's entries
    const blockIds = new Set<string>();
    for (const entry of poolEntries) {
      blockIds.add(entry.blockId1);
      blockIds.add(entry.blockId2);
    }

    // Get all non-deleted entries across all pools
    const allEntries = await this.collection
      .find({
        deletedAt: { $exists: false },
      } as CBLFilter)
      .toArray();

    // For each block ID from the target pool, find which other pools reference it
    const blockPoolMap = new Map<string, Set<string>>();
    for (const entry of allEntries) {
      const entryPool = entry.poolId ?? '__default__';
      if (blockIds.has(entry.blockId1)) {
        if (!blockPoolMap.has(entry.blockId1)) {
          blockPoolMap.set(entry.blockId1, new Set());
        }
        blockPoolMap.get(entry.blockId1)!.add(entryPool);
      }
      if (blockIds.has(entry.blockId2)) {
        if (!blockPoolMap.has(entry.blockId2)) {
          blockPoolMap.set(entry.blockId2, new Set());
        }
        blockPoolMap.get(entry.blockId2)!.add(entryPool);
      }
    }

    // Return only blocks that appear in multiple pools
    const dependencies: { blockId: string; pools: string[] }[] = [];
    for (const [blockId, pools] of blockPoolMap) {
      if (pools.size > 1) {
        dependencies.push({ blockId, pools: Array.from(pools) });
      }
    }
    return dependencies;
  }

  /**
   * Get all CBL entries belonging to a specific pool (for pool deletion validation).
   * Returns all non-deleted entries in the pool so the caller can assess
   * whether the pool is safe to delete.
   *
   * Requirement 5.3: report all CBL entries in a pool as part of deletion validation.
   */
  async getPoolEntries(poolId: string): Promise<ICBLIndexEntry[]> {
    return this.collection
      .find({
        poolId,
        deletedAt: { $exists: false },
      } as CBLFilter)
      .toArray();
  }

  /**
   * Share a CBL entry with another user.
   * Adds the userId to the sharedWith array and sets visibility to Shared.
   */
  async shareWith(magnetUrl: string, userId: string): Promise<void> {
    const entry = await this.collection.findOne({
      magnetUrl,
    } as CBLFilter);
    if (!entry) {
      throw new Error(`CBL index entry not found for magnet URL: ${magnetUrl}`);
    }

    const sharedWith = entry.sharedWith ?? [];
    if (!sharedWith.includes(userId)) {
      sharedWith.push(userId);
    }

    await this.collection.updateOne({ magnetUrl } as CBLFilter, {
      $set: {
        sharedWith,
        visibility: CBLVisibility.Shared,
      },
    });
    await this.generateParityForHead();
    await this.trackMutationForAutoSnapshot();
  }

  /**
   * Restore the index from a snapshot.
   * Retrieves the CBL by magnet URL, deserializes the JSON payload,
   * clears the current collection, and re-inserts all entries from the snapshot.
   * Also restores the sequence counter.
   */
  async restoreFromSnapshot(magnetUrl: string): Promise<void> {
    // 1. Parse the magnet URL to get block IDs
    const components = this.blockStore.parseCBLMagnetUrl(magnetUrl);

    // 2. Retrieve the CBL data
    const data = await this.blockStore.retrieveCBL(
      components.blockId1,
      components.blockId2,
      components.block1ParityIds,
      components.block2ParityIds,
    );

    // 3. Deserialize JSON from the Uint8Array
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    const snapshotData: {
      entries: CBLIndexDocument[];
      sequenceCounter: number;
    } = JSON.parse(json);

    // 4. Clear the current collection
    await this.collection.deleteMany({} as CBLFilter);

    // 5. Insert all entries from the snapshot
    if (snapshotData.entries.length > 0) {
      // Restore Date objects from JSON strings
      const restoredEntries = snapshotData.entries.map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined,
      }));
      await this.collection.insertMany(restoredEntries);
    }

    // 6. Restore the sequence counter and reset mutation tracking
    this.sequenceCounter = snapshotData.sequenceCounter;
    this.mutationsSinceSnapshot = 0;
  }

  /**
   * Add a new version of a file.
   * Auto-assigns versionNumber (previous max + 1) and sets previousVersion
   * to the current latest version's magnet URL.
   *
   * IMPORTANT: version numbering considers ALL versions including soft-deleted
   * ones so that the version chain remains intact (Requirement 27.8).
   */
  async addVersion(
    fileId: string,
    entry: Omit<
      ICBLIndexEntry,
      '_id' | 'sequenceNumber' | 'fileId' | 'versionNumber' | 'previousVersion'
    >,
  ): Promise<ICBLIndexEntry> {
    // Look at ALL versions (including soft-deleted) to determine the true
    // latest version number and previous version pointer. This ensures the
    // chain stays intact even when intermediate versions are soft-deleted.
    const latest = await this.getLatestVersion(fileId, true);

    const versionNumber = latest ? (latest.versionNumber ?? 0) + 1 : 1;
    const previousVersion = latest ? latest.magnetUrl : undefined;

    return this.addEntry({
      ...entry,
      fileId,
      versionNumber,
      previousVersion,
    });
  }

  /**
   * Get all versions of a file, ordered by versionNumber ascending.
   *
   * @param fileId - The stable file identifier grouping all versions.
   * @param includeDeleted - When true, includes soft-deleted versions in the
   *   result. Useful for verifying chain integrity (Requirement 27.8).
   *   Defaults to false.
   */
  async getVersionHistory(
    fileId: string,
    includeDeleted = false,
  ): Promise<ICBLIndexEntry[]> {
    const filter: Record<string, unknown> = { fileId };
    if (!includeDeleted) {
      filter['deletedAt'] = { $exists: false };
    }

    return this.collection
      .find(filter as CBLFilter, {
        sort: { versionNumber: 1 } as CBLSort,
      })
      .toArray();
  }

  /**
   * Get the latest version of a file (O(1) via sort + limit 1).
   *
   * @param fileId - The stable file identifier grouping all versions.
   * @param includeDeleted - When true, considers soft-deleted versions.
   *   Used internally by addVersion to maintain chain integrity.
   *   Defaults to false.
   */
  async getLatestVersion(
    fileId: string,
    includeDeleted = false,
  ): Promise<ICBLIndexEntry | null> {
    const filter: Record<string, unknown> = { fileId };
    if (!includeDeleted) {
      filter['deletedAt'] = { $exists: false };
    }

    const results = await this.collection
      .find(filter as CBLFilter, {
        sort: { versionNumber: -1 } as CBLSort,
        limit: 1,
      })
      .toArray();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Merge an incoming CBL index entry from a remote peer (via gossip).
   *
   * Idempotent: if an entry with the same magnet URL already exists and has
   * identical content (blockId1, blockId2, blockSize), the merge is a no-op.
   *
   * Conflict: if an entry with the same magnet URL exists but has different
   * content, both entries are preserved and flagged with `hasConflict: true`
   * and cross-referenced via `conflictsWith`.
   *
   * New entry: if no entry with the magnet URL exists, the entry is inserted
   * with a new local sequence number.
   *
   * @param entry - The incoming entry from a remote peer.
   * @returns The merged entry (existing, new, or conflict-flagged).
   *
   * @see Requirements 8.2, 8.3
   */
  async mergeEntry(entry: ICBLIndexEntry): Promise<ICBLIndexEntry> {
    // Look for an existing entry with the same magnet URL (including soft-deleted)
    const existing = await this.collection.findOne({
      magnetUrl: entry.magnetUrl,
    } as CBLFilter);

    if (existing) {
      // Check if content is identical — idempotent merge
      const sameContent =
        existing.blockId1 === entry.blockId1 &&
        existing.blockId2 === entry.blockId2 &&
        existing.blockSize === entry.blockSize;

      if (sameContent) {
        // Idempotent: same magnet URL, same content — skip
        return existing;
      }

      // Conflict: same magnet URL, different content — preserve both, flag conflict
      // 1. Flag the existing entry
      const existingConflicts = existing.conflictsWith ?? [];
      // We'll use the incoming entry's _id (or generate one) for cross-referencing
      const newId = entry._id || randomUUID();
      if (!existingConflicts.includes(newId)) {
        existingConflicts.push(newId);
      }
      await this.collection.updateOne({ _id: existing._id } as CBLFilter, {
        $set: {
          hasConflict: true,
          conflictsWith: existingConflicts,
        },
      });

      // 2. Insert the incoming entry with conflict flag
      this.sequenceCounter++;
      const conflictEntry: CBLIndexDocument = {
        ...entry,
        _id: newId,
        sequenceNumber: this.sequenceCounter,
        hasConflict: true,
        conflictsWith: [existing._id],
      };
      await this.collection.insertOne(conflictEntry);
      await this.generateParityForHead();
      await this.trackMutationForAutoSnapshot();

      return conflictEntry;
    }

    // No existing entry — insert as new with a local sequence number
    this.sequenceCounter++;
    const newEntry: CBLIndexDocument = {
      ...entry,
      _id: entry._id || randomUUID(),
      sequenceNumber: this.sequenceCounter,
    };
    await this.collection.insertOne(newEntry);
    await this.generateParityForHead();
    await this.trackMutationForAutoSnapshot();

    return newEntry;
  }

  /**
   * Apply a soft-delete from a remote peer (via gossip).
   *
   * If the entry exists locally and is not already soft-deleted, marks it
   * as deleted with the provided timestamp. If the entry doesn't exist
   * locally or is already deleted, this is a no-op.
   *
   * @param magnetUrl - The magnet URL of the entry to soft-delete.
   * @param deletedAt - The deletion timestamp from the remote peer.
   *
   * @see Requirements 8.6
   */
  async mergeSoftDelete(magnetUrl: string, deletedAt: Date): Promise<void> {
    const existing = await this.collection.findOne({
      magnetUrl,
    } as CBLFilter);

    if (!existing) {
      // Entry doesn't exist locally — nothing to delete
      return;
    }

    if (existing.deletedAt) {
      // Already soft-deleted — no-op
      return;
    }

    await this.collection.updateOne({ magnetUrl } as CBLFilter, {
      $set: { deletedAt },
    });
    await this.generateParityForHead();
    await this.trackMutationForAutoSnapshot();
  }

  /**
   * Get a CBL index manifest for a specific pool.
   * Returns a list of (magnetUrl, sequenceNumber) pairs for all non-deleted
   * entries in the given pool. Used during pool-scoped reconciliation to
   * compare CBL index state between nodes.
   *
   * @param poolId - The pool to generate a manifest for
   * @param nodeId - The local node ID to include in the manifest
   * @returns A CBLIndexManifest for the specified pool
   * @see Requirements 8.4
   */
  async getCBLIndexManifest(
    poolId: string,
    nodeId: string,
  ): Promise<CBLIndexManifest> {
    const entries = await this.collection
      .find({
        poolId,
        deletedAt: { $exists: false },
      } as CBLFilter)
      .toArray();

    const manifestEntries: CBLIndexManifestEntry[] = entries.map((e) => ({
      magnetUrl: e.magnetUrl,
      sequenceNumber: e.sequenceNumber,
    }));

    return {
      poolId,
      nodeId,
      entries: manifestEntries,
      generatedAt: new Date(),
    };
  }

  /**
   * Reconcile the local CBL index for a pool against a remote manifest.
   * Identifies entries present in the remote manifest but missing locally,
   * and merges them using the provided entry fetcher.
   *
   * @param poolId - The pool being reconciled
   * @param remoteManifest - The remote node's CBL index manifest
   * @param fetchEntry - Callback to fetch a full CBL index entry from the remote peer by magnet URL
   * @returns The number of entries merged
   * @see Requirements 8.4
   */
  async reconcileCBLIndex(
    poolId: string,
    remoteManifest: CBLIndexManifest,
    fetchEntry: (magnetUrl: string) => Promise<ICBLIndexEntry | null>,
  ): Promise<number> {
    // Build a set of local magnet URLs for this pool (including soft-deleted)
    const localEntries = await this.collection
      .find({
        poolId,
      } as CBLFilter)
      .toArray();

    const localMagnetUrls = new Set(localEntries.map((e) => e.magnetUrl));

    // Find entries in the remote manifest that are missing locally
    const missingEntries = remoteManifest.entries.filter(
      (re) => !localMagnetUrls.has(re.magnetUrl),
    );

    let merged = 0;
    for (const missing of missingEntries) {
      const fullEntry = await fetchEntry(missing.magnetUrl);
      if (fullEntry) {
        await this.mergeEntry(fullEntry);
        merged++;
      }
    }

    return merged;
  }

  /**
   * Build a FilterQuery from ICBLIndexQueryOptions.
   */
  private buildFilter(options: ICBLIndexQueryOptions): CBLFilter {
    const conditions: CBLFilter[] = [];

    // Exclude soft-deleted entries unless explicitly requested
    if (!options.includeDeleted) {
      conditions.push({
        deletedAt: { $exists: false },
      } as CBLFilter);
    }

    if (options.poolId !== undefined) {
      conditions.push({ poolId: options.poolId } as CBLFilter);
    }

    if (options.createdBy !== undefined) {
      conditions.push({ createdBy: options.createdBy } as CBLFilter);
    }

    if (options.visibility !== undefined) {
      conditions.push({ visibility: options.visibility } as CBLFilter);
    }

    if (options.userCollection !== undefined) {
      conditions.push({
        userCollection: options.userCollection,
      } as CBLFilter);
    }

    if (options.fileId !== undefined) {
      conditions.push({ fileId: options.fileId } as CBLFilter);
    }

    if (options.fileName !== undefined) {
      conditions.push({
        'metadata.fileName': options.fileName,
      } as CBLFilter);
    }

    if (options.mimeType !== undefined) {
      conditions.push({
        'metadata.mimeType': options.mimeType,
      } as CBLFilter);
    }

    if (options.tags !== undefined && options.tags.length > 0) {
      // Entries must have ALL specified tags
      for (const tag of options.tags) {
        conditions.push({
          'metadata.tags': { $elemMatch: { $eq: tag } },
        } as CBLFilter);
      }
    }

    // Visibility-based access control: when requestingUserId is set,
    // only return entries the user is allowed to see.
    //   - Public: visible to everyone
    //   - Private: visible only to the creator
    //   - Shared: visible to the creator and users in sharedWith
    if (options.requestingUserId !== undefined) {
      conditions.push({
        $or: [
          // Public entries are always visible
          { visibility: CBLVisibility.Public },
          // Private entries are visible only to the creator
          {
            $and: [
              { visibility: CBLVisibility.Private },
              { createdBy: options.requestingUserId },
            ],
          },
          // Shared entries are visible to the creator or sharedWith users
          {
            $and: [
              { visibility: CBLVisibility.Shared },
              {
                $or: [
                  { createdBy: options.requestingUserId },
                  // MongoDB-style array element match: if sharedWith is an
                  // array of strings, matching a plain string value checks
                  // whether the string is an element of the array.
                  { sharedWith: options.requestingUserId },
                ],
              },
            ],
          },
        ],
      } as CBLFilter);
    }

    if (conditions.length === 0) {
      return {} as CBLFilter;
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    return { $and: conditions } as CBLFilter;
  }

  /**
   * Build a SortSpec from ICBLIndexQueryOptions.
   */
  private buildSort(options: ICBLIndexQueryOptions): CBLSort | undefined {
    if (!options.sortBy) return undefined;

    const direction = options.sortOrder === 'desc' ? -1 : 1;

    switch (options.sortBy) {
      case 'createdAt':
        return { createdAt: direction } as CBLSort;
      case 'fileName':
        return { 'metadata.fileName': direction } as CBLSort;
      case 'originalSize':
        return { 'metadata.originalSize': direction } as CBLSort;
      case 'versionNumber':
        return { versionNumber: direction } as CBLSort;
      default:
        return undefined;
    }
  }
}
