# Requirements Document

## Introduction

BrightChain already provides a permissioned, append-only, hash-chained, signed ledger with BrightTrust quorum-based authorization, governance entries, incremental Merkle proofs, and a pluggable block-store backend. This feature adds a **programmable asset layer** on top of that ledger so that operators (and, optionally, third-party issuers under operator control) can define, issue, transfer, and audit named **assets** — loyalty points, internal credits, B2B settlement records, tokenized receipts, content micro-credits, in-app currencies, and similar use cases.

This is explicitly **not** a cryptocurrency, blockchain network, or speculation market. There is no native asset, no fees in protocol, no exchange, no order book, no price feed, and no public permissionless tier. The vocabulary throughout the codebase, API, and UI uses neutral accounting language: *issue*, *transfer*, *burn*, *attestation*, *account*, *balance* — never *mint*, *coin*, *holder*, or *market cap*.

The asset layer is delivered as a new browser-safe library plus a node-side service library plus optional REST controllers and React components, all gated behind a capability flag that defaults to **off**.

## Glossary

- **Asset**: A named, issuable, transferable unit of value recorded on a BrightChain ledger. Defined by an `IssueAssetAction` governance entry. Has a unique `assetId` namespaced by the issuing operator's public key.
- **Asset_Id**: A deterministic identifier for an asset, derived from the hash of its `IssueAssetAction` entry plus the issuer's public key. Globally unique within a deployment.
- **Issuer_Set**: An `AuthorizedSignerSet` (existing primitive) bound to a specific asset, governing which keys may mint, burn, freeze, or rotate the asset. Each asset has its own issuer set; assets cannot affect each other.
- **Asset_Action**: Any payload kind defined by this feature — `IssueAssetAction`, `MintAction`, `BurnAction`, `TransferAction`, `MultiTransferAction`, `FreezeAccountAction`, `UnfreezeAccountAction`, `WhitelistAddAction`, `WhitelistRemoveAction`, `RotateIssuerSetAction`, `RetireAssetAction`, `AttestationAction`, `OperatorFreezeAction`, `BatchSettlementAction`, `ProcessKeyCertAction`, `ProcessKeyRevokeAction`, `BatchChallengeAction`.
- **Metering_Log**: The Layer 2 per-shard signed hash chain (see `metering-log` spec) that batches high-frequency micro-events off-ledger and produces compact verifiable settlement batches posted via `BatchSettlementAction`. The asset ledger is the *settlement layer*; the metering log is the *capture layer*.
- **Settlement_Batch**: A signed, Merkle-rooted summary of a contiguous metering-log range `[fromSeq, toSeq]` for a single shard, recorded by a `BatchSettlementAction` and applied to balances via deterministic `memberDeltas`.
- **Process_Key**: An ephemeral Ed25519 keypair issued by an operator-quorum-signed `ProcessKeyCertAction` with a hard `notAfter` ≤ 7 days. Metering-log shards sign records and settlement batches under a Process_Key, never under operator root keys.
- **Pilot_Asset_Joule** (a.k.a. **Joule**): The canonical first-class reference asset of this deployment. Unit: 1 J = 1 000 000 µJ (microjoules) stored as `bigint`. `assetId === 'joule'`. Operationally produced by Layer 1 (`AssetAccountStore`) and earned/spent through the Layer 2 metering log, with periodic settlement batches landing on this Layer 3 ledger.
- **Account**: A public key (or member identifier resolving to one) that can hold a balance of an asset. Reuses BrightChain's existing member/key infrastructure; no new identity system.
- **Balance_Projection**: The deterministic in-memory state derived by replaying ledger entries through the `AssetActionValidator` and `AssetStateReducer`. The single source of truth for "what is the current balance of X for account Y."
- **Snapshot**: A periodic serialization of the Balance_Projection persisted to the existing `IBlockStore`, keyed on `(ledgerId, sequenceNumber)`, used to short-circuit cold-start replay.
- **Submission_Service**: The single-writer (per ledger) service that accepts a signed Asset_Action, validates it against the current Balance_Projection, appends it to the ledger via existing primitives, and updates the projection.
- **Transfer_Policy**: One of `open` (any account may receive) or `whitelist` (only whitelisted accounts may receive); set per asset at issuance.
- **Supply_Policy**: One of `fixed` (initial supply only, no future minting), `mintable` (issuer may mint up to no cap), or `capped:N` (issuer may mint up to total `N`).
- **Capability_Flag**: An environment-driven boolean (`BRIGHTCHAIN_ASSETS_ENABLED`) that defaults to `false`. When `false`, no asset endpoints, services, or plugins are loaded.
- **Operator**: The party running a BrightChain deployment. Distinct from an issuer; the operator may also be an issuer.
- **Issuer**: A party authorized by the operator to define assets and issue mint/burn/freeze actions for those assets, subject to the asset's BrightTrust policy.
- **Pilot_Asset**: The canonical first-party reference asset shipped as the fixture-driven scenario suite. For this deployment the Pilot_Asset is **Joule** (see Requirement 12). BrightHub credits, BrightMail postage stamps, and Digital Burn Bag retention receipts remain *secondary reference assets* implementable on the same primitives but are not the launch vehicle.

## Requirements

### Requirement 1: Asset Action Payloads

**User Story:** As a library author, I want a typed, versioned, canonically-serialized payload schema for every asset action, so that the wire format is locked early and every layer (validator, projector, API, SDK) operates on identical bytes.

#### Acceptance Criteria

1. THE asset layer SHALL define payload interfaces for `IssueAssetAction`, `MintAction`, `BurnAction`, `TransferAction`, `MultiTransferAction`, `FreezeAccountAction`, `UnfreezeAccountAction`, `WhitelistAddAction`, `WhitelistRemoveAction`, `RotateIssuerSetAction`, `RetireAssetAction`, `AttestationAction`, `OperatorFreezeAction`, `BatchSettlementAction`, `ProcessKeyCertAction`, `ProcessKeyRevokeAction`, and `BatchChallengeAction` in a browser-safe library.
2. THE `IssueAssetAction` payload SHALL include `symbol`, `displayName`, `decimals` (0–18 inclusive), `supplyPolicy`, `transferPolicy`, `freezable` flag, `burnable` flag, `initialIssuerSet`, `initialBrightTrustPolicy`, and an optional `metadataRefs` array of off-ledger document hashes.
3. THE `TransferAction` payload SHALL include `assetId`, `from`, `to`, `amount` (bigint, encoded as canonical bytes), `nonce` (bigint), `expiry` (unix-ms timestamp or null), and an optional `memo` (≤ 256 bytes).
4. THE `MultiTransferAction` payload SHALL include an array of `TransferAction` legs and a single combined signature; all legs SHALL be applied atomically or none.
5. THE asset layer SHALL provide a canonical serializer mirroring the existing `LedgerEntrySerializer` pattern, producing deterministic, versioned, length-prefixed byte layouts for every payload kind.
6. THE serializer SHALL include a leading version byte; deserialization of an unknown version SHALL throw a descriptive error.
7. THE `Asset_Id` SHALL be derived from `SHA-256(issuerPublicKey || issuanceEntryHash)` and computed at serialization time of the `IssueAssetAction`.
8. THE asset layer SHALL be browser-safe and SHALL NOT depend on any node-only APIs or `brightchain-api-lib`.

### Requirement 2: Validator (Pure, Deterministic)

**User Story:** As a service author, I want a single pure validator that decides whether an asset action is acceptable given current state, so that validation logic is fully unit-testable and identical across server and client preview.

#### Acceptance Criteria

1. THE `AssetActionValidator` SHALL accept `(action, currentState, ledgerContext)` and return `{ valid: true } | { valid: false, error: string, code: string }`.
2. THE validator SHALL perform no I/O.
3. WHEN validating an `IssueAssetAction`, THE validator SHALL reject the action IF the derived `Asset_Id` is already registered in `currentState.assets`.
4. WHEN validating a `MintAction`, THE validator SHALL reject the action IF the asset's `supplyPolicy` is `fixed`, OR IF the cumulative supply would exceed `capped:N`, OR IF the signing quorum does not satisfy the asset's BrightTrust policy via the existing `AuthorizedSignerSet.verifyQuorum`, OR IF the destination account is frozen for that asset.
5. WHEN validating a `TransferAction`, THE validator SHALL reject the action IF `signer !== from`, OR IF `amount <= 0`, OR IF `currentState.balances[assetId][from] < amount`, OR IF `nonce !== currentState.nonces[from] + 1`, OR IF `expiry !== null && expiry < ledgerContext.now`, OR IF `from` is frozen for the asset, OR IF `transferPolicy === whitelist` and `to` is not on the whitelist.
6. WHEN validating a `MultiTransferAction`, THE validator SHALL reject the action IF any leg fails any rule from Requirement 2.5; intermediate state changes from earlier legs SHALL be visible to later legs within the same action.
7. WHEN validating any governance-class action (`Freeze`, `Unfreeze`, `WhitelistAdd`, `WhitelistRemove`, `RotateIssuerSet`, `RetireAsset`), THE validator SHALL reject the action IF the signing quorum does not satisfy the asset's BrightTrust policy.
8. WHEN validating an `OperatorFreezeAction`, THE validator SHALL reject the action IF the signing quorum does not satisfy the deployment-wide system-quorum policy; this action SHALL be valid against any asset regardless of issuer wishes.
9. THE validator SHALL enforce the conservation invariant `sum(balances[assetId]) == issuedTotal[assetId] - burnedTotal[assetId]` after every accepted state transition.

### Requirement 3: Balance Projection and State Reducer

**User Story:** As an API consumer, I want O(1) balance lookups, so that a client app can render a wallet without scanning the entire ledger.

#### Acceptance Criteria

1. THE `AssetStateReducer` SHALL define a pure function `reduce(state, ledgerEntry) → state'` that produces the next state from an accepted entry.
2. THE projected state SHALL include `assets`, `balances`, `nonces`, `frozen`, `whitelist`, `issuedTotal`, `burnedTotal`, `issuerSets`, and `lastSequence`.
3. WHEN started cold, THE projection service SHALL replay every entry from sequence 0 through head and arrive at the same state regardless of replay batching.
4. WHEN started warm, THE projection service SHALL load the most recent valid Snapshot and replay only entries with `sequenceNumber > snapshot.sequenceNumber`.
5. THE projection service SHALL write a Snapshot to the existing `IBlockStore` every `N` entries, where `N` is configurable and defaults to `1000`.
6. THE projection service SHALL verify, on warm start, that replaying from snapshot to head produces the same `lastSequence` and an identical hash of the projected state as the latest snapshot would have produced via cold replay; on mismatch, THE service SHALL discard the snapshot and fall back to cold replay.
7. THE projection service SHALL never accept a Reducer transition from an entry the validator did not pre-approve.

### Requirement 4: Submission Service

**User Story:** As a client application, I want a single endpoint to submit a signed asset action and learn whether it was accepted, so that I do not have to coordinate ledger appends myself.

#### Acceptance Criteria

1. THE Submission_Service SHALL be a single-writer queue per `ledgerId`; concurrent submissions SHALL be serialized.
2. WHEN a submission arrives, THE Submission_Service SHALL: parse the action, run the validator against the current Balance_Projection, append to the ledger via the existing `Ledger.append`, update the projection, and return `{ entryHash, sequenceNumber, acceptedAt }`.
3. WHEN a duplicate submission is detected by `(sender, nonce, assetId)` matching an already-accepted entry, THE Submission_Service SHALL return the original `{ entryHash, sequenceNumber, acceptedAt }` instead of appending a second entry.
4. WHEN validation fails, THE Submission_Service SHALL return `{ rejected: true, code, error }` and SHALL NOT append to the ledger.
5. THE Submission_Service SHALL enforce a per-account submission rate limit (configurable, defaults to `60/min`) and a per-entry size cap (configurable, defaults to `64 KiB`).
6. THE Submission_Service SHALL emit an event for every accepted entry on the existing event system, payload `{ ledgerId, assetId?, entryHash, sequenceNumber }`.

### Requirement 5: Read API

**User Story:** As a wallet UI, I want REST endpoints to query assets, balances, history, and inclusion proofs, so that I can render account state without re-implementing the projection.

#### Acceptance Criteria

1. THE Read API SHALL expose `GET /assets`, `GET /assets/:assetId`, `GET /assets/:assetId/supply`, `GET /accounts/:account/balances`, `GET /accounts/:account/balances/:assetId`, `GET /accounts/:account/history`, `GET /entries/:entryHash/proof`, and `GET /head`.
2. THE `GET /entries/:entryHash/proof` endpoint SHALL return a serialized inclusion proof produced by the existing `IncrementalMerkleTree` and `proofSerializer`.
3. THE `GET /head` endpoint SHALL return `{ ledgerId, sequenceNumber, merkleRoot, timestamp }` for use by light clients.
4. THE history endpoint SHALL be cursor-paginated and SHALL accept an optional `assetId` filter.
5. WHEN any read endpoint is called and the Capability_Flag is `false`, THE Read API SHALL return HTTP 404.
6. THE Read API SHALL NOT expose any write endpoint; all writes go through `POST /submit` defined in Requirement 4.

### Requirement 6: Client SDK

**User Story:** As an application developer, I want a browser-safe SDK that constructs and signs asset actions and verifies inclusion proofs, so that I can build wallets and admin UIs without re-implementing serialization.

#### Acceptance Criteria

1. THE SDK SHALL provide `createTransfer(senderKey, args)`, `createMultiTransfer(senderKey, args)`, `createIssueAsset(issuerKey, args)`, `createMint`, `createBurn`, and the remaining governance constructors.
2. THE SDK SHALL provide `verifyInclusionProof(proof, root)` reusing the existing browser-safe verifier.
3. THE SDK SHALL provide a `Wallet` class that tracks per-account `nonce` locally and increments after each successful submission.
4. THE SDK SHALL refuse to sign a `TransferAction` with a `nonce` lower than its locally-tracked nonce for the same `from` account.
5. THE SDK SHALL be importable in browser and node without bundler-specific shims.

### Requirement 7: Capability Flag and Operator Controls

**User Story:** As a deployment operator, I want the asset layer disabled by default and gated behind a single environment flag, so that the feature does not load unless I explicitly opt in.

#### Acceptance Criteria

1. THE Capability_Flag `BRIGHTCHAIN_ASSETS_ENABLED` SHALL default to `false`.
2. WHEN the Capability_Flag is `false`, THE App SHALL NOT register the asset subsystem plugin, SHALL NOT mount any asset routes, and SHALL NOT instantiate the projection service.
3. THE deployment SHALL refuse to start with the asset layer enabled IF a system-quorum policy for `OperatorFreezeAction` is not configured.
4. THE asset layer SHALL never define a "native" asset; the genesis state SHALL contain zero assets.
5. THE asset layer SHALL never expose any endpoint or service that quotes a price, runs an order book, or matches buyers and sellers.
6. THE asset layer SHALL never collect a fee in protocol; any commercial relationship between operator and issuer is out of band.

### Requirement 8: Brand Vocabulary Discipline

**User Story:** As a project maintainer, I want the codebase, API, and UI to use neutral accounting vocabulary, so that the framing "assets, not coins" is enforced mechanically.

#### Acceptance Criteria

1. THE asset layer source code, public API, OpenAPI schema, and React component copy SHALL NOT contain the words `coin`, `mint` (as a verb in user-facing text), `holder` (in the cryptocurrency sense), `market cap`, `tokenomics`, `airdrop`, or `staking`.
2. THE asset layer SHALL use the verbs `issue`, `transfer`, `burn`, `freeze`, and `attest`; nouns SHALL be `asset`, `account`, `balance`, `entry`, and `receipt`.
3. THE repository SHALL include a lint rule (`no-restricted-syntax` plus a markdown lint pattern) that fails CI IF any forbidden term from Requirement 8.1 appears in `*.ts`, `*.tsx`, or `*.md` files under the asset-layer libraries.
4. THE function name `mint` MAY appear internally only as a verb on `MintAction` payloads; it SHALL NOT appear in any user-facing string, log message, OpenAPI description, or React component.

### Requirement 9: Operator Freeze and Redaction

**User Story:** As an operator served with legal process, I want a protocol-level freeze and an operator-side redaction list, so that I can comply without breaking the cryptographic chain.

#### Acceptance Criteria

1. THE `OperatorFreezeAction` SHALL freeze a specific `(assetId, account)` pair regardless of issuer wishes.
2. THE Submission_Service SHALL maintain an operator-managed redaction list that hides specified entry hashes from all read endpoints; the entries SHALL remain in the ledger and remain cryptographically linked.
3. WHEN a redacted entry is requested by hash, THE Read API SHALL return HTTP 451 with a deployment-configurable message.
4. THE redaction mechanism SHALL be auditable: each redaction SHALL be recorded as an `AttestationAction` on the same ledger.

### Requirement 10: Test Coverage

**User Story:** As a maintainer, I want comprehensive property-based, adversarial, and integration tests, so that conservation, replay-safety, and isolation invariants are mechanically enforced.

#### Acceptance Criteria

1. THE test suite SHALL include property tests (using `fast-check`) for: conservation of supply per asset, no-double-spend, no-replay, no-overflow, snapshot/replay equivalence, and order-equivalent permutation idempotency.
2. THE test suite SHALL include adversarial tests for: forged signatures, mid-chain issuer revocation, malformed payloads, oversized amounts, nonce gaps, and submissions targeting a non-existent asset.
3. THE test suite SHALL include an isolation test proving that a malicious or buggy `IssueAssetAction` for asset A cannot alter the balances, supply, or issuer set of any other asset B.
4. THE test suite SHALL include an integration test that runs the full submit→ledger→project→query loop against `MemoryBlockStore` and at least one persistent `IBlockStore` implementation.
5. THE test suite SHALL include at least one E2E scenario suite for one of the three Pilot_Asset use cases (BrightHub credits, BrightMail postage stamps, or Burn Bag retention receipts).

### Requirement 11: Observability and Audit Export

**User Story:** As an auditor, I want to export a canonical record of all entries and a periodic supply-attestation, so that I can reconcile the on-ledger state against external books.

#### Acceptance Criteria

1. THE asset layer SHALL emit metrics: entries-per-second, validator-latency-p99, projector-lag (entries behind head), snapshot-lag (entries since last snapshot).
2. THE asset layer SHALL provide a CSV export endpoint scoped to a single asset, returning every entry touching that asset with canonical fields.
3. THE asset layer SHALL support a periodic `AttestationAction` recording total `issuedTotal[assetId]`, `burnedTotal[assetId]`, and the projection state hash; an external auditor SHALL be able to verify this attestation against a fresh cold replay.

### Requirement 12: Pilot Asset (Joule, Canonical)

**User Story:** As a project lead, I want **Joule** designated as the canonical Pilot_Asset shipped as the reference implementation, so that the three-layer architecture (operational store + metering log + settlement ledger) is proved end-to-end on a single first-class asset and external operators have a worked example that exercises every primitive.

#### Acceptance Criteria

1. THE asset layer SHALL ship **Joule** as its single canonical Pilot_Asset, implemented end-to-end (lib + api + react + tests + docs).
2. THE Pilot_Asset SHALL have `assetId === 'joule'`, unit symbol `J`, smallest unit microjoule (`µJ`, 1 J = 1 000 000 µJ), and SHALL be the default `assetId` of the Layer 1 `AssetAccountStore` (see `asset-account-store-generalization` spec).
3. THE Pilot_Asset SHALL be earned and spent through the Layer 2 Metering_Log (see `metering-log` spec) and settled onto this Layer 3 ledger through `BatchSettlementAction` entries.
4. THE Pilot_Asset SHALL NOT involve fiat currency, exchange rates, or any speculative redemption; the Joule is a non-fungible-with-money internal accounting unit denoting compute / storage / bandwidth resource credits.
5. THE Pilot_Asset SHALL serve as the fixture for the E2E scenario suite required by Requirement 10.5, exercising the full earn → meter → batch → settle → spend → audit loop.
6. BrightHub credits, BrightMail postage stamps, and Digital Burn Bag retention receipts MAY be implemented as additional non-canonical assets on the same primitives but are NOT required for v1 release of this spec.

### Requirement 13: Layer 2 Metering Log Integration (Settlement Layer)

**User Story:** As an operator running high-frequency, low-amount Joule earn/spend events (per-request compute charges, per-byte bandwidth charges, per-second storage rent), I want a verifiable batched settlement path so the Layer 3 ledger never needs to record every micro-event yet remains the cryptographic source of truth.

#### Acceptance Criteria

1. THE asset layer SHALL define a `BatchSettlementAction` payload with fields `{ kind: 'BatchSettlement', shardId: UUIDv7, fromSeq: bigint, toSeq: bigint, tipHash: Uint8Array(32), itemsRoot: Uint8Array(32), memberDeltas: ReadonlyArray<{ memberId: MemberId; assetId: AssetId; netDelta: bigint }>, sigEnvelope: ProcessKeySignature }`.
2. THE `memberDeltas` array SHALL be sorted lexicographically by `(memberId, assetId)` and SHALL contain at most one entry per `(memberId, assetId)` pair (deduplication enforced at construction time and re-checked by validator).
3. THE validator SHALL reject a `BatchSettlementAction` IF the signing Process_Key is not currently certified for `shardId` (no live `ProcessKeyCertAction` whose `notAfter > ledgerContext.now`), OR IF a previous `BatchSettlementAction` for the same `shardId` with overlapping `[fromSeq, toSeq]` has already been accepted, OR IF `fromSeq !== state.shardSettlement[shardId].nextExpectedSeq`, OR IF `itemsRoot` is not 32 bytes, OR IF `memberDeltas` violates ordering / deduplication, OR IF applying any `netDelta` would underflow a balance below zero given the destination Layer 1 account's current balance and reservations.
4. WHEN validation succeeds, THE reducer SHALL apply each `(memberId, assetId, netDelta)` atomically to the projected balances and SHALL advance `state.shardSettlement[shardId]` to `{ lastSettledSeq: toSeq, lastTipHash: tipHash, lastSettledAt: ledgerContext.now }`.
5. THE asset layer SHALL define a `ProcessKeyCertAction` payload with fields `{ kind: 'ProcessKeyCert', shardId: UUIDv7, fingerprint: Uint8Array(32), pubKey: Uint8Array(32), notBefore: number, notAfter: number, operatorSig: BrightTrustQuorumSignature }` where `notAfter - notBefore <= 7 days`.
6. THE asset layer SHALL define a `ProcessKeyRevokeAction` payload with fields `{ kind: 'ProcessKeyRevoke', shardId: UUIDv7, fingerprint: Uint8Array(32), reason: 'rotation' | 'compromise' | 'shutdown', effectiveAtSeq?: bigint, operatorSig: BrightTrustQuorumSignature }`.
7. WHEN a `ProcessKeyRevokeAction` with `reason === 'compromise'` and an `effectiveAtSeq` is accepted, THE validator SHALL retroactively reject any subsequent `BatchSettlementAction` for the same `shardId` whose `fromSeq >= effectiveAtSeq` and whose signing Process_Key fingerprint matches the revoked one; previously-accepted such batches SHALL be marked `DISPUTED_RETROACTIVE` and reverted via the dispute mechanism in 13.9.
8. THE asset layer SHALL define a `BatchChallengeAction` payload with fields `{ kind: 'BatchChallenge', settlementEntryHash: Uint8Array(32), claim: 'wrong-itemsRoot' | 'wrong-tipHash' | 'wrong-delta' | 'wrong-fromSeq' | 'revoked-key', evidence: { merkleProof?: Uint8Array; auditedRecords?: Uint8Array }, challengerSig: Signature }`.
9. THE asset layer SHALL implement a dispute window of **24 hours** (configurable, minimum 6 h, maximum 7 d) per `BatchSettlementAction`. WHEN a `BatchChallengeAction` is accepted within the window for a referenced settlement, THE Submission_Service SHALL: (a) mark the challenged settlement as `DISPUTED`, (b) emit a `SettlementDisputed` event, (c) reverse the `memberDeltas` from the projection, (d) auto-resolve by recomputing `itemsRoot` and `tipHash` from the operator-published metering-log range and emitting a `BatchSettlementResolutionAction` (one of `RESOLVED_FINAL` if challenge invalid, `RESOLVED_REPLACED` with corrected deltas if challenge valid). After the dispute window expires with no challenge, the settlement is permanently `FINAL` and SHALL NOT be reversible except by `OperatorFreezeAction`.
10. THE `BatchSettlementAction` and the four supporting actions in this requirement SHALL satisfy all base invariants from Requirements 1–11, including conservation (9.9), brand vocabulary (Requirement 8), capability flag gating (Requirement 7), and operator-freeze override (Requirement 9).
11. THE projected state SHALL expose, via the Read API, `GET /shards/:shardId/settlement` returning `{ lastSettledSeq, lastTipHash, lastSettledAt, currentProcessKeyFingerprint, disputeStatus }` for each shard known to the ledger.
12. THE `metering-log` spec SHALL be a strict prerequisite of the v1 release of this spec; the Pilot_Asset E2E (Requirement 12.5) SHALL NOT be considered complete without at least one shard producing real `BatchSettlementAction` entries that pass through the dispute window successfully.
