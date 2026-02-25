# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Member Init Service Never Called on Startup
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases:
    - `initializeDevStore()` returns `undefined` with no side effects (no-op)
    - No member index documents exist in the database after `connect()` + `initializeDevStore()`
    - No code path calls `BrightChainMemberInitService.initialize()` during startup
  - Test that after `BrightChainDatabasePlugin.connect()` and `initializeDevStore()` with `DEV_DATABASE` set, `BrightChainMemberInitService.initialize()` is called with an `IBrightChainMemberInitConfig` where `useMemoryStore: true` and `memberPoolName` equals `devDatabasePoolName`, and an `IBrightChainMemberInitInput` constructed from environment system/admin/member IDs
  - Assert that member index documents for system, admin, and member users exist in the database after `initializeDevStore()` completes
  - For production mode: assert that after `App.start()` with `BRIGHTCHAIN_BLOCKSTORE_PATH` set (no `DEV_DATABASE`), `BrightChainMemberInitService.initialize()` is called with `useMemoryStore: false`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because `initializeDevStore()` is a no-op and no production seeding path exists)
  - Document counterexamples found: `initializeDevStore()` returns `undefined`, no member index documents in database
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Database Init, Plugin Lifecycle, Greenlock, and Idempotency Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe on UNFIXED code**:
    - `brightchainDatabaseInit()` with `DEV_DATABASE` set creates MemoryBlockStore + BrightChainDb
    - `brightchainDatabaseInit()` with `BRIGHTCHAIN_BLOCKSTORE_PATH` set creates DiskBlockStore + BrightChainDb with PersistentHeadRegistry
    - `brightchainDatabaseInit()` with neither set throws an error
    - Plugin lifecycle `connect → init → stop` completes without error
    - Greenlock is NOT initialized when `LETS_ENCRYPT_ENABLED=false` or unset
    - `Environment` constructor throws when `LETS_ENCRYPT_ENABLED=true` but email is empty, hostnames are empty, or hostnames are invalid
    - `determineChallengeTypes()` returns HTTP-01 for standard hostnames and HTTP-01 + DNS-01 for wildcards
    - `GreenlockManager` passes `staging` boolean (not string) to `greenlockExpress.init()`
    - `BrightChainMemberInitService.initialize()` called twice with same users skips duplicates (idempotency)
  - **Write property-based tests capturing observed behavior**:
    - Property: for all environment configs with `DEV_DATABASE` set, `brightchainDatabaseInit()` produces MemoryBlockStore
    - Property: for all environment configs with `BRIGHTCHAIN_BLOCKSTORE_PATH` set (no `DEV_DATABASE`), `brightchainDatabaseInit()` produces DiskBlockStore
    - Property: for all environment configs with neither set, `brightchainDatabaseInit()` throws
    - Property: for all hostname lists, `determineChallengeTypes()` always includes HTTP-01 and adds DNS-01 iff a wildcard hostname is present
    - Property: for all valid Let's Encrypt configs with `staging: false`, `GreenlockManager` passes `staging: false` (boolean) to init
    - Property: for all sequences of `initialize()` calls with overlapping user sets, no duplicate entries are created
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix for BrightChainMemberInitService never called during startup and Greenlock verification

  - [x] 3.1 Wire BrightChainMemberInitService into BrightChainDatabasePlugin.initializeDevStore() for dev mode
    - Replace the no-op `initializeDevStore()` (currently returns `undefined`) with logic that:
      - Creates a `BrightChainMemberInitService` instance
      - Builds `IBrightChainMemberInitConfig` from environment: `useMemoryStore: true`, `memberPoolName` from `devDatabasePoolName`, `blockSize` from environment
      - Builds `IBrightChainMemberInitInput` from environment IDs: `systemId`, `adminId`, `memberId` with their associated types
      - Calls `service.initialize(config, input)` and logs the result
    - Consider extracting a reusable `seedMembers()` helper method on the plugin for both dev and production paths
    - _Bug_Condition: isBugCondition(input) where serverStartCompleted=true AND databasePluginConnected=true AND NOT memberInitServiceCalled_
    - _Expected_Behavior: initializeDevStore() calls BrightChainMemberInitService.initialize() with useMemoryStore=true config and environment-derived member input, resulting in seed users persisted to database_
    - _Preservation: brightchainDatabaseInit() behavior unchanged, plugin lifecycle unchanged, Greenlock disabled behavior unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Add production-mode seeding path in App.start() or plugin init()
    - After plugin lifecycle completes and stores are registered, add member seeding for non-dev mode
    - Build `IBrightChainMemberInitConfig` with `useMemoryStore: false`, `blockStorePath` from environment, `memberPoolName` from environment
    - Build `IBrightChainMemberInitInput` from environment IDs (`systemId`, `adminId`, `memberId`)
    - Call `BrightChainMemberInitService.initialize(config, input)`
    - Alternative unified approach: wire member init into plugin's `init()` method with `useMemoryStore` derived from `!!environment.devDatabasePoolName`, avoiding two separate call sites
    - _Bug_Condition: isBugCondition(input) where serverStartCompleted=true AND NOT devDatabase AND blockStorePathConfigured AND NOT memberInitServiceCalled_
    - _Expected_Behavior: App.start() calls BrightChainMemberInitService.initialize() with useMemoryStore=false config and environment-derived member input_
    - _Preservation: All service registrations in App.start() unchanged (auth, WebSocket, UPnP, key storage, energy accounts)_
    - _Requirements: 2.2_

  - [x] 3.3 Build IBrightChainMemberInitConfig and IBrightChainMemberInitInput from Environment
    - Add helper method/function to construct `IBrightChainMemberInitConfig` from Environment: derive `useMemoryStore` from `!!environment.devDatabasePoolName`, `memberPoolName` from environment, `blockStorePath` from environment, `blockSize` from environment
    - Add helper method/function to construct `IBrightChainMemberInitInput` from Environment: convert `HexString` IDs (`systemId`, `adminId`, `memberId`) to `GuidV4Buffer` as required by the service, map user types from environment
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify Greenlock staging boolean propagation and challenge config
    - Verify `Environment` constructor parses `LETS_ENCRYPT_STAGING` as boolean (`=== 'true' || === '1'`), so `staging: false` when env var is `false` or absent
    - Verify `GreenlockManager` passes `this.config.staging` (boolean) directly to `greenlockExpress.init()` — not string "false" or undefined
    - Verify `determineChallengeTypes()` returns HTTP-01 for standard hostnames and adds DNS-01 for wildcards
    - Write unit tests confirming the boolean propagation and challenge config correctness
    - _Bug_Condition: isGreenlockBugCondition where letsEncryptEnabled=true AND staging=false AND NOT greenlockInitCalledWithCorrectConfig_
    - _Expected_Behavior: GreenlockManager passes staging: false (boolean) to greenlockExpress.init(), uses HTTP-01 challenges for standard hostnames, DNS-01 for wildcards, starts HTTPS on 443 with HTTP redirect on 80_
    - _Preservation: Greenlock disabled behavior unchanged, Environment validation unchanged_
    - _Requirements: 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Member Init Service Called on Startup
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `initializeDevStore()` calls `BrightChainMemberInitService.initialize()` with correct config, and member index documents exist in the database
    - When this test passes, it confirms the expected behavior is satisfied for both dev and production modes
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Database Init, Plugin Lifecycle, Greenlock, and Idempotency Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix: database init behavior, plugin lifecycle, Greenlock disabled behavior, Environment validation, determineChallengeTypes, member init idempotency
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify exploration test (task 1) passes on fixed code
  - Verify preservation tests (task 2) pass on fixed code
  - Verify Greenlock verification tests pass
  - Ensure all tests pass, ask the user if questions arise
