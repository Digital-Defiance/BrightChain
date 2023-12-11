# Tasks — Metering Log (Layer 2)

> Depends on: `asset-account-store-generalization` (precursor) and
> `programmable-asset-ledger` (Layer 3 action types finalized for
> `BatchSettlementAction`, `ProcessKeyCertAction`, `ProcessKeyRevokeAction`,
> `BatchChallengeAction`).

## Phase 1 — Storage Layer

- [x] 1.1 New library `brightledger-metering-log-lib` (Node-only).
  _Requirements: 1.1, 1.6_
- [x] 1.2 Implement `FlatFileMeteringStorage`: length-prefixed append,
  group-commit fsync, log rotation at 256 MiB.
  _Requirements: 1.1, 1.2, 2.4_
- [x] 1.3 Implement OS file-lock-based exclusive writer.
  _Requirements: 1.3_
- [x] 1.4 Implement scan-forward reader.
  _Requirements: 1.4_
- [x] 1.5 Unit tests: round-trip records, lock contention, partial-write
  recovery at every byte offset.
  _Requirements: 1.5, 10.3_

## Phase 2 — Hash Chain & Signature Sidecar

- [x] 2.1 Define `MeteringRecord` CBOR schema and serializer.
  _Requirements: 2.1_
- [x] 2.2 Implement BLAKE3 chain hashing; genesis with zero `prev_hash`.
  _Requirements: 2.2, 2.3_
- [x] 2.3 Implement Ed25519 process key generation, fingerprint.
  _Requirements: 4.1_
- [x] 2.4 Implement signature sidecar writer/reader.
  _Requirements: 3.1, 3.3_
- [x] 2.5 Implement signing cadence (every K records, plus on flush, plus
  on graceful shutdown).
  _Requirements: 3.1, 3.2, 3.5_
- [x] 2.6 Verifier: range verification with cover signature.
  _Requirements: 3.4_
- [x] 2.7 Tests: chain integrity, signature verification, missing/forged
  signature rejection.
  _Requirements: 10.4_

## Phase 3 — Process Key Lifecycle (with Asset Ledger)

- [x] 3.1 Define `ProcessKeyCertAction` / `ProcessKeyRevokeAction` payload
  types in shared types lib.
  _Requirements: 4.1, 4.3_
- [x] 3.2 Implement startup workflow: generate key → submit cert → wait for
  ledger confirmation → start accepting appends.
  _Requirements: 4.1, 4.2_
- [x] 3.3 Implement graceful-shutdown rotation with revoke action.
  _Requirements: 4.3_
- [x] 3.4 Implement compromise-revoke with `effectiveAtSeq` retroactive
  invalidation in verifier.
  _Requirements: 4.4, 4.5_
- [x] 3.5 Enforce `notAfter` ≤ 7 days; rotation chain.
  _Requirements: 4.6_
- [x] 3.6 Tests: cert before-confirm denial; revoked-key rejection;
  retroactive revocation; rotation continuity.
  _Requirements: 10.4_

## Phase 4 — Merkle Tree Index & Proofs

- [x] 4.1 Implement RFC-9162-compatible binary Merkle tree.
  _Requirements: 5.3, 6.3_
- [x] 4.2 Persistent on-disk node store keyed by `(seq, level)`.
  _Requirements: 6.4_
- [x] 4.3 `proveInclusion(seq)` and `proveExclusion(memberId, opId, range)`.
  _Requirements: 6.1, 6.2_
- [x] 4.4 Stateless verifier for both proof types.
  _Requirements: 6.3_
- [x] 4.5 Property tests: random subsets pass inclusion; non-members pass
  exclusion.
  _Requirements: 10.2_

## Phase 5 — Batcher & Settlement Emission

- [x] 5.1 Implement `BatchAccumulator` with `(memberId, assetId)` deltas.
  _Requirements: 5.4_
- [x] 5.2 Implement batch-window triggers (`maxRecords`, `maxAgeMs`,
  explicit `flush()`).
  _Requirements: 5.1_
- [x] 5.3 Construct `BatchSettlementAction` with sorted, deduplicated
  `memberDeltas` and embedded `sigEnvelope`.
  _Requirements: 5.2, 5.4, 5.7_
- [x] 5.4 Submit to asset ledger; persist local settlement record for
  later dispute response.
  _Requirements: 5.5_
- [x] 5.5 Idempotency: `(memberId, opId)` deduplication within batch
  window.
  _Requirements: 2.5_
- [x] 5.6 Property tests: independently recomputed Merkle root and member
  deltas match emitted action.
  _Requirements: 10.1_

## Phase 6 — Dispute / Challenge Path

- [x] 6.1 Define `BatchChallengeAction` payload type.
  _Requirements: 7.2_
- [x] 6.2 Asset-ledger validation: reject `fromSeq` discontinuity (5.5)
  and `tipHash` mismatch on challenge (5.6).
  _Requirements: 5.5, 5.6_
- [x] 6.3 Operator dispute responder: serve disputed record range plus
  Merkle proofs within `disputeResponseMs`.
  _Requirements: 7.3_
- [x] 6.4 Auto-resolution: compare claimed range against on-chain
  `tipHash` / `itemsRoot`; mark `FINAL` or `DISPUTED_*`.
  _Requirements: 7.4_
- [x] 6.5 Per-asset configurable `disputeWindowMs`, `disputeResponseMs`.
  _Requirements: 7.1_
- [x] 6.6 Tests: malicious operator with mismatched `tipHash` rejected;
  no-response timeout rolls balances back.
  _Requirements: 10.5_

## Phase 7 — Operational Tier Coupling

- [x] 7.1 Wire `MeteringLogShard.appendRecord` →
  `AssetAccountStore.applyDelta` (optimistic).
  _Requirements: 8.1_
- [x] 7.2 On settlement confirmation, update
  `AssetAccountStore.getLastSettledAt`.
  _Requirements: 8.2_
- [x] 7.3 On challenge resolution against operator, replay reverse delta
  in store.
  _Requirements: 8.3_
- [x] 7.4 Verify store never blocks on settlement (latency tests).
  _Requirements: 8.4_

## Phase 8 — Crash Recovery & Performance

- [x] 8.1 Implement scan-forward recovery with byte-truncation handling.
  _Requirements: 1.5_
- [x] 8.2 Atomic `state.json` write with `.bak` fallback.
  _Requirements: 1.5_
- [x] 8.3 Property test: truncate last record at every byte offset →
  recovery converges to last valid tip.
  _Requirements: 10.3_
- [x] 8.4 Microbenchmark: 50_000 rec/sec sustained, p99 append < 5 ms.
  _Requirements: 9.1, 9.2_
- [x] 8.5 Settlement size benchmark: ≤ 256 KiB at p99 with 10_000 records
  and ≤ 1_000 distinct `(memberId, assetId)`.
  _Requirements: 9.3_
- [x] 8.6 Inclusion proof p99 < 10 ms benchmark.
  _Requirements: 9.4_

## Phase 9 — Final Validation

- [x] 9.1 Full Nx test suite green; no skips.
  _Requirements: 10.6_
- [x] 9.2 Codacy CLI clean for every edited file.
  _Requirements: external policy_
- [x] 9.3 No forbidden brand vocabulary introduced.
  _Requirements: 11.1, 11.2_
- [x] 9.4 Documentation: `brightledger-metering-log-lib/README.md`
  describing storage layout, signing cadence, settlement format,
  dispute window, and operator-runbook for compromise-revoke.
  _Requirements: 4.4_

## Estimate

Approximately **3–4 engineer-weeks**, with Phase 4 (Merkle tree +
proofs) and Phase 8 (recovery + perf) being the largest line items.

## Definition of Done

- `brightledger-metering-log-lib` published to the workspace and
  consumed by at least one integration test that drives an end-to-end
  flow: `appendRecord` → `flush` → `BatchSettlementAction` →
  asset-ledger confirmation → `AssetAccountStore.getLastSettledAt`
  updated.
- All performance targets met on CI hardware.
- Adversarial test scenarios (forged signature, mismatched tipHash,
  retroactive revoke) all rejected by the verifier.
- The forthcoming `joule-resource-credits` spec can begin
  implementation against a stable Layer 2 surface.
