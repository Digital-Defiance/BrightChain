import {
  BaseBlock,
  BlockHandle,
  BlockSize,
  blockSizeToSizeString,
  BlockStoreOptions,
  BrightenResult,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  createBlockHandle,
  createDefaultBlockMetadata,
  DurabilityLevel,
  FecError,
  FecErrorType,
  getGlobalServiceProvider,
  getParityCountForDurability,
  IBlockMetadata,
  IBlockStore,
  IFecService,
  padToBlockSize,
  ParityData,
  RawDataBlock,
  RecoveryResult,
  ReplicationStatus,
  StoreError,
  StoreErrorType,
  unpadCblData,
  xorArrays,
  XorService,
} from '@brightchain/brightchain-lib';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import {
  access,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from 'fs/promises';
import { join } from 'path';

/**
 * DiskBlockStore provides filesystem-backed block storage implementing IBlockStore.
 *
 * Storage layout (simple flat structure):
 *   {basePath}/blocks/{checksumHex}        - Raw block data files
 *   {basePath}/meta/{checksumHex}.json     - Block metadata as JSON
 *   {basePath}/parity/{checksumHex}/       - Parity block data files
 *
 * This class also serves as a base class for DiskBlockAsyncStore and DiskBlockSyncStore,
 * which use a more complex directory layout via the protected helper methods.
 *
 * @see IBlockStore for the interface definition
 */
export class DiskBlockStore implements IBlockStore {
  protected readonly _storePath: string;
  protected readonly _blockSize: BlockSize;

  /**
   * Optional FEC service for parity generation and recovery.
   */
  protected fecService: IFecService | null = null;

  /**
   * Track whether the blocks/meta directories have been created.
   */
  private dirsEnsured = false;

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    if (!config.storePath) {
      throw new StoreError(StoreErrorType.StorePathRequired);
    }

    if (!config.blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeRequired);
    }

    this._storePath = config.storePath;
    this._blockSize = config.blockSize;

    // Ensure store path exists
    if (!existsSync(config.storePath)) {
      mkdirSync(config.storePath, { recursive: true });
    }
  }

  // ─── Public Accessors ───────────────────────────────────────────────

  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  public get storePath(): string {
    return this._storePath;
  }

  public setFecService(fecService: IFecService | null): void {
    this.fecService = fecService;
  }

  public getFecService(): IFecService | null {
    return this.fecService;
  }

  // ─── Simple Layout Path Helpers (for IBlockStore implementation) ─────

  /** Directory for raw block data files: {basePath}/blocks/ */
  private get blocksDir(): string {
    return join(this._storePath, 'blocks');
  }

  /** Directory for metadata JSON files: {basePath}/meta/ */
  private get metaDir(): string {
    return join(this._storePath, 'meta');
  }

  /** Directory for parity data: {basePath}/parity/ */
  private get parityDir(): string {
    return join(this._storePath, 'parity');
  }

  /** File path for a block's raw data */
  private blockFilePath(checksumHex: string): string {
    return join(this.blocksDir, checksumHex);
  }

  /** File path for a block's metadata JSON */
  private metaFilePath(checksumHex: string): string {
    return join(this.metaDir, `${checksumHex}.json`);
  }

  /** Directory path for a block's parity files */
  private parityBlockDir(checksumHex: string): string {
    return join(this.parityDir, checksumHex);
  }

  /** Ensure blocks/ and meta/ directories exist (lazy, once per instance) */
  private async ensureDirs(): Promise<void> {
    if (this.dirsEnsured) return;
    await mkdir(this.blocksDir, { recursive: true });
    await mkdir(this.metaDir, { recursive: true });
    this.dirsEnsured = true;
  }

  // ─── Key Conversion Helpers ─────────────────────────────────────────

  protected keyToHex(key: Checksum | string): string {
    return typeof key === 'string' ? key : key.toHex();
  }

  protected hexToChecksum(hex: string): Checksum {
    return Checksum.fromHex(hex);
  }

  // ─── Protected Path Helpers (for subclass compatibility) ────────────

  /**
   * Get the directory path for a block (complex layout used by subclasses).
   * Directory structure: storePath/blockSize/checksumChar1/checksumChar2/
   */
  protected blockDir(blockId: Checksum, blockSize: BlockSize): string {
    const checksumString = blockId.toHex();
    if (checksumString.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const blockSizeString = blockSizeToSizeString(blockSize);
    return join(
      this._storePath,
      blockSizeString,
      checksumString[0],
      checksumString[1],
    );
  }

  /**
   * Get the file path for a block (complex layout used by subclasses).
   * File structure: storePath/blockSize/checksumChar1/checksumChar2/fullChecksum
   */
  protected blockPath(blockId: Checksum, blockSize: BlockSize): string {
    const checksumString = blockId.toHex();
    if (checksumString.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const blockSizeString = blockSizeToSizeString(blockSize);
    return join(
      this._storePath,
      blockSizeString,
      checksumString[0],
      checksumString[1],
      checksumString,
    );
  }

  /**
   * Get the metadata file path for a block (complex layout used by subclasses).
   */
  protected metadataPath(blockId: Checksum, blockSize: BlockSize): string {
    return this.blockPath(blockId, blockSize) + '.m.json';
  }

  /**
   * Ensure the directory structure exists for a block (complex layout used by subclasses).
   */
  protected ensureBlockPath(blockId: Checksum, blockSize: BlockSize): void {
    const dir = this.blockDir(blockId, blockSize);
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
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
  }

  // ─── IBlockStore: Core Block Operations ─────────────────────────────

  public async has(key: Checksum | string): Promise<boolean> {
    const keyHex = this.keyToHex(key);
    try {
      await access(this.blockFilePath(keyHex));
      return true;
    } catch {
      return false;
    }
  }

  public async getData(key: Checksum): Promise<RawDataBlock> {
    const keyHex = this.keyToHex(key);
    const filePath = this.blockFilePath(keyHex);

    try {
      await access(filePath);
    } catch {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const data = await readFile(filePath);
    const block = new RawDataBlock(this._blockSize, new Uint8Array(data));

    // Record access in metadata
    await this.touchMetadataAccess(keyHex);

    return block;
  }

  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyHex = block.idChecksum.toHex();
    const filePath = this.blockFilePath(keyHex);

    // Idempotent — block already exists
    try {
      await access(filePath);
      return;
    } catch {
      // File doesn't exist, proceed to write
    }

    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    await this.ensureDirs();

    // Write block data
    await writeFile(filePath, block.data);

    // Write metadata
    const metadata = createDefaultBlockMetadata(
      keyHex,
      block.data.length,
      keyHex,
      options,
    );
    await this.writeMetadata(keyHex, metadata);

    // Generate parity blocks based on durability level
    const durabilityLevel =
      options?.durabilityLevel ?? DurabilityLevel.Standard;
    const parityCount = getParityCountForDurability(durabilityLevel);

    if (parityCount > 0 && this.fecService) {
      try {
        await this.generateParityBlocks(keyHex, parityCount);
      } catch {
        // Parity generation failure is non-fatal; block is still stored
      }
    }
  }

  public async deleteData(key: Checksum): Promise<void> {
    const keyHex = this.keyToHex(key);
    const filePath = this.blockFilePath(keyHex);

    try {
      await access(filePath);
    } catch {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Delete block data
    try {
      await unlink(filePath);
    } catch (error) {
      throw new StoreError(StoreErrorType.BlockDeletionFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }

    // Delete metadata
    try {
      await unlink(this.metaFilePath(keyHex));
    } catch {
      // Metadata may not exist; non-fatal
    }

    // Delete parity directory
    try {
      const parDir = this.parityBlockDir(keyHex);
      await access(parDir);
      const files = await readdir(parDir);
      for (const f of files) {
        await unlink(join(parDir, f));
      }
      // Remove the directory itself via rmdir-like approach
      const { rmdir } = await import('fs/promises');
      await rmdir(parDir);
    } catch {
      // Parity data may not exist; non-fatal
    }
  }

  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    try {
      await access(this.blocksDir);
    } catch {
      return [];
    }

    const files = await readdir(this.blocksDir);
    const actualCount = Math.min(count, files.length);
    const shuffled = [...files].sort(() => Math.random() - 0.5);
    const result: Checksum[] = [];

    for (let i = 0; i < actualCount; i++) {
      try {
        result.push(Checksum.fromHex(shuffled[i]));
      } catch {
        // Skip files with non-checksum names
      }
    }

    return result;
  }

  public get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T> {
    const keyHex = this.keyToHex(key);
    const filePath = this.blockFilePath(keyHex);

    if (!existsSync(filePath)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const data = readFileSync(filePath);
    const checksum = typeof key === 'string' ? this.hexToChecksum(key) : key;

    return createBlockHandle<T>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      RawDataBlock as any,
      this._blockSize,
      new Uint8Array(data),
      checksum,
      true,
      true,
    );
  }

  public async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const block = new RawDataBlock(this._blockSize, data);
    await this.setData(block, options);
  }

  public async delete(key: Checksum | string): Promise<void> {
    const checksum = typeof key === 'string' ? this.hexToChecksum(key) : key;
    await this.deleteData(checksum);
  }

  // ─── IBlockStore: Metadata Operations ───────────────────────────────

  public async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    const keyHex = this.keyToHex(key);
    return this.readMetadata(keyHex);
  }

  public async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);
    const existing = await this.readMetadata(keyHex);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const updated: IBlockMetadata = {
      ...existing,
      ...updates,
      blockId: existing.blockId, // Prevent blockId from being changed
    };
    await this.writeMetadata(keyHex, updated);
  }

  // ─── IBlockStore: FEC/Durability Operations ─────────────────────────

  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    const keyHex = this.keyToHex(key);

    if (!this.fecService) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available',
      });
    }

    if (!(await this.has(key))) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available in this environment',
      });
    }

    const blockData = await readFile(this.blockFilePath(keyHex));
    const parityData = await this.fecService.createParityData(
      new Uint8Array(blockData),
      parityCount,
    );

    // Store parity data to disk
    const parDir = this.parityBlockDir(keyHex);
    await mkdir(parDir, { recursive: true });

    const checksumService = getGlobalServiceProvider().checksumService;
    const parityBlockIds: string[] = [];

    for (let i = 0; i < parityData.length; i++) {
      const parityId = checksumService
        .calculateChecksum(parityData[i].data)
        .toHex();
      parityBlockIds.push(parityId);
      await writeFile(
        join(parDir, `${i}.parity`),
        JSON.stringify({
          id: parityId,
          index: parityData[i].index,
          data: Array.from(parityData[i].data),
        }),
      );
    }

    // Update metadata with parity block IDs
    const meta = await this.readMetadata(keyHex);
    if (meta) {
      await this.writeMetadata(keyHex, { ...meta, parityBlockIds });
    }

    return parityBlockIds.map((id) => Checksum.fromHex(id));
  }

  public async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    const keyHex = this.keyToHex(key);
    const meta = await this.readMetadata(keyHex);
    if (!meta) return [];
    return meta.parityBlockIds.map((id) => Checksum.fromHex(id));
  }

  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    const keyHex = this.keyToHex(key);

    if (!this.fecService) {
      return { success: false, error: 'FEC service is not available' };
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'FEC service is not available in this environment',
      };
    }

    // Load parity data from disk
    const parityData = await this.loadParityFromDisk(keyHex);
    if (parityData.length === 0) {
      return { success: false, error: 'No parity data available' };
    }

    const meta = await this.readMetadata(keyHex);
    if (!meta) {
      return { success: false, error: 'Block metadata not found' };
    }

    try {
      let corruptedData: Uint8Array | null = null;
      try {
        const raw = await readFile(this.blockFilePath(keyHex));
        corruptedData = new Uint8Array(raw);
      } catch {
        // Block may be missing entirely
      }

      const result = await this.fecService.recoverFileData(
        corruptedData,
        parityData,
        meta.size,
      );

      if (result.recovered) {
        const recoveredBlock = new RawDataBlock(
          this._blockSize,
          new Uint8Array(result.data),
        );
        await this.ensureDirs();
        await writeFile(this.blockFilePath(keyHex), recoveredBlock.data);
        return { success: true, recoveredBlock };
      }

      return {
        success: false,
        error: 'Recovery failed: insufficient parity data',
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown recovery error',
      };
    }
  }

  public async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    const keyHex = this.keyToHex(key);

    if (!this.fecService) {
      return this.has(key);
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      return this.has(key);
    }

    try {
      await access(this.blockFilePath(keyHex));
    } catch {
      return false;
    }

    const parityData = await this.loadParityFromDisk(keyHex);
    if (parityData.length === 0) {
      return true; // No parity data — can only verify block exists
    }

    try {
      const blockData = await readFile(this.blockFilePath(keyHex));
      return await this.fecService.verifyFileIntegrity(
        new Uint8Array(blockData),
        parityData,
      );
    } catch {
      return false;
    }
  }

  // ─── IBlockStore: Replication Operations ─────────────────────────────

  public async getBlocksPendingReplication(): Promise<Checksum[]> {
    return this.findBlocksByReplicationStatus(ReplicationStatus.Pending, true);
  }

  public async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    return this.findBlocksByReplicationStatus(
      ReplicationStatus.UnderReplicated,
      false,
    );
  }

  public async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);
    const meta = await this.readMetadata(keyHex);
    if (!meta) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const replicaNodeIds = [...meta.replicaNodeIds];
    if (!replicaNodeIds.includes(nodeId)) {
      replicaNodeIds.push(nodeId);
    }

    let replicationStatus = meta.replicationStatus;
    if (replicaNodeIds.length >= meta.targetReplicationFactor) {
      replicationStatus = ReplicationStatus.Replicated;
    } else if (replicaNodeIds.length > 0) {
      replicationStatus = ReplicationStatus.UnderReplicated;
    }

    await this.writeMetadata(keyHex, {
      ...meta,
      replicaNodeIds,
      replicationStatus,
    });
  }

  public async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);
    const meta = await this.readMetadata(keyHex);
    if (!meta) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const replicaNodeIds = meta.replicaNodeIds.filter((id) => id !== nodeId);

    let replicationStatus = meta.replicationStatus;
    if (meta.targetReplicationFactor > 0) {
      if (replicaNodeIds.length >= meta.targetReplicationFactor) {
        replicationStatus = ReplicationStatus.Replicated;
      } else if (replicaNodeIds.length > 0) {
        replicationStatus = ReplicationStatus.UnderReplicated;
      } else {
        replicationStatus = ReplicationStatus.Pending;
      }
    }

    await this.writeMetadata(keyHex, {
      ...meta,
      replicaNodeIds,
      replicationStatus,
    });
  }

  // ─── IBlockStore: XOR Brightening Operations ────────────────────────

  public async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const keyHex = this.keyToHex(key);

    if (!(await this.has(key))) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    const randomBlockChecksums = await this.getRandomBlocks(randomBlockCount);
    if (randomBlockChecksums.length < randomBlockCount) {
      throw new StoreError(StoreErrorType.InsufficientRandomBlocks, undefined, {
        REQUESTED: randomBlockCount.toString(),
        AVAILABLE: randomBlockChecksums.length.toString(),
      });
    }

    const sourceData = await readFile(this.blockFilePath(keyHex));
    const allBlockData: Uint8Array[] = [new Uint8Array(sourceData)];

    for (const checksum of randomBlockChecksums) {
      const block = await this.getData(checksum);
      allBlockData.push(block.data);
    }

    const brightenedData = XorService.xorMultiple(allBlockData);
    const brightenedBlock = new RawDataBlock(this._blockSize, brightenedData);
    const brightenedBlockId = brightenedBlock.idChecksum.toHex();

    if (!(await this.has(brightenedBlockId))) {
      await this.setData(brightenedBlock);
    }

    return {
      brightenedBlockId,
      randomBlockIds: randomBlockChecksums.map((c) => c.toHex()),
      originalBlockId: keyHex,
    };
  }

  // ─── IBlockStore: CBL Whitening Operations ──────────────────────────

  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    if (!cblData || cblData.length === 0) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: 'CBL data cannot be empty',
      });
    }

    const paddedCbl = padToBlockSize(cblData, this._blockSize);
    if (paddedCbl.length > this._blockSize) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `CBL data too large: padded size (${paddedCbl.length}) exceeds block size (${this._blockSize})`,
      });
    }

    const randomBlock = await this.selectOrGenerateRandomizer(paddedCbl.length);
    const xorResult = xorArrays(paddedCbl, randomBlock);

    let block1Stored = false;
    let block1Id = '';

    try {
      const block1 = new RawDataBlock(this._blockSize, randomBlock);
      const block1Checksum = block1.idChecksum;

      if (!(await this.has(block1Checksum))) {
        await this.setData(block1, options);
        block1Stored = true;
      }
      block1Id = block1Checksum.toHex();

      const block2 = new RawDataBlock(this._blockSize, xorResult);
      await this.setData(block2, options);
      const block2Id = block2.idChecksum.toHex();

      let block1ParityIds: string[] | undefined;
      let block2ParityIds: string[] | undefined;

      const block1Meta = await this.getMetadata(block1Id);
      if (block1Meta?.parityBlockIds?.length) {
        block1ParityIds = block1Meta.parityBlockIds;
      }

      const block2Meta = await this.getMetadata(block2Id);
      if (block2Meta?.parityBlockIds?.length) {
        block2ParityIds = block2Meta.parityBlockIds;
      }

      const magnetUrl = this.generateCBLMagnetUrl(
        block1Id,
        block2Id,
        this._blockSize,
        block1ParityIds,
        block2ParityIds,
        options?.isEncrypted,
      );

      return {
        blockId1: block1Id,
        blockId2: block2Id,
        blockSize: this._blockSize,
        magnetUrl,
        block1ParityIds,
        block2ParityIds,
        isEncrypted: options?.isEncrypted,
      };
    } catch (error) {
      if (block1Stored && block1Id) {
        try {
          await this.deleteData(this.hexToChecksum(block1Id));
        } catch {
          // Ignore rollback errors
        }
      }
      throw error;
    }
  }

  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    const b1Checksum =
      typeof blockId1 === 'string' ? this.hexToChecksum(blockId1) : blockId1;
    let block1Data: RawDataBlock;
    try {
      block1Data = await this.getData(b1Checksum);
    } catch (error) {
      if (block1ParityIds?.length) {
        const recovery = await this.recoverBlock(b1Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block1Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId1),
          });
        }
      } else {
        throw error;
      }
    }

    const b2Checksum =
      typeof blockId2 === 'string' ? this.hexToChecksum(blockId2) : blockId2;
    let block2Data: RawDataBlock;
    try {
      block2Data = await this.getData(b2Checksum);
    } catch (error) {
      if (block2ParityIds?.length) {
        const recovery = await this.recoverBlock(b2Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block2Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId2),
          });
        }
      } else {
        throw error;
      }
    }

    const reconstructedPadded = xorArrays(block1Data.data, block2Data.data);
    return unpadCblData(reconstructedPadded);
  }

  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      throw new Error('Invalid magnet URL format');
    }

    const queryString = magnetUrl.substring('magnet:?'.length);
    const params = new URLSearchParams(queryString);

    const xt = params.get('xt');
    if (xt !== 'urn:brightchain:cbl') {
      throw new Error('Invalid magnet URL: wrong xt parameter');
    }

    const blockId1 = params.get('b1');
    const blockId2 = params.get('b2');
    const blockSizeStr = params.get('bs');

    if (!blockId1) throw new Error('Invalid magnet URL: missing b1');
    if (!blockId2) throw new Error('Invalid magnet URL: missing b2');
    if (!blockSizeStr) throw new Error('Invalid magnet URL: missing bs');

    const blockSize = parseInt(blockSizeStr, 10);
    if (isNaN(blockSize) || blockSize <= 0) {
      throw new Error('Invalid magnet URL: invalid block size');
    }

    const p1Param = params.get('p1');
    const p2Param = params.get('p2');
    const block1ParityIds = p1Param
      ? p1Param.split(',').filter((id) => id)
      : undefined;
    const block2ParityIds = p2Param
      ? p2Param.split(',').filter((id) => id)
      : undefined;

    const isEncrypted = params.get('enc') === '1';

    return {
      blockId1,
      blockId2,
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    };
  }

  public generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    const b1Id = typeof blockId1 === 'string' ? blockId1 : blockId1.toHex();
    const b2Id = typeof blockId2 === 'string' ? blockId2 : blockId2.toHex();

    const params = new URLSearchParams();
    params.set('xt', 'urn:brightchain:cbl');
    params.set('bs', blockSize.toString());
    params.set('b1', b1Id);
    params.set('b2', b2Id);

    if (block1ParityIds?.length) {
      params.set('p1', block1ParityIds.join(','));
    }
    if (block2ParityIds?.length) {
      params.set('p2', block2ParityIds.join(','));
    }

    if (isEncrypted) {
      params.set('enc', '1');
    }

    return `magnet:?${params.toString()}`;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /** Read metadata JSON from disk, returning null if not found. */
  private async readMetadata(keyHex: string): Promise<IBlockMetadata | null> {
    const filePath = this.metaFilePath(keyHex);
    try {
      await access(filePath);
    } catch {
      return null;
    }

    try {
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        lastAccessedAt: new Date(parsed.lastAccessedAt),
      };
    } catch {
      return null;
    }
  }

  /** Write metadata JSON to disk. */
  private async writeMetadata(
    keyHex: string,
    metadata: IBlockMetadata,
  ): Promise<void> {
    await this.ensureDirs();
    const filePath = this.metaFilePath(keyHex);
    await writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /** Update access count and timestamp in metadata. */
  private async touchMetadataAccess(keyHex: string): Promise<void> {
    const meta = await this.readMetadata(keyHex);
    if (meta) {
      meta.accessCount += 1;
      meta.lastAccessedAt = new Date();
      await this.writeMetadata(keyHex, meta);
    }
  }

  /** Load parity data from disk for a given block. */
  private async loadParityFromDisk(keyHex: string): Promise<ParityData[]> {
    const parDir = this.parityBlockDir(keyHex);
    try {
      await access(parDir);
    } catch {
      return [];
    }

    const files = await readdir(parDir);
    const parityFiles = files.filter((f) => f.endsWith('.parity')).sort();

    const result: ParityData[] = [];
    for (const f of parityFiles) {
      try {
        const raw = await readFile(join(parDir, f), 'utf-8');
        const parsed = JSON.parse(raw);
        result.push({
          index: parsed.index,
          data: new Uint8Array(parsed.data),
        });
      } catch {
        // Skip corrupt parity files
      }
    }
    return result;
  }

  /** Scan all metadata files and find blocks matching a replication status. */
  private async findBlocksByReplicationStatus(
    status: ReplicationStatus,
    requirePositiveTarget: boolean,
  ): Promise<Checksum[]> {
    try {
      await access(this.metaDir);
    } catch {
      return [];
    }

    const files = await readdir(this.metaDir);
    const result: Checksum[] = [];

    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const keyHex = f.replace('.json', '');
      const meta = await this.readMetadata(keyHex);
      if (!meta) continue;

      if (meta.replicationStatus === status) {
        if (requirePositiveTarget && meta.targetReplicationFactor <= 0) {
          continue;
        }
        try {
          result.push(Checksum.fromHex(keyHex));
        } catch {
          // Skip invalid checksums
        }
      }
    }

    return result;
  }

  /**
   * Select an existing block as a randomizer, or generate a new one.
   * Following OFFSystem principles: preferentially reuse existing blocks.
   */
  protected async selectOrGenerateRandomizer(
    size: number,
  ): Promise<Uint8Array> {
    try {
      await access(this.blocksDir);
      const files = await readdir(this.blocksDir);
      if (files.length > 0) {
        const randomIndex = Math.floor(Math.random() * files.length);
        const selectedFile = files[randomIndex];
        try {
          const data = await readFile(join(this.blocksDir, selectedFile));
          if (data.length >= size) {
            return new Uint8Array(data.subarray(0, size));
          }
        } catch {
          // Fall through to generation
        }
      }
    } catch {
      // blocksDir doesn't exist yet; fall through
    }

    return XorService.generateKey(size);
  }
}
