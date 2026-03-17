---
title: "Block Chain Ledger"
parent: "Architecture & Design"
nav_order: 11
permalink: /docs/architecture/block-chain-ledger/
---
# Block Chain Ledger

A general-purpose, append-only blockchain ledger built into `brightchain-lib`. The ledger stores cryptographically chained, digitally signed entries as `RawDataBlock` instances within any `IBlockStore` implementation. It generalizes the hash-chain pattern from `ChainedAuditLogEntry` and `AuditLogService` into a reusable, payload-agnostic ledger with deterministic binary serialization, in-memory indexing, and full chain validation.

## Design Decisions

- **Binary serialization** over JSON — deterministic byte layout eliminates key-ordering ambiguity and is more compact. Big-endian byte order for cross-platform consistency, matching the existing `padToBlockSize` convention.
- **Thin Signer interface** — accepts `Uint8Array` (not `Buffer`) for browser compatibility, decoupled from `IMemberOperational` but compatible via `MemberSignerAdapter`.
- **Single-block-per-entry storage** — each serialized entry is padded to the store's `BlockSize` and stored as one `RawDataBlock`, avoiding CBL whitening complexity.
- **Metadata block** — tracks chain head, length, and ledger ID for cold-start reconstruction from an `IBlockStore`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Public API                         │
│                       Ledger                            │
├──────────┬──────────────────────────────┬───────────────┤
│          │       Internal Services      │               │
│          ├──────────────┬───────────────┤               │
│          │ EntrySerializer │ ChainValidator │            │
├──────────┴──────────────┴───────────────┴───────────────┤
│                 Existing Infrastructure                  │
│  IBlockStore  RawDataBlock  ChecksumService  Checksum   │
└─────────────────────────────────────────────────────────┘
```

The `Ledger` class is the sole public entry point. It delegates serialization to `LedgerEntrySerializer` and validation to `LedgerChainValidator`. Both operate on the existing block storage and checksum infrastructure.

## Core Types

### ILedgerEntry

The fundamental data structure for a single ledger entry. Uses the `PlatformID` generic pattern for DTO compatibility between frontend and backend.

| Field | Type | Description |
|-------|------|-------------|
| `payload` | `Uint8Array` | Arbitrary application data |
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

## Binary Serialization Format

All multi-byte integers are big-endian.

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
| variable | `payload` |

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

## Data Flow: Append Entry

1. Application calls `ledger.append(payload, signer)`
2. Ledger determines `sequenceNumber`, `previousEntryHash`, `timestamp`
3. `LedgerEntrySerializer.serializeForHashing()` produces hashable bytes
4. `ChecksumService.calculateChecksum()` produces the `entryHash`
5. `signer.sign(entryHash)` produces the signature
6. `LedgerEntrySerializer.serialize()` produces the full serialized entry
7. Entry is padded to `BlockSize` and stored as a `RawDataBlock`
8. Metadata block is updated in the store
9. Returns the block `Checksum`

## In-Memory Index

The `Ledger` maintains a `Map<number, Checksum>` mapping `sequenceNumber → blockChecksum`:

- Built during `Ledger.load()` by walking the chain from head to genesis
- Updated incrementally on each `append()`
- Provides O(1) lookups by sequence number via `getEntry()` and `getEntries()`

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

Serialization errors (`LedgerSerializationError`) cover invalid magic bytes, unsupported versions, truncated data, and field overflow. Ledger operation errors (`LedgerError`) cover entry-not-found, invalid ranges, metadata corruption, and append failures. Validation never throws — it returns `IValidationResult` with structured error descriptors.

## File Organization

```
brightchain-lib/src/lib/
├── interfaces/ledger/
│   ├── ledgerEntry.ts              # ILedgerEntry<TID>
│   ├── ledgerSigner.ts             # ILedgerSigner
│   ├── ledgerSignatureVerifier.ts  # ILedgerSignatureVerifier
│   ├── ledgerMetadata.ts           # ILedgerMetadata
│   └── validationResult.ts         # IValidationResult, ILedgerValidationError
├── ledger/
│   ├── ledger.ts                   # Ledger class (public API)
│   ├── ledgerEntrySerializer.ts    # Binary serialization/deserialization
│   ├── ledgerChainValidator.ts     # Chain integrity validation
│   ├── memberSignerAdapter.ts      # IMemberOperational → ILedgerSigner bridge
│   └── eciesSignatureVerifier.ts   # ECIESService wrapper
└── errors/
    ├── ledgerError.ts              # LedgerError, LedgerErrorType
    └── ledgerSerializationError.ts # LedgerSerializationError, LedgerSerializationErrorType
```
