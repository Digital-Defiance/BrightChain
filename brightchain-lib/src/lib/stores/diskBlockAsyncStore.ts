import { createWriteStream, existsSync, readFileSync, rename, statSync, writeFileSync } from "fs";
import { DiskBlockStore } from "./diskBlockStore";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockHandle } from "../blocks/handle";
import { ChecksumBuffer } from "../types";
import { ChecksumTransform } from "../transforms/checksumTransform";
import { XorTransform } from '../transforms/xorTransform';
import { file } from 'tmp';
import { BaseBlock } from "../blocks/base";

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
  public async xor(blocks: BlockHandle[]): Promise<BlockHandle> {
    return new Promise((resolve, reject) => {
      file((err: Error, tempFilePath: string) => {
        if (err) throw err;
        const writeStream = createWriteStream(tempFilePath);
        const xorStream = new XorTransform();
        const readStreams = [...blocks.map((block) => block.getReadStream())];
        const checksumStream = new ChecksumTransform();
        // When all read streams end, end the xorStream
        let endedStreams = 0;
        readStreams.forEach(readStream => {
          readStream.on('end', () => {
            if (++endedStreams === readStreams.length) {
              xorStream.end();
            }
          });
        });
        // Create a write stream for the output
        xorStream.pipe(checksumStream).pipe(writeStream);
        checksumStream.on('checksum', (checksumBuffer) => {
          const checksum = checksumBuffer.toString('hex');
          const newPath = this.blockPath(checksum);
          if (existsSync(newPath)) {
            throw new Error(`Block path ${newPath} already exists`);
          }

          rename(tempFilePath, newPath, (err) => {
            if (err) return reject(err);
            const newBlockHandle = new BlockHandle(checksumBuffer, this._blockSize, this.blockPath(checksumBuffer));
            resolve(newBlockHandle);
          });
        });
        writeStream.on('error', reject);
      });
    });
  }
}