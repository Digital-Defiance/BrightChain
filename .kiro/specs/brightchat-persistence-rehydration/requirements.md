# Requirements Document

## Introduction

BrightChat communication services (ConversationService, GroupService, ChannelService, ServerService) maintain in-memory Maps for all runtime data — conversations, groups, channels, servers, messages, invite tokens, and key epoch states. These services support an optional `IChatStorageProvider` for write-through persistence to BrightDB, but they never reload persisted data on startup. After a server restart, all in-memory state is lost and users encounter "not found" errors for previously created entities.

This feature adds startup rehydration: when an `IChatStorageProvider` is present, each service loads its persisted collections back into the in-memory Maps during initialization, restoring full operational state without affecting the no-storage-provider path used by unit tests.

## Glossary

- **Rehydration_Service**: The logic within each communication service (ConversationService, GroupService, ChannelService, ServerService) responsible for loading persisted data from BrightDB collections into in-memory Maps during initialization.
- **IChatStorageProvider**: The storage abstraction interface providing typed `IChatCollection<T>` accessors for all BrightChat entity types (conversations, messages, groups, groupMessages, channels, channelMessages, inviteTokens, servers, serverInvites).
- **IChatCollection**: The async CRUD collection interface with `create`, `findById`, `findMany`, `update`, and `delete` operations.
- **In_Memory_Maps**: The private `Map` and `Set` instances within each service that hold runtime state (e.g., `channels: Map<string, IChannel>`, `messages: Map<string, ICommunicationMessage[]>`).
- **Key_Epoch_State**: The `IKeyEpochState<string>` structure tracking versioned symmetric encryption keys per communication context, with `currentEpoch`, `epochKeys`, and `encryptedEpochKeys` maps.
- **Write_Through_Persistence**: The existing pattern where services write to both in-memory Maps and the storage provider on every mutation.
- **Participant_Index**: The `Map<string, string>` in ConversationService mapping sorted participant pair keys ("memberA:memberB") to conversation IDs for deduplication.
- **Name_Index**: The `Map<string, string>` in ChannelService mapping lowercase channel names to channel IDs for uniqueness enforcement.
- **Init_Method**: An explicit asynchronous initialization method (`init()`) that services expose for rehydration, since constructors cannot be async.

## Requirements

### Requirement 1: Async Initialization Method

**User Story:** As a service consumer, I want each communication service to expose an async `init()` method, so that persisted data can be loaded before the service handles requests.

#### Acceptance Criteria

1. THE ConversationService SHALL expose a public async `init()` method that returns a Promise<void>.
2. THE GroupService SHALL expose a public async `init()` method that returns a Promise<void>.
3. THE ChannelService SHALL expose a public async `init()` method that returns a Promise<void>.
4. THE ServerService SHALL expose a public async `init()` method that returns a Promise<void>.
5. WHEN no IChatStorageProvider was provided at construction time, THE Rehydration_Service SHALL return immediately from `init()` without performing any storage operations.
6. WHEN `init()` is called multiple times, THE Rehydration_Service SHALL only perform rehydration on the first call and return immediately on subsequent calls.

### Requirement 2: Conversation Rehydration

**User Story:** As a user, I want my direct message conversations and messages to survive server restarts, so that I do not lose conversation history.

#### Acceptance Criteria

1. WHEN `init()` is called and an IChatStorageProvider is present, THE ConversationService SHALL load all documents from `storageProvider.conversations` via `findMany()` into the `conversations` Map keyed by conversation ID.
2. WHEN `init()` is called and an IChatStorageProvider is present, THE ConversationService SHALL load all documents from `storageProvider.messages` via `findMany()` into the `messages` Map, grouping messages by their `contextId` field.
3. WHEN conversations are loaded, THE ConversationService SHALL rebuild the Participant_Index by computing the sorted participant pair key for each conversation and mapping it to the conversation ID.
4. WHEN conversations are loaded, THE ConversationService SHALL reconstruct Key_Epoch_State for each conversation from the `encryptedSharedKey` map stored on the IConversation entity.
5. WHEN messages are grouped by contextId, THE ConversationService SHALL sort each message array by `createdAt` in ascending order to maintain chronological ordering.

### Requirement 3: Group Rehydration

**User Story:** As a user, I want my group chats and group messages to survive server restarts, so that I do not lose group conversation history.

#### Acceptance Criteria

1. WHEN `init()` is called and an IChatStorageProvider is present, THE GroupService SHALL load all documents from `storageProvider.groups` via `findMany()` into the `groups` Map keyed by group ID.
2. WHEN `init()` is called and an IChatStorageProvider is present, THE GroupService SHALL load all documents from `storageProvider.groupMessages` via `findMany()` into the `messages` Map, grouping messages by their `contextId` field.
3. WHEN groups are loaded, THE GroupService SHALL reconstruct Key_Epoch_State for each group from the `encryptedSharedKey` map stored on the IGroup entity.
4. WHEN group messages are grouped by contextId, THE GroupService SHALL sort each message array by `createdAt` in ascending order to maintain chronological ordering.
5. WHEN groups are loaded, THE GroupService SHALL register permissions for each group member via the PermissionService so that permission checks function correctly after rehydration.

### Requirement 4: Channel Rehydration

**User Story:** As a user, I want channels, channel messages, and invite tokens to survive server restarts, so that I can continue using previously created channels.

#### Acceptance Criteria

1. WHEN `init()` is called and an IChatStorageProvider is present, THE ChannelService SHALL load all documents from `storageProvider.channels` via `findMany()` into the `channels` Map keyed by channel ID.
2. WHEN `init()` is called and an IChatStorageProvider is present, THE ChannelService SHALL load all documents from `storageProvider.channelMessages` via `findMany()` into the `messages` Map, grouping messages by their `contextId` field.
3. WHEN `init()` is called and an IChatStorageProvider is present, THE ChannelService SHALL load all documents from `storageProvider.inviteTokens` via `findMany()` into the `inviteTokens` Map keyed by token string.
4. WHEN channels are loaded, THE ChannelService SHALL rebuild the Name_Index by mapping each channel's lowercase name to its channel ID.
5. WHEN channels are loaded, THE ChannelService SHALL reconstruct Key_Epoch_State for each channel from the `encryptedSharedKey` map stored on the IChannel entity.
6. WHEN channel messages are grouped by contextId, THE ChannelService SHALL sort each message array by `createdAt` in ascending order to maintain chronological ordering.
7. WHEN channels are loaded, THE ChannelService SHALL register permissions for each channel member via the PermissionService so that permission checks function correctly after rehydration.

### Requirement 5: Server Rehydration

**User Story:** As a user, I want servers and server invite tokens to survive server restarts, so that server membership and structure are preserved.

#### Acceptance Criteria

1. WHEN `init()` is called and an IChatStorageProvider is present, THE ServerService SHALL load all documents from `storageProvider.servers` via `findMany()` into the `servers` Map keyed by server ID.
2. WHEN `init()` is called and an IChatStorageProvider is present, THE ServerService SHALL load all documents from `storageProvider.serverInvites` via `findMany()` into the `serverInviteTokens` Map keyed by token string.

### Requirement 6: Key Epoch State Reconstruction

**User Story:** As a developer, I want key epoch states to be faithfully reconstructed from persisted `encryptedSharedKey` maps, so that message encryption and decryption continue to work after restart.

#### Acceptance Criteria

1. WHEN reconstructing Key_Epoch_State from an entity's `encryptedSharedKey` map, THE Rehydration_Service SHALL set `currentEpoch` to the highest epoch number present in the `encryptedSharedKey` map.
2. WHEN reconstructing Key_Epoch_State, THE Rehydration_Service SHALL populate the `encryptedEpochKeys` field with all epoch-to-member-key mappings from the `encryptedSharedKey` map.
3. WHEN reconstructing Key_Epoch_State, THE Rehydration_Service SHALL leave the `epochKeys` map (raw symmetric keys) empty, because raw keys are not persisted and are only available in-memory during the session that created them.
4. FOR ALL reconstructed Key_Epoch_State instances, THE Rehydration_Service SHALL store them in the service's `keyEpochStates` Map keyed by the entity ID (conversation ID, group ID, or channel ID).

### Requirement 7: Backward Compatibility

**User Story:** As a developer running unit tests, I want services without an IChatStorageProvider to behave identically to the current implementation, so that existing tests pass without modification.

#### Acceptance Criteria

1. WHEN no IChatStorageProvider is provided at construction time, THE ConversationService SHALL operate with empty In_Memory_Maps and perform no storage operations, matching current behavior.
2. WHEN no IChatStorageProvider is provided at construction time, THE GroupService SHALL operate with empty In_Memory_Maps and perform no storage operations, matching current behavior.
3. WHEN no IChatStorageProvider is provided at construction time, THE ChannelService SHALL operate with empty In_Memory_Maps and perform no storage operations, matching current behavior.
4. WHEN no IChatStorageProvider is provided at construction time, THE ServerService SHALL operate with empty In_Memory_Maps and perform no storage operations, matching current behavior.
5. WHEN `init()` is not called on a service, THE service SHALL operate with empty In_Memory_Maps, matching current behavior.

### Requirement 8: Rehydration Error Handling

**User Story:** As a service operator, I want rehydration failures to be handled gracefully, so that a corrupt or unavailable storage backend does not prevent the service from starting.

#### Acceptance Criteria

1. IF a storage collection's `findMany()` call throws an error during rehydration, THEN THE Rehydration_Service SHALL log the error with sufficient context (service name, collection name, error message).
2. IF a storage collection's `findMany()` call throws an error during rehydration, THEN THE Rehydration_Service SHALL propagate the error to the `init()` caller so the application can decide whether to proceed or abort.
3. IF a loaded entity has a malformed or missing `encryptedSharedKey` map, THEN THE Rehydration_Service SHALL skip Key_Epoch_State reconstruction for that entity and log a warning.

### Requirement 9: Rehydration Completeness Invariant

**User Story:** As a developer, I want a guarantee that after successful rehydration the in-memory state matches the persisted state, so that the service behaves as if no restart occurred.

#### Acceptance Criteria

1. FOR ALL entities returned by `findMany()` on a storage collection, THE Rehydration_Service SHALL insert each entity into the corresponding In_Memory_Map such that the Map's size equals the number of entities returned.
2. FOR ALL conversations loaded during rehydration, THE ConversationService SHALL ensure the Participant_Index contains an entry for each conversation, and the index size equals the number of loaded conversations.
3. FOR ALL channels loaded during rehydration, THE ChannelService SHALL ensure the Name_Index contains an entry for each channel, and the index size equals the number of loaded channels.
4. FOR ALL messages loaded during rehydration, THE Rehydration_Service SHALL ensure that the total count of messages across all message Map entries equals the total number of message documents returned by `findMany()`.
