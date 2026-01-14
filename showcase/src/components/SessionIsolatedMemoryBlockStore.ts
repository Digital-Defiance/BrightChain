/**
 * Session-isolated memory block store for the BrightChain demo
 * 
 * This implementation addresses the memory persistence issue by:
 * 1. Generating unique session IDs for each instance
 * 2. Clearing data on page refresh (new instance creation)
 * 3. Providing proper error handling for missing blocks
 * 4. Isolating data between different sessions
 */

import {
  ChecksumUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';

// Import from the main brightchain-lib package
import { 
  BaseBlock,
  RawDataBlock,
  createBlockHandle,
  BlockHandle,
  BlockSize,
  IBlockStore
} from '@brightchain/brightchain-lib';

/**
 * Custom error for store operations
 */
class SessionStoreError extends Error {
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = 'SessionStoreError';
  }
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
    const randomHex = Array.from(randomBytes, byte => 
      byte.toString(16).padStart(2, '0')
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
  public async has(key: ChecksumUint8Array): Promise<boolean> {
    const keyHex = uint8ArrayToHex(key);
    const exists = this.blocks.has(keyHex);
    
    if (!exists) {
      console.warn(`Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}`);
    }
    
    return exists;
  }

  /**
   * Get a block's data
   */
  public async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    const keyHex = uint8ArrayToHex(key);
    const block = this.blocks.get(keyHex);
    
    if (!block) {
      const errorMessage = `Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}. ` +
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
        `Block size ${block.blockSize} does not match store size ${this._blockSize}`);
    }

    const keyHex = uint8ArrayToHex(block.idChecksum);
    
    if (this.blocks.has(keyHex)) {
      throw new SessionStoreError(
        `Block ${keyHex.substring(0, 8)}... already exists in session ${this._sessionId}`);
    }

    try {
      block.validate();
    } catch (error) {
      throw new SessionStoreError(
        `Block validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.blocks.set(keyHex, block);
    console.log(`Block ${keyHex.substring(0, 8)}... stored in session ${this._sessionId} (${this.blocks.size} total blocks)`);
  }

  /**
   * Delete a block's data
   */
  public async deleteData(key: ChecksumUint8Array): Promise<void> {
    const keyHex = uint8ArrayToHex(key);
    
    if (!this.blocks.has(keyHex)) {
      throw new SessionStoreError(
        `Cannot delete block ${keyHex.substring(0, 8)}... - not found in session ${this._sessionId}`);
    }
    
    this.blocks.delete(keyHex);
    console.log(`Block ${keyHex.substring(0, 8)}... deleted from session ${this._sessionId} (${this.blocks.size} remaining blocks)`);
  }

  /**
   * Get random block checksums from the store
   */
  public async getRandomBlocks(count: number): Promise<ChecksumUint8Array[]> {
    const allKeys = Array.from(this.blocks.keys());
    const result: ChecksumUint8Array[] = [];

    const actualCount = Math.min(count, allKeys.length);
    const shuffled = [...allKeys].sort(() => Math.random() - 0.5);

    for (let i = 0; i < actualCount; i++) {
      const keyHex = shuffled[i];
      const keyBytes = new Uint8Array(keyHex.length / 2);
      for (let j = 0; j < keyBytes.length; j++) {
        keyBytes[j] = parseInt(keyHex.substr(j * 2, 2), 16);
      }
      result.push(keyBytes as ChecksumUint8Array);
    }

    return result;
  }

  /**
   * Store a block's data (alias for setData)
   */
  public async put(key: ChecksumUint8Array, data: Uint8Array): Promise<void> {
    const block = new RawDataBlock(this._blockSize, data);
    await this.setData(block);
  }

  /**
   * Delete a block (alias for deleteData)
   */
  public async delete(key: ChecksumUint8Array): Promise<void> {
    await this.deleteData(key);
  }

  /**
   * Generate a random ID
   */
  public static randomId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
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
  public get<T extends BaseBlock>(key: ChecksumUint8Array): BlockHandle<T> {
    const keyHex = uint8ArrayToHex(key);
    const block = this.blocks.get(keyHex);
    
    if (!block) {
      const errorMessage = `Block ${keyHex.substring(0, 8)}... not found in session ${this._sessionId}`;
      throw new SessionStoreError(errorMessage, {
        KEY: keyHex,
        SESSION_ID: this._sessionId,
      });
    }
    
    return createBlockHandle(
      RawDataBlock as any,
      block.blockSize,
      block.data,
      key,
      block.canRead,
      block.canPersist,
    ) as BlockHandle<T>;
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
      blockIds: Array.from(this.blocks.keys()).map(key => key.substring(0, 8) + '...'),
    };
  }
}