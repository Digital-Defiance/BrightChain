# Implementation Plan: Restore Database Initialization Lifecycle Hooks

## Overview

Restore database lifecycle capabilities (init functions, URI validation, dev store setup/teardown) to `BaseApplication` so they work on both the `IDatabase` and legacy `IDocumentStore` paths. Shared interfaces go in `brightchain-lib`; Node.js-specific implementations stay in `express-suite`.

## Tasks

- [x] 1. Move IFailableResult to brightchain-lib and re-export from express-suite
  - [x] 1.1 Create `brightchain-lib/src/lib/interfaces/failableResult.ts` with the `IFailableResult<T>` interface (same shape as the existing one in express-suite)
    - Export it from `brightchain-lib/src/lib/interfaces/storage/index.ts` (or a new `brightchain-lib/src/lib/interfaces/index.ts` barrel)
    - _Requirements: 1.6_
  - [x] 1.2 Update `express-suite/.../interfaces/failable-result.ts` to re-export `IFailableResult` from `@brightchain/brightchain-lib` for backward compatibility
    - Ensure all existing imports within express-suite continue to resolve
    - _Requirements: 5.3_

- [x] 2. Create IDatabaseLifecycleHooks interface in brightchain-lib
  - [x] 2.1 Create `brightchain-lib/src/lib/interfaces/storage/databaseLifecycleHooks.ts` defining `IDatabaseLifecycleHooks<TInitResults>`
    - Include all five optional hook fields: `validateUri`, `setupDevStore`, `teardownDevStore`, `initializeDatabase`, `hashInitResults`
    - Import `IFailableResult` from the local brightchain-lib path
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.4, 7.1_
  - [x] 2.2 Export `IDatabaseLifecycleHooks` from `brightchain-lib/src/lib/interfaces/storage/index.ts`
    - _Requirements: 1.6_

- [x] 3. Extract defaultMongoUriValidator in express-suite
  - [x] 3.1 Create `express-suite/.../utils/default-mongo-uri-validator.ts` with the `defaultMongoUriValidator(uri: string, production: boolean)` function
    - Extract the logic from `MongooseDocumentStore.validateMongoUri()` into this standalone function
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [x] 3.2 Update `MongooseDocumentStore.validateMongoUri()` to delegate to `defaultMongoUriValidator`
    - This keeps MongooseDocumentStore working identically but avoids code duplication
    - _Requirements: 5.1, 5.2_
  - [x] 3.3 Write property tests for defaultMongoUriValidator
    - **Property 7: Non-mongodb protocol URIs rejected**
    - **Validates: Requirements 4.1**
    - **Property 8: Private/localhost URIs rejected iff production**
    - **Validates: Requirements 4.2, 4.3**
    - Create `express-suite/.../tests/default-mongo-uri-validator.spec.ts` using fast-check
    - Generate random non-mongodb protocol URIs and verify rejection
    - Generate random private/localhost hostnames embedded in mongodb URIs and verify rejection in production mode, acceptance in non-production mode

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate lifecycle hooks into BaseApplication
  - [x] 5.1 Update `BaseApplication` constructor to accept optional `IDatabaseLifecycleHooks<TInitResults>` as a fourth parameter
    - Store in `_lifecycleHooks` protected field
    - Add `_devStoreProvisioned` boolean field (default false)
    - Only store hooks when `IDatabase` path is used (ignore if `IDocumentStore` is provided)
    - _Requirements: 2.1, 2.2, 5.3_
  - [x] 5.2 Update `BaseApplication.start()` to invoke lifecycle hooks on the IDatabase path
    - Before connect: call `setupDevStore` if provided and `environment.devDatabase` is truthy, set `_devStoreProvisioned = true`
    - Before connect: call `validateUri` hook if provided, otherwise call `defaultMongoUriValidator` with `environment.production`
    - After connect + plugin init: call `initializeDatabase` if provided and `environment.devDatabase` is truthy, with 5-minute timeout
    - On init success with `detailedDebug`: call `hashInitResults` and log
    - On init failure: throw `TranslatableSuiteError`
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_
  - [x] 5.3 Update `BaseApplication.stop()` to call `teardownDevStore` if `_devStoreProvisioned` is true and hook is provided
    - Wrap in try/catch so teardown failure doesn't prevent other cleanup
    - _Requirements: 6.3_
  - [x] 5.4 Write unit tests for BaseApplication lifecycle hook integration
    - **Property 1: Constructor stores lifecycle hooks**
    - **Validates: Requirements 2.1**
    - **Property 2: URI validation occurs before connect on IDatabase path**
    - **Validates: Requirements 2.3**
    - **Property 3: Dev store setup provisions URI and forwards to connect**
    - **Validates: Requirements 2.4, 6.1, 6.2**
    - **Property 4: Database initialization invoked after connect in dev mode**
    - **Validates: Requirements 3.1**
    - **Property 5: Successful init with detailedDebug logs hash**
    - **Validates: Requirements 3.3**
    - **Property 6: Failed init result throws error**
    - **Validates: Requirements 3.4**
    - **Property 9: Custom validateUri replaces default**
    - **Validates: Requirements 4.4**
    - **Property 10: Teardown called on stop when dev store was provisioned**
    - **Validates: Requirements 6.3**
    - **Property 11: Only provided hooks are invoked**
    - **Validates: Requirements 5.4, 7.2**
    - Add tests to `express-suite/.../tests/application-base.spec.ts`
    - Use mock IDatabase objects and mock hook functions to verify call ordering and behavior
    - Test edge cases: init timeout (use fake timers), teardown failure during stop

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Verify backward compatibility
  - [x] 7.1 Verify `Application` subclass constructor still works with existing parameters
    - Ensure `Application` constructor continues to create `MongooseDocumentStore` by default when no `documentStore` is passed
    - Ensure `Application.start()` still calls `_documentStore.initializeDevStore()` on the legacy path
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.2 Write backward compatibility tests
    - Test that `BaseApplication` with only `IDocumentStore` (no hooks) behaves identically to current behavior
    - Test that `Application` with `MongooseDocumentStore` still invokes `initializeDevStore` during `start()`
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure that the old initializeDevStore calls work and return the correct dev database hash

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (URI validation is the strongest candidate for fast-check)
- Unit tests validate specific examples, call ordering, and edge cases
- The `IFailableResult` move (task 1) must happen first since `IDatabaseLifecycleHooks` depends on it
- `MongooseDocumentStore` is updated to delegate to the extracted validator (task 3.2) to avoid duplication while maintaining backward compatibility
