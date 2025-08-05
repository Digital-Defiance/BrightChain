import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';

/**
 * Parameters for calculating block capacity
 */
export interface IBlockCapacityParams {
  blockSize: BlockSize;
  blockType: BlockType;
  cbl?: {
    fileName: string;
    mimeType: string;
  };
  encryptionType: BlockEncryptionType;
  recipientCount?: number;
}

/**
 * Detailed breakdown of overhead components
 */
export interface IOverheadBreakdown {
  baseHeader: number;
  typeSpecificOverhead: number;
  encryptionOverhead: number;
  variableOverhead: number;
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
