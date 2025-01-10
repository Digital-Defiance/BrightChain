import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { IBlock } from '../interfaces/blockBase';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer, ChecksumString } from '../types';

/**
 * BaseBlocks do not contain data or metadata
 * They hold the data for the block and the checksum
 * Derived classes will have the data and/or metadata either on disk or in memory
 */
export abstract class BaseBlock implements IBlock {
  /**
   * The size of the block
   */
  private readonly _blockSize: BlockSize;
  /**
   * The id/checksum of the block
   */
  private readonly _checksum: ChecksumBuffer;
  /**
   * The type of the block
   */
  private readonly _blockType: BlockType;
  /**
   * The type of data in the block
   */
  private readonly _blockDataType: BlockDataType;
  /**
   * Whether the block can be read
   */
  private readonly _canRead: boolean;
  /**
   * Whether the block can be persisted to disk
   */
  private readonly _canPersist: boolean;
  /**
   * Create a new BaseBlock
   * @param type - The type of the block
   * @param blockDataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param checksum - The id/checksum of the block
   * @param creator - The block creator id/object
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted to disk
   */
  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    canRead = true,
    canPersist = true,
  ) {
    this._blockType = type;
    this._blockDataType = blockDataType;
    this._blockSize = blockSize;
    this._checksum = checksum;
    this._canRead = canRead;
    this._canPersist = canPersist;
  }
  /**
   * The size of the block
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }
  /**
   * The id/checksum of the block
   */
  public get idChecksum(): ChecksumBuffer {
    return this._checksum;
  }
  /**
   * The type of the block
   */
  public get blockType(): BlockType {
    return this._blockType;
  }
  /**
   * The type of data in the block
   */
  public get blockDataType(): BlockDataType {
    return this._blockDataType;
  }
  /**
   * The raw data in the block, either from disk or memory
   */
  public abstract get data(): Buffer;
  /**
   * The data in the block, excluding any metadata or other overhead
   */
  public get payload(): Buffer {
    return this.data.subarray(this.overhead);
  }
  /**
   * Whether the block's data has been validated against the checksum/id
   */
  public abstract get validated(): boolean;
  /**
   * The id/checksum as a string
   */
  public get checksumString(): ChecksumString {
    return StaticHelpersChecksum.checksumBufferToChecksumString(
      this.idChecksum,
    );
  }
  /**
   * Whether the block can be accessed/read
   */
  public get canRead(): boolean {
    return this._canRead;
  }
  /**
   * Whether the block can be persisted to disk
   */
  public get canPersist(): boolean {
    return this._canPersist;
  }
  /**
   * The unusable overhead of the block
   */
  public get overhead(): number {
    return 0;
  }
  /**
   * The usable capacity of the block without the overhead
   */
  public get capacity(): number {
    return (this.blockSize as number) - this.overhead;
  }
  /**
   * The overhead portion of the block's data
   */
  public get layerOverheadData(): Buffer {
    return this.data.subarray(0, this.overhead);
  }
}
