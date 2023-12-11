# Member Pool Security — Design

## Overview

This design secures the BrightChain member pool by wiring the existing pool encryption and ACL infrastructure into the member pool initialization, node admission, and ban enforcement flows.

## Phase 1: Secure Member Pool Initialization

### Changes to `IBrightChainMemberInitConfig`

Add optional pool security fields:

```typescript
export interface IBrightChainMemberInitConfig {
  memberPoolName: string;
  blockStorePath?: string;
  useMemoryStore?: boolean;
  blockSize?: BlockSize;
  blockStoreLabel?: string;

  // NEW: Pool security configuration
  poolEncryption?: {
    enabled: boolean;                    // default: true for new clusters
    systemUserPublicKey: Uint8Array;     // system user's ECIES public key
  };
}
```

### Changes to `BrightChainMemberInitService.initialize()`

When `poolEncryption.enabled` is true and the pool is being created for the first time (not already initialized):

1. Generate a 256-bit random symmetric key using `crypto.randomBytes(32)`
2. Create an `IPoolEncryptionConfig` with `mode: EncryptionMode.PoolShared`, `currentKeyVersion: 1`, and one `IKeyVersion` entry containing the symmetric key ECIES-encrypted for the system user
3. Create an `IPoolACL` with the system user as Admin
4. Store both as documents in a `__pool_security__` collection in the BrightDB
5. Configure the `WriteAclManager` with the pool encryption mode and member keys
6. Pass `writeAclConfig` to the `BrightDb` constructor using an `EcdsaNodeAuthenticator` initialized with the system user's key pair

### Pool Security Document Schema

```typescript
// Stored in __pool_security__ collection
interface IPoolSecurityDocument {
  _id: 'pool_encryption_config' | 'pool_acl';
  type: 'encryption_config' | 'acl';
  data: IPoolEncryptionConfig | IPoolACL;
  updatedAt: Date;
  updatedBy: string; // system user ID
}
```

### Changes to `inituserdb/src/main.ts`

After building the RBAC input (which derives the system user's public key from the mnemonic), pass the public key to the init config:

```typescript
const initConfig: IBrightChainMemberInitConfig = {
  memberPoolName: bcEnv.memberPoolName,
  blockStorePath: bcEnv.blockStorePath,
  useMemoryStore: bcEnv.useMemoryDocumentStore,
  blockSize: bcEnv.blockStoreBlockSize,
  poolEncryption: {
    enabled: true,
    systemUserPublicKey: buildResult.members.system.publicKey, // Uint8Array
  },
};
```

### Backward Compatibility

- If `poolEncryption` is not provided, the init service behaves exactly as today (no encryption, no ACL). This preserves backward compatibility for dev/test environments.
- The `DEV_DATABASE` mode (in-memory ephemeral) skips pool encryption by default.

## Phase 2: Node Admission Protocol

### Admission Flow

```
New Node                    Admin Node
   |                            |
   |--- JOIN_REQUEST ---------> |  (via gossip: node ID, public key, pool ID)
   |                            |  Admin reviews request
   |                            |  (manual approval or auto-approve policy)
   |<-- JOIN_APPROVED --------- |  (ECIES-encrypted pool key, updated ACL)
   |                            |
   |--- ACK -----------------> |
   |                            |
   |  (triggers reconciliation to sync pool data)
```

### New Gossip Message Types

Add to `BlockAnnouncement.type`:
- `pool_join_request` — new node requests pool access
- `pool_join_approved` — admin grants access (contains encrypted pool key)
- `pool_join_denied` — admin denies access

### API Endpoint

`POST /admin/pool/approve-node` — Admin UI action to approve a pending join request.

### ACL Propagation

When an admin approves a join request:
1. Add the new node to the `IPoolACL` with Read/Write/Replicate permissions
2. ECIES-encrypt the current pool symmetric key for the new node's public key
3. Add a new entry to `IPoolEncryptionConfig.keyVersions[current].encryptedKeys`
4. Gossip the updated ACL to all pool members via `announceAclUpdate()`
5. Send the encrypted pool key directly to the new node via the `pool_join_approved` message

## Phase 3: Ban Enforcement

### On Ban Enactment

When a `BAN_MEMBER` proposal is enacted (vote threshold + cooling period):

1. Remove the banned node from the member pool ACL
2. Rotate the pool symmetric key:
   - Generate a new 256-bit key
   - ECIES-encrypt it for all remaining pool members
   - Add as a new `IKeyVersion` with incremented version number
   - Mark the old key version as `active: false`
3. Gossip the updated ACL and new key version to all pool members
4. New writes use the new key; old blocks remain readable with the old key (which the banned node still has, but they can't get new data)

### Network-Layer Enforcement

Add ban list checks to:
- `GossipService.handleAnnouncement()` — drop announcements from banned nodes
- `IPeerProvider` implementations — refuse connections from banned node IDs
- `ReconciliationService.reconcile()` — skip banned peers

### Ban List Propagation

Ban records are already gossiped via `brightTrust_proposal` and `brightTrust_vote` announcement types. Add a `ban_enacted` announcement type that carries the signed `IBanRecord` so all nodes can update their local ban list cache.

## Phase 4: Private Encrypted Pools

### Pool Key Management

Private pools use `EncryptionMode.PoolShared` with AES-256-GCM:

1. **Pool creation** — `EncryptedPoolKeyManager.createPool()` generates a random AES-256 symmetric key
2. **Member addition** — `addMember()` ECIES-encrypts the pool key for the new member's public key
3. **Member removal + key rotation** — `removeMemberAndRotateKey()` generates a new key and re-wraps it for all remaining members
4. **Versioned keys** — Each rotation creates a new `IKeyVersion` with incremented version number; old versions marked inactive but retained for reading historical data

### Encrypted Read/Write

- `encrypt(data)` — AES-256-GCM encryption with the current pool key
- `decrypt(ciphertext)` — AES-256-GCM decryption with the current pool key
- `decryptWithVersion(ciphertext, version)` — Decrypt old data with a specific key version

### Security Properties

- Non-members cannot decrypt pool data (no access to any key version)
- Removed members lose access to new data (key rotation) but retain access to data encrypted with old key versions they previously held
- AES-GCM authentication tags detect ciphertext tampering
- Cross-pool key isolation — each pool has an independent key hierarchy

## Phase 5: Security Audit Fixes

Findings from the adversarial security audit (`security-audit.md`). All fixes implemented and tested.

### ACL Signature Full Content Coverage (CRITICAL)

`computeAclContentHash()` computes SHA-256 over the full ACL content: scope + version + mode + sorted writers + sorted admins. This hash is used for all ACL signing and verification operations:

- `createMemberPoolAcl()` — signs with full content hash
- `addNodeToAcl()` / `removeNodeFromAcl()` — re-signs with full content hash
- `loadPoolSecurity()` — verifies signature using full content hash on load; returns null if invalid
- `WriteAclManager.verifyAdminSignature()` — uses full content hash matching `computeAclContentHash()`

This prevents an attacker from modifying the writers list without invalidating the signature.

### WebSocket Authentication Enforcement (CRITICAL)

- Production warning logged when `requireAuth=false`
- Auth timeout — unauthenticated connections closed after 10 seconds
- `setBanCheck()` callback — refuse connections from banned public keys during ECDSA challenge-response auth
- Pre-auth messages (gossip batches before authentication) cause immediate connection close

### Signed Critical Gossip Announcements (HIGH)

- `pool_join_approved` carries `aclSignature` and `approverPublicKey` in metadata
- `acl_update` carries `aclBlockId` pointing to the signed ACL document in the block store
- `verifyApproval()` on `NodeAdmissionService` checks that the approver is an admin and the signature is present

## Phase 6: Ledger Integration

Wire the existing `Ledger` class (from `brightchain-lib`) into the member pool write path as a mandatory audit trail.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BrightDB Write Path                      │
│                                                             │
│  Collection.insertOne() → store block → setHead()           │
│                                          │                  │
│                              ┌───────────▼──────────────┐   │
│                              │ AuthorizedHeadRegistry    │   │
│                              │   onWriteCallback ────────┼───┤
│                              └───────────────────────────┘   │
│                                                              │
│                              ┌───────────▼──────────────┐   │
│                              │ MemberPoolLedgerService   │   │
│                              │   recordWrite()           │   │
│                              │   recordAclChange()       │   │
│                              └───────────┬──────────────┘   │
│                                          │                  │
│                              ┌───────────▼──────────────┐   │
│                              │ Ledger (brightchain-lib)  │   │
│                              │   append-only chain       │   │
│                              │   Merkle tree overlay     │   │
│                              └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### MemberPoolLedgerService

- `initialize(store, signer, ledgerId)` — Creates or loads the ledger. Genesis entry signed by system user. Idempotent on restart.
- `recordWrite(collection, docId, headBlockId)` — Appends a signed ledger entry after each write via `AuthorizedHeadRegistry.setOnWriteCallback`
- `recordAclChange(changeType, nodeId)` — Records ACL changes (node admission, ban) as governance entries
- `encodeLedgerPayload()` — Binary encoding: operation type + collection + docId + headBlockId

### KeyPairLedgerSigner

Bridges real ECDSA key pairs to the `ILedgerSigner` interface with DER-to-raw signature conversion.

### Startup Behavior

1. `MemberPoolLedgerService.initialize()` loads existing ledger via `Ledger.load()`
2. Idempotent — does not create duplicate genesis on restart
3. Background timer (5s delay) validates chain integrity, logs result
4. Ledger length and Merkle root exposed on admin dashboard (`IAdminDashboardData.auditLedger`)

### Gossip Replication

- `createLedgerEntryAnnouncement()` — Gossips ledger entry hash + sequence number on each append
- `shouldFetchLedgerEntry()` — Receiving nodes validate sequence, ledger ID, detect gaps
- `createLedgerReconciliationRequest()` — Determines full_sync vs consistency_proof during reconciliation

### Configuration

`auditLedger: boolean` parameter on `MemberPoolLedgerService` constructor (default: `true`). When disabled, all ledger operations are no-ops.

## Security Considerations

1. The pool symmetric key is never stored in plaintext — it's always ECIES-encrypted per member.
2. Key rotation on ban ensures forward secrecy — the banned node cannot decrypt new data even if they retained the old key.
3. The `AuthorizedHeadRegistry` prevents unauthorized writes even if a node has the raw blocks — they can't update head pointers without a valid signature.
4. The raw XOR'd TUPLE blocks in the storage layer remain unreadable without the pool key, so open block replication doesn't leak member data.
5. The pool ACL is signed (not encrypted) so any node can verify permissions without needing the pool key. This prevents a chicken-and-egg problem where you'd need the key to check if someone should have the key.
6. Pool Admin promotion requires BrightTrust vote — a single compromised admin cannot grant admin to accomplices.
7. The recipient lookup service exposes only boolean existence checks (email → exists/not-exists), not member data, so it can remain unauthenticated for Postfix integration.
8. ACL signatures cover the full document content (writers, admins, scope, version, mode) via `computeAclContentHash()` — prevents writers list tampering without invalidating the signature.
9. WebSocket connections require ECDSA challenge-response authentication with a 10-second timeout for unauthenticated connections.
10. The audit ledger provides a tamper-evident, hash-chained history of all member pool writes with O(log N) Merkle inclusion proofs for light client verification.
11. System user private keys are protected via tiered keyring: Secure Enclave → OS Keyring → in-memory fallback.
12. Gossip rate limiting (per-peer sliding window) prevents announcement flooding from malicious peers.
13. Write proof nonces (monotonic counter) prevent replay attacks on write proofs.
