# BrightLedger Metering Log Library

Node-only TypeScript library implementing the metering-log Layer 2 of the
BrightLedger stack.  It provides a durable, hash-chained, Ed25519-signed
append-only log per shard, a Merkle-tree-indexed settlement batcher, a
dispute/challenge path, and crash-recovery primitives.

---

## Table of Contents

1. [Storage Layout](#storage-layout)
2. [Signing Cadence](#signing-cadence)
3. [Settlement Format](#settlement-format)
4. [Dispute Window](#dispute-window)
5. [Operator Runbook — Compromise Revoke](#operator-runbook--compromise-revoke)
6. [Brand Vocabulary](#brand-vocabulary)

---

## Storage Layout

### On-disk directory structure

```
<shardDir>/
  writer.lock          — exclusive POSIX lock held by the active writer
  log.000001.cbor      — first log segment
  log.000002.cbor      — second segment (created after rotation)
  ...
  state.json           — crash-recovery state (written atomically via .bak)
  state.json.bak       — temp file used during atomic state write
```

### Record framing

Every record is stored as a **length-prefixed frame**:

```
┌──────────────────┬────────────────────────────────────┐
│  u32-LE (4 B)    │  CBOR-encoded MeteringRecord        │
│  payload length  │  (variable, ≤ MAX_LOG_FILE_SIZE)    │
└──────────────────┴────────────────────────────────────┘
```

The `LENGTH_PREFIX_SIZE` constant is `4`.  A scan stops (silently) at the first
incomplete frame — it never raises on a torn write.

### File rotation

Log segments are rotated when the *next* append would push the file past
`MAX_LOG_FILE_SIZE` (256 MiB).  File sequence numbers are 1-based and
zero-padded to six digits: `log.000001.cbor`, `log.000002.cbor`, …

### Group-commit fsync

`FlatFileMeteringStorage` batches writes and calls `fdatasync` every
`groupCommitSize` appends (default `DEFAULT_GROUP_COMMIT_SIZE = 64`).
This balances durability against throughput; p99 per-append latency stays
below 5 ms on typical SSD hardware.

### Exclusive writer lock

`open()` creates and `flock(LOCK_EX | LOCK_NB)`-locks `writer.lock`.  A
second writer opening the same directory will throw immediately.  `close()`
releases the lock and removes the file.

---

## Signing Cadence

Every `signingCadence`-th record the shard emits a **signature record**
(`PROCESS_KEY_SIGN`) that covers the Ed25519 signature of the running BLAKE3
chain tip.

| Constant | Value | Meaning |
|---|---|---|
| `MIN_SIGNING_CADENCE` | 16 | Minimum records between signatures |
| `DEFAULT_SIGNING_CADENCE` | 64 | Default (records per signature) |
| `MAX_SIGNING_CADENCE` | 256 | Maximum records between signatures |
| `MAX_PROCESS_KEY_LIFETIME_MS` | 604 800 000 (7 days) | Maximum cert lifetime |

The process key cert (`createProcessKeyAction`) encodes an Ed25519 public key,
an expiry timestamp (Unix-ms), and is signed by an operator root key.  At
expiry the shard refuses new appends until the cert is renewed.

### Hash chain

Each record carries a BLAKE3 hash that chains the previous record's hash:

```
tipHash[n] = BLAKE3( CBOR(record[n]) || tipHash[n-1] )
```

`GENESIS_HASH` (all-zero 32 bytes) seeds the chain for sequence 0.

---

## Settlement Format

`BatchSettlementAction` is emitted when either the record count exceeds
`DEFAULT_MAX_RECORDS` (10 000) or `DEFAULT_MAX_AGE_MS` (5 000 ms) since the
last settlement.

```typescript
interface BatchSettlementAction {
  type: 'BATCH_SETTLEMENT';
  shardId: string;
  fromSeq: bigint;       // inclusive start of the settled range
  toSeq:   bigint;       // inclusive end of the settled range
  tipHash: Uint8Array;   // 32-byte BLAKE3 chain tip at toSeq
  itemsRoot: Uint8Array; // 32-byte Merkle root of all record leaf-hashes in the range
  memberDeltas: MemberDelta[];  // one entry per (memberId, assetId) pair
  sigEnvelope: {
    publicKey: Uint8Array;   // process-key Ed25519 public key (32 B)
    signature:  Uint8Array;  // Ed25519 sig over canonical settlement bytes (64 B)
  };
}

interface MemberDelta {
  memberId: Uint8Array;   // 32-byte opaque member identifier
  assetId:  string;       // e.g. 'joule', 'compute-hour'
  earned:   bigint;
  spent:    bigint;
}
```

### Merkle tree

`itemsRoot` is the root of a binary BLAKE3 Merkle tree over the leaf hashes of
all records in the settled range.  Leaf hashes are computed as
`BLAKE3(0x00 || data)`.  Inclusion proofs (`proveInclusion`) allow any
downstream verifier to spot-check any individual record without replaying the
full range.

### Settlement size guarantee

With up to 10 000 records and ≤ 1 000 distinct `(memberId, assetId)` pairs the
JSON-serialised `memberDeltas` array fits within **256 KiB** (UTF-8 bytes).

---

## Dispute Window

An off-chain verifier may raise a `DisputeChallenge` against a published
settlement.  The following timing constants govern the protocol:

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_DISPUTE_WINDOW_MS` | 86 400 000 (24 h) | Window after settlement in which a challenge may be raised |
| `DEFAULT_DISPUTE_RESPONSE_MS` | 21 600 000 (6 h) | Time the operator has to respond to a challenge |

### Dispute lifecycle

```
SETTLEMENT_CONFIRMED
  └─[within disputeWindowMs]→ CHALLENGED
      ├─[operator responds, hashes match]→ CONFIRMED (challenge rejected)
      ├─[operator responds, mismatch]    → DISPUTED_FRAUD
      └─[no response within responseMs]  → DISPUTED_NO_RESPONSE
```

`evaluateDisputeChallenge(challenge, response?, options?)` implements the
state-machine and returns a `DisputeResolution`.

`applyDisputeReversal(store, resolution)` applies the reversal of earned and
spent balances from a fraudulent or unresponded settlement to an
`IAssetAccountStore`.

---

## Operator Runbook — Compromise Revoke

Use this procedure when a process key's private key is believed to be
compromised.

### 1 — Stop the shard writer

Stop any process that holds `writer.lock` in the affected shard directory.

### 2 — Issue a revocation action

```typescript
import { createProcessKeyRevokeAction } from 'brightledger-metering-log-lib';

const revokeAction = createProcessKeyRevokeAction({
  processKeyId: '<hex of compromised public key>',
  revokedAt:    Date.now(),
  reason:       'key-compromise',
  operatorSig:  operatorSignBytes(canonicalRevokeBytes),
});
```

Append the revocation record to the shard log using a replacement process key
that has already been certified.

### 3 — Identify the tainted range

```typescript
import { MeteringLogShard } from 'brightledger-metering-log-lib';

const shard = new MeteringLogShard(storage, verifier);
// reverseRange returns all settlement actions in [fromSeq, toSeq]
// that were signed by the revoked key
const tainted = await verifier.reverseRange(revokedPublicKey, fromSeq, toSeq);
```

### 4 — Dispute or reverse tainted settlements

For each tainted `BatchSettlementAction`:

```typescript
import { applyDisputeReversal } from 'brightledger-metering-log-lib';

// Build a DisputeResolution manually (DISPUTED_FRAUD or DISPUTED_NO_RESPONSE)
const resolution = {
  status: 'DISPUTED_FRAUD',
  challenge: { /* ... */ },
  detail: 'process key compromised — automated reversal',
};

applyDisputeReversal(assetAccountStore, resolution);
```

### 5 — Crash recovery after forced shutdown

If the shard was killed mid-write, run crash recovery before reopening:

```typescript
import { recoverShard } from 'brightledger-metering-log-lib';

const result = await recoverShard(shardDir, shardId);
console.log(`Recovered ${result.recordCount} records. Truncated: ${result.wasTruncated}`);
// result.state.lastSeq  — last valid sequence number
// result.state.tipHash  — BLAKE3 chain tip at lastSeq
```

`recoverShard` scans forward from the start, finds the first incomplete frame,
truncates the file at that byte offset, writes an atomic `state.json` (via
`state.json.bak` + `rename`), and returns a `ShardRecoveryResult`.

---

## Brand Vocabulary

Allowed verbs: `earn`, `spend`, `transfer`, `reserve`, `settle`, `release`,
`credit`, `debit`, `attest`, `flush`, `seal`.

Forbidden terms (must not appear in source or docs):
`coin`, `holder`, `tokenomics`, `airdrop`, `staking`, `marketCap`.
