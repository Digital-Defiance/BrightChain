# Implementation Plan: MongoDB-Compatible Document Store

## Overview

This plan promotes brightchain-db's types to shared interfaces in brightchain-lib, defines `IDatabase`/`ICollection<T>`/`IClientSession`, makes brightchain-db conform to them, creates a `MongooseDatabase` adapter in express-suite, and refactors `BaseApplication` to depend on `IDatabase`. Work proceeds bottom-up: shared types first, then interfaces, then conformance, then adapter, then application refactoring.

## Tasks

- [x] 1. Promote brightchain-db types to brightchain-lib
  - [x] 1.1 Create `brightchain-lib/src/lib/interfaces/storage/documentTypes.ts` with all types from `brightchain-db/src/lib/types.ts`
    - Move `DocumentId`, `BsonDocument`, `FilterQuery<T>`, `FilterOperator<V>`, `LogicalOperators<T>`, `UpdateOperators<T>`, `UpdateQuery<T>`, `SortSpec<T>`, `ProjectionSpec<T>`, `IndexSpec`, `IndexOptions`, `FindOptions<T>`, `WriteOptions`, `UpdateOptions`, `InsertOneResult`, `InsertManyResult`, `UpdateResult`, `DeleteResult`, `ReplaceResult`, `ChangeEventType`, `ChangeEvent<T>`, `ChangeListener<T>`, `AggregationStage`, `WriteConcern`, `ReadPreference`, `CollectionOptions`, `BulkWriteOperation<T>`, `BulkWriteOptions`, `BulkWriteResult`, `TextIndexOptions`, `CursorSession`
    - Do NOT move `ClientSession` yet (it becomes `IClientSession` in task 2)
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Export `documentTypes` from brightchain-lib barrel files (`brightchain-lib/src/lib/interfaces/storage/index.ts` and main index)
    - _Requirements: 1.1_
  - [x] 1.3 Update `brightchain-db/src/lib/types.ts` to re-export from `@brightchain/brightchain-lib` instead of defining locally
    - Keep `ClientSession` defined locally for now (will be replaced in task 2)
    - Verify all existing brightchain-db imports still resolve
    - _Requirements: 1.2_

- [x] 2. Define IClientSession interface in brightchain-lib
  - [x] 2.1 Create `brightchain-lib/src/lib/interfaces/storage/clientSession.ts` with `IClientSession` interface
    - Declare: `readonly id: string`, `readonly inTransaction: boolean`, `startTransaction(): void`, `commitTransaction(): Promise<void>`, `abortTransaction(): Promise<void>`, `endSession(): void`
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Export `IClientSession` from brightchain-lib barrel files
    - _Requirements: 2.2_
  - [x] 2.3 Update `brightchain-db/src/lib/types.ts` to alias `ClientSession = IClientSession` for backward compatibility
    - Import `IClientSession` from `@brightchain/brightchain-lib`
    - Export `type ClientSession = IClientSession`
    - Update `FindOptions`, `WriteOptions` references to use `IClientSession`
    - _Requirements: 2.3_

- [x] 3. Define ICollection<T> interface in brightchain-lib
  - [x] 3.1 Create `brightchain-lib/src/lib/interfaces/storage/collection.ts` with `ICollection<T>` interface
    - Declare CRUD methods: `insertOne`, `insertMany`, `findOne`, `find`, `findById`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `replaceOne`
    - Declare query methods: `countDocuments`, `estimatedDocumentCount`, `distinct`, `aggregate`
    - Declare index methods: `createIndex`, `dropIndex`, `listIndexes`
    - Declare bulk operations: `bulkWrite`
    - Declare change stream: `watch`
    - Declare schema validation: `setSchema`, `getSchema`, `removeSchema`
    - Declare write concern/read preference: `getWriteConcern`, `setWriteConcern`, `getReadPreference`, `setReadPreference`
    - Declare text index: `createTextIndex`, `dropTextIndex`, `hasTextIndex`
    - Declare lifecycle: `drop`
    - Import all referenced types from `./documentTypes`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  - [x] 3.2 Export `ICollection` from brightchain-lib barrel files
    - _Requirements: 3.10_

- [x] 4. Define IDatabase interface in brightchain-lib
  - [x] 4.1 Create `brightchain-lib/src/lib/interfaces/storage/database.ts` with `IDatabase` interface
    - Declare: `collection<T>(name, options?): ICollection<T>`, `startSession(): IClientSession`, `withTransaction<R>(fn): Promise<R>`, `listCollections(): string[]`, `dropCollection(name): Promise<boolean>`, `connect(uri?): Promise<void>`, `disconnect(): Promise<void>`, `isConnected(): boolean`
    - Import `ICollection` from `./collection`, `IClientSession` from `./clientSession`, `BsonDocument`, `CollectionOptions` from `./documentTypes`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_
  - [x] 4.2 Export `IDatabase` from brightchain-lib barrel files
    - _Requirements: 4.9_

- [x] 5. Checkpoint - Verify interfaces compile
  - Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` and verify no errors
  - Run `NX_TUI=false npx nx run brightchain-db:build --outputStyle=stream` and verify re-exports work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Make brightchain-db Collection implement ICollection
  - [x] 6.1 Update `brightchain-db/src/lib/collection.ts` to add `implements ICollection<T>` to the `Collection` class declaration
    - Import `ICollection` from `@brightchain/brightchain-lib`
    - Resolve any signature mismatches between `Collection` methods and `ICollection` interface
    - Promote `CollectionSchema` type to brightchain-lib if needed (referenced by `setSchema`/`getSchema`)
    - _Requirements: 3.11, 5.5_

- [x] 7. Make brightchain-db BrightChainDb implement IDatabase
  - [x] 7.1 Update `brightchain-db/src/lib/database.ts` to add `implements IDatabase` to the `BrightChainDb` class declaration
    - Import `IDatabase` from `@brightchain/brightchain-lib`
    - Add `private _connected = false` field
    - Add `async connect(_uri?: string): Promise<void>` that sets `_connected = true`
    - Add `async disconnect(): Promise<void>` that sets `_connected = false`
    - Add `isConnected(): boolean` that returns `_connected`
    - Verify `collection()`, `startSession()`, `withTransaction()`, `listCollections()`, `dropCollection()` signatures match `IDatabase`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_
  - [x] 7.2 Write property test for connection state machine
    - **Property 1: Connection state machine**
    - Generate random sequences of connect/disconnect with arbitrary URIs
    - Verify `isConnected()` reflects last operation, no throws
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7**

- [x] 8. Checkpoint - Verify brightchain-db compiles and tests pass
  - Run `NX_TUI=false npx nx run brightchain-db:build --outputStyle=stream`
  - Run `NX_TUI=false npx nx test brightchain-db --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement functional sort/skip/limit in brightchain-db Collection
  - [x] 9.1 Update `Collection.find()` in `brightchain-db/src/lib/collection.ts` to support `FindOptions` sort/skip/limit
    - Apply sort using `SortSpec` field directions (1 ascending, -1 descending)
    - Apply skip after sort
    - Apply limit after skip
    - Multi-field sort: iterate spec entries in order, compare with direction multiplier
    - Handle edge cases: limit=0 returns empty, skip > length returns empty
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 9.2 Write property test for sort-skip-limit model equivalence
    - **Property 2: Sort-skip-limit model equivalence**
    - Generate random document arrays, sort specs, skip/limit values
    - Compare Collection.find() output against reference implementation (manual sort → slice → slice)
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  - [x] 9.3 Write unit tests for sort/skip/limit edge cases
    - Test limit(0) returns empty, skip > length returns empty
    - Test sort ascending and descending with known values
    - Test multi-field sort with known data
    - Test sort + skip + limit chain with known data
    - _Requirements: 8.6, 8.7_

- [x] 10. Checkpoint - Verify sort/skip/limit tests pass
  - Run `NX_TUI=false npx nx test brightchain-db --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create MongooseDatabase adapter in express-suite
  - [x] 11.1 Create `express-suite/packages/digitaldefiance-node-express-suite/src/services/mongoose-session-adapter.ts`
    - Implement `MongooseSessionAdapter` class implementing `IClientSession`
    - Wrap mongoose `ClientSession` methods: `startTransaction`, `commitTransaction`, `abortTransaction`, `endSession`
    - Expose `id` and `inTransaction` as readonly properties
    - _Requirements: 6.6_
  - [x] 11.2 Create `express-suite/packages/digitaldefiance-node-express-suite/src/services/mongoose-collection.ts`
    - Implement `MongooseCollection<T>` class implementing `ICollection<T>`
    - Wrap mongoose `Model<T>` methods for CRUD, query, index, bulk operations
    - Map shared types (`FilterQuery`, `UpdateQuery`, etc.) to mongoose equivalents
    - Schema validation methods (`setSchema`, `getSchema`, `removeSchema`) are no-ops (mongoose handles schema internally)
    - _Requirements: 6.5_
  - [x] 11.3 Create `express-suite/packages/digitaldefiance-node-express-suite/src/services/mongoose-database.ts`
    - Implement `MongooseDatabase` class implementing `IDatabase`
    - `connect(uri?)`: establish mongoose connection
    - `disconnect()`: close mongoose connection
    - `isConnected()`: check `connection.readyState === 1`
    - `collection<T>(name)`: return `MongooseCollection<T>` wrapping the mongoose model
    - `startSession()`: return `MongooseSessionAdapter` wrapping mongoose session
    - `withTransaction(fn)`: execute callback within mongoose transaction with retry logic
    - `listCollections()`: return collection names from connection
    - `dropCollection(name)`: drop via connection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 12. Refactor BaseApplication to use IDatabase
  - [x] 12.1 Update `express-suite/packages/digitaldefiance-node-express-suite/src/application-base.ts`
    - Change constructor to accept `IDatabase` parameter
    - Add duck-typing detection to also accept legacy `IDocumentStore` for backward compatibility
    - Update `start()` to call `_database.connect(uri)`
    - Update `stop()` to call `_database.disconnect()`
    - Add `getCollection<T>(name): ICollection<T>` method delegating to `_database.collection<T>(name)`
    - Keep `getModel<T>()` for backward compatibility during transition
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 12.2 Refactor `withTransaction` in `express-suite/packages/digitaldefiance-node-express-suite/src/utils.ts`
    - Add overloaded signature accepting `IDatabase` instead of mongoose `Connection`
    - When `IDatabase` is passed, use `database.startSession()` for session creation
    - Preserve existing retry logic and error handling
    - Keep legacy signature for backward compatibility
    - _Requirements: 7.6_

- [x] 13. Checkpoint - Verify express-suite compiles and tests pass
  - Run `NX_TUI=false npx nx run digitaldefiance-node-express-suite:build --outputStyle=stream`
  - Run `NX_TUI=false npx nx test digitaldefiance-node-express-suite --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Write remaining tests
  - [x] 14.1 Write property test for document storage round-trip
    - **Property 3: Document storage round-trip**
    - Generate random documents with string, number, boolean, nested object, and array fields
    - Insert via `collection.insertOne()`, retrieve via `collection.findById()`, assert deep equality (ignoring `_id`)
    - **Validates: Requirements 9.1, 9.2**
  - [x] 14.2 Write property test for JSON serialization round-trip
    - **Property 4: JSON serialization round-trip**
    - Generate random documents, insert, retrieve, JSON.stringify then JSON.parse, assert deep equality (ignoring `_id`)
    - **Validates: Requirements 9.3**
  - [x] 14.3 Write unit tests for BrightChainDb IDatabase conformance
    - Test connection lifecycle: isConnected false initially, true after connect, false after disconnect
    - Test BrightChainDb has all IDatabase methods
    - Test Collection has all ICollection methods
    - _Requirements: 4.10, 5.1, 5.5_
  - [x] 14.4 Write unit tests for MongooseDatabase adapter
    - Test MongooseDatabase implements IDatabase interface
    - Test MongooseSessionAdapter implements IClientSession interface
    - Test MongooseCollection implements ICollection interface
    - _Requirements: 6.1, 6.5, 6.6_
  - [x] 14.5 Write unit tests for BaseApplication with IDatabase
    - Test BaseApplication accepts IDatabase, start calls connect, stop calls disconnect
    - Test backward compatibility with legacy IDocumentStore
    - Test withTransaction works with IDatabase
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Run `NX_TUI=false npx nx run-many -t build --projects=brightchain-lib,brightchain-db,digitaldefiance-node-express-suite --outputStyle=stream`
  - Run `NX_TUI=false npx nx run-many -t test --projects=brightchain-db,digitaldefiance-node-express-suite --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure all express-suite tests pass, especially the express-suite-example needs to remain functional after updates

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- `BrightChainDb` with an in-memory block store is used as the backing store in property tests
- The `CollectionSchema` type referenced by `ICollection.setSchema`/`getSchema` may need to be promoted to brightchain-lib alongside the other types
- The backward compatibility shim in BaseApplication (duck-typing `IDatabase` vs `IDocumentStore`) is a transition mechanism — the legacy `IDocumentStore` path can be removed in a future cleanup
