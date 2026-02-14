# Requirements Document

## Introduction

The `@brightchain/brightchain-lib` and `@digitaldefiance/node-express-suite` packages have a circular dependency. Express-suite imports generic storage abstraction interfaces (IDatabase, ICollection, IClientSession, IFailableResult, IDatabaseLifecycleHooks, and ~30 document types) from brightchain-lib, while brightchain-lib imports API response types (IApiMessageResponse, ApiRequestHandler, ApiResponse, JsonResponse, IJwtConsts) from express-suite. This spec covers moving the generic storage abstraction interfaces into express-suite so the dependency becomes one-directional: brightchain-lib → express-suite.

## Glossary

- **Storage_Abstraction_Types**: The set of generic database/collection/session/document interfaces and types currently defined in brightchain-lib's `interfaces/storage/` directory: IDatabase, ICollection, IClientSession, IDatabaseLifecycleHooks, and all types from documentTypes.ts (FilterQuery, FindOptions, UpdateQuery, UpdateResult, DeleteResult, InsertOneResult, InsertManyResult, BsonDocument, DocumentId, IndexSpec, IndexOptions, AggregationStage, BulkWriteOperation, BulkWriteOptions, BulkWriteResult, ChangeListener, CollectionSchema, ReadPreference, ReplaceResult, TextIndexOptions, UpdateOptions, ValidationFieldError, WriteConcern, WriteOptions, CollectionOptions, SortSpec, ProjectionSpec, ChangeEvent, ChangeEventType, CursorSession, FieldSchema, CollectionSchemaFieldType, ClientSession alias, FilterOperator, LogicalOperators, UpdateOperators).
- **IFailableResult**: A generic result type for operations that can succeed or fail, currently defined in brightchain-lib's `interfaces/failableResult.ts`.
- **Block_Store_Types**: Brightchain-domain-specific storage interfaces (IBlockStore, IBlockMetadataStore, ICBLStore, etc.) that remain in brightchain-lib.
- **Express_Suite**: The `@digitaldefiance/node-express-suite` package, located in the `express-suite/` git submodule.
- **Brightchain_Lib**: The `@brightchain/brightchain-lib` package.
- **Barrel_Export**: An `index.ts` file that re-exports symbols from multiple modules to provide a single import path.
- **Backward_Compatible_Re_Export**: A re-export in Brightchain_Lib that imports a type from Express_Suite and re-exports it under the original path, so existing consumers do not break.

## Requirements

### Requirement 1: Move Storage Abstraction Types to Express Suite

**User Story:** As a developer, I want the generic storage abstraction types to live in Express_Suite, so that Express_Suite no longer depends on Brightchain_Lib and the circular dependency is eliminated.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Express_Suite package SHALL define and export all Storage_Abstraction_Types and IFailableResult from its own source files.
2. WHEN the migration is complete, THE Express_Suite package SHALL NOT list `@brightchain/brightchain-lib` as a dependency in its package.json.
3. WHEN the migration is complete, THE Brightchain_Lib storage barrel (`interfaces/storage/index.ts`) SHALL re-export all Storage_Abstraction_Types from `@digitaldefiance/node-express-suite` as Backward_Compatible_Re_Exports.
4. WHEN the migration is complete, THE Brightchain_Lib interfaces barrel (`interfaces/index.ts`) SHALL re-export IFailableResult from `@digitaldefiance/node-express-suite` as a Backward_Compatible_Re_Export.
5. WHEN the migration is complete, THE Block_Store_Types SHALL remain defined in Brightchain_Lib and SHALL NOT be moved to Express_Suite.

### Requirement 2: Update Express Suite Internal Imports

**User Story:** As a developer, I want Express_Suite's internal files to import storage types from local paths instead of from `@brightchain/brightchain-lib`, so that the package is self-contained.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Express_Suite files (mongoose-collection.ts, mongoose-database.ts, mongoose-session-adapter.ts, application-base.ts, utils.ts) SHALL import Storage_Abstraction_Types and IFailableResult from local Express_Suite paths instead of from `@brightchain/brightchain-lib`.
2. WHEN the migration is complete, THE Express_Suite failable-result.ts interface file SHALL define or locally re-export IFailableResult without referencing `@brightchain/brightchain-lib`.
3. WHEN the migration is complete, THE Express_Suite source files SHALL contain zero import statements referencing `@brightchain/brightchain-lib`.

### Requirement 3: Maintain Backward Compatibility for Brightchain Lib Consumers

**User Story:** As a developer consuming brightchain-lib, I want to continue importing storage types from `@brightchain/brightchain-lib` without changing my code, so that the migration is non-breaking.

#### Acceptance Criteria

1. THE Brightchain_Lib SHALL continue to export all Storage_Abstraction_Types from its public API (barrel exports) after the migration.
2. THE Brightchain_Lib SHALL continue to export IFailableResult from its public API after the migration.
3. WHEN a consumer imports a Storage_Abstraction_Type from `@brightchain/brightchain-lib`, THE imported type SHALL be structurally identical to the type now defined in Express_Suite.
4. WHEN the migration is complete, THE Brightchain_Lib Block_Store_Types that depend on Storage_Abstraction_Types (e.g., IBlockStore referencing ICollection) SHALL resolve those dependencies through the re-exported types.

### Requirement 4: Preserve Type Correctness

**User Story:** As a developer, I want all TypeScript compilation to succeed after the migration, so that no type errors are introduced.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Express_Suite project SHALL compile without TypeScript errors.
2. WHEN the migration is complete, THE Brightchain_Lib project SHALL compile without TypeScript errors.
3. WHEN the migration is complete, THE existing test suites for Express_Suite SHALL pass without modification to test logic (only import paths may change).
4. WHEN the migration is complete, THE existing test suites for Brightchain_Lib SHALL pass without modification to test logic.

### Requirement 5: Maintain Dependency Direction

**User Story:** As an architect, I want the dependency graph to be acyclic after the migration, so that builds and tooling work correctly.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Nx dependency graph SHALL show no circular dependency between Brightchain_Lib and Express_Suite.
2. THE Brightchain_Lib package.json SHALL list `@digitaldefiance/node-express-suite` as a dependency (it already does for API response types).
3. THE Express_Suite package.json SHALL NOT list `@brightchain/brightchain-lib` as a dependency.
