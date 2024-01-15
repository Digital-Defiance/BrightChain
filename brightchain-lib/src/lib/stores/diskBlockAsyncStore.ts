import { createWriteStream, existsSync, rename, writeFileSync } from "fs";
import { DiskBlockStore } from "./diskBlockStore";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockHandle } from "../blocks/handle";
import { ChecksumBuffer } from "../types";
import { ChecksumTransform } from "../transforms/checksumTransform";
import { XorTransform } from '../transforms/xorTransform';
import { file } from 'tmp';
import { BaseBlock } from "../blocks/base";
import { BlockMetadata } from "../interfaces/blockMetadata";
import XorMultipleTransformStream from "../transforms/xorMultipleTransform";
import { Readable, Transform } from "stream";

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
  public async xor(blocks: BlockHandle[], destBlockMetadata: BlockMetadata): Promise<BlockHandle> {
    return new Promise((resolve, reject) => {
      this.createTempFile((err, tempFilePath) => {
        if (err) return reject(err);

        const readStreams = this.createReadStreams(blocks);
        const xorStream = new XorMultipleTransformStream(readStreams);
        const checksumStream = new ChecksumTransform();

        this.handleReadStreamEnds(readStreams, xorStream);

        const writeStream = createWriteStream(tempFilePath);
        xorStream.pipe(checksumStream).pipe(writeStream);

        this.handleChecksum(checksumStream, tempFilePath, destBlockMetadata, resolve, reject);
        writeStream.on('error', reject);
      });
    });
  }

  private createTempFile(callback: (err: Error | null, tempFilePath: string) => void) {
    file(callback);
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

  private handleChecksum(checksumStream: ChecksumTransform, tempFilePath: string, metadata: BlockMetadata, resolve: (value: BlockHandle) => void, reject: (reason?: any) => void) {
    checksumStream.on('checksum', (checksumBuffer) => {
      const checksum = checksumBuffer.toString('hex');
      const newPath = this.blockPath(checksum);
      if (existsSync(newPath)) {
        return reject(new Error(`Block path ${newPath} already exists`));
      }

      this.renameAndWriteMetadata(tempFilePath, newPath, checksumBuffer as ChecksumBuffer, metadata, resolve, reject);
    });
  }

  private renameAndWriteMetadata(tempFilePath: string, newPath: string, checksumBuffer: ChecksumBuffer, metadata: BlockMetadata, resolve: (value: BlockHandle) => void, reject: (reason?: any) => void) {
    rename(tempFilePath, newPath, (err) => {
      if (err) return reject(err);
      const newBlockHandle = new BlockHandle(checksumBuffer, this._blockSize, this.blockPath(checksumBuffer));
      writeFileSync(this.metadataPath(checksumBuffer), JSON.stringify(metadata));
      resolve(newBlockHandle);
    });
  }
}