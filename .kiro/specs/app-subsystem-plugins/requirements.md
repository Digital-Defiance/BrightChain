# Requirements Document

## Introduction

The `App` class in `brightchain-api-lib/src/lib/application.ts` has a monolithic `start()` method (~950 lines) that initializes seven distinct subsystems inline. Each subsystem follows the same lifecycle pattern: create services, register in the service container, wire controllers/routes to the apiRouter, log success, and catch errors for graceful degradation. This feature extracts that repeated pattern into a formal plugin-based subsystem architecture with a shared interface, enabling each subsystem to be independently developed, tested, and — critically — housed in its own library package to break circular dependencies (specifically `brightchain-api-lib ↔ brightcal-api-lib`).

## Glossary

- **App**: The `App<TID>` class in `brightchain-api-lib/src/lib/application.ts` that extends `BrightDbApplication` and orchestrates all BrightChain services.
- **Subsystem**: A logically distinct group of services initialized during `App.start()` (e.g., Email, BrightHub, BrightChat, BrightPass, Digital Burnbag, BrightTrust, BrightCal).
- **IAppSubsystemPlugin**: The shared interface that all subsystem plugins implement, defining lifecycle hooks for initialization and teardown.
- **Plugin_Registry**: The component within the App class responsible for storing registered subsystem plugins and iterating them during `start()` and `stop()`.
- **Service_Container**: The existing `this.services` object (ServiceContainer pattern) used to register and resolve service instances by key.
- **Api_Router**: The existing `this.apiRouter` instance of `ApiRouter<TID>` used to wire controllers and route handlers to the Express application.
- **Subsystem_Context**: The narrowed set of App resources (stores, Service_Container, Api_Router, Express app, environment, etc.) passed to each plugin during initialization.
- **BrightChainDatabasePlugin**: The existing database lifecycle plugin (separate concept) that manages DB connection, seeding, and store initialization.
- **Block_Store**: The `blockStore` instance obtained from BrightChainDatabasePlugin after `super.start()` completes.
- **Member_Store**: The `memberStore` instance obtained from BrightChainDatabasePlugin after `super.start()` completes.
- **Energy_Store**: The `energyStore` instance obtained from BrightChainDatabasePlugin after `super.start()` completes.
- **Bright_Db**: The `brightDb` instance obtained from BrightChainDatabasePlugin after `super.start()` completes.

## Requirements

### Requirement 1: Subsystem Plugin Interface Definition

**User Story:** As a library maintainer, I want a shared subsystem plugin interface defined in `brightchain-lib`, so that any package (including `brightcal-api-lib`) can implement a subsystem plugin without depending on `brightchain-api-lib`.

#### Acceptance Criteria

1. THE IAppSubsystemPlugin interface SHALL define a `name` property of type `string` that uniquely identifies the subsystem.
2. THE IAppSubsystemPlugin interface SHALL define an `initialize` method that accepts a Subsystem_Context object and returns a `Promise<void>`.
3. THE IAppSubsystemPlugin interface SHALL define an optional `stop` method that returns a `Promise<void>` for teardown logic.
4. THE IAppSubsystemPlugin interface SHALL define an optional `isOptional` boolean property that defaults to `true` when not specified.
5. THE IAppSubsystemPlugin interface SHALL be exported from `brightchain-lib/src/lib/interfaces/index.ts`.
6. THE Subsystem_Context interface SHALL provide access to the Service_Container, Api_Router, Express application, environment configuration, Block_Store, Member_Store, Energy_Store, and Bright_Db.
7. THE Subsystem_Context interface SHALL be defined in `brightchain-lib` so that external packages can reference the context type without depending on `brightchain-api-lib`.

### Requirement 2: Plugin Registry in the App Class

**User Story:** As a developer, I want the App class to maintain a registry of subsystem plugins, so that plugins can be registered declaratively and iterated during lifecycle events.

#### Acceptance Criteria

1. THE App class SHALL maintain an ordered list of registered IAppSubsystemPlugin instances in the Plugin_Registry.
2. THE App class SHALL provide a `registerSubsystemPlugin` method that accepts an IAppSubsystemPlugin instance and appends the plugin to the Plugin_Registry.
3. WHEN `registerSubsystemPlugin` is called with a plugin whose `name` matches an already-registered plugin, THE App class SHALL throw an error indicating a duplicate plugin name.
4. THE Plugin_Registry SHALL preserve insertion order so that plugins initialize in the order they were registered.

### Requirement 3: Plugin Lifecycle During App Start

**User Story:** As a developer, I want subsystem plugins to be initialized automatically during `App.start()`, so that the monolithic inline initialization is replaced by plugin iteration.

#### Acceptance Criteria

1. WHEN `App.start()` is called, THE App class SHALL invoke the `initialize` method of each registered plugin in Plugin_Registry order after `super.start()` completes and core services (email service, auth service, session adapter, event system, WebSocket servers) are initialized.
2. WHEN a plugin's `initialize` method throws an error and the plugin's `isOptional` property is `true` or undefined, THE App class SHALL log a warning including the plugin name and error, and continue initializing the remaining plugins.
3. WHEN a plugin's `initialize` method throws an error and the plugin's `isOptional` property is `false`, THE App class SHALL propagate the error and abort the start sequence.
4. THE App class SHALL pass a fully populated Subsystem_Context to each plugin's `initialize` method.
5. WHEN a plugin's `initialize` method completes successfully, THE App class SHALL log a debug message indicating the plugin name has been initialized.

### Requirement 4: Plugin Lifecycle During App Stop

**User Story:** As a developer, I want subsystem plugins to be torn down automatically during `App.stop()`, so that cleanup logic is co-located with initialization logic.

#### Acceptance Criteria

1. WHEN `App.stop()` is called, THE App class SHALL invoke the `stop` method of each registered plugin that defines a `stop` method, in reverse Plugin_Registry order, before calling `super.stop()`.
2. IF a plugin's `stop` method throws an error, THEN THE App class SHALL log a warning including the plugin name and error, and continue stopping the remaining plugins.
3. WHEN a plugin does not define a `stop` method, THE App class SHALL skip that plugin during the stop sequence without error.

### Requirement 5: Email Subsystem Plugin Extraction

**User Story:** As a developer, I want the Email/MessagePassingService initialization extracted into its own subsystem plugin, so that the App.start() method is simplified.

#### Acceptance Criteria

1. THE EmailSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"email"`.
2. WHEN initialized, THE EmailSubsystemPlugin SHALL create a MessagePassingService with in-memory stores and a no-op gossip stub, matching the current inline behavior.
3. WHEN initialized, THE EmailSubsystemPlugin SHALL register `messagePassingService` and `emailMetadataStore` in the Service_Container.
4. WHEN initialized and an Api_Router is available, THE EmailSubsystemPlugin SHALL wire the MessagePassingService to the Api_Router for both message and email controllers, and configure the email user registry and email domain.
5. THE EmailSubsystemPlugin SHALL have `isOptional` set to `true`, matching the current graceful degradation behavior (email endpoints return 503 on failure).

### Requirement 6: BrightHub Social Subsystem Plugin Extraction

**User Story:** As a developer, I want the BrightHub social services initialization extracted into its own subsystem plugin, so that social service setup is encapsulated.

#### Acceptance Criteria

1. THE BrightHubSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"brighthub"`.
2. WHEN initialized, THE BrightHubSubsystemPlugin SHALL create PostService, ThreadService, FeedService, MessagingService, NotificationService, ConnectionService, DiscoveryService, and UserProfileService instances using the collection adapter pattern.
3. WHEN initialized, THE BrightHubSubsystemPlugin SHALL register all eight social services in the Service_Container.
4. WHEN initialized and an Api_Router is available, THE BrightHubSubsystemPlugin SHALL wire all eight social services to the Api_Router using the existing setter methods.
5. WHEN initialized, THE BrightHubSubsystemPlugin SHALL wire cross-service dependencies (notification service into post and user profile services, connection service into user profile service, raw user search into user profile service).

### Requirement 7: BrightChat Communication Subsystem Plugin Extraction

**User Story:** As a developer, I want the BrightChat communication services initialization extracted into its own subsystem plugin, so that chat service setup is encapsulated.

#### Acceptance Criteria

1. THE BrightChatSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"brightchat"`.
2. WHEN initialized, THE BrightChatSubsystemPlugin SHALL create ConversationService, GroupService, ChannelService, and ServerService instances with the ECIES key encryption handler, block content store adapter, and chat storage provider.
3. WHEN initialized, THE BrightChatSubsystemPlugin SHALL register `permissionService`, `blockContentStore`, `conversationService`, `groupService`, `channelService`, `serverService`, and `ensureMemberPublicKey` in the Service_Container.
4. WHEN initialized and an Api_Router is available, THE BrightChatSubsystemPlugin SHALL wire conversation, group, channel, permission, and server services to the Api_Router.
5. WHEN initialized, THE BrightChatSubsystemPlugin SHALL set up the member public key cache and the `ensureMemberPublicKey` helper for ECIES key wrapping operations.

### Requirement 8: BrightPass Vault Metadata Subsystem Plugin Extraction

**User Story:** As a developer, I want the BrightPass vault metadata registration extracted into its own subsystem plugin, so that vault setup is encapsulated.

#### Acceptance Criteria

1. THE BrightPassSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"brightpass"`.
2. WHEN initialized, THE BrightPassSubsystemPlugin SHALL create a ChatCollectionAdapter for the `brightpass_vaults` collection and register it as `vaultMetadataCollection` in the Service_Container.

### Requirement 9: Digital Burnbag Subsystem Plugin Extraction

**User Story:** As a developer, I want the Digital Burnbag initialization extracted into its own subsystem plugin, so that burnbag setup is encapsulated.

#### Acceptance Criteria

1. THE BurnbagSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"burnbag"`.
2. WHEN initialized, THE BurnbagSubsystemPlugin SHALL create burnbag dependencies using `createBurnbagDeps` from `@brightchain/digitalburnbag-api-lib` and mount routes via `apiRouter.mountDigitalBurnbagRoutes`.
3. THE BurnbagSubsystemPlugin SHALL have `isOptional` set to `true`, matching the current graceful degradation behavior.

### Requirement 10: BrightTrust Subsystem Plugin Extraction

**User Story:** As a developer, I want the BrightTrust initialization extracted into its own subsystem plugin, so that the complex trust subsystem setup is encapsulated and its teardown logic is co-located.

#### Acceptance Criteria

1. THE BrightTrustSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"brighttrust"`.
2. WHEN initialized, THE BrightTrustSubsystemPlugin SHALL create the BrightTrustDatabaseAdapter, BrightTrustStateMachine, AuditLogService, IdentitySealingPipeline, AliasRegistry, IdentityExpirationScheduler, BrightTrustGossipHandler factory, IdentityValidator, ContentIngestionService, and CLIOperatorPrompt, matching the current inline behavior.
3. WHEN initialized, THE BrightTrustSubsystemPlugin SHALL register all BrightTrust services in the Service_Container using the same keys as the current implementation.
4. WHEN initialized, THE BrightTrustSubsystemPlugin SHALL start the IdentityExpirationScheduler.
5. WHEN `stop` is called, THE BrightTrustSubsystemPlugin SHALL stop the IdentityExpirationScheduler, stop the BrightTrustGossipHandler, and null out BrightTrust references, matching the current `App.stop()` cleanup.
6. THE BrightTrustSubsystemPlugin SHALL have `isOptional` set to `true`, matching the current graceful degradation behavior.

### Requirement 11: BrightCal Calendar Subsystem Plugin Extraction

**User Story:** As a developer, I want the BrightCal calendar initialization extracted into a subsystem plugin that lives in `brightcal-api-lib`, so that the circular dependency between `brightchain-api-lib` and `brightcal-api-lib` is broken.

#### Acceptance Criteria

1. THE BrightCalSubsystemPlugin SHALL implement IAppSubsystemPlugin with the name `"brightcal"`.
2. THE BrightCalSubsystemPlugin SHALL be defined in the `brightcal-api-lib` package, not in `brightchain-api-lib`.
3. WHEN initialized, THE BrightCalSubsystemPlugin SHALL call `createCalendarRouter` and mount all calendar controllers, CalDAV middleware, and the HolidayCatalogController on the Express application, matching the current inline behavior.
4. WHEN initialized, THE BrightCalSubsystemPlugin SHALL register `calendarEngine` and `eventEngine` in the Service_Container.
5. THE BrightCalSubsystemPlugin SHALL have `isOptional` set to `true`, matching the current graceful degradation behavior.
6. WHEN the BrightCalSubsystemPlugin is used, THE App class SHALL register the plugin via `registerSubsystemPlugin` without importing from `brightcal-api-lib` at compile time, preserving the `!brightcal-api-lib` negative dependency in `brightchain-api-lib/project.json`.

### Requirement 12: Behavioral Equivalence After Refactor

**User Story:** As a system operator, I want the refactored plugin-based initialization to produce identical runtime behavior to the current monolithic implementation, so that no functionality is lost or changed.

#### Acceptance Criteria

1. WHEN all seven subsystem plugins are registered and initialized successfully, THE App class SHALL have the same services registered in the Service_Container with the same keys as the current implementation.
2. WHEN all seven subsystem plugins are registered and initialized successfully, THE App class SHALL have the same routes mounted on the Express application as the current implementation.
3. WHEN a subsystem plugin fails during initialization and is marked optional, THE App class SHALL log a warning and continue, matching the current `console.warn('continuing without X')` pattern.
4. THE refactored `App.start()` method SHALL retain all pre-plugin initialization logic (HTTP server setup, keep-alive timeout, production seeding, key storage initialization, email service factory, auth service, backup code service, session adapter, event system, WebSocket servers) inline, as these are core App concerns and not subsystem plugins.
5. THE refactored `App.stop()` method SHALL delegate subsystem-specific cleanup to plugin `stop` methods while retaining core cleanup (UPnP, WebSocket servers, event system, upstream `super.stop()`) inline.

### Requirement 13: Circular Dependency Resolution

**User Story:** As a build engineer, I want the circular dependency between `brightchain-api-lib` and `brightcal-api-lib` resolved through the plugin architecture, so that Nx builds are clean and the `!brightcal-api-lib` negative dependency workaround can eventually be removed.

#### Acceptance Criteria

1. THE IAppSubsystemPlugin interface SHALL reside in `brightchain-lib`, which both `brightchain-api-lib` and `brightcal-api-lib` already depend on, so that `brightcal-api-lib` can implement the interface without importing from `brightchain-api-lib`.
2. THE BrightCalSubsystemPlugin in `brightcal-api-lib` SHALL depend only on `brightchain-lib` (for the interface and shared types) and `brightcal-lib` (for calendar-specific types), not on `brightchain-api-lib`.
3. THE App class in `brightchain-api-lib` SHALL accept the BrightCalSubsystemPlugin via dynamic import or external registration, so that no compile-time import from `brightcal-api-lib` exists in `brightchain-api-lib` source code.
