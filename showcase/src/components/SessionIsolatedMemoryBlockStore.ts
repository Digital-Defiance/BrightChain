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
 * Convert a Checksum or string to hex string key
 */
function toHexKey(key: Checksum | string): string {
  if (typeof key === 'string') {
    return key;
  }
  return key.toHex();
}

/**
 * Session-isolated memory block store that properly handles page refreshes
 * and prevents cross-session data access
 */
export class SessionIsolatedMemoryBlockStore implements Partial<IBlockStore> {
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
}
