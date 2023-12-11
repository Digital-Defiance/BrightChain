# Implementation Plan: App Subsystem Plugins

## Overview

Refactor the monolithic `App.start()` method (~950 lines) into a plugin-based subsystem architecture. The work proceeds in three phases: (1) define the shared interface and plugin registry, (2) extract each subsystem into its own plugin class one at a time, verifying no regressions after each extraction, and (3) wire everything together with the BrightCal plugin last to break the circular dependency.

All plugin implementations use TypeScript. Property-based tests use `fast-check`.

## Tasks

- [x] 1. Define IAppSubsystemPlugin interface and ISubsystemContext in brightchain-lib
  - [x] 1.1 Create `brightchain-lib/src/lib/interfaces/appSubsystemPlugin.ts`
    - Define `IServiceContainer` interface with `register<T>(key, factory, overwrite?)`, `get<T>(key)`, `has(key)` methods
    - Define `ISubsystemContext` interface with fields: `services`, `apiRouter`, `expressApp`, `environment`, `blockStore`, `memberStore`, `energyStore`, `brightDb`, `getModel(name)`, `eventSystem`
    - Define `IAppSubsystemPlugin` interface with `readonly name: string`, `readonly isOptional?: boolean`, `initialize(context: ISubsystemContext): Promise<void>`, `stop?(): Promise<void>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Export the new interfaces from `brightchain-lib/src/lib/interfaces/index.ts`
    - Add `export type * from './appSubsystemPlugin'` to the barrel file
    - _Requirements: 1.5_

  - [x] 1.3 Write unit tests for interface type compliance
    - Create a test in `brightchain-lib/src/lib/interfaces/__tests__/appSubsystemPlugin.spec.ts`
    - Verify a mock object satisfying `IAppSubsystemPlugin` compiles and has the correct shape
    - Verify `ISubsystemContext` fields are accessible
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 2. Implement Plugin Registry in the App class
  - [x] 2.1 Add plugin registry and `registerSubsystemPlugin` method to `App<TID>`
    - Add `private readonly subsystemPlugins: IAppSubsystemPlugin[] = []` field
    - Add `public registerSubsystemPlugin(plugin: IAppSubsystemPlugin): void` that checks for duplicate names and appends to the array
    - Throw `Error` with descriptive message on duplicate name
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property test: Registry preserves insertion order
    - **Property 1: Registry preserves insertion order**
    - Use `fast-check` to generate arrays of uniquely-named mock plugins (1–20), register all, verify internal order matches insertion order
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [x] 2.3 Write property test: Duplicate name rejection
    - **Property 2: Duplicate name rejection**
    - Use `fast-check` to generate random name strings, register once, attempt second registration, verify throw
    - **Validates: Requirements 2.3**

- [x] 3. Implement plugin lifecycle hooks in App.start() and App.stop()
  - [x] 3.1 Add plugin initialization loop to `App.start()`
    - After core services init (email service, auth, sessions, events, WebSocket), construct `ISubsystemContext` from App properties
    - Iterate `this.subsystemPlugins` in order, calling `plugin.initialize(context)`
    - On success: `debugLog` with plugin name
    - On error + `isOptional !== false`: `console.warn` and continue
    - On error + `isOptional === false`: propagate error, abort
    - Place the loop after the existing core init block and before UPnP init
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Add plugin teardown loop to `App.stop()`
    - Before existing cleanup (UPnP, WebSocket, event system, `super.stop()`), iterate `this.subsystemPlugins` in reverse order
    - Call `plugin.stop()` if defined; catch and `console.warn` on error, continue
    - Skip plugins without a `stop` method
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.3 Write property test: Initialize in registration order
    - **Property 3: Initialize in registration order**
    - Use `fast-check` to generate plugin arrays, mock `initialize` to record call order, verify matches registration order
    - **Validates: Requirements 3.1**

  - [x] 3.4 Write property test: Optional plugin failure is non-fatal
    - **Property 4: Optional plugin failure is non-fatal**
    - Use `fast-check` to generate plugins with random `isOptional` (true/undefined) and random throw behavior, verify all are attempted and start completes
    - **Validates: Requirements 1.4, 3.2, 12.3**

  - [x] 3.5 Write property test: Non-optional plugin failure aborts start
    - **Property 5: Non-optional plugin failure aborts start**
    - Use `fast-check` to generate plugin sequence with one non-optional thrower at random position, verify subsequent plugins not called
    - **Validates: Requirements 3.3**

  - [x] 3.6 Write property test: Stop in reverse registration order
    - **Property 6: Stop in reverse registration order**
    - Use `fast-check` to generate plugins with random `stop()` presence, call stop, verify reverse order
    - **Validates: Requirements 4.1**

  - [x] 3.7 Write property test: Stop errors are non-fatal
    - **Property 7: Stop errors are non-fatal**
    - Use `fast-check` to generate plugins where random `stop()` methods throw, verify all `stop()` methods still called
    - **Validates: Requirements 4.2, 4.3**

- [x] 4. Checkpoint — Verify registry and lifecycle
  - Ensure all tests pass (`yarn nx test brightchain-api-lib` and `yarn nx test brightchain-lib`), ask the user if questions arise.

- [x] 5. Extract EmailSubsystemPlugin
  - [x] 5.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/emailSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "email"`, `isOptional: true`
    - Move the entire Email subsystem block from `App.start()` into `initialize(context)`
    - Create `MessageCBLService` stub, `MemoryMessageMetadataStore`, `BrightDbEmailMetadataStore`, gossip stub, `MessagePassingService`, and wire to `apiRouter`
    - Register `messagePassingService` and `emailMetadataStore` in `context.services`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Remove the inline Email subsystem block from `App.start()` and register the plugin
    - In `App` constructor or before the plugin loop, call `this.registerSubsystemPlugin(new EmailSubsystemPlugin())`
    - Remove the `// ── Email subsystem` try/catch block from `start()`
    - _Requirements: 5.1, 12.1, 12.2_

  - [x] 5.3 Write unit tests for EmailSubsystemPlugin
    - Verify `name` is `"email"` and `isOptional` is `true`
    - Verify `initialize` registers `messagePassingService` and `emailMetadataStore` in a mock service container
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Extract BrightHubSubsystemPlugin
  - [x] 6.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/brightHubSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "brighthub"`
    - Move the BrightHub social services block from `App.start()` into `initialize(context)`
    - Create all 8 services (PostService, ThreadService, FeedService, MessagingService, NotificationService, ConnectionService, DiscoveryService, UserProfileService) using the collection adapter pattern
    - Register all 8 services in `context.services`
    - Wire cross-service dependencies (notification → post/userProfile, connection → userProfile, raw user search)
    - Wire all 8 services to `context.apiRouter` if available
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Remove the inline BrightHub block from `App.start()` and register the plugin
    - Register `new BrightHubSubsystemPlugin()` in the App
    - Remove the `// ── BrightHub social services` block from `start()`
    - _Requirements: 6.1, 12.1, 12.2_

  - [x] 6.3 Write unit tests for BrightHubSubsystemPlugin
    - Verify `name` is `"brighthub"`
    - Verify `initialize` registers all 8 social service keys in a mock service container
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Extract BrightChatSubsystemPlugin
  - [x] 7.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/brightChatSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "brightchat"`
    - Move the BrightChat communication services block from `App.start()` into `initialize(context)`
    - Create ECIES key encryption handler, member public key cache, `ensureMemberPublicKey` helper
    - Create block content store adapter, `ConversationService`, `GroupService`, `ChannelService`, `ServerService`
    - Register `permissionService`, `blockContentStore`, `conversationService`, `groupService`, `channelService`, `serverService`, `ensureMemberPublicKey` in `context.services`
    - Wire services to `context.apiRouter` if available
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 Remove the inline BrightChat block from `App.start()` and register the plugin
    - Register `new BrightChatSubsystemPlugin()` in the App
    - Remove the `// ── BrightChat communication services` block from `start()`
    - _Requirements: 7.1, 12.1, 12.2_

  - [x] 7.3 Write unit tests for BrightChatSubsystemPlugin
    - Verify `name` is `"brightchat"`
    - Verify `initialize` registers all chat service keys in a mock service container
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Checkpoint — Verify Email, BrightHub, BrightChat extractions
  - Ensure all tests pass (`yarn nx test brightchain-api-lib`), ask the user if questions arise.

- [x] 9. Extract BrightPassSubsystemPlugin
  - [x] 9.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/brightPassSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "brightpass"`
    - Move the BrightPass vault metadata block from `App.start()` into `initialize(context)`
    - Create `ChatCollectionAdapter<VaultMetadataDocument>` for `brightpass_vaults` collection
    - Register `vaultMetadataCollection` in `context.services`
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Remove the inline BrightPass block from `App.start()` and register the plugin
    - Register `new BrightPassSubsystemPlugin()` in the App
    - Remove the `// ── BrightPass vault metadata` block from `start()`
    - _Requirements: 8.1, 12.1, 12.2_

  - [x] 9.3 Write unit tests for BrightPassSubsystemPlugin
    - Verify `name` is `"brightpass"`
    - Verify `initialize` registers `vaultMetadataCollection` in a mock service container
    - _Requirements: 8.1, 8.2_

- [x] 10. Extract BurnbagSubsystemPlugin
  - [x] 10.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/burnbagSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "burnbag"`, `isOptional: true`
    - Move the Digital Burnbag block from `App.start()` into `initialize(context)`
    - Create burnbag dependencies using `createBurnbagDeps` and mount routes via `apiRouter.mountDigitalBurnbagRoutes`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 10.2 Remove the inline Burnbag block from `App.start()` and register the plugin
    - Register `new BurnbagSubsystemPlugin()` in the App
    - Remove the `// ── Digital Burnbag` block from `start()`
    - _Requirements: 9.1, 12.1, 12.2_

  - [x] 10.3 Write unit tests for BurnbagSubsystemPlugin
    - Verify `name` is `"burnbag"` and `isOptional` is `true`
    - Verify `initialize` calls `mountDigitalBurnbagRoutes` on the apiRouter
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Extract BrightTrustSubsystemPlugin
  - [x] 11.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/brightTrustSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "brighttrust"`, `isOptional: true`
    - Move the entire BrightTrust subsystem block from `App.start()` into `initialize(context)`
    - Create BrightTrustDatabaseAdapter, BrightTrustStateMachine, AuditLogService, IdentitySealingPipeline, AliasRegistry, IdentityExpirationScheduler, BrightTrustGossipHandler factory, IdentityValidator, ContentIngestionService, CLIOperatorPrompt
    - Register all BrightTrust services in `context.services` using the same keys
    - Start the IdentityExpirationScheduler
    - Implement `stop()` method: stop IdentityExpirationScheduler, stop BrightTrustGossipHandler, null out references
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 11.2 Remove the inline BrightTrust block from `App.start()` and BrightTrust cleanup from `App.stop()`
    - Register `new BrightTrustSubsystemPlugin()` in the App
    - Remove the `// ── BrightTrust subsystem initialization` try/catch block from `start()`
    - Remove the `// ── BrightTrust subsystem shutdown` block from `stop()` (now handled by plugin `stop()`)
    - _Requirements: 10.1, 10.5, 12.1, 12.2, 12.5_

  - [x] 11.3 Write unit tests for BrightTrustSubsystemPlugin
    - Verify `name` is `"brighttrust"`, `isOptional` is `true`, and `stop` method is defined
    - Verify `initialize` registers all BrightTrust service keys in a mock service container
    - Verify `stop` calls scheduler stop and gossip handler stop
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 12. Checkpoint — Verify all brightchain-api-lib plugin extractions
  - Ensure all tests pass (`yarn nx test brightchain-api-lib` and `yarn nx lint brightchain-api-lib`), ask the user if questions arise.

- [x] 13. Create barrel export for subsystem plugins
  - [x] 13.1 Create `brightchain-api-lib/src/lib/plugins/subsystems/index.ts`
    - Export all 6 plugin classes from the barrel file
    - _Requirements: 12.1_

- [x] 14. Extract BrightCalSubsystemPlugin in brightcal-api-lib
  - [x] 14.1 Create `brightcal-api-lib/src/lib/plugins/brightCalSubsystemPlugin.ts`
    - Implement `IAppSubsystemPlugin` with `name: "brightcal"`, `isOptional: true`
    - Import `IAppSubsystemPlugin` and `ISubsystemContext` from `@brightchain/brightchain-lib` (NOT from `brightchain-api-lib`)
    - Move the BrightCal calendar block logic into `initialize(context)`: call `createCalendarRouter`, mount all calendar controllers, CalDAV middleware, HolidayCatalogController on `context.expressApp`
    - Register `calendarEngine` and `eventEngine` in `context.services`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2_

  - [x] 14.2 Update App to dynamically import and register BrightCalSubsystemPlugin
    - In `App.start()`, after registering the 6 local plugins but before the plugin loop, use `await import('@brightchain/brightcal-api-lib')` to load the BrightCalSubsystemPlugin class
    - Instantiate and call `this.registerSubsystemPlugin(new BrightCalSubsystemPlugin())` 
    - Wrap in try/catch so failure to load is non-fatal
    - Remove the inline `// ── BrightCal calendar subsystem` try/catch block from `start()`
    - Ensure no compile-time import of `brightcal-api-lib` exists in `application.ts`
    - _Requirements: 11.6, 13.3, 12.1, 12.2_

  - [x] 14.3 Write unit tests for BrightCalSubsystemPlugin
    - Verify `name` is `"brightcal"` and `isOptional` is `true`
    - Verify `initialize` registers `calendarEngine` and `eventEngine` in a mock service container
    - _Requirements: 11.1, 11.3, 11.4_

- [x] 15. Final checkpoint — Full regression verification
  - Run `yarn nx test brightchain-lib`, `yarn nx test brightchain-api-lib`, `yarn nx test brightcal-api-lib`
  - Run `yarn nx lint brightchain-api-lib` and `yarn nx lint brightcal-api-lib`
  - Verify no compile-time import of `brightcal-api-lib` in `brightchain-api-lib/src/`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each plugin extraction (tasks 5–11, 14) is independently testable — run existing tests after each to catch regressions early
- The BrightCal plugin (task 14) is done last because it requires the interface from task 1 and the registry from task 2 to exist first, and it's the one that breaks the circular dependency
- Property tests validate universal correctness properties of the registry and lifecycle mechanics
- Unit tests validate specific plugin behaviors with mocked contexts
- Checkpoints at tasks 4, 8, 12, and 15 ensure incremental validation
