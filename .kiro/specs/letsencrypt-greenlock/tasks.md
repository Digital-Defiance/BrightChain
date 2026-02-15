# Implementation Plan: Let's Encrypt via Upstream Application Refactor

## Overview

Refactor BrightChain's `App<TID>` to extend the upstream `Application` from `@digitaldefiance/node-express-suite`, eliminating duplicated server lifecycle code and inheriting greenlock/Let's Encrypt support. The work is done in the BrightChain workspace (primarily `brightchain-api-lib`). The upstream package is already at v3.12.16+ with full greenlock support.

## Tasks

- [x] 1. Create stub types and bridge interfaces for upstream compatibility
  - [x] 1.1 Create `brightchain-api-lib/src/lib/interfaces/brightchain-init-result.ts` with `IBrightChainInitResult<TID>` stub
    - Define interface extending `IServerInitResult<TID>` from upstream (or a minimal compatible shape)
    - This is used as the `TInitResults` generic parameter when extending upstream `Application`
    - Since BrightChain doesn't use mongoose init results, the stub can use `Partial<IServerInitResult<TID>>` or a minimal type
    - Export from `brightchain-api-lib/src/lib/interfaces/index.ts`
    - _Requirements: 1.2, 6.1, 6.2_

  - [x] 1.2 Create no-op factory functions in `brightchain-api-lib/src/lib/upstream-stubs.ts`
    - `noOpSchemaMapFactory`: returns `{}` — satisfies `SchemaMap` for empty model docs
    - `noOpDatabaseInitFunction`: returns `Promise.resolve({ success: true })` — satisfies `IFailableResult`
    - `noOpInitResultHashFunction`: returns `'no-mongoose'`
    - Export from `brightchain-api-lib/src/lib/upstream-stubs.ts`
    - _Requirements: 1.4, 1.5, 6.1, 6.2, 6.3_

- [x] 2. Update BrightChain's AppRouter to be compatible with upstream Application
  - [x] 2.1 Make `AppRouter<TID>` in `brightchain-api-lib/src/lib/routers/app.ts` extend the upstream `AppRouter` or implement a compatible interface
    - The upstream `Application` constructor expects `appRouterFactory: (apiRouter: BaseRouter<TID>) => TAppRouter` where `TAppRouter extends AppRouter<TID>` (upstream)
    - Option A: Make BrightChain's `AppRouter` extend upstream `AppRouter` and override `init()`
    - Option B: If extending is impractical, use a wrapper/adapter that satisfies the upstream type
    - Ensure `init(app: Application)` method signature remains compatible
    - _Requirements: 1.2, 2.1_

- [x] 3. Refactor App to extend upstream Application
  - [x] 3.1 Update `App<TID>` in `brightchain-api-lib/src/lib/application.ts` to extend upstream `Application` instead of local `BaseApplication`
    - Change: `extends BaseApplication<TID>` → `extends Application<IBrightChainInitResult<TID>, Record<string, never>, TID, Environment<TID>, IConstants, AppRouter<TID>>`
    - Import `Application` from `@digitaldefiance/node-express-suite` (aliased to avoid conflict with Express `Application`)
    - Remove `expressApp` field (provided by upstream)
    - Remove `server` field (managed by upstream)
    - Keep: `controllers`, `keyStorage`, `apiRouter`, `eventSystem`, `wsServer`, `messagePassingService`, `upnpManager`
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Update `App` constructor to pass required arguments to `super()`
    - Pass: `environment`, `apiRouterFactory`, `noOpSchemaMapFactory`, `noOpDatabaseInitFunction`, `noOpInitResultHashFunction`, CSP config (or undefined), `AppConstants`, `appRouterFactory`, `Middlewares.init`
    - Remove `this.expressApp = express()` (upstream creates it)
    - Remove `this.server = null` (upstream manages it)
    - Keep `this.keyStorage = SecureKeyStorage.getInstance()`
    - _Requirements: 1.2, 1.4, 1.5_

  - [x] 3.3 Refactor `App.start()` to delegate to `super.start()`
    - Call `await super.start(undefined)` — passes no mongoUri, skipping mongoose connection
    - Upstream handles: middleware init, router setup, error handler, HTTP server, greenlock/HTTPS, dev-HTTPS
    - After super.start(): initialize keyStorage, create and register BrightChain services (memberStore, energyStore, energyLedger, emailService, authService)
    - After super.start(): initialize EventNotificationSystem, register as service
    - After super.start(): initialize WebSocketMessageServer (need access to server — see 3.4)
    - After super.start(): wire EventNotificationSystem to SyncController via apiRouter
    - After super.start(): initialize UPnP if enabled (non-fatal on failure)
    - Remove all duplicated code: express(), middleware init, router setup, error handler, server.listen(), dev HTTPS setup
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Resolve server access for WebSocket attachment
    - The upstream `Application` has `private server` — `App` cannot access it directly
    - Option A (preferred): Update upstream to make `server` protected or add `protected get httpServer()` accessor, then publish a patch version
    - Option B: After `super.start()`, find the server by listening on the Express app's `listening` event or by tracking it via a custom middleware
    - Option C: Attach WebSocket to the Express app directly using `express-ws` or similar
    - Document which option is chosen and implement accordingly
    - _Requirements: 2.4, 7.1_

  - [x] 3.5 Refactor `App.stop()` to delegate to `super.stop()`
    - First: shut down UPnP (`this.upnpManager.shutdown()`)
    - Then: close WebSocket server
    - Then: clean up eventSystem, messagePassingService, apiRouter (set to null)
    - Then: call `await super.stop()` — upstream handles: greenlockManager.stop(), server.close(), _ready = false
    - Remove duplicated server close logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Preserve DocumentStore functionality
  - [x] 4.1 Move DocumentStore management from local `BaseApplication` into `App`
    - Add `private readonly documentStore: DocumentStore` field to `App`
    - Initialize in constructor: `this.documentStore = createBlockDocumentStore({...})`
    - Add `get db()` accessor that returns `this.documentStore` (overriding upstream's mongoose-based `db`)
    - Add `getModel()` method that delegates to `this.documentStore.collection()`
    - _Requirements: 4.3, 6.4_

  - [x] 4.2 Simplify or remove local `BaseApplication` in `brightchain-api-lib/src/lib/application-base.ts`
    - Since `App` now extends upstream `Application` and manages DocumentStore directly, `BaseApplication_Local` is no longer needed
    - Remove the class if no other code depends on it (only `App` imports it — confirmed)
    - Update `brightchain-api-lib/src/index.ts` to remove the export
    - Keep the file with a deprecation comment if backward compatibility is needed
    - _Requirements: 4.1, 4.2_

- [x] 5. Checkpoint - Verify compilation
  - Run: `NX_TUI=false npx nx build brightchain-api-lib --outputStyle=stream`
  - Ensure the refactored code compiles without errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update environment configuration
  - [x] 6.1 Update `brightchain-api/src/.env.example` with Let's Encrypt env vars and descriptions
    - Add a `# ─── Let's Encrypt / Greenlock Configuration ─────` section
    - Document: `LETS_ENCRYPT_ENABLED`, `LETS_ENCRYPT_EMAIL`, `LETS_ENCRYPT_HOSTNAMES`, `LETS_ENCRYPT_STAGING`, `LETS_ENCRYPT_CONFIG_DIR`
    - Include sensible defaults and comments
    - _Requirements: 5.5_

  - [x] 6.2 Verify that `Environment_Local` inherits `letsEncrypt` getter from upstream
    - The local `Environment<TID>` extends upstream `Environment<TID>` which already parses `LETS_ENCRYPT_*` vars
    - The local `IEnvironment<TID>` extends upstream `IEnvironment<TID>` which already includes `letsEncrypt: ILetsEncryptConfig`
    - Verify no overrides or conflicts exist — if the local Environment or IEnvironment shadows the upstream `letsEncrypt`, fix it
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Write tests for the refactored App
  - [x] 7.1 Write unit tests for constructor and inheritance
    - Test: `App` instance is `instanceof` upstream `Application` (Req 1.1)
    - Test: `App` construction succeeds with a valid Environment (Req 1.2, 1.3)
    - Test: no-op schemaMapFactory returns empty object (Req 1.4, 6.1)
    - Test: no-op databaseInitFunction returns `{ success: true }` (Req 1.5, 6.2)
    - Test: DocumentStore is accessible via `db` getter (Req 4.3)
    - Test file: `brightchain-api-lib/src/lib/__tests__/application-refactor.spec.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.3, 6.1, 6.2_

  - [x] 7.2 Write unit tests for start/stop lifecycle
    - Test: `App.start()` calls `super.start()` (spy on prototype) (Req 2.1)
    - Test: After start, BrightChain services are registered (memberStore, energyStore, etc.) (Req 2.2, 2.3, 7.2)
    - Test: After start, `ready` is `true` (Req 2.7)
    - Test: `App.stop()` calls `super.stop()` (Req 3.3)
    - Test: After stop, eventSystem/messagePassingService/apiRouter are null (Req 3.4)
    - Test: After stop, `ready` is `false` (Req 3.5)
    - Test file: `brightchain-api-lib/src/lib/__tests__/application-refactor.spec.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 3.3, 3.4, 3.5, 7.2_

  - [x] 7.3 Write unit tests for API surface compatibility
    - Test: All public methods exist (getController, setController, getApiRouter, getEventSystem, getWebSocketServer, setMessagePassingService, setDiscoveryProtocol, setAvailabilityService, setReconciliationService) (Req 7.1)
    - Test file: `brightchain-api-lib/src/lib/__tests__/application-refactor.spec.ts`
    - _Requirements: 7.1_

  - [x] 7.4 Write property test for hostname parsing round-trip
    - **Property 1: Hostname parsing round-trip**
    - **Validates: Requirements 5.4**
    - Generate random arrays of valid hostname strings, join with commas, parse via `parseHostnames()` from upstream, assert array equality
    - Use `fast-check` with minimum 100 iterations
    - Test file: `brightchain-api-lib/src/lib/__tests__/letsencrypt-config.spec.ts`

  - [x] 7.5 Write property test for ILetsEncryptConfig JSON round-trip
    - **Property 2: ILetsEncryptConfig JSON round-trip**
    - **Validates: Requirements 8.1, 8.2**
    - Generate random `ILetsEncryptConfig` objects, round-trip through `JSON.parse(JSON.stringify())`, assert deep equality
    - Use `fast-check` with minimum 100 iterations
    - Test file: `brightchain-api-lib/src/lib/__tests__/letsencrypt-config.spec.ts`

- [x] 8. Checkpoint - Ensure all tests pass
  - Run: `NX_TUI=false npx nx test brightchain-api-lib --outputStyle=stream`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Verify existing tests still pass
  - [x] 9.1 Run the full brightchain-api-lib test suite
    - Run: `NX_TUI=false npx nx test brightchain-api-lib --outputStyle=stream`
    - Fix any regressions caused by the refactor (changed imports, removed BaseApplication, etc.)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Run the full workspace build to check for compilation errors
    - Run: `NX_TUI=false npx nx run-many --target=build --outputStyle=stream`
    - Fix any import/export issues caused by removing BaseApplication or changing App's type signature
    - _Requirements: 7.1_

- [x] 10. Final checkpoint - All tests and builds pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are in the BrightChain workspace (`brightchain-api-lib`), not the upstream `node-express-suite` repo
- The upstream package v3.12.16+ already has full greenlock support — we're inheriting it, not implementing it
- Task 3.4 (server access for WebSocket) may require a minor upstream patch to make `server` protected — if so, publish a patch version first
- The `LETS_ENCRYPT_*` env vars use underscores (matching upstream convention), not `LETSENCRYPT_*`
- Property tests use `fast-check` with minimum 100 iterations
- Run tests with: `NX_TUI=false npx nx test brightchain-api-lib --outputStyle=stream`
- The local `BaseApplication` can be safely removed since only `App` imports it
