import { BlockMetadata } from '../blockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { logValidationFailure } from '../logging/blockLogger';
import type { ChecksumService } from '../services/checksum.service';
import { getGlobalServiceProvider } from '../services/globalServiceProvider';
import { Checksum } from '../types/checksum';
import { BaseBlock } from './base';

/**
 * RawDataBlock represents a block containing raw, unencrypted data.
 * It provides basic data storage and validation capabilities.
 */
export class RawDataBlock extends BaseBlock {
  private readonly _data: Uint8Array;
  private readonly _checksumService?: ChecksumService;

  constructor(
    blockSize: BlockSize,
    data: Uint8Array,
    dateCreated?: Date,
    checksum?: Checksum,
    blockType: BlockType = BlockType.RawData,
    blockDataType: BlockDataType = BlockDataType.RawData,
    canRead = true,
    canPersist = true,
    checksumService?: ChecksumService,
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

    // Calculate checksum if not provided
    let calculatedChecksum: Checksum;
    if (checksum) {
      calculatedChecksum = checksum;
    } else if (checksumService) {
      calculatedChecksum = checksumService.calculateChecksum(data);
    } else {
      // Use global service provider for backward compatibility
      calculatedChecksum =
        getGlobalServiceProvider().checksumService.calculateChecksum(data);
    }
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
      calculatedChecksum,
      metadata,
      canRead,
      canPersist,
    );

    this._data = data;
    this._checksumService = checksumService;
  }

  /**
   * The raw data in the block
   */
  public override get data(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._data;
  }

  /**
   * The data in the block, excluding any metadata or other overhead
   */
  public override get layerPayload(): Uint8Array {
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

  public get layerData(): Uint8Array {
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
    let calculatedChecksum: Checksum;
    if (this._checksumService) {
      calculatedChecksum = this._checksumService.calculateChecksum(this._data);
    } else {
      // Use global service provider for backward compatibility
      calculatedChecksum =
        getGlobalServiceProvider().checksumService.calculateChecksum(
          this._data,
        );
    }

    // Compare checksums using the Checksum.equals() method
    if (!calculatedChecksum.equals(this.idChecksum)) {
      const error = new ChecksumMismatchError(
        this.idChecksum,
        calculatedChecksum,
      );
      // Log validation failure with error type and metadata
      logValidationFailure(
        this.idChecksum.toHex(),
        BlockType[this.blockType],
        error,
        { blockSize: this.blockSize },
      );
      throw error;
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
  public override get layerHeaderData(): Uint8Array {
    // Raw data blocks don't have any layer-specific header data
    return new Uint8Array(0);
  }
}
