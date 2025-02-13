import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';

/**
 * Parameters for calculating block capacity
 */
export interface IBlockCapacityParams {
  blockSize: BlockSize;
  blockType: BlockType;
  filename?: string;
  mimetype?: string;
  recipientCount?: number;
  usesStandardEncryption: boolean;
}

/**
 * Detailed breakdown of overhead components
 */
export interface IOverheadBreakdown {
  baseHeader: number;
  typeSpecificHeader: number;
  encryptionOverhead?: number;
  variableOverhead?: number;
}

/**
 * Result of block capacity calculation
 */
export interface IBlockCapacityResult {
  totalCapacity: number;
  availableCapacity: number;
  overhead: number;
  details: IOverheadBreakdown;
}
