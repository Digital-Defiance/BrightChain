# Requirements Document

## Introduction

BrightChain's `brightchain-db` package already implements a full MongoDB-compatible document database with `BrightChainDb` (database), `Collection` (collection-level CRUD/query/index/aggregation), and `ClientSession` (transactions). However, the application layer (`BaseApplication` in `express-suite`) depends on `IDocumentStore`, which is tightly coupled to mongoose types (`Model<T>`, `Connection`, `MongoMemoryReplSet`).

This feature promotes `brightchain-db`'s types to shared interfaces in `brightchain-lib`, defines `IDatabase`, `ICollection<T>`, and `IClientSession` interfaces that both `BrightChainDb` and a new `MongooseDatabase` adapter can implement, and refactors `BaseApplication` to depend on `IDatabase` instead of `IDocumentStore`. The old `IDocumentStore` interface becomes unnecessary once both backends conform to `IDatabase`.

Per AGENTS.md, shared interfaces belong in `brightchain-lib` and Node.js-specific implementations stay in their respective packages.

## Glossary

- **IDatabase**: The new storage-agnostic database interface in `brightchain-lib` declaring `collection<T>(name)`, `startSession()`, `withTransaction()`, `listCollections()`, `dropCollection()`, `connect()`, `disconnect()`, `isConnected()`.
- **ICollection**: The new storage-agnostic collection interface in `brightchain-lib` declaring the full CRUD/query/index/aggregation surface that `brightchain-db`'s `Collection` already implements.
- **IClientSession**: The new storage-agnostic session interface in `brightchain-lib` for transaction support, matching `brightchain-db`'s existing `ClientSession` type.
- **BrightChainDb**: The existing database class in `brightchain-db` that will implement `IDatabase`.
- **Collection**: The existing collection class in `brightchain-db` that will implement `ICollection`.
- **MongooseDatabase**: A new adapter class in `express-suite` that wraps a mongoose connection to implement `IDatabase`.
- **BaseApplication**: The core application class in `express-suite` that manages database lifecycle, to be refactored to depend on `IDatabase`.
- **IDocumentStore**: The existing storage interface in `express-suite`, to be replaced by `IDatabase`.
- **MongooseDocumentStore**: The existing `IDocumentStore` implementation wrapping mongoose in `express-suite`.

## Requirements

### Requirement 1: Promote brightchain-db Types to Shared Interfaces

**User Story:** As a library maintainer, I want the MongoDB-compatible types defined in `brightchain-db` to be available as shared interfaces in `brightchain-lib`, so that both `brightchain-db` and mongoose-based implementations can reference the same type contracts without depending on each other.

#### Acceptance Criteria

1. THE Shared_Type_Module SHALL export the following types from `brightchain-lib/src/lib/interfaces/storage/`: `DocumentId`, `BsonDocument`, `FilterQuery<T>`, `FilterOperator<V>`, `LogicalOperators<T>`, `UpdateOperators<T>`, `UpdateQuery<T>`, `SortSpec<T>`, `ProjectionSpec<T>`, `IndexSpec`, `IndexOptions`, `FindOptions<T>`, `WriteOptions`, `UpdateOptions`, `InsertOneResult`, `InsertManyResult`, `UpdateResult`, `DeleteResult`, `ReplaceResult`, `ChangeEventType`, `ChangeEvent<T>`, `ChangeListener<T>`, `AggregationStage`, `WriteConcern`, `ReadPreference`, `CollectionOptions`, `BulkWriteOperation<T>`, `BulkWriteOptions`, `BulkWriteResult`, `TextIndexOptions`, `CursorSession`.
2. WHEN `brightchain-db` imports these types, THE `brightchain-db` package SHALL re-export them from `brightchain-lib` instead of defining them locally.
3. THE promoted types SHALL have identical signatures to the existing `brightchain-db/src/lib/types.ts` definitions.

### Requirement 2: Define IClientSession Interface

**User Story:** As a library consumer, I want a shared `IClientSession` interface in `brightchain-lib`, so that transaction-aware code can work with any database backend without coupling to a specific implementation.

#### Acceptance Criteria

1. THE IClientSession interface SHALL declare: `readonly id: string`, `readonly inTransaction: boolean`, `startTransaction(): void`, `commitTransaction(): Promise<void>`, `abortTransaction(): Promise<void>`, `endSession(): void`.
2. THE IClientSession interface SHALL be defined in `brightchain-lib/src/lib/interfaces/storage/`.
3. WHEN `brightchain-db`'s `DbSession` class is used, THE DbSession SHALL satisfy the `IClientSession` interface.

### Requirement 3: Define ICollection<T> Interface

**User Story:** As a library consumer, I want a shared `ICollection<T>` interface in `brightchain-lib`, so that code operating on collections can work with any database backend.

#### Acceptance Criteria

1. THE ICollection interface SHALL declare CRUD methods: `insertOne`, `insertMany`, `findOne`, `find`, `findById`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `replaceOne`.
2. THE ICollection interface SHALL declare query methods: `countDocuments`, `estimatedDocumentCount`, `distinct`, `aggregate`.
3. THE ICollection interface SHALL declare index methods: `createIndex`, `dropIndex`, `listIndexes`.
4. THE ICollection interface SHALL declare bulk operations: `bulkWrite`.
5. THE ICollection interface SHALL declare change stream support: `watch`.
6. THE ICollection interface SHALL declare schema validation methods: `setSchema`, `getSchema`, `removeSchema`, `validateDoc`.
7. THE ICollection interface SHALL declare write concern and read preference methods: `getWriteConcern`, `setWriteConcern`, `getReadPreference`, `setReadPreference`.
8. THE ICollection interface SHALL declare text index methods: `createTextIndex`, `dropTextIndex`, `hasTextIndex`.
9. THE ICollection interface SHALL declare a `drop` method for removing the collection.
10. THE ICollection interface SHALL be defined in `brightchain-lib/src/lib/interfaces/storage/`.
11. WHEN `brightchain-db`'s `Collection` class is used, THE Collection SHALL satisfy the `ICollection` interface.

### Requirement 4: Define IDatabase Interface

**User Story:** As a library consumer, I want a shared `IDatabase` interface in `brightchain-lib`, so that application code can work with any database backend (brightchain-db or mongoose) through a single contract.

#### Acceptance Criteria

1. THE IDatabase interface SHALL declare `collection<T>(name: string, options?: CollectionOptions): ICollection<T>`.
2. THE IDatabase interface SHALL declare `startSession(): IClientSession`.
3. THE IDatabase interface SHALL declare `withTransaction<R>(fn: (session: IClientSession) => Promise<R>): Promise<R>`.
4. THE IDatabase interface SHALL declare `listCollections(): string[]`.
5. THE IDatabase interface SHALL declare `dropCollection(name: string): Promise<boolean>`.
6. THE IDatabase interface SHALL declare `connect(uri?: string): Promise<void>`.
7. THE IDatabase interface SHALL declare `disconnect(): Promise<void>`.
8. THE IDatabase interface SHALL declare `isConnected(): boolean`.
9. THE IDatabase interface SHALL be defined in `brightchain-lib/src/lib/interfaces/storage/`.
10. WHEN `brightchain-db`'s `BrightChainDb` class is used, THE BrightChainDb SHALL satisfy the `IDatabase` interface (after adding `connect`, `disconnect`, `isConnected` methods).

### Requirement 5: Make brightchain-db Conform to Shared Interfaces

**User Story:** As a library maintainer, I want `brightchain-db`'s `BrightChainDb` and `Collection` classes to implement `IDatabase` and `ICollection` respectively, so that they can be used wherever the shared interfaces are expected.

#### Acceptance Criteria

1. WHEN `BrightChainDb` is instantiated, THE BrightChainDb class SHALL implement the `IDatabase` interface.
2. THE BrightChainDb class SHALL add `connect(uri?: string): Promise<void>` that transitions to a connected state (block storage does not require a network connection, so the URI is accepted but ignored).
3. THE BrightChainDb class SHALL add `disconnect(): Promise<void>` that transitions to a disconnected state.
4. THE BrightChainDb class SHALL add `isConnected(): boolean` that returns the current connection state.
5. WHEN `Collection` is instantiated, THE Collection class SHALL implement the `ICollection` interface.
6. WHEN `connect` is called on an already-connected BrightChainDb, THE BrightChainDb SHALL complete without error.
7. WHEN `disconnect` is called on an already-disconnected BrightChainDb, THE BrightChainDb SHALL complete without error.

### Requirement 6: Create MongooseDatabase Adapter

**User Story:** As a library consumer, I want a `MongooseDatabase` adapter in `express-suite` that wraps a mongoose connection to implement `IDatabase`, so that existing mongoose-based applications can use the new unified interface.

#### Acceptance Criteria

1. THE MongooseDatabase class SHALL implement the `IDatabase` interface from `brightchain-lib`.
2. WHEN `connect(uri)` is called, THE MongooseDatabase SHALL establish a mongoose connection to the given URI.
3. WHEN `disconnect()` is called, THE MongooseDatabase SHALL close the mongoose connection.
4. WHEN `isConnected()` is called, THE MongooseDatabase SHALL return true if the mongoose connection is in the `connected` state.
5. WHEN `collection<T>(name)` is called, THE MongooseDatabase SHALL return an `ICollection<T>`-compatible wrapper around the mongoose model for that collection.
6. WHEN `startSession()` is called, THE MongooseDatabase SHALL return an `IClientSession`-compatible wrapper around a mongoose `ClientSession`.
7. WHEN `withTransaction(fn)` is called, THE MongooseDatabase SHALL execute the callback within a mongoose transaction with retry logic for transient errors.
8. THE MongooseDatabase class SHALL be defined in `express-suite` since it depends on mongoose (a Node.js-specific dependency).

### Requirement 7: Refactor BaseApplication to Use IDatabase

**User Story:** As a library consumer, I want `BaseApplication` to depend on `IDatabase` instead of `IDocumentStore`, so that any `IDatabase` implementation (brightchain-db or mongoose) can be injected without code changes.

#### Acceptance Criteria

1. THE BaseApplication constructor SHALL accept an `IDatabase` parameter instead of `IDocumentStore`.
2. WHEN `Application.start` is called, THE Application SHALL call `connect` on the `IDatabase` instance and proceed to ready state.
3. WHEN `Application.stop` is called, THE Application SHALL call `disconnect` on the `IDatabase` instance.
4. WHEN `Application.getModel` is called, THE Application SHALL delegate to `IDatabase.collection<T>(name)` and return the `ICollection<T>`.
5. THE BaseApplication SHALL maintain backward compatibility by accepting either `IDatabase` or the legacy `IDocumentStore` during a transition period.
6. THE `withTransaction` utility in express-suite SHALL be refactored to work with `IDatabase.startSession()` returning `IClientSession` instead of requiring a mongoose `Connection`.

### Requirement 8: Functional QueryBuilder for brightchain-db Collection

**User Story:** As a library consumer, I want `sort`, `limit`, and `skip` to produce correct results on brightchain-db's in-memory collections, so that query chains behave like MongoDB queries.

#### Acceptance Criteria

1. WHEN `sort` is called with a sort specification object on a `find` result, THE Collection SHALL order results according to the specified field directions (1 for ascending, -1 for descending).
2. WHEN `limit` is called with a positive integer, THE Collection SHALL return at most that many documents from the result set.
3. WHEN `skip` is called with a non-negative integer, THE Collection SHALL omit that many documents from the beginning of the result set.
4. WHEN `sort`, `limit`, and `skip` are chained together, THE Collection SHALL apply them in the order: sort first, then skip, then limit.
5. WHEN `sort` is called with multiple fields, THE Collection SHALL sort by the first field, then by subsequent fields for documents with equal values in prior fields.
6. WHEN `limit` is called with zero, THE Collection SHALL return an empty result set.
7. WHEN `skip` exceeds the total number of documents, THE Collection SHALL return an empty result set.

### Requirement 9: Document Storage Round-Trip

**User Story:** As a library consumer, I want documents stored through `ICollection` to be retrievable with identical field values, so that no data is lost or corrupted during storage and retrieval.

#### Acceptance Criteria

1. FOR ALL valid document objects, storing a document via `insertOne` and then retrieving it via `findById` SHALL produce a document with equivalent field values to the original.
2. WHEN a document contains nested objects and arrays, THE ICollection implementation SHALL preserve the nested structure through storage and retrieval.
3. FOR ALL valid document objects, storing via `insertOne`, serializing the result to JSON, and deserializing SHALL produce an equivalent object (JSON round-trip).
