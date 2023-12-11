import { BlockSize } from '../../enumerations/blockSize';

export interface ICloudBlockStoreConfig {
  /** Cloud region (e.g., "us-east-1", "eastus") */
  region: string;
  /** Container name (Azure) or bucket name (S3) */
  containerOrBucketName: string;
  /** Supported block sizes for this store */
  supportedBlockSizes: readonly BlockSize[];
  /** Optional key prefix for all objects in this store */
  keyPrefix?: string;
}
