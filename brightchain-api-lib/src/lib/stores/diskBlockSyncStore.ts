import {
  BaseBlock,
  BlockDataType,
  BlockSize,
  Checksum,
  IBaseBlockMetadata,
  ISimpleStore,
  RawDataBlock,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DiskBlockStore } from './diskBlockStore';

export class DiskBlockSyncStore
  extends DiskBlockStore
  implements ISimpleStore<Checksum, BaseBlock>
{
  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
  }

  has(key: Checksum): boolean {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }

  get(key: Checksum): BaseBlock {
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

  set(key: Checksum, value: BaseBlock): void {
    if (value.blockDataType == BlockDataType.EphemeralStructuredData) {
      throw new StoreError(StoreErrorType.CannotStoreEphemeralData);
    }
    if (!key.equals(value.idChecksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch, undefined, {
        KEY: key.toHex(),
        BLOCK_ID: value.idChecksum.toHex(),
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
