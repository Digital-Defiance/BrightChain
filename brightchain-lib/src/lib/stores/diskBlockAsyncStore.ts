import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Readable, Transform } from 'stream';
import { BlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSizes';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import MemoryWritableStream from '../memoryWriteableStream';
import { ChecksumTransform } from '../transforms/checksumTransform';
import XorMultipleTransformStream from '../transforms/xorMultipleTransform';
import { ChecksumBuffer } from '../types';
import { DiskBlockStore } from './diskBlockStore';

/**
 * DiskBlockAsyncStore provides asynchronous operations for storing and retrieving blocks from disk.
 * It supports block metadata, XOR operations, and stream-based data handling.
 */
export class DiskBlockAsyncStore extends DiskBlockStore {
  constructor(storePath: string, blockSize: BlockSize) {
    super(storePath, blockSize);
  }

  /**
   * Check if a block exists
   */
  public async has(key: ChecksumBuffer): Promise<boolean> {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }

  /**
   * Get a handle to a block
   */
  public get(key: ChecksumBuffer): BlockHandle {
    return new BlockHandle(key, this._blockSize, this.blockPath(key));
  }

  /**
   * Get a block's data
   */
  public getData(key: ChecksumBuffer): RawDataBlock {
    const blockPath = this.blockPath(key);
    if (!existsSync(blockPath)) {
      throw new Error(`Block file not found: ${blockPath}`);
    }

    const data = readFileSync(blockPath);
    if (data.length !== this._blockSize) {
      throw new Error('Block file size mismatch');
    }

    const metadataPath = `${blockPath}.m.json`;
    let dateCreated = new Date();
    if (existsSync(metadataPath)) {
      try {
        const metadataJson = readFileSync(metadataPath).toString();
        const metadata = JSON.parse(metadataJson);
        if (metadata.dateCreated) {
          dateCreated = new Date(metadata.dateCreated);
        }
      } catch (error) {
        throw new Error(
          `Invalid block metadata: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return new RawDataBlock(
      this._blockSize,
      data,
      dateCreated,
      key,
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Store a block's data
   */
  public setData(block: RawDataBlock): void {
    if (block.blockSize !== this._blockSize) {
      throw new Error(
        `Block size mismatch. Expected ${this._blockSize} but got ${block.blockSize}.`,
      );
    }

    if (!block.validated) {
      throw new Error('Block is not validated');
    }

    const blockPath = this.blockPath(block.idChecksum);
    if (existsSync(blockPath)) {
      throw new Error(`Block path ${blockPath} already exists`);
    }

    writeFileSync(blockPath, block.data);
    writeFileSync(
      this.metadataPath(block.idChecksum),
      JSON.stringify(block.metadata),
    );
  }

  /**
   * XOR multiple blocks together
   */
  public async xor(
    blocks: BlockHandle[],
    destBlockMetadata: IBlockMetadata,
  ): Promise<RawDataBlock> {
    if (!blocks.length) {
      throw new Error('No blocks provided');
    }

    return new Promise((resolve, reject) => {
      const readStreams = this.createReadStreams(blocks);
      const xorStream = new XorMultipleTransformStream(readStreams);
      const checksumStream = new ChecksumTransform();
      const writeStream = new MemoryWritableStream();

      // Set up pipeline
      xorStream.pipe(checksumStream).pipe(writeStream);

      // Handle stream ends
      this.handleReadStreamEnds(readStreams, xorStream);

      // Handle checksum calculation
      checksumStream.on('checksum', (checksumBuffer) => {
        try {
          const block = new RawDataBlock(
            this._blockSize,
            writeStream.data,
            new Date(destBlockMetadata.dateCreated),
            checksumBuffer,
            true, // canRead
            true, // canPersist
          );
          resolve(block);
        } catch (error) {
          reject(error);
        } finally {
          this.cleanupStreams([
            ...readStreams,
            xorStream,
            checksumStream,
            writeStream,
          ]);
        }
      });

      // Handle errors
      const handleError = (error: Error) => {
        this.cleanupStreams([
          ...readStreams,
          xorStream,
          checksumStream,
          writeStream,
        ]);
        reject(error);
      };

      readStreams.forEach((stream) => stream.on('error', handleError));
      xorStream.on('error', handleError);
      checksumStream.on('error', handleError);
      writeStream.on('error', handleError);
    });
  }

  /**
   * Create read streams for blocks
   */
  private createReadStreams(blocks: BlockHandle[]): Readable[] {
    return blocks.map((block) => block.getReadStream());
  }

  /**
   * Handle read stream ends
   */
  private handleReadStreamEnds(
    readStreams: Readable[],
    xorStream: Transform,
  ): void {
    let endedStreams = 0;
    readStreams.forEach((readStream) => {
      readStream.on('end', () => {
        if (++endedStreams === readStreams.length) {
          xorStream.end();
        }
      });
    });
  }

  /**
   * Clean up streams
   */
  private cleanupStreams(
    streams: Array<Readable | Transform | MemoryWritableStream>,
  ): void {
    streams.forEach((stream) => {
      try {
        stream.destroy();
      } catch {
        // Ignore errors during cleanup
      }
    });
  }
}
