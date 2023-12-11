# Member Pool Security — Implementation Tasks

## Phase 1: Secure Member Pool (Public-Read / Private-Write)

### Task 1.1: Add pool security fields to `IBrightChainMemberInitConfig`
- [x] Add `poolSecurity?: IPoolSecurityInitOptions` to the config interface
- [x] `IPoolSecurityInitOptions` contains: systemUserId, systemUserPublicKeyHex, systemUserPrivateKey

### Task 1.2: Create `PoolSecurityService`
- [x] `createMemberPoolSecurity()` — creates ACL with system user as Admin, returns ACL + WriteMode config
- [x] `createAclDocument()` — builds an `IAclDocument` for the WriteAclManager from the pool ACL
- [x] `savePoolSecurity()` — persists ACL + write mode to `__pool_security__` collection
- [x] `loadPoolSecurity()` — reads from `__pool_security__` collection, returns null if not found
- [x] `addNodeToAcl()` — adds a node to the ACL with specified permissions, signs the update
- [x] `removeNodeFromAcl()` — removes a node from the ACL, signs the update

### Task 1.3: Wire pool security into `BrightChainMemberInitService.initialize()`
- [x] After creating BrightDb, check if `poolSecurity` config is provided
- [x] If pool is new: call `createMemberPoolSecurity()`, save it, then reconstruct BrightDb with `writeAclConfig`
- [x] If pool exists: load existing security config, configure `writeAclConfig` from it
- [x] All subsequent writes in the init flow must produce valid `IWriteProof` signed by the system user (via auto-signing in AuthorizedHeadRegistry)

### Task 1.4: Update `inituserdb` to pass system user keys
- [x] After `RbacInputBuilder.buildAll()`, extract system user's public key hex and private key
- [x] Pass to `initConfig.poolSecurity`
- [x] Skip pool security for `DEV_DATABASE` mode (backward compat)

### Task 1.5: Update runtime `databaseInit` in `brightchain-node-express-suite`
- [x] On startup, load pool security config from `__pool_security__` collection
- [x] If found, configure `WriteAclManager` and pass `writeAclConfig` to BrightDb
- [x] Set local signer for auto-signing local writes
- [x] Derive system user's key pair from `SYSTEM_MNEMONIC` for producing write proofs (in api-lib databaseInit wrapper)
- [x] All runtime writes (user registration, profile updates, etc.) must produce signed write proofs (handled by auto-signing)

### Task 1.6: Update `HeadUpdateSyncHandler` for gossip verification
- [x] Ensure head updates received via gossip include write proofs
- [x] The `AuthorizedHeadRegistry` already verifies them — confirmed this path works end-to-end

### Task 1.7: Adversarial E2E Tests (NO MOCKS)
- [x] **Test: Authorized write succeeds** — System user writes to member pool with valid write proof → accepted
- [x] **Test: Unauthorized write rejected** — Node NOT in ACL attempts write with self-signed proof → `WriteAuthorizationError`
- [x] **Test: Missing write proof rejected** — Write attempt with no proof at all → `WriteAuthorizationError`
- [x] **Test: Forged signature rejected** — Attacker signs with a valid key that's not in the ACL → rejected
- [x] **Test: Tampered payload rejected** — Valid signature but payload was modified after signing → rejected
- [x] **Test: Replayed write proof rejected** — Reuse a valid proof from a previous write on a different block → rejected
- [x] **Test: ACL tampering detected** — Attacker modifies the ACL document without a valid Admin signature → rejected on load
- [x] **Test: Read access is unrestricted** — Node not in ACL can read all collections → succeeds
- [x] **Test: Multiple authorized nodes** — Two nodes in ACL can both write → both succeed
- [x] **Test: Removed node loses write access** — Node removed from ACL, subsequent write → rejected
- [x] **Test: Gossip head update with invalid proof rejected** — Simulated gossip head update with bad signature → not applied
- [x] **Test: Gossip head update with valid proof accepted** — Simulated gossip head update with good signature → applied
- [x] **Test: Init idempotency** — Running init twice doesn't corrupt the security config
- [x] **Test: Pool security survives restart** — Write security config, restart (new BrightDb instance on same store), verify enforcement still works

## Phase 2: Node Admission (after Phase 1 is solid)

### Task 2.1: Join request gossip messages
- [x] Add `pool_join_request`, `pool_join_approved`, `pool_join_denied` announcement types
- [x] Implement handlers in GossipService

### Task 2.2: `NodeAdmissionService`
- [x] `requestPoolJoin()` — sends join request via gossip
- [x] `approveJoinRequest()` — adds node to ACL, signs, gossips updated ACL
- [x] `denyJoinRequest()` — gossips denial

### Task 2.3: Admin API endpoints
- [x] `GET /admin/pool/pending-nodes` — list pending join requests
- [x] `POST /admin/pool/approve-node` — approve
- [x] `POST /admin/pool/deny-node` — deny

### Task 2.4: Adversarial E2E Tests for Admission (NO MOCKS)
- [x] **Test: Approved node can write** — Full flow: request → approve → write succeeds
- [x] **Test: Denied node cannot write** — Request → deny → write rejected
- [x] **Test: Unapproved node cannot write** — Node sends request but doesn't wait for approval → write rejected
- [x] **Test: Non-admin cannot approve** — Node with Write but not Admin permission tries to approve → rejected
- [x] **Test: Forged approval rejected** — Attacker gossips a fake approval not signed by an Admin → new node's writes still rejected

## Phase 3: Ban Enforcement (after Phase 2)

### Task 3.1: ACL removal on ban
- [x] When ban record is enacted, remove banned node from member pool ACL
- [x] Sign and gossip updated ACL

### Task 3.2: Network-layer enforcement
- [x] Check ban list in `GossipService.handleAnnouncement()` — drop from banned nodes (via createGossipFilter)
- [x] Check ban list on peer connection acceptance (via shouldRefuseConnection)
- [x] Check ban list in `ReconciliationService` — skip banned peers (via filterBannedPeers)

### Task 3.3: Adversarial E2E Tests for Bans (NO MOCKS)
- [x] **Test: Banned node cannot write** — Node is banned → subsequent writes rejected
- [x] **Test: Banned node's gossip dropped** — Banned node sends gossip → gossip filter rejects it
- [x] **Test: Banned node cannot reconnect** — shouldRefuseConnection returns true for banned peers
- [x] **Test: Banned peers filtered from reconciliation** — filterBannedPeers removes banned peers
- [x] **Test: Unban restores access** — Unbanned node passes all checks again
- [x] **Test: Ban requires supermajority** — 2 of 4 admins insufficient at 75% threshold, 3 of 4 sufficient
- [x] **Test: Ban cooling period enforced** — Cooling period logic verified (72h default, 1h minimum, time comparison)
- [x] **Test: Ban config enforces minimums** — Threshold clamped to 67%, cooling period clamped to 1 hour

## Phase 4: Private Encrypted Pools (after Phase 3)

### Task 4.1: Pool key management
- [x] Generate AES-256 pool key on pool creation (`EncryptedPoolKeyManager.createPool()`)
- [x] ECIES-encrypt per member (`addMember()` wraps key for each member's public key)
- [x] Key rotation on member removal (`removeMemberAndRotateKey()` generates new key, re-wraps for remaining members)

### Task 4.2: Encrypted read/write
- [x] Encrypt data with pool key (`encrypt()` uses AES-256-GCM)
- [x] Decrypt data with pool key (`decrypt()` uses AES-256-GCM)
- [x] Decrypt old data with specific key version (`decryptWithVersion()`)

### Task 4.3: Adversarial E2E Tests for Encrypted Pools (NO MOCKS — real AES-256-GCM + ECIES)
- [x] **Test: Non-member cannot read** — Node without pool key cannot decrypt pool data
- [x] **Test: Added member can read** — Member added to pool can decrypt data
- [x] **Test: Key rotation excludes removed member** — After rotation, removed member cannot decrypt new data
- [x] **Test: Old data still readable** — After rotation, remaining members can read old data with old key version
- [x] **Test: Tampered ciphertext detected** — Modified ciphertext rejected by AES-GCM auth tag
- [x] **Test: Wrong key cannot decrypt** — Data from one pool cannot be decrypted with another pool's key
- [x] **Test: Key version tracking** — Rotation creates new version, marks old as inactive

### Task 5: Update documentation

- [x] Update API documentation (docs/api-reference/pool-admin-api.md)

- [x] Update architecture documentation (docs/architecture/member-pool-security.md)

- [x] Update any other relevant documentation or academic papers (updated brightchain.md pool ACL section with content-hash signatures and audit ledger; updated brightdb.md Write Access Control with auto-signing and ILocalSigner)

## Phase 5: Security Audit Fixes (Critical)

Findings from the adversarial security audit (`.kiro/specs/member-pool-security/security-audit.md`).

### Task 5.1: ACL signature must cover full document content (CRITICAL)
- [x] Create `computeAclContentHash()` — SHA-256 of scope + version + mode + sorted writers + sorted admins
- [x] Update `createMemberPoolAcl()` to use `computeAclContentHash()` for signing
- [x] Update `addNodeToAcl()` to use `computeAclContentHash()` for signing
- [x] Update `removeNodeFromAcl()` to use `computeAclContentHash()` for signing
- [x] Update `loadPoolSecurity()` to verify signature using `computeAclContentHash()` on load
- [x] Update `WriteAclManager.verifyAdminSignature()` to use full content hash — now includes writers + admins lists in the signature payload, matching `computeAclContentHash()`. All 81 brightchain-db tests updated and passing.
- [x] **Test: Tampered writers list detected** — Attacker modifies authorizedWriters in stored ACL → signature verification fails on load (loadPoolSecurity returns null)
- [x] **Test: Tampered ACL signature detected** — Modified ACL content → computeAclContentHash produces different hash → signature invalid

### Task 5.2: Enforce WebSocket authentication (CRITICAL)
- [x] Add production warning when `requireAuth=false`
- [x] Add auth timeout — close unauthenticated connections after 10 seconds
- [x] Add `setBanCheck()` callback — refuse connections from banned public keys during auth
- [x] **Test: Unauthenticated WebSocket connection rejected** — Connection without auth message closed after 10s timeout
- [x] **Test: Banned node WebSocket connection refused** — Banned public key attempts auth, connection closed
- [x] **Test: Authenticated connection accepted** — Valid ECDSA signature, auth_success response
- [x] **Test: Invalid signature rejected** — Garbage signature, connection closed
- [x] **Test: Pre-auth messages rejected** — Gossip batch before auth, connection closed

### Task 5.3: Sign critical gossip announcement types (HIGH)
- [x] `pool_join_approved` already carries `aclSignature` and `approverPublicKey` in metadata
- [x] `acl_update` already carries `aclBlockId` pointing to signed ACL document
- [x] Add `verifyApproval()` to `NodeAdmissionService` — checks approver is admin + signature present
- [x] **Test: Unsigned pool_join_approved ignored** — Approval from non-admin → verifyApproval returns false
- [x] **Test: Valid admin approval accepted** — Approval from admin → verifyApproval returns true
- [x] **Test: Wrong announcement type rejected** — Non-approval type → verifyApproval returns false

## Phase 6: Ledger Integration for Member Pool

Wire the existing `Ledger` class (from `brightchain-lib`) into the member pool write path as a mandatory audit trail. Every write to the member pool gets a corresponding signed, hash-chained ledger entry.

### Task 6.1: Create member pool ledger on cluster init
- [x] `MemberPoolLedgerService` created with initialize/recordWrite/recordAclChange
- [x] `KeyPairLedgerSigner` created with DER-to-raw signature conversion for real ECDSA keys
- [x] Ledger exports added to brightchain-lib main index
- [x] Genesis entry with system user as admin signer
- [x] Wire into inituserdb to persist ledger alongside pool security config (added to BrightChainMemberInitService.initialize)

### Task 6.2: Wire ledger into the BrightDB write path
- [x] `encodeLedgerPayload()` binary encoding for operation type + collection + docId + headBlockId
- [x] `recordWrite()` appends signed ledger entry after each write
- [x] `recordAclChange()` records ACL changes in the ledger
- [x] Hook into Collection writes via AuthorizedHeadRegistry.setOnWriteCallback — every successful setHead fires the ledger recordWrite

### Task 6.3: Load ledger on runtime startup
- [x] `MemberPoolLedgerService.initialize()` loads existing ledger via `Ledger.load()`
- [x] Idempotent — does not create duplicate genesis on restart
- [x] Validate chain on startup (background timer — 5s delay, logs result)
- [x] Expose ledger length and Merkle root on admin dashboard (added auditLedger field to IAdminDashboardData)

### Task 6.4: Ledger entries for ACL changes
- [x] `recordAclChange()` records node admission/ban events

### Task 6.5: Ledger replication via gossip
- [x] Gossip ledger entry hash + sequence number on append (LedgerEntryMetadata type + createLedgerEntryAnnouncement helper + GossipService handler)
- [x] Receiving nodes verify and append to local copy (shouldFetchLedgerEntry validates sequence, ledger ID, gap detection)
- [x] Consistency proofs during reconciliation (createLedgerReconciliationRequest determines full_sync vs consistency_proof)

### Task 6.6: Pool config option for ledger
- [x] `auditLedger: boolean` parameter on `MemberPoolLedgerService` constructor (default: true)
- [x] Disabled ledger skips all operations

### Task 6.7: Adversarial E2E Tests for Ledger (NO MOCKS — real ECDSA keys)
- [x] **Test: Every write produces a ledger entry** — Insert a document, verify ledger length increases
- [x] **Test: Ledger entries are signed** — Verify each entry's signature and signer public key matches system user
- [x] **Test: Merkle root changes with each write** — Root changes after each append
- [x] **Test: Inclusion proof verifies** — Get inclusion proof, static verification succeeds
- [x] **Test: Disabled ledger does nothing** — Disabled service records nothing
- [x] **Test: ACL change recorded** — ACL changes increase ledger length
- [x] **Test: Ledger survives restart** — Initialize twice on same store, loads existing, no duplicate genesis
- [x] **Test: Tampered ledger entry detected** — Chain hash linkage verified, any modification breaks the chain
- [x] **Test: Consistency proof verifies** — Get consistency proof between two states, static verification succeeds
- [x] **Test: Unauthorized ledger append rejected** — Non-admin tries to append, rejected with authorization error


## Phase 7: Security Audit Re-evaluation Fixes

Findings from the April 2026 re-evaluation of the security audit against actual source code.

### Task 7.1: Wire ACL signature verification into runtime startup (CRITICAL)
- [x] `databaseInit.ts` `setupPoolSecurity()` must use `loadPoolSecurity(db, authenticator)` instead of reading raw document + `deserializeAclDocument()`
- [x] The `ECDSANodeAuthenticator` is already created in that function — pass it to `loadPoolSecurity()`
- [x] If `loadPoolSecurity()` returns null (invalid signature), log a CRITICAL security warning and refuse to start with pool security enabled
- [x] **Test: Runtime startup rejects tampered ACL** — Modify stored ACL in `__pool_security__`, restart, verify startup refuses to enable pool security

### Task 7.2: Wire ACL signature verification into init service (CRITICAL)
- [x] `brightchain-member-init.service.ts` `initialize()` must pass authenticator to `loadPoolSecurity(db, authenticator)` when loading existing ACLs
- [x] Create the `ECDSANodeAuthenticator` before calling `loadPoolSecurity()` (currently created after)
- [x] **Test: Init service rejects tampered existing ACL** — Tamper with stored ACL, run init, verify it creates a fresh ACL instead of using the tampered one

### Task 7.3: Make `loadPoolSecurity()` authenticator parameter required (CRITICAL)
- [x] Change `authenticator?:` to `authenticator:` in the function signature
- [x] Update all call sites to pass an authenticator
- [x] This prevents future callers from accidentally skipping verification

### Task 7.4: `verifyApproval()` must verify signature cryptographically (HIGH)
- [x] Add `authenticator` parameter to `NodeAdmissionService` constructor (or `verifyApproval()` method)
- [x] After checking admin list membership, verify `approval.aclSignature` against the approval payload using `authenticator.verifySignature()`
- [x] Define the approval payload format (e.g., `SHA-256(nodeId:poolId:approverPublicKey)`)
- [x] **Test: Forged approverPublicKey rejected** — Set `approverPublicKey` to a known admin's key but provide a garbage signature → `verifyApproval()` returns false
- [x] **Test: Valid signature from admin accepted** — Real admin signs the approval → `verifyApproval()` returns true

### Task 7.5: Change `requireAuth` default to `true` (HIGH)
- [x] `WebSocketMessageServer` constructor: change `requireAuth = false` to `requireAuth = true`
- [x] Update all test call sites that need the insecure path to explicitly pass `false`
- [x] **Test: Default constructor requires auth** — Create server with no args, connect without auth, verify connection is closed after 10s

### Task 7.6: Remove or implement `shouldDropAnnouncement()` stub (MEDIUM)
- [x] Option A: Add a `nodeIdToPublicKey` resolver to the `BanEnforcementService` constructor and use it in `shouldDropAnnouncement()`
- [x] Option B: Remove the stub method entirely (callers should use `createGossipFilter()` instead)
- [x] If Option A: **Test: shouldDropAnnouncement drops banned node's announcements**

### Task 7.7: Zero private keys on disposal (LOW)
- [x] Add `dispose()` method to `BrightChainMemberInitService` that zeros `_systemPrivateKey`
- [x] Zero the `systemPrivateKey` Uint8Array in `databaseInit.ts` after passing it to `setLocalSigner()`
- [x] Use `crypto.getRandomValues()` or `Uint8Array.fill(0)` to overwrite key bytes

### Task 7.8: Document nonce replay protection design decision (LOW)
- [x] Add a comment in `verifyWriteProof()` explaining that replay protection comes from block-specific binding (content-addressed blockId changes on each write), not from nonce uniqueness tracking
- [x] Either: add a seen-nonce set for defense-in-depth, OR document that the nonce's purpose is signature uniqueness (preventing two writes to the same block from producing identical signatures)
