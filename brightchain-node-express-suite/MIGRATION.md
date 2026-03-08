# MERN → BERN Migration Guide

Migrate from `@digitaldefiance/node-express-suite` (Mongoose/MongoDB) to `@brightchain/node-express-suite` (BrightDB).

## Quick Reference

| Upstream (MERN) | Suite (BERN) |
|---|---|
| `MongoBaseService` | `BrightDbBaseService` |
| `MongooseCollection` | `BrightDbCollection` |
| `MongooseDocumentStore` | `BlockDocumentStore` |
| `MongooseSessionAdapter` | `BrightChainSessionAdapter` |
| `MongoDatabasePlugin` | `BrightDbDatabasePlugin` |
| `MongoAuthenticationProvider` | `BrightDbAuthenticationProvider` |
| `ModelRegistry` | `BrightDbModelRegistry` |
| `TransactionManager` | `BrightDbTransactionManager` |
| `IMongoApplication` | `IBrightDbApplication` |
| `MongoApplicationConcrete` | `BrightDbApplication` |
| `BaseEnvironment` + `.mongo` | `BrightDbEnvironment` |

## Step-by-Step

### 1. Update dependencies

```json
{
  "dependencies": {
-   "@digitaldefiance/node-express-suite": "...",
+   "@brightchain/node-express-suite": "..."
  },
  "peerDependencies": {
+   "@brightchain/brightchain-lib": "...",
+   "@brightchain/db": "..."
  }
}
```

### 2. Replace imports

```typescript
// Before
import { MongoBaseService, MongoDatabasePlugin } from '@digitaldefiance/node-express-suite';

// After
import { BrightDbBaseService, BrightDbDatabasePlugin } from '@brightchain/node-express-suite';
```

### 3. Replace database plugin

```typescript
// Before
const plugin = new MongoDatabasePlugin(environment);
await plugin.connect(mongoUri);

// After
const plugin = new BrightDbDatabasePlugin(environment);
await plugin.connect(); // No URI needed — uses blockstore config from environment
```

### 4. Replace services

```typescript
// Before
class MyService extends MongoBaseService {
  async getUsers() {
    const model = this.application.getModel('users');
    return model.find({}).exec();
  }
}

// After
class MyService extends BrightDbBaseService {
  async getUsers() {
    const model = this.application.getModel('users');
    return model.find({}).exec();
  }
}
```

### 5. Replace document store

```typescript
// Before
const store = new MongooseDocumentStore(connection);
const users = store.collection('users');

// After
const store = new BlockDocumentStore(blockStore);
const users = store.collection('users');
```

### 6. Replace transactions

```typescript
// Before
const txMgr = new TransactionManager(connection, true);
await txMgr.execute(async (session) => { ... });

// After
const txMgr = new BrightDbTransactionManager(db, true);
await txMgr.execute(async (session) => { ... });
```

### 7. Update environment config

Remove MongoDB URI configuration, add BrightDB blockstore config:

```env
# Remove
# MONGO_URI=mongodb://localhost:27017/mydb

# Add
BRIGHTCHAIN_BLOCKSTORE_PATH=/data/blocks
BRIGHTCHAIN_BLOCKSIZE_BYTES=1024
BRIGHTCHAIN_BLOCKSTORE_TYPE=disk
USE_MEMORY_DOCSTORE=false
```

## Behavioral Differences

| Feature | Mongoose/MongoDB | BrightDB |
|---|---|---|
| Change streams | `collection.watch()` supported | `watch()` supported (in-memory listeners) |
| Transactions | Multi-document ACID via replica set | Session-based with journal replay |
| Estimated count | O(1) via collection metadata | Delegates to `countDocuments()` |
| Text search | Native `$text` operator | In-memory tokenization via text indexes |
| Aggregation | Full MongoDB aggregation pipeline | Subset: `$match`, `$group`, `$sort`, `$limit`, `$skip`, `$project`, `$unwind`, `$lookup`, `$count`, `$addFields`, `$facet` |
| Query operators | Full MongoDB query language | Core operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, `$exists`, `$and`, `$or`, `$not`, `$nor`, `$elemMatch` |
| Indexes | B-tree, compound, TTL, geospatial | In-memory indexes with TTL support |
| Storage | Disk-based with WiredTiger | Content-addressable block store |
| Schema validation | Mongoose schemas | `CollectionSchema` with field-level validation |
