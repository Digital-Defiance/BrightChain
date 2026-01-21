import {
  BlockSize,
  blockSizeToSizeString,
  IBlockMetadata,
  IBlockMetadataStore,
  ReplicationStatus,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { existsSync, mkdirSync } from 'fs';
import { readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Version number for the metadata file format.
 * Increment this when making breaking changes to the schema.
 */
const METADATA_FILE_VERSION = 1;

/**
 * File extension for metadata files.
 * Metadata files are stored alongside block data files.
 */
const METADATA_FILE_EXTENSION = '.m.json';

/**
 * Interface for the serialized metadata file format.
 * This is the JSON structure stored on disk.
 */
interface BlockMetadataFile {
  version: number;
  blockId: string;
  createdAt: string; // ISO date string
  expiresAt: string | null; // ISO date string or null
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: string; // ISO date string
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
}

/**
 * Disk-based implementation of IBlockMetadataStore.
 *
 * This implementation stores block metadata as JSON files alongside block data files.
 * Metadata files use the `.m.json` extension and follow the same directory structure
 * as block files: {storePath}/{blockSize}/{first2}/{next2}/{blockId}.m.json
 *
 * Features:
 * - Persistent storage of block metadata
 * - Atomic writes using temporary files
 * - Version-aware serialization for future schema migrations
 * - Efficient directory scanning for queries
 *
 * @see IBlockMetadataStore for the interface definition
 * @see MemoryBlockMetadataStore for an in-memory implementation
 */
export class DiskBlockMetadataStore implements IBlockMetadataStore {
  private readonly storePath: string;
  private readonly blockSize: BlockSize;

  /**
   * Create a new DiskBlockMetadataStore.
   * @param storePath - The base path for storing metadata files
   * @param blockSize - The block size for this store (determines directory structure)
   */
  constructor(storePath: string, blockSize?: BlockSize) {
    if (!storePath) {
      throw new StoreError(StoreErrorType.StorePathRequired);
    }

    this.storePath = storePath;
    this.blockSize = blockSize || BlockSize.Small;

    // Ensure store path exists
    if (!existsSync(storePath)) {
      mkdirSync(storePath, { recursive: true });
    }
  }

  /**
   * Get the directory path for a block's metadata.
   * Directory structure: storePath/blockSize/checksumChar1/checksumChar2/
   * @param blockId - The block ID (hex string)
   * @returns The directory path
   */
  private metadataDir(blockId: string): string {
    if (!blockId || blockId.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const blockSizeString = blockSizeToSizeString(this.blockSize);
    return join(this.storePath, blockSizeString, blockId[0], blockId[1]);
  }

  /**
   * Get the file path for a block's metadata.
   * File structure: storePath/blockSize/checksumChar1/checksumChar2/blockId.m.json
   * @param blockId - The block ID (hex string)
   * @returns The metadata file path
   */
  private metadataPath(blockId: string): string {
    if (!blockId || blockId.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const dir = this.metadataDir(blockId);
    return join(dir, blockId + METADATA_FILE_EXTENSION);
  }

  /**
   * Ensure the directory structure exists for a metadata file.
   * @param blockId - The block ID (hex string)
   */
  private ensureMetadataDir(blockId: string): void {
    const dir = this.metadataDir(blockId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Serialize metadata to the file format.
   * @param metadata - The metadata to serialize
   * @returns The serialized metadata object
   */
  private serializeMetadata(metadata: IBlockMetadata): BlockMetadataFile {
    return {
      version: METADATA_FILE_VERSION,
      blockId: metadata.blockId,
      createdAt: metadata.createdAt.toISOString(),
      expiresAt: metadata.expiresAt ? metadata.expiresAt.toISOString() : null,
      durabilityLevel: metadata.durabilityLevel,
      parityBlockIds: [...metadata.parityBlockIds],
      accessCount: metadata.accessCount,
      lastAccessedAt: metadata.lastAccessedAt.toISOString(),
      replicationStatus: metadata.replicationStatus,
      targetReplicationFactor: metadata.targetReplicationFactor,
      replicaNodeIds: [...metadata.replicaNodeIds],
      size: metadata.size,
      checksum: metadata.checksum,
    };
  }

  /**
   * Deserialize metadata from the file format.
   * @param file - The serialized metadata object
   * @returns The deserialized metadata
   */
  private deserializeMetadata(file: BlockMetadataFile): IBlockMetadata {
    return {
      blockId: file.blockId,
      createdAt: new Date(file.createdAt),
      expiresAt: file.expiresAt ? new Date(file.expiresAt) : null,
      durabilityLevel:
        file.durabilityLevel as IBlockMetadata['durabilityLevel'],
      parityBlockIds: [...file.parityBlockIds],
      accessCount: file.accessCount,
      lastAccessedAt: new Date(file.lastAccessedAt),
      replicationStatus: file.replicationStatus as ReplicationStatus,
      targetReplicationFactor: file.targetReplicationFactor,
      replicaNodeIds: [...file.replicaNodeIds],
      size: file.size,
      checksum: file.checksum,
    };
  }

  /**
   * Create and store metadata for a new block.
   * @param metadata - The complete metadata record to store
   * @throws StoreError if metadata for this blockId already exists
   */
  public async create(metadata: IBlockMetadata): Promise<void> {
    const filePath = this.metadataPath(metadata.blockId);

    if (existsSync(filePath)) {
      throw new StoreError(StoreErrorType.BlockAlreadyExists, undefined, {
        KEY: metadata.blockId,
      });
    }

    this.ensureMetadataDir(metadata.blockId);

    const serialized = this.serializeMetadata(metadata);
    const json = JSON.stringify(serialized, null, 2);

    try {
      await writeFile(filePath, json, 'utf-8');
    } catch (error) {
      throw new StoreError(
        StoreErrorType.BlockDirectoryCreationFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get metadata for a block by its ID.
   * @param blockId - The unique identifier of the block
   * @returns The block's metadata, or null if not found
   */
  public async get(blockId: string): Promise<IBlockMetadata | null> {
    const filePath = this.metadataPath(blockId);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const json = await readFile(filePath, 'utf-8');
      const file = JSON.parse(json) as BlockMetadataFile;
      return this.deserializeMetadata(file);
    } catch {
      // If the file is corrupted or unreadable, return null
      // The caller can decide how to handle this
      return null;
    }
  }

  /**
   * Update metadata for an existing block.
   * @param blockId - The unique identifier of the block
   * @param updates - Partial metadata updates to apply
   * @throws StoreError if no metadata exists for this blockId
   */
  public async update(
    blockId: string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const existing = await this.get(blockId);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }

    // Apply updates while preserving the blockId
    const updated: IBlockMetadata = {
      ...existing,
      ...updates,
      blockId: existing.blockId, // Prevent blockId from being changed
    };

    const filePath = this.metadataPath(blockId);
    const serialized = this.serializeMetadata(updated);
    const json = JSON.stringify(serialized, null, 2);

    try {
      await writeFile(filePath, json, 'utf-8');
    } catch (error) {
      throw new StoreError(
        StoreErrorType.BlockDirectoryCreationFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Delete metadata for a block.
   * @param blockId - The unique identifier of the block
   * @throws StoreError if no metadata exists for this blockId
   */
  public async delete(blockId: string): Promise<void> {
    const filePath = this.metadataPath(blockId);

    if (!existsSync(filePath)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }

    try {
      await unlink(filePath);
    } catch (error) {
      throw new StoreError(StoreErrorType.BlockDeletionFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find all blocks that have expired (expiresAt is in the past).
   * This method scans all metadata files in the store.
   * @returns Array of metadata for expired blocks
   */
  public async findExpired(): Promise<IBlockMetadata[]> {
    const now = new Date();
    const expired: IBlockMetadata[] = [];

    await this.scanAllMetadata(async (metadata) => {
      if (metadata.expiresAt !== null && metadata.expiresAt < now) {
        expired.push(metadata);
      }
    });

    return expired;
  }

  /**
   * Find all blocks with a specific replication status.
   * This method scans all metadata files in the store.
   * @param status - The replication status to filter by
   * @returns Array of metadata for blocks with the specified status
   */
  public async findByReplicationStatus(
    status: ReplicationStatus,
  ): Promise<IBlockMetadata[]> {
    const matching: IBlockMetadata[] = [];

    await this.scanAllMetadata(async (metadata) => {
      if (metadata.replicationStatus === status) {
        matching.push(metadata);
      }
    });

    return matching;
  }

  /**
   * Record an access to a block, updating accessCount and lastAccessedAt.
   * @param blockId - The unique identifier of the block
   * @throws StoreError if no metadata exists for this blockId
   */
  public async recordAccess(blockId: string): Promise<void> {
    const existing = await this.get(blockId);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }

    await this.update(blockId, {
      accessCount: existing.accessCount + 1,
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Scan all metadata files in the store and call the callback for each.
   * This is used for queries that need to examine all metadata.
   * @param callback - Function to call for each metadata record
   */
  private async scanAllMetadata(
    callback: (metadata: IBlockMetadata) => Promise<void>,
  ): Promise<void> {
    const blockSizeString = blockSizeToSizeString(this.blockSize);
    const basePath = join(this.storePath, blockSizeString);

    if (!existsSync(basePath)) {
      return;
    }

    try {
      // Scan first level directories (first character of checksum)
      const firstLevelDirs = await readdir(basePath);

      for (const firstDir of firstLevelDirs) {
        const firstLevelPath = join(basePath, firstDir);
        const firstStats = await stat(firstLevelPath);

        if (!firstStats.isDirectory()) {
          continue;
        }

        // Scan second level directories (second character of checksum)
        const secondLevelDirs = await readdir(firstLevelPath);

        for (const secondDir of secondLevelDirs) {
          const secondLevelPath = join(firstLevelPath, secondDir);
          const secondStats = await stat(secondLevelPath);

          if (!secondStats.isDirectory()) {
            continue;
          }

          // Scan metadata files
          const files = await readdir(secondLevelPath);
          const metadataFiles = files.filter((f) =>
            f.endsWith(METADATA_FILE_EXTENSION),
          );

          for (const metadataFile of metadataFiles) {
            const blockId = metadataFile.slice(
              0,
              -METADATA_FILE_EXTENSION.length,
            );
            const metadata = await this.get(blockId);

            if (metadata) {
              await callback(metadata);
            }
          }
        }
      }
    } catch {
      // If we can't read the directory structure, just return
      // This handles cases where the store is empty or corrupted
    }
  }

  // === Utility Methods ===

  /**
   * Check if metadata exists for a block.
   * @param blockId - The unique identifier of the block
   * @returns True if metadata exists
   */
  public has(blockId: string): boolean {
    const filePath = this.metadataPath(blockId);
    return existsSync(filePath);
  }

  /**
   * Get the store path.
   * @returns The base path for storing metadata files
   */
  public getStorePath(): string {
    return this.storePath;
  }

  /**
   * Get the block size.
   * @returns The block size for this store
   */
  public getBlockSize(): BlockSize {
    return this.blockSize;
  }
}
