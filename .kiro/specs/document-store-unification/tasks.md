# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Document Store Divergence
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate services write to stores invisible to admin controllers
  - **Scoped PBT Approach**: For each fix area, scope the property to concrete failing cases:
    - Area 1/2: Write a document via `app.getModel('brighthub_posts')`, then read via `plugin.brightDb.collection('brighthub_posts')` — expect the document to be present (will FAIL because getModel falls through to standalone store)
    - Area 3: Create a conversation via `ConversationService`, then query `brightDb.collection('brightchat_conversations')` — expect the conversation to be present (will FAIL because data is in a Map)
    - Area 4: Create a vault via `BrightPassService`, then query `brightDb.collection('brightpass_vaults')` — expect vault metadata to be present (will FAIL because data is in a Map)
    - Area 5: Store email via `InMemoryEmailMetadataStore`, then query `brightDb.collection('brightmail_emails')` — expect email metadata to be present (will FAIL because data is in a Map)
    - Area 6: Verify admin controllers use prefixed collection names matching service writes (will FAIL because AdminChatController uses `'conversations'` not `'brightchat_conversations'`)
  - Test file: `brightchain-api-lib/src/lib/__tests__/document-store-unification.exploration.spec.ts`
  - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.3, 1.4, 1.6, 1.9, 1.11, 1.12, 1.14, 1.15, 1.17, 1.18, 1.19_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Registered Models and Service API Signatures
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where storage already goes through BrightDb correctly):
    - Observe: `app.getModel('users')` returns a registered Model from `_plugin.brightDb.model('users')` (registered models work correctly)
    - Observe: `app.getModel('roles')` returns a registered Model from `_plugin.brightDb.model('roles')` (registered models work correctly)
    - Observe: `app.db` getter returns the plugin's `BrightDbDocumentStoreAdapter` when plugin is connected
    - Observe: `wrapCollection(app.getModel('brighthub_posts'))` returns a functional `BrightHubCollection<T>` adapter
    - Observe: `AdminHubController` queries `brightDb.collection('brighthub_posts')` (already uses correct prefixed name)
    - Observe: `ConversationService` public API signatures (`createOrGetConversation`, `sendMessage`, `listConversations`, `getMessages`, `deleteMessage`, `promoteToGroup`) return correct types
    - Observe: `BrightPassService` public API signatures (`createVault`, `openVault`, `listVaults`, `deleteVault`, `addEntry`, `getEntry`) return correct types
    - Observe: `IEmailMetadataStore` interface contract (`store`, `get`, `delete`, `update`, `queryInbox`, `markAsRead`, `getThread`) is satisfied
    - Observe: BrightPass encrypted entry data uses block store (not BrightDb) for actual vault contents
  - Write property-based tests capturing observed behavior patterns:
    - For all registered model names, `getModel(name)` returns the registered Model
    - For all `ConversationService` public methods, signatures and return types are unchanged
    - For all `BrightPassService` vault operations, encrypted entry data stays in block store
    - `wrapCollection` continues to bridge collections to `BrightHubCollection<T>`
  - Test file: `brightchain-api-lib/src/lib/__tests__/document-store-unification.preservation.spec.ts`
  - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [x] 3. Fix 1: Remove standalone `_brightchainDocumentStore` and fix `getModel()` fallback

  - [x] 3.1 Remove standalone store and fix getModel() in application.ts
    - Remove the `_brightchainDocumentStore` field declaration and its creation in the constructor (`createBlockDocumentStore({ useMemory: true, blockSize: BlockSize.Medium })`)
    - Update `getModel()` fallback from `this._brightchainDocumentStore.collection<U>(modelName)` to `this.db.collection<U>(modelName)`
    - Update `db` getter to use a lazy-initialized pre-connection fallback (or throw before plugin connects) instead of referencing the removed standalone store
    - Remove the `createBlockDocumentStore` import if no longer used
    - File: `brightchain-api-lib/src/lib/application.ts`
    - _Bug_Condition: isBugCondition(X) where X.storageTarget = _brightchainDocumentStore (standalone store)_
    - _Expected_Behavior: getModel(name) returns collection from plugin's BrightDb for all unregistered names_
    - _Preservation: Registered models (users, roles, user_roles, mnemonics) continue returning Model from _plugin.brightDb.model(name)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Verify bug condition exploration test now passes for Areas 1/2
    - **Property 1: Expected Behavior** - getModel() Unification
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The Area 1/2 assertions from task 1 should now pass (data written via getModel is visible in plugin's BrightDb)
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
    - **EXPECTED OUTCOME**: Area 1/2 assertions PASS (confirms getModel fix works)
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Registered Models Still Work
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm registered model access and wrapCollection adapter still work

- [x] 4. Fix 2: Migrate BrightChat services to BrightDb collections

  - [x] 4.1 Define IChatStorageProvider interface in brightchain-lib
    - Create a minimal storage abstraction interface in `brightchain-lib` (since it cannot depend on `brightchain-db`)
    - Interface should provide async CRUD methods for conversations, messages, groups, channels, invite tokens
    - Collection names: `brightchat_conversations`, `brightchat_messages`, `brightchat_groups`, `brightchat_group_messages`, `brightchat_channels`, `brightchat_channel_messages`, `brightchat_invite_tokens`
    - File: `brightchain-lib/src/lib/interfaces/communication/chatStorageProvider.ts`
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 4.2 Update ConversationService to use storage provider
    - Modify constructor to accept optional `IChatStorageProvider` (or collection-like objects)
    - When provided, persist conversations and messages to injected collections instead of plain Maps
    - When not provided (unit tests), fall back to in-memory Maps for backward compatibility
    - Public API signatures MUST NOT change
    - File: `brightchain-lib/src/lib/services/communication/conversationService.ts`
    - _Requirements: 2.6, 3.10_

  - [x] 4.3 Update GroupService to use storage provider
    - Same pattern as ConversationService — inject optional storage, persist to BrightDb collections
    - Public API signatures MUST NOT change
    - File: `brightchain-lib/src/lib/services/communication/groupService.ts`
    - _Requirements: 2.7, 3.10_

  - [x] 4.4 Update ChannelService to use storage provider
    - Same pattern as ConversationService — inject optional storage, persist to BrightDb collections
    - Public API signatures MUST NOT change
    - File: `brightchain-lib/src/lib/services/communication/channelService.ts`
    - _Requirements: 2.8, 3.10_

  - [x] 4.5 Wire BrightChat services with BrightDb collections in application.ts
    - In the BrightChat initialization section of `App.start()`, pass BrightDb-backed collections to service constructors
    - Use `wrapCollection` / `getModel` pattern consistent with BrightHub services
    - Collection names: `brightchat_conversations`, `brightchat_messages`, `brightchat_groups`, `brightchat_group_messages`, `brightchat_channels`, `brightchat_channel_messages`, `brightchat_invite_tokens`
    - File: `brightchain-api-lib/src/lib/application.ts`
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 4.6 Verify bug condition exploration test now passes for Area 3
    - **Property 1: Expected Behavior** - BrightChat Data Visibility
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
    - **EXPECTED OUTCOME**: Area 3 assertions PASS (BrightChat data visible in BrightDb)
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 4.7 Verify preservation tests still pass
    - **Property 2: Preservation** - BrightChat API Signatures Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 5. Fix 3: Migrate BrightPass vault metadata to BrightDb

  - [x] 5.1 Update BrightPassService to persist vault metadata to BrightDb
    - Modify constructor to accept an optional BrightDb collection for vault index/metadata
    - Replace `vaults` Map metadata operations, `vaultIndex` Map, and `memberVaults` Map with BrightDb collection operations for the metadata portion
    - Encrypted entry data (actual vault contents) MUST continue using the block store via VCBLService
    - Collection name: `brightpass_vaults`
    - Public API signatures MUST NOT change
    - File: `brightchain-api-lib/src/lib/services/brightpass.ts`
    - _Bug_Condition: isBugCondition(X) where X.storageTarget = Map<string, StoredVault> (in-memory)_
    - _Expected_Behavior: vault metadata persisted to brightpass_vaults collection in BrightDb_
    - _Preservation: Encrypted entry data stays in block store; vault CRUD API unchanged_
    - _Requirements: 2.10, 2.11, 3.7_

  - [x] 5.2 Wire BrightPassService with BrightDb collection in application.ts
    - Pass BrightDb collection reference when constructing `BrightPassService`
    - File: `brightchain-api-lib/src/lib/application.ts`
    - _Requirements: 2.10_

  - [x] 5.3 Verify bug condition exploration test now passes for Area 4
    - **Property 1: Expected Behavior** - BrightPass Vault Metadata Visibility
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
    - **EXPECTED OUTCOME**: Area 4 assertions PASS (vault metadata visible in BrightDb)
    - _Requirements: 2.10, 2.11_

  - [x] 5.4 Verify preservation tests still pass
    - **Property 2: Preservation** - BrightPass Block Store Usage Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
    - **EXPECTED OUTCOME**: Tests PASS (confirms encrypted entries still use block store)

- [x] 6. Fix 4: Create BrightDb-backed IEmailMetadataStore for BrightMail

  - [x] 6.1 Create BrightDb-backed IEmailMetadataStore implementation
    - Create a new class implementing `IEmailMetadataStore` that delegates to a collection-like interface
    - Since `brightchain-lib` cannot depend on `brightchain-db`, define a minimal collection interface in brightchain-lib and inject the BrightDb collection at construction time
    - Alternatively, create the implementation in `brightchain-api-lib` where BrightDb is available
    - Collection name: `brightmail_emails`
    - Must satisfy the full `IEmailMetadataStore` contract: `store`, `get`, `delete`, `update`, `queryInbox`, `getUnreadCount`, `markAsRead`, `getThread`, `getRootMessage`, `storeAttachmentContent`, `getAttachmentContent`
    - File: `brightchain-api-lib/src/lib/services/brightmail/brightDbEmailMetadataStore.ts` (or in brightchain-lib with injected collection interface)
    - _Requirements: 2.12, 3.11_

  - [x] 6.2 Wire BrightDb-backed email metadata store in application.ts
    - Replace `new InMemoryEmailMetadataStore()` with the BrightDb-backed implementation
    - Pass BrightDb collection to the new store's constructor
    - File: `brightchain-api-lib/src/lib/application.ts`
    - _Requirements: 2.12, 3.9_

  - [x] 6.3 Verify bug condition exploration test now passes for Area 5
    - **Property 1: Expected Behavior** - BrightMail Email Metadata Visibility
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
    - **EXPECTED OUTCOME**: Area 5 assertions PASS (email metadata visible in BrightDb)
    - _Requirements: 2.12, 2.13_

  - [x] 6.4 Verify preservation tests still pass
    - **Property 2: Preservation** - IEmailMetadataStore Contract Satisfied
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
    - **EXPECTED OUTCOME**: Tests PASS (confirms IEmailMetadataStore interface contract maintained)

- [x] 7. Fix 5: Update admin controller collection names to match service collection names

  - [x] 7.1 Update AdminChatController collection names
    - Change `brightDb.collection('conversations')` → `brightDb.collection('brightchat_conversations')`
    - Change `brightDb.collection('messages')` → `brightDb.collection('brightchat_messages')`
    - File: `brightchain-api-lib/src/lib/controllers/api/adminChat.ts`
    - _Requirements: 2.9_

  - [x] 7.2 Update AdminPassController collection names
    - Change `brightDb.collection('vaults')` → `brightDb.collection('brightpass_vaults')`
    - File: `brightchain-api-lib/src/lib/controllers/api/adminPass.ts`
    - _Requirements: 2.11_

  - [x] 7.3 Update AdminMailController collection names
    - Change `brightDb.collection('emails')` → `brightDb.collection('brightmail_emails')`
    - File: `brightchain-api-lib/src/lib/controllers/api/adminMail.ts`
    - _Requirements: 2.13_

  - [x] 7.4 Verify bug condition exploration test now passes for Area 6
    - **Property 1: Expected Behavior** - Admin Controller Collection Name Alignment
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
    - **EXPECTED OUTCOME**: All assertions PASS (admin controllers query same collections services write to)
    - _Requirements: 2.9, 2.11, 2.13_

  - [x] 7.5 Verify preservation tests still pass
    - **Property 2: Preservation** - AdminHubController Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run with: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
    - **EXPECTED OUTCOME**: Tests PASS (AdminHubController already uses `brighthub_posts` — no regression)

- [x] 8. Checkpoint — Ensure all tests pass
  - Run full exploration test suite: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.exploration"`
  - Run full preservation test suite: `yarn nx test brightchain-api-lib --testPathPatterns="document-store-unification.preservation"`
  - Run existing test suites for affected libraries to confirm no regressions:
    - `yarn nx test brightchain-api-lib`
    - `yarn nx test brightchain-lib`
    - `yarn nx test brightchain-node-express-suite`
  - Ensure all tests pass, ask the user if questions arise.
