# @brightchain/db

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
- **Transactions** – multi-document ACID-like transactions with commit/abort
- **Aggregation pipeline** – `$match`, `$group`, `$sort`, `$limit`, `$skip`, `$project`, `$unwind`, `$count`, `$addFields`, `$lookup`
- **Cursor API** – lazy iteration with `skip`, `limit`, `sort`, `toArray`
- **Express middleware** – drop-in router for REST access to collections
- **Change streams** – subscribe to insert/update/delete events

## Quick Start

```typescript
import { BrightChainDb } from '@brightchain/brightchain-db';
import { MemoryBlockStoreAdapter } from '@brightchain/brightchain-lib';
import { BlockSize } from '@brightchain/brightchain-lib';

// Create or connect to a block store
const blockStore = new MemoryBlockStoreAdapter({ blockSize: BlockSize.Medium });

// Open a database
const db = new BrightChainDb(blockStore);

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
import { createDbRouter } from '@brightchain/brightchain-db';
app.use('/api/db', createDbRouter(db));
```

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
