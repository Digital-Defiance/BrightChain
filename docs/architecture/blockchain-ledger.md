---
title: "Block Chain Ledger"
parent: "Architecture & Design"
nav_order: 11
permalink: /docs/architecture/block-chain-ledger/
---
# Block Chain Ledger

A general-purpose, append-only blockchain ledger built into `brightchain-lib`. The ledger stores cryptographically chained, digitally signed entries as `RawDataBlock` instances within any `IBlockStore` implementation. It generalizes the hash-chain pattern from `ChainedAuditLogEntry` and `AuditLogService` into a reusable, payload-agnostic ledger with deterministic binary serialization, in-memory indexing, full chain validation, role-based access control with consortium-style governance, and a Merkle tree commitment layer for O(log N) inclusion proofs, consistency proofs, and light client verification.

The governance model is inspired by [Azure Confidential Ledger](https://learn.microsoft.com/en-us/azure/confidential-ledger/overview) and Microsoft's [Confidential Consortium Framework (CCF)](https://microsoft.github.io/CCF/main/overview/governance.html), providing feature parity with three roles (Administrator/Contributor/Reader), configurable BrightTrust policies, member lifecycle states, and on-chain governance audit trails.

## Design Decisions

- **Binary serialization** over JSON — deterministic byte layout eliminates key-ordering ambiguity and is more compact. Big-endian byte order for cross-platform consistency, matching the existing `padToBlockSize` convention.
- **Thin Signer interface** — accepts `Uint8Array` (not `Buffer`) for browser compatibility, decoupled from `IMemberOperational` but compatible via `MemberSignerAdapter`.
- **Single-block-per-entry storage** — each serialized entry is padded to the store's `BlockSize` and stored as one `RawDataBlock`, avoiding CBL whitening complexity.
- **Metadata block** — tracks chain head, length, ledger ID, Merkle root, and frontier for cold-start reconstruction from an `IBlockStore`.
- **On-chain governance** — all access control changes (signer additions, removals, role changes, BrightTrust updates) are recorded as governance entries in the ledger itself, providing a complete audit trail. No out-of-band configuration.
- **Multi-signature BrightTrust** — governance changes require signatures from multiple administrators according to a configurable BrightTrust policy, preventing unilateral modifications.
- **Hybrid linear-chain-plus-Merkle-tree** — the existing linear hash chain is preserved unchanged for ordering and append-only guarantees. A Merkle tree overlay provides O(log N) inclusion proofs, consistency proofs, selective disclosure, and light client support without modifying the per-entry serialization format.
- **Frontier-based incremental Merkle updates** — the Merkle tree uses a frontier (right-spine hashes) for O(log N) per-append updates and O(log N) storage, following the RFC 6962 (Certificate Transparency) approach adapted for SHA3-512.
- **Static proof verification** — inclusion and consistency proof verification methods are static on the `Ledger` class, requiring no `Ledger` instance, `IBlockStore`, or Node.js API. This enables browser-based light client verification.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Public API                         │
│                       Ledger                            │
├──────────┬──────────────────────────────┬───────────────┤
│          │       Internal Services      │               │
│          ├──────────┬───────────────────┤               │
│          │ Entry    │ Chain             │               │
│          │ Serial.  │ Validator         │               │
│          ├──────────┼───────────────────┤               │
│          │ Governance    │ Authorized   │               │
│          │ Payload Ser.  │ SignerSet    │               │
│          ├──────────┴───────────────────┤               │
│          │       Merkle Layer           │               │
│          │ IncrementalMerkleTree        │               │
│          │ ProofSerializer              │               │
│          │ Proof Verification (static)  │               │
├──────────┴──────────────────────────────┴───────────────┤
│                 Existing Infrastructure                  │
│  IBlockStore  RawDataBlock  ChecksumService  Checksum   │
└─────────────────────────────────────────────────────────┘
```

The `Ledger` class is the sole public entry point. It delegates serialization to `LedgerEntrySerializer`, governance payload handling to `GovernancePayloadSerializer`, authorization tracking to `AuthorizedSignerSet`, validation to `LedgerChainValidator`, and Merkle tree management to `IncrementalMerkleTree`. Proof serialization is handled by `ProofSerializer`. Inclusion and consistency proof verification are static methods on `Ledger`, suitable for light clients.

## Merkle Tree Commitment Layer

The ledger maintains a Merkle tree as an overlay on the existing linear hash chain. The tree's leaves are the `entryHash` values (SHA3-512, 64 bytes) from each `ILedgerEntry` — the same hashes that form the linear chain links. The Merkle tree does not modify the per-entry serialization format; it is a parallel commitment structure.

### Relationship Between Linear Chain and Merkle Tree

The linear chain and Merkle tree serve complementary purposes:

| Aspect | Linear Chain | Merkle Tree |
|--------|-------------|-------------|
| **Structure** | Sequential `previousEntryHash` links | Binary tree over `entryHash` leaves |
| **Guarantees** | Ordering, append-only integrity | Membership proofs, state snapshots |
| **Verification** | Walk entire chain O(N) | O(log N) per proof |
| **Use case** | Full chain validation | Light clients, selective disclosure, auditing |

Both structures are built from the same `entryHash` values. The linear chain provides ordering guarantees (each entry links to its predecessor). The Merkle tree provides efficient membership proofs (any entry can be verified against the root without the full chain). Governance entries are treated identically to regular entries in the Merkle tree — the tree depends only on the sequence of `entryHash` values, not payload type.

### IncrementalMerkleTree

The core data structure for the Merkle commitment layer. Uses frontier-based incremental updates following the RFC 6962 (Certificate Transparency) approach, adapted for SHA3-512.

**Internal state:**

| Field | Type | Description |
|-------|------|-------------|
| `leaves` | `Checksum[]` | All leaf hashes in order (for proof generation) |
| `frontier` | `Checksum[]` | Right-spine hashes for O(log N) root computation |
| `cachedRoot` | `Checksum \| null` | Cached current root |
| `_size` | `number` | Number of leaves (independent of `leaves.length` for frontier-only trees) |

**Frontier-based append algorithm** (O(log N) per append):

1. Push `leafHash` onto the frontier
2. Increment size
3. Count trailing zero bits in binary representation of size = `mergeCount`
4. For `mergeCount` iterations: pop right, pop left, push `SHA3-512(left || right)`
5. Recompute `cachedRoot` by folding frontier right-to-left

For a tree with N leaves, the frontier contains exactly `popcount(N)` entries (number of 1-bits in binary N), which is at most `ceil(log2(N)) + 1`.

**Root computation from frontier:**

```
if frontier is empty: return SHA3-512(empty bytes)
result = frontier[last]
for i from (frontier.length - 2) down to 0:
  result = SHA3-512(frontier[i] || result)
return result
```

**Static construction methods:**

| Method | Description |
|--------|-------------|
| `fromLeaves(leaves, checksumService)` | Batch construction — produces same root as sequential appends |
| `fromFrontier(frontier, size, checksumService)` | Restore from persisted frontier (root-only, no proof generation) |
| `computeRoot(leaves, checksumService)` | Pure function for verification |

### Frontier Persistence Strategy

The Merkle tree frontier is persisted in the metadata block alongside the Merkle root. On cold start (`Ledger.load()`):

1. Read the persisted frontier and Merkle root from the metadata block
2. Restore the tree via `IncrementalMerkleTree.fromFrontier(frontier, size)`
3. Verify the restored root matches the persisted Merkle root
4. On mismatch, fall back to `IncrementalMerkleTree.fromLeaves()` by reading all entry hashes (logged as a warning, not fatal)

The frontier-restored tree can compute the root and accept further appends immediately, but cannot generate inclusion or consistency proofs (no leaves stored). Full proof generation requires the leaves array, which is populated during the fallback reconstruction or by replaying entries.

### Inclusion Proofs

An inclusion proof demonstrates that a specific entry exists in the ledger at a given Merkle root. The proof is an authentication path from the leaf (entry hash) to the root, consisting of sibling hashes and direction indicators at each level.

**Proof generation** uses the RFC 6962 recursive decomposition: split the N leaves into a left subtree of size k (largest power of 2 < N) and a right subtree of size N-k. Recurse into whichever subtree contains the target leaf, recording the sibling subtree's hash at each level. This guarantees path length = `ceil(log2(N))`, or 0 when N = 1.

**Proof verification** (static, no Ledger instance needed): recompute hashes from the leaf to the root using the sibling hashes and direction indicators. At each step, if the sibling direction is LEFT, compute `SHA3-512(sibling || current)`; if RIGHT, compute `SHA3-512(current || sibling)`. Compare the final result to the expected Merkle root.

### Consistency Proofs

A consistency proof demonstrates that an earlier ledger state (at length M) is a prefix of the current state (at length N), confirming the append-only property was maintained between two points in time.

**Proof generation** follows RFC 6962 Section 2.1.2 (`SUBPROOF(m, D[0:n], b)`). The proof consists of the minimal set of intermediate hashes needed to reconstruct both the earlier and later roots from the same decomposition path.

**Proof verification** (static, no Ledger instance needed): uses the RFC 6962 Section 2.1.4 verification algorithm. The verifier walks the decomposition path, consuming proof hashes to reconstruct both the earlier and later roots, then compares them to the provided values.

Trivial cases: M=0 (empty tree is consistent with any later state) and M=N (same-size trees must have matching roots) require no proof hashes.

### Parallel Subtree Verification

The `LedgerChainValidator` supports parallel verification via `validateAllParallel()`. The chain is split into independent chunks, and hash/signature verification runs concurrently across chunks using `Promise.all`. Governance validation runs as a separate sequential pass (since it requires tracking `AuthorizedSignerSet` state across the chain). Merkle root verification reconstructs the tree from all entry hashes and compares to the stored root. The parallel method produces the same validation result as sequential `validateAll()`.

## Core Types

### ILedgerEntry

The fundamental data structure for a single ledger entry. Uses the `PlatformID` generic pattern for DTO compatibility between frontend and backend.

| Field | Type | Description |
|-------|------|-------------|
| `payload` | `Uint8Array` | Application data (prefixed `0x00`) or governance data (prefixed `0x01`) |
| `previousEntryHash` | `Checksum \| null` | Hash of the preceding entry (`null` for genesis) |
| `entryHash` | `Checksum` | SHA3-512 hash of the entry's hashable content |
| `signature` | `SignatureUint8Array` | SECP256k1 signature over the entryHash |
| `signerPublicKey` | `Uint8Array` | Public key of the signer |
| `timestamp` | `Date` | When the entry was created |
| `sequenceNumber` | `number` | Zero-based position in the chain |

### Merkle Proof Types

#### MerkleDirection

Direction indicator for a sibling hash in a Merkle proof path.

| Value | Meaning |
|-------|---------|
| `LEFT = 0` | Sibling is on the left; current hash is on the right |
| `RIGHT = 1` | Sibling is on the right; current hash is on the left |

#### IMerkleProofStep

A single step in a Merkle authentication path.

| Field | Type | Description |
|-------|------|-------------|
| `hash` | `Checksum` | The sibling hash at this level |
| `direction` | `MerkleDirection` | Whether the sibling is on the left or right |

#### IMerkleProof

An inclusion proof for a single leaf in the Merkle tree.

| Field | Type | Description |
|-------|------|-------------|
| `leafHash` | `Checksum` | The leaf hash (entryHash of the ledger entry) |
| `leafIndex` | `number` | Zero-based index of the leaf in the tree |
| `treeSize` | `number` | Total number of leaves when the proof was generated |
| `path` | `readonly IMerkleProofStep[]` | Authentication path from leaf to root |

#### IConsistencyProof

A consistency proof between two tree states.

| Field | Type | Description |
|-------|------|-------------|
| `earlierSize` | `number` | Number of leaves in the earlier tree state |
| `laterSize` | `number` | Number of leaves in the later tree state |
| `hashes` | `readonly Checksum[]` | Intermediate hashes needed to verify consistency |

#### IProofVerificationResult

Result of a proof verification operation.

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | `boolean` | Whether the proof verified successfully |
| `error` | `string?` | Error message when `isValid` is false |

### ILedgerSigner / ILedgerSignatureVerifier

Minimal signing and verification interfaces that accept `Uint8Array` for browser compatibility. `MemberSignerAdapter` bridges `IMemberOperational` to `ILedgerSigner`. `EciesSignatureVerifier` wraps `ECIESService.verifyMessage()`.

### ILedgerMetadata

Stored as a single metadata block in the `IBlockStore` to enable cold-start reconstruction. Contains `ledgerId`, `headChecksum`, `length`, `merkleRoot`, and `frontier`. The ledger ID is hashed to produce a deterministic `Checksum` used as the metadata block's storage key.

### IValidationResult

Returned by `LedgerChainValidator`. Contains `isValid`, `entriesChecked`, and an array of `ILedgerValidationError` descriptors (each with `sequenceNumber`, `errorType`, and `message`). Validation never throws — it reports errors structurally.

Error types include chain integrity errors (`hash_mismatch`, `signature_invalid`, `sequence_gap`, `genesis_invalid`, `previous_hash_mismatch`, `deserialization_error`), governance errors (`unauthorized_signer`, `unauthorized_governance`, `quorum_not_met`, `governance_safety_violation`, `invalid_governance_payload`), and Merkle errors (`merkle_root_mismatch`).

## Ledger Public API — Merkle Methods

The `Ledger` class exposes the following Merkle-related API in addition to the existing append, read, and governance methods:

| Method / Property | Signature | Description |
|-------------------|-----------|-------------|
| `merkleRoot` | `get merkleRoot(): Checksum \| null` | Current Merkle root, or null if ledger is empty |
| `getInclusionProof` | `getInclusionProof(sequenceNumber: number): IMerkleProof` | Inclusion proof for the entry at the given sequence number |
| `getConsistencyProof` | `getConsistencyProof(earlierLength: number): IConsistencyProof` | Consistency proof between earlier length and current length |
| `verifyInclusionProof` | `static verifyInclusionProof(proof: IMerkleProof, merkleRoot: Checksum): IProofVerificationResult` | Verify an inclusion proof against a Merkle root (no Ledger instance needed) |
| `verifyConsistencyProof` | `static verifyConsistencyProof(proof: IConsistencyProof, earlierRoot: Checksum, laterRoot: Checksum, earlierLength: number, laterLength: number): IProofVerificationResult` | Verify a consistency proof (no Ledger instance needed) |

The static verification methods use only `ChecksumService` (SHA3-512 via `@noble/hashes`) and `Uint8Array` — no `IBlockStore`, `Ledger` instance, or Node.js API required. This makes them suitable for browser-based light client verification.

## Role-Based Access Control

### Signer Roles

The ledger enforces three roles, matching Azure Confidential Ledger's Administrator/Contributor/Reader model:

| Role | Append Regular Entries | Append Governance Entries | Manage Signers |
|------|----------------------|--------------------------|----------------|
| `admin` | Yes | Yes (with BrightTrust) | Yes |
| `writer` | Yes | No | No |
| `reader` | No | No | No |

The genesis entry's payload contains the initial authorized signer set — an explicit list of public keys with their assigned roles. There is no implicit admin; the genesis creator must be explicitly listed.

### Signer Lifecycle States

Each signer has a lifecycle status, inspired by CCF's member lifecycle:

| Status | Can Append | Counts for BrightTrust | Transitions To |
|--------|-----------|-------------------|----------------|
| `active` | Yes (if admin/writer) | Yes (if admin) | `suspended`, `retired` |
| `suspended` | No | No | `active`, `retired` |
| `retired` | No | No | (terminal — must re-add as new signer) |

Suspending a signer is reversible (useful for temporary key compromise or maintenance). Retiring is permanent.

### Member Metadata

Each signer can have associated key-value string metadata (e.g., node name, organization, description), modifiable via `set_member_data` governance actions. This makes the signer set self-documenting and auditable.

## Governance

### Governance Entries

Governance changes are recorded as special ledger entries whose payload begins with the `0x01` type prefix. Only active admins can submit governance entries. Each governance entry contains one or more actions:

| Action | Description |
|--------|-------------|
| `add_signer` | Add a public key with a role and optional metadata |
| `remove_signer` | Retire a signer (permanent) |
| `change_role` | Change a signer's role |
| `update_BrightTrust` | Change the BrightTrust policy |
| `suspend_signer` | Temporarily disable a signer |
| `reactivate_signer` | Re-enable a suspended signer |
| `set_member_data` | Update a signer's metadata |

### BrightTrust Policies

Governance changes require multi-signature approval according to a configurable BrightTrust policy:

| Policy | Required Signatures |
|--------|-------------------|
| `unanimous` | All active admins |
| `majority` | More than half of active admins |
| `threshold(n)` | At least N active admins |

The initial BrightTrust policy is set in the genesis entry. For single-admin ledgers, it defaults to `threshold(1)`. The BrightTrust policy itself can be changed via `update_BrightTrust`, but that change is subject to the current BrightTrust — you need the existing BrightTrust to change the BrightTrust.

Governance entries carry cosignatures: the primary signer's signature (in the entry's `signature` field) plus additional admin signatures embedded in the governance payload, all over the same governance action hash.

### Safety Constraints

The ledger enforces invariants to prevent becoming ungovernable:

- At least one active admin must exist at all times
- Cannot remove or suspend an admin if it would drop the active admin count below the quorum threshold
- Cannot set a quorum threshold higher than the current active admin count
- Only admins can remove themselves; writers and readers cannot remove anyone
- Retired signers cannot be reactivated (must be re-added via `add_signer`)

### Data Flow: Governance Append

1. Application calls `ledger.appendGovernance(actions, primarySigner, cosigners)`
2. Ledger verifies all signers are active admins
3. Ledger validates actions against safety constraints
4. `GovernancePayloadSerializer` serializes the actions for signing
5. All signers sign the same action hash
6. Ledger verifies BrightTrust is satisfied
7. Full governance payload (actions + cosignatures) is serialized with `0x01` prefix
8. Entry is appended using the standard append flow
9. `AuthorizedSignerSet` is updated with the governance actions
10. Returns the block `Checksum`

## Binary Serialization Format

All multi-byte integers are big-endian.

### Payload Type Prefix

All entry payloads begin with a single type byte:

| Prefix | Meaning |
|--------|---------|
| `0x00` | Regular application payload |
| `0x01` | Governance payload |

### Hashable Content (input to SHA3-512)

| Size | Field |
|------|-------|
| 4 bytes | `sequenceNumber` (uint32) |
| 8 bytes | `timestamp` (uint64, ms since epoch) |
| 1 byte | `hasPreviousHash` (0x00 = genesis, 0x01 = present) |
| 0 or 64 bytes | `previousEntryHash` (SHA3-512) |
| 4 bytes | `signerPublicKeyLength` (uint32) |
| variable | `signerPublicKey` |
| 4 bytes | `payloadLength` (uint32) |
| variable | `payload` (includes type prefix) |

### Full Serialized Entry (stored in BlockStore)

| Size | Field |
|------|-------|
| 4 bytes | Magic: `0x4C454447` ("LEDG") |
| 2 bytes | Version: `0x0001` |
| variable | Hashable content (above) |
| 64 bytes | `entryHash` (SHA3-512) |
| 64 bytes | `signature` (SECP256k1) |

Minimum entry size: **184 bytes**. The serialized entry is padded to `BlockSize` using `padToBlockSize` (4-byte length prefix + random padding) before storage as a `RawDataBlock`.

### Metadata Block Format

The metadata block format includes the Merkle root and frontier fields as part of version 0x0001 (version 0x0001 was never in production, so no backward compatibility is needed).

| Size | Field |
|------|-------|
| 4 bytes | Magic: `0x4C4D4554` ("LMET") |
| 2 bytes | Version: `0x0001` |
| 4 bytes | `ledgerIdLength` (uint32) |
| variable | `ledgerId` (UTF-8) |
| 4 bytes | `length` (uint32) |
| 1 byte | `hasHead` (0x00 = empty, 0x01 = has head) |
| 0 or 64 bytes | `headChecksum` (SHA3-512) |
| 1 byte | `hasMerkleRoot` (0x00 = no, 0x01 = yes) |
| 0 or 64 bytes | `merkleRoot` (SHA3-512 Merkle root) |
| 2 bytes | `frontierCount` (uint16 BE) |
| `frontierCount` × 64 bytes | `frontier` (SHA3-512 frontier hashes, in order) |
| variable | Index entries: `seqNum` (uint32 BE) + `blockChecksum` (64 bytes) each |

### Inclusion Proof Binary Format (`IMerkleProof`)

Serialized by `ProofSerializer`. Uses only browser-compatible APIs (DataView, Uint8Array).

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 byte | `version` — `0x01` |
| 1 | 1 byte | `proofType` — `0x01` (inclusion) |
| 2 | 64 bytes | `leafHash` (SHA3-512) |
| 66 | 4 bytes | `leafIndex` (uint32 BE) |
| 70 | 4 bytes | `treeSize` (uint32 BE) |
| 74 | 2 bytes | `pathLength` (uint16 BE) |
| 76 | `pathLength` × 65 bytes | `path` — each step: 64 bytes hash + 1 byte direction (`0x00` = LEFT, `0x01` = RIGHT) |

Minimum size (no path steps): **76 bytes**.

### Consistency Proof Binary Format (`IConsistencyProof`)

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 byte | `version` — `0x01` |
| 1 | 1 byte | `proofType` — `0x02` (consistency) |
| 2 | 4 bytes | `earlierSize` (uint32 BE) |
| 6 | 4 bytes | `laterSize` (uint32 BE) |
| 10 | 2 bytes | `hashCount` (uint16 BE) |
| 12 | `hashCount` × 64 bytes | `hashes` (SHA3-512 intermediate hashes) |

Minimum size (no hashes): **12 bytes**.

### Governance Payload Format

After the `0x01` type prefix:

| Size | Field |
|------|-------|
| 1 byte | Subtype: `0x00` = genesis init, `0x01` = amendment |
| 2 bytes | `actionCount` (uint16) |
| variable | Serialized actions (type byte + action-specific fields) |
| 2 bytes | `cosignatureCount` (uint16) |
| variable | Cosignatures (pubKeyLen uint32 + pubKey + signature 64 bytes) |

Genesis subtype additionally includes the initial BrightTrust policy and full signer list before the actions.

Each governance action is serialized as a type byte (`0x00`–`0x06`) followed by action-specific fields (public key, role byte, BrightTrust parameters, or metadata entries as appropriate).

## Data Flow: Append Entry

1. Application calls `ledger.append(payload, signer)`
2. Ledger checks `authorizedSignerSet.canAppend(signer.publicKey)` — rejects unauthorized, reader, suspended, or retired signers
3. Ledger determines `sequenceNumber`, `previousEntryHash`, `timestamp`
4. `LedgerEntrySerializer.serializeForHashing()` produces hashable bytes
5. `ChecksumService.calculateChecksum()` produces the `entryHash`
6. `signer.sign(entryHash)` produces the signature
7. `LedgerEntrySerializer.serialize()` produces the full serialized entry
8. Entry is padded to `BlockSize` and stored as a `RawDataBlock`
9. `IncrementalMerkleTree.append(entryHash)` updates the Merkle root in O(log N)
10. Metadata block is updated in the store (includes Merkle root and frontier)
11. Returns the block `Checksum`

## In-Memory State

### Sequence Index

The `Ledger` maintains a `Map<number, Checksum>` mapping `sequenceNumber → blockChecksum`:

- Built during `Ledger.load()` by walking the chain from head to genesis
- Updated incrementally on each `append()`
- Provides O(1) lookups by sequence number via `getEntry()` and `getEntries()`

### Authorized Signer Set

The `AuthorizedSignerSet` maintains:

- A `Map<string, IAuthorizedSigner>` keyed by hex-encoded public key for O(1) lookups
- The current `IBrightTrustPolicy`
- Cached `activeAdminCount` updated on each mutation

This state is initialized from the genesis entry and updated incrementally on each governance entry during `append()` or `load()`. The `LedgerChainValidator` clones this state for speculative validation when walking the chain.

### Incremental Merkle Tree

The `IncrementalMerkleTree` maintains:

- A `Checksum[]` of all leaf hashes (for proof generation)
- A `Checksum[]` frontier (right-spine hashes for O(log N) root computation)
- A cached `Checksum` root, recomputed on each append

This state is initialized during `Ledger.load()` from the persisted frontier (fast path) or by replaying all entry hashes (fallback). It is updated incrementally on each `append()`. The `LedgerChainValidator` reconstructs the tree from entry hashes during `validateAll()` to verify the stored Merkle root.

## Integration Points

| Component | Existing Type | Usage |
|-----------|--------------|-------|
| Block storage | `IBlockStore.setData(RawDataBlock)` | Persist serialized entries |
| Block retrieval | `IBlockStore.getData(Checksum)` | Retrieve entries by checksum |
| Hashing | `ChecksumService.calculateChecksum(Uint8Array)` | Compute entryHash and Merkle internal nodes |
| Checksum type | `Checksum` (SHA3-512, 64 bytes) | Entry hashes, block IDs, Merkle nodes |
| Signature type | `SignatureUint8Array` (64 bytes) | SECP256k1 signatures |
| Block sizing | `BlockSize` enum | Pad entries to block boundaries |
| Padding | `padToBlockSize` / `unpadCblData` | Pad before storage, unpad after retrieval |
| Signature verification | `ECIESService.verifyMessage()` | Wrapped by `EciesSignatureVerifier` |

## Error Handling

Serialization errors (`LedgerSerializationError`) cover invalid magic bytes, unsupported versions, truncated data, and field overflow — used for both entry serialization and proof serialization. Ledger operation errors (`LedgerError`) cover entry-not-found, invalid ranges, metadata corruption, append failures, governance errors (unauthorized signer, unauthorized governance, BrightTrust not met, safety violations, invalid state transitions, invalid governance targets), and Merkle errors (`MerkleProofFailed` for out-of-range proof requests, `ConsistencyProofFailed` for invalid consistency proof ranges, `MerkleReconstructionFailed` for frontier restoration failures). Validation never throws — it returns `IValidationResult` with structured error descriptors including governance-specific and Merkle-specific (`merkle_root_mismatch`) error types.

## File Organization

```
brightchain-lib/src/lib/
├── interfaces/ledger/
│   ├── ledgerEntry.ts              # ILedgerEntry<TID>
│   ├── ledgerSigner.ts             # ILedgerSigner
│   ├── ledgerSignatureVerifier.ts  # ILedgerSignatureVerifier
│   ├── ledgerMetadata.ts           # ILedgerMetadata
│   ├── validationResult.ts         # IValidationResult, ILedgerValidationError
│   ├── signerRole.ts               # SignerRole enum
│   ├── signerStatus.ts             # SignerStatus enum
│   ├── authorizedSigner.ts         # IAuthorizedSigner
│   ├── brightTrustPolicy.ts        # IBrightTrustPolicy, QuorumType
│   ├── governanceAction.ts         # GovernanceActionType, IGovernanceAction
│   ├── governancePayload.ts        # IGovernancePayload
│   ├── merkleProof.ts              # MerkleDirection, IMerkleProofStep, IMerkleProof
│   ├── consistencyProof.ts         # IConsistencyProof
│   └── proofVerificationResult.ts  # IProofVerificationResult
├── ledger/
│   ├── ledger.ts                   # Ledger class (public API, Merkle methods)
│   ├── ledgerEntrySerializer.ts    # Binary serialization/deserialization
│   ├── ledgerChainValidator.ts     # Chain integrity + governance + Merkle validation
│   ├── incrementalMerkleTree.ts    # IncrementalMerkleTree class
│   ├── proofSerializer.ts          # ProofSerializer class (proof binary formats)
│   ├── memberSignerAdapter.ts      # IMemberOperational → ILedgerSigner bridge
│   ├── eciesSignatureVerifier.ts   # ECIESService wrapper
│   ├── governancePayloadSerializer.ts # Governance payload serialization
│   └── authorizedSignerSet.ts      # In-memory signer set state tracker
└── errors/
    ├── ledgerError.ts              # LedgerError, LedgerErrorType
    └── ledgerSerializationError.ts # LedgerSerializationError
```

## Future: Distributed Network Service

The current governance model collects multi-signature BrightTrust approval upfront — the caller gathers the required admin signatures before calling `appendGovernance()`. The on-chain result is a governance entry with K-of-N admin signatures over the same payload hash. The ledger is agnostic about how those signatures were collected.

This is architecturally equivalent to what CCF and Azure Confidential Ledger do internally. The difference is operational: CCF adds a proposal/vote protocol layer on top of its ledger so that distributed administrators on different machines can vote asynchronously. The proposal sits "open" on the network while members vote over time, and the framework calls into the ledger once the BrightTrust resolves.

To evolve BrightChain into a distributed network service, the ledger data structure and governance model do not need to change. What gets added is a network protocol layer above the ledger:

- A `Proposal` state machine (Open → Accepted/Rejected/Withdrawn) managing pending governance changes
- An async vote collection mechanism where distributed nodes submit signed ballots
- A configurable `resolve()` function (like CCF's constitution) that evaluates whether a proposal has enough votes
- Once resolved, the service calls `ledger.appendGovernance()` with the collected signatures — same API, same on-chain format

This layer would live in its own package (e.g., `@digitaldefiance/brightchain-consensus` or within `brightchain-api-lib`) and would also handle node-to-node replication, block propagation, and consensus. The ledger library remains the single-node storage and validation engine underneath.
