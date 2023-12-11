---
title: "BrightDB Usage"
parent: "Walkthroughs"
nav_order: 5
permalink: /walkthroughs/04-brightdb-usage/
---
# BrightDB Usage

| Field          | Value                                                                                      |
|----------------|--------------------------------------------------------------------------------------------|
| Prerequisites  | [Quickstart](/docs/walkthroughs/01-quickstart) completed, [Node Setup](/docs/walkthroughs/02-node-setup) recommended   |
| Estimated Time | 45 minutes                                                                                  |
| Difficulty     | Intermediate                                                                                |

## Introduction

BrightDB is a MongoDB-like document database that stores data on BrightChain's Owner-Free Filesystem (OFF). It gives you a familiar API — collections, queries, indexes, transactions, aggregation pipelines — while every document is transparently stored as whitened blocks in the block store. This guide walks through the full API surface: CRUD operations, query operators, indexing, transactions, aggregation, the Express REST middleware, and change streams.

## Prerequisites

- Completed the [Quickstart](/docs/walkthroughs/01-quickstart) guide (repository cloned, dependencies installed)
- Node.js 20+ and Yarn installed
- Familiarity with the [Architecture Overview](/docs/walkthroughs/00-architecture-overview), especially the Foundation layer
- Optionally completed [Node Setup](/docs/walkthroughs/02-node-setup) if you want to use a persistent block store instead of in-memory

## Steps

### Step 1: Create a BrightDB Instance and Perform Basic CRUD

Start by creating a `BrightDb` instance backed by an in-memory block store. For production, swap `InMemoryDatabase` with a persistent block store or a `PooledStoreAdapter` (see [Storage Pools](/docs/walkthroughs/03-storage-pools)).

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

const users = db.collection('users');
```

#### insertOne

```typescript
const result = await users.insertOne({ name: 'Alice', role: 'admin', age: 30 });
console.log(result.insertedId); // e.g. 'a1b2c3d4...'
```

#### findOne

```typescript
const alice = await users.findOne({ name: 'Alice' });
console.log(alice);
// { _id: 'a1b2c3d4...', name: 'Alice', role: 'admin', age: 30 }
```

#### updateOne

```typescript
const updateResult = await users.updateOne(
  { name: 'Alice' },
  { $set: { role: 'superadmin' } },
);
console.log(updateResult.modifiedCount); // 1
```

#### deleteOne

```typescript
const deleteResult = await users.deleteOne({ name: 'Alice' });
console.log(deleteResult.deletedCount); // 1
```

#### Bulk Operations

BrightDB also supports bulk variants for working with multiple documents at once:

```typescript
// Insert multiple documents
await users.insertMany([
  { name: 'Bob', role: 'developer', age: 25 },
  { name: 'Carol', role: 'designer', age: 28 },
  { name: 'Dave', role: 'developer', age: 35 },
]);

// Update all developers
await users.updateMany(
  { role: 'developer' },
  { $set: { department: 'engineering' } },
);

// Delete all designers
await users.deleteMany({ role: 'designer' });
```

### Step 2: Query Operators

BrightDB supports 15 query operators that mirror the MongoDB query language. You can combine them freely in filter objects passed to `findOne`, `find`, `updateOne`, `updateMany`, `deleteOne`, and `deleteMany`.

#### Comparison Operators

##### $eq — Exact equality

```typescript
await users.findOne({ age: { $eq: 30 } });
// Equivalent shorthand: { age: 30 }
```

##### $ne — Not equal

```typescript
const nonAdmins = await users.find({ role: { $ne: 'admin' } }).toArray();
```

##### $gt — Greater than

```typescript
const seniors = await users.find({ age: { $gt: 30 } }).toArray();
```

##### $gte — Greater than or equal

```typescript
const eligible = await users.find({ age: { $gte: 18 } }).toArray();
```

##### $lt — Less than

```typescript
const juniors = await users.find({ age: { $lt: 25 } }).toArray();
```

##### $lte — Less than or equal

```typescript
const capped = await users.find({ age: { $lte: 65 } }).toArray();
```

#### Set Operators

##### $in — Matches any value in an array

```typescript
const devOrDesign = await users.find({
  role: { $in: ['developer', 'designer'] },
}).toArray();
```

##### $nin — Matches none of the values in an array

```typescript
const notDevOrDesign = await users.find({
  role: { $nin: ['developer', 'designer'] },
}).toArray();
```

#### Pattern Matching

##### $regex — Regular expression match

```typescript
const aNames = await users.find({
  name: { $regex: /^A/i },
}).toArray();
```

#### Existence

##### $exists — Field presence check

```typescript
// Find documents that have a 'department' field
const withDept = await users.find({
  department: { $exists: true },
}).toArray();

// Find documents missing the 'department' field
const noDept = await users.find({
  department: { $exists: false },
}).toArray();
```

#### Logical Operators

##### $and — All conditions must match

```typescript
const result = await users.find({
  $and: [
    { age: { $gte: 25 } },
    { role: 'developer' },
  ],
}).toArray();
```

##### $or — At least one condition must match

```typescript
const result = await users.find({
  $or: [
    { role: 'admin' },
    { age: { $gt: 30 } },
  ],
}).toArray();
```

##### $not — Negates a condition

```typescript
const result = await users.find({
  age: { $not: { $gt: 30 } },
}).toArray();
```

##### $nor — None of the conditions must match

```typescript
const result = await users.find({
  $nor: [
    { role: 'admin' },
    { age: { $lt: 18 } },
  ],
}).toArray();
```

#### Array Operators

##### $elemMatch — Matches documents where an array field contains an element matching all specified conditions

```typescript
const orders = db.collection('orders');
await orders.insertOne({
  customer: 'Alice',
  items: [
    { product: 'Widget', qty: 5, price: 10 },
    { product: 'Gadget', qty: 2, price: 25 },
  ],
});

// Find orders with at least one item where qty > 3 AND price < 15
const matched = await orders.find({
  items: { $elemMatch: { qty: { $gt: 3 }, price: { $lt: 15 } } },
}).toArray();
```

### Step 3: Create Indexes

Indexes speed up queries by maintaining sorted data structures over specific fields. Without indexes, every query scans all documents in the collection. BrightDB supports single-field, compound, and unique indexes.

#### Single-Field Index

Create an index on a single field for fast lookups:

```typescript
await users.createIndex({ email: 1 });
// Queries on { email: '...' } now use the index
```

The value `1` means ascending order; `-1` means descending.

#### Compound Index

Index multiple fields together. The field order matters — queries that match the index prefix benefit most:

```typescript
await users.createIndex({ role: 1, age: -1 });
// Efficient for: { role: 'developer' }
// Efficient for: { role: 'developer', age: { $gte: 25 } }
// Less efficient for: { age: { $gte: 25 } } alone (no prefix match)
```

#### Unique Index

Enforce uniqueness on a field or combination of fields:

```typescript
await users.createIndex({ email: 1 }, { unique: true });

// This succeeds:
await users.insertOne({ name: 'Alice', email: 'alice@example.com' });

// This throws DuplicateKeyError:
await users.insertOne({ name: 'Bob', email: 'alice@example.com' });
```

#### Performance Guidance

- Create indexes on fields you frequently filter, sort, or group by.
- Compound indexes should list the most selective field first (the field with the most distinct values).
- Unique indexes double as a data integrity constraint — use them for email addresses, usernames, and other natural keys.
- Each index adds overhead to write operations (inserts, updates, deletes must update the index). Only create indexes you actually need.
- List existing indexes with `users.listIndexes()` and drop unused ones with `users.dropIndex('indexName')`.

### Step 4: Transactions

BrightDB supports multi-document transactions through the `DbSession` API. Transactions group multiple operations into an atomic unit — either all operations commit, or all are rolled back.

#### Manual Transaction Control

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

const accounts = db.collection('accounts');
await accounts.insertOne({ owner: 'Alice', balance: 1000 });
await accounts.insertOne({ owner: 'Bob', balance: 500 });

// Start a session and begin a transaction
const session = db.startSession();
session.startTransaction();

try {
  // Transfer 200 from Alice to Bob
  await accounts.updateOne(
    { owner: 'Alice' },
    { $inc: { balance: -200 } },
    { session },
  );
  await accounts.updateOne(
    { owner: 'Bob' },
    { $inc: { balance: 200 } },
    { session },
  );

  // Commit — both updates are applied atomically
  await session.commitTransaction();
} catch (error) {
  // Abort — neither update is applied
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}

// Verify the transfer
const alice = await accounts.findOne({ owner: 'Alice' });
const bob = await accounts.findOne({ owner: 'Bob' });
console.log(alice?.balance); // 800
console.log(bob?.balance);   // 700
```

#### Convenience Helper

For simpler cases, `withTransaction` handles the commit/abort/endSession lifecycle automatically:

```typescript
await db.withTransaction(async (session) => {
  const orders = db.collection('orders');
  const inventory = db.collection('inventory');

  await orders.insertOne(
    { product: 'Widget', qty: 10, status: 'placed' },
    { session },
  );
  await inventory.updateOne(
    { product: 'Widget' },
    { $inc: { stock: -10 } },
    { session },
  );
  // Commits automatically on success; aborts on thrown error
});
```

### Step 5: Aggregation Pipeline

The aggregation pipeline processes documents through a sequence of stages. Each stage transforms the document set and passes the result to the next stage. BrightDB supports 10 pipeline stages.

```typescript
const results = await users.aggregate([
  { $match: { role: 'developer' } },
  { $group: { _id: '$department', count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
  { $sort: { count: -1 } },
]);
```

#### $match — Filter documents

Filters documents using the same query syntax as `find`:

```typescript
{ $match: { age: { $gte: 25 }, role: 'developer' } }
```

Place `$match` early in the pipeline to reduce the number of documents processed by later stages.

#### $group — Group and aggregate

Groups documents by a key and computes aggregate values. Supported accumulators: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`.

```typescript
{ $group: { _id: '$role', total: { $sum: 1 }, avgAge: { $avg: '$age' } } }
// Output: [{ _id: 'developer', total: 3, avgAge: 28 }, ...]
```

Use `_id: null` to aggregate across all documents:

```typescript
{ $group: { _id: null, totalUsers: { $sum: 1 } } }
```

#### $sort — Order documents

```typescript
{ $sort: { age: -1 } }       // Descending by age
{ $sort: { role: 1, age: -1 } } // Ascending role, then descending age
```

#### $limit — Cap the number of documents

```typescript
{ $limit: 10 }
```

#### $skip — Skip a number of documents

```typescript
{ $skip: 20 }
```

Combine `$skip` and `$limit` for pagination:

```typescript
[
  { $sort: { createdAt: -1 } },
  { $skip: 20 },
  { $limit: 10 },
]
```

#### $project — Reshape documents

Include, exclude, or compute fields:

```typescript
{ $project: { name: 1, role: 1, _id: 0 } }
// Output: [{ name: 'Alice', role: 'admin' }, ...]
```

#### $unwind — Deconstruct arrays

Produces one document per array element:

```typescript
// Given: { name: 'Alice', tags: ['admin', 'developer'] }
{ $unwind: '$tags' }
// Output: [{ name: 'Alice', tags: 'admin' }, { name: 'Alice', tags: 'developer' }]
```

Preserve documents with empty or missing arrays:

```typescript
{ $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }
```

#### $count — Count documents

Replaces the document set with a single document containing the count:

```typescript
{ $count: 'totalDevelopers' }
// Output: [{ totalDevelopers: 42 }]
```

#### $addFields — Add computed fields

Adds new fields or overwrites existing ones without removing other fields:

```typescript
{ $addFields: { fullName: { $concat: ['$firstName', ' ', '$lastName'] } } }
```

#### $lookup — Join collections

Performs a left outer join with another collection:

```typescript
{
  $lookup: {
    from: 'orders',       // The collection to join
    localField: '_id',    // Field from the input documents
    foreignField: 'userId', // Field from the 'orders' collection
    as: 'userOrders',     // Output array field
  }
}
// Each user document gets a 'userOrders' array with their matching orders
```

#### Full Pipeline Example

```typescript
const salesReport = await db.collection('orders').aggregate([
  { $match: { status: 'completed', createdAt: { $gte: '2024-01-01' } } },
  { $unwind: '$items' },
  { $group: {
      _id: '$items.product',
      totalRevenue: { $sum: '$items.price' },
      unitsSold: { $sum: '$items.qty' },
    },
  },
  { $addFields: { avgPrice: { $avg: '$items.price' } } },
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 },
  { $project: { product: '$_id', totalRevenue: 1, unitsSold: 1, _id: 0 } },
]);
```

### Step 6: Express Middleware

BrightDB ships with `createDbRouter`, an Express middleware that exposes your collections as a REST API. This is the foundation of the BrightStack paradigm — see [Building a dApp](/docs/walkthroughs/05-building-a-dapp) for a full tutorial.

```typescript
import express from 'express';
import { BrightDb, InMemoryDatabase, createDbRouter } from '@brightchain/db';

const app = express();
app.use(express.json());

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

// Mount the DB router — all collections are now accessible via REST
app.use('/api/db', createDbRouter(db));

app.listen(3000, () => console.log('BrightDB REST API on :3000'));
```

#### REST Endpoints

The router exposes the following endpoints for each collection:

| Method   | Path                              | Description                          |
|----------|-----------------------------------|--------------------------------------|
| `GET`    | `/:collection`                    | Find documents (query params filter) |
| `GET`    | `/:collection/:id`               | Find document by ID                  |
| `POST`   | `/:collection`                    | Insert one document                  |
| `POST`   | `/:collection/find`              | Rich find (body: filter, sort, limit, skip, projection) |
| `POST`   | `/:collection/aggregate`         | Aggregation pipeline (body: pipeline)|
| `PUT`    | `/:collection/:id`               | Replace document                     |
| `PATCH`  | `/:collection/:id`               | Update with operators                |
| `DELETE` | `/:collection/:id`               | Delete document by ID                |
| `POST`   | `/:collection/insertMany`        | Bulk insert                          |
| `POST`   | `/:collection/updateMany`        | Bulk update                          |
| `POST`   | `/:collection/deleteMany`        | Bulk delete                          |
| `POST`   | `/:collection/count`             | Count documents                      |
| `POST`   | `/:collection/distinct`          | Distinct values                      |
| `POST`   | `/:collection/indexes`           | Create index                         |
| `DELETE` | `/:collection/indexes/:name`     | Drop index                           |
| `GET`    | `/:collection/indexes`           | List indexes                         |
| `POST`   | `/:collection/bulkWrite`         | Bulk write operations                |

#### Restricting Access

Use the `allowedCollections` option to limit which collections are exposed:

```typescript
app.use('/api/db', createDbRouter(db, {
  allowedCollections: ['users', 'orders'],
  maxResults: 500,
}));
// Only 'users' and 'orders' are accessible; other collection names return 403
```

### Step 7: Change Streams

Change streams let you subscribe to real-time insert, update, replace, and delete events on a collection. Call `collection.watch(listener)` to register a listener — it returns an unsubscribe function.

```typescript
const users = db.collection('users');

// Subscribe to changes
const unsubscribe = users.watch((event) => {
  console.log(`[${event.operationType}] on ${event.ns.coll}`);
  console.log('  Document key:', event.documentKey._id);

  if (event.operationType === 'insert' || event.operationType === 'replace') {
    console.log('  Full document:', event.fullDocument);
  }

  if (event.operationType === 'update') {
    console.log('  Updated fields:', event.updateDescription?.updatedFields);
    console.log('  Removed fields:', event.updateDescription?.removedFields);
  }
});

// Trigger some changes
await users.insertOne({ name: 'Eve', role: 'analyst' });
// Logs: [insert] on users
//        Document key: abc123...
//        Full document: { _id: 'abc123...', name: 'Eve', role: 'analyst' }

await users.updateOne({ name: 'Eve' }, { $set: { role: 'lead analyst' } });
// Logs: [update] on users
//        Document key: abc123...
//        Updated fields: { role: 'lead analyst' }

// Stop listening when done
unsubscribe();
```

#### Change Event Shape

Every event includes:

| Field               | Type                | Description                                      |
|---------------------|---------------------|--------------------------------------------------|
| `operationType`     | `'insert' \| 'update' \| 'replace' \| 'delete'` | What happened          |
| `documentKey`       | `{ _id: string }`  | The affected document's ID                       |
| `fullDocument`      | `T \| undefined`   | The full document (present on insert and replace) |
| `updateDescription` | `object \| undefined` | Updated/removed fields (present on update)     |
| `ns`                | `{ db, coll }`     | Namespace (database and collection name)         |
| `timestamp`         | `Date`             | When the event occurred                          |

Change streams are useful for building reactive UIs, audit logs, cache invalidation, and real-time sync between services.

### Step 8: How Documents Are Stored Under the Hood

When you call `insertOne`, BrightDB doesn't just write a JSON blob to disk. Every document goes through the Owner-Free Filesystem (OFF) whitening process, which provides plausible deniability at the storage layer.

#### The Whitening Process

1. **Serialization** — The document is serialized to a binary representation (a Content Block List, or CBL).
2. **TUPLE creation** — The serialized data is XOR'd with two random blocks of the same size, producing a three-block TUPLE: the data block and two randomizer blocks.
3. **Storage** — All three blocks are written to the block store. Each block is individually indistinguishable from random noise.
4. **Head pointer** — The collection's head registry records the block ID of the CBL so the document can be reconstructed later.

```
Document (JSON)
     │
     ▼
Serialize to CBL
     │
     ▼
XOR with Randomizer A and Randomizer B
     │
     ├──► Data Block      → block store
     ├──► Randomizer A    → block store
     └──► Randomizer B    → block store
```

#### Reconstruction

To read a document back, BrightDB:

1. Looks up the CBL block ID from the head registry
2. Retrieves all three TUPLE blocks from the store
3. XOR's them together to recover the original CBL
4. Deserializes the CBL back into a document object

This process is completely transparent — the `Collection` API handles serialization, whitening, and reconstruction automatically. You interact with plain JavaScript objects; the OFF layer handles the rest.

#### Pool-Scoped Whitening

When using a `PooledStoreAdapter`, all three TUPLE blocks land in the same pool. This ensures that deleting a pool removes the complete TUPLE (no orphaned randomizer blocks), and encrypted pools encrypt all three blocks with the same key. See [Storage Pools](/docs/walkthroughs/03-storage-pools) for details.

#### Why This Matters

- **Plausible deniability** — No single block reveals its contents. An observer with access to the block store sees only random-looking data.
- **Integrity** — Each block is content-addressed (its ID is its hash), so tampering is detectable.
- **Deduplication** — Identical randomizer blocks can be shared across documents, reducing storage overhead in large datasets.

## Troubleshooting

### insertOne fails with DuplicateKeyError

- You have a unique index on a field and the value already exists. Check existing documents with `findOne` before inserting, or use `updateOne` with `{ upsert: true }`.

### Query returns no results when documents exist

- Check operator syntax — `{ age: { $gt: 30 } }` is correct; `{ age: { gt: 30 } }` (missing `$`) silently matches nothing.
- Field names are case-sensitive: `{ Name: 'Alice' }` won't match `{ name: 'Alice' }`.
- If using `$regex`, ensure the pattern is a `RegExp` object or a valid regex string.

### Transaction abortTransaction throws after commitTransaction

- Once a transaction is committed, it cannot be aborted. The `withTransaction` helper handles this automatically — prefer it over manual session management.

### Aggregation $lookup returns empty arrays

- Verify the `from` collection name matches exactly (case-sensitive).
- Ensure `localField` and `foreignField` contain matching values — type mismatches (string vs number) cause empty joins.

### Express middleware returns 403

- The `allowedCollections` option is set and the requested collection is not in the list. Add the collection name to the array or remove the restriction.

For more detailed troubleshooting, see the [Troubleshooting & FAQ](/docs/walkthroughs/06-troubleshooting-faq) guide.

## Next Steps

- [Building a dApp](/docs/walkthroughs/05-building-a-dapp) — Build a full-stack decentralized application on BrightStack using BrightDB as the data layer.
- [Storage Pools](/docs/walkthroughs/03-storage-pools) — Isolate application data with pool namespaces and encryption.
- [Architecture Overview](/docs/walkthroughs/00-architecture-overview) — Review the TUPLE storage model and how BrightDB fits into the broader system.
