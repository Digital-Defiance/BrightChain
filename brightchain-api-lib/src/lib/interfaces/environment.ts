/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockSize,
  BlockStoreType,
} from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IEnvironment as IEnvironmentBase,
  IUpnpConfig,
} from '@digitaldefiance/node-express-suite';
import { IEnvironmentAws } from './environment-aws';

// Import and re-export cloud config interfaces from the Suite
import type {
  IAzureEnvironmentConfig,
  IS3EnvironmentConfig,
} from '@brightchain/node-express-suite';
import { EmailServices } from '../enumerations/email-services';
export type { IAzureEnvironmentConfig, IS3EnvironmentConfig };

export interface IEnvironment<TID extends PlatformID>
  extends Omit<IEnvironmentBase<TID>, 'adminId' | 'idAdapter'> {
  adminId: any;
  idAdapter(bytes: Uint8Array): HexString;

  /**
   * UPnP Configuration
   * If set, UPnP will be used to automatically configure port forwarding
   * on compatible routers.
   */
  upnp?: IUpnpConfig;
  /**
   * The FontAwesome kit ID
   */
  fontAwesomeKitId: string;
  /**
   * AWS configuration
   */
  aws: IEnvironmentAws;

  /**
   * Whether to use transactions for BrightDB operations
   */
  useTransactions: boolean;

  /**
   * The name for the BrightChain member pool database
   */
  memberPoolName: string;

  /**
   * Path for block-backed document store (disk). If unset, memory store may be used.
   */
  blockStorePath?: string;

  /**
   * Block sizes for block-backed document store (plural, comma-separated env var).
   */
  blockStoreBlockSizes: readonly BlockSize[];

  /**
   * @deprecated Use `blockStoreBlockSizes` instead. Returns the first configured block size.
   */
  blockStoreBlockSize: BlockSize;

  /**
   * Prefer in-memory document store (useful for demo/tests).
   * @deprecated Derived from `DEV_DATABASE` presence — use `devDatabasePoolName` instead.
   */
  useMemoryDocumentStore: boolean;

  /**
   * Pool name for the in-memory dev database.
   * Set when `DEV_DATABASE` env var is a non-empty string; `undefined` otherwise.
   */
  devDatabasePoolName: string | undefined;

  /**
   * The active block store backend type.
   * Defaults to `BlockStoreType.Disk` when `BRIGHTCHAIN_BLOCKSTORE_TYPE` is unset.
   */
  blockStoreType: BlockStoreType;

  /**
   * Azure Blob Storage configuration.
   * Only populated when `blockStoreType` is `BlockStoreType.AzureBlob`.
   */
  azureConfig?: IAzureEnvironmentConfig;

  /**
   * Amazon S3 configuration.
   * Only populated when `blockStoreType` is `BlockStoreType.S3`.
   */
  s3Config?: IS3EnvironmentConfig;
  /**
   * The email service provider to use for sending emails
   */
  emailService: EmailServices;
}
