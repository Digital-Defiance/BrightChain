import { existsSync, readFileSync, writeFileSync } from 'fs';
import { BaseBlock } from '../blocks/base';
import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBaseBlockMetadata } from '../interfaces/blocks/metadata/blockMetadata';
import { ISimpleStore } from '../interfaces/simpleStore';
import { ChecksumUint8Array } from '../types';
import { DiskBlockStore } from './diskBlockStore';

export class DiskBlockSyncStore
  extends DiskBlockStore
  implements ISimpleStore<ChecksumUint8Array, BaseBlock>
{
  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
  }

  has(key: ChecksumUint8Array): boolean {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }

  get(key: ChecksumUint8Array): BaseBlock {
    const blockPath = this.blockPath(key);
    const blockData = readFileSync(blockPath);
    if (blockData.length !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockFileSizeMismatch);
    }
    const metadata = JSON.parse(
      readFileSync(this.metadataPath(key)).toString(),
    ) as IBaseBlockMetadata;
    // Create a concrete block instance using RawDataBlock
    const block = new RawDataBlock(
      this._blockSize,
      blockData,
      new Date(metadata.dateCreated), // Convert string to Date
      key,
    );
    block.validateSync();
    return block;
  }

  set(key: ChecksumUint8Array, value: BaseBlock): void {
    if (value.blockDataType == BlockDataType.EphemeralStructuredData) {
      throw new StoreError(StoreErrorType.CannotStoreEphemeralData);
    }
    if (Buffer.compare(key, value.idChecksum) !== 0) {
      throw new StoreError(StoreErrorType.BlockIdMismatch, undefined, {
        KEY: key.toString('hex'),
        BLOCK_ID: value.idChecksum.toString('hex'),
      });
    }
    if (value.blockSize !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeMismatch);
    }
    const blockPath = this.blockPath(value.idChecksum);
    if (existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists, undefined, {
        PATH: blockPath,
      });
    } else {
      this.ensureBlockPath(value.idChecksum);
    }
    writeFileSync(blockPath, value.data.toString());
    writeFileSync(
      this.metadataPath(value.idChecksum),
      JSON.stringify(value.metadata),
    );
  }
}
