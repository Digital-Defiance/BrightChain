# Storage Pools API Reference

This document covers the public API for BrightChain's pool-based storage system: interfaces, adapters, consistency controls, gossip announcements, reconciliation, and error handling.

> For architectural context see [Storage Pools Architecture](./Storage_Pools_Architecture.md).

---

## Table of Contents

1. [IPooledBlockStore](#ipooledblockstore)
2. [PooledStoreAdapter](#pooledstoreadapter)
3. [ReadConcern](#readconcern)
4. [Pool-Related Gossip](#pool-related-gossip)
5. [Pool-Scoped Reconciliation](#pool-scoped-reconciliation)
6. [Error Types](#error-types)

---

## IPooledBlockStore

`IPooledBlockStore` extends `IBlockStore` with pool-scoped operations. Pools are lightweight namespace prefixes on block IDs — no separate physical storage is required.

**Location:** `brightchain-lib/src/lib/interfaces/storage/pooledBlockStore.ts`

### Types

```typescript
/** 1–64 alphanumeric, underscore, or hyphen characters */
type PoolId = string; // must match /^[a-zA-Z0-9_-]{1,64}$/

interface PoolStats {
  poolId: PoolId;
  blockCount: number;
  totalBytes: number;
  createdAt: Date;
  lastAccessedAt: Date;
}
```

### Pool-Scoped Block Operations

#### `putInPool(pool, data, options?)`

Store block data in a specific pool.

```typescript
const hash: string = await store.putInPool('my-pool', blockData, {
  durability: 'fsync',
});
```

#### `getFromPool(pool, hash)`

Retrieve block data from a specific pool.

```typescript
const data: Uint8Array = await store.getFromPool('my-pool', hash);
```

#### `hasInPool(pool, hash)`

Check whether a block exists in a specific pool.

```typescript
if (await store.hasInPool('my-pool', hash)) {
  console.log('Block exists in pool');
}
```

#### `deleteFromPool(pool, hash)`

Remove a block from a specific pool.

```typescript
await store.deleteFromPool('my-pool', hash);
```

### Pool-Scoped CBL Whitening

#### `storeCBLWithWhiteningInPool(pool, cblData, options?)`

Store a CBL with XOR whitening scoped to a pool. Both XOR component blocks are stored within the specified pool namespace.

```typescript
import type { CBLStorageResult } from '@brightchain/brightchain-lib';

const result: CBLStorageResult = await store.storeCBLWithWhiteningInPool(
  'secure-pool',
  cblData,
  { encrypted: false },
);

console.log(result.blockId1); // first XOR component
console.log(result.blockId2); // second XOR component
console.log(result.magnetUrl); // magnet URL for reconstruction
```

#### `retrieveCBLFromPool(pool, blockId1, blockId2, block1ParityIds?, block2ParityIds?)`

Reconstruct a whitened CBL by retrieving both XOR components from a pool.

```typescript
const originalData: Uint8Array = await store.retrieveCBLFromPool(
  'secure-pool',
  result.blockId1,
  result.blockId2,
);
```

With FEC parity recovery:

```typescript
const data = await store.retrieveCBLFromPool(
  'secure-pool',
  blockId1,
  blockId2,
  ['parity1a', 'parity1b'], // block 1 parity IDs
  ['parity2a', 'parity2b'], // block 2 parity IDs
);
```

### Pool Management

#### `getPoolStats(pool)`

Get statistics for a pool.

```typescript
const stats: PoolStats = await store.getPoolStats('my-pool');
console.log(`${stats.blockCount} blocks, ${stats.totalBytes} bytes`);
```

#### `deletePool(pool)`

Delete an entire pool and all its blocks. Use `validatePoolDeletion()` first to check for cross-pool dependencies.

```typescript
const validation = await store.validatePoolDeletion('old-pool');
if (validation.safe) {
  await store.deletePool('old-pool');
} else {
  console.warn('Dependent pools:', validation.dependentPools);
}
```

#### `bootstrapPool(pool, blockSize, count)`

Seed a pool with cryptographically random blocks for whitening material.

```typescript
import { BlockSize } from '@brightchain/brightchain-lib';

await store.bootstrapPool('new-pool', BlockSize.Small, 100);
```

#### `getRandomBlocksFromPool(pool, count)`

Get random block checksums from a pool (used internally for whitening).

```typescript
import type { Checksum } from '@brightchain/brightchain-lib';

const randoms: Checksum[] = await store.getRandomBlocksFromPool('my-pool', 2);
```

#### `listPools()` / `listBlocksInPool(pool, options?)`

Enumerate pools and their contents.

```typescript
const pools: PoolId[] = await store.listPools();

for await (const hash of store.listBlocksInPool('my-pool', { limit: 50 })) {
  console.log(hash);
}
```

### Type Guard

```typescript
import { isPooledBlockStore } from '@brightchain/brightchain-lib';

if (isPooledBlockStore(store)) {
  // store is IPooledBlockStore — pool methods available
}
```

---

## PooledStoreAdapter

`PooledStoreAdapter` wraps an `IPooledBlockStore` and exposes the standard `IBlockStore` interface scoped to a single pool. This lets existing code (e.g. `Collection`, `BrightChainDb`) work unchanged while all operations route through the pool.

**Location:** `brightchain-db/src/lib/pooledStoreAdapter.ts`

### Constructor

```typescript
import { PooledStoreAdapter } from '@brightchain/brightchain-db';

const adapter = new PooledStoreAdapter(pooledStore, 'my-pool');
```

| Parameter | Type                | Description                       |
| --------- | ------------------- | --------------------------------- |
| `inner`   | `IPooledBlockStore` | The underlying pool-aware store   |
| `poolId`  | `PoolId`            | Pool all operations are scoped to |

### How It Works

Every `IBlockStore` method on the adapter delegates to the corresponding pool-scoped method on the inner store:

| Adapter method             | Delegates to                                   |
| -------------------------- | ---------------------------------------------- |
| `has(key)`                 | `inner.hasInPool(poolId, hash)`                |
| `put(key, data)`           | `inner.putInPool(poolId, data)`                |
| `delete(key)`              | `inner.deleteFromPool(poolId, hash)`           |
| `getData(key)`             | `inner.getFromPool(poolId, hash)`              |
| `getRandomBlocks(count)`   | `inner.getRandomBlocksFromPool(poolId, count)` |
| `storeCBLWithWhitening(…)` | `inner.storeCBLWithWhiteningInPool(poolId, …)` |
| `retrieveCBL(…)`           | `inner.retrieveCBLFromPool(poolId, …)`         |

Metadata, FEC, and replication operations delegate directly to the inner store without pool scoping.

### Usage with BrightChainDb

```typescript
import { BrightChainDb } from '@brightchain/brightchain-db';
import { PooledStoreAdapter } from '@brightchain/brightchain-db';

// Create a pool-scoped view of the store
const poolStore = new PooledStoreAdapter(pooledBlockStore, 'user-data');

// Pass it to BrightChainDb — the database sees a normal IBlockStore
const db = new BrightChainDb({ store: poolStore });
const users = db.collection('users');

// All blocks are transparently stored in the 'user-data' pool
await users.insert({ name: 'Alice', email: 'alice@example.com' });
```

### Multiple Pools

```typescript
const userStore = new PooledStoreAdapter(inner, 'user-data');
const auditStore = new PooledStoreAdapter(inner, 'audit-logs');

// Data in 'user-data' is invisible from 'audit-logs' and vice versa
await userStore.put(key, userData);
console.log(await auditStore.has(key)); // false
```

---

## ReadConcern

Controls how the system handles blocks that are not available locally during cross-node reads.

**Location:** `brightchain-lib/src/lib/enumerations/readConcern.ts`

```typescript
enum ReadConcern {
  /** Return only locally available blocks. Fail for remote/unknown blocks. */
  Local = 'local',

  /** Return local blocks immediately; attempt remote fetch but return
      a pending indicator on timeout. */
  Available = 'available',

  /** Block until the block is fetched from a remote node or timeout. */
  Consistent = 'consistent',
}
```

### When to Use Each Level

| Level        | Latency | Guarantee                 | Use case                                   |
| ------------ | ------- | ------------------------- | ------------------------------------------ |
| `Local`      | Lowest  | Only local data           | Hot-path reads, offline mode               |
| `Available`  | Low     | Best-effort remote fetch  | UI reads where stale data is acceptable    |
| `Consistent` | Higher  | Blocks until data arrives | Writes that depend on latest state, audits |

### Code Examples

Reading with `IReadConcernBlockStore`:

```typescript
import { ReadConcern } from '@brightchain/brightchain-lib';
import { isReadConcernBlockStore } from '@brightchain/brightchain-lib';

if (isReadConcernBlockStore(store)) {
  // Best-effort: returns immediately if local, tries remote otherwise
  const block = await store.getData(checksum, ReadConcern.Available);

  // Strong: waits for remote fetch if not local
  const latest = await store.getData(checksum, ReadConcern.Consistent);
}

// Default (no read concern) behaves like ReadConcern.Local
const localOnly = await store.getData(checksum);
```

---

## Pool-Related Gossip

The `IGossipService` propagates pool events across nodes via `BlockAnnouncement` messages.

**Location:** `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`

### Announcement Types

| Type               | Description                             | Required fields              |
| ------------------ | --------------------------------------- | ---------------------------- |
| `add`              | New block stored (optionally in a pool) | `blockId`, optional `poolId` |
| `remove`           | Block deleted                           | `blockId`, optional `poolId` |
| `pool_deleted`     | Entire pool deleted                     | `poolId`                     |
| `head_update`      | HeadRegistry pointer changed            | `blockId`, `headUpdate`      |
| `cbl_index_update` | New or updated CBL index entry          | `poolId`, `cblIndexEntry`    |
| `cbl_index_delete` | CBL index entry soft-deleted            | `poolId`, `cblIndexEntry`    |
| `acl_update`       | Approved ACL update for a pool          | `poolId`, `aclBlockId`       |

### BlockAnnouncement Structure

```typescript
interface BlockAnnouncement {
  type:
    | 'add'
    | 'remove'
    | 'ack'
    | 'pool_deleted'
    | 'cbl_index_update'
    | 'cbl_index_delete'
    | 'head_update'
    | 'acl_update';
  blockId: string;
  nodeId: string;
  timestamp: Date;
  ttl: number;
  poolId?: PoolId;
  cblIndexEntry?: ICBLIndexEntry;
  headUpdate?: HeadUpdateMetadata;
  aclBlockId?: string;
}
```

### Publishing Announcements

```typescript
const gossip: IGossipService = /* ... */;

// Announce a new block in a pool
await gossip.announceBlock(blockId, 'my-pool');

// Announce pool deletion
await gossip.announcePoolDeletion('old-pool');

// Announce a CBL index entry
await gossip.announceCBLIndexUpdate(cblIndexEntry);

// Announce a CBL index soft-delete
await gossip.announceCBLIndexDelete(deletedEntry);

// Announce a head pointer update
await gossip.announceHeadUpdate('mydb', 'users', newHeadBlockId);

// Announce an approved ACL update
await gossip.announceACLUpdate('secure-pool', aclBlockId);
```

### Subscribing to Announcements

```typescript
gossip.onAnnouncement((announcement: BlockAnnouncement) => {
  switch (announcement.type) {
    case 'cbl_index_update':
      // Merge the entry into local CBL index
      cblIndex.mergeEntry(announcement.cblIndexEntry!);
      break;
    case 'head_update':
      // Update local head registry
      const { dbName, collectionName } = announcement.headUpdate!;
      headRegistry.setHead(dbName, collectionName, announcement.blockId);
      break;
    case 'acl_update':
      // Load and apply the new ACL
      aclStore.loadACL(announcement.aclBlockId!);
      break;
  }
});
```

### Validation

Use `validateBlockAnnouncement()` to check structural validity before processing:

```typescript
import { validateBlockAnnouncement } from '@brightchain/brightchain-lib';

if (validateBlockAnnouncement(announcement)) {
  await gossip.handleAnnouncement(announcement);
}
```

---

## Pool-Scoped Reconciliation

After a network partition heals, the `IReconciliationService` synchronizes state between nodes on a per-pool basis.

**Location:** `brightchain-lib/src/lib/interfaces/availability/reconciliationService.ts`

### Reconciliation Flow

```
Node A                          Node B
  │                                │
  ├─── Exchange block manifests ──►│
  │◄── Exchange block manifests ───┤
  │                                │
  ├─── Exchange CBL index ────────►│  (magnet URL + sequence number)
  │◄── Exchange CBL index ─────────┤
  │                                │
  ├─── Identify missing blocks ───►│
  │◄── Fetch missing blocks ───────┤
  │                                │
  ├─── Merge CBL index entries ───►│
  │◄── Merge CBL index entries ────┤
  │                                │
  └─── Update sync vectors ────────┘
```

### CBL Index Manifests

During reconciliation, nodes exchange CBL index manifests per pool:

```typescript
interface CBLIndexManifestEntry {
  magnetUrl: string;
  sequenceNumber: number;
}

interface CBLIndexManifest {
  poolId: PoolId;
  nodeId: string;
  entries: CBLIndexManifestEntry[];
  generatedAt: Date;
}
```

### Running Reconciliation

```typescript
const reconciliation: IReconciliationService = /* ... */;

// Reconcile with reconnected peers
const result = await reconciliation.reconcile(['peer-1', 'peer-2']);

console.log(`Peers reconciled: ${result.peersReconciled}`);
console.log(`Blocks discovered: ${result.blocksDiscovered}`);
console.log(`CBL entries merged: ${result.cblIndexEntriesMerged}`);
console.log(`Conflicts resolved: ${result.conflictsResolved}`);

// Per-pool stats
if (result.poolStats) {
  for (const [poolId, stats] of result.poolStats) {
    console.log(`Pool ${poolId}: ${stats.blocksDiscovered} new blocks`);
  }
}

// Pools skipped due to deletion tombstones
if (result.skippedPools?.length) {
  console.log('Skipped deleted pools:', result.skippedPools);
}
```

### Sync Vectors

Track synchronization state per peer for delta sync:

```typescript
// Check last sync with a peer
const vector = reconciliation.getSyncVector('peer-1');
if (vector) {
  console.log(`Last synced: ${vector.lastSyncTimestamp}`);
}

// Persist sync state to disk for crash recovery
await reconciliation.persistSyncVectors();
```

### Pending Sync Queue

Local changes made during a partition are queued for later sync:

```typescript
// Queue a local store for later propagation
reconciliation.addToPendingSyncQueue({
  type: 'store',
  blockId: hash,
  timestamp: new Date(),
  data: blockData,
});

// Process the queue when connectivity is restored
await reconciliation.processPendingSyncQueue();
```

### Monitoring Reconciliation Events

```typescript
reconciliation.onEvent((event) => {
  switch (event.type) {
    case 'peer_reconciliation_completed':
      console.log(
        `Synced with ${event.peerId}: ${event.blocksDiscovered} blocks`,
      );
      break;
    case 'conflict_resolved':
      console.log(
        `Conflict on ${event.blockId} resolved in favor of ${event.winningNodeId}`,
      );
      break;
    case 'orphan_resolved':
      console.log(`Orphan ${event.blockId} found on ${event.sourceNodeId}`);
      break;
  }
});
```

---

## Error Types

All pool-related errors extend `Error` and include structured fields for programmatic handling.

### Block & Pool Errors

These are thrown by `IPooledBlockStore` and `PooledStoreAdapter` operations.

#### `PoolNotFoundError`

Thrown when an operation targets a pool that does not exist.

```typescript
try {
  await store.getFromPool('nonexistent', hash);
} catch (err) {
  if (err instanceof Error && err.message.includes('pool')) {
    // Handle missing pool
  }
}
```

#### `BlockNotFoundError`

Thrown when a block does not exist in the specified pool. The error message includes the pool ID and block ID.

```typescript
try {
  await store.retrieveCBLFromPool('my-pool', blockId1, blockId2);
} catch (err) {
  // Error message: includes pool ID and missing block IDs
  console.error(err.message);
}
```

#### `BlockValidationError`

Thrown by `CBLIndex.addEntry()` when referenced block IDs do not exist in the block store.

### ACL & Permission Errors

**Location:** `brightchain-api-lib/src/lib/auth/`

#### `PermissionDeniedError`

Thrown when a node lacks the required permission for a pool operation. Includes structured diagnostic fields.

```typescript
import { PermissionDeniedError } from '@brightchain/brightchain-api-lib';

try {
  await aclEnforcedStore.putInPool('secure-pool', data);
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    console.error(`Pool: ${err.poolId}`);
    console.error(`Node: ${err.nodeId}`);
    console.error(`Required: ${err.requiredPermission}`);
    console.error(`Actual: ${err.actualPermissions.join(', ')}`);
    // "Permission denied: write required for pool secure-pool,
    //  node abc123 has [read]"
  }
}
```

#### `LastAdminError`

Thrown when an ACL update would remove the last Admin member from a pool.

```typescript
import { LastAdminError } from '@brightchain/brightchain-api-lib';

try {
  await updater.applyUpdate(proposal);
} catch (err) {
  if (err instanceof LastAdminError) {
    // "Cannot remove the last Admin from the ACL"
  }
}
```

#### `InsufficientQuorumError`

Thrown when an ACL update does not have enough admin signatures. Exposes `required` and `actual` counts.

```typescript
import { InsufficientQuorumError } from '@brightchain/brightchain-api-lib';

try {
  await updater.applyUpdate(proposal);
} catch (err) {
  if (err instanceof InsufficientQuorumError) {
    console.error(`Need >${err.required} signatures, got ${err.actual}`);
  }
}
```

### Encryption Errors

**Location:** `brightchain-api-lib/src/lib/encryption/errors.ts`

#### `EncryptionError`

Thrown when an encryption operation fails. Wraps the underlying cause.

```typescript
import { EncryptionError } from '@brightchain/brightchain-api-lib';

try {
  await encryptionService.encrypt(data, keyVersion);
} catch (err) {
  if (err instanceof EncryptionError) {
    console.error(err.message);
    if (err.cause) console.error('Caused by:', err.cause);
  }
}
```

#### `DecryptionError`

Thrown when decryption fails (wrong key, corrupted data). Wraps the underlying cause.

```typescript
import { DecryptionError } from '@brightchain/brightchain-api-lib';

try {
  await encryptionService.decrypt(ciphertext, keyVersion);
} catch (err) {
  if (err instanceof DecryptionError) {
    console.error('Decryption failed:', err.message);
  }
}
```

#### `KeyVersionNotFoundError`

Thrown when a requested key version does not exist in the key history.

```typescript
import { KeyVersionNotFoundError } from '@brightchain/brightchain-api-lib';

try {
  await encryptionService.decrypt(data, 99);
} catch (err) {
  if (err instanceof KeyVersionNotFoundError) {
    // "Key version 99 not found in key history"
  }
}
```

#### `EncryptedFieldError`

Thrown when a query targets an encrypted (non-searchable) metadata field. Includes the field name and the pool's searchable fields for reference.

```typescript
import { EncryptedFieldError } from '@brightchain/brightchain-api-lib';

try {
  await cblIndex.query({ fileName: 'secret.pdf' }); // fileName is encrypted
} catch (err) {
  if (err instanceof EncryptedFieldError) {
    console.error(`"${err.fieldName}" is not searchable`);
    console.error(`Searchable fields: ${err.searchableFields.join(', ')}`);
  }
}
```

#### `ReplicationNotAllowedError`

Thrown when replication is attempted on a pool with `node-specific` encryption.

```typescript
import { ReplicationNotAllowedError } from '@brightchain/brightchain-api-lib';

try {
  await replicatePool('node-encrypted-pool');
} catch (err) {
  if (err instanceof ReplicationNotAllowedError) {
    console.error(`Pool ${err.poolId} uses node-specific encryption`);
  }
}
```

### Error Handling Best Practices

1. **Use `instanceof` checks** — all error types are proper classes, so `instanceof` works reliably.

2. **Read structured fields** — errors like `PermissionDeniedError` and `InsufficientQuorumError` expose typed fields (`poolId`, `requiredPermission`, `required`, `actual`) for programmatic handling.

3. **Check `cause` on encryption errors** — `EncryptionError` and `DecryptionError` wrap the underlying error in a `cause` field.

4. **Validate before operating** — use `validatePoolDeletion()` before `deletePool()`, and `validateBlockAnnouncement()` before processing gossip messages.

5. **Handle partition-mode errors** — `PartitionModeError` (from `AvailabilityAwareBlockStore`) indicates the node is in partition mode and cannot reach peers. Queue operations via the pending sync queue for later reconciliation.

```typescript
try {
  await store.getFromPool('my-pool', hash);
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    // ACL issue — check node permissions
  } else if (err instanceof EncryptedFieldError) {
    // Query on encrypted field — adjust query
  } else if (err instanceof ReplicationNotAllowedError) {
    // Cannot replicate node-specific encrypted pool
  } else {
    // Generic block store error
    throw err;
  }
}
```
