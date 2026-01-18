import { RawDataBlock } from './blocks/rawData';
import { CHECKSUM } from './constants';
import { BlockSize } from './enumerations/blockSize';
import { MemoryBlockStore } from './stores/memoryBlockStore';
import { Checksum } from './types';

export interface BlockInfo {
  id: string;
  checksum: Checksum;
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
}

export class BrowserBrightChain {
  private blockStore: MemoryBlockStore;
  private blockSize: BlockSize;

  constructor(blockSize: BlockSize = BlockSize.Small) {
    this.blockSize = blockSize;
    this.blockStore = new MemoryBlockStore(blockSize);
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
    const randomBytes = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
    crypto.getRandomValues(randomBytes);
    const receiptId = Checksum.fromUint8Array(randomBytes).toHex();

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
      const block = await this.blockStore.getData(blockInfo.checksum);
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

  getBlockStore(): MemoryBlockStore {
    return this.blockStore;
  }
}

// Export as BrightChain for compatibility
export { BrowserBrightChain as BrightChain };
