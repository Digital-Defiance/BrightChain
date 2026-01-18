import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';

/**
 * Index entry for a Constituent Block List (CBL)
 *
 * @remarks
 * Each entry in a CBL index represents metadata about a constituent block,
 * including its type, encryption status, location addresses, and size information.
 * This allows efficient lookup and reconstruction of data from constituent blocks.
 *
 * @example
 * ```typescript
 * const entry: ICBLIndexEntry = {
 *   encrypted: true,
 *   blockType: BlockType.RawData,
 *   dataType: BlockDataType.EphemeralStructuredData,
 *   addresses: ['addr1', 'addr2'],
 *   dateCreated: '2024-01-01T00:00:00Z',
 *   creatorId: 'creator-guid',
 *   blockDataLength: 4096
 * };
 * ```
 */
export interface ICBLIndexEntry {
  /** Whether the constituent block is encrypted */
  encrypted: boolean;

  /** The type of the constituent block */
  blockType: BlockType;

  /** The data type classification of the block content */
  dataType: BlockDataType;

  /** Array of addresses where this block can be found */
  addresses: string[];

  /** ISO 8601 timestamp when the block was created */
  dateCreated: string;

  /** Unique identifier of the block creator */
  creatorId: string;

  /**
   * Length of the original file data (optional)
   * @remarks Only present for blocks containing file data
   */
  fileDataLength?: string;

  /** Length of the block data in bytes */
  blockDataLength: number;
}
