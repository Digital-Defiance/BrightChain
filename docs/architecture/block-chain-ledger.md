---
title: "Block Chain Ledger"
parent: "Architecture & Design"
nav_order: 11
permalink: /docs/architecture/block-chain-ledger/
---
# Block Chain Ledger

A general-purpose, append-only blockchain ledger built into `brightchain-lib`. The ledger stores cryptographically chained, digitally signed entries as `RawDataBlock` instances within any `IBlockStore` implementation. It generalizes the hash-chain pattern from `ChainedAuditLogEntry` and `AuditLogService` into a reusable, payload-agnostic ledger with deterministic binary serialization, in-memory indexing, full chain validation, and role-based access control with consortium-style governance.

The governance model is inspired by [Azure Confidential Ledger](https://learn.microsoft.com/en-us/azure/confidential-ledger/overview) and Microsoft's [Confidential Consortium Framework (CCF)](https://microsoft.github.io/CCF/main/overview/governance.html), providing feature parity with three roles (Administrator/Contributor/Reader), configurable quorum policies, member lifecycle states, and on-chain governance audit trails.

## Design Decisions

- **Binary serialization** over JSON — deterministic byte layout eliminates key-ordering ambiguity and is more compact. Big-endian byte order for cross-platform consistency, matching the existing `padToBlockSize` convention.
- **Thin Signer interface** — accepts `Uint8Array` (not `Buffer`) for browser compatibility, decoupled from `IMemberOperational` but compatible via `MemberSignerAdapter`.
- **Single-block-per-entry storage** — each serialized entry is padded to the store's `BlockSize` and stored as one `RawDataBlock`, avoiding CBL whitening complexity.
- **Metadata block** — tracks chain head, length, and ledger ID for cold-start reconstruction from an `IBlockStore`.
- **On-chain governance** — all access control changes (signer additions, removals, role changes, quorum updates) are recorded as governance entries in the ledger itself, providing a complete audit trail. No out-of-band configuration.
- **Multi-signature quorum** — governance changes require signatures from multiple administrators according to a configurable quorum policy, preventing unilateral modifications.

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
├──────────┴──────────┴───────────────────┴───────────────┤
│                 Existing Infrastructure                  │
│  IBlockStore  RawDataBlock  ChecksumService  Checksum   │
└─────────────────────────────────────────────────────────┘
```

The `Ledger` class is the sole public entry point. It delegates serialization to `LedgerEntrySerializer`, governance payload handling to `GovernancePayloadSerializer`, authorization tracking to `AuthorizedSignerSet`, and validation to `LedgerChainValidator`.

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

### ILedgerSigner / ILedgerSignatureVerifier

Minimal signing and verification interfaces that accept `Uint8Array` for browser compatibility. `MemberSignerAdapter` bridges `IMemberOperational` to `ILedgerSigner`. `EciesSignatureVerifier` wraps `ECIESService.verifyMessage()`.

### ILedgerMetadata

Stored as a single metadata block in the `IBlockStore` to enable cold-start reconstruction. Contains `ledgerId`, `headChecksum`, and `length`. The ledger ID is hashed to produce a deterministic `Checksum` used as the metadata block's storage key.

### IValidationResult

Returned by `LedgerChainValidator`. Contains `isValid`, `entriesChecked`, and an array of `ILedgerValidationError` descriptors (each with `sequenceNumber`, `errorType`, and `message`). Validation never throws — it reports errors structurally.

Error types include both chain integrity errors (`hash_mismatch`, `signature_invalid`, `sequence_gap`, `genesis_invalid`, `previous_hash_mismatch`, `deserialization_error`) and governance errors (`unauthorized_signer`, `unauthorized_governance`, `quorum_not_met`, `governance_safety_violation`, `invalid_governance_payload`).

## Role-Based Access Control

### Signer Roles

The ledger enforces three roles, matching Azure Confidential Ledger's Administrator/Contributor/Reader model:

| Role | Append Regular Entries | Append Governance Entries | Manage Signers |
|------|----------------------|--------------------------|----------------|
| `admin` | Yes | Yes (with quorum) | Yes |
| `writer` | Yes | No | No |
| `reader` | No | No | No |

The genesis entry's payload contains the initial authorized signer set — an explicit list of public keys with their assigned roles. There is no implicit admin; the genesis creator must be explicitly listed.

### Signer Lifecycle States

Each signer has a lifecycle status, inspired by CCF's member lifecycle:

| Status | Can Append | Counts for Quorum | Transitions To |
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
| `update_quorum` | Change the quorum policy |
| `suspend_signer` | Temporarily disable a signer |
| `reactivate_signer` | Re-enable a suspended signer |
| `set_member_data` | Update a signer's metadata |

### Quorum Policies

Governance changes require multi-signature approval according to a configurable quorum policy:

| Policy | Required Signatures |
|--------|-------------------|
| `unanimous` | All active admins |
| `majority` | More than half of active admins |
| `threshold(n)` | At least N active admins |

The initial quorum policy is set in the genesis entry. For single-admin ledgers, it defaults to `threshold(1)`. The quorum policy itself can be changed via `update_quorum`, but that change is subject to the current quorum — you need the existing quorum to change the quorum.

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
6. Ledger verifies quorum is satisfied
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

| Size | Field |
|------|-------|
| 4 bytes | Magic: `0x4C4D4554` ("LMET") |
| 2 bytes | Version: `0x0001` |
| 4 bytes | `ledgerIdLength` (uint32) |
| variable | `ledgerId` (UTF-8) |
| 4 bytes | `length` (uint32) |
| 1 byte | `hasHead` (0x00 = empty, 0x01 = has head) |
| 0 or 64 bytes | `headChecksum` (SHA3-512) |

### Governance Payload Format

After the `0x01` type prefix:

| Size | Field |
|------|-------|
| 1 byte | Subtype: `0x00` = genesis init, `0x01` = amendment |
| 2 bytes | `actionCount` (uint16) |
| variable | Serialized actions (type byte + action-specific fields) |
| 2 bytes | `cosignatureCount` (uint16) |
| variable | Cosignatures (pubKeyLen uint32 + pubKey + signature 64 bytes) |

Genesis subtype additionally includes the initial quorum policy and full signer list before the actions.

Each governance action is serialized as a type byte (`0x00`–`0x06`) followed by action-specific fields (public key, role byte, quorum parameters, or metadata entries as appropriate).

## Data Flow: Append Entry

1. Application calls `ledger.append(payload, signer)`
2. Ledger checks `authorizedSignerSet.canAppend(signer.publicKey)` — rejects unauthorized, reader, suspended, or retired signers
3. Ledger determines `sequenceNumber`, `previousEntryHash`, `timestamp`
4. `LedgerEntrySerializer.serializeForHashing()` produces hashable bytes
5. `ChecksumService.calculateChecksum()` produces the `entryHash`
6. `signer.sign(entryHash)` produces the signature
7. `LedgerEntrySerializer.serialize()` produces the full serialized entry
8. Entry is padded to `BlockSize` and stored as a `RawDataBlock`
9. Metadata block is updated in the store
10. Returns the block `Checksum`

## In-Memory State

### Sequence Index

The `Ledger` maintains a `Map<number, Checksum>` mapping `sequenceNumber → blockChecksum`:

- Built during `Ledger.load()` by walking the chain from head to genesis
- Updated incrementally on each `append()`
- Provides O(1) lookups by sequence number via `getEntry()` and `getEntries()`

### Authorized Signer Set

The `AuthorizedSignerSet` maintains:

- A `Map<string, IAuthorizedSigner>` keyed by hex-encoded public key for O(1) lookups
- The current `IQuorumPolicy`
- Cached `activeAdminCount` updated on each mutation

This state is initialized from the genesis entry and updated incrementally on each governance entry during `append()` or `load()`. The `LedgerChainValidator` clones this state for speculative validation when walking the chain.

## Integration Points

| Component | Existing Type | Usage |
|-----------|--------------|-------|
| Block storage | `IBlockStore.setData(RawDataBlock)` | Persist serialized entries |
| Block retrieval | `IBlockStore.getData(Checksum)` | Retrieve entries by checksum |
| Hashing | `ChecksumService.calculateChecksum(Uint8Array)` | Compute entryHash |
| Checksum type | `Checksum` (SHA3-512, 64 bytes) | Entry hashes, block IDs |
| Signature type | `SignatureUint8Array` (64 bytes) | SECP256k1 signatures |
| Block sizing | `BlockSize` enum | Pad entries to block boundaries |
| Padding | `padToBlockSize` / `unpadCblData` | Pad before storage, unpad after retrieval |
| Signature verification | `ECIESService.verifyMessage()` | Wrapped by `EciesSignatureVerifier` |

## Error Handling

Serialization errors (`LedgerSerializationError`) cover invalid magic bytes, unsupported versions, truncated data, and field overflow. Ledger operation errors (`LedgerError`) cover entry-not-found, invalid ranges, metadata corruption, append failures, and governance errors (unauthorized signer, unauthorized governance, quorum not met, safety violations, invalid state transitions, invalid governance targets). Validation never throws — it returns `IValidationResult` with structured error descriptors including governance-specific error types.

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
│   ├── quorumPolicy.ts             # IQuorumPolicy, QuorumType
│   ├── governanceAction.ts         # GovernanceActionType, IGovernanceAction
│   └── governancePayload.ts        # IGovernancePayload
├── ledger/
│   ├── ledger.ts                   # Ledger class (public API)
│   ├── ledgerEntrySerializer.ts    # Binary serialization/deserialization
│   ├── ledgerChainValidator.ts     # Chain integrity + governance validation
│   ├── memberSignerAdapter.ts      # IMemberOperational → ILedgerSigner bridge
│   ├── eciesSignatureVerifier.ts   # ECIESService wrapper
│   ├── governancePayloadSerializer.ts # Governance payload serialization
│   └── authorizedSignerSet.ts      # In-memory signer set state tracker
└── errors/
    ├── ledgerError.ts              # LedgerError, LedgerErrorType
    └── ledgerSerializationError.ts # LedgerSerializationError
```

## Future: Distributed Network Service

The current governance model collects multi-signature quorum approval upfront — the caller gathers the required admin signatures before calling `appendGovernance()`. The on-chain result is a governance entry with K-of-N admin signatures over the same payload hash. The ledger is agnostic about how those signatures were collected.

This is architecturally equivalent to what CCF and Azure Confidential Ledger do internally. The difference is operational: CCF adds a proposal/vote protocol layer on top of its ledger so that distributed administrators on different machines can vote asynchronously. The proposal sits "open" on the network while members vote over time, and the framework calls into the ledger once the quorum resolves.

To evolve BrightChain into a distributed network service, the ledger data structure and governance model do not need to change. What gets added is a network protocol layer above the ledger:

- A `Proposal` state machine (Open → Accepted/Rejected/Withdrawn) managing pending governance changes
- An async vote collection mechanism where distributed nodes submit signed ballots
- A configurable `resolve()` function (like CCF's constitution) that evaluates whether a proposal has enough votes
- Once resolved, the service calls `ledger.appendGovernance()` with the collected signatures — same API, same on-chain format

This layer would live in its own package (e.g., `@digitaldefiance/brightchain-consensus` or within `brightchain-api-lib`) and would also handle node-to-node replication, block propagation, and consensus. The ledger library remains the single-node storage and validation engine underneath.
