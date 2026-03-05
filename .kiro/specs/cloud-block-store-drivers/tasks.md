# Implementation Plan: Cloud Block Store Drivers

## Overview

Implement Azure Blob Storage and Amazon S3 block store drivers for BrightChain. Shared types go in `brightchain-lib`, the abstract base class and property tests go in `brightchain-api-lib` (zero cloud SDK deps). Each concrete cloud provider driver lives in its own Nx library to isolate heavy SDK dependencies:
- `@brightchain/azure-store` — `AzureBlobBlockStore` + Azure factory registration
- `@brightchain/s3-store` — `S3BlockStore` + S3 factory registration

## Tasks

- [x] 1. Add shared types and factory extensions in brightchain-lib
  - [x] 1.1 Create `BlockStoreType` enum and `ICloudBlockStoreConfig` interface
    - Create `brightchain-lib/src/lib/enumerations/blockStoreType.ts` with enum values `Memory`, `Disk`, `AzureBlob`, `S3`
    - Create `brightchain-lib/src/lib/interfaces/storage/cloudBlockStoreConfig.ts` with `ICloudBlockStoreConfig` (region, containerOrBucketName, blockSize, optional keyPrefix)
    - Export both from their respective barrel files
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Add new `StoreErrorType` values
    - Add `FactoryNotRegistered`, `CloudOperationFailed`, `CloudAuthenticationFailed` to `StoreErrorType` enum in `brightchain-lib/src/lib/enumerations/storeErrorType.ts`
    - Add corresponding entries to `BrightChainStrings` and `StoreError.reasonMap` if applicable
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [x] 1.3 Extend `BlockStoreFactory` with Azure and S3 registration/creation methods
    - Add `AzureStoreFactoryFn` and `S3StoreFactoryFn` types
    - Add `registerAzureStoreFactory`, `clearAzureStoreFactory`, `createAzureStore` static methods
    - Add `registerS3StoreFactory`, `clearS3StoreFactory`, `createS3Store` static methods
    - `createAzureStore`/`createS3Store` throw `StoreError(StoreErrorType.FactoryNotRegistered)` when no factory is registered
    - _Requirements: 1.3, 1.4, 4.3, 4.4_

  - [x] 1.4 Write property test for factory registration round-trip (Property 1)
    - **Property 1: Factory registration round-trip**
    - **Validates: Requirements 1.3, 1.4**
    - Create `brightchain-lib/src/lib/factories/blockStoreFactory.cloud.property.spec.ts`
    - Test that registering a factory and calling create returns the expected IBlockStore instance

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement `CloudBlockStoreBase` abstract class
  - [x] 3.1 Create the abstract base class
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStoreBase.ts`
    - Implement `IBlockStore` and `IPooledBlockStore` interfaces
    - Define 6 abstract primitives: `uploadObject`, `downloadObject`, `deleteObject`, `objectExists`, `listObjects`, `isTransientError`
    - Implement `withRetry` method with exponential backoff (base 1s, factor 2x, max 3 retries)
    - Implement key management: `buildObjectKey`, `buildMetaKey`, `buildParityKey` using `{keyPrefix}{poolId}/{checksumHex}` pattern
    - Implement local checksum index (`Set<string>`) with lazy refresh and configurable TTL (default 5 min)
    - Implement all `IBlockStore` methods delegating to abstract primitives: `has`, `getData`, `setData`, `deleteData`, `getRandomBlocks`, `get`, `put`, `delete`
    - Implement metadata operations using `.meta` sidecar JSON objects: `getMetadata`, `updateMetadata`
    - Implement FEC operations: `generateParityBlocks`, `getParityBlocks`, `recoverBlock`, `verifyBlockIntegrity`
    - Implement CBL whitening: `storeCBLWithWhitening`, `retrieveCBL`, `parseCBLMagnetUrl`, `generateCBLMagnetUrl`
    - Implement XOR brightening: `brightenBlock`
    - Implement replication tracking: `getBlocksPendingReplication`, `getUnderReplicatedBlocks`, `recordReplication`, `recordReplicaLoss`
    - Implement `IPooledBlockStore` methods using pool key prefixes: `putInPool`, `getFromPool`, `hasInPool`, `deleteFromPool`, `listBlocksInPool`, `deletePool`
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.1–6.8, 7.1–7.7, 8.1–8.6, 9.1–9.4, 10.1–10.5_

  - [x] 3.2 Create `MockCloudBlockStore` test helper
    - Create `brightchain-api-lib/src/lib/stores/__tests__/helpers/mockCloudBlockStore.ts`
    - Extend `CloudBlockStoreBase` with in-memory `Map<string, Uint8Array>` backing store
    - Implement all 6 abstract primitives against the in-memory map
    - Add ability to inject transient/non-transient errors for retry testing
    - _Requirements: (test infrastructure for all cloud store properties)_

  - [x] 3.3 Write property test for block store/retrieve round-trip (Property 2)
    - **Property 2: Block store/retrieve round-trip**
    - **Validates: Requirements 2.3, 2.4, 3.3, 3.4**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.roundtrip.property.spec.ts`

  - [x] 3.4 Write property test for store state consistency (Property 3)
    - **Property 3: Store state consistency (has/delete)**
    - **Validates: Requirements 2.5, 2.6, 3.5, 3.6**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.stateConsistency.property.spec.ts`

  - [x] 3.5 Write property test for metadata round-trip (Property 4)
    - **Property 4: Metadata round-trip**
    - **Validates: Requirements 2.7, 3.7, 6.5, 6.6**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.metadata.property.spec.ts`

  - [x] 3.6 Write property tests for retry behavior (Properties 8, 9, 10, 14)
    - **Property 8: Transient error retry behavior**
    - **Property 9: Non-transient error immediate propagation**
    - **Property 10: Authentication error classification**
    - **Property 14: Error structure completeness**
    - **Validates: Requirements 2.10, 2.11, 3.10, 3.11, 9.1–9.6**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.retry.property.spec.ts`

  - [x] 3.7 Write property tests for pool operations (Properties 11, 12, 13)
    - **Property 11: Pool isolation**
    - **Property 12: Pool listing completeness**
    - **Property 13: Pool deletion completeness**
    - **Validates: Requirements 8.1–8.6**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.pool.property.spec.ts`

  - [x] 3.8 Write property test for random blocks subset invariant (Property 15)
    - **Property 15: Random blocks subset invariant**
    - **Validates: Requirements 10.1, 10.2, 10.5**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.randomBlocks.property.spec.ts`

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create `@brightchain/azure-store` Nx library and implement `AzureBlobBlockStore`
  - [x] 5.1 Scaffold the `brightchain-azure-store` Nx library
    - Use Nx generator to create a new TypeScript library at `brightchain-azure-store/`
    - Configure `project.json` with tags `["type:lib", "scope:cloud"]` and implicit dependencies on `brightchain-lib` and `brightchain-api-lib`
    - Add `@azure/storage-blob` as a dependency in the workspace `package.json`
    - Set up `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `jest.config.ts`
    - Add path alias `@brightchain/azure-store` to `tsconfig.base.json`
    - _Requirements: 2.2_

  - [x] 5.2 Create the Azure Blob Storage driver
    - Create `brightchain-azure-store/src/lib/stores/azureBlobBlockStore.ts`
    - Define `IAzureBlobBlockStoreConfig` extending `ICloudBlockStoreConfig` with `connectionString?`, `accountName?`, `accountKey?`, `useManagedIdentity?`
    - Extend `CloudBlockStoreBase` from `@brightchain/brightchain-api-lib`
    - Implement constructor with authentication priority: connection string → account name + key → managed identity (`DefaultAzureCredential`)
    - Implement `uploadObject` using `BlockBlobClient.upload`
    - Implement `downloadObject` using `BlobClient.download`
    - Implement `deleteObject` using `BlobClient.delete`
    - Implement `objectExists` using `BlobClient.getProperties` (metadata-only, no full download)
    - Implement `listObjects` using `ContainerClient.listBlobsFlat` with prefix
    - Implement `isTransientError` checking HTTP status codes 408, 429, 500, 502, 503, 504 and `RestError` transient codes
    - _Requirements: 2.1–2.11_

  - [x] 5.3 Create Azure factory registration module
    - Create `brightchain-azure-store/src/lib/factories/azureBlockStoreFactory.ts`
    - Register `AzureBlobBlockStore` factory via `BlockStoreFactory.registerAzureStoreFactory`
    - Import this module from `brightchain-azure-store/src/index.ts` so registration happens at import time
    - Export `AzureBlobBlockStore`, `IAzureBlobBlockStoreConfig` from barrel file
    - _Requirements: 4.1_

  - [x] 5.4 Write unit tests for `AzureBlobBlockStore`
    - Create `brightchain-azure-store/src/lib/__tests__/azureBlobBlockStore.spec.ts`
    - Test construction with each auth mode (connection string, account key, managed identity)
    - Test transient error detection for Azure-specific HTTP codes and `RestError` codes
    - Test factory registration at import time (verify side effect)
    - _Requirements: 2.9, 2.10, 2.11_

- [x] 6. Create `@brightchain/s3-store` Nx library and implement `S3BlockStore`
  - [x] 6.1 Scaffold the `brightchain-s3-store` Nx library
    - Use Nx generator to create a new TypeScript library at `brightchain-s3-store/`
    - Configure `project.json` with tags `["type:lib", "scope:cloud"]` and implicit dependencies on `brightchain-lib` and `brightchain-api-lib`
    - Add `@aws-sdk/client-s3` as a dependency in the workspace `package.json`
    - Set up `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `jest.config.ts`
    - Add path alias `@brightchain/s3-store` to `tsconfig.base.json`
    - _Requirements: 3.2_

  - [x] 6.2 Create the Amazon S3 driver
    - Create `brightchain-s3-store/src/lib/stores/s3BlockStore.ts`
    - Define `IS3BlockStoreConfig` extending `ICloudBlockStoreConfig` with `accessKeyId?`, `secretAccessKey?`, `useIamRole?`, `endpoint?`
    - Extend `CloudBlockStoreBase` from `@brightchain/brightchain-api-lib`
    - Implement constructor with authentication priority: explicit credentials → IAM role / environment credential chain
    - Implement `uploadObject` using `PutObjectCommand`
    - Implement `downloadObject` using `GetObjectCommand`
    - Implement `deleteObject` using `DeleteObjectCommand`
    - Implement `objectExists` using `HeadObjectCommand` (no full download)
    - Implement `listObjects` using `ListObjectsV2Command` with prefix
    - Implement `isTransientError` checking `$retryable`, HTTP status codes 429, 500, 502, 503, 504, and `TimeoutError`/`NetworkingError` names
    - _Requirements: 3.1–3.11_

  - [x] 6.3 Create S3 factory registration module
    - Create `brightchain-s3-store/src/lib/factories/s3BlockStoreFactory.ts`
    - Register `S3BlockStore` factory via `BlockStoreFactory.registerS3StoreFactory`
    - Import this module from `brightchain-s3-store/src/index.ts` so registration happens at import time
    - Export `S3BlockStore`, `IS3BlockStoreConfig` from barrel file
    - _Requirements: 4.2_

  - [x] 6.4 Write unit tests for `S3BlockStore`
    - Create `brightchain-s3-store/src/lib/__tests__/s3BlockStore.spec.ts`
    - Test construction with each auth mode (explicit credentials, IAM role, custom endpoint)
    - Test transient error detection for S3-specific error properties and codes
    - Test factory registration at import time (verify side effect)
    - _Requirements: 3.9, 3.10, 3.11_

- [x] 7. Checkpoint - Ensure all tests pass
  - Run `yarn nx run brightchain-azure-store:test` and `yarn nx run brightchain-s3-store:test`
  - Run `yarn nx run brightchain-api-lib:test` and `yarn nx run brightchain-lib:test` to verify no regressions
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Wire environment config and database init
  - [x] 8.1 Extend `Environment` class with cloud block store configuration
    - Add `_blockStoreType` field reading `BRIGHTCHAIN_BLOCKSTORE_TYPE` (defaults to `"disk"`)
    - Add `_azureConfig` field reading Azure env vars when type is `"azure"`
    - Add `_s3Config` field reading S3 env vars when type is `"s3"`
    - Add `blockStoreType`, `azureConfig`, `s3Config` accessors
    - Throw descriptive error at construction time if required env vars are missing for the selected type
    - _Requirements: 5.1–5.4, 5.6_

  - [x] 8.2 Write property test for environment missing variables validation (Property 16)
    - **Property 16: Environment missing variables validation**
    - **Validates: Requirements 5.6**
    - Create `brightchain-api-lib/src/lib/environment.cloudConfig.property.spec.ts`

  - [x] 8.3 Update `brightchainDatabaseInit` to support cloud store types (static plugin registration)
    - Add `BlockStoreType.AzureBlob` and `BlockStoreType.S3` branches in `brightchainDatabaseInit`
    - Call `BlockStoreFactory.createAzureStore(environment.azureConfig!)` for Azure
    - Call `BlockStoreFactory.createS3Store(environment.s3Config!)` for S3
    - No dynamic imports — factory must already be registered by the consuming app importing the cloud store library at its entry point
    - If factory is not registered, `StoreError(FactoryNotRegistered)` is thrown with an actionable hint message
    - Enhance `FactoryNotRegistered` error in `BlockStoreFactory.createAzureStore` and `createS3Store` to include `storeType` and `hint` params telling the developer which import to add
    - This keeps `brightchain-api-lib` free of any static or dynamic dependencies on the cloud store libraries
    - _Requirements: 5.5_

  - [x] 8.4 Export new stores and types from barrel files
    - Export `CloudBlockStoreBase` from `brightchain-api-lib/src/lib/stores/index.ts`
    - Export `BlockStoreType`, `ICloudBlockStoreConfig` from `brightchain-lib` barrel files (already done in task 1)
    - Verify `brightchain-azure-store/src/index.ts` exports `AzureBlobBlockStore`, `IAzureBlobBlockStoreConfig` and imports factory registration
    - Verify `brightchain-s3-store/src/index.ts` exports `S3BlockStore`, `IS3BlockStoreConfig` and imports factory registration
    - _Requirements: 1.1, 1.2_

- [-] 9. Implement FEC and CBL operations for cloud stores
  - [x] 9.1 Implement FEC parity and recovery in `CloudBlockStoreBase`
    - Implement `generateParityBlocks` using the existing `IFecService` pattern from `DiskBlockAsyncStore`
    - Store each parity shard as a separate cloud object under `parity/{checksumHex}/{index}`
    - Implement `recoverBlock` by retrieving available data and parity blocks and performing Reed-Solomon recovery
    - Implement `verifyBlockIntegrity` by downloading block + parity data and verifying checksums
    - _Requirements: 6.1–6.4, 6.7, 6.8_

  - [-] 9.2 Write property tests for FEC operations (Properties 5, 6)
    - **Property 5: FEC parity generate/recover round-trip**
    - **Property 6: Block integrity verification invariant**
    - **Validates: Requirements 6.1–6.4, 6.7, 6.8, 2.8, 3.8**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.fec.property.spec.ts`

  - [x] 9.3 Implement CBL whitening and brightening in `CloudBlockStoreBase`
    - Implement `storeCBLWithWhitening` generating random block, XORing with CBL data, storing both
    - Implement `retrieveCBL` downloading both component blocks and XORing to reconstruct
    - Implement `brightenBlock` retrieving random blocks, XORing with source, storing result
    - Implement `parseCBLMagnetUrl` and `generateCBLMagnetUrl` (can delegate to shared utility if one exists)
    - _Requirements: 7.1–7.7_

  - [-] 9.4 Write property test for CBL whitening round-trip (Property 7)
    - **Property 7: CBL whitening round-trip**
    - **Validates: Requirements 7.1–7.7**
    - Create `brightchain-api-lib/src/lib/stores/cloudBlockStore.cblWhitening.property.spec.ts`

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Run `yarn nx run-many --target=test --projects=brightchain-lib,brightchain-api-lib,brightchain-azure-store,brightchain-s3-store`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks 1–4 are complete. The shared types in `brightchain-lib`, `CloudBlockStoreBase` in `brightchain-api-lib`, and all property-based tests are already implemented and passing.
- Each cloud provider driver lives in its own Nx library to isolate heavy SDK dependencies (`@azure/storage-blob`, `@aws-sdk/client-s3`).
- `brightchain-api-lib` has zero cloud SDK dependencies — it only contains the abstract base class and mock test helper.
- Factory registration happens at import time in each cloud store library. The consuming application (e.g. `brightchain-api`) is responsible for importing the cloud store library at its entry point to trigger registration. `brightchainDatabaseInit` calls `BlockStoreFactory.createAzureStore()` / `createS3Store()` — no dynamic imports.
- Property tests validate universal correctness properties using `MockCloudBlockStore` in `brightchain-api-lib` (no cloud SDK dependency).
- Provider-specific unit tests (auth modes, transient error detection) live in their respective cloud store libraries.
- Use `yarn` for all package management. Use `yarn nx` for running Nx tasks.
