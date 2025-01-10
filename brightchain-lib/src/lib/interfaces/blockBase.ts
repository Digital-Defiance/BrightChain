import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer, ChecksumString } from '../types';

export interface IBlock {
  /**
   * The size of the block
   */
  get blockSize(): BlockSize;
  /**
   * The id/checksum of the block
   */
  get idChecksum(): ChecksumBuffer;
  /**
   * The type of the block
   */
  get blockType(): BlockType;
  /**
   * The type of data in the block
   */
  get blockDataType(): BlockDataType;
  /**
   * The raw data in the block, either from disk or memory
   */
  get data(): Buffer;
  /**
   * The id/checksum as a string
   */
  get checksumString(): ChecksumString;
  /**
   * Whether the block can be persisted to disk
   */
  get canPersist(): boolean;
  /**
   * Whether the block can be read
   */
  get canRead(): boolean;
  /**
   * The amount of unusable space in the block
   */
  get overhead(): number;
  /**
   * The amount of usable space in the block after overhead
   */
  get capacity(): number;
  /**
   * The data in the block, excluding any metadata or other overhead
   */
  get payload(): Buffer;
  /**
   * The segment of the block's data that follows the parent block type's overhead and precedes the actual payload
   */
  get layerOverheadData(): Buffer;
}
