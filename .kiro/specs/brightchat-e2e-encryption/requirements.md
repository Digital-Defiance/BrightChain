# Requirements Document

## Introduction

End-to-end ECIES encryption for BrightChat, covering Direct Messages (DMs), Group Chats, and Channels using a unified symmetric key model. The platform adopts a "secure by default" posture: all messages are encrypted at rest and in transit. Every communication context — including DMs (treated as 2-person channels), groups, and channels — has a symmetric content-encryption key (CEK) that is wrapped (encrypted) per-member using that member's ECIES public key. When membership changes, wrapped keys are re-issued or rotated without re-encrypting historical message ciphertext. New members joining any context receive the current CEK and can therefore read the full message history.

## Glossary

- **ECIES_Service**: The existing `ECIESService<TID>` from `@digitaldefiance/ecies-lib`, accessed via `ServiceProvider.getInstance().eciesService`. Performs asymmetric encrypt/decrypt operations using elliptic-curve key pairs.
- **Channel_Key**: A 256-bit AES symmetric key generated per channel, used to encrypt and decrypt all message content within that channel. Stored in memory on the server as `symmetricKeys` map entries.
- **Wrapped_Key**: The Channel_Key encrypted to a specific member's ECIES public key. Stored in the `encryptedSharedKey` map on `IChannel` and `IGroup`, keyed by member ID.
- **Key_Rotation**: The process of generating a new Channel_Key and re-wrapping the new Channel_Key for all remaining members. Triggered when a member is removed from a channel or group.
- **DM_Key**: A 256-bit AES symmetric key generated per DM conversation (2-person channel), used to encrypt and decrypt all message content within that conversation. Wrapped per-participant using the same model as Channel_Key.
- **CEK**: Content Encryption Key — synonym for Channel_Key.
- **Channel_Service**: The existing `ChannelService` class that manages channel lifecycle, membership, and message operations.
- **Group_Service**: The existing `GroupService` class that manages group chat lifecycle, membership, and message operations.
- **Conversation_Service**: The existing `ConversationService` class that manages 1:1 direct message conversations.
- **Server_Service**: The existing `ServerService` class that manages server lifecycle, membership, and channel organization.
- **Key_Encryption_Handler**: The `ChannelKeyEncryptionHandler` callback type used by Channel_Service and Group_Service to encrypt symmetric keys for individual members.
- **Member_Public_Key**: The ECIES public key associated with a BrightChain member, available through the member's identity record.
- **CBL_Asset**: A BrightChain Content Block List asset — an immutable, content-addressed storage object. Attachments can be stored as CBL assets, encrypted with the same symmetric key as the parent message context.
- **Inline_Attachment**: A file (image, document, media, etc.) sent alongside a chat message, encrypted with the context's symmetric key and stored as a CBL_Asset. Referenced by the message via a `attachments` array containing asset metadata.

## Requirements

### Requirement 1: Channel Message Encryption

**User Story:** As a channel member, I want all messages in a channel to be encrypted with the channel's symmetric key, so that only current members with the Wrapped_Key can read message content.

#### Acceptance Criteria

1. WHEN a member sends a message to a channel, THE Channel_Service SHALL encrypt the message content using the Channel_Key before storing the message.
2. WHEN a member requests messages from a channel, THE Channel_Service SHALL decrypt the message content using the Channel_Key before returning the messages to the requesting member.
3. THE Channel_Service SHALL generate a cryptographically random 256-bit Channel_Key when creating a new channel.
4. THE Channel_Service SHALL store the encrypted message content in the `encryptedContent` field of `ICommunicationMessage`.

### Requirement 2: Channel Key Wrapping for Members

**User Story:** As a channel member, I want the channel's symmetric key encrypted to my ECIES public key, so that only I can unwrap the key and decrypt channel messages.

#### Acceptance Criteria

1. WHEN a channel is created, THE Channel_Service SHALL wrap the Channel_Key using ECIES_Service for the creating member's Member_Public_Key and store the result in the channel's `encryptedSharedKey` map.
2. WHEN a new member joins a channel, THE Channel_Service SHALL wrap the current Channel_Key using ECIES_Service for the new member's Member_Public_Key and add the Wrapped_Key to the channel's `encryptedSharedKey` map.
3. THE Channel_Service SHALL use the Key_Encryption_Handler callback to perform ECIES wrapping, replacing the default placeholder base64 encoding with real ECIES encryption.
4. FOR ALL members in a channel, THE Channel_Service SHALL maintain exactly one Wrapped_Key entry per member in the `encryptedSharedKey` map.

### Requirement 3: Channel Key Rotation on Member Removal

**User Story:** As a channel administrator, I want the channel key to be rotated when a member is removed, so that the removed member loses access to both historical and future messages (unless they have local copies).

#### Acceptance Criteria

1. WHEN a member is removed from a channel, THE Channel_Service SHALL generate a new Channel_Key for future messages.
2. WHEN a member is removed from a channel, THE Channel_Service SHALL re-wrap all previous Channel_Keys (key epochs) for remaining members only, using ECIES_Service, so that the removed member can no longer decrypt historical messages from the server.
3. WHEN a member is removed from a channel, THE Channel_Service SHALL wrap the new Channel_Key for each remaining member using ECIES_Service and update the `encryptedSharedKey` map.
4. WHEN a member is removed from a channel, THE Channel_Service SHALL delete ALL of the removed member's Wrapped_Key entries (current and historical epochs) from the `encryptedSharedKey` map.
5. WHEN a member leaves a channel voluntarily, THE Channel_Service SHALL perform the same Key_Rotation as when a member is removed.
6. WHEN Key_Rotation occurs, THE Channel_Service SHALL retain all existing message ciphertext without re-encryption (historical messages remain encrypted under their original Channel_Key epoch; only the wrapped keys are re-issued).
7. A removed member who cached decrypted messages or keys locally MAY still have access to those local copies; the server SHALL NOT serve them wrapped keys or encrypted content after removal.

### Requirement 4: DM Conversation Encryption (2-Person Channel Model)

**User Story:** As a user in a direct message conversation, I want my conversation to use a shared symmetric key (like a 2-person channel), so that encryption is consistent across all BrightChat communication types.

#### Acceptance Criteria

1. WHEN a new DM conversation is created, THE Conversation_Service SHALL generate a 256-bit DM_Key and wrap the DM_Key using ECIES_Service for each participant's Member_Public_Key.
2. WHEN a sender sends a direct message, THE Conversation_Service SHALL encrypt the message content using the DM_Key before storing the message.
3. WHEN a participant retrieves direct messages, THE Conversation_Service SHALL decrypt the message content using the DM_Key (unwrapped from the participant's Wrapped_Key).
4. THE Conversation_Service SHALL store each participant's Wrapped_Key in the conversation's `encryptedSharedKey` map, following the same pattern as Channel_Service and Group_Service.
5. THE Conversation_Service SHALL store the encrypted message content in the `encryptedContent` field of `ICommunicationMessage`.
6. IF a participant's Member_Public_Key is unavailable, THEN THE Conversation_Service SHALL reject the conversation creation with a descriptive error.

### Requirement 5: Group Chat Key Wrapping

**User Story:** As a group chat member, I want the group's symmetric key encrypted to my ECIES public key, so that only group members can read group messages.

#### Acceptance Criteria

1. WHEN a group is created, THE Group_Service SHALL generate a 256-bit symmetric key and wrap the key using ECIES_Service for each initial member's Member_Public_Key.
2. WHEN a new member is added to a group, THE Group_Service SHALL wrap the current group symmetric key using ECIES_Service for the new member's Member_Public_Key.
3. WHEN a member is removed from a group, THE Group_Service SHALL perform Key_Rotation: generate a new symmetric key, re-wrap the new key for all remaining members, and re-wrap all previous key epochs for remaining members only (revoking the removed member's access to historical messages).
4. WHEN a conversation is promoted to a group, THE Group_Service SHALL generate a new group symmetric key and wrap the key for all group members.

### Requirement 6: Server Member Addition Key Distribution

**User Story:** As a server administrator, I want new server members to automatically receive wrapped channel keys for all channels they can access, so that they can immediately read channel history.

#### Acceptance Criteria

1. WHEN a new member is added to a server, THE Server_Service SHALL instruct Channel_Service to wrap the Channel_Key for the new member for each channel in the server.
2. WHEN a member redeems a server invite, THE Server_Service SHALL instruct Channel_Service to wrap the Channel_Key for the joining member for each channel in the server.
3. WHEN a new member receives Wrapped_Keys for a channel, THE Channel_Service SHALL grant the new member access to the full message history of that channel.

### Requirement 7: Server Member Removal Key Rotation

**User Story:** As a server administrator, I want channel keys rotated across all server channels when a member is removed from the server, so that the removed member cannot decrypt future messages in any server channel.

#### Acceptance Criteria

1. WHEN a member is removed from a server, THE Server_Service SHALL instruct Channel_Service to perform Key_Rotation for each channel where the removed member had a Wrapped_Key, including re-wrapping historical key epochs for remaining members only.
2. WHEN a member is removed from a server, THE Server_Service SHALL remove ALL of the member's Wrapped_Key entries (current and historical epochs) from every channel's `encryptedSharedKey` map.
3. WHEN Key_Rotation is triggered by server member removal, THE Channel_Service SHALL generate a new Channel_Key per affected channel and re-wrap the new key for all remaining channel members.

### Requirement 8: ECIES Key Encryption Handler Integration

**User Story:** As a developer, I want the placeholder key encryption replaced with real ECIES encryption, so that the system provides actual cryptographic security.

#### Acceptance Criteria

1. THE Channel_Service SHALL accept a Key_Encryption_Handler that uses ECIES_Service to encrypt the symmetric key with a member's Member_Public_Key.
2. THE Group_Service SHALL accept a Key_Encryption_Handler that uses ECIES_Service to encrypt the symmetric key with a member's Member_Public_Key.
3. THE Conversation_Service SHALL accept a Key_Encryption_Handler that uses ECIES_Service to encrypt the DM_Key with a participant's Member_Public_Key.
4. WHEN the application initializes, THE application wiring layer SHALL inject an ECIES-backed Key_Encryption_Handler into Channel_Service, Group_Service, and Conversation_Service, replacing the default placeholder handler.
5. THE Key_Encryption_Handler SHALL produce output that ECIES_Service can decrypt given the corresponding member's private key.

### Requirement 9: Encryption-by-Default Configuration

**User Story:** As a platform operator, I want all BrightChat communication encrypted by default, so that users do not need to opt in to encryption.

#### Acceptance Criteria

1. THE Channel_Service SHALL encrypt all message content by default without requiring per-channel or per-message opt-in.
2. THE Conversation_Service SHALL encrypt all direct message content by default without requiring per-conversation opt-in.
3. THE Group_Service SHALL encrypt all group message content by default without requiring per-group opt-in.

### Requirement 10: Key Wrapping Round-Trip Integrity

**User Story:** As a developer, I want to verify that wrapping and unwrapping a key produces the original key, so that I can trust the encryption pipeline.

#### Acceptance Criteria

1. FOR ALL valid Channel_Keys, wrapping the Channel_Key with ECIES_Service for a member's Member_Public_Key and then unwrapping with the member's private key SHALL produce the original Channel_Key (round-trip property).
2. FOR ALL valid symmetric keys used in Group_Service, wrapping and unwrapping SHALL produce the original key (round-trip property).
3. FOR ALL valid DM_Keys, wrapping the DM_Key with ECIES_Service for a participant's Member_Public_Key and then unwrapping with the participant's private key SHALL produce the original DM_Key (round-trip property).

### Requirement 11: Encrypted Inline Attachments

**User Story:** As a chat member, I want to send file attachments (images, documents, media) inline with my messages, encrypted with the same key as the message content, so that attachments have the same security guarantees as text messages.

#### Acceptance Criteria

1. WHEN a member sends a message with one or more Inline_Attachments, THE service (Channel_Service, Group_Service, or Conversation_Service) SHALL encrypt each attachment's content using the context's symmetric key (Channel_Key, group key, or DM_Key) before storing the attachment.
2. THE service SHALL store each encrypted attachment as a CBL_Asset and record the asset reference (content block ID, file name, MIME type, size) in the message's `attachments` array.
3. WHEN a member retrieves a message with attachments, THE service SHALL return the attachment metadata (file name, MIME type, size, asset reference) alongside the message, enabling the client to fetch and decrypt the attachment content using the same symmetric key.
4. THE service SHALL enforce a maximum attachment size limit per file and a maximum number of attachments per message (configurable at the platform level).
5. WHEN Key_Rotation occurs on a context, existing attachment CBL_Assets SHALL NOT be re-encrypted (they remain encrypted under the previous key, same as historical message ciphertext).
6. THE `ICommunicationMessage` interface SHALL include an `attachments` array field containing metadata for each Inline_Attachment (asset ID, file name, MIME type, encrypted size).

### Requirement 12: Error Handling for Missing Keys

**User Story:** As a user, I want clear error messages when encryption operations fail due to missing keys, so that I understand why a message cannot be sent or read.

#### Acceptance Criteria

1. IF a member's Member_Public_Key is not available when wrapping a Channel_Key, THEN THE Channel_Service SHALL return a descriptive error indicating the missing public key and the affected member ID.
2. IF a member's Member_Public_Key is not available when encrypting a direct message, THEN THE Conversation_Service SHALL return a descriptive error indicating the missing public key.
3. IF decryption of a Wrapped_Key fails, THEN THE Channel_Service SHALL return a descriptive error indicating the key unwrap failure and the affected channel ID.
4. IF decryption of a direct message fails, THEN THE Conversation_Service SHALL return a descriptive error indicating the decryption failure.
