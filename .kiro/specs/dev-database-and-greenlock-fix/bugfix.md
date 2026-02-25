# Bugfix Requirements Document

## Introduction

Two related bugs affect the BrightChain API server startup flow:

1. **BrightChainMemberInitService never called during startup**: The server bootstrap flow (`main.ts` → `App.start()` → `BrightChainDatabasePlugin.connect()`) correctly initializes the block store and database via `brightchainDatabaseInit()`, respecting the `DEV_DATABASE` environment variable. However, `BrightChainMemberInitService` is never invoked during the server lifecycle. This means system/admin/member users are never persisted to the database on startup, leaving the application without its required seed users.

2. **Greenlock/Let's Encrypt verification**: The Greenlock integration needs verification that the full flow works correctly when `LETS_ENCRYPT_ENABLED=true`, `LETS_ENCRYPT_EMAIL` is set, `LETS_ENCRYPT_HOSTNAMES` is set, and `LETS_ENCRYPT_STAGING=false`. The upstream `Application.start()` checks `this.environment.letsEncrypt.enabled`, creates a `GreenlockManager`, and calls `greenlockManager.start(expressApp)`. The `Environment` constructor validates that when enabled, `maintainerEmail` is non-empty, `hostnames` is non-empty, and all hostnames pass `isValidHostname()`. The challenge config correctly selects HTTP-01 for standard hostnames and adds DNS-01 for wildcards.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the server starts with `DEV_DATABASE` set (e.g. `DEV_DATABASE=example`) THEN the system correctly creates an ephemeral MemoryBlockStore and BrightChainDb via `brightchainDatabaseInit()`, but `BrightChainMemberInitService.initialize()` is never called, so no system/admin/member users are persisted to the database

1.2 WHEN the server starts without `DEV_DATABASE` set but with `BRIGHTCHAIN_BLOCKSTORE_PATH` configured THEN the system correctly creates a DiskBlockStore and BrightChainDb with PersistentHeadRegistry, but `BrightChainMemberInitService.initialize()` is never called, so no system/admin/member users are persisted to the database

1.3 WHEN `BrightChainDatabasePlugin.initializeDevStore()` is called during the dev database flow THEN the method is a no-op (returns `undefined`) instead of seeding the database with the required system/admin/member users

1.4 WHEN the Greenlock/Let's Encrypt configuration has `LETS_ENCRYPT_ENABLED=true`, `LETS_ENCRYPT_STAGING=false`, valid `LETS_ENCRYPT_EMAIL`, and valid `LETS_ENCRYPT_HOSTNAMES` THEN the system should initialize Greenlock with production ACME servers and start HTTPS on port 443 with HTTP redirect on port 80, but this flow has not been verified end-to-end for correctness

### Expected Behavior (Correct)

2.1 WHEN the server starts with `DEV_DATABASE` set THEN the system SHALL call `BrightChainMemberInitService` after the database plugin connects, using an `IBrightChainMemberInitConfig` with `useMemoryStore: true` and the dev pool name as `memberPoolName`, to persist system/admin/member users into the in-memory database

2.2 WHEN the server starts without `DEV_DATABASE` but with `BRIGHTCHAIN_BLOCKSTORE_PATH` configured THEN the system SHALL call `BrightChainMemberInitService` after the database plugin connects, using an `IBrightChainMemberInitConfig` with the configured `blockStorePath` and `useMemoryStore: false`, to persist system/admin/member users into the disk-backed database

2.3 WHEN `BrightChainDatabasePlugin.initializeDevStore()` is called during the dev database flow THEN the system SHALL invoke `BrightChainMemberInitService.initialize()` (or equivalent logic) to seed the database with system/admin/member users using the environment-derived configuration

2.4 WHEN the Greenlock/Let's Encrypt configuration has `LETS_ENCRYPT_ENABLED=true`, `LETS_ENCRYPT_STAGING=false`, valid email, and valid hostnames THEN the system SHALL correctly pass `staging: false` to `greenlockExpress.init()`, use the production ACME directory, configure HTTP-01 challenges for standard hostnames (and DNS-01 for wildcards), and start HTTPS on port 443 with HTTP redirect on port 80

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `DEV_DATABASE` is set THEN the system SHALL CONTINUE TO create an ephemeral MemoryBlockStore via `brightchainDatabaseInit()` (the existing database initialization logic must not change)

3.2 WHEN `BRIGHTCHAIN_BLOCKSTORE_PATH` is set and `DEV_DATABASE` is not set THEN the system SHALL CONTINUE TO create a DiskBlockStore with PersistentHeadRegistry via `brightchainDatabaseInit()`

3.3 WHEN neither `DEV_DATABASE` nor `BRIGHTCHAIN_BLOCKSTORE_PATH` is set THEN the system SHALL CONTINUE TO throw an error during database initialization

3.4 WHEN `LETS_ENCRYPT_ENABLED=false` or not set THEN the system SHALL CONTINUE TO skip Greenlock initialization and only start the HTTP server on the configured port

3.5 WHEN `LETS_ENCRYPT_ENABLED=true` but `LETS_ENCRYPT_EMAIL` is empty THEN the system SHALL CONTINUE TO throw a validation error during Environment construction

3.6 WHEN `LETS_ENCRYPT_ENABLED=true` but `LETS_ENCRYPT_HOSTNAMES` is empty THEN the system SHALL CONTINUE TO throw a validation error during Environment construction

3.7 WHEN `LETS_ENCRYPT_ENABLED=true` and hostnames contain invalid entries THEN the system SHALL CONTINUE TO throw a validation error during Environment construction

3.8 WHEN `BrightChainMemberInitService.initialize()` is called with users that already exist in the database THEN the system SHALL CONTINUE TO skip duplicate entries (idempotency is preserved)

3.9 WHEN the server starts THEN the existing plugin lifecycle (connect → init → stop) and service registration in `App.start()` SHALL CONTINUE TO work as before
