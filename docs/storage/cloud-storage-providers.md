---
title: "Cloud Storage Providers"
parent: "Storage System"
nav_order: 5
---
# Cloud Storage Providers

BrightChain supports two cloud-backed block store implementations alongside the default disk and memory stores. Each lives in its own NPM library to keep cloud SDK dependencies isolated — consumers who don't need cloud storage never pull in Azure or AWS SDKs.

| Provider | Nx Library | npm Package Scope | SDK Dependencies |
|----------|-----------|-------------------|-----------------|
| Amazon S3 | `brightchain-s3-store` | `@brightchain/s3-store` | `@aws-sdk/client-s3` |
| Azure Blob Storage | `brightchain-azure-store` | `@brightchain/azure-store` | `@azure/storage-blob`, `@azure/identity` |

For a step-by-step setup guide, see the [Cloud Storage Providers Walkthrough](/docs/walkthroughs/07-cloud-storage-providers).

## Architecture Overview

Both cloud providers follow the same layered architecture:

```
brightchain-lib (shared, browser-safe)
  ├── IBlockStore interface
  ├── IPooledBlockStore interface
  ├── ICloudBlockStoreConfig interface
  ├── BlockStoreType enum
  └── BlockStoreFactory (factory registration + creation)

brightchain-api-lib (Node.js, zero cloud SDK deps)
  └── CloudBlockStoreBase (abstract)
        ├── Metadata serialization (.meta sidecar objects)
        ├── FEC parity generation and recovery
        ├── CBL whitening (XOR with randomizer blocks)
        ├── Pool key management ({poolId}/{checksum})
        ├── Retry with exponential backoff
        └── Local checksum index for getRandomBlocks

@brightchain/s3-store (AWS SDK)
  └── S3BlockStore extends CloudBlockStoreBase
        └── 6 I/O primitives using @aws-sdk/client-s3

@brightchain/azure-store (Azure SDK)
  └── AzureBlobBlockStore extends CloudBlockStoreBase
        └── 6 I/O primitives using @azure/storage-blob
```

The abstract base class `CloudBlockStoreBase` encapsulates all shared logic. Each cloud subclass implements only six I/O primitives:

| Primitive | Signature | Description |
|-----------|-----------|-------------|
| `uploadObject` | `(key: string, data: Uint8Array) => Promise<void>` | Write a blob/object |
| `downloadObject` | `(key: string) => Promise<Uint8Array>` | Read a blob/object |
| `deleteObject` | `(key: string) => Promise<void>` | Remove a blob/object |
| `objectExists` | `(key: string) => Promise<boolean>` | HEAD check for existence |
| `listObjects` | `(prefix: string, maxResults?: number) => Promise<string[]>` | List objects by prefix |
| `isTransientError` | `(error: unknown) => boolean` | Classify error for retry |

## Factory Registration

Cloud stores use a plugin-style registration pattern. Each provider library contains a factory registration module that executes as a side-effect when the library is imported.

### Registration Flow

```
1. Application imports '@brightchain/s3-store'
2. Barrel file (src/index.ts) imports './lib/factories/s3BlockStoreFactory'
3. Factory module calls BlockStoreFactory.registerS3StoreFactory(fn)
4. BlockStoreFactory.createS3Store(config) now returns an S3BlockStore
```

### Factory API

```typescript
// Registration (called by provider libraries at import time)
BlockStoreFactory.registerS3StoreFactory(factory: S3StoreFactoryFn): void;
BlockStoreFactory.registerAzureStoreFactory(factory: AzureStoreFactoryFn): void;

// Creation (called by application code)
BlockStoreFactory.createS3Store(config: ICloudBlockStoreConfig): IBlockStore;
BlockStoreFactory.createAzureStore(config: ICloudBlockStoreConfig): IBlockStore;

// Cleanup (primarily for testing)
BlockStoreFactory.clearS3StoreFactory(): void;
BlockStoreFactory.clearAzureStoreFactory(): void;
```

### Error on Missing Registration

If `createS3Store()` or `createAzureStore()` is called without prior registration, a `StoreError` is thrown:

```typescript
StoreError {
  type: StoreErrorType.FactoryNotRegistered,
  params: {
    storeType: 'S3',  // or 'AzureBlob'
    hint: "Import '@brightchain/s3-store' in your application entry point to register the S3 factory."
  }
}
```

## Configuration Interfaces

### Shared Base: `ICloudBlockStoreConfig`

Defined in `brightchain-lib/src/lib/interfaces/storage/cloudBlockStoreConfig.ts`. Used by both providers.

```typescript
interface ICloudBlockStoreConfig {
  /** Cloud region (e.g., "us-east-1", "eastus") */
  region: string;

  /** Container name (Azure) or bucket name (S3) */
  containerOrBucketName: string;

  /** Supported block sizes for this store */
  supportedBlockSizes: readonly BlockSize[];

  /** Optional key prefix for all objects (e.g., "bc/") */
  keyPrefix?: string;
}
```

### S3: `IS3BlockStoreConfig`

Defined in `brightchain-s3-store/src/lib/stores/s3BlockStore.ts`. Extends `ICloudBlockStoreConfig`.

```typescript
interface IS3BlockStoreConfig extends ICloudBlockStoreConfig {
  /** AWS access key ID (used with secretAccessKey) */
  accessKeyId?: string;

  /** AWS secret access key (used with accessKeyId) */
  secretAccessKey?: string;

  /** Whether to use IAM role / environment credential chain */
  useIamRole?: boolean;

  /** Custom endpoint URL for S3-compatible services (MinIO, LocalStack) */
  endpoint?: string;
}
```

### Azure: `IAzureBlobBlockStoreConfig`

Defined in `brightchain-azure-store/src/lib/stores/azureBlobBlockStore.ts`. Extends `ICloudBlockStoreConfig`.

```typescript
interface IAzureBlobBlockStoreConfig extends ICloudBlockStoreConfig {
  /** Full Azure Storage connection string */
  connectionString?: string;

  /** Azure Storage account name (used with accountKey or managed identity) */
  accountName?: string;

  /** Azure Storage account key (used with accountName) */
  accountKey?: string;

  /** Whether to use Azure Managed Identity (DefaultAzureCredential) */
  useManagedIdentity?: boolean;
}
```

## Authentication Methods

### Amazon S3

Authentication is evaluated in priority order at construction time:

| Priority | Method | Required Fields | SDK Behavior |
|----------|--------|----------------|--------------|
| 1 | Explicit credentials | `accessKeyId` + `secretAccessKey` | Creates static credential provider |
| 2 | IAM / credential chain | `useIamRole: true` | Uses SDK default credential provider chain |

**Validation rules:**
- `accessKeyId` without `secretAccessKey` → throws `CloudAuthenticationFailed` immediately
- Neither explicit credentials nor `useIamRole: true` → throws `CloudAuthenticationFailed`
- When `endpoint` is set, `forcePathStyle` is automatically enabled

**Custom endpoints** enable compatibility with S3-compatible services:

| Service | Endpoint Example |
|---------|-----------------|
| MinIO | `http://localhost:9000` |
| LocalStack | `http://localhost:4566` |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com` |

### Azure Blob Storage

Authentication is evaluated in priority order at construction time:

| Priority | Method | Required Fields | SDK Behavior |
|----------|--------|----------------|--------------|
| 1 | Connection string | `connectionString` | `BlobServiceClient.fromConnectionString()` |
| 2 | Account name + key | `accountName` + `accountKey` | `StorageSharedKeyCredential` → `BlobServiceClient` |
| 3 | Managed identity | `accountName` + `useManagedIdentity: true` | `DefaultAzureCredential` → `BlobServiceClient` |

**Validation rules:**
- None of the three methods configured → throws `CloudAuthenticationFailed`
- `useManagedIdentity` without `accountName` → throws `CloudAuthenticationFailed` (account name is needed for the endpoint URL)

## Object Key Layout

Cloud stores organize objects using a prefix-based hierarchy that mirrors the pool isolation model used by disk stores.

### Key Patterns

| Object Type | Key Pattern | Example |
|-------------|-------------|---------|
| Block data | `{keyPrefix}{poolId}/{checksumHex}` | `bc/default/a1b2c3...` |
| Metadata sidecar | `{keyPrefix}{poolId}/{checksumHex}.meta` | `bc/default/a1b2c3....meta` |
| Parity shard | `{keyPrefix}{poolId}/parity/{checksumHex}/{index}` | `bc/default/parity/a1b2c3.../0` |

- `keyPrefix` — optional, from `ICloudBlockStoreConfig.keyPrefix`
- `poolId` — storage pool identifier, defaults to `"default"` for unpooled blocks
- `checksumHex` — SHA-512 hex string identifying the block
- `index` — zero-based FEC parity shard number

### Metadata Sidecar Format

Metadata is stored as a JSON sidecar object (`.meta` suffix) rather than cloud-native metadata headers. This avoids the size limits of Azure blob metadata (8 KB) and S3 object metadata (2 KB).

```typescript
interface CloudBlockMetadataFile {
  blockId: string;
  createdAt: string;              // ISO 8601
  expiresAt: string | null;
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: string;         // ISO 8601
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
  poolId?: string;
}
```

## Retry and Error Handling

### Retry Configuration

| Parameter | Value |
|-----------|-------|
| Max retries | 3 |
| Backoff base | 1 second |
| Backoff factor | 2× exponential |
| Backoff sequence | 1s → 2s → 4s |
| Total max wait | 7 seconds |

### Retry Logic

```typescript
// Pseudocode for CloudBlockStoreBase.withRetry()
for attempt in [0..maxRetries]:
  try:
    return await operation()
  catch error:
    if !isTransientError(error) or attempt == maxRetries:
      throw StoreError(CloudOperationFailed, { operation, blockChecksum, originalError })
    await sleep(2^attempt * 1000)  // 1s, 2s, 4s
```

### Error Types

| StoreErrorType | When Thrown | Retried? |
|---------------|------------|----------|
| `FactoryNotRegistered` | `createS3Store()` / `createAzureStore()` called without import | N/A |
| `CloudAuthenticationFailed` | Invalid or missing credentials at construction time, or HTTP 401/403 at runtime | No |
| `CloudOperationFailed` | Cloud SDK operation failed (after retries for transient errors) | Transient: Yes (3×). Non-transient: No |

### Transient Error Detection

#### S3 (`S3BlockStore.isTransientError`)

| Check | Condition |
|-------|-----------|
| AWS SDK hint | `error.$retryable` is truthy |
| HTTP status | 429, 500, 502, 503, 504 (via `S3ServiceException.$metadata.httpStatusCode`) |
| Error name | `TimeoutError`, `NetworkingError` |
| Error code | `ETIMEDOUT`, `ECONNRESET`, `ECONNREFUSED`, `EPIPE` |
| Auth (never transient) | HTTP 401, 403 |

#### Azure (`AzureBlobBlockStore.isTransientError`)

| Check | Condition |
|-------|-----------|
| HTTP status | 408, 429, 500, 502, 503, 504 (via `RestError.statusCode`) |
| Error code | `ETIMEDOUT`, `ECONNRESET`, `ECONNREFUSED`, `EPIPE` (via `RestError.code` or `Error.code`) |
| Auth (never transient) | HTTP 401, 403 |

### Error Structure

All cloud errors are wrapped in `StoreError` with structured diagnostic params:

```typescript
StoreError {
  type: StoreErrorType.CloudOperationFailed,
  params: {
    operation: 'downloadObject',      // which primitive failed
    blockChecksum: 'a1b2c3...',       // which block was involved
    originalError: 'NoSuchKey: ...'   // original cloud SDK error message
  }
}
```

## Environment Variables Reference

### Common

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIGHTCHAIN_BLOCKSTORE_TYPE` | No | `"disk"` | Storage backend type: `"disk"`, `"memory"`, `"s3"`, or `"azure"` |

### Amazon S3

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_S3_BUCKET_NAME` | Yes (when type=s3) | — | S3 bucket name |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | Conditional | — | Required unless using IAM role |
| `AWS_SECRET_ACCESS_KEY` | Conditional | — | Required with `AWS_ACCESS_KEY_ID` |
| `AWS_S3_KEY_PREFIX` | No | — | Optional prefix for all object keys |

### Azure Blob Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_STORAGE_CONTAINER_NAME` | Yes (when type=azure) | — | Blob container name |
| `AZURE_STORAGE_CONNECTION_STRING` | Conditional | — | Full connection string (auth priority 1) |
| `AZURE_STORAGE_ACCOUNT_NAME` | Conditional | — | Account name (auth priority 2 or 3) |
| `AZURE_STORAGE_ACCOUNT_KEY` | Conditional | — | Account key (used with account name, auth priority 2) |

## IAM Permissions Reference

### Minimum S3 Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::BUCKET_NAME",
        "arn:aws:s3:::BUCKET_NAME/*"
      ]
    }
  ]
}
```

### Minimum Azure Role

Assign the built-in `Storage Blob Data Contributor` role at the storage account or container scope. This grants:
- Read, write, and delete blob data
- List blobs in containers

## Local Checksum Index

The `CloudBlockStoreBase` maintains an in-memory `Set<string>` of known block checksums, used by `getRandomBlocks` to select random blocks without listing the entire container/bucket on every call.

| Behavior | Details |
|----------|---------|
| Population | Lazy — built on first `getRandomBlocks` call |
| Incremental updates | `setData` adds to index, `deleteData` removes from index |
| Staleness TTL | 5 minutes (configurable via constructor `indexTtlMs` parameter) |
| Refresh mechanism | Full re-listing of objects with pool prefix, paginated at 1000/page |
| Memory overhead | ~128 bytes per block (SHA-512 hex string in a Set) |

## Library Dependency Graph

```
brightchain-lib ──────────────────┬──────────────────────────────┐
       │                          │                              │
       ▼                          ▼                              ▼
brightchain-api-lib    brightchain-s3-store         brightchain-azure-store
       │                    │         │                   │           │
       │                    │         ▼                   │           ▼
       │                    │   @aws-sdk/client-s3        │   @azure/storage-blob
       │                    │                             │   @azure/identity
       │                    │                             │
       └────────────────────┴─────────────────────────────┘
              (CloudBlockStoreBase lives here,
               zero cloud SDK dependencies)
```

Key design property: `brightchain-api-lib` has zero static or dynamic dependencies on either cloud store library. It depends only on `BlockStoreFactory` from `brightchain-lib`, which defines factory function types but not implementations.

## Further Reading

- [Cloud Storage Providers Walkthrough](/docs/walkthroughs/07-cloud-storage-providers) — step-by-step setup guide with code examples
- [Cloud Block Store Drivers Design](/docs/architecture/cloud-block-store-drivers) — full architecture document with data models, correctness properties, and testing strategy
- [Storage Pools](/docs/walkthroughs/03-storage-pools) — pool isolation works identically with cloud stores
- [File Storage Overview](/docs/storage/storage-overview) — how BrightChain chunks, whitens, and stores files
