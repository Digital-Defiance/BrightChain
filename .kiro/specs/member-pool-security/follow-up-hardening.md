# Member Pool Security — Follow-Up Hardening

Issues discovered during the member pool security spec. Status tracked below.

## 1. Reconciliation Block Verification ✅
**Severity:** Medium
**Status:** Done
**Location:** `banEnforcementService.ts` — `verifyReconciliationBlocks()`
**Fix:** Added `verifyReconciliationBlocks()` function that samples a configurable fraction (default 10%) of claimed blocks and verifies they exist in the local store. Returns success rate for peer trust scoring.

## 2. System User Private Key Protection ✅
**Severity:** High
**Status:** Done (infrastructure built, wired into startup)
**Fix:** Tiered key protection with automatic platform detection:
- **Tier 1: Secure Enclave** (macOS Apple Silicon) — `SecureEnclaveKeyring` (pre-existing)
- **Tier 2: OS Keyring** (Linux/macOS/Windows) — `KeytarKeyring` (new)
- **Tier 3: In-memory** (fallback) — key re-derived from `SYSTEM_MNEMONIC` each startup
- `keyringFactory.ts` — `detectBestKeyring()` auto-detects best tier
- `databaseInit.ts` — stores system key in detected keyring after derivation

## 3. Gossip Rate Limiting ✅
**Severity:** Medium
**Status:** Done
**Location:** `gossipRateLimiter.ts`
**Fix:** `GossipRateLimiter` class with per-peer sliding window rate limiting. Default: 100 announcements per 10 seconds. Persistent offenders (3+ violations) temporarily blocked for 5 minutes. All configurable.

## 4. Head Registry Direct Access Guard ✅
**Severity:** Low
**Status:** Done (by construction)
**Analysis:** The `BrightDb` constructor creates `baseRegistry` as a local variable, wraps it in `AuthorizedHeadRegistry` when `writeAclConfig` is set, and stores only the wrapper as `this.headRegistry`. The `getHeadRegistry()` method returns `this.headRegistry`. There is no way to access the unwrapped inner registry from outside the constructor. The guard is inherent in the design.

## 5. Write Proof Nonce ✅
**Severity:** Low
**Status:** Done
**Fix:** Made `nonce` a required field on `IWriteProof`. `createWriteProofPayload()` now includes the nonce in the signature payload: `SHA-256(dbName:collectionName:blockId:nonce)`. The `AuthorizedHeadRegistry` maintains a monotonic `nonceCounter` that increments on each auto-signed write. All 144 tests updated and passing.

## 6. Persistent Pending Join Requests ✅
**Severity:** Low
**Status:** Done
**Location:** `nodeAdmissionService.ts`
**Fix:** Added `persistPendingRequests(db)` and `loadPendingRequests(db)` methods that store/load pending requests in a `__pending_join_requests__` BrightDB collection. Call `loadPendingRequests()` on startup and `persistPendingRequests()` after each new request.
