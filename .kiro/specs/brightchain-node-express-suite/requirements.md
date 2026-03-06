# Requirements Document

## Introduction

`@brightchain/node-express-suite` is extracted from the existing `@brightchain/brightchain-api-lib` codebase. It contains the generic BrightDB-backed Express infrastructure that is NOT specific to BrightChain domain features (quorum, messaging, BrightPass, BrightHub, energy, etc.).

The approach is "extract, split, and extend":
1. Files that are purely generic BrightDB-Express infrastructure are **moved** from `brightchain-api-lib` into the new library.
2. Files that mix generic infrastructure with domain logic are **split**: a base class goes to the new library, and `brightchain-api-lib` retains a subclass that extends it.
3. `brightchain-api-lib` adds `@brightchain/node-express-suite` as a dependency and imports from it.
4. No code is deleted or lost — everything either moves or stays.

The resulting dependency hierarchy:
```
@digitaldefiance/node-express-suite     ← Generic Mongo-based Express infra (external, unchanged)
        ↓ extends
@brightchain/node-express-suite         ← Generic BrightDB-based Express infra (extracted from api-lib)
        ↓ extends
@brightchain/brightchain-api-lib        ← BrightChain domain features only
        ↓ consumes
brightchain-api                         ← The actual running application
```

## Glossary

- **Suite**: The `@brightchain/node-express-suite` library being specified in this document
- **Upstream**: The `@digitaldefiance/node-express-suite` npm package providing Mongo/Mongoose-based Express infrastructure
- **BrightDB**: The `@brightchain/db` MongoDB-like document database backed by BrightChain's block store
- **Api-Lib**: The existing `@brightchain/brightchain-api-lib` library that currently contains both generic and domain-specific code
- **Domain_Feature**: A BrightChain-specific feature (e.g., BrightPass, BrightHub, quorum, messaging, energy, WebSocket, UPnP) that belongs in Api-Lib, not in the Suite
- **Straight_Move**: A file that is purely generic infrastructure and can be moved from Api-Lib to the Suite without modification
- **Split_File**: A file that contains both generic and domain-specific code, requiring extraction of a base class into the Suite while Api-Lib retains a subclass

## Requirements

### Requirement 1: Library Package Structure

**User Story:** As a developer, I want the Suite scaffolded as an Nx library project, so that it integrates with the existing workspace build system.

#### Acceptance Criteria

1. THE Suite SHALL be an Nx library project located at `brightchain-node-express-suite/` in the workspace root
2. THE Suite SHALL declare `@digitaldefiance/node-express-suite`, `@brightchain/brightchain-lib`, and `@brightchain/db` as peer dependencies
3. THE Suite SHALL export a single public API via `src/index.ts`
4. THE Suite SHALL compile targeting the same tsconfig settings as the workspace
5. THE Suite SHALL NOT depend on `@brightchain/brightchain-api-lib` at runtime

### Requirement 2: Straight Move — Datastore Module

**User Story:** As a developer, I want the generic document store interfaces and block-document-store factory moved to the Suite, so that Api-Lib can import them from the new library.

#### Acceptance Criteria

1. THE Suite SHALL contain the `DocumentStore`, `DocumentCollection`, `QueryBuilder`, `QueryResult`, and `DocumentRecord` interfaces (from Api-Lib's `src/lib/datastore/document-store.ts`)
2. THE Suite SHALL contain the `BlockDocumentStore` class (from Api-Lib's `src/lib/datastore/block-document-store.ts`)
3. THE Suite SHALL contain the `createBlockDocumentStore` factory function (from Api-Lib's `src/lib/datastore/block-document-store-factory.ts`)
4. THE Suite SHALL contain the `MemoryDocumentStore` class (from Api-Lib's `src/lib/datastore/memory-document-store.ts`)
5. WHEN the datastore files are moved, THE Api-Lib SHALL update its imports to reference the Suite instead of local paths
6. THE Suite SHALL re-export all datastore symbols from `src/index.ts`

### Requirement 3: Straight Move — Shared Types

**User Story:** As a developer, I want the generic shared types moved to the Suite, so that both the Suite and Api-Lib can reference them.

#### Acceptance Criteria

1. THE Suite SHALL contain the `ClientSession`, `DefaultBackendIdType`, `IBlockStorageSchema`, `IBlockStorageModel`, `IBlockStorageSchemaEntry`, and `SchemaMap` types (from Api-Lib's `src/lib/shared-types.ts`)
2. THE Suite SHALL contain the `DefaultBackendIdType` type definition (from Api-Lib's `src/lib/types/backend-id.ts`)
3. WHEN the shared types are moved, THE Api-Lib SHALL update its imports to reference the Suite

### Requirement 4: Straight Move — Database Initialization

**User Story:** As a developer, I want the generic database initialization function moved to the Suite, so that any BrightDB-backed application can initialize its database stack.

#### Acceptance Criteria

1. THE Suite SHALL contain the `brightchainDatabaseInit` function (from Api-Lib's `src/lib/databaseInit.ts`)
2. THE Suite SHALL contain the `BlockStoreFactory` class (from Api-Lib's `src/lib/factories/blockStoreFactory.ts`)
3. WHEN the database init is moved, THE Api-Lib SHALL update its imports to reference the Suite
4. IF the `brightchainDatabaseInit` function references domain-specific hydration schemas (e.g., `createEnergyAccountHydrationSchema`), THEN THE function SHALL accept hydration configuration as a parameter rather than importing it directly

### Requirement 5: Straight Move — User Validation

**User Story:** As a developer, I want the generic user validation utilities moved to the Suite, so that any BrightDB-backed application can validate user input.

#### Acceptance Criteria

1. THE Suite SHALL contain the `validateRegistration`, `validateLogin`, `validatePasswordChange`, and `validateRecovery` functions (from Api-Lib's `src/lib/validation/userValidation.ts`)
2. THE Suite SHALL contain the `validateBody` middleware factory (from Api-Lib's `src/lib/middleware/validateBody.ts`)
3. WHEN the validation files are moved, THE Api-Lib SHALL update its imports to reference the Suite

### Requirement 6: Straight Move — Session Adapter

**User Story:** As a developer, I want the BrightDB-backed session adapter moved to the Suite, so that any BrightDB-backed application can manage sessions.

#### Acceptance Criteria

1. THE Suite SHALL contain the `BrightChainSessionAdapter` class and `ISessionDocument` interface (from Api-Lib's `src/lib/services/sessionAdapter.ts`)
2. WHEN the session adapter is moved, THE Api-Lib SHALL update its imports to reference the Suite
3. THE session adapter SHALL have no dependencies on domain-specific Api-Lib modules

### Requirement 7: Split File — Environment

**User Story:** As a developer, I want the Environment class split so that generic BrightDB environment configuration lives in the Suite and domain-specific configuration stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a `BrightDbEnvironment` class that extends the Upstream `Environment`
2. THE `BrightDbEnvironment` class SHALL contain the BrightDB-specific environment variable parsing: `BRIGHTCHAIN_BLOCKSTORE_PATH`, `BRIGHTCHAIN_BLOCKSIZE_BYTES`, `BRIGHTCHAIN_BLOCKSTORE_TYPE`, `USE_MEMORY_DOCSTORE`, and cloud configuration (Azure, S3)
3. THE `BrightDbEnvironment` class SHALL expose typed accessors: `blockStorePath`, `blockStoreBlockSizes`, `blockStoreType`, `useMemoryDocumentStore`, `azureConfig`, `s3Config`
4. IF `BRIGHTCHAIN_BLOCKSTORE_TYPE` contains an unrecognized value, THEN THE `BrightDbEnvironment` class SHALL throw an error listing valid values
5. THE Api-Lib `Environment` class SHALL extend `BrightDbEnvironment` instead of the Upstream `Environment` directly
6. THE Api-Lib `Environment` class SHALL retain domain-specific env vars: `FONTAWESOME_KIT_ID`, `MEMBER_POOL_NAME`, `USE_TRANSACTIONS`, UPnP config, AWS credentials, and all domain-specific defaults

### Requirement 8: Split File — Application

**User Story:** As a developer, I want the Application class split so that generic BrightDB application lifecycle lives in the Suite and domain-specific service wiring stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a `BrightDbApplication` class that extends the Upstream `Application`
2. THE `BrightDbApplication` class SHALL provide a `db` accessor that returns the BrightDB `DocumentStore`
3. THE `BrightDbApplication` class SHALL provide a `getModel` method that retrieves a BrightDB collection or Model by name
4. THE `BrightDbApplication` class SHALL capture the HTTP server reference during `start()` for subclass use
5. THE Api-Lib `App` class SHALL extend `BrightDbApplication` instead of the Upstream `Application` directly
6. THE Api-Lib `App` class SHALL retain all domain-specific service wiring in its `start()` override: quorum, WebSocket, BrightHub, messaging, UPnP, energy, email, etc.

### Requirement 9: Split File — Database Plugin

**User Story:** As a developer, I want the database plugin split so that generic BrightDB lifecycle management lives in the Suite and domain-specific store initialization stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a `BrightDbDatabasePlugin` class that implements the Upstream `IDatabasePlugin` interface
2. THE `BrightDbDatabasePlugin` class SHALL manage BrightDB lifecycle: `connect()` using `brightchainDatabaseInit`, `disconnect()` releasing references (idempotent), `isConnected()` returning boolean state
3. THE `BrightDbDatabasePlugin` class SHALL expose typed accessors: `database` (IDatabase), `brightDb` (BrightDb), `blockStore` (IBlockStore)
4. WHILE the `BrightDbDatabasePlugin` is not connected, THE `BrightDbDatabasePlugin` SHALL throw an error when `database`, `brightDb`, or `blockStore` is accessed
5. THE Api-Lib `BrightChainDatabasePlugin` class SHALL extend `BrightDbDatabasePlugin` instead of implementing `IDatabasePlugin` directly
6. THE Api-Lib `BrightChainDatabasePlugin` class SHALL retain domain-specific functionality: `MemberStore`, `EnergyAccountStore`, RBAC seeding, `seedWithRbac`, `seedProductionIfEmpty`, `buildMemberInitConfig`, `buildRbacUserInputs`

### Requirement 10: Split File — Configure App Helper

**User Story:** As a developer, I want the app configuration helper split so that generic BrightDB app wiring lives in the Suite and domain-specific GUID/constants/runtime registration stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a `configureBrightDbApp` function that accepts an Application and Environment, creates a `BrightDbDatabasePlugin`, and registers it on the application
2. THE Api-Lib `configureBrightChainApp` function SHALL call `configureBrightDbApp` internally, then add domain-specific configuration: GUID provider setup, `initializeBrightChain()`, constants updates, runtime registration

### Requirement 11: Split File — Authentication Provider

**User Story:** As a developer, I want the authentication provider split so that generic BrightDB-backed auth lives in the Suite and MemberStore-specific auth stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a `BrightDbAuthenticationProvider` class that implements the Upstream `IAuthenticationProvider` interface
2. THE `BrightDbAuthenticationProvider` class SHALL use BrightDB collections directly for user lookup (`findUserById`, `buildRequestUserDTO`) and JWT verification (`verifyToken`)
3. THE Api-Lib `BrightChainAuthenticationProvider` class SHALL extend `BrightDbAuthenticationProvider` and add MemberStore-based lookup with CBL block hydration, mnemonic authentication, and password authentication

### Requirement 12: Split File — Constants

**User Story:** As a developer, I want constants split so that generic BrightDB constants live in the Suite and domain-specific BrightChain constants stay in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export generic BrightDB-related constants (base express constants for a BrightDB app)
2. THE Api-Lib `Constants` SHALL extend or merge the Suite's constants with domain-specific values (`WRAPPED_KEY`, BrightChain-specific GUID provider, etc.)

### Requirement 13: Split File — Middlewares

**User Story:** As a developer, I want middleware initialization split so that generic middleware lives in the Suite and domain-specific CSP/CORS configuration stays in Api-Lib.

#### Acceptance Criteria

1. THE Suite SHALL export a generic middleware initialization function with standard Express security middleware (helmet, cors, json, urlencoded)
2. THE Api-Lib `Middlewares` class SHALL extend or wrap the Suite's middleware, adding domain-specific CSP directives (fontawesome, brightchain.org, flagcdn, etc.)

### Requirement 14: Re-exported Upstream and BrightDB Infrastructure

**User Story:** As a developer, I want the Suite to re-export relevant upstream and BrightDB infrastructure, so that consumers get a single import point.

#### Acceptance Criteria

1. THE Suite SHALL re-export relevant Upstream infrastructure: `BaseApplication`, `Application`, `BaseController`, routers, middleware, services, decorators, validation, types, plugins, etc.
2. THE Suite SHALL re-export core BrightDB types and utilities from `@brightchain/db`: `BrightDb`, `Collection`, `Model`, query engines, schema validation, transactions, indexing, etc.
3. THE Suite SHALL re-export generic BrightChain core utilities from `@brightchain/brightchain-lib`: `BlockSize`, `BlockStoreType`, `validBlockSizes`, `InMemoryDatabase`, `MemoryBlockStore`
4. THE Suite SHALL NOT re-export BrightChain domain-specific modules (CBL, FEC, TUPLE, SEALING, quorum, members, energy)

### Requirement 15: Api-Lib Dependency Update

**User Story:** As a developer, I want Api-Lib to depend on the Suite and import generic infrastructure from it, so that there is no code duplication.

#### Acceptance Criteria

1. THE Api-Lib SHALL add `@brightchain/node-express-suite` as a dependency in its `package.json`
2. WHEN files are moved from Api-Lib to the Suite, THE Api-Lib SHALL update all internal imports to reference the Suite
3. THE Api-Lib SHALL re-export Suite symbols where needed to maintain backward compatibility for existing consumers
4. ALL existing tests in Api-Lib SHALL continue to pass after the migration

### Requirement 16: Application Compatibility

**User Story:** As a developer, I want the `brightchain-api` application to require minimal or no changes after the extraction, so that the running application is not disrupted.

#### Acceptance Criteria

1. THE `brightchain-api` application's `main.ts` SHALL require minimal or no changes after the extraction
2. ALL existing functionality SHALL be preserved — no code is deleted or lost
3. THE build output of `brightchain-api-lib` SHALL remain compatible with existing consumers

### Requirement 17: Testing Utilities

**User Story:** As a developer, I want the Suite to provide testing utilities for creating in-memory BrightDB-backed application instances.

#### Acceptance Criteria

1. THE Suite SHALL export a `createTestApp` function that returns an Application backed by an in-memory BrightDB instance
2. THE `createTestApp` function SHALL accept optional Environment overrides for test-specific configuration
3. THE `createTestApp` function SHALL return a teardown function that stops the Application and cleans up resources
