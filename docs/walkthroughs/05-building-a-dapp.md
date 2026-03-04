---
title: "Building a dApp on BrightStack"
parent: "Walkthroughs"
nav_order: 6
permalink: /docs/walkthroughs/05-building-a-dapp/
---
## Troubleshooting

### Express server fails to start
 - Verify that port 3001 (or your chosen port) is not in use: `lsof -i :3001`
 - Ensure all dependencies are installed: `yarn install`
 - Check that `@brightchain/db` is importable: `node -e "require('@brightchain/db')"`

### CORS errors from the React frontend
 - Add CORS middleware to the Express server:

```typescript
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:3000' }));
```

### BrightDB operations fail with "pool not found"
 - Ensure the pool was created before wrapping it with `PooledStoreAdapter`
 - Verify the pool ID matches exactly (case-sensitive)
 - Check pool status: `pooledBlockStore.getPoolStats('app_tasks')`

### Identity signature verification fails
 - Ensure the client and server use the same message format for signing (body + timestamp)
 - Check that the timestamp is within the 30-second window
 - Verify the public key is transmitted correctly (hex-encoded)

### Replication not working across nodes
 - Confirm all nodes have the pool advertised via the discovery service
 - Check that UPnP or manual port forwarding is configured (see [Node Setup](./02-node-setup))
 - Run reconciliation manually to diagnose: `reconciliationService.reconcileWithPeer(peerId, { poolId: 'app_tasks', fullSync: true })`

For more detailed troubleshooting, see the [Troubleshooting & FAQ](./06-troubleshooting-faq) guide.

## Next Steps

 - [Troubleshooting & FAQ](./06-troubleshooting-faq) — Resolve common issues across all walkthroughs.
 - [Storage Pools](./03-storage-pools) — Deep dive into pool encryption modes and cross-node coordination.
 - [Architecture Overview](./00-architecture-overview) — Review the full system architecture and how BrightStack fits in.
title: "Building a dApp on BrightStack"
parent: "Walkthroughs"
nav_order: 6
permalink: /docs/walkthroughs/05-building-a-dapp/
---
# Building a dApp on BrightStack

| Field          | Value                                                                                                          |
|----------------|----------------------------------------------------------------------------------------------------------------|
| Prerequisites  | [Node Setup](./02-node-setup) completed, [BrightDB Usage](./04-brightdb-usage) completed                |
| Estimated Time | 60 minutes                                                                                                     |
| Difficulty     | Advanced                                                                                                       |

## Introduction

BrightStack is the decentralized equivalent of the MERN stack. Where MERN combines MongoDB, Express, React, and Node.js, BrightStack swaps MongoDB for BrightDB — a MongoDB-like document database backed by BrightChain's Owner-Free Filesystem. The rest of the stack stays the same: Express for the API layer, React for the frontend, and Node.js as the runtime. If you have built a MERN app before, you already know most of what you need.

This guide walks you through building a minimal task-management dApp end-to-end: an Express API backed by BrightDB, a React frontend that talks to it, BrightChain identity integration for user authentication, and Storage Pool isolation for application data. By the end you will have a working full-stack decentralized application and a clear understanding of what changes — and what stays the same — when moving from MERN to BrightStack.

## Prerequisites

- Completed the [Node Setup](/docs/walkthroughs/02-node-setup) guide (running BrightChain node)
- Completed the [BrightDB Usage](/docs/walkthroughs/04-brightdb-usage) guide (familiar with CRUD, queries, indexes, transactions, and the Express middleware)
- Familiarity with the [Storage Pools](/docs/walkthroughs/03-storage-pools) guide (pool creation, encryption modes, `PooledStoreAdapter`)
- Familiarity with the [Architecture Overview](/docs/walkthroughs/00-architecture-overview), especially the BrightStack component diagram

## Steps

### Step 1: Understand the BrightStack Paradigm

BrightStack is not a framework — it is a development paradigm. It describes how to build full-stack decentralized applications using familiar web technologies on top of BrightChain's privacy-preserving infrastructure.

The core idea: replace your centralized database with BrightDB, keep everything else.

```
MERN Stack                          BrightStack
──────────                          ───────────
MongoDB       ──► replaced by ──►   BrightDB (on BrightChain block store)
Express       ──► stays the same    Express
React         ──► stays the same    React
Node.js       ──► stays the same    Node.js
```

BrightStack adds three capabilities that MERN does not have out of the box:

- **Plausible deniability** — Documents are stored as whitened TUPLE blocks. No single block reveals its contents.
- **Decentralized identity** — User authentication uses BIP39/32 key derivation instead of passwords stored in a database.
- **Data isolation** — Storage Pools namespace your application data, with optional encryption and cross-node replication.

### Step 2: Set Up the Project Structure

Create a new directory for the dApp and initialize the project:

```bash
mkdir brightstack-tasks && cd brightstack-tasks
mkdir -p server src
```

Your project will have this structure:

```
brightstack-tasks/
├── server/
│   └── index.ts          # Express API server
├── src/
│   └── App.tsx           # React frontend
├── package.json
└── tsconfig.json
```

Initialize the project and install dependencies:

```bash
yarn init -y
yarn add express @brightchain/db @brightchain/brightchain-lib
yarn add -D typescript @types/express @types/node react react-dom @types/react
```

### Step 3: Build the Express API with BrightDB

Create the API server using `createDbRouter` from BrightDB. This middleware exposes your collections as REST endpoints — the same middleware documented in [BrightDB Usage](./04-brightdb-usage).

```typescript
// server/index.ts
import express from 'express';
import {
  BrightDb,
  InMemoryDatabase,
  PooledStoreAdapter,
  createDbRouter,
} from '@brightchain/db';
import type { PoolId } from '@brightchain/brightchain-lib';

const app = express();
app.use(express.json());

async function start() {
  // Create a pool-scoped block store for this application
  const poolId: PoolId = 'app_tasks';
  const blockStore = new InMemoryDatabase();
  const adapter = new PooledStoreAdapter(blockStore, poolId);

  // Initialize BrightDB with the pooled adapter
  const db = new BrightDb(adapter);
  await db.connect();

  // Seed an index for fast lookups
  const tasks = db.collection('tasks');
  await tasks.createIndex({ owner: 1, status: 1 });
  await tasks.createIndex({ createdAt: -1 });

  // Mount the REST API — all collections are now accessible
  app.use('/api/db', createDbRouter(db, {
    allowedCollections: ['tasks', 'users'],
    maxResults: 100,
  }));

  app.listen(3001, () => {
    console.log('BrightStack API running on http://localhost:3001');
  });
}

start().catch(console.error);
```

This gives you a full REST API for the `tasks` and `users` collections. The `createDbRouter` middleware handles all CRUD operations, queries, aggregation, and index management — see the [BrightDB Usage](./04-brightdb-usage) guide for the complete endpoint reference.

### Step 4: Integrate BrightChain Identity for User Authentication

Instead of storing passwords in a database, BrightStack uses BrightChain's identity system based on BIP39 (mnemonic phrases) and BIP32 (hierarchical deterministic key derivation). Each user generates a mnemonic that derives their cryptographic key pair — no central authority holds credentials.

#### Generate a User Identity

```typescript
import {
  BIP39,
  BIP32,
  EphemeralBlockMetadata,
} from '@brightchain/brightchain-lib';

// User generates a mnemonic on first signup (client-side)
const mnemonic = BIP39.generateMnemonic();
// e.g. "abandon ability able about above absent absorb abstract absurd abuse access accident"

// Derive the master key from the mnemonic
const seed = BIP39.mnemonicToSeedSync(mnemonic);
const masterKey = BIP32.fromSeed(seed);

// Derive an application-specific key pair (BIP44 path)
const appKey = masterKey.derivePath("m/44'/0'/0'/0/0");
const publicKey = appKey.publicKey;   // Used as the user's identity
const privateKey = appKey.privateKey; // Kept secret by the user
```

#### Authenticate API Requests

The server verifies requests by checking ECDSA signatures against the user's public key:

```typescript
import { ECDSASignature } from '@brightchain/brightchain-lib';

// Middleware: verify the request signature
function authenticateRequest(req, res, next) {
  const { publicKey, signature, timestamp } = req.headers;

  // Reject stale requests (replay protection)
  const age = Date.now() - Number(timestamp);
  if (age > 30_000) {
    return res.status(401).json({ error: 'Request expired' });
  }

  // Verify the ECDSA signature over the request body + timestamp
  const message = JSON.stringify(req.body) + timestamp;
  const isValid = ECDSASignature.verify(message, signature, publicKey);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.userId = publicKey; // Use the public key as the user identifier
  next();
}

// Protect the tasks API
app.use('/api/db', authenticateRequest, createDbRouter(db));
```

This approach eliminates password databases entirely. The user's mnemonic is their credential — they can recover their identity on any device by re-entering the 12 or 24 words.

### Step 5: Build the React Frontend

Create a React component that interacts with the Express API to manage tasks.

```tsx
// src/App.tsx
import React, { useEffect, useState } from 'react';

interface Task {
  _id: string;
  title: string;
  status: 'todo' | 'done';
  owner: string;
  createdAt: string;
}

const API_BASE = 'http://localhost:3001/api/db';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');

  // Fetch all tasks
  useEffect(() => {
    fetch(`${API_BASE}/tasks`)
      .then((res) => res.json())
      .then(setTasks)
      .catch(console.error);
  }, []);

  // Create a new task
  async function addTask() {
    if (!newTitle.trim()) return;

    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        status: 'todo',
        owner: 'current-user',
        createdAt: new Date().toISOString(),
      }),
    });

    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
    setNewTitle('');
  }

  // Toggle task status
  async function toggleTask(task: Task) {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';

    await fetch(`${API_BASE}/tasks/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ $set: { status: newStatus } }),
    });

    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t)),
    );
  }

  // Delete a task
  async function deleteTask(id: string) {
    await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t._id !== id));
  }

  return (
    <div>
      <h1>BrightStack Task Manager</h1>
      <div>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task..."
          aria-label="New task title"
        />
        <button onClick={addTask}>Add</button>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task._id}>
            <span
              style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none' }}
            >
              {task.title}
            </span>
            <button onClick={() => toggleTask(task)}>
              {task.status === 'todo' ? 'Complete' : 'Undo'}
            </button>
            <button onClick={() => deleteTask(task._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

This is a standard React component — the same code you would write for a MERN app. The only difference is that the data behind the API is stored in BrightDB instead of MongoDB.

### Step 6: End-to-End CRUD Workflow

With the Express API and React frontend in place, here is the complete data flow for each CRUD operation:

#### Create

1. User types a task title and clicks "Add"
2. React sends `POST /api/db/tasks` with the task document
3. `createDbRouter` calls `tasks.insertOne(doc)` on BrightDB
4. BrightDB serializes the document, whitens it into a TUPLE, and stores the blocks in the `app_tasks` pool
5. The API returns the inserted document with its `_id`

#### Read

1. React sends `GET /api/db/tasks` on mount
2. `createDbRouter` calls `tasks.find({}).toArray()`
3. BrightDB reconstructs documents from their TUPLE blocks and returns them
4. React renders the task list

#### Update

1. User clicks "Complete" on a task
2. React sends `PATCH /api/db/tasks/:id` with `{ $set: { status: 'done' } }`
3. `createDbRouter` calls `tasks.updateOne({ _id: id }, update)`
4. BrightDB updates the document and re-whitens the modified blocks

#### Delete

1. User clicks "Delete" on a task
2. React sends `DELETE /api/db/tasks/:id`
3. `createDbRouter` calls `tasks.deleteOne({ _id: id })`
4. BrightDB removes the document's TUPLE blocks from the pool

### Step 7: Isolate Application Data with Storage Pools

In Step 3 we already scoped the block store to the `app_tasks` pool using `PooledStoreAdapter`. This provides several benefits for your dApp:

#### Why Use a Pool?

- **Tenant isolation** — If you host multiple applications on the same BrightChain node, each app gets its own pool. Data never leaks between pools.
**Encryption at rest** — Switch to `PoolShared` encryption mode to encrypt all blocks in the pool with a shared AES-256-GCM key (see [Storage Pools](./03-storage-pools) for details).
- **Clean teardown** — Deleting the pool removes all application data in one operation, including TUPLE randomizer blocks.
- **Quota management** — Monitor and limit storage per application.
All documents stored through this adapter are automatically encrypted. The pool key is distributed to authorized nodes via ECIES key wrapping — see [Storage Pools Step 4](./03-storage-pools) for the full key distribution workflow.

#### Encrypting the Application Pool
3. Configure UPnP or manual port forwarding on each node (see [Node Setup Step 5](./02-node-setup))
For production deployments, enable pool-level encryption:

```typescript
import { EncryptionMode } from '@brightchain/brightchain-lib';
import { PooledStoreAdapter } from '@brightchain/db';

const poolConfig = {
  encryptionMode: EncryptionMode.PoolShared,
  searchableMetadataFields: ['blockSize', 'createdAt'],
};

// Create the pool with encryption enabled
await pooledBlockStore.createPool('app_tasks', poolConfig);

// The adapter works the same way — encryption is transparent
const adapter = new PooledStoreAdapter(pooledBlockStore, 'app_tasks');
const db = new BrightDb(adapter);
await db.connect();
```

All documents stored through this adapter are automatically encrypted. The pool key is distributed to authorized nodes via ECIES key wrapping — see [Storage Pools Step 4](./03-storage-pools) for the full key distribution workflow.

### Step 8: Deploy to a Multi-Node BrightChain Network

Moving from a single development node to a multi-node network involves three steps: configuring pool replication, setting up node discovery, and handling data synchronization.

#### Configure Pool Replication

Enable replication for the application pool so data is available across multiple nodes:

```typescript
const replicationConfig = {
  poolId: 'app_tasks',
  replicationFactor: 3,  // Store data on 3 nodes
  minAvailableReplicas: 2, // At least 2 must be reachable for writes
};

await pooledBlockStore.configureReplication('app_tasks', replicationConfig);
```

#### Set Up Node Discovery

Each node in the network advertises which pools it hosts. New nodes discover peers through the gossip protocol:

```typescript
// On each node — advertise the application pool
const discoveryService = node.poolDiscoveryService;
await discoveryService.advertisePool('app_tasks');

// On a new node joining — find peers hosting the pool
const peers = await discoveryService.discoverPool('app_tasks');
// peers → ['node-a-id', 'node-b-id', 'node-c-id']
```

#### Synchronize Data

When a new node joins the network or recovers from a partition, the reconciliation service fills in missing blocks:

```typescript
const reconciliationService = node.reconciliationService;

// Sync with each known peer
for (const peerId of peers) {
  await reconciliationService.reconcileWithPeer(peerId, {
    poolId: 'app_tasks',
    fullSync: false, // Incremental — only fetch new blocks
  });
}
```

#### Production Deployment Checklist

1. Run at least 3 nodes for redundancy
2. Enable `PoolShared` encryption on the application pool
3. Configure UPnP or manual port forwarding on each node (see [Node Setup Step 5](./02-node-setup))
4. Set `replicationFactor` to at least 3
5. Enable gossip auto-announce so writes propagate immediately
6. Schedule periodic reconciliation to catch any missed blocks
7. Monitor pool health with `pooledBlockStore.getPoolStats('app_tasks')`

### Step 9: MERN vs BrightStack — What Changes and What Stays the Same

If you are coming from the MERN stack, this table summarizes the differences:

| Aspect | MERN | BrightStack | What Changes |
|--------|------|-------------|--------------|
| **Database** | MongoDB | BrightDB (`@brightchain/db`) | Swap the driver. The query API is nearly identical. |
| **API Framework** | Express | Express | Nothing. Same middleware, same routing. |
| **Frontend** | React | React | Nothing. Same components, same hooks. |
| **Runtime** | Node.js | Node.js | Nothing. Same runtime, same ecosystem. |
| **Data Storage** | BSON documents on disk | Whitened TUPLE blocks in the OFF system | Documents are XOR'd with randomizers for plausible deniability. |
| **Authentication** | Passwords + bcrypt + JWT | BIP39/32 key derivation + ECDSA signatures | No password database. Users hold their own keys. |
| **Data Isolation** | Separate MongoDB databases | Storage Pools with `PooledStoreAdapter` | Pools provide namespace isolation with optional encryption. |
| **Replication** | MongoDB replica sets | BrightChain gossip + reconciliation | Decentralized — no primary/secondary distinction. |
| **Encryption** | Application-level or MongoDB Enterprise | Pool-level AES-256-GCM (PoolShared mode) | Built into the storage layer, transparent to the application. |
| **REST Middleware** | Custom route handlers | `createDbRouter` from `@brightchain/db` | One-line setup exposes full CRUD + aggregation. |
| **Deployment** | MongoDB Atlas / self-hosted | Multi-node BrightChain network | Run your own nodes instead of relying on a cloud provider. |

The key takeaway: Express, React, and Node.js are unchanged. The database layer is the primary difference, and BrightDB's API is designed to feel familiar to MongoDB users. The biggest conceptual shifts are around identity (key-based instead of password-based) and storage (whitened blocks instead of plain documents).

## Troubleshooting

### Express server fails to start

- Verify that port 3001 (or your chosen port) is not in use: `lsof -i :3001`
- Ensure all dependencies are installed: `yarn install`
- Check that `@brightchain/db` is importable: `node -e "require('@brightchain/db')"`

### CORS errors from the React frontend

- Add CORS middleware to the Express server:

```typescript
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:3000' }));
```

### BrightDB operations fail with "pool not found"

- Ensure the pool was created before wrapping it with `PooledStoreAdapter`
- Verify the pool ID matches exactly (case-sensitive)
- Check pool status: `pooledBlockStore.getPoolStats('app_tasks')`

### Identity signature verification fails

- Ensure the client and server use the same message format for signing (body + timestamp)
- Check that the timestamp is within the 30-second window
- Verify the public key is transmitted correctly (hex-encoded)

### Replication not working across nodes

- Confirm all nodes have the pool advertised via the discovery service
- Check that UPnP or manual port forwarding is configured (see [Node Setup](./02-node-setup))
- Run reconciliation manually to diagnose: `reconciliationService.reconcileWithPeer(peerId, { poolId: 'app_tasks', fullSync: true })`

For more detailed troubleshooting, see the [Troubleshooting & FAQ](./06-troubleshooting-faq) guide.

## Next Steps

- [Troubleshooting & FAQ](./06-troubleshooting-faq) — Resolve common issues across all walkthroughs.
- [Storage Pools](./03-storage-pools) — Deep dive into pool encryption modes and cross-node coordination.
- [Architecture Overview](./00-architecture-overview) — Review the full system architecture and how BrightStack fits in.
