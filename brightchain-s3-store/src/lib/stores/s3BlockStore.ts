/**
 * S3BlockStore - Amazon S3 implementation of CloudBlockStoreBase.
 *
 * Implements the 6 abstract I/O primitives using the @aws-sdk/client-s3 SDK.
 * Authentication priority: explicit credentials → IAM role / environment credential chain.
 *
 * @see CloudBlockStoreBase for shared cloud store logic
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { CloudBlockStoreBase } from '@brightchain/brightchain-api-lib';
import {
  ICloudBlockStoreConfig,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';

/**
 * S3-specific configuration extending the shared cloud config.
 */
export interface IS3BlockStoreConfig extends ICloudBlockStoreConfig {
  /** AWS access key ID (used with secretAccessKey) */
  accessKeyId?: string;
  /** AWS secret access key (used with accessKeyId) */
  secretAccessKey?: string;
  /** Whether to use IAM role / environment credential chain */
  useIamRole?: boolean;
  /** Custom endpoint URL for S3-compatible services (MinIO, LocalStack) */
  endpoint?: string;
}

/** HTTP status codes considered transient for S3 operations */
const TRANSIENT_HTTP_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Error names considered transient */
const TRANSIENT_ERROR_NAMES = new Set(['TimeoutError', 'NetworkingError']);

/** Network-level error codes considered transient */
const TRANSIENT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
]);

/** HTTP status codes indicating authentication failures */
const AUTH_HTTP_STATUS_CODES = new Set([401, 403]);

export class S3BlockStore extends CloudBlockStoreBase {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    config: IS3BlockStoreConfig,
    indexTtlMs?: number,
    listPageSize?: number,
  ) {
    super(config, indexTtlMs, listPageSize);
    this.bucketName = config.containerOrBucketName;

    const clientConfig: Record<string, unknown> = {
      region: config.region || 'us-east-1',
    };

    if (config.endpoint) {
      clientConfig['endpoint'] = config.endpoint;
      clientConfig['forcePathStyle'] = true;
    }

    if (config.accessKeyId && config.secretAccessKey) {
      // Priority 1: Explicit credentials
      clientConfig['credentials'] = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    } else if (config.accessKeyId && !config.secretAccessKey) {
      // Partial credentials — missing secret key
      throw new StoreError(
        StoreErrorType.CloudAuthenticationFailed,
        undefined,
        {
          message:
            'Incomplete S3 credentials: accessKeyId provided without secretAccessKey.',
        },
      );
    } else if (!config.useIamRole) {
      // No explicit credentials and not using IAM role — error
      throw new StoreError(
        StoreErrorType.CloudAuthenticationFailed,
        undefined,
        {
          message:
            'No valid S3 authentication method provided. ' +
            'Supply accessKeyId + secretAccessKey, ' +
            'or set useIamRole to true for IAM role / environment credential chain.',
        },
      );
    }
    // Priority 2: IAM role / environment credential chain (SDK default behavior)

    this.s3Client = new S3Client(clientConfig);
  }

  // =========================================================================
  // Abstract primitive implementations
  // =========================================================================

  protected async uploadObject(key: string, data: Uint8Array): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: data,
      }),
    );
  }

  protected async downloadObject(key: string): Promise<Uint8Array> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new StoreError(StoreErrorType.CloudOperationFailed, undefined, {
        operation: 'downloadObject',
        blockChecksum: key,
        originalError: 'No body in S3 GetObject response',
      });
    }

    const byteArray = await response.Body.transformToByteArray();
    return new Uint8Array(byteArray);
  }

  protected async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  protected async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error: unknown) {
      if (
        error instanceof S3ServiceException &&
        (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound')
      ) {
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
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          MaxKeys: maxResults !== undefined ? maxResults - names.length : 1000,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            names.push(obj.Key);
            if (maxResults !== undefined && names.length >= maxResults) {
              return names;
            }
          }
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return names;
  }

  protected isTransientError(error: unknown): boolean {
    // Check AWS SDK $retryable hint
    if (
      error &&
      typeof error === 'object' &&
      '$retryable' in error &&
      (error as Record<string, unknown>)['$retryable']
    ) {
      return true;
    }

    if (error instanceof S3ServiceException) {
      // Authentication errors are never transient
      const httpStatus = error.$metadata?.httpStatusCode;
      if (httpStatus && AUTH_HTTP_STATUS_CODES.has(httpStatus)) {
        return false;
      }

      // Check HTTP status codes for transient errors
      if (httpStatus && TRANSIENT_HTTP_STATUS_CODES.has(httpStatus)) {
        return true;
      }
    }

    // Check error name for transient network errors
    if (error instanceof Error) {
      if (TRANSIENT_ERROR_NAMES.has(error.name)) {
        return true;
      }

      // Check for generic error objects with transient network codes
      const code = (error as NodeJS.ErrnoException).code;
      if (code && TRANSIENT_ERROR_CODES.has(code)) {
        return true;
      }
    }

    return false;
  }
}
