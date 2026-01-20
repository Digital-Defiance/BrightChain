/* eslint-disable @nx/enforce-module-boundaries */
/**
 * Session-isolated memory block store for the BrightChain demo
 *
 * This implementation addresses the memory persistence issue by:
 * 1. Generating unique session IDs for each instance
 * 2. Clearing data on page refresh (new instance creation)
 * 3. Providing proper error handling for missing blocks
 * 4. Isolating data between different sessions
 */

// Import from the main brightchain-lib package
import {
  BaseBlock,
  BlockHandle,
  BlockSize,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  IBlockStore,
  RawDataBlock,
  createBlockHandle,
} from '@brightchain/brightchain-lib';

/**
 * Custom error for store operations
 */
class SessionStoreError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

/**
 * Convert a Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte: number) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Convert a hex string to Uint8Array (browser-safe)
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have an even number of characters');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Safely convert a Checksum to hex string (browser-compatible)
 * This handles cases where Buffer.toString('hex') might not work in browsers
 */
function checksumToHex(checksum: Checksum): string {
  // Try the native toHex() first
  try {
    const hex = checksum.toHex();
    // Verify it's actually a hex string and not a comma-separated byte list
    if (
      typeof hex === 'string' &&
      /^[0-9a-fA-F]+$/.test(hex) &&
      hex.length === 128
    ) {
      return hex;
    }
  } catch {
    // Fall through to manual conversion
  }

  // Fallback: manually convert Uint8Array to hex
  const uint8Array = checksum.toUint8Array();
  return bytesToHex(uint8Array);
}

/**
 * Safely create a Checksum from hex string (browser-compatible)
 * This handles cases where Buffer.from(hex, 'hex') might not work in browsers
 */
function checksumFromHex(hex: string): Checksum {
  try {
    // Try the native fromHex() first
    return Checksum.fromHex(hex);
  } catch {
    // If that fails, manually convert hex to bytes and create from Uint8Array
    const bytes = hexToBytes(hex);
    return Checksum.fromUint8Array(bytes);
  }
}

/**
 * Convert a Checksum or string to hex string key
 */
function toHexKey(key: Checksum | string): string {
  if (typeof key === 'string') {
    return key;
  }
  return checksumToHex(key);
}

/**
 * Session-isolated memory block store that properly handles page refreshes
 * and prevents cross-session data access
 */
export class SessionIsolatedMemoryBlockStore implements IBlockStore {
  private readonly blocks = new Map<string, RawDataBlock>();
  private readonly _blockSize: BlockSize;
  private readonly _sessionId: string;

  constructor(blockSize: BlockSize) {
    this._blockSize = blockSize;
    this._sessionId = this.generateSessionId();

    // Log session creation for debugging
    console.log(`New BrightChain session created: ${this._sessionId}`);
  }

  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this._sessionId;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `session_${timestamp}_${randomHex}`;
  }

  /**
   * Clear all blocks in the current session
   */
  public clearSession(): void {
    this.blocks.clear();
    console.log(`Session ${this._sessionId} cleared`);
  }

  /**
   * Check if a block exists
   */
  public async has(key: Checksum | string): Promise<boolean> {
    const keyHex = toHexKey(key);
    const exists = this.blocks.has(keyHex);

    if (!exists) {
      console.warn(
        `Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}`,
      );
    }

    return exists;
  }

  /**
   * Get a block's data
   */
  public async getData(key: Checksum): Promise<RawDataBlock> {
    const keyHex = toHexKey(key);
    const block = this.blocks.get(keyHex);

    if (!block) {
      const errorMessage =
        `Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}. ` +
        `This may be because the page was refreshed or the block was stored in a different session.`;

      console.error(errorMessage);

      throw new SessionStoreError(errorMessage, {
        KEY: keyHex,
        SESSION_ID: this._sessionId,
        AVAILABLE_BLOCKS: this.blocks.size,
      });
    }

    return block;
  }

  /**
   * Store a block's data
   */
  public async setData(block: RawDataBlock): Promise<void> {
    if (block.blockSize !== this._blockSize) {
      throw new SessionStoreError(
        `Block size ${block.blockSize} does not match store size ${this._blockSize}`,
      );
    }

    const keyHex = toHexKey(block.idChecksum);

    if (this.blocks.has(keyHex)) {
      throw new SessionStoreError(
        `Block ${keyHex.substring(0, 8)}... already exists in session ${this._sessionId}`,
      );
    }

    try {
      block.validate();
    } catch (error) {
      throw new SessionStoreError(
        `Block validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    this.blocks.set(keyHex, block);
    console.log(
      `Block ${keyHex.substring(0, 8)}... stored in session ${this._sessionId} (${this.blocks.size} total blocks)`,
    );
  }

  /**
   * Delete a block's data
   */
  public async deleteData(key: Checksum): Promise<void> {
    const keyHex = toHexKey(key);

    if (!this.blocks.has(keyHex)) {
      throw new SessionStoreError(
        `Cannot delete block ${keyHex.substring(0, 8)}... - not found in session ${this._sessionId}`,
      );
    }

    this.blocks.delete(keyHex);
    console.log(
      `Block ${keyHex.substring(0, 8)}... deleted from session ${this._sessionId} (${this.blocks.size} remaining blocks)`,
    );
  }

  /**
   * Get random block checksums from the store
   */
  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    const allKeys = Array.from(this.blocks.keys());
    const result: Checksum[] = [];

    const actualCount = Math.min(count, allKeys.length);
    const shuffled = [...allKeys].sort(() => Math.random() - 0.5);

    for (let i = 0; i < actualCount; i++) {
      const keyHex = shuffled[i];
      result.push(Checksum.fromHex(keyHex));
    }

    return result;
  }

  /**
   * Store a block's data (alias for setData)
   */
  public async put(key: Checksum | string, data: Uint8Array): Promise<void> {
    const block = new RawDataBlock(this._blockSize, data);
    await this.setData(block);
  }

  /**
   * Delete a block (alias for deleteData)
   */
  public async delete(key: Checksum | string): Promise<void> {
    const checksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    await this.deleteData(checksum);
  }

  /**
   * Generate a random ID
   */
  public static randomId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  /**
   * Clear all blocks (alias for clearSession)
   */
  public clear(): void {
    this.clearSession();
  }

  /**
   * Get total number of blocks
   */
  public size(): number {
    return this.blocks.size;
  }

  /**
   * Get a handle to a block
   */
  public get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T> {
    const keyHex = toHexKey(key);
    const block = this.blocks.get(keyHex);

    if (!block) {
      const errorMessage = `Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}`;
      throw new SessionStoreError(errorMessage, {
        KEY: keyHex,
        SESSION_ID: this._sessionId,
      });
    }

    return createBlockHandle(
      RawDataBlock as unknown as new (...args: unknown[]) => T,
      block.blockSize,
      block.data,
      block.idChecksum,
      block.canRead,
      block.canPersist,
    );
  }

  /**
   * Get debug information about the current session
   */
  public getDebugInfo(): {
    sessionId: string;
    blockCount: number;
    blockSize: BlockSize;
    blockIds: string[];
  } {
    return {
      sessionId: this._sessionId,
      blockCount: this.blocks.size,
      blockSize: this._blockSize,
      blockIds: Array.from(this.blocks.keys()).map(
        (key) => key.substring(0, 8) + '...',
      ),
    };
  }

  // === CBL Whitening Operations ===

  /**
   * XOR two Uint8Arrays of equal length
   */
  private xorArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    if (a.length !== b.length) {
      throw new SessionStoreError(
        `Arrays must have the same length for XOR: ${a.length} vs ${b.length}`,
      );
    }
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  /**
   * Pad data to block size with length prefix and random bytes
   */
  private padToBlockSize(data: Uint8Array): Uint8Array {
    const LENGTH_PREFIX_SIZE = 4;
    const totalDataSize = LENGTH_PREFIX_SIZE + data.length;
    const paddedSize =
      Math.ceil(totalDataSize / this._blockSize) * this._blockSize;

    const padded = new Uint8Array(paddedSize);

    // Write length prefix (big-endian 32-bit unsigned integer)
    const view = new DataView(padded.buffer);
    view.setUint32(0, data.length, false);

    // Copy original data after length prefix
    padded.set(data, LENGTH_PREFIX_SIZE);

    // Fill remaining bytes with random data
    if (paddedSize > totalDataSize) {
      crypto.getRandomValues(padded.subarray(totalDataSize));
    }

    return padded;
  }

  /**
   * Remove padding from CBL data by reading the length prefix
   */
  private unpadCblData(data: Uint8Array): Uint8Array {
    const LENGTH_PREFIX_SIZE = 4;

    if (data.length < LENGTH_PREFIX_SIZE) {
      throw new SessionStoreError(
        `Invalid padded data: too short (${data.length} bytes)`,
      );
    }

    // Read length prefix (big-endian 32-bit unsigned integer)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const originalLength = view.getUint32(0, false);

    // Validate length
    if (originalLength > data.length - LENGTH_PREFIX_SIZE) {
      throw new SessionStoreError(
        `Invalid length prefix: claims ${originalLength} bytes but only ${data.length - LENGTH_PREFIX_SIZE} available`,
      );
    }

    // Return original data
    return data.subarray(
      LENGTH_PREFIX_SIZE,
      LENGTH_PREFIX_SIZE + originalLength,
    );
  }

  /**
   * Store a CBL with XOR whitening for Owner-Free storage.
   *
   * This method:
   * 1. Generates a cryptographically random block (R) of the same size as the CBL
   * 2. XORs the CBL with R to produce the second block (CBL XOR R)
   * 3. Stores both blocks separately
   * 4. Returns the IDs and a magnet URL for reconstruction
   *
   * @param cblData - The original CBL data as Uint8Array
   * @param options - Optional storage options (encryption flag)
   * @returns Result containing block IDs and magnet URL
   * @throws SessionStoreError if storage fails
   */
  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    // Validate input
    if (!cblData || cblData.length === 0) {
      throw new SessionStoreError('CBL data cannot be empty');
    }

    // 1. Pad CBL to block size (includes length prefix)
    const paddedCbl = this.padToBlockSize(cblData);

    // 2. Determine the appropriate block size for storing the whitened CBL
    // The padded CBL might be larger than the store's default block size
    const cblBlockSize = Math.max(paddedCbl.length, this._blockSize);

    // 3. Select or generate randomizer block following OFFSystem principles
    // In OFFSystem, we preferentially use existing blocks from the cache as randomizers
    // This provides multi-use of blocks and better security through data reuse
    const randomBlock = await this.selectOrGenerateRandomizer(paddedCbl.length);

    // 3. XOR to create second block (CBL XOR R)
    const xorResult = this.xorArrays(paddedCbl, randomBlock);

    // Track stored blocks for rollback on failure
    let block1Stored = false;
    let block1Id = '';

    try {
      // 4. Store first block (R - the randomizer block)
      // Note: If this was selected from existing blocks, it's already stored
      // We still create a block handle for it to get the ID
      const block1 = new RawDataBlock(cblBlockSize as BlockSize, randomBlock);
      const block1Checksum = block1.idChecksum;

      // Only store if not already in the store
      if (!(await this.has(block1Checksum))) {
        await this.setData(block1);
        block1Stored = true;
      }
      block1Id = toHexKey(block1Checksum);

      // 5. Store second block (CBL XOR R)
      const block2 = new RawDataBlock(cblBlockSize as BlockSize, xorResult);
      await this.setData(block2);
      const block2Id = toHexKey(block2.idChecksum);

      // 6. Generate magnet URL
      const magnetUrl = this.generateCBLMagnetUrl(
        block1Id,
        block2Id,
        cblBlockSize,
        undefined,
        undefined,
        options?.isEncrypted,
      );

      console.log(
        `CBL whitening complete in session ${this._sessionId}: b1=${block1Id.substring(0, 8)}..., b2=${block2Id.substring(0, 8)}...`,
      );

      return {
        blockId1: block1Id,
        blockId2: block2Id,
        blockSize: cblBlockSize,
        magnetUrl,
        isEncrypted: options?.isEncrypted,
      };
    } catch (error) {
      // Rollback: delete block1 if it was stored by us
      if (block1Stored && block1Id) {
        try {
          await this.deleteData(Checksum.fromHex(block1Id));
        } catch {
          // Ignore rollback errors
        }
      }
      throw error;
    }
  }

  /**
   * Select an existing block from the store as a randomizer, or generate a new one.
   *
   * Following OFFSystem principles:
   * - Preferentially select existing blocks from the cache as randomizers
   * - Only generate new random blocks if insufficient blocks exist
   * - All blocks in the store look random and can be used as randomizers
   *
   * @param size - The required size of the randomizer block
   * @returns A Uint8Array containing the randomizer data
   */
  private async selectOrGenerateRandomizer(size: number): Promise<Uint8Array> {
    // Get all block IDs from the session store
    const blockIds = Array.from(this.blocks.keys());

    // If we have existing blocks, try to use one as a randomizer
    if (blockIds.length > 0) {
      // Select a random block from the existing blocks
      const randomIndex = Math.floor(Math.random() * blockIds.length);
      const selectedBlockId = blockIds[randomIndex];

      try {
        const block = this.blocks.get(selectedBlockId);
        if (block && block.data.length >= size) {
          // Use the first 'size' bytes of the existing block as the randomizer
          return block.data.slice(0, size);
        }
      } catch {
        // If we can't retrieve the block, fall through to generation
      }
    }

    // Fall back to generating a new random block using CSPRNG
    // This happens when:
    // - The store is empty (early in block store lifecycle)
    // - No suitable blocks were found
    const newRandomBlock = new Uint8Array(size);
    crypto.getRandomValues(newRandomBlock);
    return newRandomBlock;
  }

  /**
   * Retrieve and reconstruct a CBL from its whitened components.
   *
   * This method:
   * 1. Retrieves both blocks
   * 2. XORs the blocks to reconstruct the padded CBL
   * 3. Unpads to get the original CBL data
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param block1ParityIds - Optional parity block IDs (not used in session store)
   * @param block2ParityIds - Optional parity block IDs (not used in session store)
   * @returns The original CBL data as Uint8Array
   * @throws SessionStoreError if either block is not found or reconstruction fails
   */
  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    // 1. Retrieve first block
    const b1Checksum =
      typeof blockId1 === 'string' ? checksumFromHex(blockId1) : blockId1;
    const block1Data = await this.getData(b1Checksum);

    // 2. Retrieve second block
    const b2Checksum =
      typeof blockId2 === 'string' ? checksumFromHex(blockId2) : blockId2;
    const block2Data = await this.getData(b2Checksum);

    // 3. XOR to reconstruct padded CBL (order doesn't matter due to commutativity)
    const reconstructedPadded = this.xorArrays(
      block1Data.data,
      block2Data.data,
    );

    // 4. Remove padding to get original CBL
    const originalCbl = this.unpadCblData(reconstructedPadded);

    console.log(
      `CBL reconstructed in session ${this._sessionId}: ${originalCbl.length} bytes`,
    );

    return originalCbl;
  }

  /**
   * Parse a whitened CBL magnet URL and extract component IDs.
   *
   * Expected format: magnet:?xt=urn:brightchain:cbl&bs=<block_size>&b1=<id>&b2=<id>[&p1=<parity_ids>][&p2=<parity_ids>][&enc=1]
   *
   * @param magnetUrl - The magnet URL to parse
   * @returns Object containing block IDs, block size, parity IDs (if any), and encryption flag
   * @throws Error if the URL format is invalid
   */
  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    // Validate basic URL format
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      throw new SessionStoreError(
        'Invalid magnet URL: must start with "magnet:?"',
      );
    }

    // Parse URL parameters
    const queryString = magnetUrl.substring('magnet:?'.length);
    const params = new URLSearchParams(queryString);

    // Validate xt parameter
    const xt = params.get('xt');
    if (xt !== 'urn:brightchain:cbl') {
      throw new SessionStoreError(
        'Invalid magnet URL: xt parameter must be "urn:brightchain:cbl"',
      );
    }

    // Extract required parameters
    const blockId1 = params.get('b1');
    const blockId2 = params.get('b2');
    const blockSizeStr = params.get('bs');

    if (!blockId1) {
      throw new SessionStoreError('Invalid magnet URL: missing b1 parameter');
    }

    if (!blockId2) {
      throw new SessionStoreError('Invalid magnet URL: missing b2 parameter');
    }

    if (!blockSizeStr) {
      throw new SessionStoreError(
        'Invalid magnet URL: missing bs (block size) parameter',
      );
    }

    const blockSize = parseInt(blockSizeStr, 10);
    if (isNaN(blockSize) || blockSize <= 0) {
      throw new SessionStoreError('Invalid magnet URL: invalid block size');
    }

    // Parse optional parity block IDs
    const p1Param = params.get('p1');
    const p2Param = params.get('p2');
    const block1ParityIds = p1Param
      ? p1Param.split(',').filter((id) => id)
      : undefined;
    const block2ParityIds = p2Param
      ? p2Param.split(',').filter((id) => id)
      : undefined;

    // Parse encryption flag
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

  /**
   * Generate a magnet URL for a whitened CBL.
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param blockSize - Block size in bytes
   * @param block1ParityIds - Optional parity block IDs for block 1
   * @param block2ParityIds - Optional parity block IDs for block 2
   * @param isEncrypted - Whether the CBL is encrypted
   * @returns The magnet URL string
   */
  public generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    const b1Id = typeof blockId1 === 'string' ? blockId1 : toHexKey(blockId1);
    const b2Id = typeof blockId2 === 'string' ? blockId2 : toHexKey(blockId2);

    const params = new URLSearchParams();
    params.set('xt', 'urn:brightchain:cbl');
    params.set('bs', blockSize.toString());
    params.set('b1', b1Id);
    params.set('b2', b2Id);

    // Add parity block IDs if present
    if (block1ParityIds?.length) {
      params.set('p1', block1ParityIds.join(','));
    }
    if (block2ParityIds?.length) {
      params.set('p2', block2ParityIds.join(','));
    }

    // Add encryption flag if encrypted
    if (isEncrypted) {
      params.set('enc', '1');
    }

    return `magnet:?${params.toString()}`;
  }

  // === Metadata Operations (Stubs for demo) ===

  async getMetadata(_key: Checksum | string): Promise<null> {
    return null;
  }

  async updateMetadata(
    _key: Checksum | string,
    _updates: unknown,
  ): Promise<void> {
    // No-op for demo
  }

  // === FEC/Durability Operations (Stubs for demo) ===

  async generateParityBlocks(
    _key: Checksum | string,
    _parityCount: number,
  ): Promise<Checksum[]> {
    return [];
  }

  async getParityBlocks(_key: Checksum | string): Promise<Checksum[]> {
    return [];
  }

  async recoverBlock(_key: Checksum | string): Promise<never> {
    throw new SessionStoreError('Block recovery not supported in demo');
  }

  async verifyBlockIntegrity(_key: Checksum | string): Promise<boolean> {
    return true;
  }

  // === Replication Operations (Stubs for demo) ===

  async getBlocksPendingReplication(): Promise<Checksum[]> {
    return [];
  }

  async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    return [];
  }

  async recordReplication(
    _key: Checksum | string,
    _nodeId: string,
  ): Promise<void> {
    // No-op for demo
  }

  async recordReplicaLoss(
    _key: Checksum | string,
    _nodeId: string,
  ): Promise<void> {
    // No-op for demo
  }

  // === XOR Brightening Operations (Stub for demo) ===

  async brightenBlock(
    _key: Checksum | string,
    _randomBlockCount: number,
  ): Promise<never> {
    throw new SessionStoreError('Block brightening not supported in demo');
  }
}
