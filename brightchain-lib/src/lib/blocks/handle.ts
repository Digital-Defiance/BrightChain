import {
  ReadStream,
  WriteStream,
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
} from 'fs';
import { BlockSize } from '../enumerations/blockSizes';
import { ChecksumBuffer } from '../types';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { IBlockMetadata } from '../interfaces/blockMetadata';

/**
 * A block handle is a reference to a block in a block store.
 * It does not have the block data itself, but it has the block ID and the block size.
 */
export class BlockHandle {
  public readonly id: ChecksumBuffer;
  public readonly blockSize: BlockSize;
  public readonly path: string;
  public get dataLength(): number {
    return this.blockSize as number;
  }
  public get metadata(): IBlockMetadata {
    const path = this.path + '.m.json';
    return JSON.parse(readFileSync(path).toString()) as IBlockMetadata;
  }
  public getDataSync(): Buffer {
    return readFileSync(this.path);
  }
  public getReadStream(): ReadStream {
    return createReadStream(this.path);
  }
  public getWriteStream(overwrite = false): WriteStream {
    if (existsSync(this.path) && !overwrite) {
      throw new Error('File already exists');
    }
    return createWriteStream(this.path);
  }
  public async calculateChecksum(): Promise<ChecksumBuffer> {
    return new Promise((resolve, reject) => {
      const readStream = this.getReadStream();
      const checksumTransform = new ChecksumTransform();

      readStream.pipe(checksumTransform);

      checksumTransform.on('checksum', (checksum) => {
        resolve(checksum);
      });

      readStream.on('error', (error) => {
        reject(error);
      });

      checksumTransform.on('error', (error) => {
        reject(error);
      });
    });
  }
  public async verifyChecksum(): Promise<boolean> {
    const checksum = await this.calculateChecksum();
    return checksum.equals(this.id);
  }
  constructor(id: ChecksumBuffer, blockSize: BlockSize, path: string) {
    this.id = id;
    this.blockSize = blockSize;
    this.path = path;
  }
}
