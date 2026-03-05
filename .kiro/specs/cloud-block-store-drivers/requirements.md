# Requirements Document

## Introduction

BrightChain currently supports two block store backends: an in-memory `MemoryBlockStore` (in `brightchain-lib`) and a disk-based `DiskBlockStore`/`DiskBlockAsyncStore` (in `brightchain-api-lib`). Both implement the `IBlockStore` interface. This feature adds two cloud-based block store drivers — Azure Blob Storage and Amazon S3 — so that BrightChain nodes can persist blocks to cloud object storage instead of (or in addition to) local disk.

The cloud drivers implement the same `IBlockStore` interface and integrate with the existing `BlockStoreFactory` registration pattern, environment configuration, and metadata/FEC/replication subsystems.

### Library Structure

To keep heavy cloud SDK dependencies isolated, each cloud provider driver lives in its own dedicated Nx library:

- **`brightchain-lib`** — shared, browser-safe types: `ICloudBlockStoreConfig`, `BlockStoreType` enum, `BlockStoreFactory` extensions
- **`brightchain-api-lib`** — Node.js-specific, zero cloud SDK deps: `CloudBlockStoreBase` abstract class, `MockCloudBlockStore` test helper, all property-based tests, `Environment` class extensions, `brightchainDatabaseInit` updates
- **`@brightchain/azure-store`** — `AzureBlobBlockStore` + Azure factory registration. Depends on `@azure/storage-blob`, `brightchain-lib`, `brightchain-api-lib`
- **`@brightchain/s3-store`** — `S3BlockStore` + S3 factory registration. Depends on `@aws-sdk/client-s3`, `brightchain-lib`, `brightchain-api-lib`

Consumers import only the cloud libraries they need. The consuming application statically imports the relevant cloud lib at its entry point, which triggers factory registration with `BlockStoreFactory`.

## Glossary

- **IBlockStore**: The shared interface in `brightchain-lib` defining all block storage operations including CRUD, metadata, FEC parity, replication tracking, XOR brightening, and CBL whitening.
- **BlockStoreFactory**: The factory class in `brightchain-lib` that creates block store instances via pluggable factory functions registered at import time.
- **DiskBlockStore**: The existing Node.js filesystem-based `IBlockStore` implementation in `brightchain-api-lib`.
- **DiskBlockAsyncStore**: The async-enhanced extension of `DiskBlockStore` in `brightchain-api-lib` with streaming XOR, pool support, and expiration cleanup.
- **CloudBlockStoreBase**: The abstract base class in `brightchain-api-lib` encapsulating shared cloud store logic (retry, key management, metadata, FEC, pool operations) with zero cloud SDK dependencies.
- **AzureBlobBlockStore**: The new `IBlockStore` implementation backed by Azure Blob Storage, in `@brightchain/azure-store`.
- **S3BlockStore**: The new `IBlockStore` implementation backed by Amazon S3, in `@brightchain/s3-store`.
- **BlockStoreType**: An enumeration identifying the active block store backend (Memory, Disk, AzureBlob, S3).
- **Checksum**: A typed wrapper around a SHA-3 hash used as the primary block identifier.
- **RawDataBlock**: The concrete block class carrying raw byte data and its checksum.
- **IBlockMetadata**: The metadata record tracking block lifecycle, durability, parity, and replication state.
- **BlockStoreOptions**: Options passed when storing a block, including expiration, durability level, and target replication factor.
- **FEC**: Forward Error Correction — Reed-Solomon parity encoding used for block durability.
- **CBL**: Content Block List — a manifest of block addresses used for file reconstruction.
- **Environment**: The configuration class in `brightchain-api-lib` that reads environment variables to determine block store backend and credentials.
- **IPooledBlockStore**: Extended interface adding pool-scoped (namespace-isolated) block operations on top of `IBlockStore`.
- **PoolId**: A string identifier for a logical storage namespace within a block store.

## Requirements

### Requirement 1: Shared Cloud Block Store Interface

**User Story:** As a developer, I want a shared base interface for cloud block stores in `brightchain-lib`, so that frontend and backend code can reference cloud store configuration types without depending on Node.js-specific SDKs.

#### Acceptance Criteria

1. THE Brightchain_Lib SHALL export an `ICloudBlockStoreConfig` interface containing provider-agnostic configuration fields: region, container/bucket name, block size, and an optional key prefix.
2. THE Brightchain_Lib SHALL export a `BlockStoreType` enumeration with values Memory, Disk, AzureBlob, and S3.
3. THE BlockStoreFactory SHALL provide `registerAzureStoreFactory` and `registerS3StoreFactory` static methods that accept factory functions returning `IBlockStore`.
4. THE BlockStoreFactory SHALL provide `createAzureStore` and `createS3Store` static methods that invoke the registered factory or throw an error when no factory is registered.

### Requirement 2: Azure Blob Storage Block Store

**User Story:** As a node operator, I want to store BrightChain blocks in Azure Blob Storage, so that I can leverage Azure's durability and scalability for block persistence.

#### Acceptance Criteria

1. THE AzureBlobBlockStore SHALL implement the full `IBlockStore` interface.
2. THE AzureBlobBlockStore SHALL reside in the `@brightchain/azure-store` Nx library, separate from `brightchain-api-lib`, to isolate the `@azure/storage-blob` SDK dependency.
3. WHEN a block is stored via `setData`, THE AzureBlobBlockStore SHALL upload the block data as a blob to the configured Azure Blob Storage container using the block's checksum hex as the blob name.
4. WHEN a block is retrieved via `getData`, THE AzureBlobBlockStore SHALL download the blob from Azure Blob Storage and return a `RawDataBlock` with the correct checksum and block size.
5. WHEN `has` is called, THE AzureBlobBlockStore SHALL check blob existence using Azure Blob Storage metadata operations without downloading the full blob.
6. WHEN `deleteData` is called, THE AzureBlobBlockStore SHALL delete the blob and its associated metadata and parity blobs from Azure Blob Storage.
7. THE AzureBlobBlockStore SHALL store block metadata as blob metadata properties or as a separate metadata blob with a `.meta` suffix.
8. THE AzureBlobBlockStore SHALL store parity blocks as separate blobs with a `parity/` prefix under the parent block's checksum directory.
9. THE AzureBlobBlockStore SHALL support authentication via connection string, managed identity, or shared access key, configurable through environment variables.
10. IF an Azure SDK operation fails with a transient error, THEN THE AzureBlobBlockStore SHALL retry the operation up to 3 times with exponential backoff before propagating the error.
11. IF an Azure SDK operation fails with a non-transient error, THEN THE AzureBlobBlockStore SHALL propagate the error immediately without retrying.

### Requirement 3: Amazon S3 Block Store

**User Story:** As a node operator, I want to store BrightChain blocks in Amazon S3, so that I can leverage AWS's durability and scalability for block persistence.

#### Acceptance Criteria

1. THE S3BlockStore SHALL implement the full `IBlockStore` interface.
2. THE S3BlockStore SHALL reside in the `@brightchain/s3-store` Nx library, separate from `brightchain-api-lib`, to isolate the `@aws-sdk/client-s3` SDK dependency.
3. WHEN a block is stored via `setData`, THE S3BlockStore SHALL upload the block data as an S3 object to the configured bucket using the block's checksum hex as the object key.
4. WHEN a block is retrieved via `getData`, THE S3BlockStore SHALL download the S3 object and return a `RawDataBlock` with the correct checksum and block size.
5. WHEN `has` is called, THE S3BlockStore SHALL check object existence using S3 HeadObject operations without downloading the full object.
6. WHEN `deleteData` is called, THE S3BlockStore SHALL delete the object and its associated metadata and parity objects from S3.
7. THE S3BlockStore SHALL store block metadata as S3 object metadata headers or as a separate metadata object with a `.meta` suffix.
8. THE S3BlockStore SHALL store parity blocks as separate objects with a `parity/` prefix under the parent block's checksum directory.
9. THE S3BlockStore SHALL support authentication via AWS credentials (access key + secret), IAM role, or environment-based credential chain, configurable through environment variables.
10. IF an S3 SDK operation fails with a transient error, THEN THE S3BlockStore SHALL retry the operation up to 3 times with exponential backoff before propagating the error.
11. IF an S3 SDK operation fails with a non-transient error, THEN THE S3BlockStore SHALL propagate the error immediately without retrying.

### Requirement 4: Block Store Factory Registration

**User Story:** As a developer, I want cloud block stores to integrate with the existing `BlockStoreFactory` pattern, so that switching between disk, Azure, and S3 backends requires only configuration changes.

#### Acceptance Criteria

1. THE `@brightchain/azure-store` library SHALL register the AzureBlobBlockStore factory with `BlockStoreFactory.registerAzureStoreFactory` at import time, following the same pattern as the existing `DiskBlockAsyncStore` registration.
2. THE `@brightchain/s3-store` library SHALL register the S3BlockStore factory with `BlockStoreFactory.registerS3StoreFactory` at import time, following the same pattern as the existing `DiskBlockAsyncStore` registration.
3. WHEN `BlockStoreFactory.createAzureStore` is called without a registered factory, THE BlockStoreFactory SHALL throw an error with a descriptive message indicating that the Azure store factory is not registered.
4. WHEN `BlockStoreFactory.createS3Store` is called without a registered factory, THE BlockStoreFactory SHALL throw an error with a descriptive message indicating that the S3 store factory is not registered.

### Requirement 5: Environment Configuration

**User Story:** As a node operator, I want to configure the cloud block store backend through environment variables, so that I can switch between storage backends without code changes.

#### Acceptance Criteria

1. THE Environment class SHALL read a `BRIGHTCHAIN_BLOCKSTORE_TYPE` environment variable to determine the active block store backend, accepting values "disk", "azure", and "s3".
2. WHEN `BRIGHTCHAIN_BLOCKSTORE_TYPE` is "azure", THE Environment class SHALL read `AZURE_STORAGE_CONNECTION_STRING` or `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_CONTAINER_NAME` environment variables for Azure configuration.
3. WHEN `BRIGHTCHAIN_BLOCKSTORE_TYPE` is "s3", THE Environment class SHALL read `AWS_S3_BUCKET_NAME` and optionally `AWS_S3_KEY_PREFIX` and `AWS_REGION` environment variables for S3 configuration.
4. WHEN `BRIGHTCHAIN_BLOCKSTORE_TYPE` is not set, THE Environment class SHALL default to "disk" behavior, preserving backward compatibility with existing deployments.
5. THE databaseInit function SHALL use the `BRIGHTCHAIN_BLOCKSTORE_TYPE` value to call the corresponding `BlockStoreFactory.create*Store` method. The consuming application is responsible for importing the appropriate cloud store library (`@brightchain/azure-store` or `@brightchain/s3-store`) at its entry point to trigger factory registration. If the factory is not registered, `databaseInit` SHALL throw a `StoreError(FactoryNotRegistered)` with an actionable hint message.
6. IF required environment variables for the selected block store type are missing, THEN THE Environment class SHALL throw a descriptive error at construction time listing the missing variables.

### Requirement 6: FEC Parity and Metadata for Cloud Stores

**User Story:** As a node operator, I want FEC parity generation, metadata tracking, and replication operations to work identically across disk and cloud block stores, so that block durability guarantees are maintained regardless of backend.

#### Acceptance Criteria

1. THE AzureBlobBlockStore SHALL implement `generateParityBlocks` by generating Reed-Solomon parity data and storing each parity block as a separate cloud object.
2. THE S3BlockStore SHALL implement `generateParityBlocks` by generating Reed-Solomon parity data and storing each parity block as a separate cloud object.
3. THE AzureBlobBlockStore SHALL implement `recoverBlock` by retrieving available data and parity blocks from Azure Blob Storage and performing Reed-Solomon recovery.
4. THE S3BlockStore SHALL implement `recoverBlock` by retrieving available data and parity blocks from S3 and performing Reed-Solomon recovery.
5. THE AzureBlobBlockStore SHALL implement `getMetadata` and `updateMetadata` using cloud-native metadata storage (blob properties or sidecar objects).
6. THE S3BlockStore SHALL implement `getMetadata` and `updateMetadata` using cloud-native metadata storage (object metadata or sidecar objects).
7. THE AzureBlobBlockStore SHALL implement `verifyBlockIntegrity` by downloading the block and its parity data and verifying checksums.
8. THE S3BlockStore SHALL implement `verifyBlockIntegrity` by downloading the block and its parity data and verifying checksums.

### Requirement 7: CBL Whitening and Brightening for Cloud Stores

**User Story:** As a developer, I want CBL whitening/retrieval and block brightening to work with cloud block stores, so that Owner-Free storage patterns function correctly on cloud backends.

#### Acceptance Criteria

1. THE AzureBlobBlockStore SHALL implement `storeCBLWithWhitening` by generating a random block, XORing it with the CBL data, and storing both resulting blocks as separate cloud objects.
2. THE S3BlockStore SHALL implement `storeCBLWithWhitening` by generating a random block, XORing it with the CBL data, and storing both resulting blocks as separate cloud objects.
3. THE AzureBlobBlockStore SHALL implement `retrieveCBL` by downloading both component blocks from Azure Blob Storage and XORing them to reconstruct the original CBL.
4. THE S3BlockStore SHALL implement `retrieveCBL` by downloading both component blocks from S3 and XORing them to reconstruct the original CBL.
5. THE AzureBlobBlockStore SHALL implement `brightenBlock` by retrieving random blocks from the store, XORing them with the source block, and storing the result.
6. THE S3BlockStore SHALL implement `brightenBlock` by retrieving random blocks from the store, XORing them with the source block, and storing the result.
7. FOR ALL valid CBL data, storing via `storeCBLWithWhitening` then retrieving via `retrieveCBL` SHALL produce data identical to the original CBL (round-trip property).

### Requirement 8: Cloud Block Store Pooled Operations

**User Story:** As a developer, I want cloud block stores to support pool-scoped operations, so that namespace isolation works consistently across all storage backends.

#### Acceptance Criteria

1. THE AzureBlobBlockStore SHALL support an extended implementation of `IPooledBlockStore` that uses key prefixes (e.g., `{poolId}/{checksum}`) for pool isolation within a single container.
2. THE S3BlockStore SHALL support an extended implementation of `IPooledBlockStore` that uses key prefixes (e.g., `{poolId}/{checksum}`) for pool isolation within a single bucket.
3. WHEN `listBlocksInPool` is called, THE AzureBlobBlockStore SHALL list blobs with the pool prefix using Azure Blob Storage list operations.
4. WHEN `listBlocksInPool` is called, THE S3BlockStore SHALL list objects with the pool prefix using S3 ListObjectsV2 operations.
5. WHEN `deletePool` is called, THE AzureBlobBlockStore SHALL delete all blobs with the pool prefix from the container.
6. WHEN `deletePool` is called, THE S3BlockStore SHALL delete all objects with the pool prefix from the bucket.

### Requirement 9: Error Handling and Logging

**User Story:** As a node operator, I want clear error messages and logging from cloud block stores, so that I can diagnose storage issues quickly.

#### Acceptance Criteria

1. IF a cloud storage operation fails after all retries, THEN THE AzureBlobBlockStore SHALL throw a `StoreError` containing the original cloud SDK error message, the operation name, and the block checksum.
2. IF a cloud storage operation fails after all retries, THEN THE S3BlockStore SHALL throw a `StoreError` containing the original cloud SDK error message, the operation name, and the block checksum.
3. WHEN a transient error triggers a retry, THE AzureBlobBlockStore SHALL log the retry attempt number and error details at the warning level.
4. WHEN a transient error triggers a retry, THE S3BlockStore SHALL log the retry attempt number and error details at the warning level.
5. IF authentication credentials are invalid or expired, THEN THE AzureBlobBlockStore SHALL throw a descriptive authentication error distinct from general storage errors.
6. IF authentication credentials are invalid or expired, THEN THE S3BlockStore SHALL throw a descriptive authentication error distinct from general storage errors.

### Requirement 10: Random Block Selection for Cloud Stores

**User Story:** As a developer, I want `getRandomBlocks` to work efficiently on cloud block stores, so that XOR brightening and whitening operations can source random blocks without listing the entire store.

#### Acceptance Criteria

1. THE AzureBlobBlockStore SHALL implement `getRandomBlocks` by maintaining a local index of stored block checksums and sampling from the index.
2. THE S3BlockStore SHALL implement `getRandomBlocks` by maintaining a local index of stored block checksums and sampling from the index.
3. WHEN the local index is empty or stale, THE AzureBlobBlockStore SHALL refresh the index by listing blobs from the container with a configurable page size.
4. WHEN the local index is empty or stale, THE S3BlockStore SHALL refresh the index by listing objects from the bucket with a configurable page size.
5. IF the store contains fewer blocks than the requested count, THEN THE cloud block store SHALL return all available block checksums without error.
