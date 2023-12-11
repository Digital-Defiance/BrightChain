/**
 * @fileoverview BrightDbEnvironment — generic BrightDB-specific environment configuration.
 *
 * Extends the upstream BaseEnvironment with BrightDB block store configuration:
 * block store path, block sizes, store type, cloud configs (Azure, S3),
 * dev database pool name, and memory document store flag.
 *
 * Domain-specific env vars (UPnP, FontAwesome, AWS credentials, etc.)
 * remain in api-lib's Environment subclass.
 *
 * @module environment
 */

import {
  BlockSize,
  BlockStoreType,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  Environment as BaseEnvironment,
  IConstants,
} from '@digitaldefiance/node-express-suite';
import {
  IAzureEnvironmentConfig,
  IS3EnvironmentConfig,
} from './interfaces/environment';
import { DefaultBackendIdType } from './shared-types';

export class BrightDbEnvironment<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseEnvironment<TID> {
  protected _blockStorePath?: string;
  protected _blockStoreBlockSizes: BlockSize[];
  protected _useMemoryDocumentStore: boolean;
  protected _devDatabasePoolName: string | undefined;
  protected _blockStoreType: BlockStoreType;
  protected _azureConfig?: IAzureEnvironmentConfig;
  protected _s3Config?: IS3EnvironmentConfig;
  protected _memberPoolName: string;
  protected _emailDomain: string;

  constructor(
    path?: string,
    initialization = false,
    override = true,
    constants?: IConstants,
  ) {
    super(path, initialization, override, constants);

    const envObj = this.getObject();

    // --- Block store path ---
    this._blockStorePath =
      envObj['BRIGHTCHAIN_BLOCKSTORE_PATH'] ?? envObj['BLOCKSTORE_PATH'];

    // --- Block sizes ---
    const rawBlockSizes = envObj['BRIGHTCHAIN_BLOCKSIZE_BYTES'];
    if (rawBlockSizes) {
      const parsed = rawBlockSizes
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .map((s: string) => Number.parseInt(s, 10) as BlockSize);
      // Validate each parsed value is a known BlockSize
      const validated = parsed.filter((bs: BlockSize) =>
        validBlockSizes.includes(bs),
      );
      this._blockStoreBlockSizes =
        validated.length > 0 ? validated : [BlockSize.Medium];
    } else {
      this._blockStoreBlockSizes = [BlockSize.Medium];
    }
    console.log(
      `[BrightChain] Block sizes: raw="${rawBlockSizes ?? '(unset)'}" parsed=[${this._blockStoreBlockSizes.join(', ')}]`,
    );

    // --- Memory document store ---
    this._useMemoryDocumentStore = Boolean(envObj['USE_MEMORY_DOCSTORE']);

    // --- Dev database pool name ---
    const devDatabase = envObj['DEV_DATABASE'];
    this._devDatabasePoolName =
      devDatabase && devDatabase.trim() !== '' ? devDatabase.trim() : undefined;
    if (this._devDatabasePoolName !== undefined) {
      this._useMemoryDocumentStore = true;
    }

    // --- Member pool name ---
    this._memberPoolName = envObj['MEMBER_POOL_NAME'] ?? 'BrightChain';

    // --- Email domain ---
    // Temporary: duplicated here until upstream node-express-suite publishes
    // with emailDomain on BaseEnvironment. Once published, this override
    // becomes redundant but harmless.
    const rawEmailDomain = envObj['EMAIL_DOMAIN'];
    if (rawEmailDomain && rawEmailDomain.trim().length > 0) {
      this._emailDomain = rawEmailDomain.trim();
    } else {
      const emailSender = envObj['EMAIL_SENDER'];
      const senderDomain = emailSender?.split('@')[1];
      this._emailDomain =
        senderDomain && senderDomain.trim().length > 0
          ? senderDomain.trim()
          : 'example.com';
    }

    // --- Block store type ---
    const rawStoreType = (
      envObj['BRIGHTCHAIN_BLOCKSTORE_TYPE'] ?? 'disk'
    ).toLowerCase();
    if (
      !Object.values(BlockStoreType).includes(rawStoreType as BlockStoreType)
    ) {
      throw new Error(
        `Invalid BRIGHTCHAIN_BLOCKSTORE_TYPE "${rawStoreType}". ` +
          `Valid values: ${Object.values(BlockStoreType).join(', ')}`,
      );
    }
    this._blockStoreType = rawStoreType as BlockStoreType;

    // --- Azure Blob Storage config ---
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
        supportedBlockSizes: this._blockStoreBlockSizes,
        connectionString: connectionString,
        accountName: accountName,
        accountKey: envObj['AZURE_STORAGE_ACCOUNT_KEY'],
        useManagedIdentity:
          !connectionString && !envObj['AZURE_STORAGE_ACCOUNT_KEY'],
      };
    }

    // --- S3 config ---
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
        supportedBlockSizes: this._blockStoreBlockSizes,
        keyPrefix: envObj['AWS_S3_KEY_PREFIX'],
        accessKeyId: envObj['AWS_ACCESS_KEY_ID'],
        secretAccessKey: envObj['AWS_SECRET_ACCESS_KEY'],
        useIamRole:
          !envObj['AWS_ACCESS_KEY_ID'] && !envObj['AWS_SECRET_ACCESS_KEY'],
      };
    }
  }

  // ── Accessors ──────────────────────────────────────────────────────

  public get blockStorePath(): string | undefined {
    return this._blockStorePath;
  }

  /**
   * Configured block sizes for block-backed document store (plural).
   * Parsed from the comma-separated `BRIGHTCHAIN_BLOCKSIZE_BYTES` env var.
   */
  public get blockStoreBlockSizes(): readonly BlockSize[] {
    return this._blockStoreBlockSizes;
  }

  /**
   * @deprecated Use `blockStoreBlockSizes` instead. Returns the first configured block size.
   */
  public get blockStoreBlockSize(): BlockSize {
    return this._blockStoreBlockSizes[0];
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

  /**
   * Member pool name (e.g. 'BrightChain')
   */
  public get memberPoolName(): string {
    return this._memberPoolName;
  }
  /**
   * The canonical email domain for this BrightChain instance.
   * Parsed from `EMAIL_DOMAIN` env var, falling back to the domain portion
   * of `EMAIL_SENDER`, or `'example.com'` if neither is set.
   */
  public override get emailDomain(): string {
    return this._emailDomain;
  }

  /**
   * Update the email domain at runtime (hot-reload support).
   * @param newDomain - The new canonical email domain
   * @see Requirement 8.5 — dynamic configuration reload
   */
  public override set emailDomain(newDomain: string) {
    this._emailDomain = newDomain;
  }
}
