# Implementation Plan: Reputation-Backed Spacetime Audit (RBSA)

## Overview

Implement the RBSA feature incrementally across three packages: shared interfaces and pure logic in `brightchain-lib`, Node.js service implementations in `brightchain-api-lib`, and the React UI overlay in `brightchain-react`. Each task builds on the previous, ending with full integration. Property-based tests use `fast-check` and follow the `*.property.spec.ts` naming convention.

---

## Tasks

- [ ] 1. Define shared constants and core interfaces in `brightchain-lib`
  - Create `brightchain-lib/src/lib/interfaces/rbsa/rbsaConstants.ts` with `RBSA_COLLECTION_NAME`, `RBSA_DEFAULT_BASELINE_SCORE`, `RBSA_DEFAULT_REPUTATION_THRESHOLD`, `RBSA_DEFAULT_SUCCESS_DELTA`, `RBSA_DEFAULT_FAILURE_DELTA`, `RBSA_GOSSIP_TTL`, `RBSA_CHALLENGE_RELAY_TTL`, `RBSA_PROOF_TIMEOUT_SECONDS`, `RBSA_RECONSTRUCTION_TIMEOUT_SECONDS`, `RBSA_ARCHIVE_RELAXED_THRESHOLD`, and `RBSA_TIER_INTERVAL_DAYS`
  - Create `brightchain-lib/src/lib/interfaces/rbsa/nodeReputationRecord.ts` with `INodeReputationRecord` (fields: `nodeId`, `score`, `lastUpdatedAt`, `createdAt` using `BrightDateTimestamp`)
  - Create `brightchain-lib/src/lib/interfaces/rbsa/reputationStore.ts` with `IReputationStore` interface (`getOrCreate`, `get`, `applyDelta`, `getTopN`, `getBelowThreshold`)
  - Export all new interfaces and constants from the `brightchain-lib` barrel (`index.ts`)
  - _Requirements: 1.1, 1.3, 1.4, 1.6, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 2. Extend the gossip schema with RBSA message types
  - [ ] 2.1 Add `'audit_challenge' | 'audit_proof' | 'audit_result'` to the `BlockAnnouncement.type` union in `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`
    - Add `AuditChallengeMetadata`, `AuditProofMetadata`, and `AuditResultMetadata` interfaces to the same file
    - Add optional fields `auditChallenge?`, `auditProof?`, `auditResult?` to `BlockAnnouncement`, following the existing `poolJoinRequest` / `poolJoinApproval` / `brightTrustProposal` pattern
    - Add the three new literals to the `VALID_ANNOUNCEMENT_TYPES` constant array
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [ ] 2.2 Write unit tests for gossip schema extension
    - Verify the three new type literals are present in `VALID_ANNOUNCEMENT_TYPES`
    - Verify that a `BlockAnnouncement` of type `'audit_challenge'` without `auditChallenge` metadata is rejected by the existing type-guard / validation logic
    - _Requirements: 12.4, 12.5_

- [ ] 3. Define DTO types and implement the metadata serializer
  - [ ] 3.1 Create `brightchain-lib/src/lib/interfaces/rbsa/auditMetadataDto.ts` with `AuditChallengeMetadataDto`, `AuditProofMetadataDto`, and `AuditResultMetadataDto` (bigint fields as decimal strings, `Uint8Array` fields as hex strings)
    - Create `brightchain-lib/src/lib/interfaces/rbsa/energyLedgerEntry.ts` with `IRbsaEnergyLedgerEntry` (bigint µJ fields) and `IRbsaEnergyLedgerEntryDto` (bigint fields as decimal strings)
    - Export all new DTO types from the `brightchain-lib` barrel
    - _Requirements: 14.1, 8.1, 8.2_

  - [ ] 3.2 Implement `brightchain-lib/src/lib/serializers/rbsaMetadataSerializer.ts`
    - Implement `serializeAuditChallenge`, `deserializeAuditChallenge`, `serializeAuditProof`, `deserializeAuditProof`, `serializeAuditResult`, `deserializeAuditResult`
    - Deserializer MUST throw `ValidationError` (from `brightchain-lib/src/lib/errors/validationError.ts`) when a decimal-string bigint field contains a non-numeric value, including the field name and received value in the error message
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

  - [ ] 3.3 Write property test: AuditChallengeMetadata round-trip (Property 1)
    - File: `brightchain-lib/src/lib/serializers/rbsaMetadataSerializer.property.spec.ts`
    - **Property 1: Audit Metadata Round-Trip (Challenge)**
    - **Validates: Requirements 14.2**

  - [ ] 3.4 Write property test: AuditProofMetadata round-trip (Property 2)
    - File: `brightchain-lib/src/lib/serializers/rbsaMetadataSerializer.property.spec.ts`
    - **Property 2: Audit Metadata Round-Trip (Proof)** — verify `computationMicroJoules` preserved exactly as `bigint`
    - **Validates: Requirements 14.3**

  - [ ] 3.5 Write property test: AuditResultMetadata round-trip (Property 3)
    - File: `brightchain-lib/src/lib/serializers/rbsaMetadataSerializer.property.spec.ts`
    - **Property 3: Audit Metadata Round-Trip (Result)**
    - **Validates: Requirements 14.4**

  - [ ] 3.6 Write property test: ValidationError on invalid decimal string (Property 10)
    - File: `brightchain-lib/src/lib/serializers/rbsaMetadataSerializer.property.spec.ts`
    - **Property 10: ValidationError on Invalid Decimal String** — for any non-numeric string passed as a bigint DTO field, deserializer SHALL throw `ValidationError` identifying field name and received value
    - **Validates: Requirements 14.5**

- [ ] 4. Implement the `AuditScheduler` pure functions
  - [ ] 4.1 Create `brightchain-lib/src/lib/rbsa/auditScheduler.ts`
    - Implement `rsParamsToAuditTier(rsK, rsM)` — maps canonical RS param pairs to `BurnbagStorageTier`; falls back to `'standard'` for unrecognized params
    - Implement `computeAuditSlot(brightDateDecimalDays, tier)` — returns `Math.floor(brightDateDecimalDays / tierIntervalDays)`; returns 0 for `'none'` tier
    - Implement `selectChallenger(blockId, auditSlot, replicaNodeIds)` — sorts `replicaNodeIds` lexicographically, hashes `blockId || auditSlot` via `@digitaldefiance/node-rs-accelerate`, returns `sortedNodeIds[hash mod length]`; returns `null` if fewer than 2 entries
    - Export from `brightchain-lib` barrel
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1, 9.2, 9.5_

  - [ ] 4.2 Write property test: Deterministic challenger selection (Property 4)
    - File: `brightchain-lib/src/lib/rbsa/auditScheduler.property.spec.ts`
    - **Property 4: Deterministic Challenger Selection** — same inputs always produce same output
    - **Validates: Requirements 3.1, 3.4**

  - [ ] 4.3 Write property test: Input-order independence (Property 5)
    - File: `brightchain-lib/src/lib/rbsa/auditScheduler.property.spec.ts`
    - **Property 5: Challenger Selection is Input-Order Independent** — shuffling `replicaNodeIds` before passing to `selectChallenger` produces the same result
    - **Validates: Requirements 3.5**

  - [ ] 4.4 Write property test: Audit slot formula (Property 6)
    - File: `brightchain-lib/src/lib/rbsa/auditScheduler.property.spec.ts`
    - **Property 6: Audit Slot Formula** — `computeAuditSlot` returns `Math.floor(brightDateDecimalDays / tierIntervalDays)` for any non-negative input and positive interval
    - **Validates: Requirements 3.2**

  - [ ] 4.5 Write property test: Audit tier mapping (Property 9)
    - File: `brightchain-lib/src/lib/rbsa/auditScheduler.property.spec.ts`
    - **Property 9: Audit Tier Mapping** — each canonical RS param pair maps to the correct `BurnbagStorageTier` and the tier's interval matches `RBSA_TIER_INTERVAL_DAYS`
    - **Validates: Requirements 9.1, 3.3**

- [ ] 5. Checkpoint — Ensure all `brightchain-lib` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `ReputationStore` in `brightchain-api-lib`
  - [ ] 6.1 Create `brightchain-api-lib/src/lib/rbsa/reputationStore.ts` implementing `IReputationStore` with MongoDB
    - Constructor accepts `Db`; stores collection typed as `Collection<INodeReputationRecord>` using `RBSA_COLLECTION_NAME`
    - Implement `initialize()` — creates unique index on `nodeId` and descending index on `score`
    - Implement `getOrCreate` — upserts with `RBSA_DEFAULT_BASELINE_SCORE` if not found
    - Implement `get` — returns `null` if not found
    - Implement `applyDelta` — uses `findOneAndUpdate` with `$inc` on `score` and conditional `$set` on `lastUpdatedAt` (only when incoming `updatedAt` is strictly greater than stored value)
    - Implement `getTopN` — sorts by `score` descending, limits to `n`
    - Implement `getBelowThreshold` — filters `score < threshold`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 13.1, 13.2, 13.4_

  - [ ] 6.2 Write property test: New node baseline initialization (Property 12)
    - File: `brightchain-lib/src/lib/rbsa/reputationScore.property.spec.ts`
    - **Property 12: New Node Baseline Initialization** — `getOrCreate` for any previously-unseen node ID returns `score === RBSA_DEFAULT_BASELINE_SCORE`
    - **Validates: Requirements 1.3**

  - [ ] 6.3 Write property test: Score monotonicity on success (Property 7)
    - File: `brightchain-lib/src/lib/rbsa/reputationScore.property.spec.ts`
    - **Property 7: Reputation Score Monotonicity on Success** — applying a success delta increases score by exactly `successDelta`
    - **Validates: Requirements 6.2**

  - [ ] 6.4 Write property test: Score monotonicity on failure (Property 8)
    - File: `brightchain-lib/src/lib/rbsa/reputationScore.property.spec.ts`
    - **Property 8: Reputation Score Monotonicity on Failure** — applying a failure delta decreases score by exactly `|failureDelta|`, clamped to 0
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 6.5 Write property test: getTopN correctness (Property 11)
    - File: `brightchain-lib/src/lib/rbsa/reputationScore.property.spec.ts`
    - **Property 11: getTopN Returns Highest Scores in Descending Order** — for any set of records and any `n ≥ 1`, returned records are the top-n by score, ordered descending
    - **Validates: Requirements 13.5, 10.1**

- [ ] 7. Implement `RbsaEnergyLedger` in `brightchain-api-lib`
  - [ ] 7.1 Create `brightchain-api-lib/src/lib/rbsa/rbsaEnergyLedger.ts`
    - Constructor accepts `Db` and `AssetAccountStore`
    - Implement `initialize()` — creates indexes on `(challengerNodeId, timestamp)`, `(proverNodeId, timestamp)`, and `(rsK, rsM)`
    - Implement `record(entry: IRbsaEnergyLedgerEntry)` — serializes bigint fields to decimal strings via `IRbsaEnergyLedgerEntryDto`, persists to `rbsa_energy_ledger` collection within 100ms
    - Implement `aggregateByRsParams()` — returns aggregate `totalAuditMicroJoules` grouped by `(rsK, rsM)`
    - Implement `aggregateByProver(proverNodeId, windowDays)` — returns aggregate `totalAuditMicroJoules` for a prover over a BrightDate decimal day window
    - Integrate `AssetAccountStore` debit of `totalAuditMicroJoules` from Challenger's Joule account; log error and continue if debit fails
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 7.2 Write unit tests for `RbsaEnergyLedger`
    - Verify entry persistence within 100ms (mock MongoDB)
    - Verify `aggregateByRsParams` and `aggregateByProver` return correct grouped sums
    - Verify Joule debit failure does not block entry recording
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [ ] 8. Implement `ParityReconstructionService` in `brightchain-api-lib`
  - Create `brightchain-api-lib/src/lib/rbsa/parityReconstructionService.ts`
  - Constructor accepts `IBlockStore`, `IReputationStore`, `IGossipService`, and `threshold: number`
  - Implement `reconstruct(blockId, failedNodeId)`:
    - Filter `replicaNodeIds` to nodes with `score >= threshold` via `IReputationStore`
    - Call `IBlockStore.recoverBlock(blockId)` using healthy nodes
    - On success: call `recordReplication(blockId, newNodeId)` and `recordReplicaLoss(blockId, failedNodeId)`
    - On failure (insufficient healthy shards): emit `audit_result` gossip with `reconstructionFailed: true`; log `blockId`, available shard count, and required `k`
    - Complete within 60 seconds of receiving the `triggerReconstruction` signal
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 8.1 Write unit tests for `ParityReconstructionService`
    - Verify `recoverBlock` success path calls `recordReplication` and `recordReplicaLoss` with correct arguments
    - Verify `recoverBlock` failure path emits `audit_result` with `reconstructionFailed: true` and logs blockId, available shards, required k
    - _Requirements: 7.2, 7.4_

- [ ] 9. Implement `AuditService` in `brightchain-api-lib`
  - [ ] 9.1 Create `brightchain-api-lib/src/lib/rbsa/auditService.ts` — Challenger path
    - On each audit slot boundary: call `selectChallenger`; if local node is Challenger, generate 32-byte cryptographically random nonce `S`, construct `AuditChallengeMetadata`, emit `audit_challenge` gossip announcement
    - Record pending challenge locally with timeout of `2 × tierIntervalDays`; on timeout apply failure delta and emit signed `audit_result` with `outcome: 'timeout'`
    - Enforce at most one concurrent `AUDIT_CHALLENGE` per `(proverNodeId, blockId, auditSlot)` triple
    - Route challenge via gossip relay with TTL = `RBSA_CHALLENGE_RELAY_TTL` when Prover is not in `connectedNodeIds`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 9.2 Implement `AuditService` — Prover path
    - Listen for `audit_challenge` gossip announcements addressed to the local node
    - Load shard data from `IBlockStore` by `blockId`; if not found emit `audit_proof` with `shardMissing: true`
    - Compute `Hash(Shard_Data XOR S)` via `@digitaldefiance/node-rs-accelerate`; measure wall-clock duration and estimate µJ cost
    - Emit `audit_proof` gossip announcement with `blockId`, `auditSlot`, `proof`, `proverNodeId`, `computationDurationMs`, `computationMicroJoules`
    - If computation exceeds 30 seconds emit `audit_proof` with `timeout: true`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 9.3 Implement `AuditService` — validation and reputation update path
    - On receiving `audit_proof`: recompute `ExpectedProof = Hash(Shard_Data XOR S)` and compare byte-for-byte
    - On match: call `applyDelta(proverNodeId, RBSA_DEFAULT_SUCCESS_DELTA)`, emit signed `audit_result` with `outcome: 'success'`
    - On mismatch or `shardMissing`: call `applyDelta(proverNodeId, RBSA_DEFAULT_FAILURE_DELTA)`, emit signed `audit_result` with `outcome: 'failure'`
    - Sign `audit_result` using node's existing ECDSA private key (same pattern as `pool_join_approved`)
    - If updated score falls below `RBSA_DEFAULT_REPUTATION_THRESHOLD`, set `triggerReconstruction: true` on the `audit_result`
    - Call `RbsaEnergyLedger.record()` with the completed audit entry
    - Emit `audit_result` with TTL = `RBSA_GOSSIP_TTL`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 2.1, 8.3_

  - [ ] 9.4 Implement `AuditService` — reconstruction dispatch path
    - Listen for `audit_result` announcements with `triggerReconstruction: true`
    - Verify Challenger signature before acting; discard and log warning if invalid or missing
    - Discard `audit_result` with stale BrightDate timestamp (no log)
    - Delegate to `ParityReconstructionService.reconstruct(blockId, failedNodeId)`
    - _Requirements: 2.2, 2.3, 2.4, 7.1_

  - [ ] 9.5 Write unit tests for `AuditService`
    - Verify Challenger path: nonce generation, gossip emission, pending challenge timeout handling
    - Verify Prover path: `shardMissing` response, `timeout` response, successful proof emission
    - Verify validation path: success delta, failure delta, `triggerReconstruction` flag, ECDSA signature
    - Verify stale timestamp and invalid signature discards
    - _Requirements: 4.1–4.5, 5.1–5.5, 6.1–6.6, 2.2–2.4_

- [ ] 10. Checkpoint — Ensure all `brightchain-api-lib` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Extend `ClientAllocationEngine` with reputation-aware node selection
  - Modify `brightchain-api-lib/src/lib/clientAllocationEngine.ts` (or equivalent) to accept `IReputationStore` as a constructor dependency
  - For `performance` and `standard` tier uploads: call `getTopN(k + m)` filtered to `score >= RBSA_DEFAULT_REPUTATION_THRESHOLD`; if fewer than `k + m` nodes meet threshold, log warning and include lower-reputation nodes to meet count
  - For `archive` and `pending-burn` tier uploads: apply relaxed minimum score of `RBSA_ARCHIVE_RELAXED_THRESHOLD`
  - Include selected nodes' `Node_Reputation_Score` values in the upload session response
  - Do not retroactively reassign shards when a node's score drops post-commit
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 11.1 Write unit tests for reputation-aware `ClientAllocationEngine`
    - Verify top-N selection for performance tier with sufficient high-reputation nodes
    - Verify fallback to lower-reputation nodes when fewer than `k + m` meet threshold, with warning logged
    - Verify relaxed threshold applied for archive tier
    - Verify selected scores are included in upload session response
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 12. Define `INodeReliabilityResponse` API response interface in `brightchain-lib`
  - Create `brightchain-lib/src/lib/interfaces/rbsa/nodeReliabilityResponse.ts` with `INodeReliabilityResponse` following the `IBaseData<TData>` generic pattern
  - Interface carries per-shard rows: `proverNodeId` (string), `score` (number), `reputationThreshold` (number), `reconstructionInProgress` (boolean)
  - Export from `brightchain-lib` barrel
  - _Requirements: 11.2_

- [ ] 13. Implement the REST endpoint for node reliability data in `brightchain-api-lib`
  - Add a GET endpoint (e.g., `GET /api/rbsa/reliability/:fileId`) that queries `ReputationStore` for each `proverNodeId` in the file's `IBurnbagStorageContract.providerNodeIds`
  - Return response shaped as `INodeReliabilityResponse`
  - Return appropriate response when no `IBurnbagStorageContract` is associated with the `fileId`
  - _Requirements: 11.2, 11.5_

- [ ] 14. Implement `NodeReliabilityOverlay` React component in `brightchain-react`
  - Create `brightchain-react/src/components/rbsa/NodeReliabilityOverlay.tsx`
  - Props: `fileId: string`, `contractId?: string`
  - Implement 30-second polling hook using `INodeReliabilityResponse` from the REST endpoint
  - Render per-shard rows: `proverNodeId` (first 8 chars), score, color indicator (green `score >= threshold`, amber `score >= threshold * 0.5`, red `score < threshold * 0.5`)
  - Display "Reconstruction in progress" badge when `reconstructionInProgress` is true for a shard row
  - Display "No audit data available" when no `IBurnbagStorageContract` is associated (endpoint returns no data)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 14.1 Write unit tests for `NodeReliabilityOverlay`
    - Verify green/amber/red color thresholds render correctly for representative score values
    - Verify "Reconstruction in progress" badge appears when `reconstructionInProgress: true`
    - Verify "No audit data available" message renders when no contract data is returned
    - Verify polling interval is at most 30 seconds
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

- [ ] 15. Wire up gossip startup bootstrap and reputation state sync
  - On node startup, implement reputation state snapshot request to at least one connected peer (emit a gossip request; peer responds with its current `ReputationStore` snapshot)
  - Integrate `AuditService` startup into the node's existing service initialization sequence
  - Integrate `ReputationStore.initialize()` (index creation) into the node's MongoDB initialization sequence
  - _Requirements: 2.6, 1.2_

- [ ] 16. Final checkpoint — Ensure all tests pass across all packages
  - Run `yarn nx run-many --target=test --projects=brightchain-lib,brightchain-api-lib,brightchain-react`
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at package boundaries
- Property tests (Properties 1–12) validate universal correctness guarantees; unit tests validate specific examples and edge cases
- All property tests use `fast-check` with a minimum of 100 iterations and live in `brightchain-lib` alongside the code they test
- The `IBaseData<TData>` generic pattern applies to `INodeReliabilityResponse` so frontend consumers use string-safe types while the backend uses native types
- `applyDelta` timestamp-ordering ensures gossip-relayed `AUDIT_RESULT` updates are idempotent regardless of delivery order
