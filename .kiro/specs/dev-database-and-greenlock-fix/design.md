# Dev Database & Greenlock Fix — Bugfix Design

## Overview

Two bugs affect the BrightChain API server startup flow:

1. **BrightChainMemberInitService never called**: The database plugin's `initializeDevStore()` is a no-op, and no other code path invokes `BrightChainMemberInitService.initialize()`. This means system/admin/member seed users are never persisted to the database on startup, regardless of whether `DEV_DATABASE` or `BRIGHTCHAIN_BLOCKSTORE_PATH` is configured.

2. **Greenlock/Let's Encrypt verification**: The upstream `Application.start()` wires `GreenlockManager` when `letsEncrypt.enabled` is true. The `Environment` constructor validates email, hostnames, and hostname format. The `GreenlockManager` passes `staging` through to `greenlockExpress.init()` and selects HTTP-01 (+ DNS-01 for wildcards). The wiring appears structurally correct but needs verification that `staging: false` propagates correctly for production use and that challenge config is correct.

The fix strategy is minimal: wire `BrightChainMemberInitService` into `initializeDevStore()` (for dev mode) and into `App.start()` (for production mode), building the `IBrightChainMemberInitConfig` and `IBrightChainMemberInitInput` from the `Environment`. For Greenlock, write verification tests against the existing wiring.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — server startup completes without calling `BrightChainMemberInitService.initialize()`, leaving the database unseeded
- **Property (P)**: The desired behavior — after startup, system/admin/member users exist in the database
- **Preservation**: Existing database initialization (`brightchainDatabaseInit`), plugin lifecycle (`connect → init → stop`), Greenlock-disabled behavior, and Environment validation must remain unchanged
- **`BrightChainMemberInitService`**: Service in `brightchain-api-lib/src/lib/services/brightchain-member-init.service.ts` that persists system/admin/member users into the BrightChainDb via member index documents
- **`BrightChainDatabasePlugin`**: Plugin in `brightchain-api-lib/src/lib/plugins/brightchain-database-plugin.ts` that manages the database lifecycle (connect, init, stop) and exposes stores
- **`initializeDevStore()`**: Hook called by upstream `Application.start()` after `connect()` and `init()` when `environment.devDatabase` is truthy — currently a no-op
- **`IBrightChainMemberInitConfig`**: Configuration interface specifying `memberPoolName`, `blockStorePath`, `useMemoryStore`, and `blockSize`
- **`IBrightChainMemberInitInput`**: Input interface carrying `systemUser`, `adminUser`, and `memberUser` entries with their IDs and types
- **`GreenlockManager`**: Class in `express-suite` that wraps `greenlock-express` for automated Let's Encrypt TLS certificate management
- **`determineChallengeTypes()`**: Pure function that returns HTTP-01 config (and DNS-01 for wildcards) based on hostnames

## Bug Details

### Fault Condition

The bug manifests on every server startup. The `BrightChainDatabasePlugin.initializeDevStore()` method is the designated hook for seeding the dev database, but it returns `undefined` (no-op). In production mode (no `DEV_DATABASE`), there is no code path at all that calls `BrightChainMemberInitService.initialize()`. The `App.start()` method registers services from plugin stores but never invokes member seeding.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ServerStartupContext
  OUTPUT: boolean

  RETURN input.serverStartCompleted = true
         AND input.databasePluginConnected = true
         AND input.brightChainDbReady = true
         AND NOT memberInitServiceCalled(input)
END FUNCTION
```

For the Greenlock verification bug:
```
FUNCTION isGreenlockBugCondition(input)
  INPUT: input of type GreenlockConfig
  OUTPUT: boolean

  RETURN input.letsEncryptEnabled = true
         AND input.staging = false
         AND input.maintainerEmail IS NOT EMPTY
         AND input.hostnames IS NOT EMPTY
         AND NOT greenlockInitCalledWithCorrectConfig(input)
END FUNCTION
```

### Examples

- **Dev mode startup**: `DEV_DATABASE=brightchain-dev` → `brightchainDatabaseInit()` creates MemoryBlockStore + BrightChainDb ✓, but `initializeDevStore()` returns `undefined` → no system/admin/member users in database ✗ (expected: users seeded)
- **Production mode startup**: `BRIGHTCHAIN_BLOCKSTORE_PATH=/data/brightchain` → `brightchainDatabaseInit()` creates DiskBlockStore + BrightChainDb ✓, but no code calls `BrightChainMemberInitService.initialize()` → no system/admin/member users in database ✗ (expected: users seeded)
- **Repeated startup (idempotency)**: Server restarts with same config → `initialize()` should skip already-existing users (currently never called, so moot)
- **Greenlock production**: `LETS_ENCRYPT_ENABLED=true`, `LETS_ENCRYPT_STAGING=false` → `GreenlockManager` should pass `staging: false` to `greenlockExpress.init()` → needs verification that the boolean propagates correctly (not string "false")

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `brightchainDatabaseInit()` must continue to create MemoryBlockStore when `DEV_DATABASE` is set, and DiskBlockStore when `BRIGHTCHAIN_BLOCKSTORE_PATH` is set
- `brightchainDatabaseInit()` must continue to throw when neither `DEV_DATABASE` nor `BRIGHTCHAIN_BLOCKSTORE_PATH` is set
- The plugin lifecycle (`connect → init → stop`) and service registration in `App.start()` must work as before
- `BrightChainMemberInitService.initialize()` idempotency — calling with already-existing users must skip duplicates
- When `LETS_ENCRYPT_ENABLED=false` or unset, Greenlock must not be initialized; only the HTTP server starts
- Environment validation must continue to throw on empty email, empty hostnames, or invalid hostnames when Let's Encrypt is enabled
- Mouse/keyboard/UI interactions are not applicable (server-side only)

**Scope:**
All inputs that do NOT involve the member-init seeding path or Greenlock config verification should be completely unaffected by this fix. This includes:
- All Express route handling and middleware
- WebSocket server initialization
- UPnP port mapping
- Key storage initialization
- Auth service and provider setup
- Energy account loading

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **`initializeDevStore()` is a no-op**: The method at line 213 of `brightchain-database-plugin.ts` simply returns `undefined`. The comment says "can be extended to seed test users" — it was left as a placeholder. This is the primary insertion point for dev-mode seeding since upstream `Application.start()` calls `initializeDevStore()` after `connect()` and `init()` when `environment.devDatabase` is truthy.

2. **No production-mode seeding path**: In production (no `DEV_DATABASE`), `initializeDevStore()` is never called by the upstream lifecycle. `App.start()` registers services but never calls `BrightChainMemberInitService.initialize()`. There is no hook in the non-dev path for seeding.

3. **`IBrightChainMemberInitInput` not constructed from Environment**: The `Environment` class (both upstream and BrightChain-specific) already parses `ADMIN_ID`, `MEMBER_ID`, `SYSTEM_ID`, and their associated types from env vars. But no code constructs an `IBrightChainMemberInitInput` from these values and passes it to the service.

4. **Greenlock `staging` propagation**: The `Environment` constructor parses `LETS_ENCRYPT_STAGING` as a boolean (`=== 'true' || === '1'`). When the env var is `false` or absent, `staging` is `false`. `GreenlockManager` passes `this.config.staging` directly to `greenlockExpress.init()`. The wiring appears correct, but the concern is whether the boolean `false` is correctly interpreted by `greenlock-express` (vs. the string `"false"` or `undefined`).

## Correctness Properties

Property 1: Fault Condition — Member Init Service Called on Dev Startup

_For any_ server startup where `DEV_DATABASE` is set to a non-empty string and the database plugin connects successfully, the fixed `initializeDevStore()` SHALL call `BrightChainMemberInitService.initialize()` with an `IBrightChainMemberInitConfig` where `useMemoryStore` is `true` and `memberPoolName` equals the `devDatabasePoolName`, and an `IBrightChainMemberInitInput` constructed from the environment's system/admin/member IDs and types, resulting in seed users being persisted to the database.

**Validates: Requirements 2.1, 2.3**

Property 2: Fault Condition — Member Init Service Called on Production Startup

_For any_ server startup where `DEV_DATABASE` is NOT set but `BRIGHTCHAIN_BLOCKSTORE_PATH` is configured and the database plugin connects successfully, the fixed `App.start()` SHALL call `BrightChainMemberInitService.initialize()` with an `IBrightChainMemberInitConfig` where `useMemoryStore` is `false` and `blockStorePath` equals the configured path, and an `IBrightChainMemberInitInput` constructed from the environment's system/admin/member IDs and types, resulting in seed users being persisted to the database.

**Validates: Requirements 2.2**

Property 3: Preservation — Database Initialization Unchanged

_For any_ server startup configuration, the fixed code SHALL produce the same `brightchainDatabaseInit()` behavior as the original code: MemoryBlockStore for `DEV_DATABASE`, DiskBlockStore for `BRIGHTCHAIN_BLOCKSTORE_PATH`, error for neither, preserving all existing database initialization logic.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 4: Preservation — Plugin Lifecycle and Service Registration Unchanged

_For any_ server startup, the fixed code SHALL preserve the existing plugin lifecycle (`connect → init → stop`) and all service registrations in `App.start()`, ensuring no regressions in auth, WebSocket, UPnP, or other subsystems.

**Validates: Requirements 3.9**

Property 5: Verification — Greenlock Production Config Correctness

_For any_ Let's Encrypt configuration where `enabled` is `true` and `staging` is `false`, the `GreenlockManager` SHALL pass `staging: false` (boolean) to `greenlockExpress.init()`, use HTTP-01 challenges for standard hostnames, add DNS-01 challenges for wildcard hostnames, and start HTTPS on port 443 with HTTP redirect on port 80.

**Validates: Requirements 2.4**

Property 6: Preservation — Greenlock Disabled and Validation Unchanged

_For any_ configuration where `LETS_ENCRYPT_ENABLED` is `false` or unset, the system SHALL skip Greenlock initialization. When enabled but email is empty, hostnames are empty, or hostnames are invalid, the `Environment` constructor SHALL continue to throw validation errors.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7**

Property 7: Preservation — Member Init Idempotency

_For any_ call to `BrightChainMemberInitService.initialize()` where the seed users already exist in the database, the service SHALL skip duplicate entries and return `alreadyInitialized: true`, preserving idempotency.

**Validates: Requirements 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `brightchain-api-lib/src/lib/plugins/brightchain-database-plugin.ts`

**Function**: `initializeDevStore()`

**Specific Changes**:
1. **Wire BrightChainMemberInitService into initializeDevStore()**: Replace the no-op with logic that:
   - Creates a `BrightChainMemberInitService` instance
   - Builds an `IBrightChainMemberInitConfig` from the environment (`useMemoryStore: true`, `memberPoolName` from `devDatabasePoolName`, `blockSize` from environment)
   - Builds an `IBrightChainMemberInitInput` from the environment's system/admin/member IDs and types (using `environment.systemId`, `environment.adminId`, `environment.memberId`)
   - Calls `service.initialize(config, input)`
   - Logs the result

2. **Add a general-purpose `seedMembers()` method**: Extract the member-init logic into a reusable method on `BrightChainDatabasePlugin` (or a helper) that both `initializeDevStore()` and the production path can call. This method takes the environment and constructs the config/input.

**File**: `brightchain-api-lib/src/lib/application.ts`

**Function**: `App.start()`

**Specific Changes**:
3. **Wire member init for production mode**: After the plugin lifecycle completes and stores are registered, add a call to seed members when NOT in dev mode (since `initializeDevStore()` handles dev mode). This ensures both paths are covered:
   - Build `IBrightChainMemberInitConfig` with `useMemoryStore: false`, `blockStorePath` from environment, `memberPoolName` from environment
   - Build `IBrightChainMemberInitInput` from environment IDs
   - Call `BrightChainMemberInitService.initialize(config, input)`

4. **Alternatively — unified approach**: Wire the member init into the plugin's `init()` method or add a post-connect hook that runs regardless of dev/production mode. The config would derive `useMemoryStore` from `!!environment.devDatabasePoolName`. This is cleaner than two separate call sites.

5. **Environment ID extraction helper**: Consider adding a helper method (on `BrightChainDatabasePlugin` or as a standalone function) that constructs `IBrightChainMemberInitInput` from the `Environment`, converting the `HexString` IDs to `GuidV4Buffer` as required by the service.

**File**: `express-suite/packages/digitaldefiance-node-express-suite/src/greenlock-manager.ts` (verification only)

**No code changes expected** — write tests to verify:
- `staging: false` is passed as a boolean to `greenlockExpress.init()`
- `determineChallengeTypes()` returns correct config for standard and wildcard hostnames
- `buildSiteConfig()` correctly selects subject and altnames

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that instantiate `BrightChainDatabasePlugin`, call `connect()` and `initializeDevStore()`, and assert that member index documents exist in the database. Run these tests on the UNFIXED code to observe failures and confirm the no-op root cause.

**Test Cases**:
1. **Dev Mode Seeding Test**: Create a `BrightChainDatabasePlugin` with `DEV_DATABASE` set, call `connect()` then `initializeDevStore()`, assert member index documents exist (will fail on unfixed code — `initializeDevStore()` returns `undefined`)
2. **Production Mode Seeding Test**: Create an `App` with `BRIGHTCHAIN_BLOCKSTORE_PATH` set, call `start()`, assert member index documents exist (will fail on unfixed code — no seeding path exists)
3. **initializeDevStore Return Value Test**: Call `initializeDevStore()` and assert it returns a meaningful result, not `undefined` (will fail on unfixed code)
4. **Greenlock Staging Boolean Test**: Construct `GreenlockManager` with `staging: false` and verify the init options pass `staging: false` as a boolean (may pass on unfixed code — verifying existing wiring)

**Expected Counterexamples**:
- `initializeDevStore()` returns `undefined` with no side effects
- No member index documents in the database after startup
- Possible causes: `initializeDevStore()` is a no-op, no production seeding path exists

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := startServer_fixed(input)
  ASSERT memberIndexDocumentsExist(result.database, ['system', 'admin', 'member'])
  ASSERT result.initResult.insertedCount >= 0
  ASSERT result.initResult.alreadyInitialized OR result.initResult.insertedCount > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT brightchainDatabaseInit_original(input) = brightchainDatabaseInit_fixed(input)
  ASSERT pluginLifecycle_original(input) = pluginLifecycle_fixed(input)
  ASSERT greenlockBehavior_original(input) = greenlockBehavior_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many environment configurations automatically across the input domain
- It catches edge cases in config parsing that manual unit tests might miss
- It provides strong guarantees that `brightchainDatabaseInit()` behavior is unchanged
- `determineChallengeTypes()` is a pure function ideal for property-based testing

**Test Plan**: Observe behavior on UNFIXED code first for database initialization and Greenlock config, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Database Init Preservation**: Verify `brightchainDatabaseInit()` still creates MemoryBlockStore for `DEV_DATABASE` and DiskBlockStore for `BRIGHTCHAIN_BLOCKSTORE_PATH` after the fix
2. **Plugin Lifecycle Preservation**: Verify `connect → init → stop` lifecycle works identically after the fix
3. **Greenlock Disabled Preservation**: Verify Greenlock is not initialized when `LETS_ENCRYPT_ENABLED=false`
4. **Environment Validation Preservation**: Verify Environment constructor still throws on invalid Let's Encrypt config
5. **Member Init Idempotency Preservation**: Verify calling `initialize()` twice with same users skips duplicates

### Unit Tests

- Test `initializeDevStore()` calls `BrightChainMemberInitService.initialize()` with correct config
- Test member init config construction from Environment (dev mode: `useMemoryStore: true`, production: `useMemoryStore: false`)
- Test member init input construction from Environment IDs (`systemId`, `adminId`, `memberId`)
- Test `determineChallengeTypes()` returns HTTP-01 for standard hostnames and HTTP-01 + DNS-01 for wildcards
- Test `GreenlockManager` passes `staging: false` boolean to `greenlockExpress.init()`
- Test edge cases: missing IDs in environment, `initializeDevStore()` called before `connect()`

### Property-Based Tests

- Generate random `IBrightChainMemberInitConfig` values and verify `initialize()` produces correct member index documents for valid configs and rejects invalid ones
- Generate random hostname lists and verify `determineChallengeTypes()` always includes HTTP-01 and adds DNS-01 if and only if a wildcard hostname is present
- Generate random environment configurations and verify `brightchainDatabaseInit()` behavior is unchanged (MemoryBlockStore vs DiskBlockStore selection)
- Generate random sequences of `initialize()` calls with overlapping user sets and verify idempotency (no duplicate entries)

### Integration Tests

- Test full server startup with `DEV_DATABASE` set: verify database is initialized AND member users are seeded
- Test full server startup with `BRIGHTCHAIN_BLOCKSTORE_PATH` set: verify database is initialized AND member users are seeded
- Test server restart idempotency: start → seed → stop → start → seed → verify no duplicates
- Test Greenlock wiring end-to-end with mocked `greenlock-express`: verify `init()` is called with correct options including `staging: false`, correct challenges, and correct site config
