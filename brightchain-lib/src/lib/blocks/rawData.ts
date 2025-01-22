import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockMetadata } from '../interfaces/blockMetadata';
import { IDataBlock } from '../interfaces/dataBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * RawDataBlock represents a block containing raw, unencrypted data.
 * It provides basic data storage and validation capabilities.
 */
export class RawDataBlock extends BaseBlock implements IDataBlock {
  private readonly _data: Buffer;

  constructor(
    blockSize: BlockSize,
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
    canRead = true,
    canPersist = true,
  ) {
    const now = new Date();
    if (data.length > blockSize) {
      throw new Error(
        `Data length (${data.length}) exceeds block size (${blockSize})`,
      );
    }

    const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    super(
      BlockType.RawData,
      BlockDataType.RawData,
      blockSize,
      data,
      checksum ?? calculatedChecksum,
      dateCreated ?? now,
      BlockMetadata.create(
        blockSize,
        BlockType.RawData,
        BlockDataType.RawData,
        data.length,
        dateCreated ?? now,
      ),
      canRead,
      canPersist,
    );

    this._data = data;
  }

  /**
   * The raw data in the block
   */
  public override get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._data;
  }

  /**
   * The data in the block, excluding any metadata or other overhead
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For raw data blocks, the payload is the entire data
    return this._data;
  }

  /**
   * The actual length of the data
   */
  public get actualDataLength(): number {
    return this._data.length;
  }

  /**
   * Whether the block is encrypted
   */
  public get encrypted(): boolean {
    return false;
  }

  /**
   * Whether the block can be encrypted
   */
  public get canEncrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be decrypted
   */
  public get canDecrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be signed
   */
  public get canSign(): boolean {
    return false;
  }

  /**
   * Validate the block's data against its checksum
   */
  public override validate(): boolean {
    return StaticHelpersChecksum.calculateChecksum(this._data).equals(
      this.idChecksum,
    );
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Buffer {
    // Raw data blocks don't have any layer-specific header data
    return Buffer.alloc(0);
  }

  /**
   * Get the complete header data from all layers
   */
  public override get fullHeaderData(): Buffer {
    return Buffer.concat([super.fullHeaderData, this.layerHeaderData]);
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    return this.blockSize - this.totalOverhead;
  }
}
