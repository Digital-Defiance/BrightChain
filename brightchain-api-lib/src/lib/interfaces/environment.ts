/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockSize,
  BlockStoreType,
  BrightChainFeatures,
  NodeIdSource,
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
  /**
   * Enabled brightchain features
   */
  enabledFeatures: BrightChainFeatures[];

  /**
   * Unique identifier for this node in the BrightChain network.
   * Resolution order: NODE_ID env var → SYSTEM_ID → ephemeral GuidV4.
   */
  nodeId: string;

  /**
   * Indicates where the node ID was sourced from.
   */
  nodeIdSource: NodeIdSource;

  /**
   * Root directory for custom EJS templates.
   * Set via EJS_SPLASH_ROOT env var.
   */
  ejsSplashRoot: string | undefined;

  /**
   * @deprecated Use ejsSplashRoot instead.
   * Direct path to a single custom template file.
   * Set via SPLASH_TEMPLATE_PATH env var.
   */
  splashTemplatePath: string | undefined;

  /**
   * Google Analytics gtag measurement ID (e.g. "G-XXXXXXXXXX").
   * Set via GTAG_ID env var. When present, injected into APP_CONFIG
   * so the React frontend can initialise gtag.
   */
  gtagId: string | undefined;

  /**
   * Whether BrightChain Assets feature is enabled (default: true).
   * When false, all Assets-related functionality will be disabled,
   * including the BrightChain Asset API endpoints and any UI elements
   * related to Assets.
   */
  assetsEnabled: boolean;

  /**
   * Whether the Joule microtransaction system is enabled (default: false).
   * When true, Joule-related functionality will be enabled, including
   * cost estimation and charging for uploads to the Digital Burnbag.
   */
  jouleEnabled: boolean;

  /**
   * Whether Joule functionality is enabled specifically for the Digital Burnbag.
   * This allows for finer-grained control over Joule features.
   */
  burnbagJouleEnabled: boolean;

  /**
   * Maximum character length for the BrightHub user profile bio field.
   * Controlled by BRIGHTHUB_PROFILE_LENGTH env var (default: 2000).
   */
  profileLength: number;

  /**
   * Whether the pinned post feature is enabled for BrightHub profiles.
   * Controlled by BRIGHTHUB_PROFILE_PINNED_POST env var (default: true).
   */
  profilePinnedPostEnabled: boolean;

  /**
   * The maximum number of font awesome icons to display in the brighthub icon picker
   */
  brightHubFontAwesomeMaxDisplay: number;

  /**
   * The number of icons in the font awesome grid for brighthub fontawesome icon picker
   */
  brightHubFontAwesomeIconGridSize: number;

  /**
   * The maximum number of font awesome icons to display in the brightchat icon picker
   */
  brightChatFontAwesomeMaxDisplay: number;

  /**
   * The number of icons in the font awesome grid for brightchat fontawesome icon picker
   */
  brightChatFontAwesomeIconGridSize: number;
}
