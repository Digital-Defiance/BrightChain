# Implementation Plan: db-core-to-lib

## Overview

Migrate the platform-agnostic core database engine from `brightchain-db` to `brightchain-lib/src/lib/db/`, create `InMemoryDatabase`, wire up re-exports in `brightchain-db`, and update Nx configuration. Each task builds incrementally so the codebase stays compilable at each step.

## Tasks

- [x] 1. Create `uuidGenerator.ts` and `db/` directory scaffold in brightchain-lib
  - [x] 1.1 Create `brightchain-lib/src/lib/db/uuidGenerator.ts` with `UuidGenerator` type and `createDefaultUuidGenerator` function
    - Implement `globalThis.crypto.randomUUID` primary path and `crypto.getRandomValues` fallback
    - Throw descriptive error if neither API is available
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 1.2 Write property test for default UUID generator (Property 2)
    - **Property 2: Default UUID generator produces valid UUID v4**
    - Generate UUIDs via `createDefaultUuidGenerator()` and assert each matches `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`
    - File: `brightchain-lib/src/lib/db/__tests__/uuid-generator.property.spec.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 7.3, 7.4**

- [x] 2. Relocate pure-logic modules to `brightchain-lib/src/lib/db/`
  - [x] 2.1 Move `errors.ts` to `brightchain-lib/src/lib/db/errors.ts`
    - Update internal imports; ensure zero Node.js built-in imports
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Move `queryEngine.ts` to `brightchain-lib/src/lib/db/queryEngine.ts`
    - Update internal imports to reference new `db/` relative paths
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.3 Move `updateEngine.ts` to `brightchain-lib/src/lib/db/updateEngine.ts`
    - Update import of `deepEquals` from `./queryEngine`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.4 Move `cursor.ts` to `brightchain-lib/src/lib/db/cursor.ts`
    - Update imports from queryEngine
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.5 Move `indexing.ts` to `brightchain-lib/src/lib/db/indexing.ts`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.6 Move `aggregation.ts` to `brightchain-lib/src/lib/db/aggregation.ts`
    - Update imports from queryEngine; preserve `$lookup` `CollectionResolver` pattern
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.7 Move `schemaValidation.ts` to `brightchain-lib/src/lib/db/schemaValidation.ts`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.8 Move platform-agnostic type re-exports to `brightchain-lib/src/lib/db/types.ts`
    - Re-export `BsonDocument`, `DocumentId`, `FieldSchema`, `ValidationFieldError` from brightchain-lib and suite-core-lib types
    - _Requirements: 1.4_

- [x] 3. Checkpoint - Ensure relocated pure-logic modules compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Relocate `InMemoryHeadRegistry` to brightchain-lib
  - [x] 4.1 Extract `InMemoryHeadRegistry` from `brightchain-db/src/lib/headRegistry.ts` into `brightchain-lib/src/lib/db/inMemoryHeadRegistry.ts`
    - Preserve `mergeHeadUpdate`, `deferHeadUpdate`, `applyDeferredUpdates`, `getDeferredUpdates` methods
    - Ensure zero Node.js built-in imports
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 Update `brightchain-db/src/lib/headRegistry.ts` to keep only `PersistentHeadRegistry` and import `InMemoryHeadRegistry` from brightchain-lib for local re-export
    - _Requirements: 4.4, 6.2_

- [x] 5. Relocate transaction engine to brightchain-lib
  - [x] 5.1 Move `transaction.ts` to `brightchain-lib/src/lib/db/transaction.ts`
    - Replace `import { randomUUID } from 'crypto'` with `UuidGenerator` parameter
    - Export `JournalOp`, `CommitCallback`, `RollbackCallback` types
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 5.2 Write property test for DbSession journal semantics (Property 3)
    - **Property 3: DbSession commit/abort journal semantics**
    - Generate arbitrary sequences of `JournalOp` entries, verify commit delivers all ops in order and abort discards them
    - File: `brightchain-lib/src/lib/db/__tests__/transaction-journal.property.spec.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 5.3**

- [x] 6. Relocate `Collection` to brightchain-lib
  - [x] 6.1 Move `collection.ts` to `brightchain-lib/src/lib/db/collection.ts`
    - Replace `import { randomUUID } from 'crypto'` with `UuidGenerator` injection
    - Keep `sha3_512` import from `@noble/hashes/sha3` (already a brightchain-lib dependency)
    - Move `calculateBlockId` helper alongside Collection
    - Update all internal imports to `db/` relative paths
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.1_
  - [x] 6.2 Write property test for calculateBlockId (Property 5)
    - **Property 5: calculateBlockId matches sha3_512**
    - Generate arbitrary byte arrays, verify `calculateBlockId(data)` equals `Buffer.from(sha3_512(data)).toString('hex')`
    - File: `brightchain-lib/src/lib/db/__tests__/calculate-block-id.property.spec.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 10.1**

- [x] 7. Checkpoint - Ensure relocated modules compile and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create `InMemoryDatabase` in brightchain-lib
  - [x] 8.1 Create `brightchain-lib/src/lib/db/inMemoryDatabase.ts` implementing `IDatabase`
    - Accept `InMemoryDatabaseOptions` (name, headRegistry, uuidGenerator, cursorTimeoutMs)
    - Use `MemoryBlockStore` as backing store, `InMemoryHeadRegistry` as default head registry
    - Implement `connect`, `disconnect`, `isConnected`, `collection`, `startSession`, `withTransaction`, `listCollections`, `dropCollection`, `dropDatabase`
    - Implement cursor session management (`createCursorSession`, `getCursorSession`, `getNextBatch`, `closeCursorSession`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 8.2 Write property test for custom UUID generator injection (Property 1)
    - **Property 1: Custom UUID generator injection**
    - Provide a custom `UuidGenerator` to `InMemoryDatabase`, verify all generated IDs (session IDs, document `_id` values) come from the injected generator
    - File: `brightchain-lib/src/lib/db/__tests__/uuid-generator.property.spec.ts` (append to existing file)
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 2.4, 3.2, 5.2**
  - [x] 8.3 Write IDatabase conformance test for InMemoryDatabase
    - Verify `InMemoryDatabase` implements all `IDatabase` methods
    - File: `brightchain-lib/src/lib/db/__tests__/idatabase-conformance.spec.ts`
    - _Requirements: 8.2_
  - [x] 8.4 Write ICollection conformance test for relocated Collection
    - Verify relocated `Collection` implements all `ICollection` methods
    - File: `brightchain-lib/src/lib/db/__tests__/icollection-conformance.spec.ts`
    - _Requirements: 8.3_

- [x] 9. Create db barrel index and update brightchain-lib exports
  - [x] 9.1 Create `brightchain-lib/src/lib/db/index.ts` barrel exporting all db modules
    - Export from `./uuidGenerator`, `./errors`, `./queryEngine`, `./updateEngine`, `./cursor`, `./indexing`, `./aggregation`, `./schemaValidation`, `./types`, `./inMemoryHeadRegistry`, `./transaction`, `./collection`, `./inMemoryDatabase`
    - _Requirements: 1.1_
  - [x] 9.2 Update `brightchain-lib/src/lib/index.ts` to add `export * from './db'`
    - _Requirements: 1.1_

- [x] 10. Checkpoint - Ensure brightchain-lib builds and all new tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Refactor `BrightChainDb` in brightchain-db to extend `InMemoryDatabase`
  - [x] 11.1 Refactor `brightchain-db/src/lib/database.ts` so `BrightChainDb` extends `InMemoryDatabase`
    - Define `BrightChainDbOptions` extending `InMemoryDatabaseOptions` with `dataDir` and `poolId`
    - Constructor resolves `PersistentHeadRegistry` if `dataDir` provided, `PooledStoreAdapter` if `poolId` provided
    - Remove duplicated core logic now inherited from `InMemoryDatabase`
    - _Requirements: 6.7_
  - [x] 11.2 Write property test for document round-trip (Property 4)
    - **Property 4: Document storage round-trip**
    - Generate arbitrary `BsonDocument` objects, insert via `insertOne`, retrieve via `findById`, verify field equivalence
    - File: `brightchain-lib/src/lib/db/__tests__/document-roundtrip.property.spec.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 8.5, 3.4**

- [x] 12. Create re-export layer in brightchain-db
  - [x] 12.1 Update `brightchain-db/src/index.ts` to re-export all Core_Engine modules from `@brightchain/brightchain-lib`
    - Re-export everything from brightchain-lib's db barrel
    - Keep exports of `PersistentHeadRegistry`, `PooledStoreAdapter`, `CBLIndex`, `expressMiddleware`, `BrightChainDb`
    - _Requirements: 6.1, 6.6_
  - [x] 12.2 Write re-export compatibility test
    - Verify all symbols previously exported from `@brightchain/db` are still exported
    - File: `brightchain-db/src/lib/__tests__/reexport-compat.spec.ts`
    - _Requirements: 8.4_

- [x] 13. Relocate and verify tests
  - [x] 13.1 Move pure-logic tests from `brightchain-db/src/lib/__tests__/` to `brightchain-lib/src/lib/db/__tests__/`
    - Move `document-roundtrip.property.spec.ts`, `json-roundtrip.property.spec.ts`, `sort-skip-limit.property.spec.ts`, `sort-skip-limit.spec.ts`, `idatabase-conformance.spec.ts`
    - Update imports to use relative paths within brightchain-lib
    - Keep persistence-specific tests in brightchain-db
    - _Requirements: 8.1, 8.4_
  - [x] 13.2 Move `collection.availability.property.spec.ts` and `collection.availability.spec.ts` to `brightchain-lib/src/lib/db/__tests__/`
    - Update imports to reference relocated Collection
    - _Requirements: 8.1_

- [x] 14. Update Nx project configuration
  - [x] 14.1 Verify/update `tsconfig.base.json` path mappings for any new sub-path exports from brightchain-lib
    - _Requirements: 9.1_
  - [x] 14.2 Ensure `brightchain-db` `package.json` or Nx project config declares dependency on `@brightchain/brightchain-lib`
    - _Requirements: 9.2_
  - [x] 14.3 Verify `brightchain-lib` has no new Node.js-specific dependencies in its dependency graph
    - Confirm `@noble/hashes` is already present; no new deps added
    - _Requirements: 9.4, 10.2, 10.3_

- [x] 15. Final checkpoint - Full build and test verification
  - Run `npx nx run-many --target=build --projects=brightchain-lib,brightchain-db` and `npx nx run-many --target=test --projects=brightchain-lib,brightchain-db`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major phase
- Property tests validate the 5 correctness properties from the design document using `fast-check`
- All code is TypeScript, matching the existing codebase and design document
