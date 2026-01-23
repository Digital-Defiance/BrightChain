import {
  CHECKSUM,
  ChecksumUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BlockSize } from './enumerations/blockSize';

// Simple checksum calculation using Web Crypto API
async function calculateChecksum(
  data: Uint8Array,
): Promise<ChecksumUint8Array> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    data.buffer instanceof ArrayBuffer
      ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      : new ArrayBuffer(0),
  );
  return new Uint8Array(hashBuffer) as ChecksumUint8Array;
}

// Simplified block interface for browser use
interface SimpleBlock {
  id: string;
  data: Uint8Array;
  checksum: ChecksumUint8Array;
  size: number;
}

// Simple in-memory store for browser
class SimpleBrowserStore {
  private blocks = new Map<string, SimpleBlock>();

  async store(data: Uint8Array): Promise<SimpleBlock> {
    const checksum = await calculateChecksum(data);
    const id = uint8ArrayToHex(checksum);
    const block: SimpleBlock = {
      id,
      data: data.slice(), // Copy the data
      checksum,
      size: data.length,
    };
    this.blocks.set(id, block);
    return block;
  }

  async retrieve(checksum: ChecksumUint8Array): Promise<SimpleBlock> {
    const id = uint8ArrayToHex(checksum);
    const block = this.blocks.get(id);
    if (!block) {
      throw new Error(`Block not found: ${id}`);
    }
    return block;
  }
}

export interface BlockInfo {
  id: string;
  checksum: ChecksumUint8Array;
  size: number;
  index: number;
}

export interface FileReceipt {
  id: string;
  fileName: string;
  originalSize: number;
  blockCount: number;
  blocks: BlockInfo[];
  cblData: number[];
  magnetUrl: string;
  type?: 'file' | 'message';
  messageMetadata?: {
    senderId: string;
    recipients: string[];
    timestamp: Date;
    content?: string;
  };
}

export class BrightChain {
  private store: SimpleBrowserStore;
  private blockSize: BlockSize;

  constructor(blockSize: BlockSize = BlockSize.Small) {
    this.blockSize = blockSize;
    this.store = new SimpleBrowserStore();
  }

  async storeFile(
    fileData: Uint8Array,
    fileName = 'untitled',
  ): Promise<FileReceipt> {
    const blocks: BlockInfo[] = [];
    const chunkSize = this.blockSize as number;

    for (let i = 0; i < fileData.length; i += chunkSize) {
      const chunk = fileData.slice(i, Math.min(i + chunkSize, fileData.length));
      const paddedChunk = new Uint8Array(chunkSize);
      paddedChunk.set(chunk);

      // Fill remaining space with random data for padding
      if (chunk.length < chunkSize) {
        crypto.getRandomValues(paddedChunk.subarray(chunk.length));
      }

      const block = await this.store.store(paddedChunk);

      blocks.push({
        id: block.id,
        checksum: block.checksum,
        size: chunk.length, // Original chunk size, not padded
        index: blocks.length,
      });
    }

    const cblData = this.createCBL(blocks, fileData.length, fileName);
    const receiptId = uint8ArrayToHex(
      new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH).map(() =>
        Math.floor(Math.random() * 256),
      ),
    );

    return {
      id: receiptId,
      fileName,
      originalSize: fileData.length,
      blockCount: blocks.length,
      blocks,
      cblData: Array.from(cblData),
      magnetUrl: this.createMagnetUrl(receiptId, fileName, fileData.length),
    };
  }

  async retrieveFile(receipt: FileReceipt): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];

    for (const blockInfo of receipt.blocks) {
      const block = await this.store.retrieve(blockInfo.checksum);
      // Only take the original data size, not the padding
      chunks.push(block.data.slice(0, blockInfo.size));
    }

    const result = new Uint8Array(receipt.originalSize);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

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
    });
    return new TextEncoder().encode(header);
  }

  private createMagnetUrl(id: string, fileName: string, size: number): string {
    const params = new URLSearchParams({
      xt: `urn:brightchain:${id}`,
      dn: fileName,
      xl: size.toString(),
    });
    return `magnet:?${params.toString()}`;
  }
}
