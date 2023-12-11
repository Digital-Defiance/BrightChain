# BrightChat Block Storage Bugfix Design

## Overview

The BrightChat communication services (`ConversationService`, `GroupService`, `ChannelService`) store full message content directly in BrightDB via `IChatStorageProvider`, bypassing the block-based storage architecture. The correct pattern — storing content as blocks via `MessageCBLService`, distributing via `GossipService`, and persisting only metadata/block references to BrightDB — already exists in `MessagePassingService.sendMessage()`. This fix introduces a platform-agnostic `IBlockContentStore` abstraction in `brightchain-lib` that the communication services can use, with a concrete implementation in `brightchain-api-lib` that delegates to `MessageCBLService` and `GossipService`. Admin controllers are also updated to retrieve content from the block store instead of querying BrightDB directly.

## Glossary

- **Bug_Condition (C)**: Any `sendMessage()` call in `ConversationService`, `GroupService`, or `ChannelService`, or any admin controller message retrieval/deletion — all of which currently store or read full content in BrightDB instead of using block storage
- **Property (P)**: Message content SHALL be stored as blocks via `MessageCBLService`, distributed via `GossipService`, with only a magnet URL / block reference persisted in `ICommunicationMessage.encryptedContent`; content retrieval SHALL go through the block store
- **Preservation**: All non-message-content operations (conversation/group/channel metadata CRUD, membership, key rotation, permissions, events, pagination, invite tokens, server management) SHALL continue to function identically
- **ICommunicationMessage**: The shared message interface in `brightchain-lib/src/lib/interfaces/communication.ts` — `encryptedContent: TData` currently holds raw content; after fix, holds a magnet URL / block reference string
- **IBlockContentStore**: New platform-agnostic interface in `brightchain-lib` abstracting block storage operations (store content → returns reference, retrieve content by reference, delete content by reference)
- **MessageCBLService**: Existing service in `brightchain-lib` that stores content as blocks in the Owner-Free Filesystem and returns a `messageId` (magnet URL)
- **GossipService**: Existing service implementing `IGossipService` that announces blocks for decentralized distribution
- **IChatStorageProvider**: Existing interface providing BrightDB-backed collections for metadata persistence (conversations, groups, channels, messages)
- **ChatCollectionAdapter**: BrightDB adapter implementing `IChatCollection<T>` — continues to store message metadata records, but `encryptedContent` field now contains a block reference instead of raw content

## Bug Details

### Bug Condition

The bug manifests when any BrightChat communication service sends a message or when admin controllers retrieve/delete messages. The services store full encrypted message content as a string directly in BrightDB via `IChatStorageProvider`, and admin controllers read content directly from BrightDB collections. This bypasses the block-based storage architecture that `MessagePassingService.sendMessage()` correctly implements.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { operation: string, service: string, args: any }
  OUTPUT: boolean

  RETURN (input.operation == 'sendMessage'
          AND input.service IN ['ConversationService', 'GroupService', 'ChannelService'])
         OR (input.operation == 'editMessage'
             AND input.service IN ['GroupService', 'ChannelService'])
         OR (input.operation IN ['handleListMessages', 'handleDeleteMessage']
             AND input.service == 'AdminChatController')
END FUNCTION
```

### Examples

- **ConversationService.sendMessage("alice", "bob", "Hello!")**: Creates `ICommunicationMessage` with `encryptedContent: "Hello!"` and persists the full string to `brightchat_messages` in BrightDB. Expected: content stored as blocks via `MessageCBLService`, `encryptedContent` set to the returned magnet URL, gossip announcement sent.
- **GroupService.sendMessage(groupId, senderId, "Meeting at 3pm")**: Stores `"Meeting at 3pm"` directly in `brightchat_group_messages`. Expected: content stored as blocks, only magnet URL in BrightDB record.
- **ChannelService.sendMessage(channelId, senderId, "Announcement")**: Stores `"Announcement"` directly in `brightchat_channel_messages`. Expected: content stored as blocks, only magnet URL in BrightDB record.
- **ChannelService.searchMessages(channelId, memberId, "keyword")**: Searches `encryptedContent` string directly with `.includes()`. Expected: search must retrieve content from block store or use a search index — cannot search raw content that is no longer stored in BrightDB.
- **AdminChatController.handleListMessages()**: Reads `doc['content']` from BrightDB and returns `contentPreview`. Expected: reads metadata from BrightDB, retrieves content from block store via `IBlockContentStore`.
- **AdminChatController.handleDeleteMessage()**: Only soft-deletes BrightDB record. Expected: also cleans up content blocks from the block store.
- **GroupService.editMessage(groupId, msgId, memberId, "Updated text")**: Directly overwrites `encryptedContent` in the in-memory message. Expected: creates a new block for the updated content, updates the block reference.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Conversation metadata CRUD (creation, participant tracking, `lastMessageAt` updates) via `IChatStorageProvider.conversations`
- Group metadata CRUD (creation, membership, key rotation, roles, pinned messages) via `IChatStorageProvider.groups`
- Channel metadata CRUD (creation, visibility, invites, membership, topic) via `IChatStorageProvider.channels`
- `MessagePassingService.sendMessage()` for the email system continues using `MessageCBLService` + `GossipService` as-is
- Epoch-aware key management (key rotation on member join/leave/kick) for all three service types
- Message metadata operations (pin, unpin, reactions, soft-delete flag) persisted to BrightDB
- `AdminChatServersController` server/channel/member metadata operations (no message content involved)
- Cursor-based pagination interface (`IPaginatedResult<ICommunicationMessage>`)
- `IChatStorageProvider` and `ChatCollectionAdapter` continue providing `IChatCollection<T>` for metadata
- WebSocket events emitted via `ICommunicationEventEmitter` for all message operations

**Scope:**
All inputs that do NOT involve message content storage or retrieval should be completely unaffected by this fix. This includes:
- All metadata-only operations (create/update/delete conversations, groups, channels, servers)
- Membership operations (join, leave, kick, mute, add members)
- Key management operations (epoch rotation, key wrapping)
- Permission checks and role assignments
- Invite token creation and redemption
- Event emission
- Pagination mechanics

## Hypothesized Root Cause

Based on the codebase analysis, the root causes are:

1. **Missing Block Store Abstraction**: The communication services live in `brightchain-lib` (platform-agnostic), but `MessageCBLService` requires a block store (`IBlockStore`) which is Node.js-specific. No platform-agnostic abstraction exists for the services to call. The services were implemented with direct content storage as a shortcut.

2. **Direct Content Assignment in sendMessage()**: All three services construct `ICommunicationMessage` with `encryptedContent: content` (the raw string), then persist the entire object to BrightDB. There is no step that converts content to blocks and replaces the field with a reference. See `ConversationService.sendMessage()` line ~280, `GroupService.sendMessage()` line ~290, `ChannelService.sendMessage()` line ~530.

3. **No GossipService Integration**: The communication services have no dependency on `IGossipService` and never call `announceMessage()`. The `application.ts` wiring creates the services without injecting any gossip capability.

4. **Admin Controllers Bypass Services**: `AdminChatController` queries BrightDB collections directly (`brightDb.collection('brightchat_messages')`) and reads `doc['content']` as raw content. It has no reference to `MessageCBLService` or any block store abstraction.

5. **In-Memory Search on Raw Content**: `ChannelService.searchMessages()` does `m.encryptedContent.toLowerCase().includes(lowerQuery)` — this assumes content is a searchable string, not a block reference.

6. **Edit Operations Overwrite Content Directly**: `MessageOperationsService.editMessage()` replaces `encryptedContent` with the new content string. After the fix, editing must create a new block and update the reference.

## Correctness Properties

Property 1: Bug Condition - Block Storage for Message Content

_For any_ `sendMessage()` call on `ConversationService`, `GroupService`, or `ChannelService` where content is provided, the fixed service SHALL store the content via `IBlockContentStore.storeContent()`, set `ICommunicationMessage.encryptedContent` to the returned block reference (magnet URL), and announce the message via `IBlockContentStore` (which delegates to `GossipService`), such that the raw content string is never persisted to BrightDB.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Non-Content Metadata Operations

_For any_ operation that does NOT involve message content storage or retrieval (metadata CRUD, membership, key rotation, permissions, events, pagination, invite tokens), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-content operations.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `brightchain-lib/src/lib/interfaces/communication/blockContentStore.ts` (NEW)

**Change**: Create `IBlockContentStore` interface

**Specific Changes**:
1. **Define IBlockContentStore interface**: Platform-agnostic abstraction with three async methods:
   - `storeContent(content: Uint8Array | string, senderId: string, recipientIds: string[]): Promise<{ blockReference: string }>` — stores content as blocks and announces via gossip, returns a magnet URL / block reference
   - `retrieveContent(blockReference: string): Promise<Uint8Array | null>` — retrieves content from block store by reference
   - `deleteContent(blockReference: string): Promise<void>` — removes content blocks from block store

---

**File**: `brightchain-lib/src/lib/interfaces/communication/chatStorageProvider.ts`

**Change**: Export `IBlockContentStore` from the communication interfaces barrel

---

**File**: `brightchain-lib/src/lib/services/communication/conversationService.ts`

**Function**: `sendMessage()`

**Specific Changes**:
1. **Add IBlockContentStore dependency**: Accept optional `IBlockContentStore` in constructor (alongside existing `IChatStorageProvider`)
2. **Store content as blocks**: Before creating `ICommunicationMessage`, call `blockContentStore.storeContent(content, senderId, [recipientId])` to get a `blockReference`
3. **Set encryptedContent to block reference**: Set `encryptedContent: blockReference` instead of `encryptedContent: content`
4. **Fallback behavior**: If no `IBlockContentStore` is injected (unit tests), fall back to current direct-storage behavior for backward compatibility

---

**File**: `brightchain-lib/src/lib/services/communication/groupService.ts`

**Function**: `sendMessage()`, `editMessage()`

**Specific Changes**:
1. **Add IBlockContentStore dependency**: Accept optional `IBlockContentStore` in constructor
2. **sendMessage**: Store content via `blockContentStore.storeContent()`, set `encryptedContent` to block reference
3. **editMessage**: Store new content as a new block, update `encryptedContent` to new block reference, push old reference to `editHistory`
4. **Fallback behavior**: Same as ConversationService

---

**File**: `brightchain-lib/src/lib/services/communication/channelService.ts`

**Function**: `sendMessage()`, `editMessage()`, `searchMessages()`

**Specific Changes**:
1. **Add IBlockContentStore dependency**: Accept optional `IBlockContentStore` in constructor
2. **sendMessage**: Store content via `blockContentStore.storeContent()`, set `encryptedContent` to block reference
3. **editMessage**: Store new content as a new block, update reference
4. **searchMessages**: When `IBlockContentStore` is present, retrieve content for each non-deleted message and search the retrieved content. When absent, fall back to current direct string search. Note: this is a performance concern for large channels — a search index may be needed later, but for correctness the retrieve-and-search approach works.
5. **Fallback behavior**: Same as ConversationService

---

**File**: `brightchain-api-lib/src/lib/services/brightchat/blockContentStoreAdapter.ts` (NEW)

**Change**: Create `BlockContentStoreAdapter` implementing `IBlockContentStore`

**Specific Changes**:
1. **Constructor**: Accept `MessageCBLService` and `IGossipService` dependencies
2. **storeContent()**: Delegate to `messageCBLService.createMessage()` with content as `Uint8Array`, then call `gossipService.announceMessage()` with the block IDs and delivery metadata. Return the magnet URL as `blockReference`.
3. **retrieveContent()**: Delegate to `messageCBLService.getMessageContent(blockReference)` to reconstruct content from blocks
4. **deleteContent()**: Parse the magnet URL, retrieve block IDs from metadata, delete each block from the block store

---

**File**: `brightchain-api-lib/src/lib/application.ts`

**Function**: BrightChat communication services initialization section

**Specific Changes**:
1. **Create BlockContentStoreAdapter**: After creating `chatStorageProvider`, create a `BlockContentStoreAdapter` using the existing `MessageCBLService` stub (or real instance) and gossip stub
2. **Inject into services**: Pass the `BlockContentStoreAdapter` to `ConversationService`, `GroupService`, and `ChannelService` constructors
3. **Register service**: Register `blockContentStore` in the services container for admin controllers to use

---

**File**: `brightchain-api-lib/src/lib/controllers/api/adminChat.ts`

**Function**: `handleListMessages()`, `handleDeleteMessage()`

**Specific Changes**:
1. **handleListMessages**: After reading message metadata from BrightDB, retrieve content from `IBlockContentStore` using the `encryptedContent` field (now a block reference) to build `contentPreview`. Fall back to the stored field value if block store is unavailable.
2. **handleDeleteMessage**: After soft-deleting the BrightDB record, call `blockContentStore.deleteContent(blockReference)` to clean up content blocks. Retrieve the `IBlockContentStore` from the services container.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that inspect the `encryptedContent` field of messages returned by `sendMessage()` in each service. On unfixed code, `encryptedContent` will contain the raw content string. On fixed code, it should contain a block reference (magnet URL format). Run these tests on the UNFIXED code to observe the bug.

**Test Cases**:
1. **ConversationService Direct Storage Test**: Call `sendMessage("alice", "bob", "Hello world")`, inspect `result.encryptedContent` — will equal `"Hello world"` on unfixed code (should be a magnet URL)
2. **GroupService Direct Storage Test**: Call `sendMessage(groupId, senderId, "Group message")`, inspect `result.encryptedContent` — will equal `"Group message"` on unfixed code
3. **ChannelService Direct Storage Test**: Call `sendMessage(channelId, senderId, "Channel post")`, inspect `result.encryptedContent` — will equal `"Channel post"` on unfixed code
4. **No Gossip Announcement Test**: Verify that no gossip `announceMessage()` call is made during `sendMessage()` on unfixed code

**Expected Counterexamples**:
- `encryptedContent` contains raw content strings instead of block references
- No `MessageCBLService.createMessage()` invocations during chat message sending
- No `GossipService.announceMessage()` invocations during chat message sending

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedService.sendMessage(input)
  ASSERT result.encryptedContent IS a valid block reference (magnet URL format)
  ASSERT blockContentStore.storeContent WAS called with the original content
  ASSERT blockContentStore.retrieveContent(result.encryptedContent) == original content
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for metadata operations (create conversation, add members, rotate keys, pin messages, etc.), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Conversation Metadata Preservation**: Verify creating conversations, listing, participant tracking all produce identical results before and after fix
2. **Group Membership Preservation**: Verify adding/removing members, key rotation, role assignment produce identical results
3. **Channel Lifecycle Preservation**: Verify channel creation, visibility changes, invite tokens, join/leave produce identical results
4. **Event Emission Preservation**: Verify all `ICommunicationEventEmitter` events fire with the same arguments for non-content operations
5. **Pagination Preservation**: Verify cursor-based pagination returns same structure and ordering

### Unit Tests

- Test that `sendMessage()` in each service calls `IBlockContentStore.storeContent()` with correct arguments
- Test that `encryptedContent` in returned message is a block reference, not raw content
- Test that `editMessage()` creates a new block and updates the reference
- Test that `searchMessages()` retrieves content from block store before searching
- Test that admin `handleListMessages()` retrieves content from block store for preview
- Test that admin `handleDeleteMessage()` calls `blockContentStore.deleteContent()`
- Test fallback behavior when `IBlockContentStore` is not injected (backward compatibility)

### Property-Based Tests

- Generate random message content strings and verify `sendMessage()` always produces a block reference in `encryptedContent` and the content is retrievable via `retrieveContent()`
- Generate random metadata operations (create, join, leave, kick, mute, pin, react) and verify they produce identical results with and without `IBlockContentStore` injection
- Generate random sequences of send + edit operations and verify edit history contains block references, not raw content

### Integration Tests

- Test full message flow: send → store as blocks → retrieve content from blocks → verify round-trip
- Test message editing flow: send → edit → verify new block created, old reference in history
- Test admin message listing: send messages → admin list → verify content preview retrieved from block store
- Test admin message deletion: send message → admin delete → verify both BrightDB record and block store content cleaned up
