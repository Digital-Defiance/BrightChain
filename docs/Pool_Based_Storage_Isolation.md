# Pool-Based Storage Isolation Specification

## Overview

This specification defines a pool-based isolation system for BrightChain's block store to support database-like applications that require namespace isolation. Pools provide logical grouping and isolation of blocks without requiring separate physical storage or complex routing changes.

## Motivation

BrightChain is being extended with a MongoDB-like database layer built on top of the block store. Without isolation, blocks from different databases could collide or intermingle, making it impossible to:
- Independently manage database lifecycles (create, delete, backup)
- Apply per-database policies (quotas, retention, replication)
- Query or list blocks belonging to a specific database
- Ensure data isolation between tenants or applications

## Design Principles

1. **Minimal Complexity**: Pools are namespace prefixes, not separate storage systems
2. **Backward Compatible**: Unpooled blocks continue to work (implicit "default" pool)
3. **Gossip Transparent**: Blocks still gossip by content hash; pool is optional metadata
4. **Discovery Optimized**: Pool hints enable efficient batch prefetching
5. **Storage Efficient**: No duplication of block data across pools

## Architecture

### Core Concept: Pool as Namespace Prefix

Pools are implemented as **namespace prefixes** on block IDs:
```
Unpooled:  <hash>
Pooled:    <pool>:<hash>
```

This approach:
- Requires minimal code changes to existing block store
- Provides natural namespace isolation
- Enables pool-level operations (list, delete, quota)
- Maintains content-addressability within each pool

### Pool Identifier Format

```typescript
type PoolId = string;  // Format: alphanumeric + underscore, max 64 chars

// Examples:
// "db:users"
// "db:orders"
// "messaging"
// "vault:alice"
// "temp:session_abc123"
```

**Validation Rules**:
- Must match: `/^[a-zA-Z0-9_-]{1,64}$/`
- Reserved pool: `"default"` (for unpooled blocks)
- Case-sensitive

## Implementation

### Phase 1: Core Pool Support (MVP)

#### 1.1 Pool-Aware Block Store Interface

Extend `IBlockStore` with pool-aware methods:

```typescript
interface IPooledBlockStore extends IBlockStore {
  // Pool-scoped operations
  hasInPool(pool: PoolId, hash: string): Promise<boolean>;
  getFromPool(pool: PoolId, hash: string): Promise<RawDataBlock>;
  putInPool(pool: PoolId, data: Uint8Array, options?: BlockStoreOptions): Promise<string>;
  deleteFromPool(pool: PoolId, hash: string): Promise<void>;
  
  // Pool management
  listPools(): Promise<PoolId[]>;
  listBlocksInPool(pool: PoolId, options?: ListOptions): AsyncIterable<string>;
  getPoolStats(pool: PoolId): Promise<PoolStats>;
  deletePool(pool: PoolId): Promise<void>;
}

interface ListOptions {
  limit?: number;
  cursor?: string;
}

interface PoolStats {
  poolId: PoolId;
  blockCount: number;
  totalBytes: number;
  createdAt: Date;
  lastAccessedAt: Date;
}
```

#### 1.2 Storage Key Format

Internal storage keys use pool prefix:

```typescript
class PooledMemoryBlockStore implements IPooledBlockStore {
  private blocks = new Map<string, RawDataBlock>();
  
  private makeKey(pool: PoolId, hash: string): string {
    return `${pool}:${hash}`;
  }
  
  async putInPool(pool: PoolId, data: Uint8Array): Promise<string> {
    const block = new RawDataBlock(this.blockSize, data);
    const hash = block.idChecksum.toHex();
    const key = this.makeKey(pool, hash);
    
    this.blocks.set(key, block);
    return hash;  // Return hash without pool prefix
  }
  
  async getFromPool(pool: PoolId, hash: string): Promise<RawDataBlock> {
    const key = this.makeKey(pool, hash);
    const block = this.blocks.get(key);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, { pool, hash });
    }
    return block;
  }
}
```

#### 1.3 Metadata Extension

Extend `IBlockMetadata` to track pool membership:

```typescript
interface IBlockMetadata {
  // ... existing fields ...
  poolId?: PoolId;  // Optional pool identifier
}
```

#### 1.4 Backward Compatibility

Unpooled blocks use implicit "default" pool:

```typescript
// Legacy methods delegate to default pool
async has(hash: string): Promise<boolean> {
  return this.hasInPool('default', hash);
}

async getData(hash: Checksum): Promise<RawDataBlock> {
  return this.getFromPool('default', hash.toHex());
}
```

### Phase 2: Gossip Integration (Optimization)

#### 2.1 Pool Hints in Block Announcements

Extend `BlockAnnouncement` with optional pool hint:

```typescript
interface BlockAnnouncement {
  // ... existing fields ...
  poolHint?: PoolId;  // Optional pool context for prefetching
}
```

**Key Points**:
- Pool hint is **optional metadata** for optimization
- Blocks still gossip by content hash (no pool-specific routing)
- Receiving nodes can ignore pool hints (backward compatible)
- Pool hints enable intelligent prefetching of related blocks

#### 2.2 Pool-Aware Prefetching

When a node receives a block announcement with a pool hint, it can proactively fetch related blocks:

```typescript
class PoolAwareGossip extends GossipService {
  async handleAnnouncement(announcement: BlockAnnouncement): Promise<void> {
    await super.handleAnnouncement(announcement);
    
    // If pool hint present and we're interested in this pool
    if (announcement.poolHint && this.isPoolSubscribed(announcement.poolHint)) {
      // Prefetch related blocks in the same pool
      await this.prefetchPoolBlocks(announcement.poolHint, announcement.blockId);
    }
  }
  
  private async prefetchPoolBlocks(pool: PoolId, rootHash: string): Promise<void> {
    // Discover related blocks (e.g., CBL components, transaction blocks)
    const relatedHashes = await this.discoverRelatedBlocks(pool, rootHash);
    
    // Batch fetch for efficiency
    await this.fetchBatch(relatedHashes.map(hash => ({ pool, hash })));
  }
}
```

#### 2.3 Pool Subscriptions

Nodes can subscribe to pools for eager replication:

```typescript
interface PoolSubscription {
  poolId: PoolId;
  priority: 'hot' | 'warm' | 'cold';
}

class PoolAwareGossip {
  private subscriptions = new Map<PoolId, PoolSubscription>();
  
  subscribe(pool: PoolId, priority: 'hot' | 'warm' | 'cold'): void {
    this.subscriptions.set(pool, { poolId: pool, priority });
  }
  
  unsubscribe(pool: PoolId): void {
    this.subscriptions.delete(pool);
  }
  
  private isPoolSubscribed(pool: PoolId): boolean {
    return this.subscriptions.has(pool);
  }
}
```

**Priority Levels**:
- **Hot**: Eagerly replicate all blocks, prefetch aggressively
- **Warm**: Replicate on-demand, moderate prefetching
- **Cold**: Minimal replication, no prefetching

### Phase 3: Discovery Protocol Extension (Advanced)

#### 3.1 Pool-Aware Discovery

Extend discovery protocol to filter by pool:

```typescript
interface IPooledDiscoveryProtocol extends IDiscoveryProtocol {
  discoverBlockInPool(pool: PoolId, hash: string): Promise<DiscoveryResult>;
  findNodesWithPool(pool: PoolId): Promise<string[]>;
}
```

#### 3.2 Pool Bloom Filters

Nodes advertise per-pool Bloom filters:

```typescript
interface PoolBloomFilter {
  poolId: PoolId;
  filter: BloomFilter;
  blockCount: number;
  lastUpdated: Date;
}

class PoolAwareDiscovery implements IPooledDiscoveryProtocol {
  private poolFilters = new Map<string, Map<PoolId, PoolBloomFilter>>();
  
  async getPeerPoolFilter(peerId: string, pool: PoolId): Promise<BloomFilter> {
    // Request pool-specific Bloom filter from peer
    const response = await this.networkProvider.requestPoolBloomFilter(peerId, pool);
    return response.filter;
  }
  
  async discoverBlockInPool(pool: PoolId, hash: string): Promise<DiscoveryResult> {
    const peers = this.networkProvider.getConnectedPeerIds();
    const candidates: string[] = [];
    
    // Pre-filter peers using pool Bloom filters
    for (const peerId of peers) {
      const filter = await this.getPeerPoolFilter(peerId, pool);
      if (filter.mightContain(hash)) {
        candidates.push(peerId);
      }
    }
    
    // Query only candidate peers
    return this.queryPeers(candidates, pool, hash);
  }
}
```

## Use Cases

### Database Layer

```typescript
// Create isolated databases
const usersDB = new BrightChainDB('db:users', blockStore);
const ordersDB = new BrightChainDB('db:orders', blockStore);

// Store documents in separate pools
await usersDB.insert({ name: 'Alice', email: 'alice@example.com' });
await ordersDB.insert({ userId: 'alice', total: 99.99 });

// Delete entire database
await blockStore.deletePool('db:users');
```

### Temporary Storage

```typescript
// Create temporary pool for session data
const sessionPool = `temp:session_${sessionId}`;
await blockStore.putInPool(sessionPool, sessionData);

// Auto-expire after TTL
setTimeout(() => blockStore.deletePool(sessionPool), SESSION_TTL);
```

### Multi-Tenant Isolation

```typescript
// Isolate tenant data
const tenant1Pool = `tenant:${tenant1Id}`;
const tenant2Pool = `tenant:${tenant2Id}`;

// Apply per-tenant quotas
await blockStore.setPoolQuota(tenant1Pool, 10 * GB);
await blockStore.setPoolQuota(tenant2Pool, 50 * GB);
```

## Performance Characteristics

### Storage Overhead

- **Key Size**: +1-65 bytes per block (pool prefix + colon)
- **Memory**: Negligible (pool IDs are interned strings)
- **Deduplication**: Intentionally disabled across pools (isolation benefit)

### Gossip Impact

- **Announcement Size**: +0-65 bytes (optional pool hint)
- **Routing**: No change (blocks still gossip by hash)
- **Prefetching**: Reduces round-trips for related blocks

### Discovery Impact

- **Bloom Filter Size**: Linear with number of pools
- **Query Efficiency**: Improved (pre-filter by pool)
- **Cache Hit Rate**: Improved (pool-scoped caching)

## Migration Strategy

### Existing Deployments

1. **Phase 1**: Deploy pool-aware block store with backward compatibility
2. **Phase 2**: Migrate existing blocks to "default" pool (optional)
3. **Phase 3**: Enable pool hints in gossip (opt-in)
4. **Phase 4**: Deploy pool-aware discovery (opt-in)

### Code Migration

```typescript
// Before (unpooled)
await blockStore.put(hash, data);
const block = await blockStore.getData(hash);

// After (pooled, backward compatible)
await blockStore.put(hash, data);  // Still works (uses "default" pool)
const block = await blockStore.getData(hash);

// After (explicit pool)
await blockStore.putInPool('db:users', data);
const block = await blockStore.getFromPool('db:users', hash);
```

## Security Considerations

### Access Control

Pools do not provide access control—they are namespace isolation only. Access control must be implemented at a higher layer:

```typescript
class SecurePooledBlockStore {
  constructor(
    private store: IPooledBlockStore,
    private acl: AccessControlList
  ) {}
  
  async putInPool(pool: PoolId, data: Uint8Array, userId: string): Promise<string> {
    if (!this.acl.canWrite(userId, pool)) {
      throw new Error('Access denied');
    }
    return this.store.putInPool(pool, data);
  }
}
```

### Pool Enumeration

Listing pools may reveal information about system structure. Consider:
- Restricting pool listing to authorized users
- Using opaque pool IDs (UUIDs) instead of descriptive names
- Encrypting pool metadata

## Testing Strategy

### Unit Tests

- Pool key formatting and parsing
- Pool-scoped CRUD operations
- Pool listing and statistics
- Backward compatibility with unpooled blocks

### Integration Tests

- Multi-pool isolation (no cross-pool access)
- Pool deletion (cascading block deletion)
- Gossip with pool hints
- Discovery with pool filters

### Property Tests

- Pool ID validation
- Key uniqueness across pools
- Quota enforcement
- Concurrent pool operations

## Future Enhancements

### Pool Hierarchies

Support nested pools for organizational structure:

```
tenant:acme
├── tenant:acme:db:users
├── tenant:acme:db:orders
└── tenant:acme:temp:sessions
```

### Pool Replication Policies

Per-pool replication settings:

```typescript
await blockStore.setPoolReplicationFactor('db:critical', 5);
await blockStore.setPoolReplicationFactor('temp:cache', 1);
```

### Pool Snapshots

Atomic snapshots of entire pools:

```typescript
const snapshot = await blockStore.snapshotPool('db:users');
await blockStore.restorePoolSnapshot(snapshot);
```

## References

- [BrightChain Summary](./BrightChain%20Summary.md)
- [Gossip Delivery Protocol](./Gossip_Delivery_Protocol.md)
- [TUPLE Storage Architecture](./TUPLE_Storage_Architecture.md)
- [Owner-Free Filesystem](./OFF_System_Comparison_Analysis.md)
