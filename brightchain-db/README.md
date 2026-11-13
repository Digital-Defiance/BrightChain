# BrightDB (`@brightchain/db`)

A MongoDB-like document database driver backed by BrightChain's block store.

## Overview

`brightchain-db` provides a familiar MongoDB-style API for storing and querying
structured documents on top of BrightChain's Owner-Free block storage system.
It supports:

- **Collections & Documents** – `db.collection('users')` returns a collection handle
- **CRUD operations** – `insertOne`, `insertMany`, `findOne`, `find`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `replaceOne`
- **Rich query operators** – `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, `$exists`, `$and`, `$or`, `$not`, `$nor`, `$elemMatch`
- **Projection & sorting** – field selection, multi-field sort
- **Indexes** – unique, compound, and single-field indexes for fast lookups
- **Transactions** – multi-document transactions with commit/abort (v2 storage: atomic single-head commits and per-record versioned merge; no multi-writer transactions)
- **Aggregation pipeline** – `$match`, `$group`, `$sort`, `$limit`, `$skip`, `$project`, `$unwind`, `$count`, `$addFields`, `$lookup`
- **Cursor API** – lazy iteration with `skip`, `limit`, `sort`, `toArray`
- **Express middleware** – drop-in router for REST access to collections
- **Change streams** – subscribe to insert/update/delete events

> **Terminology Note**
> - **BrightDB** — the user-facing product name for this database component
> - `BrightDb` — the TypeScript class name (used in code)
> - `@brightchain/db` — the npm package name (used in imports)
> - `brightchain-db` — the directory and Nx project name

## Standalone local database

Open a new or existing v2 directory on a local POSIX filesystem. On Linux the
adapter uses `flock` when available, with Perl as a fallback. On macOS and BSD it
uses Perl. The v2 directory stores documents and metadata together.

```typescript
import { BrightDb } from '@brightchain/db';

const db = await BrightDb.open({ path: './data' });
const users = db.collection('users');
const { insertedId } = await users.insertOne({ name: 'Alice' });
console.log(await users.findById(insertedId));
db.close();
```

Reopen the same directory to read the committed data. The local v2 API supports
primary lookups, query scans, inserts, replacements and deletes by ID, and atomic
`writeBatch` operations across collections. It also gives you:

- **State as a hash.** `await db.root()` identifies the current state, `db.at(root)`
  reads any earlier state, `db.snapshot()` pins the present one, and
  `db.diff(from, to)` lists the added, modified and deleted documents between two
  states while reading only the parts of the database that changed.
- **Change notifications.** `await db.subscribe(listener)` runs when the root
  moves, for commits from this handle or another process using the directory.
- **Ordered indexes.** `createIndex('by_city_age', ['city', 'age'])` builds an index
  over one or more fields (dotted paths and array fields work). Query it with
  `findByIndex('by_city_age', { equals: ['Oslo'], gte: 30, limit: 10 })`, using
  `equals`, `gt`, `gte`, `lt`, `lte`, `prefix` and `descending`. Index changes commit
  together with the documents that cause them.
- **Fork and merge.** `await db.fork('./copy')` makes an independent replica, and `await db.merge(other)` brings another replica's changes in. The greater version of each document wins, a deletion beats an equal version, and merging in any order or direction gives the same root. This is how two copies converge without a server.
- **Garbage collection.** `await db.collectGarbage({ keepRoots, graceMs, dryRun })` deletes blocks no retained root reaches. It always keeps the current state plus any older roots you name, and keeps recent blocks for one hour by default so attachments have time to be referenced.
- **Joining a database.** `PortableBrightDb.cloneFrom(path, source)` copies a database a block source serves into a new directory, so a machine can join one it has never held. The clone has its own writer ID and merges with the original from then on.
- **Sync over HTTP.** `serveBlocks(db.blockSource())` serves a database read-only (set a `token`, and use TLS on an untrusted network). Another machine runs `db.merge(new HttpBlockSource(url, { token }))` and fetches only the blocks it lacks. Both sides pull from each other to converge.
- **On a BrightChain pool.** `BrightChainV2Storage.openOrCreate({ store, poolId, headRegistry, dbName })` keeps the database in a pool, with the root in the head registry. Pass it as `PortableBrightDb.open({ storage })`. A second node joins with `BrightChainV2Storage.joinFrom(options, source)` and then syncs with `merge`. For an encrypting pool pass `poolEncryption: { key }` (the store must implement `putInPoolWithId`). Keep BrightDB in its own pool, away from files that use whitening. See the encryption note.
- **Optional encryption at rest.** `BrightDb.open({ path, encryption: { key } })` (a 32-byte key) encrypts every block with AES-256-GCM under a keyed file name, and hides the head. `open` refuses to add it over a storage that already encrypts, such as a BrightChain pool. See the [encryption note](https://github.brightchain.org/docs/architecture/brightdb-encryption/).
- **Attachments.** `putAttachment(bytes, { type })` stores a file of any size as
  1 MiB chunks under a tree of manifests, and accepts a stream so the file never has to fit in memory. Put the returned reference under `_files` in a document, then read it with
  `getAttachment(ref)` or `streamAttachment(ref)`.

Network sync and BrightChain replication are planned for a later stage; today you merge replicas that you can open locally. Use a fresh directory for v2.
See the [storage format specification](https://github.brightchain.org/docs/architecture/brightdb-storage-format-v2/).

## Bring your own block store

```typescript
import { BrightDb } from '@brightchain/db';
import { MemoryBlockStoreAdapter } from '@brightchain/brightchain-lib';
import { BlockSize } from '@brightchain/brightchain-lib';

// Create or connect to a block store
const blockStore = new MemoryBlockStoreAdapter({ blockSize: BlockSize.Medium });

// Open a database
const db = new BrightDb(blockStore);

// Get a collection
const users = db.collection('users');

// Insert
await users.insertOne({ name: 'Alice', email: 'alice@example.com', age: 30 });

// Query
const alice = await users.findOne({ name: 'Alice' });

// Rich queries
const adults = await users.find({ age: { $gte: 18 } }).sort({ name: 1 }).toArray();

// Indexes
await users.createIndex({ email: 1 }, { unique: true });

// Transactions
const session = db.startSession();
session.startTransaction();
try {
  await users.insertOne({ name: 'Bob', email: 'bob@example.com' }, { session });
  await users.updateOne({ name: 'Alice' }, { $set: { friend: 'Bob' } }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
}

// Express middleware
import { createDbRouter } from '@brightchain/db';
app.use('/api/db', createDbRouter(db));
```

## Faster bulk loads: packed storage

`PortableBrightDb.open({ path, packed: true })` (C++: `Database::enablePacks()`) writes each commit's new blocks into one pack file with one fsync, instead of one file and one fsync per block. A 3,000-document load goes from 15 s to 0.7 s, and a single update from about 58 ms to 26 ms. It adds a `PACKED` marker to the directory; existing loose blocks keep working, and `compactPacks()` merges many small packs into one. Garbage collection, re-sealing, fork, clone and merge all understand packs, and TypeScript and C++ read and write each other's packs. Software without pack support cannot find packed blocks, so turn it on only where every reader supports it. Format: section 5.1 of the storage format spec.

## In the browser, and React hooks

`@brightchain/brightchain-db/browser` runs the v2 format in a page: `openBrowserDb(name)` stores blocks in IndexedDB (Web Locks serialise writers across tabs), `MemoryV2Storage` keeps everything in memory, and `joinFromSource` joins and merges a database served over HTTP (`serveBlocks` or the C++ `brightdb_v2_tool serve`, both with an optional CORS origin and a Bearer token). Verified in a real browser against both servers.

The browser build also has garbage collection (`db.collectGarbage({ graceMs, keepRoots, dryRun })`), forking (`forkBrowserDb(db, name)` or `db.forkInto(storage)`), and encryption at rest in IndexedDB (`openBrowserDb(name, { encryption: { key } })`, or a key ring). The encrypted format is the same one the Node and C++ builds use, so the bytes are identical; the key lives in the page, so this protects data at rest in the browser profile, not against a compromised page. A database created with a key can only be opened with it.

Limits: re-sealing after key rotation and packed storage are Node and C++ only, and bundlers need a global `Buffer` polyfill.

`brightchain-react-components` exports `BrightDbProvider`, `useLiveQuery`, `useIndexQuery` and `useDocument`, which re-run when `subscribe` reports a commit.

## How BrightDB compares to Fireproof

[Fireproof](https://github.com/fireproof-storage/fireproof) is the closest
project to BrightDB: an embedded JSON document database built on
content-addressed blocks and a Merkle clock. The two overlap on storage design
and differ most on where they run, how they sync and how you query them. The
table splits BrightDB into the v1 engine you get from `new BrightDb(store)` and
the v2 portable engine you get from `BrightDb.open({ path })`. Fireproof facts
come from its public README, LLM docs and package READMEs as of November 2026
(`@fireproof/core` 0.24.x).

| | Fireproof | BrightDB v1 (`new BrightDb(store)`) | BrightDB v2 (`BrightDb.open`) |
| --- | --- | --- | --- |
| Runtimes | Browser, Node.js, Bun and Deno with one API. Deno is not yet tested in CI. | Node.js, over any BrightChain `IBlockStore`. | Node.js on Linux, macOS and BSD. Windows is refused, and there is no browser backend. |
| Storage model | Encrypted, content-addressed blocks (IPFS-style CIDs). Each transaction writes a new immutable CAR file. Indexes use prolly trees, and a Merkle clock orders changes. | Each document is a JSON block in the BrightChain block store. Each write re-serializes the collection's metadata block. | A canonical Merkle tree of SHA3-512-addressed pages. Equal records give an equal root whatever the insert order. Each commit publishes one database root. |
| Querying | Indexes from a field name or a map function, queried by `key`, `range` or `prefix`, with `descending` and `limit`. No MongoDB-style operators. | MongoDB-style filters (`$gt`, `$in`, `$regex`, `$elemMatch` and more), projection, sort, cursors, an aggregation pipeline, and unique and compound in-memory indexes. | `findById` by primary key. `find` and `findOne` accept the same filters but scan the whole collection. Ordered single and compound indexes are queried through `findByIndex` with exact, range and prefix bounds. No `$set`-style updates or aggregation yet. |
| Live updates | `subscribe()`, plus React hooks (`useLiveQuery`, `useDocument`). | `collection.watch()` change listener. No framework bindings. | `subscribe()` reports each root change with its document-level diff. No framework bindings yet. |
| Atomic writes | Each commit is one CAR file. | Sessions buffer writes and apply them one by one on commit, with best-effort rollback. Not atomic across collections. | `writeBatch` commits inserts, replaces and deletes across collections as one root. |
| Multi-writer and sync | Merkle CRDT with a deterministic winner per `_id`. Offline writes queue and merge later. Live sync goes through pluggable gateways: hosted Fireproof Cloud, a self-hosted Connect backend, and community connectors. | Gossip replication between BrightChain nodes, resolved by last-writer-wins on timestamps. | Several local processes can share one directory under an exclusive file lock. `fork()` and `merge()` combine replicas deterministically by `(counter, writerId)` (§6 of the format spec). No network sync yet. |
| Encryption at rest | On by default. Each blockstore has its own symmetric key. Key management is still maturing (the README flags a key-extraction default as deprecated). | Not in BrightDB itself. It depends on the BrightChain store and pool settings underneath. | Optional: pass a 32-byte key to `open` and every block is AES-256-GCM encrypted under a keyed name. Off by default. |
| Integrity checks | Blocks are verified by their CIDs. | Blocks are addressed by checksum in the block store. | Every page is checked against its SHA3-512 digest. A missing or corrupt block raises an error instead of reading as empty. |
| History | Git-like hash history is part of the core design. | Not exposed. | Every root is an immutable snapshot, but there is no API yet to read, diff or log past roots. |
| Write authority | Not part of the core database. Access is handled by the sync backend. | Signed write ACLs on collection heads (`authorizedHeadRegistry`, `writeAclManager`). | Not yet ported to v2. |
| Schema validation | Not built in. | Per-collection schemas validated on write. | Not yet. |
| File attachments | `_files` on a document, encrypted and synced on demand. | Not built in. | `_files` references chunked, content-addressed files, read on demand. Not encrypted by BrightDB. |
| Compaction and GC | Compaction writes a new combined CAR file. Old files are kept, and cloud cleanup is not yet implemented. | Each write leaves an orphaned metadata block. No GC. | `collectGarbage()` removes blocks no retained root reaches (directory stores). |
| Other languages | JavaScript and TypeScript. | A separate C++ port reads and writes the v1 layout. | A byte-exact draft spec with golden fixtures. A C++ port (`brightdb_v2` in brightchain-cpp) reads and writes the same directory as TypeScript, with local read, insert, replace, delete and batch operations only. |
| License | MIT or Apache 2.0 (the repo's metadata lists Apache-2.0). | MIT | MIT |

Choose Fireproof today if you need a browser or React app with live queries,
encrypted sync and a hosted backend. Choose BrightDB v1 if you need MongoDB-style
queries and aggregation on a BrightChain cluster. BrightDB v2 is the base for a
verifiable, embedded store with one root per commit, a canonical tree and a
cross-language byte format. History, merge and sync are planned on top of it
and aren't in the API yet.

## Architecture

Documents are serialised to JSON and stored as blocks in the BrightChain block store.
Each collection maintains an in-memory index that maps logical document IDs to
content-addressable block checksums. The index itself is persisted as a block and
tracked via a head registry.

Indexes are maintained as B-tree-like structures in memory, rebuilt from stored
index metadata blocks on startup, and persisted after mutations.

Transactions use optimistic concurrency: writes are buffered in a journal and
applied atomically on commit, with automatic rollback on abort.

## License

MIT
