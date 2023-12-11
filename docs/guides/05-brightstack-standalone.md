---
title: "BrightStack Standalone Setup"
parent: "Guides"
nav_order: 20
---
# BrightStack Standalone Setup

| Field | Value |
|-------|-------|
| Prerequisites | Node.js 20+, npm or yarn |
| Estimated Time | 15 minutes |
| Difficulty | Beginner |

## Introduction

BrightStack is a modern web development paradigm combining BrightDB, Express, React, and Node.js — a decentralized alternative to the traditional MERN stack. BrightDB is a MongoDB-compatible document database backed by content-addressable block storage, giving you familiar APIs (collections, queries, indexes, transactions, aggregation pipelines) with built-in data integrity.

**No BrightChain node, network connection, or blockchain participation is required.** This guide walks you through setting up a complete BrightStack application on a single machine using `@brightchain/db` as a standard npm package. You will have a working Express API server with BrightDB-backed collections accessible via REST endpoints by the end of this guide.

## Prerequisites

- **Node.js 20+** — Download from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`
- **npm or yarn** — Comes with Node.js (npm) or install yarn via `npm install -g yarn`
- **A code editor** — VS Code recommended
- **Basic TypeScript knowledge** — All examples use TypeScript

You do **not** need:
- The BrightChain monorepo
- A running BrightChain node
- Any network or blockchain configuration
- Docker or containers

## 1. Project Setup

Create a new directory and initialize a Node.js project:

```bash
mkdir brightstack-app
cd brightstack-app
npm init -y
```

Install the required dependencies:

```bash
npm install @brightchain/db express cors
```

Install TypeScript and type definitions as dev dependencies:

```bash
npm install -D typescript @types/express @types/cors @types/node ts-node
```

Initialize a TypeScript configuration:

```bash
npx tsc --init
```

Update your `tsconfig.json` with these recommended settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create the source directory:

```bash
mkdir src
```

Your project structure should now look like this:

```
brightstack-app/
├── node_modules/
├── src/
├── package.json
└── tsconfig.json
```

Add a start script to your `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Your project is now ready for BrightDB. The next section covers configuring the block store that powers your database.

## 2. Block Store Configuration

BrightDB operates over a content-addressable block store. For standalone use, you have two options depending on your environment:

| Store Type | Use Case | Persistence | Package |
|-----------|----------|-------------|---------|
| `InMemoryDatabase` | Development, testing, prototyping | None (lost on restart) | `@brightchain/db` |
| `BrightDb` with `dataDir` | Production, staging | Disk-based (survives restarts) | `@brightchain/db` |

### InMemoryDatabase (Development)

The `InMemoryDatabase` is a lightweight, ephemeral block store ideal for development and testing. Data exists only in memory and is lost when the process exits.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

// Create an in-memory block store
const blockStore = new InMemoryDatabase();

// Create the database instance
const db = new BrightDb(blockStore);

// Collections are ready to use immediately
const users = db.collection('users');
await users.insertOne({ name: 'Alice', email: 'alice@example.com' });
```

This is the fastest way to get started — no file paths, no directories, no configuration. Perfect for:
- Local development
- Unit and integration tests
- Prototyping new features
- CI/CD pipelines

### Persistent Storage (Production)

For production deployments, you need data to survive application restarts. BrightDB achieves this through the `dataDir` option, which automatically creates a `PersistentHeadRegistry` that tracks collection state on disk.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

// Block store holds the actual document data
const blockStore = new InMemoryDatabase();

// The dataDir option enables persistent head tracking
const db = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir: './data'
});

// Load persisted state from disk (required on startup)
await db.connect();

// Now collections retain their state across restarts
const users = db.collection('users');
```

When you provide `dataDir`, BrightDB automatically:
1. Creates a `PersistentHeadRegistry` that records which block is the "head" of each collection
2. Persists this registry to `{dataDir}/head-registry.json`
3. Reloads the registry on `db.connect()` so collections pick up where they left off

> **Important:** Always call `await db.connect()` before accessing collections when using persistent storage. This loads the saved head pointers from disk.

### PersistentHeadRegistry (Explicit Configuration)

If you need more control over the head registry — for example, to share it across multiple `BrightDb` instances or customize the file name — you can create it explicitly:

```typescript
import { BrightDb, InMemoryDatabase, PersistentHeadRegistry } from '@brightchain/db';

// Create the head registry with explicit options
const headRegistry = new PersistentHeadRegistry({
  dataDir: './data'
});

// Pass it to BrightDb
const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, {
  name: 'myapp',
  headRegistry
});

// Load persisted heads
await db.connect();
```

The `PersistentHeadRegistry` constructor accepts:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataDir` | `string` | (required) | Directory where the registry file is stored |
| `fileName` | `string` | `'head-registry.json'` | Name of the registry file |

### Storage Directory Structure

When using persistent storage with `dataDir: './data'`, BrightDB creates the following structure:

```
data/
├── head-registry.json       # Collection head pointers (which block is current)
└── head-registry.json.lock  # File-level lock for concurrent write protection
```

Key behaviors:
- **Auto-creation:** If the `./data` directory does not exist, it is created automatically on the first write operation. You do not need to create it manually.
- **Graceful start:** If `head-registry.json` does not exist when `db.connect()` is called, the registry starts empty (no crash). This means a fresh deployment works without any seed data.
- **File locking:** The `.lock` file prevents concurrent write corruption when multiple processes share the same data directory.
- **JSON format:** The registry file is human-readable JSON mapping `"dbName:collectionName"` keys to block IDs.

### Choosing Your Configuration

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();

// Development: no persistence, fast startup
const devDb = new BrightDb(blockStore);

// Production: persistent head registry, data survives restarts
const prodDb = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir: process.env.DATA_DIR || './data'
});
await prodDb.connect();
```

Use environment variables to switch between configurations without changing code. In development, omit `dataDir` for a clean slate on every restart. In production, always set `dataDir` to a durable storage path.

## 3. Creating a BrightDB Instance

With your block store configured, create a `BrightDb` instance and start working with collections. A collection is a named group of documents — analogous to a MongoDB collection or a SQL table.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

// 1. Create a block store
const blockStore = new InMemoryDatabase();

// 2. Create the database instance
const db = new BrightDb(blockStore);

// 3. Connect (required for persistent storage; safe to call with in-memory too)
await db.connect();

// 4. Get a collection — created on first use, no upfront schema required
const users = db.collection('users');
const orders = db.collection('orders');
const products = db.collection('products');
```

Collections are created lazily the first time you call `db.collection('name')`. There is no `createCollection` step — just start inserting documents.

> **Tip:** You can create as many collections as you need. Each collection maintains its own document index, so queries on one collection never scan another.

## 4. CRUD Operations

BrightDB's collection API mirrors MongoDB. If you've used the MongoDB Node.js driver, these methods will feel familiar.

### insertOne

Insert a single document into a collection. Returns an object with `acknowledged` and `insertedId`.

```typescript
const result = await users.insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  age: 30,
});

console.log(result.acknowledged); // true
console.log(result.insertedId);   // e.g. 'a1b2c3d4...'
```

If you don't provide an `_id` field, BrightDB generates one automatically.

### findOne

Retrieve a single document matching a filter. Returns the document or `null` if no match is found.

```typescript
const alice = await users.findOne({ name: 'Alice' });
console.log(alice);
// { _id: 'a1b2c3d4...', name: 'Alice', email: 'alice@example.com', role: 'admin', age: 30 }

// Returns null when no document matches
const nobody = await users.findOne({ name: 'Nobody' });
console.log(nobody); // null
```

### updateOne

Update the first document matching a filter. Returns `acknowledged`, `matchedCount`, `modifiedCount`, and `upsertedCount`.

```typescript
const updateResult = await users.updateOne(
  { name: 'Alice' },
  { $set: { role: 'superadmin', department: 'engineering' } }
);

console.log(updateResult.matchedCount);  // 1
console.log(updateResult.modifiedCount); // 1
```

BrightDB supports these update operators:

| Operator | Description |
|----------|-------------|
| `$set` | Set field values |
| `$unset` | Remove fields |
| `$inc` | Increment numeric fields |
| `$push` | Append to an array |
| `$pull` | Remove from an array by condition |
| `$addToSet` | Add to an array only if not already present |
| `$min` | Update field if new value is less than current |
| `$max` | Update field if new value is greater than current |
| `$mul` | Multiply a numeric field |
| `$rename` | Rename a field |
| `$pop` | Remove the first or last element of an array |
| `$currentDate` | Set a field to the current date |

### deleteOne

Delete the first document matching a filter. Returns `acknowledged` and `deletedCount`.

```typescript
const deleteResult = await users.deleteOne({ name: 'Alice' });
console.log(deleteResult.deletedCount); // 1

// Deleting a non-existent document returns 0
const noOp = await users.deleteOne({ name: 'Nobody' });
console.log(noOp.deletedCount); // 0
```

### insertMany

Insert multiple documents at once. Returns `acknowledged`, `insertedCount`, and `insertedIds`.

```typescript
const bulkResult = await users.insertMany([
  { name: 'Bob', email: 'bob@example.com', role: 'developer', age: 25 },
  { name: 'Carol', email: 'carol@example.com', role: 'designer', age: 28 },
  { name: 'Dave', email: 'dave@example.com', role: 'developer', age: 35 },
]);

console.log(bulkResult.insertedCount); // 3
console.log(bulkResult.insertedIds);   // { 0: 'id1...', 1: 'id2...', 2: 'id3...' }
```

### find

Query multiple documents. Returns a `Cursor` that supports chaining `.sort()`, `.skip()`, `.limit()`, and `.project()` before calling `.toArray()` to execute.

```typescript
// Find all developers
const developers = await users.find({ role: 'developer' }).toArray();

// Sort by age descending, skip the first result, limit to 5
const page = await users
  .find({ role: 'developer' })
  .sort({ age: -1 })
  .skip(1)
  .limit(5)
  .toArray();

// Count matching documents
const devCount = await users.find({ role: 'developer' }).count();
console.log(devCount); // number of developers
```

### updateMany

Update all documents matching a filter. Same return shape as `updateOne`.

```typescript
const result = await users.updateMany(
  { role: 'developer' },
  { $set: { department: 'engineering' } }
);

console.log(result.matchedCount);  // number of developers found
console.log(result.modifiedCount); // number of developers updated
```

### deleteMany

Delete all documents matching a filter. Same return shape as `deleteOne`.

```typescript
const result = await users.deleteMany({ role: 'designer' });
console.log(result.deletedCount); // number of designers removed
```

### Query Operators

BrightDB supports a rich set of query operators that you can use in any filter — `findOne`, `find`, `updateOne`, `updateMany`, `deleteOne`, and `deleteMany` all accept the same filter syntax.

#### Comparison Operators

```typescript
// $eq — exact equality (shorthand: { age: 30 })
await users.find({ age: { $eq: 30 } }).toArray();

// $ne — not equal
await users.find({ role: { $ne: 'admin' } }).toArray();

// $gt / $gte — greater than / greater than or equal
await users.find({ age: { $gt: 30 } }).toArray();
await users.find({ age: { $gte: 18 } }).toArray();

// $lt / $lte — less than / less than or equal
await users.find({ age: { $lt: 25 } }).toArray();
await users.find({ age: { $lte: 65 } }).toArray();

// $in — matches any value in an array
await users.find({ role: { $in: ['developer', 'designer'] } }).toArray();

// $nin — matches none of the values
await users.find({ role: { $nin: ['admin', 'superadmin'] } }).toArray();
```

#### Logical Operators

```typescript
// $and — all conditions must match
await users.find({
  $and: [{ age: { $gte: 25 } }, { role: 'developer' }]
}).toArray();

// $or — at least one condition must match
await users.find({
  $or: [{ role: 'admin' }, { age: { $gt: 30 } }]
}).toArray();

// $not — negates a condition
await users.find({ age: { $not: { $gt: 30 } } }).toArray();

// $nor — none of the conditions must match
await users.find({
  $nor: [{ role: 'admin' }, { age: { $lt: 18 } }]
}).toArray();
```

#### Element and Pattern Operators

```typescript
// $exists — check if a field is present
await users.find({ department: { $exists: true } }).toArray();

// $regex — regular expression match
await users.find({ name: { $regex: /^A/i } }).toArray();

// $type — match by BSON type
await users.find({ age: { $type: 'number' } }).toArray();
```

#### Array Operators

```typescript
const orders = db.collection('orders');
await orders.insertOne({
  customer: 'Alice',
  items: [
    { product: 'Widget', qty: 5, price: 10 },
    { product: 'Gadget', qty: 2, price: 25 },
  ],
});

// $elemMatch — array element matches all conditions
await orders.find({
  items: { $elemMatch: { qty: { $gt: 3 }, price: { $lt: 15 } } }
}).toArray();

// $size — array has exact length
await orders.find({ items: { $size: 2 } }).toArray();

// $all — array contains all specified values
await users.find({ tags: { $all: ['active', 'verified'] } }).toArray();
```

### Complete CRUD Example

Here's a self-contained script that demonstrates the full CRUD lifecycle:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

async function main() {
  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  const users = db.collection('users');

  // Create
  await users.insertMany([
    { name: 'Alice', role: 'admin', age: 30 },
    { name: 'Bob', role: 'developer', age: 25 },
    { name: 'Carol', role: 'developer', age: 28 },
    { name: 'Dave', role: 'designer', age: 35 },
  ]);

  // Read
  const alice = await users.findOne({ name: 'Alice' });
  console.log('Found:', alice?.name); // 'Alice'

  const devs = await users
    .find({ role: 'developer' })
    .sort({ age: -1 })
    .toArray();
  console.log('Developers:', devs.map(d => d.name)); // ['Carol', 'Bob']

  // Update
  await users.updateOne(
    { name: 'Alice' },
    { $set: { role: 'superadmin' } }
  );
  await users.updateMany(
    { role: 'developer' },
    { $set: { department: 'engineering' } }
  );

  // Delete
  await users.deleteOne({ name: 'Dave' });
  await users.deleteMany({ role: 'designer' });

  // Verify
  const remaining = await users.find().toArray();
  console.log('Remaining users:', remaining.length); // 3
}

main().catch(console.error);
```


## 5. Schema Validation

BrightDB includes a built-in schema validation engine — no need for Mongoose or external validation libraries. You define a `CollectionSchema` with field types, constraints, and required fields, then apply it to a collection with `setSchema()`. Every insert (and optionally every update) is validated automatically.

### Defining a CollectionSchema

A `CollectionSchema` describes the shape of documents in a collection. It supports field types, required fields, default values, enum constraints, string patterns, and numeric ranges.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';
import type { CollectionSchema } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

const users = db.collection('users');

// Define a schema for the users collection
const userSchema: CollectionSchema = {
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
    role: { type: 'string', enum: ['admin', 'developer', 'designer'] },
    age: { type: 'number', minimum: 0, maximum: 150 },
    active: { type: 'boolean', default: true },
  },
  required: ['name', 'email'],
  additionalProperties: false,
};

// Apply the schema to the collection
users.setSchema(userSchema);

// Valid insert — works fine
await users.insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  age: 30,
});

// Invalid insert — throws ValidationError (missing required "email")
await users.insertOne({ name: 'Bob' });
// ValidationError: Document failed validation for collection "users": email: Required field "email" is missing
```

### Supported Field Types

| Type | Matches | Example |
|------|---------|---------|
| `'string'` | `typeof value === 'string'` | `'hello'` |
| `'number'` | `typeof value === 'number'` (excludes NaN) | `42` |
| `'boolean'` | `typeof value === 'boolean'` | `true` |
| `'date'` | `value instanceof Date` | `new Date()` |
| `'array'` | `Array.isArray(value)` | `[1, 2, 3]` |
| `'object'` | Plain object (not array, not Date, not null) | `{ key: 'val' }` |
| `'null'` | `value === null` | `null` |
| `'any'` | Any value | anything |

A field can accept multiple types by passing an array:

```typescript
const schema: CollectionSchema = {
  properties: {
    // Accepts either a string or null
    nickname: { type: ['string', 'null'] },
  },
};
```

### Field Constraints Reference

| Constraint | Applies To | Description |
|-----------|-----------|-------------|
| `required` | Any field | Field must be present (also settable via top-level `required` array) |
| `default` | Any field | Value applied automatically if the field is missing on insert |
| `enum` | Any field | Value must be one of the listed values |
| `minLength` | `string`, `array` | Minimum length |
| `maxLength` | `string`, `array` | Maximum length |
| `minimum` | `number` | Minimum numeric value |
| `maximum` | `number` | Maximum numeric value |
| `pattern` | `string` | Regex pattern the string must match |
| `validate` | Any field | Custom validation function returning `true` or an error message string |

### Nested Object Schemas

Use the `properties` and `requiredFields` options within a field to validate nested objects. Nesting can go as deep as you need.

```typescript
const orderSchema: CollectionSchema = {
  properties: {
    customer: { type: 'string', minLength: 1 },
    shippingAddress: {
      type: 'object',
      properties: {
        street: { type: 'string', minLength: 1 },
        city: { type: 'string', minLength: 1 },
        state: { type: 'string', pattern: '^[A-Z]{2}$' },
        zip: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
      },
      requiredFields: ['street', 'city', 'state', 'zip'],
      additionalProperties: false,
    },
    status: {
      type: 'string',
      enum: ['placed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
  },
  required: ['customer', 'shippingAddress'],
};

const orders = db.collection('orders');
orders.setSchema(orderSchema);

// Valid — nested object satisfies all constraints
await orders.insertOne({
  customer: 'Alice',
  shippingAddress: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
  },
});

// Invalid — missing required nested field "city"
await orders.insertOne({
  customer: 'Bob',
  shippingAddress: {
    street: '456 Oak Ave',
    state: 'CA',
    zip: '90210',
  },
});
// ValidationError: shippingAddress.city: Required field "city" is missing
```

### Array Item Schemas

Use the `items` option to validate every element in an array field. Combined with `minLength` and `maxLength`, you can control both the array size and the shape of each item.

```typescript
const invoiceSchema: CollectionSchema = {
  properties: {
    invoiceNumber: { type: 'string' },
    lineItems: {
      type: 'array',
      minLength: 1,  // At least one line item required
      maxLength: 50,  // No more than 50 line items
      items: {
        type: 'object',
        properties: {
          product: { type: 'string', minLength: 1 },
          quantity: { type: 'number', minimum: 1 },
          unitPrice: { type: 'number', minimum: 0 },
        },
        requiredFields: ['product', 'quantity', 'unitPrice'],
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
  required: ['invoiceNumber', 'lineItems'],
};

const invoices = db.collection('invoices');
invoices.setSchema(invoiceSchema);

// Valid — array items match the item schema
await invoices.insertOne({
  invoiceNumber: 'INV-001',
  lineItems: [
    { product: 'Widget', quantity: 5, unitPrice: 10.00 },
    { product: 'Gadget', quantity: 2, unitPrice: 25.50 },
  ],
  tags: ['urgent', 'wholesale'],
});

// Invalid — second line item has quantity below minimum
await invoices.insertOne({
  invoiceNumber: 'INV-002',
  lineItems: [
    { product: 'Widget', quantity: 5, unitPrice: 10.00 },
    { product: 'Gadget', quantity: 0, unitPrice: 25.50 },
  ],
});
// ValidationError: lineItems[1].quantity: Value 0 is less than minimum 1
```

### Validation Levels

Control when validation runs using `validationLevel`:

| Level | Behavior |
|-------|----------|
| `'strict'` (default) | Validates on both inserts and updates |
| `'moderate'` | Validates on inserts only; updates skip validation |
| `'off'` | No validation (schema is stored but not enforced) |

```typescript
const schema: CollectionSchema = {
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'number', minimum: 0 },
  },
  required: ['name'],
  validationLevel: 'strict',  // Enforce on inserts AND updates
};

users.setSchema(schema);

const { insertedId } = await users.insertOne({ name: 'Alice', age: 30 });

// This throws in strict mode — empty string violates minLength: 1
await users.updateOne({ _id: insertedId }, { $set: { name: '' } });
// ValidationError: name: String length 0 is less than minimum 1
```

### Validation Actions

Control what happens when validation fails using `validationAction`:

| Action | Behavior |
|--------|----------|
| `'error'` (default) | Throws a `ValidationError` — the operation is rejected |
| `'warn'` | Returns validation errors without throwing — the operation proceeds |

### Handling ValidationError

When validation fails (with `validationAction: 'error'`), BrightDB throws a `ValidationError` with MongoDB-compatible error code `121` and detailed field-level errors.

```typescript
import { BrightDb, InMemoryDatabase, ValidationError } from '@brightchain/db';
import type { CollectionSchema } from '@brightchain/db';

async function main() {
  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  const users = db.collection('users');
  users.setSchema({
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      age: { type: 'number', minimum: 0, maximum: 150 },
    },
    required: ['name', 'email'],
  });

  try {
    await users.insertOne({
      name: '',           // violates minLength: 1
      email: 'not-valid', // violates pattern
      age: -5,            // violates minimum: 0
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      console.log(err.code);       // 121 (MongoDB DocumentValidationFailure)
      console.log(err.collection); // 'users'

      // Iterate over field-level errors
      for (const fieldError of err.validationErrors) {
        console.log(`${fieldError.field}: ${fieldError.message}`);
        // name: String length 0 is less than minimum 1
        // email: String does not match pattern "^[^@]+@[^@]+\.[^@]+$"
        // age: Value -5 is less than minimum 0
      }
    }
  }
}

main().catch(console.error);
```

### Custom Validation Functions

For validation logic that goes beyond built-in constraints, use the `validate` option on a field. Return `true` if valid, or a string error message if invalid.

```typescript
const productSchema: CollectionSchema = {
  properties: {
    name: { type: 'string', minLength: 1 },
    sku: {
      type: 'string',
      validate: (value) => {
        const sku = value as string;
        return /^[A-Z]{3}-\d{4}$/.test(sku) || 'SKU must match format "ABC-1234"';
      },
    },
    price: {
      type: 'number',
      minimum: 0,
      validate: (value) => {
        const price = value as number;
        // Ensure price has at most 2 decimal places
        return Number.isInteger(price * 100) || 'Price must have at most 2 decimal places';
      },
    },
  },
  required: ['name', 'sku', 'price'],
};
```

### Default Values

Fields with a `default` option are automatically populated when the field is missing from an inserted document.

```typescript
const taskSchema: CollectionSchema = {
  properties: {
    title: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    priority: { type: 'number', minimum: 1, maximum: 5, default: 3 },
  },
  required: ['title'],
};

const tasks = db.collection('tasks');
tasks.setSchema(taskSchema);

await tasks.insertOne({ title: 'Write docs' });
const task = await tasks.findOne({ title: 'Write docs' });
console.log(task?.status);   // 'todo'   (applied from default)
console.log(task?.priority); // 3        (applied from default)
```

### Managing Schemas at Runtime

You can inspect, replace, or remove a collection's schema at any time:

```typescript
// Check if a schema is set
const current = users.getSchema();
console.log(current); // CollectionSchema | undefined

// Replace the schema
users.setSchema(newSchema);

// Remove the schema — disables validation entirely
users.removeSchema();
await users.insertOne({ anything: 'goes' }); // No validation
```


## 6. Indexing

Indexes speed up queries by letting BrightDB locate documents without scanning every record in a collection. Under the hood, each index is an in-memory B-tree that maps field values to document IDs. Without an index, a query like `findOne({ email: 'alice@example.com' })` must check every document — a full collection scan. With an index on `email`, BrightDB jumps straight to the matching entry.

Every index adds a small amount of write overhead because inserts, updates, and deletes must keep the index in sync. Create indexes for fields you query frequently, and skip them for fields you rarely filter on.

### Single-Field Index

The most common index type. Pass an object with the field name and sort direction (`1` for ascending, `-1` for descending):

```typescript
// Index on the "email" field, ascending
const indexName = await users.createIndex({ email: 1 });
console.log(indexName); // 'email_1'
```

### Compound Index

A compound index covers multiple fields. BrightDB can use it for queries that filter on any prefix of the indexed fields. For example, an index on `{ role: 1, age: -1 }` accelerates queries on `role` alone or on `role` + `age` together, but not on `age` alone.

```typescript
await users.createIndex({ role: 1, age: -1 });

// These queries benefit from the compound index:
await users.find({ role: 'developer' });
await users.find({ role: 'developer', age: { $gte: 25 } });

// This query does NOT benefit (age is not a prefix):
await users.find({ age: { $gte: 25 } });
```

### Unique Index

A unique index enforces that no two documents share the same value for the indexed field. Attempting to insert a duplicate throws a `DuplicateKeyError` with MongoDB-compatible error code E11000:

```typescript
await users.createIndex({ email: 1 }, { unique: true });

await users.insertOne({ name: 'Alice', email: 'alice@example.com' });

try {
  // This will throw — email already exists
  await users.insertOne({ name: 'Bob', email: 'alice@example.com' });
} catch (err) {
  if (err instanceof Error && err.name === 'DuplicateKeyError') {
    console.log(err.message);
    // E11000 duplicate key error collection: index "email_1" dup key: alice@example.com
  }
}
```

### Sparse Index

A sparse index only includes documents that contain the indexed field. Documents missing the field are skipped entirely, which keeps the index smaller and avoids false uniqueness conflicts on missing values:

```typescript
// Only documents with a "department" field are indexed
await users.createIndex({ department: 1 }, { sparse: true });

// This document is NOT in the index (no department field)
await users.insertOne({ name: 'Charlie', role: 'intern' });

// This document IS in the index
await users.insertOne({ name: 'Dana', role: 'developer', department: 'Engineering' });
```

Sparse indexes are useful when a field is optional and you want to query only documents that have it.

### TTL Index

A TTL (Time-To-Live) index automatically removes documents after a specified number of seconds. BrightDB runs a periodic sweep to delete expired documents:

```typescript
// Documents expire 1 hour (3600 seconds) after their "createdAt" value
await users.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
);

// This document will be automatically removed ~1 hour after insertion
await users.insertOne({
  name: 'Temporary User',
  createdAt: new Date().toISOString(),
});
```

TTL indexes are ideal for session tokens, temporary invitations, or any data with a natural expiration.

### When to Create Indexes

Use these guidelines to decide which fields to index:

| Scenario | Recommendation |
|----------|---------------|
| Field appears in `find()` or `findOne()` filters frequently | Create a single-field index |
| Queries filter on two or more fields together | Create a compound index with the most selective field first |
| Field must be unique across the collection (emails, usernames) | Create a unique index |
| Field is optional and only some documents have it | Consider a sparse index |
| Documents should auto-expire after a time period | Create a TTL index |
| Field is only used in writes, never in queries | Skip the index — it adds write overhead with no read benefit |

A practical example — if your application frequently looks up users by email and lists users by role:

```typescript
// Supports: findOne({ email: '...' })
await users.createIndex({ email: 1 }, { unique: true });

// Supports: find({ role: 'developer' }) and find({ role: 'developer', age: { $gte: 25 } })
await users.createIndex({ role: 1, age: -1 });
```

### Listing and Dropping Indexes

Inspect which indexes exist on a collection, or remove one you no longer need:

```typescript
// List all index names
const indexes = users.listIndexes();
console.log(indexes); // ['email_1', 'role_1_age_-1']

// Drop an index by name
await users.dropIndex('role_1_age_-1');
```

### Index Rebuild on Restart

When using a persistent block store (`LocalDiskStore` + `PersistentHeadRegistry`), index metadata is serialized and stored as blocks. On application restart, BrightDB automatically rebuilds indexes from the stored metadata — you do not need to call `createIndex` again.

The rebuild process:

1. The `PersistentHeadRegistry` loads the latest head block for each collection.
2. Index definitions (field specs and options) are deserialized from the stored metadata blocks.
3. Each index is repopulated by scanning the collection's documents.

This means your indexes survive restarts with no extra code. However, the rebuild does add to startup time proportional to the number of documents and indexes. For large collections, expect a brief delay on first access after restart.

If you are using `InMemoryDatabase` (development mode), indexes are lost when the process exits and must be recreated on each startup.


## 7. Transactions

Transactions let you group multiple read and write operations into a single atomic unit. Either all operations commit together, or none of them do — there's no in-between state where some writes succeeded and others didn't. This is essential when your business logic touches multiple documents or collections and you need consistency guarantees.

BrightDB transactions use optimistic concurrency control with journal-based writes. During a transaction, all write operations are buffered in a journal. On commit, the journal entries are applied atomically. On abort, the journal is discarded and no partial changes are visible to other sessions.

### Manual Transaction Control

For full control over the transaction lifecycle, use `db.startSession()` to create a `DbSession`, then call `startTransaction()`, `commitTransaction()`, and `abortTransaction()` explicitly. Pass the session to each operation via the `{ session }` option.

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

const accounts = db.collection('accounts');

// Seed two accounts
await accounts.insertMany([
  { name: 'Alice', balance: 500 },
  { name: 'Bob', balance: 300 },
]);

// Transfer $100 from Alice to Bob — atomically
const session = db.startSession();
session.startTransaction();

try {
  await accounts.updateOne(
    { name: 'Alice' },
    { $inc: { balance: -100 } },
    { session }
  );

  await accounts.updateOne(
    { name: 'Bob' },
    { $inc: { balance: 100 } },
    { session }
  );

  // Both updates succeed — apply them atomically
  await session.commitTransaction();
  console.log('Transfer committed');
} catch (error) {
  // Something went wrong — discard all changes
  await session.abortTransaction();
  console.error('Transfer aborted:', error);
  throw error;
} finally {
  // Always end the session to release resources
  session.endSession();
}

// Verify the balances
const alice = await accounts.findOne({ name: 'Alice' });
const bob = await accounts.findOne({ name: 'Bob' });
console.log(alice?.balance); // 400
console.log(bob?.balance);   // 400
```

The manual pattern gives you the most flexibility — you can conditionally abort, retry, or branch logic between `startTransaction()` and `commitTransaction()`.

### withTransaction Convenience Helper

For the common case where you want automatic commit on success and abort on error, use `db.withTransaction()`. It handles the session lifecycle for you:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

const accounts = db.collection('accounts');
const ledger = db.collection('ledger');

await accounts.insertMany([
  { name: 'Alice', balance: 500 },
  { name: 'Bob', balance: 300 },
]);

// Transfer with automatic commit/abort
await db.withTransaction(async (session) => {
  await accounts.updateOne(
    { name: 'Alice' },
    { $inc: { balance: -200 } },
    { session }
  );

  await accounts.updateOne(
    { name: 'Bob' },
    { $inc: { balance: 200 } },
    { session }
  );

  // Record the transfer in a ledger collection
  await ledger.insertOne(
    {
      from: 'Alice',
      to: 'Bob',
      amount: 200,
      timestamp: new Date().toISOString(),
    },
    { session }
  );

  // If the callback returns without throwing, the transaction commits automatically.
  // If any operation throws, the transaction aborts automatically.
});

console.log('Transfer complete');
```

`withTransaction` is the recommended approach for most use cases. It eliminates boilerplate and ensures you never forget to abort on error or end the session.

### Isolation Level: Read-Committed

BrightDB transactions operate at the **read-committed** isolation level. Here's what that means in practice:

| Behavior | Description |
|----------|-------------|
| **Own writes are visible** | Reads within a transaction see uncommitted writes made by that same transaction. If you insert a document and then query for it in the same transaction, you'll find it. |
| **Other transactions' uncommitted writes are not visible** | A transaction cannot see changes made by another concurrent transaction until that transaction commits. |
| **Committed changes are visible** | Once another transaction commits, its changes become visible to subsequent reads in your transaction. |
| **No dirty reads** | You will never read data that was written by a transaction that later aborted. |

A practical example:

```typescript
const users = db.collection('users');

await db.withTransaction(async (session) => {
  // Insert a document inside the transaction
  await users.insertOne({ name: 'Eve', role: 'analyst' }, { session });

  // This read sees the uncommitted insert (same transaction)
  const eve = await users.findOne({ name: 'Eve' }, { session });
  console.log(eve?.role); // 'analyst' — visible within the same session
});

// After commit, the document is visible to everyone
const eve = await users.findOne({ name: 'Eve' });
console.log(eve?.role); // 'analyst'
```

### Conflict Detection

Concurrent transactions on different sessions operate independently. If two transactions modify the same document, the conflict is detected at commit time — the second transaction to commit will fail with a `TransactionError` (error code 251). Your application should handle this by retrying the transaction:

```typescript
try {
  await db.withTransaction(async (session) => {
    await accounts.updateOne(
      { name: 'Alice' },
      { $inc: { balance: -50 } },
      { session }
    );
  });
} catch (error) {
  if (error instanceof Error && 'code' in error && (error as any).code === 251) {
    console.log('Transaction conflict — retry the operation');
  }
}
```

### When to Use Transactions

| Scenario | Use a Transaction? |
|----------|-------------------|
| Transferring a value between two documents (e.g., account balances) | Yes — both updates must succeed or fail together |
| Inserting related documents across multiple collections | Yes — ensures referential consistency |
| Reading a single document and updating it | Usually not needed — single operations are already atomic |
| Bulk inserting independent documents | Optional — `insertMany` is atomic on its own |
| Complex multi-step workflows with external API calls | Use with caution — keep transactions short to avoid holding locks |

Keep transactions as short as possible. Long-running transactions increase the chance of conflicts and hold journal resources longer than necessary.


## 8. Aggregation Pipeline

The aggregation pipeline lets you process documents through a sequence of stages — filtering, grouping, reshaping, sorting, and joining — to produce computed results. It's the BrightDB equivalent of SQL's `GROUP BY`, `JOIN`, and window functions, all expressed as an array of stage objects.

Call `collection.aggregate(pipeline)` with an array of stages. Each stage transforms the document set and passes the result to the next stage:

```typescript
const results = await collection.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
]);
```

BrightDB supports 14 aggregation stages. The following sections document each one with a code example.

### Supported Stages

#### $match — Filter documents

Filters documents using the same query operators available in `find()`. Place `$match` early in the pipeline to reduce the number of documents processed by later stages.

```typescript
const results = await orders.aggregate([
  { $match: { status: 'completed', amount: { $gte: 100 } } },
]);
```

#### $group — Group and accumulate

Groups documents by an expression and applies accumulators to each group. The `_id` field specifies the grouping key — use `'$fieldName'` to group by a field, or `null` to aggregate the entire collection.

Supported accumulators: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`.

```typescript
const results = await orders.aggregate([
  { $group: {
      _id: '$status',
      count: { $count: {} },
      totalAmount: { $sum: '$amount' },
      avgAmount: { $avg: '$amount' },
      statuses: { $addToSet: '$status' },
    },
  },
]);
// [{ _id: 'completed', count: 5, totalAmount: 2500, avgAmount: 500, statuses: ['completed'] }, ...]
```

#### $sort — Sort documents

Sorts documents by one or more fields. Use `1` for ascending and `-1` for descending.

```typescript
const results = await users.aggregate([
  { $sort: { age: -1, name: 1 } },
]);
```

#### $limit — Limit output

Passes only the first N documents to the next stage.

```typescript
const results = await users.aggregate([
  { $sort: { age: -1 } },
  { $limit: 5 },
]);
```

#### $skip — Skip documents

Skips the first N documents and passes the rest. Commonly paired with `$sort` and `$limit` for pagination.

```typescript
const page2 = await users.aggregate([
  { $sort: { name: 1 } },
  { $skip: 10 },
  { $limit: 10 },
]);
```

#### $project — Reshape documents

Reshapes documents by including, excluding, or computing fields. In inclusion mode, only specified fields (plus `_id`) appear in the output. Set `_id: 0` to suppress it.

```typescript
const results = await users.aggregate([
  { $project: {
      _id: 0,
      name: 1,
      email: 1,
      nameUpper: { $toUpper: '$name' },
    },
  },
]);
// [{ name: 'Alice', email: 'alice@example.com', nameUpper: 'ALICE' }, ...]
```

Supported expressions in `$project` and `$addFields`: `$concat`, `$toUpper`, `$toLower`, `$add`, `$subtract`, `$multiply`, `$divide`, `$cond`.

#### $unwind — Deconstruct arrays

Deconstructs an array field, outputting one document per array element. The field path must be prefixed with `$`.

```typescript
const results = await orders.aggregate([
  { $unwind: '$items' },
]);
// An order with 3 items becomes 3 documents, each with a single item
```

Use `preserveNullAndEmptyArrays` to keep documents where the array is missing or empty:

```typescript
const results = await orders.aggregate([
  { $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } },
]);
```

#### $count — Count documents

Replaces the entire document set with a single document containing the count, stored under the field name you specify.

```typescript
const results = await users.aggregate([
  { $match: { role: 'developer' } },
  { $count: 'totalDevelopers' },
]);
// [{ totalDevelopers: 12 }]
```

#### $addFields — Add computed fields

Adds new fields to documents without removing existing ones. Accepts field references and expressions.

```typescript
const results = await orders.aggregate([
  { $addFields: {
      totalPrice: { $multiply: ['$quantity', '$unitPrice'] },
      discounted: { $subtract: [
        { $multiply: ['$quantity', '$unitPrice'] },
        '$discount',
      ]},
    },
  },
]);
```

#### $lookup — Cross-collection join

Performs a left outer join with another collection. Each input document gets an array field containing all matching documents from the foreign collection.

```typescript
const results = await users.aggregate([
  { $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'userId',
      as: 'userOrders',
    },
  },
]);
// Each user document now has a 'userOrders' array with their matching orders
```

| Parameter | Description |
|-----------|-------------|
| `from` | The collection to join with |
| `localField` | Field from the input documents to match on |
| `foreignField` | Field from the `from` collection to match against |
| `as` | Output array field name for matched documents |

#### $replaceRoot — Replace document root

Replaces each document with a sub-document. Useful after `$lookup` or `$unwind` to promote a nested object to the top level.

```typescript
const results = await users.aggregate([
  { $replaceRoot: { newRoot: '$profile' } },
]);
// If a user has { profile: { bio: '...', avatar: '...' } },
// the output is { bio: '...', avatar: '...' }
```

#### $out — Write results to a collection

Writes the pipeline output to a specified collection, replacing its contents. Must be the last stage in the pipeline.

```typescript
await orders.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $out: 'categorySummaries' },
]);
// The 'categorySummaries' collection now contains the grouped results
```

#### $sample — Randomly select documents

Returns a random sample of N documents from the input.

```typescript
const results = await users.aggregate([
  { $sample: { size: 3 } },
]);
// 3 randomly selected user documents
```

#### $facet — Parallel pipelines

Runs multiple sub-pipelines in parallel on the same input documents. Each sub-pipeline produces an array stored under its named key. The output is a single document containing all facet results.

```typescript
const results = await orders.aggregate([
  { $facet: {
      byStatus: [
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      topProducts: [
        { $unwind: '$items' },
        { $group: { _id: '$items.product', revenue: { $sum: '$items.price' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ],
      totalOrders: [
        { $count: 'count' },
      ],
    },
  },
]);
// [{
//   byStatus: [{ _id: 'completed', count: 50 }, { _id: 'placed', count: 20 }, ...],
//   topProducts: [{ _id: 'Widget', revenue: 5000 }, ...],
//   totalOrders: [{ count: 70 }]
// }]
```

### Complete Multi-Stage Pipeline Example

This example chains six stages to produce a sales report from an orders collection — filtering, unwinding, grouping, computing fields, sorting, and projecting:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

async function salesReport() {
  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  const orders = db.collection('orders');

  // Seed sample data
  await orders.insertMany([
    {
      userId: 'u1',
      status: 'completed',
      items: [
        { product: 'Widget', qty: 3, price: 10 },
        { product: 'Gadget', qty: 1, price: 25 },
      ],
      createdAt: '2024-06-15',
    },
    {
      userId: 'u2',
      status: 'completed',
      items: [
        { product: 'Widget', qty: 5, price: 10 },
        { product: 'Gizmo', qty: 2, price: 50 },
      ],
      createdAt: '2024-07-01',
    },
    {
      userId: 'u1',
      status: 'cancelled',
      items: [{ product: 'Gadget', qty: 1, price: 25 }],
      createdAt: '2024-07-10',
    },
  ]);

  const report = await orders.aggregate([
    // 1. Filter to completed orders only
    { $match: { status: 'completed' } },

    // 2. Deconstruct items array into individual documents
    { $unwind: '$items' },

    // 3. Group by product and compute totals
    { $group: {
        _id: '$items.product',
        totalRevenue: { $sum: '$items.price' },
        unitsSold: { $sum: '$items.qty' },
      },
    },

    // 4. Add a computed average price field
    { $addFields: {
        avgPricePerUnit: { $divide: ['$totalRevenue', '$unitsSold'] },
      },
    },

    // 5. Sort by revenue descending
    { $sort: { totalRevenue: -1 } },

    // 6. Reshape the output
    { $project: {
        _id: 0,
        product: '$_id',
        totalRevenue: 1,
        unitsSold: 1,
        avgPricePerUnit: 1,
      },
    },
  ]);

  console.log(report);
  // [
  //   { totalRevenue: 100, unitsSold: 2, avgPricePerUnit: 50, product: 'Gizmo' },
  //   { totalRevenue: 80, unitsSold: 8, avgPricePerUnit: 10, product: 'Widget' },
  //   { totalRevenue: 25, unitsSold: 1, avgPricePerUnit: 25, product: 'Gadget' },
  // ]
}

salesReport().catch(console.error);
```

### $lookup Cross-Collection Join Example

This example demonstrates joining a `users` collection with an `orders` collection to produce a user report with embedded order data:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

async function crossCollectionJoin() {
  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  const users = db.collection('users');
  const orders = db.collection('orders');

  // Seed users
  await users.insertMany([
    { _id: 'u1', name: 'Alice', role: 'admin' },
    { _id: 'u2', name: 'Bob', role: 'developer' },
    { _id: 'u3', name: 'Carol', role: 'designer' },
  ]);

  // Seed orders referencing user IDs
  await orders.insertMany([
    { userId: 'u1', product: 'Widget', amount: 30 },
    { userId: 'u1', product: 'Gadget', amount: 25 },
    { userId: 'u2', product: 'Gizmo', amount: 100 },
  ]);

  // Join users with their orders
  const usersWithOrders = await users.aggregate([
    // Left outer join: each user gets a 'userOrders' array
    { $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'userId',
        as: 'userOrders',
      },
    },

    // Add a computed order count
    { $addFields: {
        orderCount: { $size: '$userOrders' },
      },
    },

    // Only include users who have at least one order
    { $match: { orderCount: { $gt: 0 } } },

    // Sort by order count descending
    { $sort: { orderCount: -1 } },
  ]);

  console.log(usersWithOrders);
  // [
  //   { _id: 'u1', name: 'Alice', role: 'admin', userOrders: [...], orderCount: 2 },
  //   { _id: 'u2', name: 'Bob', role: 'developer', userOrders: [...], orderCount: 1 },
  // ]
  // Carol is excluded because she has no orders
}

crossCollectionJoin().catch(console.error);
```

> **Note:** `$lookup` resolves the `from` collection using the same `BrightDb` instance. Both collections must exist on the same database instance for the join to work.


## 9. Express Middleware

BrightDB ships with `createDbRouter`, an Express router factory that exposes your collections as a full REST API. One line of code gives you 17+ endpoints covering CRUD, aggregation, indexes, and bulk operations — no manual route definitions needed.

### Mounting the Router

```typescript
import express from 'express';
import cors from 'cors';
import { BrightDb, InMemoryDatabase, createDbRouter } from '@brightchain/db';

const app = express();
app.use(cors());
app.use(express.json());

// Create and connect the database
const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore);
await db.connect();

// Mount the REST API at /api/db
app.use('/api/db', createDbRouter(db, {
  allowedCollections: ['users', 'orders'],
  maxResults: 500,
}));

app.listen(3000, () => {
  console.log('BrightStack API running on http://localhost:3000');
});
```

The `allowedCollections` option restricts which collections are accessible through the API. Requests to any other collection name return `403 Forbidden`. Omit the option to allow all collections. The `maxResults` option caps the number of documents returned by find queries (default: 1000).

### REST Endpoint Reference

All paths below are relative to the mount point (e.g. `/api/db`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/:collection` | Find documents (query params as filter) |
| `GET` | `/:collection/:id` | Find document by ID |
| `POST` | `/:collection` | Insert one document |
| `POST` | `/:collection/find` | Rich find (body: `{ filter, sort, limit, skip, projection }`) |
| `POST` | `/:collection/aggregate` | Aggregation pipeline (body: `{ pipeline }`) |
| `PUT` | `/:collection/:id` | Replace document |
| `PATCH` | `/:collection/:id` | Update with operators (e.g. `$set`, `$inc`) |
| `DELETE` | `/:collection/:id` | Delete document by ID |
| `POST` | `/:collection/insertMany` | Bulk insert (body: `{ documents }`) |
| `POST` | `/:collection/updateMany` | Bulk update (body: `{ filter, update }`) |
| `POST` | `/:collection/deleteMany` | Bulk delete (body: `{ filter }`) |
| `POST` | `/:collection/count` | Count documents (body: `{ filter }`) |
| `POST` | `/:collection/distinct` | Distinct values (body: `{ field, filter }`) |
| `POST` | `/:collection/indexes` | Create index (body: `{ spec, options }`) |
| `DELETE` | `/:collection/indexes/:name` | Drop index |
| `GET` | `/:collection/indexes` | List indexes |
| `POST` | `/:collection/bulkWrite` | Bulk write operations |

### Example Requests

Insert a user:

```bash
curl -X POST http://localhost:3000/api/db/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "role": "admin"}'
```

Find all developers:

```bash
curl -X POST http://localhost:3000/api/db/users/find \
  -H "Content-Type: application/json" \
  -d '{"filter": {"role": "developer"}, "sort": {"name": 1}, "limit": 10}'
```

Update a user by ID:

```bash
curl -X PATCH http://localhost:3000/api/db/users/abc123 \
  -H "Content-Type: application/json" \
  -d '{"$set": {"role": "superadmin"}}'
```

Delete a user by ID:

```bash
curl -X DELETE http://localhost:3000/api/db/users/abc123
```

### Complete Server Example

Here's a self-contained Express server with BrightDB and seed data:

```typescript
import express from 'express';
import cors from 'cors';
import { BrightDb, InMemoryDatabase, createDbRouter } from '@brightchain/db';

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  // Seed some data
  const users = db.collection('users');
  await users.insertMany([
    { name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob', email: 'bob@example.com', role: 'developer' },
  ]);

  // Mount the REST API
  app.use('/api/db', createDbRouter(db, {
    allowedCollections: ['users', 'orders'],
    maxResults: 500,
  }));

  app.listen(3000, () => {
    console.log('BrightStack API running on http://localhost:3000');
  });
}

main().catch(console.error);
```

## 10. React Frontend

With the Express API running, you can build a React frontend that performs CRUD operations against it using `fetch()`. This example is intentionally minimal — no state management libraries, no routing, just enough to demonstrate the full create-read-update-delete cycle.

### Setup

Add React to your project (or create a separate frontend project):

```bash
npx create-react-app brightstack-frontend --template typescript
cd brightstack-frontend
npm start
```

### Minimal CRUD Component

Replace the contents of `src/App.tsx` with the following:

```tsx
import React, { useEffect, useState } from 'react';

const API = 'http://localhost:3000/api/db/users';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');

  // READ — fetch all users on mount
  const fetchUsers = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // CREATE — insert a new user
  const handleCreate = async () => {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    setName('');
    setEmail('');
    await fetchUsers();
  };

  // UPDATE — toggle role between 'developer' and 'admin'
  const handleUpdate = async (user: User) => {
    const newRole = user.role === 'admin' ? 'developer' : 'admin';
    await fetch(`${API}/${user._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ $set: { role: newRole } }),
    });
    await fetchUsers();
  };

  // DELETE — remove a user by ID
  const handleDelete = async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    await fetchUsers();
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>BrightStack Users</h1>

      {/* Create form */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          style={{ marginLeft: 8 }}
        />
        <button onClick={handleCreate} style={{ marginLeft: 8 }}>
          Add User
        </button>
      </div>

      {/* User list */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Email</th>
            <th style={{ textAlign: 'left' }}>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => handleUpdate(user)}>Toggle Role</button>
                <button onClick={() => handleDelete(user._id)} style={{ marginLeft: 4 }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
```

This component demonstrates all four CRUD operations:

| Operation | HTTP Method | Endpoint | Description |
|-----------|-------------|----------|-------------|
| Create | `POST` | `/api/db/users` | Inserts a new user document |
| Read | `GET` | `/api/db/users` | Fetches all users |
| Update | `PATCH` | `/api/db/users/:id` | Updates a user's role with `$set` |
| Delete | `DELETE` | `/api/db/users/:id` | Removes a user by ID |

> **Tip:** The Express server must have `cors()` middleware enabled (shown in section 9) for the React dev server to reach the API from a different port.

## 11. Change Streams

Change streams let you subscribe to real-time insert, update, replace, and delete events on a collection. Call `collection.watch(listener)` to register a callback — it returns an unsubscribe function you call when you're done listening.

### Basic Usage

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

async function main() {
  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore);
  await db.connect();

  const users = db.collection('users');

  // Subscribe to all changes on the users collection
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

    console.log('  Timestamp:', event.timestamp);
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

  await users.deleteOne({ name: 'Eve' });
  // Logs: [delete] on users
  //        Document key: abc123...

  // Stop listening when done
  unsubscribe();
}

main().catch(console.error);
```

### Change Event Shape

Every event passed to the `watch` callback includes these fields:

| Field | Type | Description |
|-------|------|-------------|
| `operationType` | `'insert' \| 'update' \| 'replace' \| 'delete'` | What happened |
| `documentKey` | `{ _id: string }` | The affected document's ID |
| `fullDocument` | `T \| undefined` | The full document (present on `insert` and `replace`) |
| `updateDescription` | `{ updatedFields: object, removedFields: string[] } \| undefined` | Changed fields (present on `update`) |
| `ns` | `{ db: string, coll: string }` | Namespace (database and collection name) |
| `timestamp` | `Date` | When the event occurred |

### Use Cases

Change streams are useful for:

- **Reactive UIs** — Push updates to a frontend via WebSocket when documents change
- **Audit logs** — Record every mutation for compliance or debugging
- **Cache invalidation** — Clear or refresh caches when underlying data changes
- **Real-time sync** — Propagate changes between services or microservices

### Example: Audit Logger

```typescript
const auditLog: Array<{ op: string; collection: string; docId: string; time: Date }> = [];

const unsubscribe = users.watch((event) => {
  auditLog.push({
    op: event.operationType,
    collection: event.ns.coll,
    docId: event.documentKey._id,
    time: event.timestamp,
  });
});

// All subsequent mutations are recorded in auditLog
await users.insertOne({ name: 'Frank', role: 'developer' });
await users.updateOne({ name: 'Frank' }, { $set: { role: 'lead' } });
await users.deleteOne({ name: 'Frank' });

console.log(auditLog);
// [
//   { op: 'insert', collection: 'users', docId: '...', time: ... },
//   { op: 'update', collection: 'users', docId: '...', time: ... },
//   { op: 'delete', collection: 'users', docId: '...', time: ... },
// ]

// Clean up
unsubscribe();
```

> **Note:** Change streams are synchronous listeners — the callback fires immediately when a mutation completes on the collection. There is no network delay in standalone mode since everything runs in-process.


## 12. Production Deployment

Moving from development to production requires three changes: persistent storage, environment-driven configuration, and a process manager to keep your application running. This section covers each one.

### Persistent Storage Configuration

In development you used `InMemoryDatabase`, which loses all data when the process exits. For production, configure `dataDir` so BrightDB persists collection state to disk:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

const dataDir = process.env.DATA_DIR || './data';

const blockStore = new InMemoryDatabase();
const db = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir,
});

// Load persisted heads — required before accessing collections
await db.connect();
```

The `dataDir` option creates a `PersistentHeadRegistry` automatically. On restart, `db.connect()` reloads the head pointers from `{dataDir}/head-registry.json`, so your collections pick up exactly where they left off.

> **Critical:** Never deploy to production with a bare `InMemoryDatabase` and no `dataDir`. Every restart would wipe your data.

### Environment Variables

Keep configuration out of source code by reading from environment variables. A typical `.env` file for a BrightStack production deployment:

```bash
# .env
NODE_ENV=production
PORT=3000
DATA_DIR=/var/lib/brightstack/data
```

Load them in your application entry point:

```typescript
import express from 'express';
import cors from 'cors';
import { BrightDb, InMemoryDatabase, createDbRouter } from '@brightchain/db';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || './data';

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const blockStore = new InMemoryDatabase();
  const db = new BrightDb(blockStore, {
    name: 'myapp',
    dataDir: DATA_DIR,
  });
  await db.connect();

  app.use('/api/db', createDbRouter(db, {
    allowedCollections: ['users', 'orders'],
    maxResults: 500,
  }));

  app.listen(PORT, () => {
    console.log(`BrightStack running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

main().catch(console.error);
```

Use a library like `dotenv` to load `.env` files in development, or set variables directly in your hosting environment.

### Process Management

Your Node.js process needs to stay alive, restart on crashes, and start automatically on boot. Two common options:

#### pm2

[pm2](https://pm2.keymetrics.io/) is the most popular Node.js process manager. Install it globally and start your app:

```bash
npm install -g pm2

# Start the application
pm2 start dist/server.js --name brightstack-app

# Ensure it restarts on reboot
pm2 startup
pm2 save

# View logs
pm2 logs brightstack-app

# Restart after a deploy
pm2 restart brightstack-app
```

#### systemd (Linux)

For Linux servers, a systemd unit file gives you OS-level process management:

```ini
# /etc/systemd/system/brightstack.service
[Unit]
Description=BrightStack Application
After=network.target

[Service]
Type=simple
User=brightstack
WorkingDirectory=/opt/brightstack
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATA_DIR=/var/lib/brightstack/data

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable brightstack
sudo systemctl start brightstack
sudo systemctl status brightstack
```

### Production Deployment Checklist

Before going live, verify each item:

| Item | Check |
|------|-------|
| **Persistent storage** | `dataDir` is set to a durable path (not `/tmp` or in-memory) |
| **Data directory permissions** | The application user has read/write access to `DATA_DIR` |
| **Environment variables** | `NODE_ENV=production`, `PORT`, and `DATA_DIR` are configured |
| **Process manager** | pm2 or systemd keeps the process alive and restarts on failure |
| **Backup strategy** | Periodic copies of the `data/` directory (especially `head-registry.json`) |
| **Error handling** | Uncaught exceptions are logged; the process manager restarts the app |
| **Allowed collections** | `createDbRouter` uses `allowedCollections` to restrict API surface |
| **CORS configuration** | `cors()` is configured with specific origins, not wildcard `*` |
| **Rate limiting** | An API rate limiter or reverse proxy (nginx) protects against abuse |
| **HTTPS** | TLS termination via a reverse proxy (nginx, Caddy) or cloud load balancer |


## 13. Unavailable Features in Standalone Mode

A standalone BrightDB instance runs on a single machine with no network participation. This means several features that require multiple nodes are **not available**:

| Feature | What It Does | Why It's Unavailable |
|---------|-------------|---------------------|
| **Gossip protocol** | Peer-to-peer data sharing between nodes | No peers exist in standalone mode |
| **Network discovery** | Automatic detection of other BrightDB nodes | No network to discover on |
| **Data replication** | Redundant copies of data across multiple nodes | Only one node exists |
| **Pool-shared encryption** | AES-256-GCM encryption scoped to a shared pool | Pools require a cluster of participating nodes |

Attempting to configure gossip peers, pool adapters, or replication settings on a standalone instance will have no effect — there are no remote nodes to communicate with.

### When You Need These Features

If your application requires high availability, data redundancy, or multi-node deployment, the **Private Cluster** deployment model provides all of the above while still keeping your data off the public BrightChain network.

See the [Private Cluster Guide](./06-brightstack-private-cluster) for a complete walkthrough covering:
- Creating a private BrightPool scoped to your cluster
- Configuring gossip with explicit peer lists
- Setting up data replication and reconciliation
- Pool-shared AES-256-GCM encryption
- Adding and removing nodes with ACL management


## 14. Troubleshooting

### "head-registry.json not found" on startup

This is normal on a fresh deployment. When `db.connect()` is called and no `head-registry.json` exists at the configured `dataDir`, BrightDB starts with an empty registry — no crash, no error. Collections will be empty until you insert data.

If you see this as an actual error, verify that `dataDir` points to the correct path and that the directory exists:

```typescript
const db = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir: '/var/lib/brightstack/data', // Ensure this path is correct
});
await db.connect();
```

### Permission errors on data directory

If the application cannot read or write to the data directory, you'll see `EACCES` or `EPERM` errors. Fix the permissions:

```bash
# Create the directory and set ownership
sudo mkdir -p /var/lib/brightstack/data
sudo chown -R brightstack:brightstack /var/lib/brightstack/data
chmod 750 /var/lib/brightstack/data
```

Ensure the user running the Node.js process matches the directory owner.

### DuplicateKeyError on unique indexes

A `DuplicateKeyError` (code E11000) means you're inserting or updating a document with a value that already exists in a unique index:

```
E11000 duplicate key error collection: index "email_1" dup key: alice@example.com
```

Solutions:
- Check for existing documents before inserting: `await collection.findOne({ email })`
- Use `updateOne` with `$set` instead of inserting a new document
- If the duplicate is unexpected, inspect your data for accidental duplicates

### ValidationError on schema-enforced collections

A `ValidationError` (code 121) means a document failed schema validation. The error includes field-level details:

```typescript
try {
  await users.insertOne({ name: '', email: 'bad' });
} catch (err) {
  if (err instanceof ValidationError) {
    for (const fieldError of err.validationErrors) {
      console.log(`${fieldError.field}: ${fieldError.message}`);
    }
  }
}
```

Common causes:
- Missing a required field
- Wrong field type (e.g., string where number is expected)
- Value outside `minimum`/`maximum` range
- String doesn't match the `pattern` regex

### Collection appears empty after restart

If your collections are empty after restarting the application, the most likely cause is a missing `db.connect()` call. Without it, the `PersistentHeadRegistry` never loads the saved head pointers:

```typescript
const db = new BrightDb(blockStore, {
  name: 'myapp',
  dataDir: './data',
});

// This line is required — without it, collections start empty
await db.connect();

const users = db.collection('users');
const count = await users.find().toArray();
console.log(count.length); // 0 if connect() was skipped!
```

Other causes:
- `dataDir` points to a different path than the one used previously
- The `data/` directory was deleted or moved
- The application is using `InMemoryDatabase` without `dataDir` (no persistence)

### Port already in use

If you see `EADDRINUSE` when starting the server, another process is already using the port:

```bash
# Find what's using the port
lsof -i :3000

# Kill the process (replace PID with the actual process ID)
kill -9 <PID>
```

Or change the port via environment variable:

```bash
PORT=3001 node dist/server.js
```


## 15. Next Steps

You now have a fully functional BrightStack application running in standalone mode. Here are paths to explore next:

- [BrightDB Usage walkthrough](/docs/walkthroughs/04-brightdb-usage/) — deeper dive into query operators, cursor methods, and advanced features beyond what this guide covers
- [Building a dApp walkthrough](/docs/walkthroughs/05-building-a-dapp/) — full BrightChain integration for decentralized applications, including node setup and network participation
- [Private Cluster Guide](./06-brightstack-private-cluster) — multi-node deployment with gossip-based replication, pool-shared encryption, and ACL management — all without joining the public BrightChain network
