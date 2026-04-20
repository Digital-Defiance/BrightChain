---
title: "MERN to BrightStack Migration"
parent: "Guides"
nav_order: 22
---
# MERN to BrightStack Migration

| Field | Value |
|-------|-------|
| Prerequisites | Familiarity with MERN stack (MongoDB, Express, React, Node.js) |
| Estimated Time | 10 minutes (reference) |
| Difficulty | Beginner |

## Introduction

BrightStack is a drop-in replacement for the MERN stack. Where MERN uses MongoDB as its database layer, BrightStack uses BrightDB — a MongoDB-compatible document database backed by content-addressable block storage. The rest of the stack stays the same: Express for your API, React for your frontend, and Node.js as the runtime.

If you have an existing MERN application, you can migrate it to BrightStack incrementally — one collection at a time — without rewriting your application logic. BrightDB provides the same collection-based API you already know (insertOne, findOne, updateOne, deleteOne, aggregate, and more), so most of your data access code transfers directly.

Key differences from MERN:

- **No external database server** — BrightDB runs in-process. There is no `mongod` to install, configure, or manage.
- **No connection strings** — Instead of a `mongodb://` URI, you initialize a local block store. No network round-trips for database operations.
- **Content-addressable storage** — Every document is stored as a content-addressed block, giving you built-in data integrity verification.
- **Two storage modes** — `InMemoryDatabase` for development and testing; `LocalDiskStore` with `PersistentHeadRegistry` for production persistence.
- **Same collection API** — After initialization, the collection interface (`insertOne`, `find`, `updateOne`, etc.) is functionally equivalent to the MongoDB driver.

For a full standalone setup walkthrough, see the [BrightStack Standalone Setup](./05-brightstack-standalone.md) guide. For multi-node replication, see the [BrightStack Private Cluster](./06-brightstack-private-cluster.md) guide.

## Connection Comparison

The biggest change when migrating from MongoDB to BrightDB is how you connect to the database. MongoDB requires an external server and a connection string. BrightDB uses a local block store — no server, no connection string, no network.

### MongoDB (Before)

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('myapp');
const users = db.collection('users');
```

With MongoDB you need:
- A running `mongod` process (or a hosted service like Atlas)
- A connection string with host, port, and optional authentication
- Network connectivity between your application and the database server
- Connection pool management and reconnection logic

### BrightDB (After)

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, { name: 'myapp', dataDir: './data' });
await db.connect();
const users = db.collection('users');
```

With BrightDB:
- **No external server** — the database runs in your application process
- **No connection string** — you pass a block store instance directly
- **No network dependency** — all operations are local
- `InMemoryDatabase` is ideal for development and testing; swap to `LocalDiskStore` with `PersistentHeadRegistry` for production persistence (see the [Standalone Setup guide](./05-brightstack-standalone.md#2-block-store-configuration) for details)

### Side-by-Side Summary

| Aspect | MongoDB | BrightDB |
|--------|---------|----------|
| Server required | Yes (`mongod` or hosted) | No (in-process) |
| Connection method | URI string (`mongodb://...`) | Block store instance |
| Network dependency | Yes | No |
| Install | `npm install mongodb` | `npm install @brightchain/db` |
| Dev storage | MongoDB server | `InMemoryDatabase` |
| Production storage | MongoDB server with replica set | `LocalDiskStore` + `PersistentHeadRegistry` |
| Collection access | `db.collection('name')` | `db.collection('name')` |
| Connection cleanup | `await client.close()` | No cleanup needed |

## Method Mapping

The table below maps each common MongoDB driver method to its BrightDB equivalent. In most cases the method name and signature are identical — the main differences are in connection setup and change streams.

| Operation | MongoDB Driver | BrightDB | Notes |
|-----------|---------------|----------|-------|
| Connect | `MongoClient.connect()` | `BrightDb.connect()` | BrightDB connects to a local block store, not a remote server |
| Insert one | `collection.insertOne(doc)` | `collection.insertOne(doc)` | Identical signature |
| Find one | `collection.findOne(filter)` | `collection.findOne(filter)` | Identical signature |
| Find many | `collection.find(filter)` | `collection.find(filter)` | Returns a `Cursor` with `.sort()`, `.skip()`, `.limit()`, `.toArray()` |
| Update one | `collection.updateOne(filter, update)` | `collection.updateOne(filter, update)` | Identical signature |
| Update many | `collection.updateMany(filter, update)` | `collection.updateMany(filter, update)` | Identical signature |
| Delete one | `collection.deleteOne(filter)` | `collection.deleteOne(filter)` | Identical signature |
| Delete many | `collection.deleteMany(filter)` | `collection.deleteMany(filter)` | Identical signature |
| Aggregate | `collection.aggregate(pipeline)` | `collection.aggregate(pipeline)` | 14 supported stages; see the [Standalone guide](./05-brightstack-standalone.md#10-aggregation-pipeline) |
| Create index | `collection.createIndex(spec, options)` | `collection.createIndex(spec, options)` | Supports single-field, compound, unique, sparse, and TTL indexes |
| Watch changes | `collection.watch()` | `collection.watch(listener)` | BrightDB accepts a callback and returns an unsubscribe function (not a change stream cursor) |

### Connect

```typescript
// MongoDB
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('myapp');
```

```typescript
// BrightDB
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, { name: 'myapp', dataDir: './data' });
await db.connect();
```

### CRUD Operations

CRUD methods share the same names and accept the same arguments. Your existing data-access code transfers directly.

```typescript
// MongoDB
const result = await users.insertOne({ name: 'Ada', email: 'ada@example.com' });
const user = await users.findOne({ email: 'ada@example.com' });
await users.updateOne({ email: 'ada@example.com' }, { $set: { role: 'admin' } });
await users.deleteOne({ email: 'ada@example.com' });
```

```typescript
// BrightDB — identical calls
const result = await users.insertOne({ name: 'Ada', email: 'ada@example.com' });
const user = await users.findOne({ email: 'ada@example.com' });
await users.updateOne({ email: 'ada@example.com' }, { $set: { role: 'admin' } });
await users.deleteOne({ email: 'ada@example.com' });
```

### Find with Cursor

Both drivers return a cursor from `find()`. The chaining API is the same.

```typescript
// MongoDB
const docs = await users.find({ role: 'admin' })
  .sort({ name: 1 })
  .skip(0)
  .limit(10)
  .toArray();
```

```typescript
// BrightDB — identical chaining
const docs = await users.find({ role: 'admin' })
  .sort({ name: 1 })
  .skip(0)
  .limit(10)
  .toArray();
```

### Aggregation

Pipeline syntax is the same. Pass an array of stage objects.

```typescript
// MongoDB
const report = await orders.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
]).toArray();
```

```typescript
// BrightDB — identical pipeline
const report = await orders.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
]);
```

### Watch (Change Streams)

This is the one method with a different calling convention. MongoDB returns a change stream cursor you iterate over. BrightDB accepts a listener callback and returns an unsubscribe function.

```typescript
// MongoDB — change stream cursor
const changeStream = users.watch();
changeStream.on('change', (event) => {
  console.log('Change:', event.operationType, event.fullDocument);
});
// Later: await changeStream.close();
```

```typescript
// BrightDB — callback + unsubscribe
const unsubscribe = users.watch((event) => {
  console.log('Change:', event.type, event.document);
});
// Later: unsubscribe();
```

## Schema Comparison

MongoDB itself is schemaless. Most MERN applications use Mongoose to add schema validation on the application side. BrightDB has built-in schema validation via `CollectionSchema` — no additional ODM library required.

### Mongoose Schema vs BrightDB CollectionSchema

```typescript
// Mongoose
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, match: /^[^@]+@[^@]+$/ },
  age: { type: Number, min: 0, max: 150 },
  role: { type: String, enum: ['admin', 'developer', 'designer'] },
});

const User = model('User', userSchema);
```

```typescript
// BrightDB
import { CollectionSchema, Model, BrightDb, InMemoryDatabase } from '@brightchain/db';

const userSchema: CollectionSchema = {
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', pattern: '^[^@]+@[^@]+$' },
    age: { type: 'number', minimum: 0, maximum: 150 },
    role: { type: 'string', enum: ['admin', 'developer', 'designer'] },
  },
  required: ['name', 'email'],
};

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, { name: 'myapp', dataDir: './data' });
await db.connect();
const users = db.collection('users');
const UserModel = new Model(users, userSchema);
```

### Field Type Mapping

| Mongoose Type | BrightDB `FieldSchema` type | Constraint Equivalents |
|---------------|----------------------------|----------------------|
| `String` | `'string'` | `minLength`, `maxLength`, `pattern`, `enum` |
| `Number` | `'number'` | `minimum`, `maximum` |
| `Boolean` | `'boolean'` | — |
| `Date` | `'string'` (ISO 8601) | `pattern` for format validation |
| `Array` | `'array'` | `items` for element schema |
| `Object` (nested) | `'object'` | `properties`, `required` |
| `Schema.Types.Mixed` | No type constraint | Omit `type` or use permissive schema |

### Validation Comparison

Mongoose validates on `.save()` or `.validate()`. BrightDB validates on every write through the `Model` wrapper.

```typescript
// Mongoose — validation error
try {
  const user = new User({ name: '', email: 'bad' });
  await user.save();
} catch (err) {
  // err.name === 'ValidationError'
  // err.errors.email.message contains the failure reason
}
```

```typescript
// BrightDB — validation error
import { ValidationError } from '@brightchain/db';

try {
  await UserModel.insertOne({ name: '', email: 'bad' });
} catch (err) {
  if (err instanceof ValidationError) {
    // err.code === 121 (MongoDB-compatible error code)
    // err.errors contains field-level details
    console.error(err.errors);
  }
}
```

### Nested Objects and Arrays

Both Mongoose and BrightDB support nested schemas. The syntax differs but the capability is equivalent.

```typescript
// Mongoose — nested schema
const orderSchema = new Schema({
  userId: { type: String, required: true },
  items: [{
    product: { type: String, required: true },
    qty: { type: Number, min: 1 },
    price: { type: Number, min: 0 },
  }],
  status: { type: String, enum: ['placed', 'completed', 'cancelled'] },
});
```

```typescript
// BrightDB — nested CollectionSchema
const orderSchema: CollectionSchema = {
  properties: {
    userId: { type: 'string', minLength: 1 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product: { type: 'string', minLength: 1 },
          qty: { type: 'number', minimum: 1 },
          price: { type: 'number', minimum: 0 },
        },
        required: ['product'],
      },
    },
    status: { type: 'string', enum: ['placed', 'completed', 'cancelled'] },
  },
  required: ['userId'],
};
```

### Key Differences Summary

| Aspect | Mongoose | BrightDB CollectionSchema |
|--------|----------|--------------------------|
| Library | Separate package (`mongoose`) | Built into `@brightchain/db` |
| Schema format | Mongoose `Schema` class | Plain object (`CollectionSchema`) |
| Type syntax | JavaScript constructors (`String`, `Number`) | JSON Schema strings (`'string'`, `'number'`) |
| Required fields | Per-field `required: true` | Top-level `required` array |
| Validation trigger | `.save()` / `.validate()` | Every write through `Model` |
| Error code | Mongoose `ValidationError` | `ValidationError` with code `121` |
| Middleware/hooks | Pre/post hooks on schema | Not applicable — use application-level logic |
| Virtual fields | Supported | Not applicable — compute in application code |

## Route Handler Migration

The good news: your Express route handlers barely change. The collection API is the same — only the database import and initialization differ.

### Before (MongoDB)

```typescript
import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
app.use(express.json());

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('myapp');

app.get('/api/users', async (req, res) => {
  const users = await db.collection('users').find().toArray();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const result = await db.collection('users').insertOne(req.body);
  res.status(201).json(result);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await db.collection('users').findOne({ _id: req.params.id });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.put('/api/users/:id', async (req, res) => {
  const result = await db.collection('users').updateOne(
    { _id: req.params.id },
    { $set: req.body }
  );
  res.json(result);
});

app.delete('/api/users/:id', async (req, res) => {
  const result = await db.collection('users').deleteOne({ _id: req.params.id });
  res.json(result);
});

app.listen(3000);
```

### After (BrightDB)

```typescript
import express from 'express';
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const app = express();
app.use(express.json());

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, { name: 'myapp', dataDir: './data' });
await db.connect();

app.get('/api/users', async (req, res) => {
  const users = await db.collection('users').find().toArray();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const result = await db.collection('users').insertOne(req.body);
  res.status(201).json(result);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await db.collection('users').findOne({ _id: req.params.id });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.put('/api/users/:id', async (req, res) => {
  const result = await db.collection('users').updateOne(
    { _id: req.params.id },
    { $set: req.body }
  );
  res.json(result);
});

app.delete('/api/users/:id', async (req, res) => {
  const result = await db.collection('users').deleteOne({ _id: req.params.id });
  res.json(result);
});

app.listen(3000);
```

Notice that the route handlers are identical. The only changes are:

1. **Import** — `MongoClient` from `mongodb` becomes `BrightDb` and `InMemoryDatabase` from `@brightchain/db`
2. **Initialization** — A connection string becomes a block store instance
3. **No cleanup** — No `client.close()` needed on shutdown

Everything else — `db.collection()`, `find()`, `insertOne()`, `updateOne()`, `deleteOne()` — stays exactly the same.

## Feature Support Matrix

BrightDB covers the core MongoDB feature set that most web applications rely on. Some advanced features that require distributed infrastructure are not yet available.

### Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| CRUD operations | ✅ Supported | `insertOne`, `findOne`, `find`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `insertMany` |
| Query operators | ✅ Supported | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$not`, `$exists`, `$regex`, and more |
| Aggregation pipeline | ✅ Supported | 14 stages: `$match`, `$group`, `$sort`, `$limit`, `$skip`, `$project`, `$unwind`, `$count`, `$addFields`, `$lookup`, `$replaceRoot`, `$out`, `$sample`, `$facet` |
| Indexes | ✅ Supported | Single-field, compound, unique, sparse, and TTL indexes |
| Transactions | ✅ Supported | `DbSession` manual control and `withTransaction` helper; read-committed isolation |
| Schema validation | ✅ Supported | `CollectionSchema` with field types, required fields, defaults, enums, patterns, nested objects, array items |
| Change streams | ✅ Supported | `collection.watch(listener)` with callback-based API |
| Express middleware | ✅ Supported | `createDbRouter` mounts REST endpoints for collections |

### Not Yet Supported

| Feature | Status | Alternative |
|---------|--------|-------------|
| Replica sets | ❌ Not supported | Use a [private cluster](./06-brightstack-private-cluster.md) with gossip-based replication |
| Sharding | ❌ Not supported | Single-node or private cluster covers most use cases |
| GridFS | ❌ Not supported | Store files on the filesystem and reference paths in documents |
| Geospatial queries | ❌ Not supported | Use a dedicated geospatial library and store results in BrightDB |
| Full-text search with stemming | ❌ Not supported | Use `$regex` for basic text matching, or integrate a search library (e.g., Lunr, MiniSearch) |
| MongoDB wire protocol | ❌ Not supported | BrightDB uses a direct JavaScript API, not a network protocol; existing MongoDB GUI tools will not connect |

If your application relies on an unsupported feature, you can often work around it with application-level logic or a complementary library. The core CRUD, aggregation, indexing, and transaction features cover the vast majority of web application needs.

## Persistence Differences

MongoDB and BrightDB handle data persistence differently. Understanding these differences is critical when planning your migration, especially for production deployments.

### MongoDB

MongoDB is disk-based by default. When you write a document, it is persisted to disk automatically via the WiredTiger storage engine. Data survives process restarts, server reboots, and power failures (with journaling enabled). You don't need to configure anything — persistence is the default behavior.

### BrightDB with InMemoryDatabase

`InMemoryDatabase` stores all blocks in memory. It is fast and requires zero configuration, making it ideal for development and testing. However, all data is lost when the process exits.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

// Ephemeral — data lost on restart
const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, { name: 'myapp', dataDir: './data' });
await db.connect();
```

Use `InMemoryDatabase` when:
- Running tests or prototyping
- Building demos or proof-of-concept applications
- Data does not need to survive a restart

### BrightDB with Persistent Storage

For production, configure `LocalDiskStore` with `PersistentHeadRegistry`. The `PersistentHeadRegistry` tracks collection state (head pointers) on disk, so BrightDB can reconstruct its collections on restart. Combined with a `dataDir`, your data survives process restarts.

```typescript
import { BrightDb, LocalDiskStore, PersistentHeadRegistry } from '@brightchain/db';

// Persistent — data survives restarts
const blockStore = new LocalDiskStore('./data/blocks');
const headRegistry = new PersistentHeadRegistry('./data/heads');
const db = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir: './data',
  headRegistry,
});
await db.connect();
```

Use persistent storage when:
- Deploying to production
- Data must survive application restarts
- You need durability guarantees similar to MongoDB

### Persistence Comparison

| Aspect | MongoDB | BrightDB `InMemoryDatabase` | BrightDB `LocalDiskStore` + `PersistentHeadRegistry` |
|--------|---------|----------------------------|------------------------------------------------------|
| Default behavior | Persists to disk | Ephemeral (in-memory only) | Persists to disk |
| Data survives restart | Yes | No | Yes |
| Configuration required | Minimal (runs out of the box) | None | Specify storage paths |
| Storage location | MongoDB data directory | Process memory | Application-defined `dataDir` |
| Backup strategy | `mongodump` / filesystem snapshots | Not applicable | Copy the `dataDir` directory |
| Best for | All environments | Development and testing | Production |

## Migration Checklist

Use this checklist to convert an existing MERN application to BrightStack. You can migrate incrementally — one collection at a time.

- [ ] **Replace the MongoDB driver** — Uninstall `mongodb` (and `mongoose` if used). Install `@brightchain/db`.
- [ ] **Update database initialization** — Replace `MongoClient` connection logic with `BrightDb` + block store initialization. See [Connection Comparison](#connection-comparison).
- [ ] **Choose a storage backend** — Use `InMemoryDatabase` for development. Configure `LocalDiskStore` + `PersistentHeadRegistry` for production. See [Persistence Differences](#persistence-differences).
- [ ] **Migrate schemas** — Convert Mongoose schemas to `CollectionSchema` objects. See [Schema Comparison](#schema-comparison).
- [ ] **Verify CRUD operations** — Your `insertOne`, `findOne`, `updateOne`, `deleteOne`, `find`, `insertMany`, `updateMany`, `deleteMany` calls should work without changes. See [Method Mapping](#method-mapping).
- [ ] **Update aggregation pipelines** — Verify your pipeline stages are among the [14 supported stages](#feature-support-matrix). Adjust any unsupported stages.
- [ ] **Recreate indexes** — Redefine your indexes using `collection.createIndex()`. BrightDB supports single-field, compound, unique, sparse, and TTL indexes.
- [ ] **Migrate change streams** — Replace MongoDB change stream cursors with BrightDB's callback-based `watch()` API. See [Watch (Change Streams)](#watch-change-streams).
- [ ] **Check for unsupported features** — Review the [Feature Support Matrix](#feature-support-matrix). If your app uses replica sets, sharding, GridFS, geospatial queries, or full-text search with stemming, plan workarounds.
- [ ] **Update environment configuration** — Remove `MONGODB_URI` and related connection environment variables. Add storage path configuration for `LocalDiskStore` if using persistent storage.
- [ ] **Test thoroughly** — Run your existing test suite. The collection API is compatible, but verify edge cases around schema validation and change stream behavior.
- [ ] **Deploy** — For production, ensure you are using `LocalDiskStore` + `PersistentHeadRegistry` with a durable storage path. See the [Standalone Setup guide](./05-brightstack-standalone.md) for deployment recommendations.
