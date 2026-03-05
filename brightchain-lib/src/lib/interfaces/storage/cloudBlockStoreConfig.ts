import { BlockSize } from '../../enumerations/blockSize';

export interface ICloudBlockStoreConfig {
  /** Cloud region (e.g., "us-east-1", "eastus") */
  region: string;
  /** Container name (Azure) or bucket name (S3) */
  containerOrBucketName: string;
  /** Block size for this store */
  blockSize: BlockSize;
  /** Optional key prefix for all objects in this store */
  keyPrefix?: string;
}
