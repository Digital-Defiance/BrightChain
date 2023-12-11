# Bugfix Requirements Document

## Introduction

Multiple subsystems across the BrightChain platform store persistent data in locations that are invisible to admin controllers and that do not survive application restarts. The fundamental problem is architectural: services write data to private in-memory stores (plain `Map` objects, a standalone in-memory `BlockDocumentStore`, or an `InMemoryEmailMetadataStore`) while admin controllers query BrightDb collections and find nothing. The user's directive is clear: "no more separate in-memory stores — we're either in memory or we're not, it should follow the env setup config options." BrightChat should be using BrightDb services, and so should BrightPass. There should be ONE document store handle determined by environment configuration (`DEV_DATABASE` → in-memory BrightDb, Azure/S3/Disk → persistent BrightDb). No service should maintain its own separate in-memory Maps for persistent data.

This document covers all five affected areas: the standalone `_brightchainDocumentStore`, BrightHub's `getModel()` fallback, BrightChat's in-memory Maps, BrightPass's in-memory Maps, and BrightMail's `InMemoryEmailMetadataStore`.

## Bug Analysis

### Current Behavior (Defect)

#### The standalone in-memory store should not exist

1.1 WHEN the `App` constructor executes THEN the system unconditionally creates a separate in-memory `BlockDocumentStore` via `createBlockDocumentStore({ useMemory: true, blockSize: BlockSize.Medium })` as `_brightchainDocumentStore`, regardless of the configured `blockStoreType` environment setting, creating a second store that diverges from the plugin's BrightDb

1.2 WHEN `App.db` getter is called after the plugin is connected THEN the system correctly returns the plugin's `BrightDbDocumentStoreAdapter`, but the `_brightchainDocumentStore` still exists as a separate store that `getModel()` falls through to

#### BrightHub — getModel() fallback to wrong store

1.3 WHEN a BrightHub service (PostService, FeedService, ThreadService, MessagingService, NotificationService, ConnectionService, DiscoveryService, UserProfileService) calls `app.getModel(collectionName)` for a collection that has no registered Model (e.g. `brighthub_posts`, `brighthub_conversations`, `brighthub_messages`, `brighthub_likes`, `brighthub_follows`) THEN the system returns a collection from the in-memory `_brightchainDocumentStore` instead of the plugin's real BrightDb store

1.4 WHEN `App.getModel()` is called and `_plugin.brightDb.hasModel(modelName)` returns false THEN the system falls through to `this._brightchainDocumentStore.collection(modelName)` — the standalone in-memory store — instead of delegating to `this.db.collection(modelName)` which would use the plugin's `BrightDbDocumentStoreAdapter`

1.5 WHEN an admin controller (AdminHubController) queries data via `services.get('db')` which returns `_plugin.brightDb` and calls `brightDb.collection('brighthub_posts')` THEN the system reads from the real BrightDb store, which contains none of the data written by BrightHub services through the in-memory store

#### BrightChat — in-memory Maps, not BrightDb

1.6 WHEN `ConversationService` (in `brightchain-lib`) stores conversations and messages THEN the system writes to plain `Map<string, IConversation>` and `Map<string, ICommunicationMessage[]>` objects that exist only in process memory, with no persistence to BrightDb

1.7 WHEN `GroupService` (in `brightchain-lib`) stores groups and group messages THEN the system writes to plain `Map<string, IGroup>` and `Map<string, ICommunicationMessage[]>` objects that exist only in process memory, with no persistence to BrightDb

1.8 WHEN `ChannelService` (in `brightchain-lib`) stores channels, channel messages, and invite tokens THEN the system writes to plain `Map<string, IChannel>`, `Map<string, ICommunicationMessage[]>`, and `Map<string, IInviteToken>` objects that exist only in process memory, with no persistence to BrightDb

1.9 WHEN `AdminChatController` queries conversations via `brightDb.collection('conversations')` and messages via `brightDb.collection('messages')` THEN the system reads from BrightDb collections that nothing writes to, returning zero results even when BrightChat services have active data in memory

1.10 WHEN the application restarts THEN all BrightChat conversations, messages, groups, channels, and invite tokens are lost because they exist only in in-memory Maps with no persistence layer

#### BrightPass — in-memory Maps for vault metadata

1.11 WHEN `BrightPassService` (in `brightchain-api-lib`) stores vault metadata THEN the system writes to plain `Map<string, StoredVault>` (`vaults`), `Map<string, VaultIndexEntry>` (`vaultIndex`), and `Map<string, Set<string>>` (`memberVaults`) objects that exist only in process memory, with no persistence of vault index/metadata to BrightDb

1.12 WHEN `AdminPassController` queries vaults via `brightDb.collection('vaults')` THEN the system reads from a BrightDb collection that nothing writes to, returning zero results even when BrightPass has active vaults in memory

1.13 WHEN the application restarts THEN all BrightPass vault index metadata (owner, name, shared-with, timestamps) is lost because it exists only in in-memory Maps, even though encrypted entry data may persist in the block store

#### BrightMail — InMemoryEmailMetadataStore, not BrightDb

1.14 WHEN `MessagePassingService` configures email with `InMemoryEmailMetadataStore` THEN the system stores all email metadata in a plain `Map<string, IEmailMetadata>`, read tracking in a `Set<string>`, and attachment contents in a `Map<string, Uint8Array>` — none of which persist to BrightDb

1.15 WHEN `AdminMailController` queries emails via `brightDb.collection('emails')` THEN the system reads from a BrightDb collection that nothing writes to, returning zero results even when the email subsystem has received and stored emails in memory

1.16 WHEN the application restarts THEN all email metadata, read receipts, and attachment contents are lost because they exist only in the `InMemoryEmailMetadataStore` Maps

#### Admin controller collection name mismatches

1.17 WHEN `AdminChatController` queries `brightDb.collection('conversations')` and `brightDb.collection('messages')` THEN the collection names do not match the prefixed names that BrightHub's `MessagingService` uses (`brighthub_conversations`, `brighthub_messages`) or that BrightChat services would use if migrated to BrightDb

1.18 WHEN `AdminPassController` queries `brightDb.collection('vaults')` THEN the collection name does not match any collection name that BrightPass would use if migrated to BrightDb (service would use a prefixed name like `brightpass_vaults`)

1.19 WHEN `AdminMailController` queries `brightDb.collection('emails')` THEN the collection name does not match any collection name that BrightMail would use if migrated to BrightDb (service would use a prefixed name like `brightmail_emails`)

### Expected Behavior (Correct)

#### Single store handle determined by environment config

2.1 WHEN the `App` class initializes THEN the system SHALL NOT create a separate in-memory `BlockDocumentStore` that diverges from the plugin's BrightDb store; the single BrightDb instance provided by `BrightChainDatabasePlugin` (which selects in-memory, Azure, S3, or Disk based on environment config) SHALL be the only document store

2.2 WHEN any service or controller needs to persist or query data THEN the system SHALL route all persistence through the single BrightDb instance, ensuring one unified data path regardless of whether the environment is dev (in-memory) or production (persistent)

#### BrightHub — getModel() falls through to plugin's BrightDb

2.3 WHEN a BrightHub service calls `app.getModel(collectionName)` for a collection that has no registered Model THEN the system SHALL return a collection from the plugin's `BrightDbDocumentStoreAdapter` (which wraps the real BrightDb instance), so that all data goes through the same store that admin controllers use

2.4 WHEN `App.getModel()` is called and no registered Model exists for the given name THEN the system SHALL fall through to `this.db.collection(modelName)` to obtain the collection, ensuring a single unified data path

2.5 WHEN an admin controller queries data via `services.get('db')` THEN the system SHALL return data from the same underlying BrightDb instance that BrightHub services write to, ensuring both paths see the same data

#### BrightChat — backed by BrightDb collections

2.6 WHEN `ConversationService` stores or retrieves conversations and messages THEN the system SHALL persist data to BrightDb collections (e.g. `brightchat_conversations`, `brightchat_messages`) instead of plain in-memory Maps, using the BrightDb service infrastructure

2.7 WHEN `GroupService` stores or retrieves groups and group messages THEN the system SHALL persist data to BrightDb collections (e.g. `brightchat_groups`, `brightchat_group_messages`) instead of plain in-memory Maps

2.8 WHEN `ChannelService` stores or retrieves channels, channel messages, and invite tokens THEN the system SHALL persist data to BrightDb collections (e.g. `brightchat_channels`, `brightchat_channel_messages`, `brightchat_invite_tokens`) instead of plain in-memory Maps

2.9 WHEN `AdminChatController` queries conversations and messages THEN the system SHALL use collection names that match the ones BrightChat services write to (e.g. `brightchat_conversations`, `brightchat_messages`), ensuring admin queries return the same data that services store

#### BrightPass — vault index backed by BrightDb

2.10 WHEN `BrightPassService` stores or retrieves vault index metadata (owner, name, shared-with, timestamps) THEN the system SHALL persist this metadata to a BrightDb collection (e.g. `brightpass_vaults`) instead of plain in-memory Maps, while encrypted entry data continues to use the block store

2.11 WHEN `AdminPassController` queries vaults THEN the system SHALL use the collection name that matches the one BrightPass writes to (e.g. `brightpass_vaults`), ensuring admin queries return the same vault metadata that the service stores

#### BrightMail — email metadata backed by BrightDb

2.12 WHEN `MessagePassingService` and `EmailMessageService` store or retrieve email metadata THEN the system SHALL persist email metadata to a BrightDb collection (e.g. `brightmail_emails`) via a BrightDb-backed implementation of `IEmailMetadataStore`, instead of the `InMemoryEmailMetadataStore`

2.13 WHEN `AdminMailController` queries emails THEN the system SHALL use the collection name that matches the one BrightMail writes to (e.g. `brightmail_emails`), ensuring admin queries return the same email metadata that the service stores

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `App.getModel()` is called for a collection that HAS a registered Model (e.g. `roles`, `users`, `user_roles`, `mnemonics`) THEN the system SHALL CONTINUE TO return the registered Model from `_plugin.brightDb.model(modelName)`

3.2 WHEN the environment has `DEV_DATABASE` set (dev mode) THEN the system SHALL CONTINUE TO use an in-memory `MemoryBlockStore` as the backing store for the single BrightDb instance (created by `brightchainDatabaseInit`), so dev mode remains ephemeral but through the unified BrightDb path

3.3 WHEN the environment has `blockStoreType` set to `AzureBlob`, `S3`, or `Disk` (production modes) THEN the system SHALL CONTINUE TO use the corresponding cloud or disk-backed block store for the single BrightDb instance

3.4 WHEN BrightHub services use `wrapCollection(app.getModel(name))` THEN the `CollectionAdapter` SHALL CONTINUE TO bridge the BrightDb collection API to the `BrightHubCollection<T>` interface expected by services

3.5 WHEN `App.db` getter is called before the plugin is connected THEN the system SHALL CONTINUE TO return a functional document store (pre-connection fallback) so that early callers do not crash

3.6 WHEN admin controllers call `this.application.services.get('db') as BrightDb` THEN the system SHALL CONTINUE TO return the real BrightDb instance with full collection access (countDocuments, find, updateOne, etc.)

3.7 WHEN BrightPass encrypts and stores vault entry data in the block store THEN the system SHALL CONTINUE TO use the block store for encrypted entry blobs — only vault index/metadata moves to BrightDb

3.8 WHEN BrightChat services perform symmetric key encryption for group/channel messages THEN the system SHALL CONTINUE TO use the existing key encryption handlers — only the data storage layer changes from Maps to BrightDb collections

3.9 WHEN BrightMail processes incoming SMTP email via the Postfix integration THEN the system SHALL CONTINUE TO parse and store email metadata through the same `MessagePassingService.configureEmail()` pipeline — only the backing store implementation changes from `InMemoryEmailMetadataStore` to a BrightDb-backed implementation

3.10 WHEN the `ConversationService`, `GroupService`, or `ChannelService` public APIs are called by controllers or other services THEN the system SHALL CONTINUE TO expose the same public method signatures and return types — only the internal storage mechanism changes

3.11 WHEN the `IEmailMetadataStore` interface is used by `EmailMessageService` THEN the system SHALL CONTINUE TO satisfy the same interface contract — only the concrete implementation changes from in-memory to BrightDb-backed
