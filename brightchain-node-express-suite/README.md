# @brightchain/node-express-suite

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The BrightStack parallel to [`@digitaldefiance/node-express-suite`](https://github.com/Digital-Defiance/express-suite). Where the upstream library provides a complete MERN (Mongo, Express, React, Node) backend framework, this library provides the same application architecture backed by BrightChain's content-addressable block store instead of MongoDB - enabling the BrightStack (BrightDB, Express, React, Node) development path.

Part of [BrightChain](https://github.com/Digital-Defiance/BrightChain)

## What is node-express-suite?

`@digitaldefiance/node-express-suite` is an opinionated, secure, extensible Node.js/Express service framework built on Digital Defiance cryptography libraries. It provides complete backend infrastructure including:

- JWT authentication with mnemonic and ECIES crypto auth
- Role-based access control (RBAC)
- Dynamic model registry for extensible document schemas
- Plugin-based database architecture (`IDatabasePlugin`)
- Service container with base service classes
- Multi-language i18n support
- Email token workflows (verification, password reset, recovery)
- ECIES encryption/decryption and PBKDF2 key derivation
- Decorator-based controller API with automatic OpenAPI generation
- Transaction management, session adapters, and middleware pipeline
- Runtime configuration registry

All of this is built around MongoDB/Mongoose as the storage layer.

## What does this library do?

`@brightchain/node-express-suite` replaces the MongoDB/Mongoose storage layer with BrightChain's content-addressable block store while preserving the upstream's application architecture, plugin system, service patterns, and API contracts. Every Mongoose-specific component has a BrightDB parallel:

| Upstream (MERN) | BrightStack | Role |
|---|---|---|
| `MongoBaseService` | `BrightDbBaseService` | Base class for database-aware services |
| `MongooseCollection` | `BrightDbCollection` | Collection adapter implementing `ICollection` |
| `MongooseDocumentStore` | `BlockDocumentStore` | Document store with Mongoose-compatible query API |
| `MongooseSessionAdapter` | `BrightChainSessionAdapter` | JWT session management |
| `MongoDatabasePlugin` | `BrightDbDatabasePlugin` | `IDatabasePlugin` implementation for app lifecycle |
| `MongoAuthenticationProvider` | `BrightDbAuthenticationProvider` | User lookup and JWT verification |
| `ModelRegistry` | `BrightDbModelRegistry` | Singleton collection registration |
| `TransactionManager` | `BrightDbTransactionManager` | Transaction lifecycle with retry/timeout |
| `BaseEnvironment` + `.mongo` | `BrightDbEnvironment` | Environment config with block store settings |
| `IMongoApplication` | `IBrightDbApplication` | Typed application interface |

This means code written against the upstream's service patterns, plugin architecture, and controller decorators works with BrightDB by swapping the database layer - the Express infrastructure, auth, i18n, RBAC, and middleware all carry over from upstream.

## What BrightStack adds beyond the upstream

Beyond the 1:1 Mongoose replacements, this library adds capabilities unique to BrightChain:

- Content-addressable storage where document identity is derived from content (SHA3-512)
- BrightTrust-based document encryption via `BrightTrustService` - documents are sealed so that multiple members must cooperate to decrypt
- Per-document access control with `hasAccess()`, `findAccessibleBy()`, and `findByIdDecrypted()`
- Multiple storage backends: local disk, in-memory (dev/test), Azure Blob Storage, and Amazon S3
- Block-level deduplication - identical documents are stored once

## Architecture

```
@digitaldefiance/node-express-suite    (upstream MERN framework)
        |
        | extends
        v
@brightchain/node-express-suite        (this library - BrightStack database layer)
        |
        | extends
        v
@brightchain/brightchain-api-lib       (domain-specific BrightChain API)
```

The upstream provides the Express application skeleton, plugin system, auth, i18n, decorators, and middleware. This library slots in the BrightDB database layer. Domain-specific code (member stores, energy accounts, etc.) lives in `brightchain-api-lib` which extends this library further.

## Installation

```bash
yarn add @brightchain/node-express-suite
```

### Peer Dependencies

```json
{
  "@digitaldefiance/branded-interface": "^0.0.5",
  "@digitaldefiance/node-ecies-lib": "^5.1.4",
  "@digitaldefiance/node-express-suite": "^4.26.10",
  "@brightchain/brightchain-lib": "*",
  "@brightchain/db": "^0.29.24"
}
```

## Quick Start

### Basic Application Setup

```typescript
import {
  BrightDbApplication,
  BrightDbEnvironment,
  configureBrightDbApp,
} from '@brightchain/node-express-suite';

// Environment reads from .env / process.env
const environment = new BrightDbEnvironment();

// Create application (extends upstream Application)
const app = new BrightDbApplication(environment);

// Register the BrightDB database plugin
const { plugin } = configureBrightDbApp(app, environment);

// Connect - no URI needed, uses environment-based block store config
await plugin.connect();

// Start the Express server
await app.start();
```

### Database Initialization

```typescript
import { brightchainDatabaseInit } from '@brightchain/node-express-suite';

const result = await brightchainDatabaseInit(environment, {
  modelRegistrations: async (db, blockStore) => {
    // Register domain-specific collections here
    const users = db.collection('users');
    const projects = db.collection('projects');
  },
});

if (result.success) {
  const { blockStore, db } = result.backend; // db is a BrightDb instance
  console.log('BrightDB connected');
}
```

## Core Components

### BrightDbEnvironment

Extends the upstream `BaseEnvironment` with BrightDB-specific configuration parsed from environment variables:

| Variable | Type | Default | Description |
|---|---|---|---|
| `BRIGHTCHAIN_BLOCKSTORE_PATH` | `string` | - | Path to the on-disk block store |
| `BRIGHTCHAIN_BLOCKSIZE_BYTES` | `string` | `Medium` | Comma-separated block sizes |
| `BRIGHTCHAIN_BLOCKSTORE_TYPE` | `string` | `disk` | Storage backend: `disk`, `azure-blob`, `s3` |
| `USE_MEMORY_DOCSTORE` | `boolean` | `false` | Use in-memory store (no persistence) |
| `DEV_DATABASE` | `string` | - | Pool name for ephemeral dev database |
| `MEMBER_POOL_NAME` | `string` | `BrightChain` | Member pool name |

Azure and S3 backends require additional variables - see the `BrightDbEnvironment` class for details.

### BlockDocumentStore

Content-addressable document store backed by BrightChain blocks. Implements a Mongoose-compatible query API so existing code migrates with minimal changes.

```typescript
import { BlockDocumentStore } from '@brightchain/node-express-suite';

const store = new BlockDocumentStore(blockStore);
const users = store.collection('users');

// CRUD operations - same API as Mongoose
await users.create({ name: 'Alice', email: 'alice@example.com' });
const user = await users.findOne({ name: 'Alice' }).exec();
await users.updateOne({ name: 'Alice' }, { email: 'alice@new.com' });
await users.deleteOne({ name: 'Alice' });
```

### Encrypted Documents (BrightTrust Sealing)

Documents can be encrypted using BrightChain's BrightTrust-based sealing, where multiple members must cooperate to decrypt:

```typescript
const store = new BlockDocumentStore(blockStore, BrightTrustService);
const secrets = store.encryptedCollection('secrets');

// Create an encrypted document
await secrets.create(
  { data: 'sensitive payload' },
  {
    encrypt: true,
    agent: sealingMember,
    memberIds: [member1Id, member2Id, member3Id],
    sharesRequired: 2,
  },
);

// Check access
const hasAccess = await secrets.hasAccess(docId, memberHexId);

// Decrypt with sufficient member keys
const decrypted = await secrets.findByIdDecrypted(docId, {
  membersWithPrivateKey: [member1, member2],
});
```

### BrightDbDatabasePlugin

Implements the upstream `IDatabasePlugin` interface for the express-suite plugin architecture:

```typescript
import {
  BrightDbDatabasePlugin,
  BrightDbEnvironment,
} from '@brightchain/node-express-suite';

const plugin = new BrightDbDatabasePlugin(environment);
await plugin.connect(); // No URI - uses environment config

// Access the underlying stores
const blockStore = plugin.blockStore;
const db = plugin.brightDb;

// Cleanup
await plugin.disconnect();
```

### BrightDbModelRegistry

Singleton registry for BrightDB collections, parallel to upstream's `ModelRegistry` for Mongoose models:

```typescript
import {
  BrightDbModelRegistry,
  BrightDbCollection,
} from '@brightchain/node-express-suite';

// Register a collection
BrightDbModelRegistry.instance.register({
  collectionName: 'organizations',
  collection: new BrightDbCollection(db.collection('organizations')),
  schema: orgSchema,
});

// Retrieve anywhere in the app
const orgReg = BrightDbModelRegistry.instance.get('organizations');
```

### BrightDbTransactionManager

Session-based transaction support with retry logic and timeouts:

```typescript
import { BrightDbTransactionManager } from '@brightchain/node-express-suite';

const txMgr = new BrightDbTransactionManager(db, true);

await txMgr.execute(
  async (session) => {
    // Operations within a transaction
    await users.create({ name: 'Bob' });
    await accounts.create({ owner: 'Bob', balance: 0 });
  },
  { maxRetries: 2, timeoutMs: 5000 },
);
```

### BrightChainSessionAdapter

JWT session management backed by BrightDB:

```typescript
import { BrightChainSessionAdapter } from '@brightchain/node-express-suite';

const sessions = new BrightChainSessionAdapter(db);

// Create a session (token is SHA-256 hashed for storage)
const sessionId = await sessions.createSession(memberId, jwtToken, ttlMs);

// Validate a token
const session = await sessions.validateToken(jwtToken);

// Cleanup expired sessions
const removed = await sessions.cleanExpired();
```

### BrightDbAuthenticationProvider

Generic authentication provider with JWT verification and user lookup from BrightDB:

```typescript
import { BrightDbAuthenticationProvider } from '@brightchain/node-express-suite';

const auth = new BrightDbAuthenticationProvider(db, jwtSecret);

const user = await auth.findUserById(userId);
const tokenUser = await auth.verifyToken(jwtToken);
const requestUser = await auth.buildRequestUserDTO(userId);
```

### BrightDbBaseService

Base class for services that need typed access to the BrightDB application:

```typescript
import { BrightDbBaseService } from '@brightchain/node-express-suite';

class ProjectService extends BrightDbBaseService {
  async getProjects() {
    const col = this.application.getModel('projects');
    return col.find({}).exec();
  }
}
```

## Upstream Re-exports

For convenience, this library re-exports key upstream symbols so consumers don't need to depend on `@digitaldefiance/node-express-suite` directly:

- `Application`, `AppRouter`, `createExpressConstants` (classes/functions)
- `IApplication`, `IConstants`, `IAuthenticationProvider`, `IDatabasePlugin`, `IEnvironment` (interfaces)

It also re-exports from `@brightchain/db` (`BrightDb`, `Collection`) and `@brightchain/brightchain-lib` (`BlockSize`, `BlockStoreType`, `IBlockStore`).

## Storage Backends

| Backend | Env Config | Description |
|---|---|---|
| Disk | `BRIGHTCHAIN_BLOCKSTORE_TYPE=disk` | Persistent local storage at `BRIGHTCHAIN_BLOCKSTORE_PATH` |
| Memory | `DEV_DATABASE=<pool-name>` | Ephemeral in-memory store for development/testing |
| Azure Blob | `BRIGHTCHAIN_BLOCKSTORE_TYPE=azure-blob` | Azure Blob Storage (requires `AZURE_STORAGE_*` vars) |
| S3 | `BRIGHTCHAIN_BLOCKSTORE_TYPE=s3` | Amazon S3 (requires `AWS_S3_BUCKET_NAME` and credentials) |

## MERN to BrightStack Migration

See [MIGRATION.md](./MIGRATION.md) for a step-by-step guide to migrate from `@digitaldefiance/node-express-suite` (Mongoose/MongoDB) to `@brightchain/node-express-suite` (BrightDB).

## Testing

A test utility is included for creating in-memory BrightDB instances:

```typescript
import { createTestApp } from '@brightchain/node-express-suite';

const { plugin, environment, teardown } = await createTestApp();

// Use plugin.brightDb for test operations
const db = plugin.brightDb;
const users = db.collection('users');

// Cleanup
await teardown();
```

### Running Tests

```bash
yarn nx test brightchain-node-express-suite
```

## Building

```bash
yarn nx build brightchain-node-express-suite
```

## License

MIT
