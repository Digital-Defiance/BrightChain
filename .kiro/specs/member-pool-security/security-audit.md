# Member Pool Security — Adversarial Security Audit

## Audit Date: April 2026 (original), April 2026 (re-evaluation)
## Scope: All write paths, gossip handling, peer connections, ACL management, key storage

---

## CRITICAL Vulnerabilities

### 1. WebSocket nodeId extraction — No cryptographic proof of peer identity
**Location:** `webSocketMessageServer.ts`
**Issue:** Node ID is extracted from the WebSocket URL path via regex (`/([^/?]+)`). When `requireAuth=false`, any peer can claim any nodeId by connecting to `ws://host/arbitrary-node-id`.
**Impact:** An attacker can impersonate any node on the network.
**Original Fix:** ALWAYS require authentication. Remove the `requireAuth=false` path for production.
**Status:** PARTIALLY FIXED (Task 5.2)
**What was done:**
- Production warning logged when `requireAuth=false`
- 10-second auth timeout for unauthenticated connections when `requireAuth=true`
- `setBanCheck()` callback refuses banned public keys during auth
- Pre-auth messages cause immediate connection close
- 5 adversarial tests passing
**Remaining issue:** The constructor still defaults `requireAuth = false`. The comment says "Default to requiring authentication in production" but the actual default is `false`. Any caller that forgets to pass `true` gets an insecure server. This should be `requireAuth = true` with an explicit opt-out for dev/test.

### 2. Pool security document loaded without signature verification
**Location:** `poolSecurityService.ts` `loadPoolSecurity()`
**Issue:** The ACL document is loaded from `__pool_security__` and deserialized without verifying the `creatorSignature`.
**Impact:** Attacker could grant themselves write access by modifying the persisted ACL.
**Original Fix:** Verify `creatorSignature` against `creatorPublicKey` on load.
**Status:** PARTIALLY FIXED (Task 5.1)
**What was done:**
- `computeAclContentHash()` covers full document content (writers, admins, scope, version, mode)
- `loadPoolSecurity()` verifies signature when an `authenticator` is passed
- 2 adversarial tests passing
**Remaining issues:**
- **`loadPoolSecurity()` authenticator parameter is optional** — callers can omit it and skip verification entirely
- **`databaseInit.ts` (runtime startup) DOES NOT call `loadPoolSecurity()` at all** — it reads the raw document from `__pool_security__`, calls `deserializeAclDocument()` directly, and never verifies the signature. This means the runtime startup path — the most important one — has NO signature verification on the ACL.
- **`brightchain-member-init.service.ts` calls `loadPoolSecurity(db)` without passing an authenticator** — so signature verification is skipped during init too.
- The fix exists in the code but is not wired into the two most critical call sites.

---

## HIGH Vulnerabilities

### 3. Head registry mergeHeadUpdate — timestamp-only conflict resolution
**Location:** `headRegistry.ts` `mergeHeadUpdate()`
**Issue:** Uses only timestamp comparison for last-write-wins. A malicious peer can send a head update with a future timestamp to override legitimate local heads.
**Impact:** Attacker can overwrite head pointers to point to malicious blocks.
**Status:** FIXED (by construction)
**Analysis:** The `BrightDb` constructor creates `baseRegistry` as a local variable, wraps it in `AuthorizedHeadRegistry` when `writeAclConfig` is set, and stores only the wrapper as `this.headRegistry`. The `getHeadRegistry()` method returns `this.headRegistry`. There is no way to access the unwrapped inner registry from outside the constructor. The `AuthorizedHeadRegistry.mergeHeadUpdate()` calls `authorizeWrite()` before delegating to the inner registry, so write proofs are always verified before timestamp comparison runs.

### 4. Gossip announcement nodeId trusted without verification
**Location:** `gossipService.ts` `handleAnnouncement()`
**Issue:** `announcement.nodeId` is a string that's never cryptographically verified. Any peer can set any nodeId in their announcements.
**Impact:** Attacker can spoof announcements as if they came from a trusted node.
**Status:** PARTIALLY FIXED (Task 5.3)
**What was done:**
- `pool_join_approved` carries `aclSignature` and `approverPublicKey` in metadata
- `acl_update` carries `aclBlockId` pointing to signed ACL document
- `verifyApproval()` added to `NodeAdmissionService`
**Remaining issue:** `verifyApproval()` only checks that the `approverPublicKey` is in the admin list — it does NOT cryptographically verify the `aclSignature`. An attacker who knows an admin's public key (which is in the ACL, a signed-but-not-encrypted document) can forge an approval by setting `approverPublicKey` to the admin's key without actually having the admin's private key. The method should verify the signature over the approval payload using the authenticator.

### 5. System private key stored as plain Uint8Array in memory
**Location:** `brightchain-member-init.service.ts` `this._systemPrivateKey`
**Issue:** Private key is stored in memory with no encryption or protection.
**Impact:** Attacker with process access can extract the signing key and forge write proofs.
**Status:** INFRASTRUCTURE BUILT, NOT FULLY WIRED
**What was done:**
- `keyringFactory.ts` — `detectBestKeyring()` auto-detects best tier: Secure Enclave → OS Keyring → in-memory fallback
- `KeytarKeyring` for OS credential store integration
**Remaining issues:**
- `databaseInit.ts` reads `systemPrivateKeyHex` from the environment and converts it to a `Uint8Array` that lives in memory for the process lifetime. The keyring is available but the private key is still held as a plain `Uint8Array` in the `setupPoolSecurity` closure and passed to `setLocalSigner()`.
- `brightchain-member-init.service.ts` stores the private key as `this._systemPrivateKey` (a plain `Uint8Array` class field) for the lifetime of the service.
- Neither call site uses the keyring to retrieve the key on-demand instead of holding it in memory. The keyring infrastructure exists but the "use keyring instead of holding key in memory" pattern is not implemented.
- The key is never zeroed on disposal.

---

## MEDIUM Vulnerabilities

### 6. Reconciliation trusts peer block claims without verification
**Location:** `reconciliationService.ts` `reconcileWithPeer()`
**Issue:** When a peer claims to have blocks in their manifest, the local node updates its location metadata without verifying the blocks actually exist.
**Impact:** Malicious peer can pollute location metadata with fake block references.
**Status:** FIXED (follow-up-hardening item 1)
**What was done:** `verifyReconciliationBlocks()` function samples a configurable fraction (default 10%) of claimed blocks and verifies they exist in the local store. Returns success rate for peer trust scoring.
**Note:** The function verifies blocks exist in the *local* store, not that the *peer* actually has them. This is a reasonable first step but doesn't fully address the original issue of a peer *claiming* to have blocks it doesn't. A more complete fix would fetch a sample from the peer and verify content hashes.

### 7. ACL setAcl has no replay protection
**Location:** `writeAclManager.ts` `setAcl()`
**Issue:** Monotonically increasing version numbers prevent downgrade, but an old valid ACL with a higher version number could theoretically be replayed if the version counter is reset.
**Status:** ACCEPTABLE
**Analysis:** Version numbers are checked (`aclDoc.version <= currentAcl.version` → reject). This is sufficient as long as the current version is persisted correctly.

### 8. Ban enforcement gossip filter allows unknown nodes
**Location:** `banEnforcementService.ts` `createGossipFilter()`
**Issue:** When `nodeIdToPublicKey()` returns null (unknown node), the filter allows the announcement through.
**Impact:** Banned node could create a new identity and bypass the ban filter.
**Status:** ACCEPTABLE (by design — open storage layer)
**Analysis:** This is inherent to open networks. The real protection is that the new identity won't be in the pool ACL, so they can't write. Gossip rate limiting (follow-up item 3) mitigates spam from unknown nodes.

### 9. Write proof nonce provides no replay protection
**Location:** `writeAclManager.ts` `verifyWriteProof()`, `authorizedHeadRegistry.ts`
**Issue (NEW):** The nonce is included in the signature payload (so a different nonce produces a different signature), but `verifyWriteProof()` never checks that the nonce hasn't been seen before. There is no nonce tracking, no seen-nonce set, no monotonic nonce verification on the receiving side. The nonce is generated monotonically on the *sending* side (`++this.nonceCounter`) but the *verifying* side just includes `proof.nonce` in the payload hash and verifies the signature — it doesn't check that the nonce is fresh or unique.
**Impact:** A valid write proof can be replayed if the attacker can present it for the same `(dbName, collectionName, blockId)` tuple. In practice, the blockId changes on each write (content-addressed), so replay of the exact same proof would only succeed for the exact same block — which is idempotent. However, this means the nonce provides no additional security beyond what the block-specific binding already provides.
**Status:** DESIGN GAP — nonce exists but is not verified for uniqueness/freshness on the receiving side
**Severity:** Low (mitigated by block-specific binding — replaying a proof for the same block is idempotent)

### 10. `shouldDropAnnouncement` is a stub
**Location:** `banEnforcementService.ts` `shouldDropAnnouncement()`
**Issue (NEW):** The method contains `return false; // Placeholder — requires nodeId → publicKey mapping`. It never actually drops announcements from banned nodes. The `createGossipFilter()` method works correctly (it takes a `nodeIdToPublicKey` resolver), but the convenience method `shouldDropAnnouncement()` that takes a raw `BlockAnnouncement` is a non-functional stub.
**Impact:** Low — `createGossipFilter()` is the intended integration point and works correctly. But the stub method could mislead callers into thinking ban enforcement is active when it isn't.
**Status:** NEEDS FIX (trivial — either implement with a stored resolver or remove the stub)
**Severity:** Low

---

## Fixes Required (Priority Order)

### Must Fix (security gaps in implemented code)

1. **CRITICAL: Wire ACL signature verification into runtime startup** — `databaseInit.ts` `setupPoolSecurity()` must call `loadPoolSecurity(db, authenticator)` instead of reading the raw document and calling `deserializeAclDocument()` directly. The authenticator is already created in that function — it just needs to be used.

2. **CRITICAL: Wire ACL signature verification into init service** — `brightchain-member-init.service.ts` must pass the authenticator to `loadPoolSecurity(db, authenticator)` when loading existing ACLs.

3. **HIGH: `verifyApproval()` must verify the signature cryptographically** — Currently only checks admin list membership. Must call `authenticator.verifySignature()` on the `aclSignature` field to prove the approval actually came from the claimed admin.

4. **HIGH: Change `requireAuth` default to `true`** — `WebSocketMessageServer` constructor should default to `requireAuth = true`. Callers that need the insecure path for dev/test should explicitly pass `false`.

### Should Fix (defense-in-depth)

5. **MEDIUM: Remove or implement `shouldDropAnnouncement()` stub** — Either wire in a `nodeIdToPublicKey` resolver or remove the method to avoid misleading callers.

6. **LOW: Zero private keys on disposal** — Add `dispose()` methods to `BrightChainMemberInitService` and the `setupPoolSecurity` closure that zero the `Uint8Array` contents of private keys.

### Acceptable / Deferred

7. **LOW: Nonce replay tracking** — The nonce provides no additional replay protection beyond block-specific binding. Either add a seen-nonce set on the verifier side, or document that replay protection comes from block-specific binding and the nonce is purely for signature uniqueness.

8. **LOW: Reconciliation block verification scope** — `verifyReconciliationBlocks()` checks local store, not peer claims. A more complete fix would fetch samples from the peer. Acceptable for now.

9. **LOW: Keyring integration for runtime key holding** — The keyring infrastructure exists but keys are still held as plain `Uint8Array` in memory. Acceptable risk for now — the key must be in memory to sign.

---

## Previously Fixed (Verified)

- ✅ Head registry inner access guard (by construction — BrightDb wraps and hides inner registry)
- ✅ Gossip rate limiting (`GossipRateLimiter` with per-peer sliding window, 100/10s default, 5-min block after 3 violations)
- ✅ Persistent pending join requests (`persistPendingRequests` / `loadPendingRequests` on `NodeAdmissionService`)
- ✅ `computeAclContentHash()` covers full ACL content (writers + admins + scope + version + mode)
- ✅ `WriteAclManager.createAclMutationPayload()` matches `computeAclContentHash()` format
- ✅ `AuthorizedHeadRegistry` auto-signing with monotonic nonce counter
- ✅ Audit ledger with hash-chained entries, Merkle proofs, background validation on startup
- ✅ Ban enforcement: `createGossipFilter()`, `shouldRefuseConnection()`, `filterBannedPeers()` all functional
- ✅ Tiered keyring detection infrastructure (`detectBestKeyring()`)
