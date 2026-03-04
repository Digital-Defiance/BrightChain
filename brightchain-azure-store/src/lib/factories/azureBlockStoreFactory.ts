/**
 * Azure factory registration side-effect module.
 *
 * Importing this module registers the AzureBlobBlockStore factory with
 * BlockStoreFactory so that `BlockStoreFactory.createAzureStore(config)`
 * returns an AzureBlobBlockStore instance.
 *
 * This module is imported by the library barrel file (src/index.ts) so
 * registration happens automatically when the library is imported.
 */
import {
  BlockStoreFactory,
  ICloudBlockStoreConfig,
} from '@brightchain/brightchain-lib';
import {
  AzureBlobBlockStore,
  IAzureBlobBlockStoreConfig,
} from '../stores/azureBlobBlockStore';

BlockStoreFactory.registerAzureStoreFactory(
  (config: ICloudBlockStoreConfig) =>
    new AzureBlobBlockStore(config as IAzureBlobBlockStoreConfig),
);
