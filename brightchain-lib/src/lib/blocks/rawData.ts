import { BlockMetadata } from '../blockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * RawDataBlock represents a block containing raw, unencrypted data.
 * It provides basic data storage and validation capabilities.
 */
export class RawDataBlock extends BaseBlock {
  private readonly _data: Buffer;

  constructor(
    blockSize: BlockSize,
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
    blockType: BlockType = BlockType.RawData,
    blockDataType: BlockDataType = BlockDataType.RawData,
    canRead = true,
    canPersist = true,
  ) {
    if (!data) {
      throw new Error('Data cannot be null or undefined');
    }
    const now = new Date();
    if (data.length > blockSize) {
      throw new Error(
        `Data length (${data.length}) exceeds block size (${blockSize})`,
      );
    }

    const calculatedChecksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        data,
      );
    const metadata = new BlockMetadata(
      blockSize,
      blockType,
      blockDataType,
      data.length,
      dateCreated ?? now,
    );

    super(
      blockType,
      blockDataType,
      checksum ?? calculatedChecksum,
      metadata,
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
  public override get layerPayload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For raw data blocks, the payload is the entire data
    return this._data;
  }

  public get layerOverheadSize(): number {
    return 0;
  }

  public get layerPayloadSize(): number {
    return this._data.length;
  }

  public get layerData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._data;
  }

  /**
   * The actual length of the data
   */
  public get lengthBeforeEncryption(): number {
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
   * Internal validation logic
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  protected validateInternal(): void {
    const calculatedChecksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        this._data,
      );
    if (!calculatedChecksum.equals(this.idChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, calculatedChecksum);
    }
  }

  /**
   * Synchronously validate the block's data
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validateSync(): void {
    this.validateInternal();
  }

  /**
   * Asynchronously validate the block's data
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    this.validateInternal();
  }

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validate(): void {
    this.validateSync();
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
}
