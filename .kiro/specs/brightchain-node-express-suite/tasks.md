# Implementation Plan: @brightchain/node-express-suite (Extract, Split, and Extend)

## Overview

Incrementally extract generic BrightDB-backed Express infrastructure from `brightchain-api-lib` into the new `@brightchain/node-express-suite` library. Each task group moves or splits files, updates imports, and verifies builds/tests pass. The approach is move-first, not write-from-scratch.

## Tasks

- [ ] 1. Scaffold the Nx library project
  - [ ] 1.1 Generate the `brightchain-node-express-suite` library using `yarn nx g @nx/js:library`
    - Place at `brightchain-node-express-suite/` in the workspace root
    - Configure Jest as the test runner
    - Set up `src/index.ts` as the public API entry point
    - _Requirements: 1.1, 1.3_
  - [ ] 1.2 Configure peer dependencies and tsconfig
    - Add `@digitaldefiance/node-express-suite`, `@brightchain/brightchain-lib`, and `@brightchain/db` as peer dependencies in `package.json`
    - Ensure tsconfig extends workspace `tsconfig.base.json`
    - Add `@brightchain/node-express-suite` path mapping to workspace `tsconfig.base.json`
    - _Requirements: 1.2, 1.4, 1.5_
  - [ ] 1.3 Add `@brightchain/node-express-suite` as a dependency in `brightchain-api-lib/package.json`
    - _Requirements: 15.1_

- [ ] 2. Straight Move — Shared Types
  - [ ] 2.1 Copy `src/lib/shared-types.ts` and `src/lib/types/backend-id.ts` from api-lib to the new library
    - Adjust imports within the copied files to reference peer dependencies instead of local api-lib paths
    - The `shared-types.ts` imports `ModelName` and `SchemaCollection` enums from api-lib — these enum references need to be either moved or made generic (use string types if they are domain-specific)
    - _Requirements: 3.1, 3.2_
  - [ ] 2.2 Update api-lib to re-export shared types from the Suite
    - Replace the original files with re-exports from `@brightchain/node-express-suite`
    - Ensure all internal api-lib imports still resolve
    - _Requirements: 3.3_

- [ ] 3. Straight Move — Datastore Module
  - [ ] 3.1 Copy the entire `src/lib/datastore/` directory from api-lib to the new library
    - `document-store.ts` — interfaces only, no changes needed
    - `block-document-store.ts` — uses `@brightchain/brightchain-lib` and `@brightchain/db` only
    - `memory-document-store.ts` — pure in-memory implementation
    - `block-document-store-factory.ts` — NEEDS REFACTORING: currently imports `DiskBlockAsyncStore` from api-lib's `stores/`. Either move `DiskBlockAsyncStore` too, or refactor the factory to accept a block store instance/factory function instead of importing directly
    - `index.ts` — barrel re-export
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ] 3.2 Copy associated datastore test files from api-lib to the new library
    - `block-document-store.access.property.spec.ts`
    - `block-document-store.encrypted.property.spec.ts`
    - _Requirements: 2.1_
  - [ ] 3.3 Update api-lib to re-export datastore from the Suite
    - Replace the original `src/lib/datastore/` files with re-exports from `@brightchain/node-express-suite`
    - Ensure all internal api-lib imports still resolve
    - _Requirements: 2.5, 2.6_

- [ ] 4. Straight Move — Validation and Middleware
  - [ ] 4.1 Copy `src/lib/validation/userValidation.ts` from api-lib to the new library
    - Pure validation functions, no dependencies to adjust
    - _Requirements: 5.1_
  - [ ] 4.2 Copy `src/lib/middleware/validateBody.ts` and `src/lib/middleware/index.ts` from api-lib to the new library
    - Uses `@digitaldefiance/branded-interface` only — add as peer dependency if not already
    - _Requirements: 5.2_
  - [ ] 4.3 Update api-lib to re-export validation and middleware from the Suite
    - _Requirements: 5.3_

- [ ] 5. Straight Move — Session Adapter
  - [ ] 5.1 Copy `src/lib/services/sessionAdapter.ts` from api-lib to the new library
    - Uses `@brightchain/db` only — no domain dependencies
    - _Requirements: 6.1, 6.3_
  - [ ] 5.2 Update api-lib to re-export session adapter from the Suite
    - _Requirements: 6.2_

- [ ] 6. Checkpoint — Verify builds and tests pass
  - Run `yarn nx build brightchain-node-express-suite`
  - Run `yarn nx build brightchain-api-lib`
  - Run `yarn nx test brightchain-api-lib` (all existing tests must pass)
  - Ask the user if questions arise

- [ ] 7. Straight Move — Database Initialization
  - [ ] 7.1 Copy `src/lib/databaseInit.ts` from api-lib to the new library
    - Refactor to accept an optional `modelRegistrations` callback parameter instead of directly importing `createEnergyAccountHydrationSchema`
    - Remove the energy account model registration from the function body; it will be passed in by api-lib's `BrightChainDatabasePlugin.connect()`
    - _Requirements: 4.1, 4.4_
  - [ ] 7.2 Copy `src/lib/factories/blockStoreFactory.ts` from api-lib to the new library (if it has no domain dependencies)
    - If `BlockStoreFactory` depends on domain-specific store implementations, refactor to use a registry/factory pattern
    - _Requirements: 4.2_
  - [ ] 7.3 Update api-lib to import `brightchainDatabaseInit` and `BlockStoreFactory` from the Suite
    - Update `BrightChainDatabasePlugin.connect()` to pass the energy account model registration callback
    - _Requirements: 4.3_

- [ ] 8. Split File — Environment
  - [ ] 8.1 Create `src/lib/environment.ts` in the new library with `BrightDbEnvironment` class
    - Extract from api-lib's `Environment`: BrightDB-specific fields and constructor logic for `BRIGHTCHAIN_BLOCKSTORE_PATH`, `BRIGHTCHAIN_BLOCKSIZE_BYTES`, `BRIGHTCHAIN_BLOCKSTORE_TYPE`, `USE_MEMORY_DOCSTORE`, `DEV_DATABASE`, Azure config, S3 config
    - Extend Upstream `BaseEnvironment`
    - Export typed accessors: `blockStorePath`, `blockStoreBlockSizes`, `blockStoreType`, `useMemoryDocumentStore`, `devDatabasePoolName`, `azureConfig`, `s3Config`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 8.2 Update api-lib's `Environment` to extend `BrightDbEnvironment` instead of `BaseEnvironment`
    - Remove the BrightDB-specific fields and constructor logic that were extracted
    - Call `super()` to let `BrightDbEnvironment` handle BrightDB env vars
    - Retain domain-specific fields: `_upnp`, `_fontAwesomeKitId`, `_aws`, `_memberPoolName`, `_useTransactions`, `_adminId`, and domain-specific defaults
    - _Requirements: 7.5, 7.6_
  - [ ] 8.3 Also move the environment interface types needed by `BrightDbEnvironment`
    - `IAzureEnvironmentConfig` and `IS3EnvironmentConfig` from api-lib's `src/lib/interfaces/environment.ts` — extract the BrightDB-relevant interfaces to the new library
    - _Requirements: 7.2_

- [ ] 9. Split File — Database Plugin
  - [ ] 9.1 Create `src/lib/plugins/bright-db-database-plugin.ts` in the new library with `BrightDbDatabasePlugin` class
    - Extract from api-lib's `BrightChainDatabasePlugin`: generic BrightDB lifecycle (`connect`, `disconnect`, `isConnected`, `database`, `brightDb`, `blockStore` accessors)
    - `connect()` calls `brightchainDatabaseInit()` (now imported from the Suite)
    - `disconnect()` releases `_blockStore`, `_brightDb`, sets `_connected = false`, idempotent
    - `init(app)` — minimal implementation (can create a generic auth provider or be overridden)
    - `stop()` delegates to `disconnect()`
    - Use `protected` visibility for `_connected`, `_blockStore`, `_brightDb` so subclass can access
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ] 9.2 Update api-lib's `BrightChainDatabasePlugin` to extend `BrightDbDatabasePlugin`
    - Remove the generic lifecycle code that was extracted
    - Override `connect()` to call `super.connect()` then initialize `MemberStore`, `EnergyAccountStore`, and set DB reference on MemberStore
    - Override `init(app)` to create `BrightChainAuthenticationProvider` (domain version)
    - Retain all domain-specific methods: `seedWithRbac`, `seedProductionIfEmpty`, `buildMemberInitConfig`, `buildMemberInitInput`, `buildRbacUserInputs`, `isDatabaseEmpty`, `initializeDevStore`, `setupDevStore`, `teardownDevStore`
    - _Requirements: 9.5, 9.6_

- [ ] 10. Split File — Configure App Helper
  - [ ] 10.1 Create `src/lib/plugins/configure-bright-db-app.ts` in the new library with `configureBrightDbApp` function
    - Generic wiring: create `BrightDbDatabasePlugin`, register on app via `useDatabasePlugin()` or `plugins.register()`
    - Accept `IApplication`, `BrightDbEnvironment`, and optional plugin options
    - Return `{ plugin }`
    - _Requirements: 10.1_
  - [ ] 10.2 Update api-lib's `configureBrightChainApp` to use the generic registration pattern
    - The domain version creates `BrightChainDatabasePlugin` (not the generic one), so it doesn't call `configureBrightDbApp` directly
    - But it can reuse the plugin registration logic pattern from the Suite
    - Retain: GUID provider setup, `initializeBrightChain()`, constants updates, `registerNodeRuntimeConfiguration()`
    - _Requirements: 10.2_

- [ ] 11. Checkpoint — Verify builds and tests pass
  - Run `yarn nx build brightchain-node-express-suite`
  - Run `yarn nx build brightchain-api-lib`
  - Run `yarn nx test brightchain-api-lib` (all existing tests must pass)
  - Ask the user if questions arise

- [ ] 12. Split File — Application
  - [ ] 12.1 Create `src/lib/application.ts` in the new library with `BrightDbApplication` class
    - Extract from api-lib's `App`: generic BrightDB application lifecycle
    - Extend Upstream `Application` (or `BaseApplication` depending on what's needed)
    - Include: `_httpServer` capture during `start()`, `db` accessor returning `DocumentStore`, `getModel` method, `httpServer` getter
    - Use `protected` visibility for `_httpServer` so subclass can access
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 12.2 Update api-lib's `App` to extend `BrightDbApplication` instead of Upstream `Application`
    - Remove the generic lifecycle code that was extracted
    - Retain: all domain service fields, domain `start()` override, domain `stop()` override, domain-specific getters
    - Call `super.start()` which now goes through `BrightDbApplication.start()` → Upstream `Application.start()`
    - _Requirements: 8.5, 8.6_

- [ ] 13. Split File — Authentication Provider
  - [ ] 13.1 Create `src/lib/services/bright-db-authentication-provider.ts` in the new library with `BrightDbAuthenticationProvider` class
    - Implement `IAuthenticationProvider` using BrightDB collections directly
    - `findUserById()` — query `users` collection, return `IAuthenticatedUser` or null
    - `buildRequestUserDTO()` — query `users` + role info, return DTO or null
    - `verifyToken()` — `jwt.verify` with provided secret, return decoded user or null
    - Constructor accepts `BrightDb` and `jwtSecret`
    - _Requirements: 11.1, 11.2_
  - [ ] 13.2 Update api-lib's `BrightChainAuthenticationProvider` to extend `BrightDbAuthenticationProvider`
    - Override `findUserById()` to try MemberStore first, fall back to `super.findUserById()`
    - Override `buildRequestUserDTO()` to try MemberStore first, fall back to `super.buildRequestUserDTO()`
    - Retain: `authenticateWithMnemonic()`, `authenticateWithPassword()`
    - _Requirements: 11.3_

- [ ] 14. Split File — Constants and Middlewares
  - [ ] 14.1 Create `src/lib/constants.ts` in the new library with generic BrightDB constants
    - Export base express constants using `createExpressConstants` with generic defaults
    - _Requirements: 12.1_
  - [ ] 14.2 Create `src/lib/middlewares.ts` in the new library with generic middleware init
    - Export `BrightDbMiddlewares` class with `init()` method: helmet (generic CSP), cors, json, urlencoded
    - _Requirements: 13.1_
  - [ ] 14.3 Verify api-lib's `Constants` and `Middlewares` still work (they may not need changes if they don't extend the Suite's versions)
    - _Requirements: 12.2, 13.2_

- [ ] 15. Checkpoint — Verify builds and tests pass
  - Run `yarn nx build brightchain-node-express-suite`
  - Run `yarn nx build brightchain-api-lib`
  - Run `yarn nx test brightchain-api-lib` (all existing tests must pass)
  - Ask the user if questions arise

- [ ] 16. Create barrel re-exports and testing utilities
  - [ ] 16.1 Create upstream re-export barrel (`src/lib/upstream.ts`)
    - Re-export controllers, routers, middleware, services, decorators, validation, types, plugins from `@digitaldefiance/node-express-suite`
    - _Requirements: 14.1_
  - [ ] 16.2 Create BrightDB re-export barrel (`src/lib/brightdb.ts`)
    - Re-export `BrightDb`, `Collection`, `Model`, `Cursor`, query engines, schema validation, transactions, indexing from `@brightchain/db`
    - _Requirements: 14.2_
  - [ ] 16.3 Create brightchain-lib re-export barrel (`src/lib/brightchain-lib.ts`)
    - Re-export `BlockSize`, `BlockStoreType`, `validBlockSizes`, `InMemoryDatabase`, `MemoryBlockStore`
    - Ensure NO domain-specific modules are re-exported
    - _Requirements: 14.3, 14.4_
  - [ ] 16.4 Create `createTestApp` utility (`src/lib/create-test-app.ts`)
    - Create Environment with `USE_MEMORY_DOCSTORE=true` and overrides
    - Create `BrightDbDatabasePlugin`, connect, return `{ app, plugin, teardown }`
    - _Requirements: 17.1, 17.2, 17.3_
  - [ ] 16.5 Wire up `src/index.ts` as the single public API entry point
    - Re-export all moved modules (datastore, shared-types, validation, middleware, session adapter)
    - Re-export all new base classes (BrightDbApplication, BrightDbDatabasePlugin, BrightDbEnvironment, BrightDbAuthenticationProvider, configureBrightDbApp, BrightDbMiddlewares, BrightDbConstants)
    - Re-export from upstream barrel, BrightDB barrel, and brightchain-lib barrel
    - Re-export createTestApp
    - _Requirements: 1.3, 14.1, 14.2, 14.3_

- [ ] 17. Write new library tests
  - [ ] 17.1 Write export verification tests (`src/__tests__/exports.spec.ts`)
    - Import from `src/index.ts` and assert each expected symbol is defined
    - Assert domain-specific symbols are NOT exported
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [ ] 17.2 Write base class unit tests
    - `BrightDbDatabasePlugin`: connect/disconnect lifecycle, accessor guards
    - `BrightDbEnvironment`: env var parsing, invalid blockstore type rejection
    - `BrightDbAuthenticationProvider`: user lookup from collections, JWT verification
    - _Requirements: 9.2, 9.4, 7.4, 11.2_
  - [ ] 17.3 Write integration smoke test
    - Create `BrightDbDatabasePlugin` with in-memory config, connect, verify `isConnected()`, disconnect
    - _Requirements: 9.2_

- [ ] 18. Final checkpoint — Verify everything passes
  - Run `yarn nx build brightchain-node-express-suite`
  - Run `yarn nx test brightchain-node-express-suite`
  - Run `yarn nx build brightchain-api-lib`
  - Run `yarn nx test brightchain-api-lib` (all existing tests must pass)
  - Run `yarn nx build brightchain-api` (verify the application still builds)
  - Ask the user if questions arise

## Notes

- Each task group is designed to be independently verifiable — checkpoints after each major phase
- The primary correctness guarantee is that `brightchain-api-lib` tests continue to pass
- Straight moves are done first (lower risk), splits come after (higher complexity)
- Re-exports in api-lib ensure backward compatibility for existing consumers
- The `block-document-store-factory.ts` move requires special attention due to its `DiskBlockAsyncStore` dependency
- The `databaseInit.ts` move requires refactoring to accept model registrations as a callback
- Testing uses Jest, run via `yarn nx test brightchain-node-express-suite`
- All builds use `yarn nx build <project>`
