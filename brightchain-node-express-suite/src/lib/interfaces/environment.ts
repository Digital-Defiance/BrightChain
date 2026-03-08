/**
 * @fileoverview BrightDB-specific cloud block store configuration interfaces.
 *
 * Extracted from brightchain-api-lib so that BrightDbEnvironment can reference
 * them without depending on api-lib.
 *
 * @module interfaces/environment
 */

import { ICloudBlockStoreConfig } from '@brightchain/brightchain-lib';

/**
 * Azure-specific cloud block store configuration fields.
 * Extends ICloudBlockStoreConfig with Azure Blob Storage auth options.
 * Defined here (not in brightchain-azure-store) so consumers
 * stay free of static cloud SDK dependencies.
 */
export interface IAzureEnvironmentConfig extends ICloudBlockStoreConfig {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  useManagedIdentity?: boolean;
}

/**
 * S3-specific cloud block store configuration fields.
 * Extends ICloudBlockStoreConfig with S3 auth options.
 * Defined here (not in brightchain-s3-store) so consumers
 * stay free of static cloud SDK dependencies.
 */
export interface IS3EnvironmentConfig extends ICloudBlockStoreConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  useIamRole?: boolean;
  endpoint?: string;
}
