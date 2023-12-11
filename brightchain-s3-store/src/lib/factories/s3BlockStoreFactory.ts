/**
 * S3 factory registration side-effect module.
 *
 * Importing this module registers the S3BlockStore factory with
 * BlockStoreFactory so that `BlockStoreFactory.createS3Store(config)`
 * returns an S3BlockStore instance.
 *
 * This module is imported by the library barrel file (src/index.ts) so
 * registration happens automatically when the library is imported.
 */
import {
  BlockStoreFactory,
  ICloudBlockStoreConfig,
} from '@brightchain/brightchain-lib';
import { IS3BlockStoreConfig, S3BlockStore } from '../stores/s3BlockStore';

BlockStoreFactory.registerS3StoreFactory(
  (config: ICloudBlockStoreConfig) =>
    new S3BlockStore(config as IS3BlockStoreConfig),
);
