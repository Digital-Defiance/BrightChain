# Bugfix Requirements Document

## Introduction

The BrightChat communication services (`ConversationService`, `GroupService`, `ChannelService`) bypass the block-based messaging architecture by storing full message content directly in BrightDB via `IChatStorageProvider`. The architecture specifies that message content must be stored as blocks via `MessageCBLService`, distributed via `GossipService`, with only metadata/block references persisted to BrightDB. The correct pattern already exists in `MessagePassingService.sendMessage()` for the email system. Additionally, admin controllers query BrightDB directly for message content that should instead be retrieved from the block store.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `ConversationService.sendMessage()` is called THEN the system stores the full message content as `encryptedContent: string` in the `ICommunicationMessage` object and persists it directly to BrightDB via `IChatStorageProvider.messages.create()`

1.2 WHEN `GroupService.sendMessage()` is called THEN the system stores the full message content as `encryptedContent: string` in the `ICommunicationMessage` object and persists it directly to BrightDB via `IChatStorageProvider.groupMessages.create()`

1.3 WHEN `ChannelService.sendMessage()` is called THEN the system stores the full message content as `encryptedContent: string` in the `ICommunicationMessage` object and persists it directly to BrightDB via `IChatStorageProvider.channelMessages.create()`

1.4 WHEN any BrightChat service sends a message THEN the system does not invoke `MessageCBLService.createMessage()` to store content as blocks in the block store, resulting in zero block store integration

1.5 WHEN any BrightChat service sends a message THEN the system does not invoke `GossipService.announceMessage()` for gossip-based distribution, bypassing the decentralized delivery mechanism

1.6 WHEN BrightDB collections `brightchat_messages`, `brightchat_group_messages`, and `brightchat_channel_messages` store messages THEN the full encrypted message content is persisted as a plain string field rather than a block reference/magnet URL

1.7 WHEN `AdminChatController.handleListMessages()` retrieves messages THEN the system queries BrightDB directly for message content (including `contentPreview` from `doc['content']`) instead of retrieving content from the block store via `MessageCBLService.getMessageContent()`

1.8 WHEN `AdminChatController.handleDeleteMessage()` deletes a message THEN the system only soft-deletes the BrightDB record without cleaning up the corresponding blocks in the block store

### Expected Behavior (Correct)

2.1 WHEN `ConversationService.sendMessage()` is called THEN the system SHALL encrypt the message content with the conversation's current epoch key, store it as blocks via `MessageCBLService.createMessage()`, and persist only a message handle (block ID / magnet URL) in the `ICommunicationMessage` metadata stored in BrightDB

2.2 WHEN `GroupService.sendMessage()` is called THEN the system SHALL encrypt the message content with the group's current epoch key, store it as blocks via `MessageCBLService.createMessage()`, and persist only a message handle (block ID / magnet URL) in the `ICommunicationMessage` metadata stored in BrightDB

2.3 WHEN `ChannelService.sendMessage()` is called THEN the system SHALL encrypt the message content with the channel's current epoch key, store it as blocks via `MessageCBLService.createMessage()`, and persist only a message handle (block ID / magnet URL) in the `ICommunicationMessage` metadata stored in BrightDB

2.4 WHEN any BrightChat service sends a message THEN the system SHALL invoke `GossipService.announceMessage()` with the block IDs and delivery metadata for gossip-based distribution, following the same pattern as `MessagePassingService.sendMessage()`

2.5 WHEN BrightDB collections store BrightChat messages THEN the `ICommunicationMessage` record SHALL contain only metadata (sender, timestamp, contextType, contextId, keyEpoch, attachments) and a block reference field (magnet URL or block ID) — NOT the actual message content

2.6 WHEN `AdminChatController.handleListMessages()` retrieves messages THEN the system SHALL read message metadata from BrightDB and retrieve content from the block store via `MessageCBLService.getMessageContent()` using the stored block reference

2.7 WHEN `AdminChatController.handleDeleteMessage()` deletes a message THEN the system SHALL soft-delete the BrightDB metadata record AND clean up the corresponding content blocks from the block store

2.8 WHEN message content is retrieved (by any service or controller) THEN the system SHALL use `MessageCBLService.getMessageContent()` with the stored magnet URL / block ID to reconstruct the content from the block store

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `ConversationService` manages conversation metadata (creation, participant tracking, lastMessageAt updates) THEN the system SHALL CONTINUE TO persist conversation metadata to BrightDB via `IChatStorageProvider.conversations`

3.2 WHEN `GroupService` manages group metadata (creation, membership, key rotation, roles) THEN the system SHALL CONTINUE TO persist group metadata to BrightDB via `IChatStorageProvider.groups`

3.3 WHEN `ChannelService` manages channel metadata (creation, visibility, invites, membership) THEN the system SHALL CONTINUE TO persist channel metadata to BrightDB via `IChatStorageProvider.channels`

3.4 WHEN `MessagePassingService.sendMessage()` is called for the email system THEN the system SHALL CONTINUE TO use `MessageCBLService.createMessage()` and `GossipService.announceMessage()` as it does today

3.5 WHEN epoch-aware key management operations occur (key rotation on member join/leave/kick) THEN the system SHALL CONTINUE TO function identically for conversations, groups, and channels

3.6 WHEN message operations (edit, delete, pin, unpin, reactions) are performed THEN the system SHALL CONTINUE TO update the in-memory message stores and persist metadata changes to BrightDB

3.7 WHEN `AdminChatServersController` manages server/channel/member metadata (list servers, update server, delete server, list channels, list members, change roles) THEN the system SHALL CONTINUE TO query and update BrightDB for organizational metadata that does not include message content

3.8 WHEN cursor-based pagination is used for message retrieval in any service THEN the system SHALL CONTINUE TO support the same pagination interface (`IPaginatedResult<ICommunicationMessage>`)

3.9 WHEN `IChatStorageProvider` and `ChatCollectionAdapter` are used THEN the system SHALL CONTINUE TO provide the same `IChatCollection<T>` interface for non-content metadata storage

3.10 WHEN WebSocket events are emitted for message operations (sent, edited, deleted, pinned, reactions) THEN the system SHALL CONTINUE TO emit the same event types via `ICommunicationEventEmitter`
