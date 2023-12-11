# Implementation Plan: BrightChat Persistence Rehydration

## Overview

Add startup rehydration to ConversationService, GroupService, ChannelService, and ServerService. Each service gets an async `init()` method that loads persisted entities from `IChatStorageProvider` collections back into in-memory Maps, rebuilds derived indexes, reconstructs key epoch states, and registers permissions. Shared helpers handle message grouping/sorting and key epoch reconstruction. All code lives in `brightchain-lib/src/lib/services/communication/`.

## Tasks

- [x] 1. Create shared rehydration helper utilities
  - [x] 1.1 Create `rehydrationHelpers.ts` in `brightchain-lib/src/lib/services/communication/`
    - Implement `reconstructKeyEpochState(encryptedSharedKey)` that returns `IKeyEpochState<string>` with `currentEpoch` set to max epoch, `encryptedEpochKeys` set to the input map, and `epochKeys` empty
    - Handle null/undefined/non-Map `encryptedSharedKey` by returning `undefined` and logging a warning
    - Implement `groupAndSortMessages(messages)` that groups `ICommunicationMessage[]` by `contextId` and sorts each group by `createdAt` ascending
    - Export both functions
    - _Requirements: 6.1, 6.2, 6.3, 2.5, 3.4, 4.6_

  - [x] 1.2 Write property test for `reconstructKeyEpochState`
    - **Property 4: Key epoch state reconstruction round-trip**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 2.4, 3.3, 4.5**

  - [x] 1.3 Write property test for `groupAndSortMessages`
    - **Property 2: Message grouping and count preservation**
    - **Validates: Requirements 2.2, 3.2, 4.2, 9.4**

  - [x] 1.4 Write property test for message chronological ordering
    - **Property 3: Message chronological ordering**
    - **Validates: Requirements 2.5, 3.4, 4.6**

- [x] 2. Implement ConversationService.init()
  - [x] 2.1 Add `private initialized = false` field and public async `init()` method to `ConversationService`
    - Guard: return early if `initialized` is true or no storage provider
    - Set `initialized = true` before loading
    - Load conversations from `conversationCollection.findMany()` into `this.conversations` keyed by `id`
    - Rebuild `this.participantIndex` using `participantKey()` for each conversation
    - Reconstruct `IKeyEpochState` for each conversation using `reconstructKeyEpochState` and store in `this.keyEpochStates`
    - Load messages from `messageCollection.findMany()` using `groupAndSortMessages` and store in `this.messages`
    - Wrap each `findMany()` in try/catch: log error with context (service name, collection name), then re-throw
    - Skip epoch reconstruction for entities with malformed `encryptedSharedKey`, log warning
    - _Requirements: 1.1, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 9.1, 9.2_

  - [x] 2.2 Write property test for ConversationService entity rehydration
    - **Property 1: Entity rehydration completeness** (conversation subset)
    - **Validates: Requirements 2.1, 9.1**

  - [x] 2.3 Write property test for ConversationService participant index
    - **Property 5: Participant index completeness**
    - **Validates: Requirements 2.3, 9.2**

  - [x] 2.4 Write unit tests for ConversationService.init()
    - Test init with no storage provider returns immediately, maps empty
    - Test init idempotence (second call is no-op)
    - Test findMany error is logged and propagated
    - Test malformed encryptedSharedKey logs warning and skips epoch
    - _Requirements: 1.1, 1.5, 1.6, 7.1, 8.1, 8.2, 8.3_

- [x] 3. Implement GroupService.init()
  - [x] 3.1 Add `private initialized = false` field and public async `init()` method to `GroupService`
    - Guard: return early if `initialized` is true or no storage provider
    - Set `initialized = true` before loading
    - Load groups from `groupCollection.findMany()` into `this.groups` keyed by `id`
    - Reconstruct `IKeyEpochState` for each group using `reconstructKeyEpochState` and store in `this.keyEpochStates`
    - Register permissions for each member in each group via `this.permissionService.assignRole()`
    - Load messages from `groupMessageCollection.findMany()` using `groupAndSortMessages` and store in `this.messages`
    - Wrap each `findMany()` in try/catch: log error with context, then re-throw
    - Skip epoch reconstruction for entities with malformed `encryptedSharedKey`, log warning
    - _Requirements: 1.2, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 9.1, 9.4_

  - [x] 3.2 Write property test for GroupService entity rehydration
    - **Property 1: Entity rehydration completeness** (group subset)
    - **Validates: Requirements 3.1, 9.1**

  - [x] 3.3 Write property test for GroupService permission registration
    - **Property 7: Permission registration completeness**
    - **Validates: Requirements 3.5, 4.7**

  - [x] 3.4 Write unit tests for GroupService.init()
    - Test init with no storage provider returns immediately, maps empty
    - Test init idempotence
    - Test findMany error is logged and propagated
    - Test malformed encryptedSharedKey logs warning and skips epoch
    - _Requirements: 1.2, 1.5, 1.6, 7.2, 8.1, 8.2, 8.3_

- [x] 4. Checkpoint - Verify conversation and group rehydration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ChannelService.init()
  - [x] 5.1 Add `private initialized = false` field and public async `init()` method to `ChannelService`
    - Guard: return early if `initialized` is true or no storage provider
    - Set `initialized = true` before loading
    - Load channels from `channelCollection.findMany()` into `this.channels` keyed by `id`
    - Rebuild `this.nameIndex` by mapping each channel's lowercase name to its channel ID
    - Reconstruct `IKeyEpochState` for each channel using `reconstructKeyEpochState` and store in `this.keyEpochStates`
    - Register permissions for each member in each channel via `this.permissionService.assignRole()`
    - Load messages from `channelMessageCollection.findMany()` using `groupAndSortMessages` and store in `this.messages`
    - Load invite tokens from `inviteTokenCollection.findMany()` into `this.inviteTokens` keyed by `token`
    - Wrap each `findMany()` in try/catch: log error with context, then re-throw
    - Skip epoch reconstruction for entities with malformed `encryptedSharedKey`, log warning
    - _Requirements: 1.3, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 9.1, 9.3, 9.4_

  - [x] 5.2 Write property test for ChannelService entity rehydration
    - **Property 1: Entity rehydration completeness** (channel subset)
    - **Validates: Requirements 4.1, 4.3, 9.1**

  - [x] 5.3 Write property test for ChannelService name index
    - **Property 6: Channel name index completeness**
    - **Validates: Requirements 4.4, 9.3**

  - [x] 5.4 Write unit tests for ChannelService.init()
    - Test init with no storage provider returns immediately, maps empty
    - Test init idempotence
    - Test findMany error is logged and propagated
    - Test malformed encryptedSharedKey logs warning and skips epoch
    - _Requirements: 1.3, 1.5, 1.6, 7.3, 8.1, 8.2, 8.3_

- [x] 6. Implement ServerService.init()
  - [x] 6.1 Add `private initialized = false` field and public async `init()` method to `ServerService`
    - Guard: return early if `initialized` is true or no storage provider
    - Set `initialized = true` before loading
    - Load servers from `serverCollection.findMany()` into `this.servers` keyed by `id`
    - Load server invites from `serverInviteCollection.findMany()` into `this.serverInviteTokens` keyed by `token`
    - Wrap each `findMany()` in try/catch: log error with context, then re-throw
    - No key epoch state or permission registration needed
    - _Requirements: 1.4, 1.5, 1.6, 5.1, 5.2, 8.1, 8.2, 9.1_

  - [x] 6.2 Write property test for ServerService entity rehydration
    - **Property 1: Entity rehydration completeness** (server subset)
    - **Validates: Requirements 5.1, 5.2, 9.1**

  - [x] 6.3 Write unit tests for ServerService.init()
    - Test init with no storage provider returns immediately, maps empty
    - Test init idempotence
    - Test findMany error is logged and propagated
    - _Requirements: 1.4, 1.5, 1.6, 7.4, 8.1, 8.2_

- [x] 7. Checkpoint - Verify channel and server rehydration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Cross-cutting property tests
  - [x] 8.1 Write property test for init idempotence
    - **Property 8: Init idempotence**
    - Test on all four services: calling `init()` N times produces same state as calling once
    - **Validates: Requirements 1.6**

  - [x] 8.2 Write property test for no-provider init
    - **Property 9: No-provider init is a no-op**
    - Test on all four services: init without storage provider leaves maps empty
    - **Validates: Requirements 1.5, 7.1, 7.2, 7.3, 7.4, 7.5**

  - [x] 8.3 Write property test for storage error propagation
    - **Property 10: Storage error propagation**
    - Test that findMany errors are propagated through init rejection
    - **Validates: Requirements 8.2**

- [x] 9. Create mock storage provider for tests
  - [x] 9.1 Create `mockChatStorageProvider.ts` test helper in the communication test directory
    - Implement in-memory `IChatStorageProvider` backed by arrays
    - Each `IChatCollection<T>` backed by `T[]` with `findMany()` returning the full array
    - Support configurable `findMany()` to throw errors for error-propagation tests
    - Create fast-check arbitraries: `arbConversation`, `arbGroup`, `arbChannel`, `arbServer`, `arbMessage`, `arbInviteToken`, `arbServerInviteToken`, `arbEncryptedSharedKey`
    - _Requirements: all (test infrastructure)_

- [x] 10. Final checkpoint - Full test suite verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Shared helpers (`rehydrationHelpers.ts`) are created first since all four services depend on them
- The mock storage provider (task 9) can be created in parallel with or before the property tests
- Property tests use `fast-check` and the mock storage provider
- All code lives in `brightchain-lib` since these are shared service interfaces
