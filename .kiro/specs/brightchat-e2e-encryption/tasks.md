# Implementation Plan: BrightChat E2E Encryption

## Overview

Replace placeholder base64 key encryption with real ECIES-backed handlers across all BrightChat communication services. Introduce epoch-aware key management, extend interfaces with encryption fields, add encrypted attachment support, and wire everything together in the application layer. Implementation uses TypeScript throughout, with fast-check for property-based testing.

## Tasks

- [x] 1. Define new interfaces and error types
  - [x] 1.1 Update `ICommunicationMessage` to add `keyEpoch` and `attachments` fields
    - Add `keyEpoch: number` field to `ICommunicationMessage` in `brightchain-lib/src/lib/interfaces/communication.ts`
    - Add `attachments: IAttachmentMetadata<TId>[]` field to `ICommunicationMessage`
    - Define `IAttachmentMetadata<TId>` interface with `assetId`, `fileName`, `mimeType`, `encryptedSize`, `originalSize`
    - _Requirements: 11.6, 1.4_

  - [x] 1.2 Update `IConversation` to add `encryptedSharedKey` field
    - Add `encryptedSharedKey: Map<number, Map<string, TData>>` to `IConversation` (epoch-aware)
    - Add `TData = string` generic parameter to `IConversation`
    - _Requirements: 4.4_

  - [x] 1.3 Update `IChannel` and `IGroup` `encryptedSharedKey` to epoch-aware format
    - Change `encryptedSharedKey` from `Map<string, TData>` to `Map<number, Map<string, TData>>` on both interfaces
    - _Requirements: 3.2, 3.4, 5.3_

  - [x] 1.4 Create encryption error classes
    - Create `brightchain-lib/src/lib/errors/encryptionErrors.ts`
    - Implement `MissingPublicKeyError` (contains `memberId`)
    - Implement `KeyUnwrapError` (contains `contextId`, `memberId`, `epoch`)
    - Implement `MessageDecryptionError` (contains `contextId`, `messageId`, `keyEpoch`)
    - Implement `AttachmentTooLargeError` (contains `fileName`, `size`, `maxSize`)
    - Implement `TooManyAttachmentsError` (contains `count`, `maxCount`)
    - Implement `KeyEpochNotFoundError` (contains `contextId`, `keyEpoch`)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 11.4_

  - [x] 1.5 Define `IAttachmentConfig` interface
    - Create or add to `brightchain-lib/src/lib/interfaces/communication.ts`
    - Define `IAttachmentConfig` with `maxFileSizeBytes` (default 25MB) and `maxAttachmentsPerMessage` (default 10)
    - _Requirements: 11.4_

- [x] 2. Implement Key Epoch Manager
  - [x] 2.1 Create `KeyEpochManager` class
    - Create `brightchain-lib/src/lib/services/communication/keyEpochManager.ts`
    - Implement `IKeyEpochState` interface with `currentEpoch`, `epochKeys`, `encryptedEpochKeys`
    - Implement `KeyEpochManager.createInitial()` — initializes epoch 0 with wrapped keys for all members
    - Implement `KeyEpochManager.rotate()` — increments epoch, generates new key, deletes removed member from all epochs, re-wraps all epoch keys for remaining members
    - Implement `KeyEpochManager.addMember()` — wraps all epoch keys for the new member
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 2.2, 5.2_

  - [x] 2.2 Write property test: Key rotation invariants (Property 5)
    - **Property 5: Key rotation invariants on member removal**
    - After removing one member from a context with N≥2 members and E epochs: epoch increments, new CEK differs from all previous, removed member has zero entries, remaining members have entries in all epochs
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 5.3, 7.1, 7.2, 7.3**

  - [x] 2.3 Write property test: Wrapped key count equals member count (Property 6)
    - **Property 6: Wrapped key count equals member count**
    - For any context and any epoch, entries in `encryptedSharedKey[epoch]` equals current member count
    - **Validates: Requirements 2.4, 4.4**

  - [x] 2.4 Write property test: Member addition distributes all epoch keys (Property 4)
    - **Property 4: Member addition distributes all epoch keys**
    - After adding a member to a context with E epochs, the new member has a valid wrapped key in every epoch 0..E
    - **Validates: Requirements 2.2, 5.2, 6.1, 6.2, 6.3**

- [x] 3. Implement ECIES Key Encryption Handler Factory
  - [x] 3.1 Create the ECIES handler module
    - Create `brightchain-lib/src/lib/services/communication/eciesKeyEncryptionHandler.ts`
    - Define `AsyncKeyEncryptionHandler` type: `(memberId, symmetricKey) => Promise<Uint8Array>`
    - Define `AsyncKeyDecryptionHandler` type: `(memberId, wrappedKey) => Promise<Uint8Array>`
    - Define `IEciesHandlerDeps` interface with `eciesService.encryptBasic` and `getMemberPublicKey`
    - Implement `createEciesKeyEncryptionHandler(deps)` factory function
    - Throw `MissingPublicKeyError` when `getMemberPublicKey` returns null/undefined
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 12.1, 12.2_

  - [x] 3.2 Write property test: Key wrapping round-trip (Property 1)
    - **Property 1: Key wrapping round-trip**
    - For any 256-bit key and any valid ECIES key pair, wrap then unwrap produces original key
    - **Validates: Requirements 10.1, 10.2, 10.3, 8.5**

  - [x] 3.3 Write property test: Missing public key produces descriptive error (Property 10)
    - **Property 10: Missing public key produces descriptive error**
    - For any member ID with no registered key, wrapping SHALL throw an error containing the member ID
    - **Validates: Requirements 4.6, 12.1, 12.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update ChannelService for epoch-aware encryption
  - [x] 5.1 Refactor `ChannelService` to use `KeyEpochManager` and async handler
    - Replace `symmetricKeys: Map<string, Uint8Array>` with `keyEpochStates: Map<string, IKeyEpochState>`
    - Update `encryptKey` handler type from sync `string`-returning to `AsyncKeyEncryptionHandler`
    - Update `createChannel()` to use `KeyEpochManager.createInitial()`
    - Update `addMember()` to call `KeyEpochManager.addMember()` for all epochs
    - Update `removeMember()` and `leaveChannel()` to call `KeyEpochManager.rotate()`
    - Update `sendMessage()` to encrypt content with current epoch CEK and record `keyEpoch`
    - Update `getMessages()` to decrypt content using the message's `keyEpoch`
    - Update `encryptedSharedKey` usage to epoch-aware `Map<number, Map<string, TData>>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1_

  - [x] 5.2 Write property test: Message content encrypt/decrypt round-trip for channels (Property 2)
    - **Property 2: Message content encrypt/decrypt round-trip**
    - For any channel with a valid CEK and any non-empty content, encrypt then decrypt produces original content
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [x] 5.3 Write property test: Context creation wraps keys for all initial members (Property 3 — channels)
    - **Property 3: Context creation wraps keys for all initial members**
    - For any newly created channel with N members, `encryptedSharedKey[0]` has exactly N entries
    - **Validates: Requirements 2.1, 1.3**

  - [x] 5.4 Write property test: Ciphertext preservation after key rotation (Property 7)
    - **Property 7: Ciphertext preservation after key rotation**
    - After rotation, all stored `encryptedContent` bytes are byte-identical to pre-rotation values
    - **Validates: Requirements 3.6, 11.5**

- [x] 6. Update GroupService for epoch-aware encryption
  - [x] 6.1 Refactor `GroupService` to use `KeyEpochManager` and async handler
    - Replace `symmetricKeys` with `keyEpochStates: Map<string, IKeyEpochState>`
    - Update `encryptKey` handler type to `AsyncKeyEncryptionHandler`
    - Update `createGroup()` to use `KeyEpochManager.createInitial()`
    - Update `addMember()` to call `KeyEpochManager.addMember()`
    - Update `removeMember()` to call `KeyEpochManager.rotate()`
    - Update `createGroupFromConversation()` to generate fresh CEK (not reuse DM key)
    - Update `sendMessage()` to encrypt with current epoch CEK and record `keyEpoch`
    - Update `getMessages()` to decrypt using message's `keyEpoch`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.3_

  - [x] 6.2 Write property test: Context creation wraps keys for all initial members (Property 3 — groups)
    - **Property 3: Context creation wraps keys for all initial members**
    - For any newly created group with N members, `encryptedSharedKey[0]` has exactly N entries
    - **Validates: Requirements 5.1**

- [x] 7. Update ConversationService for encryption
  - [x] 7.1 Add encryption support to `ConversationService`
    - Accept `AsyncKeyEncryptionHandler` as a constructor parameter
    - Add `keyEpochStates: Map<string, IKeyEpochState>` for DM key management
    - Update `createOrGetConversation()` to generate DM_Key and wrap for both participants using `KeyEpochManager.createInitial()`
    - Update `sendMessage()` to encrypt content with DM_Key and record `keyEpoch`
    - Update `getMessages()` to decrypt content using message's `keyEpoch`
    - Reject conversation creation with `MissingPublicKeyError` if a participant's public key is unavailable
    - Store wrapped keys in `IConversation.encryptedSharedKey`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.2_

  - [x] 7.2 Write property test: Message content encrypt/decrypt round-trip for DMs (Property 2 — DMs)
    - **Property 2: Message content encrypt/decrypt round-trip**
    - For any DM with a valid DM_Key and any non-empty content, encrypt then decrypt produces original content
    - **Validates: Requirements 4.2, 4.3, 4.5**

  - [x] 7.3 Write property test: Context creation wraps keys for all initial members (Property 3 — DMs)
    - **Property 3: Context creation wraps keys for all initial members**
    - For any newly created DM, `encryptedSharedKey[0]` has exactly 2 entries
    - **Validates: Requirements 4.1, 4.4**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update ServerService for key distribution and rotation
  - [x] 9.1 Update `ServerService` to distribute keys on member addition
    - When a member is added to a server (or redeems an invite), instruct `ChannelService` to wrap all epoch keys for the new member across all server channels
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Update `ServerService` to trigger key rotation on member removal
    - When a member is removed from a server, instruct `ChannelService` to perform `KeyEpochManager.rotate()` for each channel where the removed member had wrapped keys
    - Remove all of the member's wrapped key entries from every channel
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Implement encrypted inline attachments
  - [x] 10.1 Add attachment encryption to message send flow
    - In `ChannelService`, `GroupService`, and `ConversationService` `sendMessage()` methods, encrypt each attachment with the context's current CEK
    - Store encrypted attachment as CBL asset via `MessageCBLService` (or equivalent)
    - Record `IAttachmentMetadata` in the message's `attachments` array
    - Enforce `maxFileSizeBytes` and `maxAttachmentsPerMessage` limits before encryption; throw `AttachmentTooLargeError` or `TooManyAttachmentsError` on violation
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 10.2 Add attachment metadata to message retrieval
    - When returning messages, include `attachments` metadata (assetId, fileName, mimeType, sizes) so clients can fetch and decrypt
    - _Requirements: 11.3, 11.6_

  - [x] 10.3 Write property test: Attachment encrypt/decrypt round-trip (Property 8)
    - **Property 8: Attachment encrypt/decrypt round-trip**
    - For any attachment content within limits and any valid CEK, encrypt → store → retrieve → decrypt produces original content
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [x] 10.4 Write property test: Attachment limits enforcement (Property 9)
    - **Property 9: Attachment limits enforcement**
    - Attachments exceeding size limit are rejected; messages exceeding count limit are rejected; valid attachments are accepted
    - **Validates: Requirements 11.4**

- [x] 11. Wire ECIES handlers in application layer
  - [x] 11.1 Update `application.ts` to inject ECIES-backed handlers
    - Import `createEciesKeyEncryptionHandler` and `MissingPublicKeyError`
    - Obtain `eciesService` from `ServiceProvider.getInstance().eciesService`
    - Obtain member public key lookup from `MemberStore.getMemberPublicKeyHex()`
    - Create the ECIES handler instance
    - Pass the ECIES handler to `ChannelService`, `GroupService`, and `ConversationService` constructors (replacing `undefined` placeholder parameters)
    - _Requirements: 8.4, 8.1, 8.2, 8.3_

  - [x] 11.2 Write unit tests for application wiring
    - Verify that services receive ECIES handlers (not placeholder)
    - Verify that the handler produces output decryptable by ECIES private key
    - _Requirements: 8.4, 8.5_

- [x] 12. Error handling and decryption failure paths
  - [x] 12.1 Implement decryption error handling in services
    - In `ChannelService.getMessages()`, catch decryption failures and throw `MessageDecryptionError` with contextId
    - In `ConversationService.getMessages()`, catch decryption failures and throw `MessageDecryptionError`
    - In key unwrap paths, catch failures and throw `KeyUnwrapError` with contextId, memberId, epoch
    - If message references non-existent epoch, throw `KeyEpochNotFoundError`
    - _Requirements: 12.3, 12.4_

  - [x] 12.2 Write property test: Decryption failure produces descriptive error (Property 11)
    - **Property 11: Decryption failure produces descriptive error**
    - For any corrupted wrapped key or ciphertext, unwrap/decrypt throws error containing context ID
    - **Validates: Requirements 12.3, 12.4**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The epoch-aware `encryptedSharedKey` change is a breaking interface change — update all consumers in the same task
- Use `yarn nx test brightchain-lib` and `yarn nx test brightchain-api-lib` to run tests
