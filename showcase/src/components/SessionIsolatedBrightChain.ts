/**
 * Session-isolated BrightChain implementation for the demo
 * 
 * This implementation addresses the memory persistence issue by using
 * a session-isolated memory block store that properly clears on page refresh.
 */

import { BlockSize, FileReceipt, BlockInfo, initializeBrightChain } from '@brightchain/brightchain-lib';
import { SessionIsolatedMemoryBlockStore } from './SessionIsolatedMemoryBlockStore';
import { RawDataBlock } from '@brightchain/brightchain-lib';
import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';

/**
 * BrightChain implementation with session isolation
 */
export class SessionIsolatedBrightChain {
  private blockStore: SessionIsolatedMemoryBlockStore;
  private blockSize: BlockSize;

  constructor(blockSize: BlockSize = BlockSize.Small) {
    this.blockSize = blockSize;
    
    // Initialize BrightChain library if not already initialized
    try {
      initializeBrightChain();
    } catch (error) {
      console.warn('BrightChain initialization:', error);
    }
    
    this.blockStore = new SessionIsolatedMemoryBlockStore(blockSize);
    
    console.log(`SessionIsolatedBrightChain initialized with session: ${this.blockStore.getSessionId()}`);
  }

  /**
   * Store a file and return a receipt
   */
  async storeFile(
    fileData: Uint8Array,
    fileName = 'untitled',
  ): Promise<FileReceipt> {
    const blocks: BlockInfo[] = [];
    const chunkSize = this.blockSize as number;

    console.log(`Storing file "${fileName}" (${fileData.length} bytes) in session ${this.blockStore.getSessionId()}`);

    for (let i = 0; i < fileData.length; i += chunkSize) {
      const chunk = fileData.slice(i, Math.min(i + chunkSize, fileData.length));
      const paddedChunk = new Uint8Array(chunkSize);
      paddedChunk.set(chunk);

      // Add random padding if chunk is smaller than block size
      if (chunk.length < chunkSize) {
        crypto.getRandomValues(paddedChunk.subarray(chunk.length));
      }

      const block = new RawDataBlock(this.blockSize, paddedChunk);
      await this.blockStore.setData(block);

      blocks.push({
        id: uint8ArrayToHex(block.idChecksum),
        checksum: block.idChecksum,
        size: chunk.length,
        index: blocks.length,
      });
    }

    const cblData = this.createCBL(blocks, fileData.length, fileName);
    const receiptId = uint8ArrayToHex(
      new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
    );

    const receipt: FileReceipt = {
      id: receiptId,
      fileName,
      originalSize: fileData.length,
      blockCount: blocks.length,
      blocks,
      cblData: Array.from(cblData),
      magnetUrl: this.createMagnetUrl(receiptId, fileName, fileData.length),
    };

    console.log(`File "${fileName}" stored successfully with ${blocks.length} blocks in session ${this.blockStore.getSessionId()}`);
    return receipt;
  }

  /**
   * Retrieve a file from its receipt
   */
  async retrieveFile(receipt: FileReceipt): Promise<Uint8Array> {
    console.log(`Retrieving file "${receipt.fileName}" from session ${this.blockStore.getSessionId()}`);
    
    const chunks: Uint8Array[] = [];

    try {
      for (const blockInfo of receipt.blocks) {
        const block = await this.blockStore.getData(blockInfo.checksum);
        chunks.push(block.data.slice(0, blockInfo.size));
      }

      const result = new Uint8Array(receipt.originalSize);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`File "${receipt.fileName}" retrieved successfully from session ${this.blockStore.getSessionId()}`);
      return result;
    } catch (error) {
      const errorMessage = `Failed to retrieve file "${receipt.fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create CBL (Constituent Block List) metadata
   */
  private createCBL(
    blocks: BlockInfo[],
    originalSize: number,
    fileName: string,
  ): Uint8Array {
    const header = JSON.stringify({
      version: 1,
      fileName,
      originalSize,
      blockCount: blocks.length,
      blocks: blocks.map((b) => ({ id: b.id, size: b.size })),
      sessionId: this.blockStore.getSessionId(), // Include session ID for debugging
    });
    return new TextEncoder().encode(header);
  }

  /**
   * Create magnet URL for sharing
   */
  private createMagnetUrl(id: string, fileName: string, size: number): string {
    const params = new URLSearchParams({
      xt: `urn:brightchain:${id}`,
      dn: fileName,
      xl: size.toString(),
      session: this.blockStore.getSessionId(), // Include session ID for debugging
    });
    return `magnet:?${params.toString()}`;
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
    return this.blockStore.getDebugInfo();
  }

  /**
   * Clear the current session
   */
  public clearSession(): void {
    this.blockStore.clearSession();
  }

  /**
   * Get the session ID
   */
  public getSessionId(): string {
    return this.blockStore.getSessionId();
  }
}