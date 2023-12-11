# Document Store Unification Bugfix Design

## Overview

The BrightChain platform has a systemic data visibility problem: five subsystems store persistent data in private in-memory structures while admin controllers query BrightDb and find nothing. The root cause is that each subsystem was built with its own storage mechanism (plain Maps, a standalone BlockDocumentStore, or InMemoryEmailMetadataStore) instead of using the single BrightDb instance that the environment configuration determines. The fix unifies all persistence through BrightDb — if `DEV_DATABASE` is set it's in-memory BrightDb, if Azure/S3/Disk it's the corresponding persistent BrightDb. No separate in-memory stores.

## Glossary

- **Bug Condition (C)**: Any service persists data to a store that is not the plugin's BrightDb instance — whether that's the standalone `_brightchainDocumentStore`, plain `Map` objects, or `InMemoryEmailMetadataStore`
- **Property (P)**: All service data SHALL be persisted through the single BrightDb instance provided by `BrightChainDatabasePlugin`, making it visible to admin controllers and surviving restarts in production modes
- **Preservation**: Registered Models, environment-based store selection, service API signatures, block store encryption, and the `wrapCollection` adapter all continue working unchanged
- **`App`**: Main application class in `brightchain-api-lib/src/lib/application.ts` extending `BrightDbApplication`
- **`_brightchainDocumentStore`**: Standalone in-memory `BlockDocumentStore` created unconditionally in the `App` constructor — to be eliminated
- **`_plugin`**: `BrightChainDatabasePlugin` instance managing the real BrightDb lifecycle
- **`BrightDbDocumentStoreAdapter`**: Adapter in `brightchain-node-express-suite` wrapping BrightDb to implement the `DocumentStore` interface
- **`wrapCollection()`**: Function in `collectionAdapter.ts` bridging any collection to the `BrightHubCollection<T>` interface
- **`IEmailMetadataStore`**: Interface in `brightchain-lib` that `InMemoryEmailMetadataStore` implements — a BrightDb-backed implementation will replace it

## Bug Details

### Bug Condition

The bug manifests across five areas, all sharing the same root pattern: services write to private in-memory stores while admin controllers read from BrightDb.

**Area 1 — Standalone Store**: `App` constructor creates `_brightchainDocumentStore = createBlockDocumentStore({ useMemory: true })` unconditionally. This store exists independently of the plugin's BrightDb.

**Area 2 — getModel() Fallback**: When `App.getModel(name)` is called and `_plugin.brightDb.hasModel(name)` returns false (all BrightHub collections), it falls through to `this._brightchainDocumentStore.collection(name)` instead of `this.db.collection(name)`.

**Area 3 — BrightChat Maps**: `ConversationService`, `GroupService`, and `ChannelService` in `brightchain-lib` store all data in plain `Map` objects. No BrightDb integration exists.

**Area 4 — BrightPass Maps**: `BrightPassService` in `brightchain-api-lib` stores vault metadata in `Map<string, StoredVault>`, `Map<string, VaultIndexEntry>`, and `Map<string, Set<string>>`. No BrightDb integration for metadata.

**Area 5 — BrightMail InMemoryEmailMetadataStore**: `InMemoryEmailMetadataStore` in `brightchain-lib` stores email metadata in `Map<string, IEmailMetadata>`, read tracking in `Set<string>`, and attachments in `Map<string, Uint8Array>`.

**Formal Specification:**
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type { subsystem: string, storageTarget: StoreType }
  OUTPUT: boolean

  // Returns true when a service writes to anything other than the plugin's BrightDb
  RETURN X.storageTarget ≠ pluginBrightDb
END FUNCTION
```

**Fix Checking Property:**
```pascal
// Property: All service data goes through the single BrightDb instance
FOR ALL X WHERE isBugCondition(X) DO
  result ← service_fixed(X)
  dbQuery ← pluginBrightDb.collection(X.collectionName).find()
  ASSERT dbQuery CONTAINS result.data
END FOR
```

**Preservation Property:**
```pascal
// Property: Non-buggy paths produce identical results
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

### Examples

- **PostService creates a post** (Area 2): `PostService` calls `app.getModel('brighthub_posts')` → `hasModel` returns false → falls through to `_brightchainDocumentStore.collection('brighthub_posts')` (in-memory) → post stored in memory. Admin calls `services.get('db').collection('brighthub_posts')` → queries real BrightDb → zero results.
- **ConversationService creates a conversation** (Area 3): `conversationService.createOrGetConversation()` → stores in `this.conversations` Map → `AdminChatController` queries `brightDb.collection('conversations')` → empty collection → zero results.
- **BrightPassService creates a vault** (Area 4): `brightPassService.createVault()` → stores in `this.vaults` and `this.vaultIndex` Maps → `AdminPassController` queries `brightDb.collection('vaults')` → empty collection → zero results.
- **Email received via Postfix** (Area 5): `MessagePassingService` stores metadata via `InMemoryEmailMetadataStore.store()` → `AdminMailController` queries `brightDb.collection('emails')` → empty collection → zero results.
- **Registered Model (works correctly)**: `app.getModel('users')` → `hasModel('users')` returns true → returns registered Model from `_plugin.brightDb.model('users')` → data in real BrightDb. NOT affected.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `App.getModel()` for collections with registered Models (`roles`, `users`, `user_roles`, `mnemonics`) continues returning the registered Model
- `App.db` getter continues preferring the plugin's document store adapter when available
- `wrapCollection()` / `CollectionAdapter` continues bridging any collection to `BrightHubCollection<T>`
- Admin controllers calling `services.get('db') as BrightDb` continue receiving the real BrightDb instance
- `brightchainDatabaseInit()` continues selecting the correct block store type based on environment
- BrightPass encrypted entry blobs continue using the block store — only vault index/metadata moves to BrightDb
- BrightChat key encryption handlers continue working — only the data storage layer changes
- BrightMail's `MessagePassingService.configureEmail()` pipeline continues working — only the backing store changes
- All service public API signatures and return types remain unchanged

## Hypothesized Root Cause

The root cause is a combination of five related issues:

### 1. Unnecessary Standalone Store (App constructor)

The `App` constructor creates `_brightchainDocumentStore = createBlockDocumentStore({ useMemory: true })` unconditionally. After the plugin connects, this store serves no purpose — `this.db` already falls back to it pre-connection. This store should not exist as a separate entity.

**Current code** (`application.ts` constructor):
```typescript
this._brightchainDocumentStore = createBlockDocumentStore({
  useMemory: true,
  blockSize: BlockSize.Medium,
});
```

### 2. Incorrect getModel() Fallback (App.getModel)

When `_plugin.brightDb.hasModel(modelName)` returns false, `getModel()` falls through to `this._brightchainDocumentStore.collection(modelName)` instead of `this.db.collection(modelName)`.

**Current code** (`application.ts` getModel):
```typescript
return this._brightchainDocumentStore.collection<U>(modelName);
```
**Should be:**
```typescript
return this.db.collection<U>(modelName);
```

### 3. BrightChat Services Use Plain Maps (brightchain-lib)

`ConversationService`, `GroupService`, and `ChannelService` were built as pure in-memory services with no database integration. They need to accept a BrightDb-backed collection provider (following the same `getModel`/`wrapCollection` pattern BrightHub uses) and persist data to BrightDb collections.

**Affected files:**
- `brightchain-lib/src/lib/services/communication/conversationService.ts` — `Map<string, IConversation>`, `Map<string, ICommunicationMessage[]>`
- `brightchain-lib/src/lib/services/communication/groupService.ts` — `Map<string, IGroup>`, `Map<string, ICommunicationMessage[]>`, `Map<string, Uint8Array>`
- `brightchain-lib/src/lib/services/communication/channelService.ts` — `Map<string, IChannel>`, `Map<string, ICommunicationMessage[]>`, `Map<string, Uint8Array>`, `Map<string, IInviteToken>`

### 4. BrightPassService Uses Plain Maps (brightchain-api-lib)

`BrightPassService` stores vault metadata in plain Maps. The vault index/metadata needs to be persisted to a BrightDb collection while encrypted entry data continues using the block store.

**Affected file:**
- `brightchain-api-lib/src/lib/services/brightpass.ts` — `Map<string, StoredVault>`, `Map<string, VaultIndexEntry>`, `Map<string, Set<string>>`

### 5. InMemoryEmailMetadataStore Is the Only Implementation (brightchain-lib)

`InMemoryEmailMetadataStore` is the only implementation of `IEmailMetadataStore`. A BrightDb-backed implementation needs to be created.

**Affected file:**
- `brightchain-lib/src/lib/services/messaging/inMemoryEmailMetadataStore.ts` — `Map<string, IEmailMetadata>`, `Set<string>`, `Map<string, Uint8Array>`

### 6. Admin Controller Collection Name Mismatches

Even after fixing the store unification, admin controllers use collection names that don't match what services write to:
- `AdminChatController` uses `'conversations'` and `'messages'` — should match BrightChat's BrightDb collection names (e.g. `'brightchat_conversations'`, `'brightchat_messages'`)
- `AdminPassController` uses `'vaults'` — should match BrightPass's BrightDb collection name (e.g. `'brightpass_vaults'`)
- `AdminMailController` uses `'emails'` — should match BrightMail's BrightDb collection name (e.g. `'brightmail_emails'`)
- `AdminHubController` already correctly uses `'brighthub_posts'`

## Correctness Properties

### Property 1: Standalone Store Elimination

_For any_ application instance after plugin connection, there SHALL be no separate `_brightchainDocumentStore` that diverges from the plugin's BrightDb. All collection access SHALL route through the single BrightDb instance.

**Validates: Requirements 2.1, 2.2**

### Property 2: getModel() Unification for Unregistered Collections

_For any_ `modelName` where the plugin is connected and `_plugin.brightDb.hasModel(modelName)` returns false, the fixed `getModel(modelName)` SHALL return a `DocumentCollection` backed by the plugin's `BrightDbDocumentStoreAdapter`, such that data written through `getModel(modelName)` is readable through `services.get('db').collection(modelName)` and vice versa.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: BrightChat Data Visibility

_For any_ conversation, group, channel, or message created through BrightChat services, the data SHALL be persisted to BrightDb collections and SHALL be queryable by `AdminChatController` using matching collection names.

**Validates: Requirements 2.6, 2.7, 2.8, 2.9**

### Property 4: BrightPass Vault Metadata Visibility

_For any_ vault created or updated through `BrightPassService`, the vault index metadata SHALL be persisted to a BrightDb collection and SHALL be queryable by `AdminPassController` using the matching collection name.

**Validates: Requirements 2.10, 2.11**

### Property 5: BrightMail Email Metadata Visibility

_For any_ email stored through the email subsystem, the email metadata SHALL be persisted to a BrightDb collection and SHALL be queryable by `AdminMailController` using the matching collection name.

**Validates: Requirements 2.12, 2.13**

### Property 6: Registered Model Preservation

_For any_ `modelName` where `_plugin.brightDb.hasModel(modelName)` returns true (e.g. `roles`, `users`, `user_roles`, `mnemonics`), the fixed `getModel(modelName)` SHALL return the same registered Model from `_plugin.brightDb.model(modelName)` as the original code.

**Validates: Requirements 3.1, 3.4, 3.6**

### Property 7: Service API Preservation

_For any_ public method on `ConversationService`, `GroupService`, `ChannelService`, `BrightPassService`, or `IEmailMetadataStore`, the method signature and return type SHALL remain unchanged — only the internal storage mechanism changes.

**Validates: Requirements 3.8, 3.9, 3.10, 3.11**

## Fix Implementation

### Changes Required

#### Fix 1: Remove standalone store and fix getModel() fallback

**File**: `brightchain-api-lib/src/lib/application.ts`

1. **Remove `_brightchainDocumentStore` field and its creation** from the constructor. The `this.db` getter already falls back gracefully before the plugin connects.

2. **Change `getModel()` fallback** from `this._brightchainDocumentStore.collection<U>(modelName)` to `this.db.collection<U>(modelName)`:

   Before:
   ```typescript
   return this._brightchainDocumentStore.collection<U>(modelName);
   ```
   After:
   ```typescript
   return this.db.collection<U>(modelName);
   ```

3. **Update `db` getter** to remove the `_brightchainDocumentStore` fallback. If the plugin is not connected yet, return a temporary in-memory store or throw — but the standalone field is eliminated.

   Alternatively, keep `_brightchainDocumentStore` as a private pre-connection-only fallback inside the `db` getter, but ensure `getModel()` always delegates to `this.db` so there's a single code path.

#### Fix 2: Migrate BrightChat services to BrightDb

**Files**:
- `brightchain-lib/src/lib/services/communication/conversationService.ts`
- `brightchain-lib/src/lib/services/communication/groupService.ts`
- `brightchain-lib/src/lib/services/communication/channelService.ts`

**Approach**: These services live in `brightchain-lib` which cannot depend on `brightchain-api-lib` or `brightchain-db` directly. The migration requires introducing a storage abstraction (interface) that the services depend on, with a BrightDb-backed implementation provided at construction time from `application.ts`.

**Option A — Collection Provider Interface**: Define a minimal `IChatStorageProvider` interface in `brightchain-lib` with methods like `getConversationStore()`, `getMessageStore()`, etc. that return a simple async CRUD interface. The `App` class provides a BrightDb-backed implementation when constructing the services.

**Option B — Constructor Injection of Collections**: Modify service constructors to accept optional collection-like objects (matching a minimal async CRUD interface). When provided, services persist to those collections. When not provided (e.g. in unit tests), services fall back to in-memory Maps for backward compatibility.

**Collection names**:
- `brightchat_conversations` — conversations
- `brightchat_messages` — conversation messages
- `brightchat_groups` — groups
- `brightchat_group_messages` — group messages
- `brightchat_channels` — channels
- `brightchat_channel_messages` — channel messages
- `brightchat_invite_tokens` — channel invite tokens

**Wiring** (in `application.ts` BrightChat initialization section): Pass BrightDb-backed collections to service constructors, following the same `getModel`/`wrapCollection` pattern used for BrightHub services.

#### Fix 3: Migrate BrightPass vault metadata to BrightDb

**File**: `brightchain-api-lib/src/lib/services/brightpass.ts`

**Approach**: `BrightPassService` is in `brightchain-api-lib` which already has access to BrightDb. Modify the constructor to accept an optional BrightDb collection for vault metadata. Replace the `vaults`, `vaultIndex`, and `memberVaults` Maps with BrightDb collection operations.

**Collection name**: `brightpass_vaults`

**Key constraint**: Encrypted entry data (the actual vault contents) continues to use the block store via `VCBLService`. Only the vault index/metadata (owner, name, shared-with, timestamps, entry count) moves to BrightDb.

**Wiring** (in `application.ts`): When constructing `BrightPassService`, pass a BrightDb collection reference.

#### Fix 4: Create BrightDb-backed IEmailMetadataStore

**New file**: `brightchain-lib/src/lib/services/messaging/brightDbEmailMetadataStore.ts` (or similar)

**Approach**: Create a new class implementing `IEmailMetadataStore` that delegates to a collection-like interface (since `brightchain-lib` cannot depend on `brightchain-db` directly). The collection interface is injected at construction time.

Alternatively, create the BrightDb-backed implementation in `brightchain-api-lib` or `brightchain-node-express-suite` where BrightDb is available, and inject it into `MessagePassingService.configureEmail()`.

**Collection name**: `brightmail_emails`

**Wiring** (in `application.ts`): Replace `new InMemoryEmailMetadataStore()` with the BrightDb-backed implementation, passing a BrightDb collection.

#### Fix 5: Update admin controller collection names

**Files**:
- `brightchain-api-lib/src/lib/controllers/api/adminChat.ts` — change `'conversations'` → `'brightchat_conversations'`, `'messages'` → `'brightchat_messages'`
- `brightchain-api-lib/src/lib/controllers/api/adminPass.ts` — change `'vaults'` → `'brightpass_vaults'`
- `brightchain-api-lib/src/lib/controllers/api/adminMail.ts` — change `'emails'` → `'brightmail_emails'`

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach per fix area: first surface counterexamples on unfixed code, then verify the fix works and preserves existing behavior.

### Fix 1 Tests: getModel() Unification

**Exploratory (unfixed code):**
- Write a document via `getModel('brighthub_posts')`, read via `plugin.brightDb.collection('brighthub_posts')` — expect zero results (confirms divergence)
- Verify `getModel('brighthub_posts')` and `this.db.collection('brighthub_posts')` return collections backed by different stores

**Fix Checking:**
- Write via `getModel('brighthub_posts')`, read via `plugin.brightDb.collection('brighthub_posts')` — expect the document
- Verify `getModel(name)` and `this.db.collection(name)` return collections backed by the same store for all unregistered names

**Preservation:**
- `getModel('users')`, `getModel('roles')`, etc. continue returning registered Models
- `getModel()` returns a functional collection before plugin connection

### Fix 2 Tests: BrightChat Migration

**Exploratory (unfixed code):**
- Create a conversation via `ConversationService`, query `brightDb.collection('brightchat_conversations')` — expect zero results
- Restart application, verify all BrightChat data is lost

**Fix Checking:**
- Create conversation/group/channel via services, verify data appears in corresponding BrightDb collections
- Verify `AdminChatController` returns the same data that services store

**Preservation:**
- All `ConversationService`, `GroupService`, `ChannelService` public methods maintain same signatures and return types
- Key encryption for groups/channels continues working

### Fix 3 Tests: BrightPass Migration

**Exploratory (unfixed code):**
- Create a vault via `BrightPassService`, query `brightDb.collection('brightpass_vaults')` — expect zero results

**Fix Checking:**
- Create vault, verify metadata appears in `brightpass_vaults` collection
- Verify `AdminPassController` returns vault metadata

**Preservation:**
- Encrypted entry data continues using block store
- Vault CRUD operations maintain same API

### Fix 4 Tests: BrightMail Migration

**Exploratory (unfixed code):**
- Store email via `MessagePassingService`, query `brightDb.collection('brightmail_emails')` — expect zero results

**Fix Checking:**
- Store email, verify metadata appears in `brightmail_emails` collection
- Verify `AdminMailController` returns email metadata

**Preservation:**
- `IEmailMetadataStore` interface contract maintained
- `MessagePassingService.configureEmail()` pipeline unchanged

### Fix 5 Tests: Admin Controller Collection Names

**Fix Checking:**
- Verify `AdminChatController` queries `brightchat_conversations` and `brightchat_messages`
- Verify `AdminPassController` queries `brightpass_vaults`
- Verify `AdminMailController` queries `brightmail_emails`

### Integration Tests

- Full PostService → AdminHubController flow: create post, verify in admin list
- Full ConversationService → AdminChatController flow: create conversation, verify in admin list
- Full BrightPassService → AdminPassController flow: create vault, verify in admin list
- Full email receive → AdminMailController flow: store email, verify in admin list
- Application startup/shutdown lifecycle with unified store path
