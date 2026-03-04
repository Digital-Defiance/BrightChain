---
title: "Storage Pools"
parent: "Walkthroughs"
nav_order: 4
permalink: /docs/walkthroughs/03-storage-pools/
# Storage Pools

| Field          | Value                                                                          |
|----------------|--------------------------------------------------------------------------------|
| Prerequisites  | [Node Setup](/docs/walkthroughs/02-node-setup) completed, running BrightChain node          |
| Estimated Time | 30 minutes                                                                     |
| Difficulty     | Intermediate                                                                   |

## Introduction

Storage Pools provide lightweight namespace isolation within BrightChain's block store. Instead of running separate storage systems for different applications or tenants, pools let you logically partition blocks under a shared infrastructure. Each pool prefixes its block IDs with a pool identifier, creating composite keys like `poolId:hash` that keep data cleanly separated.

This guide covers creating and managing pools, choosing an encryption mode, connecting to encrypted pools across nodes, understanding pool-scoped whitening, coordinating pools across a multi-node network, and selecting the right read concern level for your workload.

## Prerequisites

- Completed the [Node Setup](/docs/walkthroughs/02-node-setup) guide (running BrightChain node)
- Completed the [Quickstart](/docs/walkthroughs/01-quickstart) guide (repository cloned, dependencies installed)
- Familiarity with the [Architecture Overview](/docs/walkthroughs/00-architecture-overview), especially the Foundation layer and TUPLE storage model
- Node.js 20+ and Yarn installed

## Steps

### Step 1: Understand the Pool Namespace Concept

Pools are implemented as namespace prefixes on block IDs. Every block stored in a pool gets a composite key:

```
Unpooled:  <hash>
Pooled:    <poolId>:<hash>
```

For example, a block with hash `a1b2c3...` stored in pool `app_orders` has the storage key `app_orders:a1b2c3...`.

This design provides several benefits:

- **Logical isolation** — blocks from different applications or tenants never collide
- **Independent lifecycle management** — you can delete, back up, or apply quotas to an entire pool without affecting others
- **Pool-level queries** — list or iterate all blocks belonging to a specific pool
- **Minimal overhead** — pools are just string prefixes, not separate storage engines

Unpooled blocks (from legacy code or the default path) use an implicit `"default"` pool, so existing deployments continue to work without changes.

### Step 2: Create a New Storage Pool

A Pool ID must match the pattern `/^[a-zA-Z0-9_-]{1,64}$/` — alphanumeric characters, underscores, and hyphens, up to 64 characters. The ID `"default"` is reserved for unpooled blocks.

#### Define a Pool ID

Choose a descriptive, scoped name for your pool:

```typescript
import { PooledStoreAdapter, BrightDb, InMemoryDatabase } from '@brightchain/db';
import type { PoolId } from '@brightchain/brightchain-lib';

// Pool IDs follow a convention of category:name
const poolId: PoolId = 'app_inventory';
```

#### Create a PooledStoreAdapter

The `PooledStoreAdapter` wraps an `IPooledBlockStore` and fixes all operations to a specific pool. Collections using this adapter read and write only within that pool's namespace:

```typescript
import { PooledStoreAdapter, BrightDb } from '@brightchain/db';

// Assume `pooledBlockStore` implements IPooledBlockStore
const adapter = new PooledStoreAdapter(pooledBlockStore, 'app_inventory');

// Create a BrightDb instance scoped to this pool
const db = new BrightDb(adapter);
await db.connect();

const products = db.collection('products');
await products.insertOne({ sku: 'BRK-100', name: 'Widget', qty: 50 });

// This document is stored under the key app_inventory:<hash>
const widget = await products.findOne({ sku: 'BRK-100' });
console.log(widget);
// { _id: '...', sku: 'BRK-100', name: 'Widget', qty: 50 }
```

The adapter transparently routes every `has()`, `get()`, `put()`, and `delete()` call through the pool-scoped methods on the inner store. Collections don't need to know they're operating inside a pool.

#### Pool Management Operations

The underlying `IPooledBlockStore` provides pool-level operations:

```typescript
// List all pools on this node
const pools = await pooledBlockStore.listPools();
// ['default', 'app_inventory', 'app_orders']

// Get statistics for a pool
const stats = await pooledBlockStore.getPoolStats('app_inventory');
// { poolId: 'app_inventory', blockCount: 142, totalBytes: 583680, ... }

// Delete an entire pool and all its blocks
await pooledBlockStore.deletePool('app_inventory');
```

### Step 3: Choose an Encryption Mode

Every pool is configured with one of three encryption modes. The mode is set at pool creation time and determines how block data is protected at rest.

#### None

```typescript
import { EncryptionMode } from '@brightchain/brightchain-lib';

const poolConfig = {
  encryptionMode: EncryptionMode.None,
};
```

Blocks are stored in plaintext. Use this mode for:
- Development and testing environments
- Public data that doesn't require confidentiality
- Pools where content-based deduplication across nodes is important
- Maximum read/write performance (no encryption overhead)

Content indexing and full-text search work without restrictions in this mode.

#### NodeSpecific

```typescript
const poolConfig = {
  encryptionMode: EncryptionMode.NodeSpecific,
  searchableMetadataFields: ['blockSize', 'createdAt'],
};
```

Each block is encrypted with the storing node's ECDSA key pair using ECIES (Elliptic Curve Integrated Encryption Scheme). Only the node that wrote the block can decrypt it. Use this mode for:
- Sensitive data that should never leave the originating node
- Local caches or session data
- Scenarios where replication to other nodes is not needed

Important constraints:
- **Replication is not allowed** — since only the originating node holds the decryption key, blocks cannot be meaningfully replicated
- Only fields listed in `searchableMetadataFields` remain unencrypted for querying
- Parity blocks are also encrypted with the node's key

#### PoolShared

```typescript
const poolConfig = {
  encryptionMode: EncryptionMode.PoolShared,
  searchableMetadataFields: ['blockSize', 'createdAt'],
};
```

Blocks are encrypted with a symmetric AES-256-GCM key shared among all pool members. The shared key is distributed to each member by encrypting it with their ECDSA public key (ECIES wrapping). Use this mode for:
- Multi-tenant applications where all authorized nodes need access
- Cross-node replication of encrypted data
- Production deployments requiring encryption at rest with shared access

Key management features:
- **Key rotation** — the pool maintains a version history of keys so older blocks remain decryptable after rotation
- **Per-member key distribution** — when a new member joins, the pool key is encrypted specifically for their public key
- **Quorum approval** — ACL changes require signatures from a majority of admin members

### Step 4: Connect to an Encrypted Pool on Another Node

Joining an existing encrypted pool on a remote node involves ECDSA authentication and ACL-based authorization.

#### Authenticate with ECDSA

Every BrightChain node has an ECDSA key pair (secp256k1) derived from its BIP39/32 identity. When connecting to a remote pool, the requesting node signs a challenge to prove its identity:

```typescript
// On the requesting node:
// 1. Generate a challenge response signed with your node's private key
const challenge = await remoteNode.requestPoolChallenge('app_inventory');
const signature = await localNode.sign(challenge.nonce);

// 2. Send the signed challenge back to the remote node
const authResult = await remoteNode.authenticateForPool(
  'app_inventory',
  localNode.nodeId,
  signature,
);
// authResult.authenticated === true if the signature is valid
```

#### ACL Permissions

Pool access is governed by an Access Control List (ACL). Each member entry specifies which operations the node is allowed to perform:

| Permission    | Description                                                        |
|---------------|--------------------------------------------------------------------|
| **Read**      | Query and retrieve blocks from the pool                            |
| **Write**     | Store new blocks and update existing ones in the pool              |
| **Replicate** | Receive replicated blocks and participate in pool replication      |
| **Admin**     | Modify the ACL, add/remove members, rotate keys, manage the pool  |

Admin permission implies all other permissions. Pools can also set `publicRead` or `publicWrite` flags to grant access to non-members.

#### Add a New Member to the Pool

An existing Admin member adds the requesting node to the ACL:

```typescript
import { PoolPermission } from '@brightchain/brightchain-lib';

// On the admin node — add the new member with specific permissions
const updatedAcl = {
  ...currentAcl,
  members: [
    ...currentAcl.members,
    {
      nodeId: requestingNodeId,
      permissions: [PoolPermission.Read, PoolPermission.Write, PoolPermission.Replicate],
      addedAt: new Date(),
      addedBy: adminNodeId,
    },
  ],
  version: currentAcl.version + 1,
  updatedAt: new Date(),
};

// Multi-admin pools require quorum approval (>50% of admins must sign)
```

#### Receive the Pool Key

For PoolShared encryption, the admin distributes the symmetric pool key to the new member by encrypting it with the member's ECDSA public key:

```typescript
// The admin encrypts the pool key for the new member using ECIES
const encryptedPoolKey = await encryptionService.encryptKeyForMember(
  poolKey,
  newMemberPublicKey,
);

// The new member decrypts the pool key with their private key
const poolKey = await encryptionService.decryptKeyAsMember(
  encryptedPoolKey,
  myPrivateKey,
);
```

Once authenticated and authorized, the new node can read, write, and replicate blocks within the pool according to its ACL permissions.

### Step 5: Understand Pool-Scoped Whitening

BrightChain uses the TUPLE storage model — every piece of data is stored as three XOR'd blocks (data + 2 randomizers). This process is called "whitening" because it makes each individual block statistically indistinguishable from random noise, providing plausible deniability.

#### Why XOR Components Stay Within the Same Pool

Whitening is scoped to the pool level. When a document is whitened, all three TUPLE components (the data block and its two randomizer blocks) are stored in the same pool. This is enforced by the `PooledStoreAdapter`, which routes the `storeCBLWithWhitening` call through the pool:

```typescript
// Inside PooledStoreAdapter — whitening is automatically pool-scoped
public async storeCBLWithWhitening(
  cblData: Uint8Array,
  options?: CBLWhiteningOptions,
): Promise<CBLStorageResult> {
  // Delegates to the inner store's pool-scoped whitening method
  return this.inner.storeCBLWithWhiteningInPool(
    this.poolId,  // all components land in this pool
    cblData,
    options,
  );
}
```

Pool-scoped whitening matters for several reasons:

- **Isolation guarantee** — deleting a pool removes all three TUPLE components, leaving no orphaned randomizer blocks in other pools
- **Consistent encryption** — in encrypted pools, all three blocks are encrypted with the same key, so reconstruction only requires access to one pool's key
- **Quota accuracy** — pool storage statistics account for the full cost of each document (data + randomizers)
- **Replication coherence** — when a pool is replicated to another node, all components travel together

### Step 6: Coordinate Pools Across Nodes

In a multi-node BrightChain network, pools can span multiple nodes. Three services work together to keep pools synchronized: gossip propagates block announcements, reconciliation detects and fills gaps, and discovery locates which nodes host a given pool.

```typescript
import { PooledStoreAdapter, BrightDb } from '@brightchain/db';
import type {
  PoolId,
  IGossipService,
  IReconciliationService,
} from '@brightchain/brightchain-lib';

// --- Node A: Create a pool and write data ---

const poolId: PoolId = 'shared_catalog';
const adapterA = new PooledStoreAdapter(nodeA.pooledBlockStore, poolId);
const dbA = new BrightDb(adapterA);
await dbA.connect();

const catalog = dbA.collection('items');
await catalog.insertOne({ sku: 'W-200', name: 'Gadget', price: 29.99 });

// --- Gossip: Node A announces the new block to peers ---
// The GossipService batches block announcements and fans them out.
// Pool hints let receiving nodes prioritize blocks they care about.

const gossipService: IGossipService = nodeA.gossipService;
// Announcements happen automatically when autoAnnounce is enabled.
// Peers subscribed to 'shared_catalog' will eagerly fetch the block.

// --- Discovery: Node B finds which nodes host 'shared_catalog' ---
// PoolDiscoveryService queries the network for nodes that advertise
// a given pool, using Bloom filters for efficient pre-filtering.

const discoveryService = nodeB.poolDiscoveryService;
const discoveryResult = await discoveryService.discoverPool(poolId);
// discoveryResult.peers → ['nodeA-id', 'nodeC-id', ...]

// --- Reconciliation: Node B syncs missing blocks ---
// ReconciliationService compares sync vectors with each peer
// and fetches any blocks that Node B is missing.

const reconciliationService: IReconciliationService = nodeB.reconciliationService;
await reconciliationService.reconcileWithPeer(nodeAId, {
  poolId,
  fullSync: false, // incremental — only fetch new blocks since last sync
});

// --- Node B can now query the same data ---
const adapterB = new PooledStoreAdapter(nodeB.pooledBlockStore, poolId);
const dbB = new BrightDb(adapterB);
await dbB.connect();

const gadget = await dbB.collection('items').findOne({ sku: 'W-200' });
console.log(gadget);
// { _id: '...', sku: 'W-200', name: 'Gadget', price: 29.99 }
```

The three coordination mechanisms serve different purposes:

| Mechanism         | Purpose                                          | Trigger                        |
|-------------------|--------------------------------------------------|--------------------------------|
| **Gossip**        | Real-time block announcements to connected peers | Automatic on write             |
| **Reconciliation**| Detect and fill gaps after partitions or restarts | Periodic or on-demand          |
| **Discovery**     | Find which nodes host a specific pool             | On first access or cache miss  |

### Step 7: Choose a Read Concern Level

When reading blocks that may exist on remote nodes, you can control the trade-off between latency and data freshness using read concern levels.

#### Local

```typescript
import { ReadConcern } from '@brightchain/brightchain-lib';

const block = await store.getData(checksum, ReadConcern.Local);
```

Returns only blocks that are already available on the local node. If the block is remote or unknown, the call throws immediately.

Use Local when:
- You need the lowest possible latency
- You know the data was recently written to this node
- You're building a cache-first read path

#### Available

```typescript
const block = await store.getData(checksum, ReadConcern.Available);
```

Returns local blocks immediately. If the block is not local, attempts a remote fetch but returns a pending indicator on timeout rather than blocking indefinitely.

Use Available when:
- You want best-effort reads without long waits
- Your application can handle "not yet available" responses gracefully
- You're building a UI that shows loading states for remote data

#### Consistent

```typescript
const block = await store.getData(checksum, ReadConcern.Consistent);
```

Blocks the call until the data is fetched from a remote node or a timeout is reached. This provides the strongest guarantee that you'll get the data if it exists anywhere in the network.

Use Consistent when:
- You need to guarantee the read returns the latest data
- You're performing a transaction that depends on reading a specific block
- Latency is acceptable in exchange for correctness

#### Summary

| Read Concern   | Behavior on Remote Block          | Latency  | Use Case                        |
|----------------|-----------------------------------|----------|---------------------------------|
| **Local**      | Throws immediately                | Lowest   | Cache-first, local-only reads   |
| **Available**  | Attempts fetch, returns pending   | Low–Med  | Best-effort, UI-friendly reads  |
| **Consistent** | Blocks until fetched or timeout   | Higher   | Transactions, strong reads      |

## Troubleshooting

### Pool creation fails with invalid PoolId

- Verify the ID matches `/^[a-zA-Z0-9_-]{1,64}$/` — no spaces, dots, or colons allowed
- The ID `"default"` is reserved and cannot be used for explicit pools
- Pool IDs are case-sensitive: `App_Orders` and `app_orders` are different pools

### Cannot decrypt blocks in a PoolShared pool

- Confirm your node is listed in the pool's ACL with at least Read permission
- Verify you received the correct key version — after key rotation, older blocks require the key version they were encrypted with
- Check that the key was encrypted for your node's current public key (keys change if you regenerate your node identity)

### Replication fails for NodeSpecific pools

- This is expected behavior. NodeSpecific encryption means only the originating node can decrypt the data, so replication is intentionally blocked
- If you need cross-node access, switch to PoolShared encryption mode

### Blocks missing after network partition

- Run reconciliation against peers that were available during the partition: the ReconciliationService compares sync vectors and fetches missing blocks
- Check the pool's discovery results to confirm which nodes host the pool
- Use `ReadConcern.Consistent` for reads that must reflect the latest state

### Pool quota exceeded

- Check pool statistics: `pooledBlockStore.getPoolStats(poolId)` shows current usage
- Remember that whitened documents consume 3× the raw document size (data + 2 randomizers)
- Delete unused documents or increase the pool quota

For more detailed troubleshooting, see the [Troubleshooting & FAQ](/docs/walkthroughs/06-troubleshooting-faq) guide.

## Next Steps

- [BrightDB Usage](/docs/walkthroughs/04-brightdb-usage) — Learn the full query, indexing, transaction, and aggregation API.
- [Building a dApp](/docs/walkthroughs/05-building-a-dapp) — Build a full-stack decentralized application using pools for data isolation.
- [Architecture Overview](/docs/walkthroughs/00-architecture-overview) — Review the TUPLE storage model and how pools fit into the broader system.
