---
title: "BrightDB — Architecture Reference"
parent: "Architecture & Design"
nav_order: 5
permalink: /docs/architecture/brightdb/
---

# BrightDB — Architecture Reference

## 1. Introduction

BrightDB is the document-database layer of BrightChain. It provides a
MongoDB-compatible API (`insertOne`, `find`, `updateOne`, `deleteOne`,
`aggregate`, …) on top of a content-addressed block store. Each collection's
state is serialised to an immutable block; a *head registry* maps
`(dbName, collectionName) → latest block ID`, making the mutable "current
state" pointer explicit and independently auditable.

### Design goals

| Goal | How it is met |
|---|---|
| Schema-optional BSON documents | Plain TypeScript objects; optional JSON Schema validation per collection |
| Durable, portable storage | Pluggable `IBlockStore` (in-memory, disk, S3, Azure Blob, …) |
| Multi-process consistency | LWW-based gossip across independent head registries |
| Authorised writes | Optional `AuthorizedHeadRegistry` decorator for signature-based ACLs |
| MongoDB-style API | `Collection` mirrors the MongoDB Node driver surface |
| Zero-config defaults | Works out of the box with `new BrightDb(store)` — no registry or schema required |

---

## 2. Package Layout

```
brightchain-lib/              — shared interfaces, crypto, block store types
  src/lib/interfaces/storage/
    headRegistry.ts           IHeadRegistry (full gossip interface)
    headRegistryDriver.ts     IHeadRegistryDriver, HeadRecord
  src/lib/db/
    inMemoryHeadRegistry.ts   InMemoryHeadRegistry — default, no disk
    driverBackedHeadRegistry.ts DriverBackedHeadRegistry — generic persistence
    inMemoryHeadRegistryDriver.ts driver backed by a Map<>
    headRegistryGossipTransport.ts decorator: announces writes, merges gossip
  src/lib/blocks/
    pooledMemoryBlockStore.ts PooledMemoryBlockStore — shared in-process store

brightchain-db/               — database engine
  src/lib/
    database.ts               BrightDb — top-level entry point
    collection.ts             Collection — per-collection CRUD/query/aggregate
    queryEngine.ts            filter matching, projection, text search
    updateEngine.ts           $set, $inc, $push, $pull, … operators
    aggregation.ts            $match, $group, $sort, $project, … pipeline
    indexing.ts               IndexManager — B-tree-like in-memory indexes
    schemaValidation.ts       JSON Schema validation + default values
    transaction.ts            DbSession — ACID multi-op transactions
    cursor.ts                 Cursor — server-side pagination
    model.ts                  Model — typed schema+method wrapper
    headRegistry.ts           PersistentHeadRegistry, re-exports InMemoryHeadRegistry
    fileHeadRegistryDriver.ts per-key JSON file driver for PersistentHeadRegistry
    authorizedHeadRegistry.ts AuthorizedHeadRegistry decorator for write ACLs
    writeAclManager.ts        WriteAclManager — ACL document store + verification
    pooledStoreAdapter.ts     PooledStoreAdapter — namespaces blocks by pool ID
    storeLock.ts              StoreLock — serialises concurrent writes cross-process
    errors.ts                 typed error classes
    types.ts                  shared TypeScript type aliases (BsonDocument, …)
    expressMiddleware.ts      Express router — REST API surface over BrightDb
```

---

## 3. Core Abstractions

### 3.1 Block Store (`IBlockStore`)

BrightDB is storage-agnostic. The interface:

```typescript
interface IBlockStore {
  get(id: string): Promise<{ data: Uint8Array; fullData: Uint8Array } | null>;
  put(id: string, data: Uint8Array): Promise<void>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
```

Blocks are content-addressed (SHA3-512 of their serialised content). Writing
the same logical document with the same content always produces the same block
ID; mutating a document produces a new block ID, leaving the old one intact.
This gives BrightDB structural sharing and append-only audit history for free.

Common implementations:

| Implementation | Location | Notes |
|---|---|---|
| `PooledMemoryBlockStore` | `brightchain-lib` | In-process; shared by all BrightDb instances in the same process |
| `PooledStoreAdapter` | `brightchain-db` | Namespaces blocks by a pool ID within a `PooledMemoryBlockStore` |
| `S3BlockStore` | `brightchain-s3-store` | AWS S3 backend |
| `AzureBlockStore` | `brightchain-azure-store` | Azure Blob Storage backend |

### 3.2 Head Registry (`IHeadRegistry`)

A head registry is a mutable pointer store: given `(dbName, collectionName)`,
it returns the block ID of the most-recently persisted collection state.

```
dbName:collectionName  →  blockId  (e.g. "mydb:users" → "a3f4…b2")
```

Because the block store is append-only and content-addressed, *what* is
written is always verifiable; the head registry determines *what is current*.

**Interface hierarchy:**

```
ICollectionHeadRegistry          — minimal contract used by Collection / BrightDb
  + getHead / setHead / removeHead / load? / clear? / onHeadChange?

IHeadRegistry (extends above)    — full gossip interface
  + mergeHeadUpdate              — LWW single-key merge
  + exportSnapshot               — ReadonlyMap of all heads + timestamps
  + mergeSnapshot                — bulk LWW merge from a peer snapshot
  + onHeadChange                 — subscribe to external head changes
```

**Concrete implementations:**

| Class | Persistence | Notes |
|---|---|---|
| `InMemoryHeadRegistry` | None | Default, suitable for tests and single-process use |
| `PersistentHeadRegistry` | Per-key JSON files on disk | Survives process restarts; auto-migrates legacy monolithic JSON |
| `HeadRegistryGossipTransport` | Delegates to inner registry | Wraps any `IHeadRegistry`; announces writes via `IGossipService` and merges inbound updates |
| `AuthorizedHeadRegistry` | Delegates to inner registry | Wraps any `IHeadRegistry`; enforces Write ACL signature checks on `setHead` / `removeHead` / `mergeHeadUpdate` |

### 3.3 Collection (`Collection`)

Each `Collection` holds the complete document set for one `(dbName, name)` pair
in memory. State is persisted by serialising the Map of documents + metadata
(timestamps, tombstones, schema, indexes) to a JSON block, then updating the
head registry to point at the new block.

**In-memory structures:**

```typescript
class Collection {
  private docs:           Map<string, BsonDocument>  // docId → document
  private docTimestamps:  Map<string, number>         // docId → last-write epoch ms
  private docTombstones:  Map<string, number>         // docId → last-delete epoch ms
  private indexes:        IndexManager
  private schema?:        CollectionSchema
}
```

**Persistence round-trip:**

```
write (insert/update/delete)
  → update in-memory structures
  → persistMeta()
      → serialise docs + metadata to JSON Buffer
      → store.put(blockId, buffer)
      → headRegistry.setHead(dbName, name, blockId)

read (find / findOne / findById)
  → if not loaded: loadFromStore()
      → blockId = headRegistry.getHead(dbName, name)
      → buffer = store.get(blockId)
      → deserialise docs + metadata into in-memory maps
  → run query engine over in-memory docs
```

### 3.4 `BrightDb` (top-level database object)

`BrightDb` is analogous to MongoDB's `Db` object. It manages a registry of
`Collection` instances and wires the block store, head registry, gossip
transport, and write ACLs together.

```typescript
const db = new BrightDb(blockStore, {
  name: 'mydb',
  headRegistry: new InMemoryHeadRegistry(),   // optional
  gossipService: myGossipService,             // optional; enables P2P sync
  writeAclConfig: { aclService, authenticator }, // optional; enables ACLs
  antiEntropyIntervalMs: 30_000,             // optional; default 30 s
});
await db.connect();

const users = db.collection('users');
await users.insertOne({ _id: 'u1', name: 'Alice' });
```

When `writeAclConfig` is provided, `BrightDb` automatically wraps the registry
in `AuthorizedHeadRegistry`. When `gossipService` is provided, it further
wraps it in `HeadRegistryGossipTransport`. The wrappers are composable: gossip
transport on the outside → authorized registry on the inside.

---

## 4. Query Pipeline

Queries run entirely in memory over the loaded document set.

```
find(filter, options)
  → loadFromStore()            # no-op if already loaded
  → filter documents           # matchesFilter(doc, filter) — queryEngine.ts
  → sort                       # stable sort on field or array of [field, dir]
  → skip / limit               # applied after sort
  → project                    # applyProjection(doc, projection)
  → return BsonDocument[]
```

### 4.1 Supported filter operators

`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`,
`$exists`, `$type`, `$regex`, `$not`, `$and`, `$or`, `$nor`,
`$elemMatch`, `$size`, `$all`, dot-path nested fields, array element matching.

### 4.2 Supported update operators

`$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`,
`$push`, `$pop`, `$pull`, `$addToSet`,
`$rename`, `$currentDate`, full-document replacement, upsert.

### 4.3 Aggregation pipeline

`$match`, `$sort`, `$limit`, `$skip`, `$project`,
`$group` (with `$sum`, `$avg`, `$min`, `$max`, `$push`, `$addToSet`, `$first`, `$last`),
`$unwind`, `$count`, `$addFields`, `$lookup` (basic local join).

---

## 5. Indexes

`IndexManager` maintains in-memory B-tree-like structures for declared indexes.
Indexes survive process restarts — they are serialised into the metadata block
alongside the documents.

```typescript
await collection.createIndex({ email: 1 }, { unique: true });
await collection.createIndex({ firstName: 1, lastName: 1 });  // compound
await collection.createIndex({ bio: 'text' });                 // full-text
```

Index violations throw `ValidationError`. Sparse indexes only index documents
where the field exists.

---

## 6. Schema Validation

Optional JSON Schema (Draft-07 compatible) validation is configured per
collection. Schemas survive restarts (serialised in the metadata block).

```typescript
await collection.setSchema({
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email' },
    age:   { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
  default: { role: 'user' },          // merged into every inserted doc
});
```

`validateDocument()` is called on every insert, upsert, and replace.
`applyDefaults()` fills in top-level `default` values before validation.

---

## 7. Transactions

`DbSession` wraps multiple operations in a journal. Either all operations are
committed (blocks written, heads updated) or none are (abort leaves no trace).

```typescript
const session = db.startSession();
session.startTransaction();
try {
  await users.insertOne({ _id: 'u2', name: 'Bob' }, { session });
  await orders.insertOne({ _id: 'o1', userId: 'u2', total: 42 }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
}
```

Operations within a session are buffered; `commitTransaction()` flushes them
atomically. `abortTransaction()` discards the buffer.

---

## 8. Gossip Consistency Model

### 8.1 Problem statement

Multiple BrightDb instances (different processes, different machines) may share
the same block store but carry independent head registries. Without
coordination, each node has a local view of "current head" that can drift from
its peers.

BrightDB resolves conflicts using **Last-Writer-Wins (LWW)** at two granularities:

| Granularity | Storage | Resolution |
|---|---|---|
| **Registry-level** (per collection) | `HeadRecord.timestamp` in the head registry | Strict `>` timestamp; stale gossip is silently discarded |
| **Document-level** (per document ID) | `docTimestamps` / `docTombstones` in the metadata block | Integer `Date.now()` epoch; per-doc LWW merge in `mergeFromGossipHead()` |

### 8.2 `onHeadChange` subscription

`Collection` subscribes to its registry's `onHeadChange` event. When the
registry receives a gossip update (`mergeHeadUpdate` or `mergeSnapshot`) and the
new head passes the LWW check, it fires `onHeadChange(dbName, collectionName,
newBlockId)`. The collection reacts by calling `mergeFromGossipHead(newBlockId)`:

```
Registry receives gossip
  → LWW check: newTimestamp > existingTimestamp?
      ✗ → discard (return)
      ✓ → update in-memory pointer
         → fire onHeadChange(dbName, colName, newBlockId)
              → Collection.mergeFromGossipHead(newBlockId)
                   → load gossip block from store
                   → per-document LWW merge:
                        if docTimestamp[id] > gossipTimestamp[id]: keep local
                        else: replace with gossip version
                   → merge tombstones the same way
                   → persistMeta() with merged state
```

### 8.3 Gossip transport (`HeadRegistryGossipTransport`)

When a `gossipService` is wired into `BrightDb`, the transport:

1. **Announces writes**: After `setHead()` succeeds on the inner registry, the
   transport publishes a `HeadUpdateMessage` (`{dbName, collectionName, blockId,
   timestamp}`) to the gossip network.

2. **Receives peer updates**: Incoming `HeadUpdateMessage` is passed to
   `mergeHeadUpdate()` on the inner registry, applying the LWW check.

3. **Anti-entropy**: On a configurable interval (default 30 s), the transport
   re-publishes all known heads from `exportSnapshot()`. This ensures nodes
   that joined late converge without requiring a full resync.

### 8.4 `exportSnapshot` / `mergeSnapshot` APIs

For bulk reconciliation (e.g. initial sync after a partition):

```typescript
// Node A exports its full state:
const snapshot = registryA.exportSnapshot();
// ReadonlyMap<"dbName:collectionName", { blockId, timestamp }>

// Node B merges it (LWW per key):
const { merged, skipped } = await registryB.mergeSnapshot(snapshot);
```

`mergeSnapshot` calls `mergeHeadUpdate` per entry, so `onHeadChange` fires for
each key that passes the LWW check.

### 8.5 Multi-node test coverage

The gossip model is tested at two levels:

| File | Level | Store | Registry |
|---|---|---|---|
| `brightchain-db/src/lib/__tests__/gossipConsistency.spec.ts` | Unit | `MockBlockStore` | `InMemoryHeadRegistry` |
| `brightchain-db/src/__tests__/multiNode.consistency.memory.spec.ts` | Integration | `PooledMemoryBlockStore` | `InMemoryHeadRegistry` |
| `brightchain-db/src/__tests__/multiNode.consistency.disk.spec.ts` | Integration | `PooledMemoryBlockStore` | `PersistentHeadRegistry` |

Scenarios exercised (both integration variants):

1. **Unidirectional gossip** — node A writes, node B converges after gossip
2. **Bidirectional gossip** — both nodes write; full `mergeSnapshot` round-trip produces union
3. **LWW rejects stale** — gossip with an older timestamp does not overwrite local state
4. **Tombstone beats write** — delete at T+1 wins over insert at T
5. **Write beats tombstone** — insert at T+1 survives gossip of older delete
6. **Snapshot sync** — `exportSnapshot`/`mergeSnapshot` converges multi-collection state
7. **Three-node chain** — A→B→C gossip, then back-propagation → all three nodes hold all docs

---

## 9. Write ACLs

When `writeAclConfig` is provided to `BrightDb`, the head registry is wrapped
in `AuthorizedHeadRegistry`. Every `setHead`, `removeHead`, and
`mergeHeadUpdate` call is gated by a signature check:

- **Open mode** (default): No signature required.
- **Restricted mode**: Caller must supply a `WriteProof` signed by an
  `AuthorizedWriter` listed in the current `WriteAcl` document.
- **OwnerOnly mode**: Only the database/collection creator can mutate heads.

ACL documents are stored as signed, versioned blocks in the same block store.
The `WriteAclManager` fetches the active ACL by head pointer and verifies
proofs against it.

See [BrightDB Write ACLs](./brightdb-write-acls.md) for the full design.

---

## 10. REST API Layer

`expressMiddleware.ts` exposes a `createBrightDbRouter(db)` factory that mounts
a standard Express router providing HTTP access to every collection:

| Method | Path | Action |
|---|---|---|
| `GET` | `/collections` | List all collections |
| `POST` | `/:collection` | `insertOne` |
| `GET` | `/:collection` | `find` (query params as filter) |
| `GET` | `/:collection/:id` | `findById` |
| `PATCH` | `/:collection/:id` | `updateOne` |
| `DELETE` | `/:collection/:id` | `deleteOne` |
| `POST` | `/:collection/aggregate` | `aggregate` |
| `POST` | `/:collection/bulk` | `bulkWrite` |

---

## 11. Server-Side Cursors

For large result sets, `BrightDb` supports server-side cursor sessions:

```
POST /:collection?cursor=true   → create cursor, return { cursorId, batch }
GET  /cursors/:cursorId/next    → next page
DELETE /cursors/:cursorId       → close cursor
```

Cursors are stored in memory in `BrightDb.cursorSessions` with a configurable
timeout (default 5 minutes). Expired cursors are automatically evicted.

---

## 12. Models

`Model<TDoc, TId>` is a typed wrapper over `Collection` that binds a schema
and optional instance methods:

```typescript
const UserModel = db.model<UserDoc>('users', {
  schema: userSchema,
  methods: {
    fullName(this: UserDoc) { return `${this.firstName} ${this.lastName}`; },
  },
});
const user = await UserModel.findById('u1');
console.log(user.fullName());
```

---

## 13. Storage Conformance Tests

`brightchain-db/src/__tests__/helpers/storeConformance.ts` provides
`runPersistenceConformance(factory)` — a parameterised suite covering:

1. CRUD basics
2. All update operators
3. Delete (one, many)
4. Replace
5. All query operators
6. Aggregation pipeline
7. Transactions (commit / abort)
8. Indexes (unique, compound, sparse — survive restart)
9. Schema validation (survives restart)

Run against:

- `conformance.memory.spec.ts` — `PooledMemoryBlockStore` + `InMemoryHeadRegistry`
- `conformance.disk.spec.ts` — `PooledMemoryBlockStore` + `PersistentHeadRegistry`

Any new storage backend should pass both conformance suites before shipping.

---

## 14. Extension Points

| Concern | Extension point |
|---|---|
| New block store backend | Implement `IBlockStore` |
| Custom head persistence | Implement `IHeadRegistryDriver`, wrap with `DriverBackedHeadRegistry` |
| Gossip transport | Implement `IGossipService`, pass as `gossipService` to `BrightDb` |
| Write authorisation | Implement `IWriteAclService` + `INodeAuthenticator`, pass as `writeAclConfig` |
| Typed documents | Use `Model<TDoc, TId>` |
| Custom ID generation | Pass `idGenerator: () => string` to `CollectionOptions` |

---

## 15. Dependency Graph

```
brightchain-lib
  IBlockStore, IHeadRegistry, IHeadRegistryDriver
  InMemoryHeadRegistry, DriverBackedHeadRegistry
  HeadRegistryGossipTransport
  PooledMemoryBlockStore
      ↓
brightchain-db
  BrightDb → Collection → QueryEngine / UpdateEngine / Aggregation
  BrightDb → IndexManager, SchemaValidation, StoreLock
  BrightDb → AuthorizedHeadRegistry → WriteAclManager
  BrightDb → HeadRegistryGossipTransport (from brightchain-lib)
  PersistentHeadRegistry → FileHeadRegistryDriver
  expressMiddleware (Express router)
      ↓
brightchain-api-lib
  CloudHeadRegistry (delegates to BrightDB-compatible API over HTTP)
  AuthorizedHeadRegistry wrappers
      ↓
brightchain-api
  Express server mounting expressMiddleware + auth routes
```
