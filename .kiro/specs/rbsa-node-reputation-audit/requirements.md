# Requirements Document

## Introduction

Reputation-Backed Spacetime Audit (RBSA) is a decentralized, peer-to-peer verification layer that proves storage nodes are actually holding the data they claim to store. It introduces **node-level reputation** — a "Proof-of-Service" metric that is entirely distinct from the existing `brighthub_hub_reputation` system (which tracks per-user, per-hub social scores). Node reputation is earned through successful cryptographic audit responses and lost through failures or non-responses.

The audit protocol ("Heartbeat") uses a deterministic challenge-response scheme: a Challenger node selects a Prover node on a schedule anchored to the BrightDate J2000.0 epoch, sends a random cryptographic challenge, and the Prover responds with a hash computed over its shard data XOR'd with the challenge. Audit intensity is tiered by the block's Reed-Solomon parameters (e.g., RS(10,6) performance data is audited more frequently than RS(4,1) pending-burn data). Every audit event is logged with its energy cost in micro-Joules (µJ), enabling thermodynamic accounting of the verification layer. When a node's reputation falls below a threshold, parity reconstruction is triggered using the remaining RS shards held by other nodes.

The feature builds on existing infrastructure: `localNodeId` / `connectedNodeIds` / `replicaNodeIds` in the block store, `recordReplication()` / `recordReplicaLoss()` on `IBlockStore`, the gossip layer's `BlockAnnouncement` message bus, `IBurnbagStorageContract.providerNodeIds`, the `@digitaldefiance/node-rs-accelerate` hardware-accelerated hash library, and the Joule micro-unit economy.

---

## Glossary

- **RBSA**: Reputation-Backed Spacetime Audit — the overall feature described in this document.
- **Audit_Scheduler**: The subsystem that computes deterministic audit schedules from BrightDate J2000.0 epoch values and RS parameters.
- **Challenger**: A node that initiates an audit by sending an `AUDIT_CHALLENGE` gossip message to a Prover.
- **Prover**: A node that holds a shard and responds to an `AUDIT_CHALLENGE` with an `AUDIT_PROOF` gossip message.
- **Reputation_Store**: The per-node, locally-persisted and globally-gossiped store of node reputation scores. Distinct from `brighthub_hub_reputation`.
- **Node_Reputation_Score (R)**: A non-negative integer score assigned to a node ID. Increases monotonically on successful audit responses; decreases ("slashed") on failures or non-responses.
- **Reputation_Threshold**: The minimum Node_Reputation_Score below which a node is considered unreliable and parity reconstruction is triggered.
- **Heartbeat_Audit**: A single challenge-response audit cycle between a Challenger and a Prover.
- **Audit_Tier**: The audit frequency class derived from a block's RS parameters and `BurnbagStorageTier`. Performance-tier blocks are audited at high frequency; archive and pending-burn blocks at lower frequency.
- **AUDIT_CHALLENGE**: A gossip `BlockAnnouncement` message type carrying a cryptographic challenge nonce `S` from a Challenger to a Prover.
- **AUDIT_PROOF**: A gossip `BlockAnnouncement` message type carrying the Prover's computed proof `Hash(Shard_Data XOR S)`.
- **AUDIT_RESULT**: A gossip `BlockAnnouncement` message type carrying the Challenger's signed validation outcome (success or failure) for network-wide propagation.
- **Shard**: A single RS data or parity block held by a Prover node, identified by its `BlockId`.
- **RS(k, m)**: Reed-Solomon erasure coding with `k` data shards and `m` parity shards. Existing tiers: RS(10,6) performance, RS(8,4) standard, RS(6,2) archive, RS(4,1) pending-burn, RS(1,0) none.
- **Parity_Reconstruction**: The process of recovering a lost or corrupted shard from the remaining RS shards held by other nodes, using `IBlockStore.recoverBlock()`.
- **Energy_Ledger**: The per-audit-event log of energy cost in micro-Joules (µJ), integrated with the existing Joule micro-unit economy.
- **Client_Allocation_Engine**: The subsystem that selects provider nodes for new uploads, using Node_Reputation_Score to prefer high-reputation nodes for performance-tier data.
- **Node_Reliability_Overlay**: The UI component that displays the Node_Reputation_Score of each provider node holding a user's shards.
- **BrightDate**: The system-wide decimal timestamp anchored to the J2000.0 epoch (2000-01-01 12:00:00 UTC), used for deterministic scheduling.
- **µJ**: Micro-Joule — the energy unit used throughout the Joule economy (1 Joule = 1,000,000 µJ).

---

## Requirements

### Requirement 1: Node Reputation Store

**User Story:** As a network participant, I want each node to maintain a reputation score that reflects its storage reliability, so that the network can distinguish trustworthy nodes from unreliable ones.

#### Acceptance Criteria

1. THE Reputation_Store SHALL maintain one Node_Reputation_Score per unique node ID, keyed by the node's string identifier.
2. THE Reputation_Store SHALL persist Node_Reputation_Scores locally across process restarts.
3. WHEN a node ID is encountered for the first time, THE Reputation_Store SHALL initialize its Node_Reputation_Score to a configurable baseline value (default: 100).
4. THE Reputation_Store SHALL be entirely separate from the `brighthub_hub_reputation` collection and SHALL NOT share schema, indexes, or collection names with it.
5. WHEN a Node_Reputation_Score is read or written, THE Reputation_Store SHALL complete the operation within 10 milliseconds for in-memory access.
6. THE Reputation_Store SHALL expose a typed interface in `brightchain-lib` so that both `brightchain-api-lib` and frontend consumers can reference the score shape without importing Node.js-specific dependencies.

---

### Requirement 2: Reputation Gossip Propagation

**User Story:** As a node operator, I want my node's reputation score to be visible to all peers, so that the network can make informed allocation decisions without a central authority.

#### Acceptance Criteria

1. WHEN a Node_Reputation_Score changes, THE Reputation_Store SHALL emit an `AUDIT_RESULT` gossip announcement carrying the updated score, the node ID, and the Challenger's cryptographic signature within 500 milliseconds of the change.
2. WHEN a node receives an `AUDIT_RESULT` announcement, THE Reputation_Store SHALL verify the Challenger's signature before applying the score update.
3. IF an `AUDIT_RESULT` announcement carries an invalid or missing signature, THEN THE Reputation_Store SHALL discard the announcement and log a warning.
4. WHEN a node receives a valid `AUDIT_RESULT` announcement for a node ID it already tracks, THE Reputation_Store SHALL apply the update only if the announcement's BrightDate timestamp is strictly greater than the timestamp of the last applied update for that node ID.
5. THE Reputation_Store SHALL propagate `AUDIT_RESULT` announcements with a TTL of 7 hops, consistent with the existing pool join announcement TTL convention.
6. WHEN a node starts up, THE Reputation_Store SHALL request a reputation state snapshot from at least one connected peer to bootstrap its local view.

---

### Requirement 3: Deterministic Audit Scheduling

**User Story:** As a network designer, I want audit assignments to be computed deterministically from public inputs, so that any node can independently verify which node should be challenging which prover at any given time without coordination overhead.

#### Acceptance Criteria

1. THE Audit_Scheduler SHALL compute the Challenger node ID for a given (blockId, auditSlot) pair using a deterministic function of the form `Challenger = select(sortedNodeIds, Hash(blockId || auditSlot))`, where `auditSlot` is derived from the current BrightDate J2000.0 decimal day value divided by the Audit_Tier interval.
2. THE Audit_Scheduler SHALL derive the `auditSlot` integer by computing `floor(brightDateDecimalDays / tierIntervalDays)`, where `tierIntervalDays` is a per-Audit_Tier constant defined in the system configuration.
3. THE Audit_Scheduler SHALL assign Audit_Tier intervals as follows: performance tier — 0.25 decimal days (~6 hours); standard tier — 1.0 decimal day (~24 hours); archive tier — 7.0 decimal days (~1 week); pending-burn tier — 30.0 decimal days (~1 month); none tier — no audits scheduled.
4. WHEN two nodes independently compute the Challenger for the same (blockId, auditSlot) pair using the same sorted node list, THE Audit_Scheduler SHALL produce identical results on both nodes.
5. THE Audit_Scheduler SHALL use the `replicaNodeIds` array from `IBlockMetadata` as the candidate node list, sorted lexicographically by node ID string, to ensure consistent ordering across nodes.
6. IF the `replicaNodeIds` array for a block contains fewer than 2 entries, THEN THE Audit_Scheduler SHALL skip scheduling an audit for that block and log a diagnostic entry.

---

### Requirement 4: Audit Challenge Message (AUDIT_CHALLENGE)

**User Story:** As a Challenger node, I want to send a cryptographically sound challenge to a Prover, so that the Prover must demonstrate live possession of the shard data to respond correctly.

#### Acceptance Criteria

1. WHEN the Audit_Scheduler determines that the local node is the Challenger for a (blockId, auditSlot) pair, THE Challenger SHALL construct an `AUDIT_CHALLENGE` gossip announcement containing: the target `blockId`, the Prover's `nodeId`, a 32-byte cryptographically random nonce `S`, the `auditSlot` integer, and the Challenger's `nodeId`.
2. THE Challenger SHALL transmit the `AUDIT_CHALLENGE` announcement via the existing gossip layer using the `BlockAnnouncement` message bus, addressed to the Prover's node ID.
3. THE Challenger SHALL record the pending challenge locally with a timeout of 2 × the Audit_Tier interval, after which a non-response is treated as a failure.
4. THE Challenger SHALL NOT issue more than one concurrent `AUDIT_CHALLENGE` to the same Prover for the same `blockId` within a single `auditSlot`.
5. IF the Prover's node ID is not in `connectedNodeIds` at challenge time, THEN THE Challenger SHALL route the `AUDIT_CHALLENGE` through the gossip relay with TTL = 5.

---

### Requirement 5: Audit Proof Computation and Response (AUDIT_PROOF)

**User Story:** As a Prover node, I want to compute and return a proof of shard possession efficiently, so that I can respond to challenges quickly without excessive energy consumption.

#### Acceptance Criteria

1. WHEN a Prover receives an `AUDIT_CHALLENGE` for a `blockId` it holds, THE Prover SHALL compute `Proof = Hash(Shard_Data XOR S)` where `Shard_Data` is the raw bytes of the shard identified by `blockId` and `S` is the 32-byte nonce from the challenge, using the `@digitaldefiance/node-rs-accelerate` hardware-accelerated hash implementation.
2. THE Prover SHALL transmit an `AUDIT_PROOF` gossip announcement containing: the `blockId`, the `auditSlot`, the computed `Proof` bytes, and the Prover's `nodeId`, within 30 seconds of receiving the `AUDIT_CHALLENGE`.
3. THE Prover SHALL measure the wall-clock duration and estimated energy cost of the hash computation in µJ and include both values in the `AUDIT_PROOF` announcement payload.
4. IF the Prover does not hold the shard identified by `blockId`, THEN THE Prover SHALL respond with an `AUDIT_PROOF` announcement whose `Proof` field is absent and whose payload includes a `shardMissing: true` flag.
5. IF the Prover cannot complete the hash computation within 30 seconds, THEN THE Prover SHALL transmit an `AUDIT_PROOF` announcement with a `timeout: true` flag instead of a `Proof` value.

---

### Requirement 6: Audit Validation and Reputation Update

**User Story:** As a Challenger node, I want to validate the Prover's response and update the network's view of that node's reputation, so that the reputation score accurately reflects observed storage behavior.

#### Acceptance Criteria

1. WHEN the Challenger receives an `AUDIT_PROOF` for a pending challenge, THE Challenger SHALL independently recompute `ExpectedProof = Hash(Shard_Data XOR S)` using the same hardware-accelerated hash function and compare it byte-for-byte with the received `Proof`.
2. WHEN `Proof` equals `ExpectedProof`, THE Challenger SHALL increment the Prover's Node_Reputation_Score by a configurable success delta (default: +1) and emit a signed `AUDIT_RESULT` announcement with `outcome: 'success'`.
3. WHEN `Proof` does not equal `ExpectedProof`, or when the `shardMissing` flag is set, THE Challenger SHALL decrement the Prover's Node_Reputation_Score by a configurable failure delta (default: -10) and emit a signed `AUDIT_RESULT` announcement with `outcome: 'failure'`.
4. WHEN the Challenger's pending challenge timeout expires without receiving an `AUDIT_PROOF`, THE Challenger SHALL apply the same failure delta as a non-response penalty and emit a signed `AUDIT_RESULT` announcement with `outcome: 'timeout'`.
5. WHEN the Prover's Node_Reputation_Score after a failure or timeout update falls below the configured Reputation_Threshold (default: 20), THE Challenger SHALL emit a `AUDIT_RESULT` announcement with `triggerReconstruction: true` to signal that parity reconstruction is needed.
6. THE Challenger SHALL sign all `AUDIT_RESULT` announcements using the node's existing ECDSA private key, consistent with the signing scheme used for `pool_join_approved` announcements.

---

### Requirement 7: Parity Reconstruction on Reputation Failure

**User Story:** As a data owner, I want the network to automatically recover my shards when a node holding them becomes unreliable, so that my data remains intact even when individual nodes fail.

#### Acceptance Criteria

1. WHEN a node receives an `AUDIT_RESULT` announcement with `triggerReconstruction: true` for a `blockId`, THE Parity_Reconstruction subsystem SHALL invoke `IBlockStore.recoverBlock(blockId)` using the remaining RS shards held by nodes whose Node_Reputation_Score is at or above the Reputation_Threshold.
2. WHEN `recoverBlock()` succeeds, THE Parity_Reconstruction subsystem SHALL invoke `IBlockStore.recordReplication(blockId, newNodeId)` to register the replacement node and SHALL invoke `IBlockStore.recordReplicaLoss(blockId, failedNodeId)` to deregister the failed node.
3. WHEN `recoverBlock()` succeeds, THE Parity_Reconstruction subsystem SHALL update `IBurnbagStorageContract.providerNodeIds` to replace the failed node ID with the new node ID.
4. IF `recoverBlock()` fails because fewer than `k` healthy shards are available, THEN THE Parity_Reconstruction subsystem SHALL emit a `AUDIT_RESULT` announcement with `reconstructionFailed: true` and SHALL log the block ID, the number of available healthy shards, and the required `k` value.
5. THE Parity_Reconstruction subsystem SHALL complete the reconstruction attempt within 60 seconds of receiving the `triggerReconstruction` signal.

---

### Requirement 8: Energy Ledger for Audit Events

**User Story:** As a node operator, I want every audit event to be logged with its energy cost, so that I can track the thermodynamic overhead of the verification layer and optimize RS configurations.

#### Acceptance Criteria

1. THE Energy_Ledger SHALL record one entry per completed Heartbeat_Audit cycle containing: `blockId`, `auditSlot`, `challengerNodeId`, `proverNodeId`, `outcome` ('success' | 'failure' | 'timeout'), `proofComputationMicroJoules` (bigint), `validationMicroJoules` (bigint), `totalAuditMicroJoules` (bigint), `rsK` (number), `rsM` (number), and a BrightDate timestamp.
2. THE Energy_Ledger SHALL store `proofComputationMicroJoules`, `validationMicroJoules`, and `totalAuditMicroJoules` as `bigint` values serialized as decimal strings, consistent with the existing Joule micro-unit serialization convention.
3. WHEN an audit cycle completes, THE Energy_Ledger SHALL persist the entry within 100 milliseconds.
4. THE Energy_Ledger SHALL expose a query interface that returns the aggregate `totalAuditMicroJoules` grouped by `(rsK, rsM)` pair, enabling "Energy Cost of Verification per RS configuration" reporting.
5. THE Energy_Ledger SHALL expose a query interface that returns the aggregate `totalAuditMicroJoules` grouped by `proverNodeId` over a configurable time window expressed in BrightDate decimal days.
6. WHERE the Joule asset account system is available, THE Energy_Ledger SHALL debit the `totalAuditMicroJoules` from the Challenger node's Joule asset account using the existing `AssetAccountStore` debit path.

---

### Requirement 9: Tiered Audit Intensity

**User Story:** As a system designer, I want audit frequency to be proportional to the durability tier of the data, so that high-value performance-tier data is verified more often than low-priority archive data without wasting energy.

#### Acceptance Criteria

1. THE Audit_Scheduler SHALL derive the Audit_Tier for a block from the block's `rsK` and `rsM` values stored in `IBurnbagStorageContract`, mapping them to the `BurnbagStorageTier` constants: RS(10,6) → performance, RS(8,4) → standard, RS(6,2) → archive, RS(4,1) → pending-burn, RS(1,0) → none.
2. WHEN a block's RS parameters do not match any canonical `BurnbagStorageTier` mapping, THE Audit_Scheduler SHALL assign the block to the `standard` Audit_Tier and log a diagnostic entry.
3. THE Audit_Scheduler SHALL apply the tier interval constants defined in Requirement 3.3 to determine the `auditSlot` for each block.
4. WHEN a block's `BurnbagStorageTier` is upgraded (e.g., from `archive` to `performance` via `AUTO_RS_UPGRADE`), THE Audit_Scheduler SHALL recalculate the block's Audit_Tier and apply the new interval at the next `auditSlot` boundary.
5. WHEN a block's `BurnbagStorageTier` is `none`, THE Audit_Scheduler SHALL not schedule any audits for that block.

---

### Requirement 10: Client Allocation Engine Integration

**User Story:** As a data uploader, I want the system to prefer high-reputation nodes when selecting providers for my performance-tier uploads, so that my data is placed on nodes with a proven track record of reliability.

#### Acceptance Criteria

1. WHEN the Client_Allocation_Engine selects provider nodes for a new upload with `BurnbagStorageTier` of `performance` or `standard`, THE Client_Allocation_Engine SHALL rank candidate nodes by Node_Reputation_Score in descending order and select the top `k + m` nodes.
2. WHEN fewer than `k + m` candidate nodes have a Node_Reputation_Score at or above the Reputation_Threshold, THE Client_Allocation_Engine SHALL log a warning and include lower-reputation nodes to meet the required count, prioritizing the highest available scores.
3. WHEN the Client_Allocation_Engine selects provider nodes for `archive` or `pending-burn` tier uploads, THE Client_Allocation_Engine SHALL apply a relaxed minimum Node_Reputation_Score of 10 (configurable) rather than the standard Reputation_Threshold.
4. THE Client_Allocation_Engine SHALL expose the selected nodes' Node_Reputation_Scores in the upload session response so that the client UI can display them.
5. WHEN a node's Node_Reputation_Score drops below the Reputation_Threshold after an upload has been committed, THE Client_Allocation_Engine SHALL not retroactively reassign existing shards; reassignment is handled exclusively by the Parity_Reconstruction subsystem (Requirement 7).

---

### Requirement 11: Node Reliability UI Overlay

**User Story:** As a data owner, I want to see the reputation score of each node holding my shards, so that I can understand the reliability of my stored data at a glance.

#### Acceptance Criteria

1. THE Node_Reliability_Overlay SHALL display, for each shard of a user's file, the `proverNodeId` (truncated to 8 characters), the current Node_Reputation_Score, and a visual reliability indicator (green ≥ Reputation_Threshold, amber ≥ 50% of threshold, red < 50% of threshold).
2. WHEN the Node_Reliability_Overlay is rendered, THE Node_Reliability_Overlay SHALL source node reputation data from the Reputation_Store via a typed API response interface defined in `brightchain-lib`, not from a direct database query in the frontend.
3. THE Node_Reliability_Overlay SHALL refresh its displayed scores at most once every 30 seconds to avoid excessive polling.
4. WHEN a node's Node_Reputation_Score transitions from above to below the Reputation_Threshold, THE Node_Reliability_Overlay SHALL display a "Reconstruction in progress" badge for the affected shard row within one refresh cycle.
5. WHERE the user's file has no associated `IBurnbagStorageContract`, THE Node_Reliability_Overlay SHALL display a "No audit data available" message rather than an empty table.

---

### Requirement 12: Gossip Message Schema Extension

**User Story:** As a protocol implementer, I want the three new RBSA message types to be formally defined in the existing gossip interface, so that all nodes can parse and route them correctly.

#### Acceptance Criteria

1. THE gossip layer SHALL add `'audit_challenge'`, `'audit_proof'`, and `'audit_result'` to the `BlockAnnouncement.type` union in `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`.
2. THE gossip layer SHALL define typed metadata interfaces `AuditChallengeMetadata`, `AuditProofMetadata`, and `AuditResultMetadata` in `brightchain-lib`, each carrying the fields specified in Requirements 4.1, 5.2–5.5, and 6.2–6.5 respectively.
3. THE gossip layer SHALL add optional fields `auditChallenge?: AuditChallengeMetadata`, `auditProof?: AuditProofMetadata`, and `auditResult?: AuditResultMetadata` to the `BlockAnnouncement` interface, following the same optional-field pattern used for `poolJoinRequest`, `poolJoinApproval`, and `brightTrustProposal`.
4. WHEN a node receives a `BlockAnnouncement` of type `'audit_challenge'`, `'audit_proof'`, or `'audit_result'` without the corresponding required metadata field, THE gossip layer SHALL discard the announcement and log a parse error.
5. THE gossip layer SHALL add the three new type literals to the `ANNOUNCEMENT_TYPES` constant array so that existing type-guard and routing logic covers them without modification.

---

### Requirement 13: ReputationStore Decoupling

**User Story:** As a platform engineer, I want the Reputation_Store to be decoupled from any organizational or social logic, so that node reputation can be used independently of hub membership or user identity.

#### Acceptance Criteria

1. THE Reputation_Store SHALL be implemented as a standalone service in `brightchain-api-lib` with no import dependencies on `brighthub_hub_reputation`, `HUB_REPUTATION_SCHEMA`, or any BrightHub social schema.
2. THE Reputation_Store SHALL accept a node ID string as its sole identity key and SHALL NOT require a `userId`, `hubId`, or `memberId` to read or write a Node_Reputation_Score.
3. THE Reputation_Store interface (`IReputationStore`) SHALL be defined in `brightchain-lib` so that it is accessible to both server-side and client-side consumers without Node.js-specific dependencies.
4. WHEN the Reputation_Store is initialized, THE Reputation_Store SHALL use a dedicated MongoDB collection named `rbsa_node_reputation` with indexes on `nodeId` (unique) and `score` (descending).
5. THE Reputation_Store SHALL expose a `getTopN(n: number): Promise<INodeReputationRecord[]>` method returning the `n` nodes with the highest Node_Reputation_Scores, for use by the Client_Allocation_Engine and the Node_Reliability_Overlay.

---

### Requirement 14: Audit Event Round-Trip Integrity

**User Story:** As a protocol implementer, I want audit messages to be serializable and deserializable without data loss, so that gossip relay nodes can forward them faithfully across the network.

#### Acceptance Criteria

1. THE AuditChallengeMetadata, AuditProofMetadata, and AuditResultMetadata interfaces SHALL each have a corresponding DTO type with all `bigint` fields serialized as decimal strings and all `Uint8Array` fields serialized as hex strings.
2. FOR ALL valid `AuditChallengeMetadata` objects, serializing to DTO and deserializing back SHALL produce an object that is deep-equal to the original (round-trip property).
3. FOR ALL valid `AuditProofMetadata` objects, serializing to DTO and deserializing back SHALL produce an object that is deep-equal to the original (round-trip property).
4. FOR ALL valid `AuditResultMetadata` objects, serializing to DTO and deserializing back SHALL produce an object that is deep-equal to the original (round-trip property).
5. WHEN a DTO field that is expected to be a decimal-string bigint contains a non-numeric value, THE deserializer SHALL throw a descriptive `ValidationError` identifying the field name and the received value.
