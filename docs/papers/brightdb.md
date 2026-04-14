---
title: "BrightDB: MongoDB-Compatible Document Database"
parent: "Papers"
nav_order: 7
---

# BrightDB: A MongoDB-Compatible Document Database over Content-Addressable Block Storage

**Authors:** Digital Defiance  
**Version:** 0.29.24  
**Date:** 2026  
**License:** MIT  

---

## Abstract

This paper presents BrightDB, a document-oriented database engine that provides a MongoDB-compatible query interface over BrightChain's content-addressable, owner-free block storage system. BrightDB bridges the gap between familiar document database semantics and decentralized, privacy-preserving storage by implementing collections, CRUD operations, rich query operators, secondary indexes, ACID-like transactions, an aggregation pipeline, schema validation, change streams, cursor-based pagination, write access control lists, and a content-addressable block list (CBL) index with forward error correction. Documents are serialized to JSON, stored as blocks in the BrightChain block store, and tracked through an in-memory index backed by a persistent head registry with file-level locking and last-writer-wins conflict resolution. The system supports pool-scoped storage through a transparent adapter layer, enabling multi-tenant isolation without modifying the collection API. We describe the storage architecture, query engine, transaction model, indexing strategy, write authorization framework, and the CBL index with its recovery and versioning capabilities.

**Keywords:** document database, MongoDB compatibility, content-addressable storage, block store, ACID transactions, aggregation pipeline, write access control, forward error correction, owner-free file system

---

## I. Introduction

Document-oriented databases have become a dominant paradigm for application data storage, with MongoDB establishing a de facto standard API for CRUD operations, query operators, aggregation pipelines, and index management [1]. However, traditional document databases store data in centralized, mutable file systems where a single operator controls all data. This model conflicts with the goals of decentralized systems that seek to distribute storage, eliminate single points of failure, and provide plausible deniability through owner-free architectures.

BrightChain [2] implements an Owner-Free File System (OFFS) where all data is stored as content-addressable blocks, optionally XOR-whitened with random blocks to create TUPLE storage (data + 2 randomizers). In this model, no single party possesses meaningful data, and blocks are identified by their SHA3-512 checksums rather than mutable file paths. While this architecture provides strong privacy and distribution properties, it presents a challenge for structured data access: applications need to query, update, and index documents, not raw blocks.

BrightDB addresses this challenge by implementing a MongoDB-compatible document database driver that operates entirely over BrightChain's block store interface (`IBlockStore`). The key contributions are:

1. A complete MongoDB-compatible API including collections, CRUD, query operators, projections, sorting, aggregation, and cursors, all backed by content-addressable blocks.
2. A persistent head registry with file-level locking and timestamp-based conflict resolution for tracking the latest state of each collection.
3. An in-memory index architecture with B-tree-like structures that are rebuilt from stored metadata blocks on startup.
4. An optimistic concurrency transaction engine with journal-based writes and automatic rollback.
5. A write access control framework with capability tokens, cryptographic proof verification, and pool-scoped encryption.
6. A CBL index with forward error correction, automatic snapshots, multi-strategy recovery, version history, and cross-pool dependency tracking.

---

## II. Related Work

MongoDB [1] is the most widely deployed document database, providing a rich query language, secondary indexes, replica sets, and sharded clusters. However, MongoDB operates on a centralized storage model with mutable documents identified by ObjectIds in BSON format.

CouchDB [3] pioneered the concept of a document database with content-addressable revisions and multi-version concurrency control (MVCC). Its append-only B-tree storage and revision-based conflict resolution share philosophical similarities with BrightDB's approach, though CouchDB does not operate over a block store or provide owner-free storage.

OrbitDB [4] provides a peer-to-peer database over IPFS, using CRDTs for conflict resolution. While OrbitDB shares the goal of decentralized storage, it uses a different data model (event logs, key-value stores) and does not provide MongoDB-compatible query semantics.

LevelDB and RocksDB [5] provide low-level key-value storage engines that are frequently used as backends for higher-level databases. BrightDB's block store interface is conceptually similar to a key-value store where keys are content hashes, but the block store additionally provides XOR whitening, forward error correction, and pool-scoped isolation.

---

## III. Storage Architecture

### A. Block Store Interface

BrightDB operates over the `IBlockStore` interface defined by `brightchain-lib`. This interface provides content-addressable storage with the following core operations:

```typescript
interface IBlockStore {
    has(key: Checksum | string): Promise<boolean>;
    get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T>;
    put(key: Checksum | string, data: Uint8Array, options?: BlockStoreOptions): Promise<void>;
    delete(key: Checksum | string): Promise<void>;
    getData(key: Checksum): Promise<RawDataBlock>;
    setData(block: RawDataBlock, options?: BlockStoreOptions): Promise<void>;
    // ... metadata, FEC, replication, and CBL operations
}
```

Documents are serialized to JSON, converted to `Uint8Array`, and stored as blocks. The block's content hash (SHA3-512) serves as its storage key. This content-addressable design means that identical documents produce identical block IDs, enabling natural deduplication.

### B. Document-to-Block Mapping

Each collection maintains two in-memory data structures:

- **docIndex:** `Map<DocumentId, string>` mapping logical document IDs (`_id` fields) to content-addressable block checksums.
- **docCache:** `Map<DocumentId, T>` providing fast in-memory reads without block store round-trips.

When a document is inserted or updated:

1. The document is serialized to JSON and encoded as UTF-8 bytes.
2. The bytes are stored in the block store via `put()`, which computes the SHA3-512 checksum.
3. The `docIndex` is updated to map the document's `_id` to the new block checksum.
4. The `docCache` is updated with the new document state.
5. The collection's index state is persisted as a block, and the head registry is updated to point to this new index block.

The block ID calculation uses SHA3-512 (the same algorithm as BrightChain's `ChecksumService`) implemented via `@noble/hashes/sha3`, avoiding a dependency on the global service provider:

```typescript
function calculateBlockId(data: Buffer | Uint8Array): string {
    const bytes = data instanceof Buffer ? new Uint8Array(data) : data;
    const hash = sha3_512(bytes);
    return Buffer.from(hash).toString('hex');
}
```

### C. Pool-Scoped Storage

BrightDB supports multi-tenant isolation through the `PooledStoreAdapter`, which wraps an `IPooledBlockStore` and fixes all operations to a specific pool ID:

```typescript
class PooledStoreAdapter implements IBlockStore {
    constructor(
        private readonly inner: IPooledBlockStore,
        private readonly poolId: PoolId
    ) {}

    async has(key: Checksum | string): Promise<boolean> {
        return this.inner.hasInPool(this.poolId, key.toHex());
    }
    // ... all operations routed through pool-scoped methods
}
```

This adapter is transparent to the `Collection` class, which continues to call standard `IBlockStore` methods. Pool routing, CBL whitening, and cross-pool operations are handled entirely at the adapter level. The `BrightDb` constructor automatically wraps the store when a `poolId` is provided in the options.

---

## IV. Query Engine

### A. Filter Matching

BrightDB implements a comprehensive MongoDB-compatible filter engine supporting:

**Comparison Operators:** `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`  
**Set Operators:** `$in`, `$nin`  
**Pattern Matching:** `$regex` (RegExp or string)  
**Existence:** `$exists`  
**Logical Operators:** `$and`, `$or`, `$not`, `$nor`  
**Array Operators:** `$elemMatch`, `$size`, `$all`  
**Type Checking:** `$type`

The `matchesFilter` function recursively evaluates filter predicates against documents. Nested field access is supported via dot notation through the `getNestedValue` utility, which traverses object hierarchies and handles array elements.

Logical operators are evaluated with short-circuit semantics: `$and` returns false on the first non-matching predicate, and `$or` returns true on the first match.

### B. Projection and Sorting

Projections use inclusion/exclusion semantics consistent with MongoDB: fields marked with `1` are included, fields marked with `0` are excluded, and the `_id` field is included by default unless explicitly excluded.

Multi-field sorting is implemented by the `sortDocuments` function, which applies sort specifications in order of precedence. The `compareValues` function handles type-heterogeneous comparisons following MongoDB's type comparison order.

### C. Text Search

BrightDB supports basic text search through configurable text index fields. The `tokenize` function splits text into lowercase tokens, and `matchesTextSearch` checks whether any configured text field contains all search tokens. While this implementation does not include stemming or language-specific analysis, it provides functional text search for common use cases.

---

## V. Indexing

### A. Index Architecture

The `IndexManager` class maintains a collection of `CollectionIndex` instances, each representing a single-field, compound, or unique index. Indexes are stored as in-memory B-tree-like structures that map indexed field values to sets of document IDs.

Index types include:

- **Single-field indexes:** Map a single field value to document IDs.
- **Compound indexes:** Map concatenated field values to document IDs, supporting prefix queries.
- **Unique indexes:** Enforce uniqueness constraints, throwing `DuplicateKeyError` on violation.
- **Sparse indexes:** Exclude documents where the indexed field is missing.
- **TTL indexes:** Automatically expire documents after a configurable number of seconds, implemented via periodic timers.
- **Text indexes:** Map tokenized text content to document IDs with configurable field weights.

### B. Index Persistence

Index metadata is serialized and stored as blocks in the block store. On collection initialization, indexes are rebuilt from stored metadata blocks. The head registry tracks the latest index block for each collection, enabling recovery after process restarts.

### C. Query Optimization

When a query filter matches an indexed field, the `IndexManager` performs an index lookup to retrieve candidate document IDs, avoiding a full collection scan. For compound indexes, prefix matching is used: a query on fields `{a, b}` can use a compound index on `{a, b, c}` but not one on `{b, c}`.

---

## VI. Transaction Engine

### A. Optimistic Concurrency Model

BrightDB implements ACID-like transactions using optimistic concurrency control. The `DbSession` class manages transaction state:

```typescript
interface ClientSession {
    readonly id: string;
    readonly inTransaction: boolean;
    startTransaction(): void;
    commitTransaction(): Promise<void>;
    abortTransaction(): Promise<void>;
    endSession(): void;
}
```

### B. Journal-Based Writes

During a transaction, all write operations (inserts, updates, deletes) are buffered in a journal (`JournalOp[]`) rather than applied immediately to the collection. Each journal entry records the operation type, collection name, document ID, and the before/after document states.

On `commitTransaction()`, all journal entries are applied atomically to their respective collections. On `abortTransaction()`, the journal is discarded and any partially applied changes are rolled back using the stored before-states.

### C. Isolation

Transactions provide read-committed isolation: reads within a transaction see the committed state of the collection plus any uncommitted writes from the same transaction. Concurrent transactions on different sessions operate independently, with conflicts detected at commit time.

---

## VII. Aggregation Pipeline

BrightDB implements a MongoDB-compatible aggregation pipeline supporting 14 stage types:

| Stage | Description |
|-------|-------------|
| `$match` | Filter documents using query operators |
| `$group` | Group documents by expression with accumulators |
| `$sort` | Sort documents by field(s) |
| `$limit` | Limit output to N documents |
| `$skip` | Skip N documents |
| `$project` | Reshape documents with field inclusion/exclusion and expressions |
| `$unwind` | Deconstruct array fields into separate documents |
| `$count` | Count documents and output as named field |
| `$addFields` | Add computed fields to documents |
| `$lookup` | Left outer join with another collection |
| `$replaceRoot` | Replace document root with a sub-document |
| `$out` | Write results to a collection |
| `$sample` | Randomly select N documents |
| `$facet` | Run multiple pipelines in parallel on the same input |

### A. Group Accumulators

The `$group` stage supports the following accumulators:

- `$sum`: Numeric summation (supports field references and literal values)
- `$avg`: Arithmetic mean
- `$min` / `$max`: Minimum and maximum values
- `$first` / `$last`: First and last values in group order
- `$push`: Collect values into an array
- `$addToSet`: Collect unique values into a set
- `$count`: Count documents in group

### B. Expression Evaluation

The aggregation engine supports field references (`$fieldName`), nested field access via dot notation, and expression objects for computed fields. The `evaluateExpression` function handles conditional expressions (`$cond`, `$ifNull`), string operations (`$concat`, `$toUpper`, `$toLower`, `$substr`), arithmetic (`$add`, `$subtract`, `$multiply`, `$divide`), array operations (`$size`, `$arrayElemAt`), and type conversions (`$toString`, `$toInt`).

### C. Cross-Collection Lookup

The `$lookup` stage performs left outer joins by resolving a `CollectionResolver` function that returns a `Collection` instance for the target collection name. The resolver is injected by the `BrightDb` instance when collections are created, enabling cross-collection queries within the same database.

---

## VIII. Schema Validation

BrightDB provides optional schema validation through the `CollectionSchema` interface:

```typescript
interface CollectionSchema {
    fields: Record<string, FieldSchema>;
    required?: string[];
    additionalProperties?: boolean;
    validationLevel?: 'strict' | 'moderate' | 'off';
    validationAction?: 'error' | 'warn';
}
```

Each `FieldSchema` specifies:

- **type:** One of `string`, `number`, `boolean`, `date`, `array`, `object`, `objectId`, `binary`, `null`, `any`
- **required:** Whether the field must be present
- **default:** Default value applied during insertion
- **enum:** Allowed values
- **min / max:** Numeric range constraints
- **minLength / maxLength:** String length constraints
- **pattern:** Regular expression pattern for strings
- **items:** Schema for array elements
- **properties:** Nested schema for object fields
- **brand:** Branded type validation using `@digitaldefiance/branded-interface`

The `validateDocument` function recursively validates documents against the schema, collecting field-level errors into a `ValidationError` with MongoDB-compatible error code 121 (DocumentValidationFailure).

Default values are applied by the `applyDefaults` function during document insertion, supporting both literal defaults and nested object defaults.

---

## IX. Head Registry

### A. Purpose

The head registry maps `(dbName, collectionName)` pairs to the block checksum of the latest collection index state. This mapping is the entry point for collection recovery: on startup, the collection loads its index block from the head registry and rebuilds its in-memory state.

### B. In-Memory Registry

The `InMemoryHeadRegistry` provides a simple `Map`-based implementation suitable for testing and ephemeral databases. It satisfies the `ICollectionHeadRegistry` interface with synchronous `getHead`, `setHead`, and `removeHead` operations.

### C. Persistent Registry

The `PersistentHeadRegistry` extends the in-memory implementation with disk persistence:

1. **Write-Through:** Every mutation writes the full registry state to a JSON file on disk before returning.
2. **Atomic Writes:** Data is written to a temporary file and then renamed, ensuring atomicity on POSIX file systems.
3. **File-Level Locking:** A `.lock` file with exclusive create (`wx` flag) prevents concurrent write corruption. Lock acquisition retries up to 50 times with 20ms delays before force-removing stale locks.
4. **Timestamp Tracking:** Each head entry includes a timestamp for conflict resolution.
5. **Legacy Format Support:** The loader handles both legacy plain-string entries and new `{blockId, timestamp}` entries.

### D. Conflict Resolution

The `mergeHeadUpdate` method implements last-writer-wins conflict resolution based on timestamps:

```typescript
async mergeHeadUpdate(dbName, collectionName, blockId, timestamp): Promise<boolean> {
    const localTimestamp = this.timestamps.get(key);
    if (!localTimestamp || timestamp.getTime() > localTimestamp.getTime()) {
        // Remote is newer — apply
        return true;
    }
    // Local is same age or newer — reject
    return false;
}
```

Deferred updates can be queued via `deferHeadUpdate` and applied later via `applyDeferredUpdates`, supporting scenarios where a referenced block has not yet been replicated locally.

---

## X. Write Access Control

### A. Authorization Model

BrightDB supports configurable write access control through the `WriteAclManager` class. When ACL configuration is provided, the head registry is wrapped with an `AuthorizedHeadRegistry` that enforces write authorization before any head update. The `AuthorizedHeadRegistry` supports auto-signing for local writes via a configurable `ILocalSigner`, eliminating the need to thread write proofs through every Collection method. Remote writes (received via gossip head updates) must include an explicit `IWriteProof` with a valid ECDSA signature.

The ACL model supports:

- **Open Mode:** No authorization required (default, backward compatible).
- **Writer Lists:** Explicit lists of authorized writer public keys per database or collection.
- **Administrator Lists:** Keys authorized to modify ACL documents.
- **Capability Tokens:** Time-limited, scope-restricted authorization tokens that can be issued by administrators and verified cryptographically.

### B. Cryptographic Proof Verification

Write operations can require cryptographic proofs (`verifyWriteProof`) where the writer signs the operation payload with their private key. The ACL manager verifies the signature against the writer's registered public key.

### C. Pool-Scoped Encryption

The ACL manager integrates with pool-scoped encryption, tracking pool member keys and encryption modes. When a pool member is removed, the `onPoolMemberRemoved` method identifies affected ACL documents and returns a list of collections that need re-encryption.

### D. Change Events

ACL mutations emit change events (`IAclChangeEvent`) to registered listeners, enabling reactive authorization updates across the system. Event types include `writerAdded`, `writerRemoved`, `adminAdded`, `adminRemoved`, and `aclCreated`.

---

## XI. CBL Index

### A. Content-Addressable Block List

The `CBLIndex` provides a higher-level index over BrightChain's Constituent Block Lists (CBLs). CBLs are metadata blocks that reference other blocks, forming the basis of file storage in the OFFS. The CBL index maps magnet URLs to index entries containing:

- Block IDs (the two XOR-whitened blocks that compose the CBL)
- Pool ID
- Creation and modification timestamps
- Soft-delete status
- Sharing permissions (user IDs)
- Version history

### B. Recovery Strategies

The CBL index implements a multi-strategy recovery system with three fallback levels:

1. **Snapshot Recovery:** Restore from the latest persisted snapshot block.
2. **FEC Recovery:** Use forward error correction parity blocks to reconstruct a corrupted index.
3. **Block Scan Recovery:** Scan all blocks in the store, identify CBL-shaped blocks using heuristic detection (`looksLikeCblBlock`), and rebuild the index from discovered blocks.

### C. Automatic Snapshots and Parity

The index supports configurable automatic snapshots after a threshold number of mutations (`autoSnapshotInterval`). Each snapshot is stored as a block in the block store. When `fecParityCount` is configured, parity blocks are generated for the head snapshot using the store's `generateParityBlocks` method, enabling FEC-based recovery.

### D. Version History

The `addVersion` method maintains a version history for each CBL entry, recording the block IDs, timestamp, and optional description for each version. The `getVersionHistory` and `getLatestVersion` methods provide access to the full history and the most recent version respectively.

### E. Cross-Pool Dependencies

The `getCrossPoolDependencies` method analyzes the index to identify CBL entries that reference blocks in other pools, returning a dependency graph. This information is critical for pool migration, garbage collection, and replication planning.

### F. Merge and Reconciliation

The `mergeEntry` method implements conflict-free merge semantics for CBL index entries received from remote nodes. Sharing lists are unioned, version histories are merged by timestamp, and soft-delete status follows a "delete wins" policy. The `reconcileCBLIndex` method performs full index reconciliation against a remote manifest, identifying entries that need to be added, updated, or removed.

---

## XII. Express Middleware

BrightDB includes a drop-in Express router (`createDbRouter`) that exposes collections as REST endpoints:

```
POST   /api/db/:collection          → insertOne / insertMany
GET    /api/db/:collection          → find (with query params)
GET    /api/db/:collection/:id      → findOne by _id
PUT    /api/db/:collection/:id      → replaceOne
PATCH  /api/db/:collection/:id      → updateOne
DELETE /api/db/:collection/:id      → deleteOne
POST   /api/db/:collection/aggregate → aggregation pipeline
```

Server-side cursor sessions enable paginated REST access with configurable timeout (default 5 minutes). Cursor state is maintained in memory with automatic cleanup of expired sessions.

---

## XIII. Error Handling

BrightDB defines a typed error hierarchy rooted at `BrightDbError`, with MongoDB-compatible error codes:

| Error Class | Code | Description |
|-------------|------|-------------|
| `BrightDbError` | varies | Base class for all BrightDB errors |
| `DocumentNotFoundError` | 404 | Document not found by `_id` |
| `ValidationError` | 121 | Schema validation failure |
| `TransactionError` | 251 | Invalid transaction operation |
| `IndexError` | 86 | Index operation failure |
| `DuplicateKeyError` | 11000 | Unique index constraint violation |
| `WriteConcernError` | 64 | Write concern not satisfied |
| `BulkWriteError` | 65 | Partial bulk write failure |

Each error class includes structured properties (collection name, document ID, field-level errors) enabling programmatic error classification by consumers.

---

## XIV. Change Streams

Collections support change stream subscriptions through the `watch` method. Listeners receive `ChangeEvent` objects for insert, update, replace, and delete operations:

```typescript
interface ChangeEvent<T> {
    operationType: 'insert' | 'update' | 'replace' | 'delete';
    documentKey: { _id: DocumentId };
    fullDocument?: T;
    updateDescription?: {
        updatedFields?: Partial<T>;
        removedFields?: string[];
    };
    ns: { db: string; coll: string };
    timestamp: Date;
}
```

Change events are emitted synchronously after each write operation completes, enabling reactive patterns such as cache invalidation, audit logging, and real-time UI updates.

---

## XV. Model Layer

BrightDB provides an optional `Model` class that combines a collection with schema validation, middleware hooks, and convenience methods:

```typescript
const UserModel = db.model('users', {
    schema: {
        fields: {
            name: { type: 'string', required: true },
            email: { type: 'string', required: true, pattern: '^[^@]+@[^@]+$' },
            age: { type: 'number', min: 0, max: 150 }
        },
        required: ['name', 'email']
    }
});
```

The model layer provides a higher-level abstraction for applications that prefer schema-enforced collections with validation on every write operation.

---

## XVI. Conclusion

BrightDB demonstrates that a full-featured document database can be implemented over a content-addressable, owner-free block storage system without sacrificing the developer experience established by MongoDB. By layering collections, indexes, transactions, aggregation, and access control over BrightChain's `IBlockStore` interface, BrightDB enables structured data access in decentralized environments while preserving the privacy and distribution properties of the underlying OFFS architecture.

The system's modular design allows components to be used independently: the query engine, update engine, and cursor can operate over any `IBlockStore` implementation, from in-memory stores for testing to distributed block stores for production. The CBL index with its multi-strategy recovery and version history provides durability guarantees appropriate for a content-addressable storage system where traditional file-system journaling is not available.

BrightDB is actively developed as part of the BrightChain ecosystem and is available as open-source software under the MIT license at `@brightchain/db`.

---

## References

[1] MongoDB, Inc., "MongoDB Manual," https://docs.mongodb.com/manual/, 2024.

[2] Digital Defiance, "BrightChain: Owner-Free File System with Cryptographic Governance," https://github.com/Digital-Defiance/BrightChain, 2024.

[3] J. C. Anderson, J. Lehnardt, and N. Slater, "CouchDB: The Definitive Guide," O'Reilly Media, 2010.

[4] Protocol Labs, "OrbitDB: Peer-to-Peer Databases for the Decentralized Web," https://orbitdb.org/, 2023.

[5] S. Ghemawat and J. Dean, "LevelDB," https://github.com/google/leveldb, 2011.

[6] P. O'Neil, E. Cheng, D. Gawlick, and E. O'Neil, "The Log-Structured Merge-Tree (LSM-Tree)," Acta Informatica, vol. 33, no. 4, pp. 351-385, 1996.

[7] G. DeCandia et al., "Dynamo: Amazon's Highly Available Key-Value Store," in Proc. 21st ACM SOSP, 2007, pp. 205-220.

[8] F. Chang et al., "Bigtable: A Distributed Storage System for Structured Data," in Proc. 7th USENIX OSDI, 2006, pp. 205-218.

[9] J. Benet, "IPFS - Content Addressed, Versioned, P2P File System," arXiv:1407.3561, 2014.

[10] M. Shapiro, N. Preguiça, C. Baquero, and M. Zawirski, "Conflict-Free Replicated Data Types," in Proc. 13th International Symposium on Stabilization, Safety, and Security of Distributed Systems, Springer, 2011, pp. 386-400.
