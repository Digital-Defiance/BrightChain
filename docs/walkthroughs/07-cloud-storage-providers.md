---
title: "Cloud Storage Providers"
parent: "Walkthroughs"
nav_order: 8
permalink: /walkthroughs/07-cloud-storage-providers/
---
# Cloud Storage Providers

| Field          | Value                                                                                      |
|----------------|--------------------------------------------------------------------------------------------|
| Prerequisites  | [Node Setup](/docs/walkthroughs/02-node-setup) completed, cloud provider account           |
| Estimated Time | 45 minutes                                                                                 |
| Difficulty     | Intermediate                                                                               |

## Introduction

By default, BrightChain stores blocks on the local filesystem using `DiskBlockStore`. For production deployments that need managed durability, geographic redundancy, or elastic capacity, two cloud storage providers are available:

- **Amazon S3** (`@brightchain/s3-store`) — stores blocks as S3 objects in any AWS region, with support for S3-compatible services like MinIO and LocalStack.
- **Azure Blob Storage** (`@brightchain/azure-store`) — stores blocks as blobs in an Azure Storage container, with support for the Azurite local emulator.

Both providers implement the same `IBlockStore` and `IPooledBlockStore` interfaces as the disk store, so every feature that works with disk storage — pools, FEC parity, CBL whitening, TUPLE storage, BrightDB — works identically with cloud storage. The only difference is where the bytes land.

Each provider lives in its own Nx library. Your application imports only the provider it needs, keeping cloud SDK dependencies isolated and your bundle lean.

This guide walks through the full setup: choosing a provider, preparing cloud resources, configuring authentication, wiring the provider into your application, understanding the data layout, working with pools, verifying the setup, tuning performance, and running a local emulator for development.

## Prerequisites

- Completed the [Quickstart](/docs/walkthroughs/01-quickstart) guide (repository cloned, dependencies installed)
- Completed the [Node Setup](/docs/walkthroughs/02-node-setup) guide (running BrightChain node with disk storage)
- Familiarity with the [Architecture Overview](/docs/walkthroughs/00-architecture-overview), especially the TUPLE storage model
- Node.js 20+ and Yarn installed
- For S3: An AWS account with permissions to create and manage S3 buckets
- For Azure: An Azure subscription with permissions to create Storage Accounts and containers

## Steps

### Step 1: Understand the Cloud Store Architecture

Cloud storage providers extend the same `IBlockStore` interface used by `DiskBlockStore` and `MemoryBlockStore`. The architecture has three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  brightchain-lib (shared, browser-safe)                         │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │ IBlockStore   │  │ ICloudBlockStoreConfig│  │BlockStoreFactory│
│  │ IPooledBlock  │  │ BlockStoreType enum   │  │              │  │
│  │   Store       │  │                      │  │              │  │
│  └──────────────┘  └──────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│  brightchain-api-lib (Node.js, zero cloud SDK deps)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ CloudBlockStoreBase (abstract)                            │   │
│  │  • Metadata serialization (sidecar .meta objects)         │   │
│  │  • FEC parity generation and block recovery               │   │
│  │  • CBL whitening (XOR with randomizer blocks)             │   │
│  │  • Pool key management ({poolId}/{checksum} prefixes)     │   │
│  │  • Retry with exponential backoff                         │   │
│  │  • Local checksum index for getRandomBlocks               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
┌─────────────────────┐          ┌─────────────────────────┐
│ @brightchain/s3-store│          │ @brightchain/azure-store │
│ ┌─────────────────┐ │          │ ┌─────────────────────┐ │
│ │ S3BlockStore    │ │          │ │ AzureBlobBlockStore  │ │
│ │ (6 I/O prims)   │ │          │ │ (6 I/O primitives)   │ │
│ └─────────────────┘ │          │ └─────────────────────┘ │
│ @aws-sdk/client-s3  │          │ @azure/storage-blob     │
└─────────────────────┘          │ @azure/identity         │
                                 └─────────────────────────┘
```

The abstract base class `CloudBlockStoreBase` handles all the complex logic. Each cloud subclass implements only six primitives:

| Primitive | Description |
|-----------|-------------|
| `uploadObject(key, data)` | Write a blob/object to the cloud |
| `downloadObject(key)` | Read a blob/object from the cloud |
| `deleteObject(key)` | Remove a blob/object |
| `objectExists(key)` | Check if a blob/object exists (HEAD request) |
| `listObjects(prefix, maxResults)` | List objects matching a prefix |
| `isTransientError(error)` | Classify an error as transient (retryable) or permanent |

This means both providers automatically inherit all shared behavior: metadata management, parity blocks, whitening, pool isolation, and retry logic. When new features are added to `CloudBlockStoreBase`, both providers get them for free.

#### Factory Registration Pattern

Cloud stores use a plugin-style registration pattern. Each provider library contains a factory registration module that runs as a side-effect when the library is imported:

```
1. Application imports '@brightchain/s3-store'
2. The barrel file (index.ts) imports './lib/factories/s3BlockStoreFactory'
3. That module calls BlockStoreFactory.registerS3StoreFactory(...)
4. Now BlockStoreFactory.createS3Store(config) returns an S3BlockStore
```

This is the same pattern used by TypeORM database drivers, Passport authentication strategies, and NestJS modules. The consuming application explicitly opts in to the providers it needs via static imports — no magic, no hidden dependencies.

If you call `BlockStoreFactory.createS3Store()` without the import, you get a clear `StoreError(FactoryNotRegistered)` with a message telling you exactly which import to add.

### Step 2: Choose a Provider

Use this decision matrix to pick the right provider for your deployment:

| Consideration | Amazon S3 | Azure Blob Storage |
|---------------|-----------|-------------------|
| Cloud platform | AWS, or any S3-compatible service | Azure |
| Authentication | IAM roles, access keys, instance profiles | Managed identity, connection strings, account keys |
| Local dev emulator | MinIO, LocalStack | Azurite |
| SDK dependency | `@aws-sdk/client-s3` (~2 MB) | `@azure/storage-blob` + `@azure/identity` (~3 MB) |
| S3-compatible services | MinIO, Ceph, DigitalOcean Spaces, Backblaze B2, Cloudflare R2 | Azure only |
| Best for | AWS-native deployments, multi-cloud via S3 compatibility | Azure-native deployments |

If you are running on AWS or want compatibility with S3-compatible object stores (MinIO, Cloudflare R2, Backblaze B2), choose S3. If you are running on Azure, choose Azure Blob Storage. You can also use both providers simultaneously in different parts of your application if needed.

### Step 3: Prepare Cloud Resources

Before configuring BrightChain, create the required cloud resources.

#### Amazon S3

1. Create an S3 bucket in your target region:

```bash
aws s3 mb s3://my-brightchain-blocks --region us-east-1
```

1. Configure bucket versioning (recommended for data durability):

```bash
aws s3api put-bucket-versioning \
  --bucket my-brightchain-blocks \
  --versioning-configuration Status=Enabled
```

1. Create an IAM policy with the minimum required permissions:

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
        "arn:aws:s3:::my-brightchain-blocks",
        "arn:aws:s3:::my-brightchain-blocks/*"
      ]
    }
  ]
}
```

1. Attach the policy to your IAM user or role.

#### Azure Blob Storage

1. Create a Storage Account:

```bash
az storage account create \
  --name mybrightchainstorage \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_LRS
```

1. Create a container:

```bash
az storage container create \
  --name brightchain-blocks \
  --account-name mybrightchainstorage
```

1. For managed identity deployments, assign the `Storage Blob Data Contributor` role:

```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <your-managed-identity-principal-id> \
  --scope /subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mybrightchainstorage
```

1. For account key authentication, retrieve the key:

```bash
az storage account keys list \
  --account-name mybrightchainstorage \
  --resource-group my-rg \
  --query '[0].value' -o tsv
```

### Step 4: Install the Provider Package

Each cloud provider is a separate Nx library with its own cloud SDK dependency. Install only the one you need.

#### Amazon S3

```bash
yarn add @aws-sdk/client-s3
```

#### Azure Blob Storage

```bash
yarn add @azure/storage-blob @azure/identity
```

You do not need to install both unless your application uses both providers.

### Step 5: Configure Authentication

Each provider supports multiple authentication methods, evaluated in a strict priority order. The first valid method wins.

#### Amazon S3 Authentication

S3BlockStore evaluates authentication in this order:

| Priority | Method | Config Fields | When to Use |
|----------|--------|---------------|-------------|
| 1 | Explicit credentials | `accessKeyId` + `secretAccessKey` | Development, CI/CD, non-AWS environments |
| 2 | IAM role / credential chain | `useIamRole: true` | Production on AWS (EC2, ECS, Lambda, EKS) |

**Option A: Explicit credentials**

Provide `accessKeyId` and `secretAccessKey` directly. Both must be present — providing only one throws `CloudAuthenticationFailed` immediately at construction time.

```typescript
import { BlockSize } from '@brightchain/brightchain-lib';
import type { IS3BlockStoreConfig } from '@brightchain/s3-store';

const s3Config: IS3BlockStoreConfig = {
  region: 'us-east-1',
  containerOrBucketName: 'my-brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
```

**Option B: IAM role / environment credential chain (recommended for production)**

Set `useIamRole: true` and omit explicit credentials. The AWS SDK resolves credentials automatically from the environment using its [default credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html):

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. EC2 instance metadata (instance profile)
4. ECS container credentials
5. EKS Pod Identity / IRSA
6. SSO credentials

```typescript
const s3Config: IS3BlockStoreConfig = {
  region: 'us-east-1',
  containerOrBucketName: 'my-brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  useIamRole: true,
};
```

**Option C: S3-compatible endpoint (MinIO, LocalStack, Cloudflare R2)**

For S3-compatible services, provide a custom `endpoint`. This automatically enables path-style access (`http://host/bucket/key` instead of `http://bucket.host/key`), which is required by most S3-compatible services.

```typescript
const s3Config: IS3BlockStoreConfig = {
  region: 'us-east-1',
  containerOrBucketName: 'brightchain-dev',
  supportedBlockSizes: [BlockSize.Small],
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  endpoint: 'http://localhost:9000',
};
```

**Validation rules:**

- If `accessKeyId` is provided without `secretAccessKey`, construction throws `CloudAuthenticationFailed` immediately
- If neither explicit credentials nor `useIamRole: true` is set, construction throws `CloudAuthenticationFailed` with a message listing the valid options

#### Azure Blob Storage Authentication

AzureBlobBlockStore evaluates authentication in this order:

| Priority | Method | Config Fields | When to Use |
|----------|--------|---------------|-------------|
| 1 | Connection string | `connectionString` | Development, quick setup |
| 2 | Account name + key | `accountName` + `accountKey` | Environments without managed identity |
| 3 | Managed identity | `accountName` + `useManagedIdentity: true` | Production on Azure |

**Option A: Connection string**

The simplest option. A single string contains the account name, key, and endpoint.

```typescript
import { BlockSize } from '@brightchain/brightchain-lib';
import type { IAzureBlobBlockStoreConfig } from '@brightchain/azure-store';

const azureConfig: IAzureBlobBlockStoreConfig = {
  region: 'eastus',
  containerOrBucketName: 'brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
};
```

You can find the connection string in the Azure Portal under Storage Account → Access keys, or via CLI:

```bash
az storage account show-connection-string \
  --name mybrightchainstorage \
  --resource-group my-rg \
  --query connectionString -o tsv
```

**Option B: Account name + account key**

```typescript
const azureConfig: IAzureBlobBlockStoreConfig = {
  region: 'eastus',
  containerOrBucketName: 'brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
};
```

This creates a `StorageSharedKeyCredential` and connects to `https://{accountName}.blob.core.windows.net`.

**Option C: Managed Identity / DefaultAzureCredential (recommended for production)**

For production on Azure, use managed identity. The `@azure/identity` SDK's `DefaultAzureCredential` resolves credentials automatically from the environment:

1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`)
2. Managed Identity (system-assigned or user-assigned)
3. Azure CLI credentials
4. Azure PowerShell credentials
5. Visual Studio Code credentials

```typescript
const azureConfig: IAzureBlobBlockStoreConfig = {
  region: 'eastus',
  containerOrBucketName: 'brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  accountName: 'mybrightchainstorage',
  useManagedIdentity: true,
};
```

**Validation rules:**

- If none of the three methods are configured, construction throws `CloudAuthenticationFailed` with a message listing the valid options
- `useManagedIdentity` requires `accountName` to be set (needed to construct the blob endpoint URL)

### Step 6: Register the Factory and Create the Store

Import the cloud store library at your application's entry point. The import must happen before any call to `BlockStoreFactory.createS3Store()` or `createAzureStore()`.

#### Amazon S3

```typescript
// main.ts or application entry point

// 1. Side-effect import — registers the S3 factory with BlockStoreFactory
import '@brightchain/s3-store';

// 2. Import the factory and config types
import { BlockStoreFactory, BlockSize } from '@brightchain/brightchain-lib';
import type { IS3BlockStoreConfig } from '@brightchain/s3-store';

// 3. Build the config
const s3Config: IS3BlockStoreConfig = {
  region: 'us-east-1',
  containerOrBucketName: 'my-brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  useIamRole: true,
};

// 4. Create the store — returns an IBlockStore backed by S3
const blockStore = BlockStoreFactory.createS3Store(s3Config);
```

#### Azure Blob Storage

```typescript
// main.ts or application entry point

// 1. Side-effect import — registers the Azure factory with BlockStoreFactory
import '@brightchain/azure-store';

// 2. Import the factory and config types
import { BlockStoreFactory, BlockSize } from '@brightchain/brightchain-lib';
import type { IAzureBlobBlockStoreConfig } from '@brightchain/azure-store';

// 3. Build the config
const azureConfig: IAzureBlobBlockStoreConfig = {
  region: 'eastus',
  containerOrBucketName: 'brightchain-blocks',
  supportedBlockSizes: [BlockSize.Small],
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
};

// 4. Create the store — returns an IBlockStore backed by Azure Blob Storage
const blockStore = BlockStoreFactory.createAzureStore(azureConfig);
```

#### Using Both Providers

You can register and use both providers in the same application:

```typescript
import '@brightchain/s3-store';
import '@brightchain/azure-store';

// Create stores for different purposes
const primaryStore = BlockStoreFactory.createS3Store(s3Config);
const backupStore = BlockStoreFactory.createAzureStore(azureConfig);
```

#### Environment-Driven Configuration

For production deployments, use the `Environment` class and `BRIGHTCHAIN_BLOCKSTORE_TYPE` environment variable. The `brightchainDatabaseInit` function reads the environment and calls the appropriate factory method automatically:

```dotenv
# .env
BRIGHTCHAIN_BLOCKSTORE_TYPE=s3
AWS_S3_BUCKET_NAME=my-brightchain-blocks
AWS_REGION=us-east-1
```

The `Environment` class validates that all required variables are present at construction time. If any are missing, it throws a descriptive error listing exactly what is needed.

### Step 7: Configure via Environment Variables

Here is the complete reference for all environment variables used by the cloud store providers.

#### Common

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIGHTCHAIN_BLOCKSTORE_TYPE` | No | `"disk"` | Storage backend: `"disk"`, `"memory"`, `"s3"`, or `"azure"` |

#### Amazon S3

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_S3_BUCKET_NAME` | Yes (when type=s3) | — | S3 bucket name |
| `AWS_REGION` | No | `us-east-1` | AWS region for the bucket |
| `AWS_ACCESS_KEY_ID` | Conditional | — | Required unless using IAM role |
| `AWS_SECRET_ACCESS_KEY` | Conditional | — | Required with `AWS_ACCESS_KEY_ID` |
| `AWS_S3_KEY_PREFIX` | No | — | Optional prefix for all object keys (e.g., `brightchain/`) |

#### Azure Blob Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_STORAGE_CONTAINER_NAME` | Yes (when type=azure) | — | Blob container name |
| `AZURE_STORAGE_CONNECTION_STRING` | Conditional | — | Full connection string (priority 1) |
| `AZURE_STORAGE_ACCOUNT_NAME` | Conditional | — | Account name (priority 2 or 3) |
| `AZURE_STORAGE_ACCOUNT_KEY` | Conditional | — | Account key (used with account name) |

For managed identity, set only `AZURE_STORAGE_ACCOUNT_NAME` and ensure the runtime environment supports `DefaultAzureCredential`.

### Step 8: Understand the Object Key Layout

Cloud stores organize objects using a prefix-based hierarchy. Every block produces two objects (data + metadata sidecar), and blocks with FEC parity produce additional parity shard objects.

#### Key Structure

```
{keyPrefix}{poolId}/{checksumHex}                    ← block data (Uint8Array)
{keyPrefix}{poolId}/{checksumHex}.meta               ← metadata sidecar (JSON)
{keyPrefix}{poolId}/parity/{checksumHex}/{shardIndex} ← FEC parity shard
```

Where:

- `keyPrefix` is optional, from `ICloudBlockStoreConfig.keyPrefix` (e.g., `"bc/"`)
- `poolId` is the storage pool identifier, defaulting to `"default"` for unpooled blocks
- `checksumHex` is the SHA-512 hex string identifying the block
- `shardIndex` is the zero-based parity shard number

#### Example: Default Pool

A block with checksum `a1b2c3...` stored without a key prefix:

```
default/a1b2c3d4e5f6...              ← block data
default/a1b2c3d4e5f6....meta         ← metadata JSON
default/parity/a1b2c3d4e5f6.../0     ← parity shard 0
default/parity/a1b2c3d4e5f6.../1     ← parity shard 1
```

#### Example: Named Pool with Key Prefix

The same block in pool `tenant_acme` with `keyPrefix: "bc/"`:

```
bc/tenant_acme/a1b2c3d4e5f6...              ← block data
bc/tenant_acme/a1b2c3d4e5f6....meta         ← metadata JSON
bc/tenant_acme/parity/a1b2c3d4e5f6.../0     ← parity shard 0
bc/tenant_acme/parity/a1b2c3d4e5f6.../1     ← parity shard 1
```

#### Why Sidecar Metadata Objects?

BrightChain stores block metadata as separate `.meta` JSON objects rather than using cloud-native metadata headers (S3 user metadata, Azure blob metadata). This is a deliberate design choice:

- **Size limits**: Azure blob metadata is limited to 8 KB total. S3 object metadata is limited to 2 KB. BrightChain's `IBlockMetadata` can exceed these limits when `parityBlockIds` or `replicaNodeIds` arrays grow large.
- **Consistency**: Both providers use the same JSON format, making cross-provider migration straightforward.
- **Queryability**: Sidecar objects can be downloaded and parsed independently of the block data.

The metadata sidecar contains:

```json
{
  "blockId": "a1b2c3...",
  "createdAt": "2025-06-15T10:30:00.000Z",
  "expiresAt": null,
  "durabilityLevel": "Standard",
  "parityBlockIds": ["d4e5f6...", "g7h8i9..."],
  "accessCount": 42,
  "lastAccessedAt": "2025-06-15T12:00:00.000Z",
  "replicationStatus": "Replicated",
  "targetReplicationFactor": 3,
  "replicaNodeIds": ["node-1", "node-2", "node-3"],
  "size": 4096,
  "checksum": "a1b2c3...",
  "poolId": "tenant_acme"
}
```

### Step 9: Use with Storage Pools

Cloud stores implement `IPooledBlockStore`, so they work with the same pool APIs described in the [Storage Pools](/docs/walkthroughs/03-storage-pools) walkthrough. Pool isolation is achieved through key prefixes — each pool's blocks live under `{poolId}/` in the container or bucket.

#### Create a Pool-Scoped Database

```typescript
import { PooledStoreAdapter, BrightDb } from '@brightchain/db';
import type { PoolId } from '@brightchain/brightchain-lib';

// blockStore is an S3BlockStore or AzureBlobBlockStore
const poolId: PoolId = 'tenant_acme';
const adapter = new PooledStoreAdapter(blockStore, poolId);
const db = new BrightDb(adapter);
await db.connect();

const orders = db.collection('orders');
await orders.insertOne({ orderId: 'ORD-001', total: 42.50 });
// Stored at: {keyPrefix}tenant_acme/{checksum}
```

#### Pool Management

All pool management operations work identically with cloud stores:

```typescript
// List all pools in this bucket/container
const pools = await blockStore.listPools();
// ['default', 'tenant_acme', 'tenant_globex']

// Get statistics for a pool
const stats = await blockStore.getPoolStats('tenant_acme');
// { poolId: 'tenant_acme', blockCount: 1247, totalBytes: 5_111_808, ... }

// Delete an entire pool (removes all objects with that pool prefix)
await blockStore.deletePool('tenant_acme');
```

#### Pool-Scoped Whitening

When using TUPLE storage (XOR whitening) with cloud stores, all three components (data block + 2 randomizer blocks) are stored in the same pool, just as with disk stores. This ensures:

- Deleting a pool removes all TUPLE components — no orphaned randomizer blocks
- Pool storage statistics account for the full 3× cost of whitened documents
- Replication of a pool includes all components needed to reconstruct documents

See [Storage Pools — Step 5: Understand Pool-Scoped Whitening](/docs/walkthroughs/03-storage-pools#step-5-understand-pool-scoped-whitening) for details.

### Step 10: Understand Retry and Error Handling

Cloud operations can fail due to transient network issues, throttling, or service outages. Both providers include built-in retry logic with exponential backoff, inherited from `CloudBlockStoreBase`.

#### Retry Behavior

| Parameter | Value |
|-----------|-------|
| Max retries | 3 (1 initial attempt + 3 retries = 4 total) |
| Backoff base | 1 second |
| Backoff factor | 2× (delays: 1s, 2s, 4s) |
| Total max wait | 7 seconds |

The retry wrapper calls `isTransientError(error)` on each failure. Only transient errors trigger retries. Non-transient and authentication errors propagate immediately.

#### Error Classification

| Category | StoreErrorType | Retried? | S3 Examples | Azure Examples |
|----------|---------------|----------|-------------|----------------|
| Transient | `CloudOperationFailed` | Yes (3×) | HTTP 429, 500, 502, 503, 504; `TimeoutError`, `NetworkingError`; `ETIMEDOUT`, `ECONNRESET` | HTTP 408, 429, 500, 502, 503, 504; `ETIMEDOUT`, `ECONNRESET` |
| Non-transient | `CloudOperationFailed` | No | HTTP 404, 400 | HTTP 404, 400 |
| Authentication | `CloudAuthenticationFailed` | No | HTTP 401, 403 | HTTP 401, 403 |
| Factory missing | `FactoryNotRegistered` | N/A | — | — |

#### S3-Specific Transient Detection

The S3 provider also checks the AWS SDK's `$retryable` hint on error objects. If the SDK marks an error as retryable, the store treats it as transient regardless of HTTP status code. Additionally, errors with names `TimeoutError` or `NetworkingError` are always treated as transient.

#### Azure-Specific Transient Detection

The Azure provider checks `RestError.statusCode` against the transient HTTP status set and `RestError.code` against known network error codes. HTTP 408 (Request Timeout) is included in Azure's transient set but not S3's, since S3 does not return 408 responses.

#### Error Structure

All cloud errors are wrapped in `StoreError` instances with structured params for diagnostics:

```typescript
try {
  await blockStore.getData(checksum);
} catch (error) {
  if (error instanceof StoreError) {
    console.log(error.type);    // 'CloudOperationFailed'
    console.log(error.params);  // { operation: 'downloadObject', blockChecksum: '...', originalError: '...' }
  }
}
```

### Step 11: Verify the Setup

After configuring your cloud store, run a round-trip test to verify everything is working.

```typescript
import {
  BlockSize,
  RawDataBlock,
  BlockType,
  BlockDataType,
} from '@brightchain/brightchain-lib';

async function verifyCloudStore(blockStore) {
  // 1. Create a test block
  const testData = new Uint8Array(BlockSize.Small).fill(0x42);
  const testBlock = new RawDataBlock(
    BlockType.RawData,
    BlockDataType.RawData,
    BlockSize.Small,
    testData,
  );

  // 2. Store it
  await blockStore.setData(testBlock);
  console.log('✓ Block stored:', testBlock.idChecksum);

  // 3. Verify it exists
  const exists = await blockStore.has(testBlock.idChecksum);
  console.log('✓ Block exists:', exists); // true

  // 4. Retrieve it
  const retrieved = await blockStore.getData(testBlock.idChecksum);
  console.log('✓ Block retrieved, size:', retrieved.data.length);

  // 5. Verify data integrity
  const match = testData.every((byte, i) => byte === retrieved.data[i]);
  console.log('✓ Data integrity:', match ? 'PASS' : 'FAIL');

  // 6. Check metadata
  const metadata = await blockStore.getMetadata(testBlock.idChecksum);
  console.log('✓ Metadata retrieved:', {
    size: metadata?.size,
    checksum: metadata?.checksum?.substring(0, 16) + '...',
  });

  // 7. Clean up
  await blockStore.deleteData(testBlock.idChecksum);
  const gone = await blockStore.has(testBlock.idChecksum);
  console.log('✓ Block deleted:', !gone); // true

  console.log('\nAll checks passed. Cloud store is operational.');
}

await verifyCloudStore(blockStore);
```

Expected output:

```
✓ Block stored: a1b2c3d4e5f6...
✓ Block exists: true
✓ Block retrieved, size: 4096
✓ Data integrity: PASS
✓ Metadata retrieved: { size: 4096, checksum: 'a1b2c3d4e5f6...' }
✓ Block deleted: true

All checks passed. Cloud store is operational.
```

### Step 12: Local Development with Emulators

For local development and CI pipelines, use cloud emulators instead of real cloud accounts. Both providers work with popular open-source emulators.

#### MinIO (S3-Compatible)

MinIO is a high-performance S3-compatible object store that runs locally via Docker.

**Start MinIO:**

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

**Create a bucket** via the MinIO console at `http://localhost:9001` (login: minioadmin/minioadmin), or via the CLI:

```bash
docker exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec minio mc mb local/brightchain-dev
```

**Configure the S3 store:**

```typescript
import '@brightchain/s3-store';
import { BlockStoreFactory, BlockSize } from '@brightchain/brightchain-lib';

const blockStore = BlockStoreFactory.createS3Store({
  region: 'us-east-1',           // required but ignored by MinIO
  containerOrBucketName: 'brightchain-dev',
  supportedBlockSizes: [BlockSize.Small],
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  endpoint: 'http://localhost:9000',
});
```

**Environment variables for MinIO:**

```dotenv
BRIGHTCHAIN_BLOCKSTORE_TYPE=s3
AWS_S3_BUCKET_NAME=brightchain-dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
```

**Other S3-compatible services** that work with the `endpoint` option:

- [LocalStack](https://localstack.cloud/) — full AWS emulator (`endpoint: 'http://localhost:4566'`)
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — production S3-compatible storage
- [Backblaze B2](https://www.backblaze.com/b2/docs/s3_compatible_api.html) — affordable S3-compatible storage
- [DigitalOcean Spaces](https://docs.digitalocean.com/products/spaces/) — S3-compatible object storage

#### Azurite (Azure Blob Storage Emulator)

Azurite is Microsoft's official Azure Storage emulator.

**Start Azurite via Docker:**

```bash
docker run -d \
  --name azurite \
  -p 10000:10000 \
  -p 10001:10001 \
  -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite
```

**Start Azurite via npm** (alternative):

```bash
npx azurite --silent --location ./azurite-data --debug ./azurite-debug.log
```

**Create a container** using the Azure CLI with the well-known Azurite connection string:

```bash
az storage container create \
  --name brightchain-dev \
  --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
```

**Configure the Azure store:**

```typescript
import '@brightchain/azure-store';
import { BlockStoreFactory, BlockSize } from '@brightchain/brightchain-lib';

const blockStore = BlockStoreFactory.createAzureStore({
  region: 'local',
  containerOrBucketName: 'brightchain-dev',
  supportedBlockSizes: [BlockSize.Small],
  connectionString:
    'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
    'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/' +
    'K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;',
});
```

#### Docker Compose for Development

For a complete local development environment, add the emulators to your `docker-compose.yml`:

```yaml
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    ports:
      - "10000:10000"
      - "10001:10001"
      - "10002:10002"
    volumes:
      - azurite-data:/data

volumes:
  minio-data:
  azurite-data:
```

### Step 13: Performance Considerations

Cloud storage introduces network latency that does not exist with disk storage. Understanding the performance characteristics helps you tune your deployment.

#### Latency Profile

| Operation | Disk Store | Cloud Store (same region) | Cloud Store (cross region) |
|-----------|-----------|--------------------------|---------------------------|
| `setData` (write) | < 1 ms | 10–50 ms | 50–200 ms |
| `getData` (read) | < 1 ms | 10–30 ms | 30–150 ms |
| `has` (exists check) | < 1 ms | 5–20 ms | 20–100 ms |
| `deleteData` | < 1 ms | 10–30 ms | 30–100 ms |
| `getRandomBlocks` (first call) | 1–10 ms | 100–5000 ms | 200–10000 ms |
| `getRandomBlocks` (cached) | < 1 ms | < 1 ms | < 1 ms |

Each `setData` call produces two cloud operations (data upload + metadata sidecar upload). Each `getData` call produces two cloud operations (data download + metadata sidecar download). Plan your throughput accordingly.

#### Local Checksum Index

The `getRandomBlocks` method requires knowing which blocks exist in the store. For cloud stores, this information is maintained in a local in-memory index (`Set<string>`) that is:

- **Populated lazily** on the first `getRandomBlocks` call by listing all objects in the container/bucket
- **Updated incrementally** on `setData` (add checksum) and `deleteData` (remove checksum)
- **Marked stale** after a configurable TTL (default: 5 minutes)
- **Refreshed** by re-listing objects, paginated at 1000 objects per page

For stores with millions of blocks, the initial index population can take several seconds. Subsequent calls use the cached index and are effectively instant.

#### Tuning Tips

- **Deploy in the same region** as your cloud storage to minimize latency
- **Use the `keyPrefix` option** to organize blocks under a common prefix, which improves listing performance on both S3 and Azure
- **Choose appropriate block sizes** — larger blocks (Medium, Large) amortize per-request overhead better than small blocks for bulk data
- **Consider connection pooling** — both the AWS SDK and Azure SDK maintain HTTP connection pools internally; avoid creating multiple store instances for the same bucket/container

#### Cost Considerations

Cloud storage costs depend on three factors:

| Cost Factor | S3 | Azure Blob Storage |
|-------------|----|--------------------|
| Storage | Per GB/month | Per GB/month (Hot/Cool/Archive tiers) |
| Operations | Per 1,000 PUT/GET/LIST requests | Per 10,000 operations |
| Data transfer | Free inbound, per GB outbound | Free inbound, per GB outbound |

Each block stored produces 2 objects (data + metadata sidecar). Blocks with FEC parity produce additional parity shard objects. Whitened documents (TUPLE storage) consume 3× the raw document size. Factor these multipliers into your cost estimates.

### Step 14: Migrating from Disk to Cloud Storage

To migrate an existing disk-based deployment to cloud storage:

1. **Set up the cloud store** following Steps 3–6 above
2. **Export blocks from disk** using the block store's iteration API:

```typescript
import '@brightchain/s3-store';
import { BlockStoreFactory, BlockSize } from '@brightchain/brightchain-lib';

// Source: existing disk store
const diskStore = BlockStoreFactory.createDiskStore({
  storePath: './brightchain-data',
  supportedBlockSizes: [BlockSize.Small],
});

// Destination: new cloud store
const cloudStore = BlockStoreFactory.createS3Store(s3Config);

// Migrate blocks from default pool
const checksums = await diskStore.listBlocksInPool('default');
for (const checksum of checksums) {
  const block = await diskStore.getData(checksum);
  await cloudStore.setData(block);
}

console.log(`Migrated ${checksums.length} blocks to cloud storage.`);
```

1. **Update the environment** to point to the cloud store:

```dotenv
BRIGHTCHAIN_BLOCKSTORE_TYPE=s3
```

1. **Verify** using the round-trip test from Step 11
2. **Decommission the disk store** once you have confirmed all blocks are accessible from the cloud

### Step 15: Security Best Practices

Cloud storage introduces a shared-responsibility security model. BrightChain handles data integrity (checksums, FEC parity) and application-level encryption (pool encryption modes). You are responsible for securing the cloud infrastructure.

#### Credential Management

- **Never commit credentials** to source control. Use environment variables, secrets managers (AWS Secrets Manager, Azure Key Vault), or CI/CD secret injection.
- **Prefer managed identity** over static credentials in production. IAM roles (AWS) and managed identity (Azure) eliminate the need to rotate keys manually.
- **Use least-privilege IAM policies**. The minimum S3 permissions are `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:HeadObject`, and `s3:ListBucket`. The minimum Azure role is `Storage Blob Data Contributor`.
- **Rotate static credentials** on a regular schedule if managed identity is not available.

#### Encryption at Rest

Both S3 and Azure Blob Storage support server-side encryption at rest:

- **S3**: Enable SSE-S3 (AES-256) or SSE-KMS (AWS KMS managed keys) on the bucket. This is transparent to BrightChain.
- **Azure**: Storage Service Encryption (SSE) is enabled by default with Microsoft-managed keys. You can optionally use customer-managed keys via Azure Key Vault.

This is in addition to BrightChain's application-level encryption (pool encryption modes). For maximum security, use both: cloud-native encryption at rest plus BrightChain's `PoolShared` or `NodeSpecific` encryption mode.

#### Encryption in Transit

- Both the AWS SDK and Azure SDK use HTTPS by default for all API calls
- The S3 `endpoint` option for local emulators (MinIO, LocalStack) may use HTTP — this is acceptable for development but should never be used in production

#### Network Security

- **S3**: Use VPC endpoints (Gateway or Interface) to keep traffic within the AWS network and avoid public internet traversal
- **Azure**: Use Private Endpoints or Service Endpoints to restrict access to your virtual network
- **Both**: Configure bucket/container access policies to deny public access

#### Bucket/Container Policies

- **S3**: Block public access at the account and bucket level. Use bucket policies to restrict access to specific IAM roles or VPC endpoints.
- **Azure**: Set the container access level to `private` (the default). Use Azure RBAC to control access.

## Troubleshooting

### `StoreError: FactoryNotRegistered`

**Cause:** You called `BlockStoreFactory.createS3Store()` or `createAzureStore()` without importing the provider library.

**Fix:** Add the side-effect import at your application entry point, before any factory calls:

```typescript
import '@brightchain/s3-store';     // for S3
import '@brightchain/azure-store';  // for Azure
```

### `StoreError: CloudAuthenticationFailed`

**Cause:** The provider could not authenticate with the cloud service.

**Fix for S3:**

- Verify `accessKeyId` and `secretAccessKey` are both set (providing only one throws immediately)
- If using IAM role, verify `useIamRole: true` is set and the environment has valid credentials
- Check that the IAM user/role has the required S3 permissions
- For custom endpoints, verify the endpoint URL is correct and the service is running

**Fix for Azure:**

- Verify the connection string is complete and correctly formatted
- If using account name + key, verify both are set
- If using managed identity, verify `accountName` is set and the runtime supports `DefaultAzureCredential`
- Check that the identity has the `Storage Blob Data Contributor` role on the storage account

### `StoreError: CloudOperationFailed` after retries

**Cause:** The operation failed after 3 retry attempts with exponential backoff (1s, 2s, 4s).

**Fix:**

- Check network connectivity to the cloud service
- Verify the bucket/container exists and the configured name matches exactly (names are case-sensitive)
- Verify the region in your config matches the bucket/container's actual region
- Check IAM permissions: S3 needs `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:HeadObject`, `s3:ListBucket`; Azure needs `Storage Blob Data Contributor`
- Check cloud service health dashboards ([AWS](https://health.aws.amazon.com/health/status), [Azure](https://status.azure.com/))
- Review the `originalError` field in the `StoreError.params` for the underlying cloud SDK error message

### Partial credential error (S3)

**Cause:** You provided `accessKeyId` without `secretAccessKey`.

**Fix:** Provide both credentials, or remove `accessKeyId` and set `useIamRole: true` instead.

### Blocks not visible across pools

**Cause:** This is expected behavior. Pool isolation means blocks stored in pool `A` are not visible from pool `B`.

**Fix:** Ensure you are querying the correct pool. Each pool uses a separate key prefix (`{poolId}/`). See [Storage Pools](/docs/walkthroughs/03-storage-pools) for details.

### High latency on first `getRandomBlocks` call

**Cause:** The first call triggers a full listing of the container/bucket to build the local checksum index.

**Fix:** This is expected for large stores. Subsequent calls use the cached index (TTL: 5 minutes). For stores with millions of blocks, consider pre-warming the index at application startup by calling `getRandomBlocks(1)` during initialization.

### Objects not appearing in cloud console immediately

**Cause:** S3 provides read-after-write consistency for new objects, but listing operations may have slight delays. Azure Blob Storage is strongly consistent.

**Fix:** Wait a few seconds and refresh. If objects still don't appear, verify the `keyPrefix` and `containerOrBucketName` match what you expect. Use the cloud CLI to list objects directly:

```bash
# S3
aws s3 ls s3://my-brightchain-blocks/default/ --recursive

# Azure
az storage blob list \
  --container-name brightchain-blocks \
  --account-name mybrightchainstorage \
  --prefix "default/" \
  --output table
```

### Container/bucket does not exist

**Cause:** The cloud store does not auto-create containers or buckets. They must exist before the store is used.

**Fix:** Create the container/bucket manually (see Step 3) or via infrastructure-as-code (Terraform, CloudFormation, Bicep).

For more detailed troubleshooting, see the [Troubleshooting & FAQ](/docs/walkthroughs/06-troubleshooting-faq) guide.

## Next Steps

- [Storage Pools](/docs/walkthroughs/03-storage-pools) — Create and manage storage pools for tenant isolation with your cloud store.
- [BrightDB Usage](/docs/walkthroughs/04-brightdb-usage) — Use the MongoDB-like document database API backed by cloud storage.
- [Building a dApp](/docs/walkthroughs/05-building-a-dapp) — Build a full-stack decentralized application on BrightStack.
- [Architecture Overview](/docs/walkthroughs/00-architecture-overview) — Review how cloud stores fit into the BrightChain architecture.
- [Cloud Block Store Drivers Design](/docs/architecture/cloud-block-store-drivers) — Deep-dive design document covering the full architecture, data models, correctness properties, and testing strategy.
- [Cloud Storage Providers Reference](/docs/storage/cloud-storage-providers) — Quick-reference for configuration interfaces, environment variables, and error types.
