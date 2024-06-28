import { createWriteStream, existsSync, rename, writeFileSync } from "fs";
import { DiskBlockStore } from "./diskBlockStore";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockHandle } from "../blocks/handle";
import { ChecksumBuffer } from "../types";
import { ChecksumTransform } from "../transforms/checksumTransform";
import { XorTransform } from '../transforms/xorTransform';
import { file } from 'tmp';
import { BaseBlock } from "../blocks/base";
import { IBlockMetadata } from "../interfaces/blockMetadata";
import XorMultipleTransformStream from "../transforms/xorMultipleTransform";
import { Readable, Transform, Writable } from "stream";
import MemoryWritableStream from "../memoryWriteableStream";

export class DiskBlockAsyncStore extends DiskBlockStore {
  constructor(storePath: string, blockSize: BlockSize) {
    super(storePath, blockSize);
  }
  public async has(key: ChecksumBuffer): Promise<boolean> {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }
  public get(key: ChecksumBuffer): BlockHandle {
    const blockHandle = new BlockHandle(key, this._blockSize, this.blockPath(key));
    return blockHandle;
  }
  public getData(key: ChecksumBuffer): BaseBlock {
    const handle = this.get(key);
    const metadata = handle.metadata;
    return new BaseBlock(this._blockSize, handle.getDataSync(), metadata.dataType, metadata.lengthBeforeEncryption, metadata.dateCreated, key);
  }
  public setData(block: BaseBlock) {
    if (block.blockSize !== this._blockSize) {
      throw new Error(`Block size mismatch. Expected ${this._blockSize} but got ${block.blockSize}.`);
    }
    if (!block.validated) {
      throw new Error(`Block is not validated`);
    }
    const blockPath = this.blockPath(block.id);
    if (existsSync(blockPath)) {
      throw new Error(`Block path ${blockPath} already exists`);
    }
    writeFileSync(blockPath, block.data);
    writeFileSync(this.metadataPath(block.id), JSON.stringify(block.metadata));
  }
  public async xor(blocks: BlockHandle[], destBlockMetadata: IBlockMetadata): Promise<BaseBlock> {
    return new Promise((resolve, reject) => {

        const readStreams = this.createReadStreams(blocks);
        const xorStream = new XorMultipleTransformStream(readStreams);
        const checksumStream = new ChecksumTransform();

        this.handleReadStreamEnds(readStreams, xorStream);

        const writeStream = new MemoryWritableStream();
        xorStream.pipe(checksumStream).pipe(writeStream);

        this.handleChecksum(checksumStream, writeStream, destBlockMetadata, resolve, reject);
        writeStream.on('error', reject);
    });
  }

  private createReadStreams(blocks: BlockHandle[]): Readable[] {
    return blocks.map(block => block.getReadStream());
  }

  private handleReadStreamEnds(readStreams: Readable[], xorStream: Transform) {
    let endedStreams = 0;
    readStreams.forEach(readStream => {
      readStream.on('end', () => {
        if (++endedStreams === readStreams.length) {
          xorStream.end();
        }
      });
    });
  }

  private handleChecksum(checksumStream: ChecksumTransform, writeStream: MemoryWritableStream, metadata: IBlockMetadata, resolve: (value: BaseBlock) => void, reject: (reason?: any) => void) {
    checksumStream.on('checksum', (checksumBuffer) => {
      const block = new BaseBlock(this._blockSize, writeStream.data, metadata.dataType, metadata.lengthBeforeEncryption, metadata.dateCreated, checksumBuffer);
      resolve(block);
    });
    checksumStream.on('error', reject);
  }
}