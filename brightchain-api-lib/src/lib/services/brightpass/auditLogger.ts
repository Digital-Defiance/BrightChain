import {
  AuditLogEntry,
  BlockDataType,
  BlockService,
  BlockSize,
  BlockType,
  EphemeralBlock,
  getGlobalServiceProvider,
  IBlockStore,
  RawDataBlock,
} from '@brightchain/brightchain-lib';
import { Member, PlatformID, UINT8_SIZE } from '@digitaldefiance/ecies-lib';

interface AuditLogBlock {
  entries: AuditLogEntry[];
  previousBlockId: string | null;
  createdAt: string;
}

/**
 * AuditLogger - Stores audit log entries as encrypted blocks
 *
 * Supports two modes:
 * 1. In-memory mode (default): Entries stored in memory array for testing/development
 * 2. Block store mode: Entries persisted as encrypted blocks in BrightChain's block store
 *
 * Entries are append-only and retrieved in reverse chronological order.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export class AuditLogger<TID extends PlatformID = Uint8Array> {
  private entries: AuditLogEntry[] = [];
  private readonly blockStore?: IBlockStore;
  private readonly systemMember?: Member<TID>;
  private readonly blockService: BlockService<TID>;
  private headBlockId: string | null = null;
  private cachedBlockEntries: AuditLogEntry[] | null = null;
  private pendingEntries: AuditLogEntry[] = [];
  private readonly batchSize: number;
  private persistedEntryCount = 0;
  private readonly blockSize: BlockSize;

  /**
   * Create an AuditLogger instance.
   *
   * @param blockStore - Optional block store for encrypted persistence (Req 4.1)
   * @param systemMember - Optional system member with public key for encryption (Req 4.3)
   * @param batchSize - Number of entries to batch before creating a block (default: 10)
   * @param blockSize - Block size for audit log blocks (default: BlockSize.Small)
   */
  constructor(
    blockStore?: IBlockStore,
    systemMember?: Member<TID>,
    batchSize = 10,
    blockSize: BlockSize = BlockSize.Small,
  ) {
    this.blockStore = blockStore;
    this.systemMember = systemMember;
    this.batchSize = batchSize;
    this.blockSize = blockSize;
    this.blockService = new BlockService<TID>();
  }

  /**
   * Check if this logger is using encrypted block storage.
   * Requires both a block store and a system member with public key.
   */
  public get isUsingBlockStore(): boolean {
    return this.blockStore !== undefined && this.systemMember !== undefined;
  }

  /**
   * Log an audit entry.
   *
   * In block store mode, entries are batched and periodically persisted as encrypted blocks.
   * In memory mode, entries are simply appended to the in-memory array.
   *
   * Requirements: 4.1, 4.2
   */
  public async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    if (this.isUsingBlockStore) {
      this.pendingEntries.push(logEntry);
      if (this.pendingEntries.length >= this.batchSize) {
        await this.flushToBlockStore();
      }
    } else {
      this.entries.push(logEntry);
    }
  }

  /**
   * Flush pending entries to the block store as an encrypted block.
   * Uses EncryptedBlock for encryption with the system member's public key.
   * Requirements: 4.2, 4.3, 4.4
   */
  public async flushToBlockStore(): Promise<void> {
    if (!this.isUsingBlockStore || this.pendingEntries.length === 0) {
      return;
    }

    const block: AuditLogBlock = {
      entries: [...this.pendingEntries],
      previousBlockId: this.headBlockId,
      createdAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(block);
    const dataBuffer = new TextEncoder().encode(serialized);

    const paddedData = new Uint8Array(this.blockSize);
    paddedData.set(dataBuffer);

    const checksumService = getGlobalServiceProvider<TID>().checksumService;
    const checksum = checksumService.calculateChecksum(paddedData);

    const ephemeralBlock = await EphemeralBlock.from<TID>(
      BlockType.EphemeralOwnedDataBlock,
      BlockDataType.EphemeralStructuredData,
      this.blockSize,
      paddedData,
      checksum,
      this.systemMember!,
      new Date(),
      dataBuffer.length,
    );

    const encryptedBlock = await this.blockService.encrypt(
      BlockType.EncryptedOwnedDataBlock,
      ephemeralBlock,
      this.systemMember!,
    );

    // Store the encrypted block - the block store uses the block's checksum as the key
    await this.blockStore!.put(encryptedBlock.idChecksum, encryptedBlock.data);

    // Store the block's checksum as the head block ID (hex string)
    this.headBlockId = encryptedBlock.idChecksum.toHex();
    this.persistedEntryCount += this.pendingEntries.length;
    this.pendingEntries = [];
    this.cachedBlockEntries = null;
  }

  /**
   * Get audit log entries in reverse chronological order.
   * Requirements: 4.1
   */
  public async getEntries(limit?: number): Promise<AuditLogEntry[]> {
    let allEntries: AuditLogEntry[];

    if (this.isUsingBlockStore) {
      if (this.cachedBlockEntries === null) {
        this.cachedBlockEntries = await this.loadEntriesFromBlockStore();
      }
      allEntries = [...this.pendingEntries, ...this.cachedBlockEntries];
    } else {
      allEntries = [...this.entries];
    }

    const sorted = allEntries.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get the total entry count.
   */
  public getCount(): number {
    if (this.isUsingBlockStore) {
      return this.pendingEntries.length + this.persistedEntryCount;
    }
    return this.entries.length;
  }

  /**
   * Load all entries from the block store by traversing the block chain.
   * Decrypts each block using the system member's private key.
   */
  private async loadEntriesFromBlockStore(): Promise<AuditLogEntry[]> {
    if (!this.blockStore || !this.headBlockId || !this.systemMember) {
      return [];
    }

    if (!this.systemMember.hasPrivateKey || !this.systemMember.privateKey) {
      return [];
    }

    const allEntries: AuditLogEntry[] = [];
    let currentBlockId: string | null = this.headBlockId;

    while (currentBlockId) {
      try {
        const hasBlock = await this.blockStore.has(currentBlockId);
        if (!hasBlock) {
          break;
        }

        const blockHandle = this.blockStore.get<RawDataBlock>(currentBlockId);
        const encryptedData = blockHandle.fullData;

        // Extract the ECIES data directly from the encrypted block
        // The header structure is: [EncType(1)][RecipientID(idSize)][ECIES header + ciphertext]
        const idProvider = getGlobalServiceProvider<TID>().idProvider;
        const eciesDataOffset = UINT8_SIZE + idProvider.byteLength;
        const eciesData = encryptedData.subarray(eciesDataOffset);

        // Decrypt directly using the ECIES service
        const eciesService = getGlobalServiceProvider<TID>().eciesService;
        const decryptedData = await eciesService.decryptWithLengthAndHeader(
          this.systemMember.privateKey.idUint8Array,
          eciesData,
        );

        const jsonString = new TextDecoder().decode(decryptedData);
        const parsedBlock: AuditLogBlock = JSON.parse(jsonString);

        const entries = parsedBlock.entries.map((e) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));

        allEntries.push(...entries);
        currentBlockId = parsedBlock.previousBlockId;
      } catch {
        break;
      }
    }

    return allEntries;
  }

  /**
   * Set the head block ID (for restoring state from a persisted vault).
   */
  public setHeadBlockId(blockId: string | null): void {
    this.headBlockId = blockId;
    this.cachedBlockEntries = null;
  }

  /**
   * Get the head block ID (for persisting vault state).
   */
  public getHeadBlockId(): string | null {
    return this.headBlockId;
  }
}
