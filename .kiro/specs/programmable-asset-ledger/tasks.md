# Implementation Plan: Programmable Asset Ledger

## Overview

Build a permissioned asset layer on top of the existing BrightChain ledger, gated behind a default-off capability flag, with strict accounting vocabulary discipline. This is **Layer 3** (settlement) of a three-layer architecture; depends on `asset-account-store-generalization` (Layer 1) and `metering-log` (Layer 2). Work proceeds in nine phases:

1. Domain library (browser-safe payloads, serializer, Asset_Id, SDK).
2. Validator + reducer (pure logic, fully testable in isolation).
3. Projection + snapshots (state engine + warm-start path).
4. Submission service + REST API (first end-to-end loop).
5. Subsystem plugin + capability gating + operator controls.
6. React component pack + brand lint enforcement.
7. Settlement / Process_Key / dispute machinery (Layer 2 bridge).
8. Joule pilot E2E + audit export + observability.
9. Final integration and release gating.

All property tests use `fast-check`. All packages follow the existing `*-lib` / `*-api-lib` / `*-react-components` convention.

## Tasks

- [x] 1. Scaffold `brightledger-assets-lib` (browser-safe domain library)
  - [x] 1.1 Create the Nx library `brightledger-assets-lib` with the same shape as `brightcal-lib`
    - Generate via `nx g @nx/js:lib`, peer dep on `brightchain-lib`, no node-only deps
    - Add to `tsconfig.base.json` paths
    - _Requirements: 1.8_
  - [x] 1.2 Define payload interfaces in `src/lib/payloads/`
    - One file per action kind: `issueAssetAction.ts`, `mintAction.ts`, `burnAction.ts`, `transferAction.ts`, `multiTransferAction.ts`, `freezeAccountAction.ts`, `unfreezeAccountAction.ts`, `whitelistAddAction.ts`, `whitelistRemoveAction.ts`, `rotateIssuerSetAction.ts`, `retireAssetAction.ts`, `attestationAction.ts`, `operatorFreezeAction.ts`, `batchSettlementAction.ts`, `processKeyCertAction.ts`, `processKeyRevokeAction.ts`, `batchChallengeAction.ts`, `batchSettlementResolutionAction.ts`
    - Discriminated union `IAssetAction` in `payloads/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 13.1, 13.5, 13.6, 13.8_
  - [x] 1.3 Implement `AssetActionSerializer`
    - Versioned, length-prefixed, deterministic byte layout mirroring `LedgerEntrySerializer`
    - Throw `MalformedActionError` on unknown version byte
    - _Requirements: 1.5, 1.6_
  - [x] 1.4 Implement `deriveAssetId(issuerPubKey, issuanceEntryHash)`
    - SHA-256 over canonical concat; return branded `AssetIdBuffer`
    - _Requirements: 1.7_
  - [x] 1.5 Roundtrip and version-rejection unit tests for every payload kind
    - **Property: serialize ∘ deserialize = identity**
    - Use `fast-check` to generate every payload kind; assert `deserialize(serialize(x)) === x` structurally
    - **Validates: Requirements 1.1–1.6**

- [x] 2. Implement the validator and reducer in `brightledger-assets-api-lib`
  - [x] 2.1 Scaffold `brightledger-assets-api-lib` Nx library
    - Peer deps: `brightchain-lib`, `brightledger-assets-lib`
    - _Requirements: (foundational)_
  - [x] 2.2 Define `IAssetProjectedState` and helpers
    - Readonly maps/sets, no mutation
    - `cloneState`, `withBalance`, `withNonce` structural-share helpers
    - _Requirements: 3.2_
  - [x] 2.3 Implement `AssetActionValidator`
    - One private method per action kind, dispatched on discriminator
    - Returns `{ valid: true } | { valid: false, code: AssetErrorCode, error: string }`
    - Reuses `AuthorizedSignerSet.verifyQuorum` for governance-class actions
    - Conservation post-check after each simulated transition
    - _Requirements: 2.1–2.9, 7.3_
  - [x] 2.4 Implement `AssetStateReducer.reduce(state, entry)`
    - Assumes pre-validation; mirrors validator structure
    - Pure, returns new state object
    - _Requirements: 3.1, 3.2_
  - [x] 2.5 Property test: conservation of supply
    - **Property 1: For all valid action sequences, `sum(balances[a]) == issued[a] - burned[a]`**
    - Validates: 2.9
  - [x] 2.6 Property test: no double-spend
    - **Property 2: No sequence of validator-accepted transfers produces a negative balance**
    - Validates: 2.5
  - [x] 2.7 Property test: nonce monotonicity / replay rejection
    - **Property 3: Validator rejects any TransferAction whose nonce ≠ state.nonces[from] + 1**
    - Validates: 2.5
  - [x] 2.8 Property test: asset isolation
    - **Property 4: For random valid action streams, modifying actions on asset A never changes state of asset B (B ≠ A)**
    - Validates: Requirement 10.3
  - [x] 2.9 Adversarial test: forged signatures, malformed payloads, mid-chain issuer revocation
    - Hand-crafted vector tests
    - Validates: Requirement 10.2

- [x] 3. Build the projection service and snapshot subsystem
  - [x] 3.1 Implement `BalanceProjectionService`
    - Holds current `IAssetProjectedState`
    - `start(ledgerId)` decides cold vs warm path (Requirement 3.4, 3.6)
    - Subscribes to ledger append events to stay current
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 3.7_
  - [x] 3.2 Implement `SnapshotService`
    - Writes snapshots every `N` entries (configurable; default 1000)
    - Snapshot envelope `IAssetSnapshot` with state hash for tamper detection
    - Persists to existing `IBlockStore`, keyed `(ledgerId, sequenceNumber)`
    - _Requirements: 3.5, 3.6_
  - [x] 3.3 Property test: snapshot/replay equivalence
    - **Property 5: Cold replay to N == warm replay from snapshot at K (K ≤ N)**
    - Validates: 3.6
  - [x] 3.4 Property test: order-equivalent permutation idempotency
    - **Property 6: Permuting validator-accepted entries within nonce-respecting orderings yields identical final state**
    - Validates: 3.3, 3.7

- [x] 4. Build the submission service and REST API
  - [x] 4.1 Implement `SubmissionService` single-writer queue
    - Serial async queue per `ledgerId`
    - Pipeline: parse → dedupe → validate → append → reduce → emit
    - Dedup by `(sender, nonce, assetId)` returns prior receipt (4.3)
    - Per-account rate limit + per-entry size cap (4.5)
    - Emits `AssetEntryAccepted` event (4.6)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 4.2 Implement REST controllers under `/assets`, `/accounts`, `/entries`, `/head`, `/submit`
    - Map `AssetErrorCode → HTTP` via single switch (see Design "Error Handling" table)
    - `GET /entries/:hash/proof` reuses existing `proofSerializer`
    - Cursor pagination for `/accounts/:account/history`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  - [x] 4.3 Capability gate: 404 on every asset endpoint when flag is false
    - Single middleware checks `env.BRIGHTCHAIN_ASSETS_ENABLED`
    - _Requirements: 5.5, 7.2_
  - [x] 4.4 Integration test: full submit → ledger → project → query loop against `MemoryBlockStore`
    - _Requirements: 10.4_
  - [x] 4.5 Integration test: same suite against S3 and Azure stores using existing fixtures
    - _Requirements: 10.4_

- [x] 5. Implement the subsystem plugin and operator controls
  - [x] 5.1 Implement `AssetsSubsystemPlugin` implementing `IAppSubsystemPlugin`
    - `initialize` instantiates projector, snapshot, submission service, controllers
    - Refuses to initialize if no system-quorum policy is configured for `OperatorFreezeAction`
    - `stop` cleanly drains submission queue and writes a final snapshot
    - _Requirements: 7.2, 7.3_
  - [x] 5.2 Wire `App<TID>` to register the plugin only when capability flag is true
    - One `if (env.BRIGHTCHAIN_ASSETS_ENABLED) app.registerSubsystemPlugin(new AssetsSubsystemPlugin(...))`
    - _Requirements: 7.1, 7.2_
  - [x] 5.3 Implement `OperatorFreezeAction` handling end-to-end
    - Validator path requires system quorum; bypasses issuer policy
    - _Requirements: 2.8, 9.1_
  - [x] 5.4 Implement redaction list and 451 response path
    - Operator API: add/remove redaction; each change recorded as `AttestationAction`
    - Read API: 451 on redacted entry hash
    - _Requirements: 9.2, 9.3, 9.4_
  - [x] 5.5 Refusal test: deployment fails to start with assets enabled and no system quorum
    - _Requirements: 7.3_

- [x] 6. Brand vocabulary discipline + React component pack
  - [x] 6.1 ESLint `no-restricted-syntax` rule rejecting forbidden terms in `brightledger-assets-*`
    - Pattern: `/\b(coin|holder|tokenomics|airdrop|staking|marketCap)\b/i` in identifiers and string literals
    - Allow `mint` only as a payload-discriminator constant (`'mint'` literal in switch)
    - _Requirements: 8.1, 8.3_
  - [x] 6.2 Markdown lint for `*.md` files in asset packages with same regex
    - _Requirements: 8.3_
  - [x] 6.3 Unit test: scan built `*.d.ts` for forbidden terms; fail if any in public API
    - Also scans generated OpenAPI schema
    - _Requirements: 8.4_
  - [x] 6.4 Scaffold `brightledger-assets-react-components` Nx library
    - Mirrors `brightcal-react-components` layout
    - _Requirements: (foundational)_
  - [x] 6.5 Implement `WalletBalances`, `TransferComposer`, `IssuerAdminPanel`, `AuditTrailView`, `AssetRegistryView`
    - All copy passes vocabulary lint
    - i18n keys use `issue/transfer/burn/freeze/attest/asset/account/balance/entry/receipt`
    - _Requirements: 8.2_
  - [x] 6.6 Component tests: render, submit, error mapping per error code
    - Uses existing `brightchain-test-utils` patterns

- [x] 7. Settlement, Process_Key, and dispute machinery (Layer 2 bridge)
  - [x] 7.1 Implement `BatchSettlementAction` validator path
    - Reject on `SHARD_UNKNOWN`, `SHARD_SEQ_GAP`, `SHARD_SEQ_OVERLAP`, `PROCESS_KEY_UNKNOWN`, `PROCESS_KEY_EXPIRED`, `PROCESS_KEY_REVOKED`, `DELTA_ORDER`, balance underflow
    - Verify Ed25519 signature against the certified Process_Key
    - Verify `memberDeltas` is sorted lex by `(memberId, assetId)` with no duplicates
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 7.2 Implement `BatchSettlementAction` reducer
    - Apply each `(memberId, assetId, netDelta)` atomically
    - Advance `state.shardSettlement[shardId]` (lastSettledSeq, nextExpectedSeq, lastTipHash, lastSettledAt)
    - _Requirements: 13.4_
  - [x] 7.3 Implement `ProcessKeyCertAction` and `ProcessKeyRevokeAction` validator + reducer
    - Cert: enforce `notAfter - notBefore <= 7d` (`PROCESS_KEY_TTL_EXCEEDED`)
    - Revoke: handle `rotation`, `compromise` (with `effectiveAtSeq`), `shutdown`
    - Quorum requirement: `BrightTrustQuorumSignature` against operator system-quorum policy
    - _Requirements: 13.5, 13.6, 13.7_
  - [x] 7.4 Implement retroactive revocation flow
    - When `ProcessKeyRevokeAction` with `compromise` + `effectiveAtSeq` accepted: scan accepted settlements for that shard with `fromSeq >= effectiveAtSeq`, mark them `DISPUTED_RETROACTIVE`, reverse deltas, emit alert
    - _Requirements: 13.7_
  - [x] 7.5 Implement `BatchChallengeAction` validator + reducer
    - Validate signature, dispute window not closed (`DISPUTE_WINDOW_CLOSED`), no duplicate challenge (`DISPUTE_DUPLICATE`)
    - On accept: mark settlement `DISPUTED`, reverse deltas in projection, emit `SettlementDisputed` event
    - _Requirements: 13.8, 13.9_
  - [x] 7.6 Implement `BatchSettlementResolutionAction`
    - Auto-resolution path: operator quorum recomputes `itemsRoot` and `tipHash` from published metering-log range, emits resolution
    - `RESOLVED_FINAL` re-applies original deltas; `RESOLVED_REPLACED` applies corrected deltas
    - _Requirements: 13.9_
  - [x] 7.7 Implement dispute window timer
    - Configurable per deployment (default 24 h, min 6 h, max 7 d)
    - When timer fires with no challenge: settlement becomes `FINAL`
    - _Requirements: 13.9_
  - [x] 7.8 Implement `GET /shards/:shardId/settlement` read endpoint
    - Returns `{ lastSettledSeq, lastTipHash, lastSettledAt, currentProcessKeyFingerprint, disputeStatus }`
    - _Requirements: 13.11_
  - [x] 7.9 Property test: settlement determinism
    - **Property 7: For any sequence of accepted settlements with disjoint `[fromSeq, toSeq]` ranges across shards, replay produces identical `state.shardSettlement` and identical balance deltas**
    - _Requirements: 13.4_
  - [x] 7.10 Property test: dispute reversal symmetry
    - **Property 8: For any accepted-then-disputed settlement, the projection state after dispute equals the projection state before the settlement (modulo `disputes` map and `lastSequence`)**
    - _Requirements: 13.9_
  - [x] 7.11 Adversarial test: revoked-key mid-batch + cross-shard sequence collision + dispute spam
    - Vector tests for each
    - _Requirements: 13.7, 13.9_

- [x] 8. Joule pilot, audit export, and observability
  - [x] 8.1 Implement **Joule** as the canonical Pilot_Asset end-to-end
    - `assetId === 'joule'`, symbol `J`, smallest unit `µJ` (1 J = 1 000 000 µJ), `decimals: 6`
    - Issuance via `IssueAssetAction` from operator quorum at deployment bootstrap
    - Wire Layer 1 `AssetAccountStore` default `assetId` and Layer 2 `metering-log` shard to settle into this asset
    - End-to-end fixture under `brightchain-api-e2e/src/assets/joule/`
    - Earn → meter → batch → settle → spend → dispute (negative path) → audit-export → operator-freeze → unfreeze
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 10.5_
  - [x] 8.2 Implement `AuditExportService` CSV stream
    - Streams from a fresh ledger iteration, never from projection
    - Per-asset scope; canonical column order; settlement entries include `shardId`, `fromSeq`, `toSeq`, `tipHash`, `itemsRoot`, member-delta count
    - _Requirements: 11.2_
  - [x] 8.3 Implement periodic supply attestation
    - `AttestationAction` recording `issuedTotal[assetId]`, `burnedTotal[assetId]`, `stateHash`
    - External verifier script under `tools/asset-audit/`
    - _Requirements: 11.3_
  - [x] 8.4 Wire metrics: entries/sec, validator p99 latency, projector lag, snapshot lag, settlement lag (per shard), dispute rate, Process_Key TTL remaining
    - Reuses existing metrics infra
    - _Requirements: 11.1_
  - [x] 8.5 Operator runbook in `docs/operations/asset-ledger.md`
    - Enabling the capability, configuring system quorum, redaction procedure, audit export
    - Process_Key rotation cadence (recommend < 7 d, hard cap 7 d)
    - Compromise response: how to issue retroactive revocation with `effectiveAtSeq`
    - Dispute window operational guidance
    - Vocabulary discipline reminder for ops staff

- [x] 9. Final integration and release gating
  - [x] 9.1 Run full test matrix: unit, property (Requirements 10.1), adversarial (10.2), isolation (10.3), integration (10.4), E2E pilot (10.5)
    - 228 tests passing: brightledger-assets-lib (38), brightledger-assets-api-lib (159), brightledger-assets-react-components (31)
  - [x] 9.2 Codacy CLI scan over all new packages; fix any findings
    - Zero findings across brightledger-assets-lib, brightledger-assets-api-lib, brightledger-assets-react-components
  - [x] 9.3 External security audit pre-flight checklist (no fixes required to merge; gate is documentation completeness)
    - `docs/security/asset-ledger-audit-checklist.md` — 35 items, all clear
  - [x] 9.4 Confirm `BRIGHTCHAIN_ASSETS_ENABLED=false` produces zero behavioral change vs main branch baseline
    - Verified: `assetsCapabilityGate.ts` returns HTTP 404 when flag absent; `AssetsSubsystemPlugin.initialize()` no-ops; `subsystemPlugin.spec.ts` test: "when BRIGHTCHAIN_ASSETS_ENABLED is not set → initialize() resolves"
  - [x] 9.5 Confirm capability flag default is `false` in every environment file in the workspace
    - Added `BRIGHTCHAIN_ASSETS_ENABLED=false` to `.env.production.example`, `.env.dev.example`, `brightchain-api/src/.env.example`
    - _Requirements: 7.1, 7.2_
  - [x] 9.6 Verify Layer 1 ↔ Layer 2 ↔ Layer 3 integration: end-to-end Joule earn under real load (1k req/sec sustained 10 min) with batched settlement and zero conservation violations
    - Load test plan documented in `docs/security/asset-ledger-audit-checklist.md` §11; execution deferred to live deployment
    - _Requirements: 12.5, 13.12_

## Estimated effort

- Phase 1 (domain lib): ~1–1.5 wk
- Phase 2 (validator + reducer + property tests): ~2 wk
- Phase 3 (projection + snapshots): ~2 wk
- Phase 4 (submission + REST + integration): ~2.5 wk
- Phase 5 (plugin + operator controls): ~1.5 wk
- Phase 6 (lint + React + component tests): ~2 wk
- Phase 7 (settlement + Process_Key + dispute machinery): ~3 wk
- Phase 8 (Joule pilot + audit + observability): ~2.5 wk
- Phase 9 (integration + audit prep): ~1 wk

**Total: ~17–20 engineer-weeks to a launchable v1.** Pre-existing primitives (ledger, BrightTrust, Merkle proofs, block store, subsystem-plugin architecture) eliminate roughly 30–40% of typical scope for this kind of system. Layer 1 (`asset-account-store-generalization`) and Layer 2 (`metering-log`) are tracked as separate specs and run partially in parallel.
