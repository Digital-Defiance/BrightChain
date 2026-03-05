import { HexString, SecureString } from '@digitaldefiance/ecies-lib';
import {
  Environment as BaseEnvironment,
  IConstants,
} from '@digitaldefiance/node-express-suite';

import { BlockSize, BlockStoreType } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IUpnpConfig, UpnpConfig } from '@digitaldefiance/node-express-suite';
import { join } from 'path';
import { Constants } from './constants';
import { IEnvironment } from './interfaces/environment';
import {
  IAzureEnvironmentConfig,
  IS3EnvironmentConfig,
} from './interfaces/environment';
import { IEnvironmentAws } from './interfaces/environment-aws';
import { DefaultBackendIdType } from './shared-types';

export class Environment<TID extends PlatformID = DefaultBackendIdType>
  extends BaseEnvironment<TID>
  implements IEnvironment<TID>
{
  private _upnp: IUpnpConfig;
  private _fontAwesomeKitId: string;
  private _aws: IEnvironmentAws;
  private _blockStorePath?: string;
  private _blockStoreBlockSize: BlockSize;
  private _useMemoryDocumentStore: boolean;
  private _devDatabasePoolName: string | undefined;
  private _blockStoreType: BlockStoreType;
  private _azureConfig?: IAzureEnvironmentConfig;
  private _s3Config?: IS3EnvironmentConfig;

  private _adminId: TID | undefined;
  public override get adminId(): TID | undefined {
    return this._adminId;
  }
  public override set adminId(value: TID | undefined) {
    this._adminId = value;
  }

  private _useTransactions: boolean;

  /**
   * Use transactions for database operations (default: true)
   */
  public get useTransactions(): boolean {
    return this._useTransactions;
  }

  private _memberPoolName: string;
  /**
   * Member pool name (e.g. 'BrightChain')
   */
  public get memberPoolName(): string {
    return this._memberPoolName;
  }

  public get idAdapter(): (bytes: Uint8Array) => HexString {
    return (bytes: Uint8Array) => {
      // Convert bytes to hex-based ID string; datastore layer owns actual ID type
      const hex = Buffer.from(bytes).toString('hex');
      return hex.slice(0, 24) as HexString;
    };
  }

  constructor(
    path?: string,
    initialization = false,
    override = true,
    constants: IConstants = Constants as unknown as IConstants,
  ) {
    super(path, initialization, override, constants);

    // Initialise _adminId from the value the parent constructor parsed/generated.
    // The override exists so that adminId is mutable (BaseEnvironment is read-only).
    this._adminId = super.adminId;

    const envObj = this.getObject();

    this._upnp = UpnpConfig.fromEnvironment(envObj);
    // BrightChain-specific environment variables
    this._fontAwesomeKitId = envObj['FONTAWESOME_KIT_ID'] ?? '';

    this._useTransactions = envObj['USE_TRANSACTIONS'] === 'true';
    this._memberPoolName = envObj['MEMBER_POOL_NAME'] ?? 'BrightChain';

    this._blockStorePath =
      envObj['BRIGHTCHAIN_BLOCKSTORE_PATH'] ?? envObj['BLOCKSTORE_PATH'];

    const parsedSize = envObj['BRIGHTCHAIN_BLOCKSIZE_BYTES']
      ? Number.parseInt(envObj['BRIGHTCHAIN_BLOCKSIZE_BYTES'], 10)
      : undefined;
    this._blockStoreBlockSize = (parsedSize ?? BlockSize.Medium) as BlockSize;

    this._useMemoryDocumentStore = Boolean(envObj['USE_MEMORY_DOCSTORE']);

    // DEV_DATABASE: non-empty trimmed string → pool name; derives useMemoryDocumentStore
    const devDatabase = envObj['DEV_DATABASE'];
    this._devDatabasePoolName =
      devDatabase && devDatabase.trim() !== '' ? devDatabase.trim() : undefined;
    if (this._devDatabasePoolName !== undefined) {
      this._useMemoryDocumentStore = true;
    }

    this._aws = {
      accessKeyId: new SecureString(envObj['AWS_ACCESS_KEY_ID'] ?? null),
      secretAccessKey: new SecureString(
        envObj['AWS_SECRET_ACCESS_KEY'] ?? null,
      ),
      region: envObj['AWS_REGION'] ?? 'us-east-1',
    };

    // --- Cloud block store configuration ---
    const rawStoreType = (
      envObj['BRIGHTCHAIN_BLOCKSTORE_TYPE'] ?? 'disk'
    ).toLowerCase();
    if (!Object.values(BlockStoreType).includes(rawStoreType as BlockStoreType)) {
      throw new Error(
        `Invalid BRIGHTCHAIN_BLOCKSTORE_TYPE "${rawStoreType}". ` +
          `Valid values: ${Object.values(BlockStoreType).join(', ')}`,
      );
    }
    this._blockStoreType = rawStoreType as BlockStoreType;

    if (this._blockStoreType === BlockStoreType.AzureBlob) {
      const connectionString = envObj['AZURE_STORAGE_CONNECTION_STRING'];
      const accountName = envObj['AZURE_STORAGE_ACCOUNT_NAME'];
      const containerName = envObj['AZURE_STORAGE_CONTAINER_NAME'];

      const missing: string[] = [];
      if (!connectionString && !accountName) {
        missing.push(
          'AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME',
        );
      }
      if (!containerName) {
        missing.push('AZURE_STORAGE_CONTAINER_NAME');
      }
      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables for Azure block store: ${missing.join(', ')}`,
        );
      }

      this._azureConfig = {
        region: envObj['AWS_REGION'] ?? 'eastus',
        containerOrBucketName: containerName!,
        blockSize: this._blockStoreBlockSize,
        connectionString: connectionString,
        accountName: accountName,
        accountKey: envObj['AZURE_STORAGE_ACCOUNT_KEY'],
        useManagedIdentity:
          !connectionString && !envObj['AZURE_STORAGE_ACCOUNT_KEY'],
      };
    }

    if (this._blockStoreType === BlockStoreType.S3) {
      const bucketName = envObj['AWS_S3_BUCKET_NAME'];

      if (!bucketName) {
        throw new Error(
          'Missing required environment variable for S3 block store: AWS_S3_BUCKET_NAME',
        );
      }

      this._s3Config = {
        region: envObj['AWS_REGION'] ?? 'us-east-1',
        containerOrBucketName: bucketName,
        blockSize: this._blockStoreBlockSize,
        keyPrefix: envObj['AWS_S3_KEY_PREFIX'],
        accessKeyId: envObj['AWS_ACCESS_KEY_ID'],
        secretAccessKey: envObj['AWS_SECRET_ACCESS_KEY'],
        useIamRole:
          !envObj['AWS_ACCESS_KEY_ID'] && !envObj['AWS_SECRET_ACCESS_KEY'],
      };
    }

    // Override defaults if needed
    if (!envObj['JWT_SECRET']) {
      this.setEnvironment('jwtSecret', 'd!6!7al-6urnb46-s3cr3t!');
    }
    if (!envObj['EMAIL_SENDER']) {
      this.setEnvironment('emailSender', 'noreply@brightchain.org');
    }
    if (this.production) {
      this.setEnvironment('serverUrl', 'https://brightchain.org');
    }

    if (!envObj['API_DIST_DIR']) {
      this.setEnvironment(
        'apiDistDir',
        join(process.cwd(), 'dist', 'brightchain-api'),
      );
    }
    if (!envObj['REACT_DIST_DIR']) {
      this.setEnvironment(
        'reactDistDir',
        join(process.cwd(), 'dist', 'brightchain-react'),
      );
    }
  }

  public get upnp(): IUpnpConfig {
    return this._upnp;
  }

  public get fontAwesomeKitId(): string {
    return this._fontAwesomeKitId;
  }

  public get aws(): IEnvironmentAws {
    return this._aws;
  }

  public get blockStorePath(): string | undefined {
    return this._blockStorePath;
  }

  public get blockStoreBlockSize(): BlockSize {
    return this._blockStoreBlockSize;
  }

  public get useMemoryDocumentStore(): boolean {
    return this._useMemoryDocumentStore || !this._blockStorePath;
  }

  /**
   * Pool name for the in-memory dev database.
   * Set when `DEV_DATABASE` env var is a non-empty string; `undefined` otherwise.
   */
  public get devDatabasePoolName(): string | undefined {
    return this._devDatabasePoolName;
  }

  /**
   * The active block store backend type.
   * Defaults to `BlockStoreType.Disk` when `BRIGHTCHAIN_BLOCKSTORE_TYPE` is unset.
   */
  public get blockStoreType(): BlockStoreType {
    return this._blockStoreType;
  }

  /**
   * Azure Blob Storage configuration.
   * Only populated when `blockStoreType` is `BlockStoreType.AzureBlob`.
   */
  public get azureConfig(): IAzureEnvironmentConfig | undefined {
    return this._azureConfig;
  }

  /**
   * Amazon S3 configuration.
   * Only populated when `blockStoreType` is `BlockStoreType.S3`.
   */
  public get s3Config(): IS3EnvironmentConfig | undefined {
    return this._s3Config;
  }
}
