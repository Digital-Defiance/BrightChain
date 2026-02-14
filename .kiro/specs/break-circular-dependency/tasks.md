# Implementation Plan: Break Circular Dependency

## Overview

Move generic storage abstraction interfaces from `@brightchain/brightchain-lib` into `@digitaldefiance/node-express-suite`, then update brightchain-lib to re-export from express-suite for backward compatibility. This eliminates the circular dependency between the two packages.

## Tasks

- [x] 1. Create storage abstraction type files in express-suite
  - [x] 1.1 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/document-types.ts`
    - Copy all type definitions from `brightchain-lib/src/lib/interfaces/storage/documentTypes.ts`
    - Update the `ClientSession` type alias to reference the local `IClientSession` import
    - _Requirements: 1.1_
  - [x] 1.2 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/client-session.ts`
    - Copy `IClientSession` interface from `brightchain-lib/src/lib/interfaces/storage/clientSession.ts`
    - _Requirements: 1.1_
  - [x] 1.3 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/collection.ts`
    - Copy `ICollection<T>` interface from `brightchain-lib/src/lib/interfaces/storage/collection.ts`
    - Update imports to reference local `document-types` and `client-session` files
    - _Requirements: 1.1_
  - [x] 1.4 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/database.ts`
    - Copy `IDatabase` interface from `brightchain-lib/src/lib/interfaces/storage/database.ts`
    - Update imports to reference local files
    - _Requirements: 1.1_
  - [x] 1.5 Update `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/failable-result.ts`
    - Replace the re-export from `@brightchain/brightchain-lib` with the actual `IFailableResult<T>` interface definition
    - _Requirements: 1.1, 2.2_
  - [x] 1.6 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/database-lifecycle-hooks.ts`
    - Copy `IDatabaseLifecycleHooks<T>` interface from `brightchain-lib/src/lib/interfaces/storage/databaseLifecycleHooks.ts`
    - Update `IFailableResult` import to reference local `../failable-result`
    - _Requirements: 1.1_
  - [x] 1.7 Create `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/storage/index.ts` barrel export
    - Export all types from the new storage files
    - _Requirements: 1.1_
  - [x] 1.8 Update `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/index.ts`
    - Add `export * from './storage'` to the barrel
    - _Requirements: 1.1_

- [x] 2. Update express-suite internal imports
  - [x] 2.1 Update `mongoose-collection.ts` imports
    - Change `from '@brightchain/brightchain-lib'` to `from '../interfaces/storage'`
    - _Requirements: 2.1_
  - [x] 2.2 Update `mongoose-database.ts` imports
    - Change `from '@brightchain/brightchain-lib'` to `from '../interfaces/storage'`
    - _Requirements: 2.1_
  - [x] 2.3 Update `mongoose-session-adapter.ts` imports
    - Change `from '@brightchain/brightchain-lib'` to `from '../interfaces/storage'`
    - _Requirements: 2.1_
  - [x] 2.4 Update `application-base.ts` imports
    - Change `from '@brightchain/brightchain-lib'` to `from './interfaces/storage'`
    - _Requirements: 2.1_
  - [x] 2.5 Update `utils.ts` imports
    - Change `from '@brightchain/brightchain-lib'` to `from './interfaces/storage'`
    - _Requirements: 2.1_
  - [x] 2.6 Search for and update any other express-suite source files that import from `@brightchain/brightchain-lib`
    - Grep all `.ts` files under `src/` for remaining `@brightchain/brightchain-lib` references
    - Update each to use local paths
    - _Requirements: 2.1, 2.3_
  - [x] 2.7 Remove `@brightchain/brightchain-lib` from express-suite `package.json` dependencies
    - _Requirements: 1.2, 5.3_

- [x] 3. Checkpoint - Verify express-suite builds and tests pass
  - Run `npx nx build digitaldefiance-node-express-suite` from `express-suite/` directory
  - Run `NX_TUI=false npx nx test digitaldefiance-node-express-suite --outputStyle=stream` from `express-suite/` directory
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update brightchain-lib to re-export from express-suite
  - [x] 4.1 Replace `brightchain-lib/src/lib/interfaces/storage/documentTypes.ts` with re-exports
    - Replace all type definitions with `export type { ... } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.3, 3.1_
  - [x] 4.2 Replace `brightchain-lib/src/lib/interfaces/storage/clientSession.ts` with re-export
    - Replace `IClientSession` definition with `export type { IClientSession } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.3, 3.1_
  - [x] 4.3 Replace `brightchain-lib/src/lib/interfaces/storage/collection.ts` with re-export
    - Replace `ICollection` definition with `export type { ICollection } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.3, 3.1_
  - [x] 4.4 Replace `brightchain-lib/src/lib/interfaces/storage/database.ts` with re-export
    - Replace `IDatabase` definition with `export type { IDatabase } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.3, 3.1_
  - [x] 4.5 Replace `brightchain-lib/src/lib/interfaces/storage/databaseLifecycleHooks.ts` with re-export
    - Replace `IDatabaseLifecycleHooks` definition with `export type { IDatabaseLifecycleHooks } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.3, 3.1_
  - [x] 4.6 Replace `brightchain-lib/src/lib/interfaces/failableResult.ts` with re-export
    - Replace `IFailableResult` definition with `export type { IFailableResult } from '@digitaldefiance/node-express-suite'`
    - _Requirements: 1.4, 3.2_
  - [x] 4.7 Verify `brightchain-lib/src/lib/interfaces/storage/index.ts` barrel still works
    - The barrel uses `export type * from './documentTypes'` etc., which should transparently re-export the re-exported types
    - Confirm no changes needed, or adjust if necessary
    - _Requirements: 3.1_

- [x] 5. Checkpoint - Verify brightchain-lib builds and tests pass
  - Run `NX_TUI=false npx nx build brightchain-lib --outputStyle=stream`
  - Run `NX_TUI=false npx nx test brightchain-lib --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Verify circular dependency is broken
  - [x] 6.1 Verify express-suite package.json has no brightchain-lib dependency
    - Read `express-suite/packages/digitaldefiance-node-express-suite/package.json` and confirm `@brightchain/brightchain-lib` is absent from dependencies
    - _Requirements: 1.2, 5.3_
  - [x] 6.2 Verify brightchain-lib package.json lists express-suite as dependency
    - Read `brightchain-lib/package.json` and confirm `@digitaldefiance/node-express-suite` is present
    - _Requirements: 5.2_
  - [x] 6.3 Write property test: no express-suite source file imports from brightchain-lib
    - **Property 1: No express-suite imports from brightchain-lib**
    - Use fast-check to sample from all .ts files in express-suite/src and assert no import references `@brightchain/brightchain-lib`
    - **Validates: Requirements 2.1, 2.3**
  - [x] 6.4 Write compile-time type identity test
    - **Property 3: Type structural identity across packages**
    - Create a test file that imports each storage type from both packages and verifies bidirectional assignability
    - **Validates: Requirements 3.3**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Run `NX_TUI=false npx nx run-many --target=build --projects=brightchain-lib,digitaldefiance-node-express-suite --outputStyle=stream`
  - Run `NX_TUI=false npx nx run-many --target=test --projects=brightchain-lib,digitaldefiance-node-express-suite --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `express-suite/` directory is a git submodule — nx commands for express-suite projects must run from within `express-suite/`
- Use `NX_TUI=false` and `--outputStyle=stream` when running nx tasks
- Block-store types in brightchain-lib do NOT import from the files being moved, so they are unaffected
- The `IFailableResult` type also exists in `@digitaldefiance/suite-core-lib` — express-suite's internal code may reference either; the migration only concerns the brightchain-lib → express-suite direction
- Property tests use `fast-check` which is already a devDependency of express-suite
