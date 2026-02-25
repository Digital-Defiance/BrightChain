# Requirements Document

## Introduction

This feature moves the core, platform-agnostic database engine from `brightchain-db` into `brightchain-lib` so that any consumer of `brightchain-lib` (including browser clients) can use in-memory document database functionality without depending on Node.js. After the migration, `brightchain-db` becomes a thin persistence layer that adds disk-backed storage (via `fs`, `path`, `crypto`) on top of the core engine now living in `brightchain-lib`.

The core engine includes: query engine, update engine, cursor, indexing, aggregation, schema validation, error types, transaction journaling, in-memory head registry, and the `Collection`/`Database` classes wired to an in-memory `IBlockStore`. The only pieces that remain in `brightchain-db` are the `PersistentHeadRegistry` (uses `fs`/`path`), the `expressMiddleware` (uses Express), the `PooledStoreAdapter` (delegates to pool-scoped block store operations already in `brightchain-lib`), and the `CBLIndex` (uses `crypto.randomUUID` and tightly couples to persistence concerns).

## Glossary

- **Core_Engine**: The set of platform-agnostic modules that implement the document database logic: query matching, update operators, cursor iteration, indexing, aggregation pipeline, schema validation, error hierarchy, and transaction journaling.
- **brightchain-lib**: The shared, platform-agnostic library (`@brightchain/brightchain-lib`) consumed by all targets (browser, Node.js, API).
- **brightchain-db**: The Node.js-specific database package (`@brightchain/db`) that currently contains both core engine logic and disk persistence.
- **InMemoryDatabase**: A concrete `IDatabase` implementation in `brightchain-lib` that uses `MemoryBlockStore` and `InMemoryHeadRegistry` for storage, requiring no Node.js APIs.
- **PersistenceLayer**: The thin set of modules remaining in `brightchain-db` after migration: `PersistentHeadRegistry`, `expressMiddleware`, `PooledStoreAdapter`, and `CBLIndex`.
- **IBlockStore**: The storage abstraction interface defined in `brightchain-lib` for block-level operations.
- **IDatabase**: The storage-agnostic database interface defined in `suite-core-lib` for collection access, sessions, and connection lifecycle.
- **ICollection**: The storage-agnostic collection interface defined in `suite-core-lib` for CRUD, indexing, aggregation, and schema validation.
- **IHeadRegistry**: The interface in `brightchain-lib` for mapping (dbName, collectionName) pairs to head block IDs.
- **UUID_Generator**: A platform-agnostic function type `() => string` used to replace direct `crypto.randomUUID` calls, allowing browser-compatible UUID generation.

## Requirements

### Requirement 1: Relocate Pure-Logic Modules to brightchain-lib

**User Story:** As a library consumer, I want the core database engine modules available in `brightchain-lib`, so that I can use document database functionality in any JavaScript runtime without Node.js dependencies.

#### Acceptance Criteria

1. THE Core_Engine SHALL include the following modules relocated to `brightchain-lib`: `queryEngine`, `updateEngine`, `cursor`, `indexing`, `aggregation`, `schemaValidation`, and `errors`.
2. WHEN a module is relocated, THE Core_Engine SHALL preserve all existing public function signatures and exported types without breaking changes.
3. THE Core_Engine SHALL contain zero imports from Node.js built-in modules (`crypto`, `fs`, `path`, `os`, `net`, `http`, `https`, `stream`, `child_process`).
4. WHEN the relocated modules reference types currently imported from `@digitaldefiance/suite-core-lib`, THE Core_Engine SHALL import those types from `brightchain-lib` re-exports or from `@digitaldefiance/suite-core-lib` directly, maintaining the existing type provenance.

### Requirement 2: Create InMemoryDatabase in brightchain-lib

**User Story:** As a developer building browser or cross-platform applications, I want an in-memory `IDatabase` implementation in `brightchain-lib`, so that I can use the full document database API without disk persistence.

#### Acceptance Criteria

1. THE InMemoryDatabase SHALL implement the `IDatabase` interface (collection access, session management, transaction support, connection lifecycle, collection listing, and collection dropping).
2. THE InMemoryDatabase SHALL use `MemoryBlockStore` (already in `brightchain-lib`) as its backing `IBlockStore`.
3. THE InMemoryDatabase SHALL use `InMemoryHeadRegistry` (relocated from `brightchain-db`) as its head registry.
4. THE InMemoryDatabase SHALL accept a UUID_Generator function in its constructor options, defaulting to `crypto.randomUUID` when available and falling back to a platform-agnostic implementation.
5. WHEN `connect()` is called on the InMemoryDatabase, THE InMemoryDatabase SHALL transition to a connected state without performing any I/O.
6. WHEN `disconnect()` is called on the InMemoryDatabase, THE InMemoryDatabase SHALL transition to a disconnected state and release in-memory references.

### Requirement 3: Relocate Collection to brightchain-lib

**User Story:** As a developer, I want the `Collection` class available in `brightchain-lib`, so that I can perform CRUD operations, queries, aggregation, indexing, and schema validation in any runtime.

#### Acceptance Criteria

1. THE Collection SHALL implement the `ICollection` interface with all existing methods: `insertOne`, `insertMany`, `findOne`, `find`, `findById`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `replaceOne`, `countDocuments`, `estimatedDocumentCount`, `distinct`, `aggregate`, `createIndex`, `dropIndex`, `listIndexes`, `bulkWrite`, `watch`, `setSchema`, `getSchema`, `removeSchema`, `validateDoc`, `getWriteConcern`, `setWriteConcern`, `getReadPreference`, `setReadPreference`, `createTextIndex`, `dropTextIndex`, `hasTextIndex`, and `drop`.
2. THE Collection SHALL replace its direct `crypto.randomUUID` import with a UUID_Generator function injected via constructor or database context.
3. THE Collection SHALL replace its `sha3_512` block-ID calculation with a pluggable hash function or use the existing `calculateBlockId` helper, ensuring no Node.js `crypto` dependency.
4. WHEN the Collection is used in `brightchain-lib`, THE Collection SHALL operate against any `IBlockStore` implementation, including `MemoryBlockStore`.
5. THE Collection SHALL retain its `findWithAvailability` method and availability-aware read concern support, using the `ReadConcern` and `PendingBlockError` types already exported from `brightchain-lib`.

### Requirement 4: Relocate InMemoryHeadRegistry to brightchain-lib

**User Story:** As a developer, I want the `InMemoryHeadRegistry` available in `brightchain-lib`, so that the in-memory database can track collection head pointers without disk I/O.

#### Acceptance Criteria

1. THE InMemoryHeadRegistry SHALL implement the `IHeadRegistry` interface already defined in `brightchain-lib`.
2. THE InMemoryHeadRegistry SHALL contain zero imports from Node.js built-in modules.
3. WHEN `InMemoryHeadRegistry` is relocated, THE InMemoryHeadRegistry SHALL preserve its `mergeHeadUpdate`, `deferHeadUpdate`, `applyDeferredUpdates`, and `getDeferredUpdates` methods for cross-node synchronization support.
4. THE InMemoryHeadRegistry SHALL remain importable from `brightchain-db` via re-export for backward compatibility.

### Requirement 5: Relocate Transaction Engine to brightchain-lib

**User Story:** As a developer, I want the transaction journaling engine available in `brightchain-lib`, so that in-memory databases support multi-document ACID-like transactions.

#### Acceptance Criteria

1. THE DbSession SHALL implement the `IClientSession` interface with `startTransaction`, `commitTransaction`, `abortTransaction`, and `endSession` methods.
2. THE DbSession SHALL replace its `crypto.randomUUID` import with the UUID_Generator function.
3. THE DbSession SHALL preserve its copy-on-write journal semantics: commit applies buffered operations, abort discards them, and partial-commit triggers rollback.
4. THE DbSession SHALL export the `JournalOp`, `CommitCallback`, and `RollbackCallback` types from `brightchain-lib`.

### Requirement 6: Maintain brightchain-db as Thin Persistence Layer

**User Story:** As a Node.js developer, I want `brightchain-db` to remain a working package that adds disk persistence on top of the core engine, so that existing consumers are not broken.

#### Acceptance Criteria

1. THE PersistenceLayer SHALL re-export all Core_Engine modules from `brightchain-lib` so that existing `@brightchain/db` import paths continue to resolve.
2. THE PersistenceLayer SHALL retain `PersistentHeadRegistry` (which uses `fs` and `path` for disk I/O) in `brightchain-db`.
3. THE PersistenceLayer SHALL retain `expressMiddleware` (which depends on Express types) in `brightchain-db`.
4. THE PersistenceLayer SHALL retain `PooledStoreAdapter` in `brightchain-db` since it adapts pool-scoped block store operations specific to the Node.js storage backend.
5. THE PersistenceLayer SHALL retain `CBLIndex` in `brightchain-db` since it uses `crypto.randomUUID` and couples tightly to persistence and gossip concerns.
6. WHEN a consumer imports from `@brightchain/db`, THE PersistenceLayer SHALL provide the same public API surface as before the migration (no removed exports).
7. THE PersistenceLayer SHALL extend `InMemoryDatabase` (or compose it) to create a `BrightChainDb` class that supports both in-memory and persistent head registries.

### Requirement 7: Ensure Platform-Agnostic UUID Generation

**User Story:** As a developer targeting browsers, I want UUID generation to work without Node.js `crypto`, so that the core engine runs in any JavaScript environment.

#### Acceptance Criteria

1. THE Core_Engine SHALL define a `UuidGenerator` type alias: `() => string`.
2. THE InMemoryDatabase SHALL accept an optional `UuidGenerator` in its options.
3. WHEN no `UuidGenerator` is provided, THE Core_Engine SHALL use `globalThis.crypto.randomUUID()` if available (supported in modern browsers and Node.js 19+).
4. IF `globalThis.crypto.randomUUID` is not available, THEN THE Core_Engine SHALL fall back to a standards-compliant UUID v4 implementation using `crypto.getRandomValues`.

### Requirement 8: Relocate and Verify Tests

**User Story:** As a developer, I want the existing test suites to pass after the migration, so that I have confidence the refactoring introduced no regressions.

#### Acceptance Criteria

1. WHEN pure-logic module tests (queryEngine, updateEngine, cursor, indexing, aggregation, schemaValidation, errors, transaction) are relocated to `brightchain-lib`, THE Test_Suite SHALL pass with no modifications to test assertions.
2. THE Test_Suite SHALL include an `IDatabase` conformance test in `brightchain-lib` that verifies `InMemoryDatabase` implements all `IDatabase` methods.
3. THE Test_Suite SHALL include an `ICollection` conformance test in `brightchain-lib` that verifies the relocated `Collection` implements all `ICollection` methods.
4. WHEN `brightchain-db` tests import from `@brightchain/db`, THE Test_Suite SHALL continue to pass via the re-export layer.
5. FOR ALL valid BsonDocument objects, inserting then finding by ID SHALL return an equivalent document (round-trip property).

### Requirement 9: Update Nx Project Configuration

**User Story:** As a developer working in the Nx monorepo, I want the project dependency graph to reflect the new module locations, so that builds and affected commands work correctly.

#### Acceptance Criteria

1. WHEN modules are moved to `brightchain-lib`, THE Build_System SHALL update `tsconfig.base.json` path mappings if new sub-path exports are introduced.
2. THE Build_System SHALL ensure `brightchain-db` declares an explicit dependency on `@brightchain/brightchain-lib` in its `package.json` or Nx project configuration.
3. WHEN `nx affected` is run after the migration, THE Build_System SHALL correctly identify both `brightchain-lib` and `brightchain-db` as affected projects.
4. THE Build_System SHALL verify that `brightchain-lib` does not gain any new Node.js-specific dependencies in its dependency graph.

### Requirement 10: Preserve sha3_512 Hashing Without Node.js crypto

**User Story:** As a developer, I want block ID calculation to use `@noble/hashes/sha3` (already a dependency of `brightchain-db`), so that the `Collection` can compute content-addressable block IDs without Node.js `crypto`.

#### Acceptance Criteria

1. THE Collection SHALL use `sha3_512` from `@noble/hashes/sha3` for block ID calculation, which is a pure JavaScript implementation with no Node.js dependency.
2. WHEN `@noble/hashes` is not already a dependency of `brightchain-lib`, THE Build_System SHALL add it as a dependency.
3. IF `@noble/hashes` is already a dependency of `brightchain-lib`, THEN THE Collection SHALL use the existing dependency without adding a duplicate.
