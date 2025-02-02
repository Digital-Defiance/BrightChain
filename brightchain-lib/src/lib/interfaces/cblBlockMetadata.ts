import { IEphemeralBlockMetadata } from './ephemeralBlockMetadata';

export interface ICBLBlockMetadata extends IEphemeralBlockMetadata {
  /**
   * The length of the file data across all blocks
   */
  fileDataLength: bigint;
}
