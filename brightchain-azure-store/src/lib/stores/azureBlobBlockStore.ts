/**
 * AzureBlobBlockStore - Azure Blob Storage implementation of CloudBlockStoreBase.
 *
 * Implements the 6 abstract I/O primitives using the @azure/storage-blob SDK.
 * Authentication priority: connection string → account name + key → managed identity.
 *
 * @see CloudBlockStoreBase for shared cloud store logic
 */
import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  ContainerClient,
  RestError,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { CloudBlockStoreBase } from '@brightchain/brightchain-api-lib';
import {
  ICloudBlockStoreConfig,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';

/**
 * Azure-specific configuration extending the shared cloud config.
 */
export interface IAzureBlobBlockStoreConfig extends ICloudBlockStoreConfig {
  /** Full Azure Storage connection string */
  connectionString?: string;
  /** Azure Storage account name (used with accountKey or managed identity) */
  accountName?: string;
  /** Azure Storage account key (used with accountName) */
  accountKey?: string;
  /** Whether to use Azure Managed Identity (DefaultAzureCredential) */
  useManagedIdentity?: boolean;
}

/** HTTP status codes considered transient for Azure operations */
const TRANSIENT_HTTP_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/** Network-level error codes considered transient */
const TRANSIENT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
]);

/** HTTP status codes indicating authentication failures */
const AUTH_HTTP_STATUS_CODES = new Set([401, 403]);

export class AzureBlobBlockStore extends CloudBlockStoreBase {
  private readonly containerClient: ContainerClient;

  constructor(
    config: IAzureBlobBlockStoreConfig,
    indexTtlMs?: number,
    listPageSize?: number,
  ) {
    super(config, indexTtlMs, listPageSize);

    let blobServiceClient: BlobServiceClient;

    if (config.connectionString) {
      // Priority 1: Connection string
      blobServiceClient = BlobServiceClient.fromConnectionString(
        config.connectionString,
      );
    } else if (config.accountName && config.accountKey) {
      // Priority 2: Account name + key
      const credential = new StorageSharedKeyCredential(
        config.accountName,
        config.accountKey,
      );
      blobServiceClient = new BlobServiceClient(
        `https://${config.accountName}.blob.core.windows.net`,
        credential,
      );
    } else if (config.useManagedIdentity && config.accountName) {
      // Priority 3: Managed identity (DefaultAzureCredential)
      blobServiceClient = new BlobServiceClient(
        `https://${config.accountName}.blob.core.windows.net`,
        new DefaultAzureCredential(),
      );
    } else {
      throw new StoreError(
        StoreErrorType.CloudAuthenticationFailed,
        undefined,
        {
          message:
            'No valid Azure authentication method provided. ' +
            'Supply connectionString, accountName + accountKey, ' +
            'or accountName + useManagedIdentity.',
        },
      );
    }

    this.containerClient = blobServiceClient.getContainerClient(
      config.containerOrBucketName,
    );
  }

  // =========================================================================
  // Abstract primitive implementations
  // =========================================================================

  protected async uploadObject(key: string, data: Uint8Array): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.upload(data, data.length);
  }

  protected async downloadObject(key: string): Promise<Uint8Array> {
    const blobClient = this.containerClient.getBlobClient(key);
    const response = await blobClient.download(0);

    if (!response.readableStreamBody) {
      throw new StoreError(StoreErrorType.CloudOperationFailed, undefined, {
        operation: 'downloadObject',
        blockChecksum: key,
        originalError: 'No readable stream body in Azure download response',
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  protected async deleteObject(key: string): Promise<void> {
    const blobClient = this.containerClient.getBlobClient(key);
    await blobClient.delete();
  }

  protected async objectExists(key: string): Promise<boolean> {
    const blobClient = this.containerClient.getBlobClient(key);
    try {
      await blobClient.getProperties();
      return true;
    } catch (error: unknown) {
      if (error instanceof RestError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  protected async listObjects(
    prefix: string,
    maxResults?: number,
  ): Promise<string[]> {
    const names: string[] = [];
    const iter = this.containerClient.listBlobsFlat({ prefix });

    for await (const blob of iter) {
      names.push(blob.name);
      if (maxResults !== undefined && names.length >= maxResults) {
        break;
      }
    }

    return names;
  }

  protected isTransientError(error: unknown): boolean {
    if (error instanceof RestError) {
      // Authentication errors are never transient
      if (error.statusCode && AUTH_HTTP_STATUS_CODES.has(error.statusCode)) {
        return false;
      }

      // Check HTTP status codes for transient errors
      if (
        error.statusCode &&
        TRANSIENT_HTTP_STATUS_CODES.has(error.statusCode)
      ) {
        return true;
      }

      // Check error code for network-level transient errors
      if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
        return true;
      }
    }

    // Check for generic error objects with transient network codes
    if (error instanceof Error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && TRANSIENT_ERROR_CODES.has(code)) {
        return true;
      }
    }

    return false;
  }
}
