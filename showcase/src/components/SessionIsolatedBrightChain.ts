/**
 * Session-isolated BrightChain implementation for the demo
 * 
 * This implementation addresses the memory persistence issue by using
 * a session-isolated memory block store that properly clears on page refresh.
 */

import { BlockSize, FileReceipt, BlockInfo, initializeBrightChain, Checksum } from '@brightchain/brightchain-lib';
import { SessionIsolatedMemoryBlockStore } from './SessionIsolatedMemoryBlockStore';
import { RawDataBlock } from '@brightchain/brightchain-lib';

/**
 * Convert a Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
}

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
        id: block.idChecksum.toHex(),
        checksum: block.idChecksum,
        size: chunk.length,
        index: blocks.length,
      });
    }

    const cblData = this.createCBL(blocks, fileData.length, fileName);
    const receiptId = bytesToHex(
      new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
    );

    const receipt: FileReceipt = {
      id: receiptId,
      fileName,
      originalSize: fileData.length,
      blockCount: blocks.length,
      blocks,
      cblData: Array.from(cblData),
      magnetUrl: this.createMagnetUrl(receiptId, fileName, fileData.length, blocks),
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
   * The magnet URL contains all block information needed for reconstruction
   */
  private createMagnetUrl(id: string, fileName: string, size: number, blocks?: BlockInfo[]): string {
    const params = new URLSearchParams({
      xt: `urn:brightchain:${id}`,
      dn: fileName,
      xl: size.toString(),
    });
    
    // Add block information to the magnet URL
    if (blocks) {
      // Encode blocks as a compact format: blockId:size,blockId:size,...
      const blocksStr = blocks.map(b => `${b.id}:${b.size}`).join(',');
      params.set('blocks', blocksStr);
    }
    
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

  /**
   * Parse a CBL file and create a FileReceipt
   */
  public parseCBL(cblData: Uint8Array): FileReceipt {
    try {
      const cblText = new TextDecoder().decode(cblData);
      const cblJson = JSON.parse(cblText);

      const blocks: BlockInfo[] = cblJson.blocks.map((b: { id: string; size: number }, index: number) => {
        return {
          id: b.id,
          checksum: Checksum.fromHex(b.id),
          size: b.size,
          index,
        };
      });

      const receiptId = bytesToHex(
        new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
      );

      return {
        id: receiptId,
        fileName: cblJson.fileName,
        originalSize: cblJson.originalSize,
        blockCount: cblJson.blockCount,
        blocks,
        cblData: Array.from(cblData),
        magnetUrl: this.createMagnetUrl(receiptId, cblJson.fileName, cblJson.originalSize),
      };
    } catch (error) {
      throw new Error(`Failed to parse CBL: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  }

  /**
   * Parse a magnet URL and create a FileReceipt
   * The magnet URL contains all information needed to reconstruct the file
   */
  public parseMagnetUrl(magnetUrl: string): FileReceipt {
    try {
      const url = new URL(magnetUrl);
      const params = new URLSearchParams(url.search);
      
      const xt = params.get('xt');
      const dn = params.get('dn');
      const xl = params.get('xl');
      const blocksParam = params.get('blocks');

      if (!xt || !dn || !xl || !blocksParam) {
        throw new Error('Invalid magnet URL: missing required parameters (xt, dn, xl, blocks)');
      }

      const id = xt.replace('urn:brightchain:', '');
      const fileName = dn;
      const originalSize = parseInt(xl, 10);

      // Parse blocks from the compact format: blockId:size,blockId:size,...
      const blockPairs = blocksParam.split(',');
      const blocks: BlockInfo[] = blockPairs.map((pair, index) => {
        const [blockId, sizeStr] = pair.split(':');
        const size = parseInt(sizeStr, 10);
        
        return {
          id: blockId,
          checksum: Checksum.fromHex(blockId),
          size,
          index,
        };
      });

      // Create CBL data from the parsed information
      const cblJson = {
        version: 1,
        fileName,
        originalSize,
        blockCount: blocks.length,
        blocks: blocks.map(b => ({ id: b.id, size: b.size })),
      };
      const cblData = new TextEncoder().encode(JSON.stringify(cblJson));

      return {
        id,
        fileName,
        originalSize,
        blockCount: blocks.length,
        blocks,
        cblData: Array.from(cblData),
        magnetUrl,
      };
    } catch (error) {
      throw new Error(`Failed to parse magnet URL: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  }
}
