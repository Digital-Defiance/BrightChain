import { existsSync, readFileSync, writeFileSync } from 'fs';
import { BaseBlock } from '../blocks/base';
import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import { ISimpleStore } from '../interfaces/simpleStore';
import { ChecksumBuffer } from '../types';
import { DiskBlockStore } from './diskBlockStore';

export class DiskBlockSyncStore
  extends DiskBlockStore
  implements ISimpleStore<ChecksumBuffer, BaseBlock>
{
  constructor(storePath: string, blockSize: BlockSize) {
    super(storePath, blockSize);
  }
  has(key: ChecksumBuffer): boolean {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }
  get(key: ChecksumBuffer): BaseBlock {
    const blockPath = this.blockPath(key);
    const blockData = readFileSync(blockPath);
    if (blockData.length !== this._blockSize) {
      throw new Error(
        `Block size mismatch. Expected ${this._blockSize} but got ${blockData.length}.`,
      );
    }
    const metadata = JSON.parse(
      readFileSync(this.metadataPath(key)).toString(),
    ) as IBlockMetadata;
    // Create a concrete block instance using RawDataBlock
    const block = new RawDataBlock(
      this._blockSize,
      blockData,
      new Date(metadata.dateCreated), // Convert string to Date
      key,
    );
    if (!block.validate()) {
      throw new Error(`Block ${key.toString('hex')} failed validation`);
    }
    return block;
  }
  set(key: ChecksumBuffer, value: BaseBlock): void {
    if (value.blockDataType == BlockDataType.EphemeralStructuredData) {
      throw new Error(`Cannot store ephemeral structured data`);
    }
    if (Buffer.compare(key, value.idChecksum) !== 0) {
      throw new Error(`Key ${key} does not match block ID ${value.idChecksum}`);
    }
    if (value.blockSize !== this._blockSize) {
      throw new Error(
        `Block size mismatch. Expected ${this._blockSize} but got ${value.blockSize}.`,
      );
    }
    const blockPath = this.blockPath(value.idChecksum);
    if (existsSync(blockPath)) {
      throw new Error(`Block path ${blockPath} already exists`);
    } else {
      this.ensureBlockPath(value.idChecksum);
    }
    writeFileSync(blockPath, value.data);
    writeFileSync(
      this.metadataPath(value.idChecksum),
      JSON.stringify(value.metadata),
    );
  }
}
