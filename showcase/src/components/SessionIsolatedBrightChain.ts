/* eslint-disable @nx/enforce-module-boundaries */
/**
 * Session-isolated BrightChain implementation for the demo
 *
 * This implementation addresses the memory persistence issue by using
 * a session-isolated memory block store that properly clears on page refresh.
 */

import {
  BlockInfo,
  BlockSize,
  CBLMagnetComponents,
  CBLWhiteningOptions,
  Checksum,
  FileReceipt,
  initializeBrightChain,
  RawDataBlock,
} from '@brightchain/brightchain-lib';
import { SessionIsolatedMemoryBlockStore } from './SessionIsolatedMemoryBlockStore';

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

    console.log(
      `SessionIsolatedBrightChain initialized with session: ${this.blockStore.getSessionId()}`,
    );
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

    console.log(
      `Storing file "${fileName}" (${fileData.length} bytes) in session ${this.blockStore.getSessionId()}`,
    );

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

      // Use browser-safe hex conversion
      const blockIdHex = checksumToHex(block.idChecksum);
      console.log(
        `Block ${blocks.length} ID (first 40 chars): ${blockIdHex.substring(0, 40)}... (length: ${blockIdHex.length})`,
      );

      blocks.push({
        id: blockIdHex,
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
      magnetUrl: this.createMagnetUrl(
        receiptId,
        fileName,
        fileData.length,
        blocks,
      ),
    };

    console.log(
      `File "${fileName}" stored successfully with ${blocks.length} blocks in session ${this.blockStore.getSessionId()}`,
    );
    return receipt;
  }

  /**
   * Retrieve a file from its receipt
   */
  async retrieveFile(receipt: FileReceipt): Promise<Uint8Array> {
    console.log(
      `Retrieving file "${receipt.fileName}" from session ${this.blockStore.getSessionId()}`,
    );

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

      console.log(
        `File "${receipt.fileName}" retrieved successfully from session ${this.blockStore.getSessionId()}`,
      );
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
  private createMagnetUrl(
    id: string,
    fileName: string,
    size: number,
    blocks?: BlockInfo[],
  ): string {
    const params = new URLSearchParams({
      xt: `urn:brightchain:${id}`,
      dn: fileName,
      xl: size.toString(),
    });

    // Add block information to the magnet URL
    if (blocks && blocks.length > 0) {
      // Debug: log first block ID to verify format
      console.log(
        `createMagnetUrl: First block ID type: ${typeof blocks[0].id}, value (first 40): ${String(blocks[0].id).substring(0, 40)}...`,
      );

      // Encode blocks as a compact format: blockId:size,blockId:size,...
      const blocksStr = blocks.map((b) => `${b.id}:${b.size}`).join(',');
      console.log(
        `createMagnetUrl: blocksStr (first 100): ${blocksStr.substring(0, 100)}...`,
      );
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
   * Get the block store instance
   */
  public getBlockStore(): SessionIsolatedMemoryBlockStore {
    return this.blockStore;
  }

  /**
   * Validate a hex string for block ID format
   * @param hex - The hex string to validate
   * @param context - Context for error messages (e.g., "block 0", "CBL")
   * @throws Error if the hex string is invalid
   */
  private validateBlockIdHex(hex: string, context: string): void {
    const expectedLength = 128; // SHA3-512 = 64 bytes = 128 hex chars

    if (!hex || typeof hex !== 'string') {
      throw new Error(`${context}: block ID is missing or not a string`);
    }

    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      const invalidChars = hex.match(/[^0-9a-fA-F]/g);
      const uniqueInvalid = [...new Set(invalidChars)].slice(0, 5).join(', ');
      throw new Error(
        `${context}: block ID contains invalid characters (${uniqueInvalid}). ` +
          `Block IDs must be hexadecimal (0-9, a-f). Got: "${hex.substring(0, 20)}${hex.length > 20 ? '...' : ''}"`,
      );
    }

    if (hex.length !== expectedLength) {
      throw new Error(
        `${context}: block ID has wrong length. Expected ${expectedLength} hex characters, got ${hex.length}. ` +
          `Block IDs are SHA3-512 hashes (64 bytes = 128 hex chars).`,
      );
    }
  }

  /**
   * Parse a CBL file and create a FileReceipt
   */
  public parseCBL(cblData: Uint8Array): FileReceipt {
    try {
      const cblText = new TextDecoder().decode(cblData);

      let cblJson;
      try {
        cblJson = JSON.parse(cblText);
      } catch {
        throw new Error(
          'CBL file is not valid JSON. Make sure you uploaded a .cbl file generated by this demo.',
        );
      }

      // Validate required fields
      if (!cblJson.blocks || !Array.isArray(cblJson.blocks)) {
        throw new Error('CBL file is missing "blocks" array');
      }
      if (!cblJson.fileName) {
        throw new Error('CBL file is missing "fileName"');
      }
      if (typeof cblJson.originalSize !== 'number') {
        throw new Error('CBL file is missing or has invalid "originalSize"');
      }

      const blocks: BlockInfo[] = cblJson.blocks.map(
        (b: { id: string; size: number }, index: number) => {
          // Validate block ID before parsing
          this.validateBlockIdHex(b.id, `Block ${index}`);

          return {
            id: b.id,
            checksum: checksumFromHex(b.id),
            size: b.size,
            index,
          };
        },
      );

      const receiptId = bytesToHex(
        new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
      );

      return {
        id: receiptId,
        fileName: cblJson.fileName,
        originalSize: cblJson.originalSize,
        blockCount: cblJson.blockCount || blocks.length,
        blocks,
        cblData: Array.from(cblData),
        // Include blocks in the magnet URL so it can be used for reconstruction
        magnetUrl: this.createMagnetUrl(
          receiptId,
          cblJson.fileName,
          cblJson.originalSize,
          blocks,
        ),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse CBL: ${error instanceof Error ? error.message : 'Invalid format'}`,
      );
    }
  }

  /**
   * Parse a magnet URL and create a FileReceipt
   * The magnet URL contains all information needed to reconstruct the file
   */
  public parseMagnetUrl(magnetUrl: string): FileReceipt {
    try {
      // Basic validation
      if (!magnetUrl || typeof magnetUrl !== 'string') {
        throw new Error('Magnet URL is empty or invalid');
      }

      const trimmedUrl = magnetUrl.trim();

      if (!trimmedUrl.startsWith('magnet:?')) {
        throw new Error(
          'Invalid magnet URL format. URL must start with "magnet:?". ' +
            `Got: "${trimmedUrl.substring(0, 30)}${trimmedUrl.length > 30 ? '...' : ''}"`,
        );
      }

      const url = new URL(trimmedUrl);
      const params = new URLSearchParams(url.search);

      const xt = params.get('xt');
      const dn = params.get('dn');
      const xl = params.get('xl');
      const blocksParam = params.get('blocks');

      // Detailed validation of required parameters
      const missing: string[] = [];
      if (!xt) missing.push('xt (file identifier)');
      if (!dn) missing.push('dn (file name)');
      if (!xl) missing.push('xl (file size)');
      if (!blocksParam) missing.push('blocks (block list)');

      if (missing.length > 0) {
        throw new Error(
          `Invalid magnet URL: missing required parameters: ${missing.join(', ')}. ` +
            'Make sure you copied the complete magnet URL from the demo.',
        );
      }

      if (!xt!.startsWith('urn:brightchain:')) {
        throw new Error(
          'Invalid magnet URL: xt parameter must start with "urn:brightchain:". ' +
            `Got: "${xt!.substring(0, 30)}"`,
        );
      }

      const id = xt!.replace('urn:brightchain:', '');
      const fileName = dn!;
      const originalSize = parseInt(xl!, 10);

      if (isNaN(originalSize) || originalSize < 0) {
        throw new Error(`Invalid file size in magnet URL: "${xl}"`);
      }

      // Parse blocks from the compact format: blockId:size,blockId:size,...
      const blockPairs = blocksParam!.split(',').filter((p) => p.trim());

      if (blockPairs.length === 0) {
        throw new Error('Invalid magnet URL: blocks parameter is empty');
      }

      const blocks: BlockInfo[] = blockPairs.map((pair, index) => {
        const parts = pair.split(':');
        if (parts.length !== 2) {
          throw new Error(
            `Invalid block format at position ${index}: expected "blockId:size" format (e.g., "abc123def...:1024"), ` +
              `but got "${pair.substring(0, 50)}${pair.length > 50 ? '...' : ''}". ` +
              `This magnet URL may be from an older version or incomplete. Please use the CBL file instead, ` +
              `or copy a fresh magnet URL from the demo after uploading your file.`,
          );
        }

        const [blockId, sizeStr] = parts;
        const size = parseInt(sizeStr, 10);

        if (isNaN(size) || size < 0) {
          throw new Error(
            `Invalid block size at position ${index}: "${sizeStr}"`,
          );
        }

        // Validate block ID format
        this.validateBlockIdHex(blockId, `Block ${index}`);

        return {
          id: blockId,
          checksum: checksumFromHex(blockId),
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
        blocks: blocks.map((b) => ({ id: b.id, size: b.size })),
      };
      const cblData = new TextEncoder().encode(JSON.stringify(cblJson));

      return {
        id,
        fileName,
        originalSize,
        blockCount: blocks.length,
        blocks,
        cblData: Array.from(cblData),
        magnetUrl: trimmedUrl,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse magnet URL: ${error instanceof Error ? error.message : 'Invalid format'}`,
      );
    }
  }

  // === CBL Whitening Operations ===

  /**
   * Store a file with CBL whitening enabled.
   * This provides Owner-Free storage by splitting the CBL into two XOR components.
   *
   * @param fileData - The file data to store
   * @param fileName - The file name (default: 'untitled')
   * @param options - Optional whitening options (encryption flag)
   * @returns Extended receipt with whitening information
   */
  public async storeFileWithWhitening(
    fileData: Uint8Array,
    fileName = 'untitled',
    options?: CBLWhiteningOptions,
  ): Promise<FileReceiptWithWhitening> {
    // 1. Store file normally to get receipt with CBL
    const receipt = await this.storeFile(fileData, fileName);

    // 2. Whiten the CBL
    const cblData = new Uint8Array(receipt.cblData);
    const whiteningResult = await this.blockStore.storeCBLWithWhitening(
      cblData,
      options,
    );

    console.log(
      `File "${fileName}" stored with CBL whitening in session ${this.blockStore.getSessionId()}`,
    );

    // 3. Return extended receipt
    return {
      ...receipt,
      whitening: {
        blockId1: whiteningResult.blockId1,
        blockId2: whiteningResult.blockId2,
        blockSize: whiteningResult.blockSize,
        magnetUrl: whiteningResult.magnetUrl,
        block1ParityIds: whiteningResult.block1ParityIds,
        block2ParityIds: whiteningResult.block2ParityIds,
        isEncrypted: whiteningResult.isEncrypted,
      },
    };
  }

  /**
   * Retrieve a file using a whitened CBL magnet URL.
   * This reconstructs the CBL from its XOR components and then retrieves the file.
   *
   * @param magnetUrl - The whitened CBL magnet URL
   * @returns The original file data
   */
  public async retrieveFileFromWhitenedCBL(
    magnetUrl: string,
  ): Promise<Uint8Array> {
    // 1. Parse magnet URL
    const components = this.blockStore.parseCBLMagnetUrl(magnetUrl);

    console.log(
      `Retrieving file from whitened CBL in session ${this.blockStore.getSessionId()}`,
    );

    // 2. Reconstruct CBL
    const cblData = await this.blockStore.retrieveCBL(
      components.blockId1,
      components.blockId2,
      components.block1ParityIds,
      components.block2ParityIds,
    );

    // 3. Parse CBL and retrieve file
    const receipt = this.parseCBL(cblData);
    return this.retrieveFile(receipt);
  }

  /**
   * Parse a whitened CBL magnet URL and extract component information.
   *
   * @param magnetUrl - The whitened CBL magnet URL
   * @returns Object containing block IDs, block size, parity IDs, and encryption flag
   */
  public parseWhitenedCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    return this.blockStore.parseCBLMagnetUrl(magnetUrl);
  }

  /**
   * Parse a whitened CBL magnet URL and create a FileReceipt.
   * This allows the reconstructed file to be added to the receipts list.
   *
   * @param magnetUrl - The whitened CBL magnet URL
   * @returns FileReceipt for the reconstructed file with whitening info
   */
  public async parseWhitenedCBLForReceipt(
    magnetUrl: string,
  ): Promise<FileReceiptWithWhitening> {
    const components = this.blockStore.parseCBLMagnetUrl(magnetUrl);
    const cblData = await this.blockStore.retrieveCBL(
      components.blockId1,
      components.blockId2,
    );
    const receipt = this.parseCBL(cblData);
    return {
      ...receipt,
      whitening: {
        blockId1: components.blockId1,
        blockId2: components.blockId2,
        blockSize: components.blockSize,
        magnetUrl,
        block1ParityIds: components.block1ParityIds,
        block2ParityIds: components.block2ParityIds,
        isEncrypted: components.isEncrypted,
      },
    };
  }
}

/**
 * Extended FileReceipt with whitening information
 */
export interface FileReceiptWithWhitening extends FileReceipt {
  /**
   * Whitening information (if CBL was whitened)
   */
  whitening?: {
    blockId1: string;
    blockId2: string;
    blockSize: number;
    magnetUrl: string;
    block1ParityIds?: string[];
    block2ParityIds?: string[];
    isEncrypted?: boolean;
  };
}
