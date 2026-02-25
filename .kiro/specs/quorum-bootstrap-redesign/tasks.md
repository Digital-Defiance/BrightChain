# Tasks: Quorum Bootstrap Redesign

## Task 1: Core Enumerations and Data Model Interfaces (brightchain-lib)

- [x] 1. Create core enumerations and data model interfaces
  - [x] 1.1 Create `QuorumOperationalMode`, `ProposalStatus`, `ProposalActionType` enums in `brightchain-lib/src/lib/enumerations/` — include `CHANGE_INNER_QUORUM` in `ProposalActionType` for hierarchical quorum support (Req 12)
  - [x] 1.2 Create `QuorumEpoch<TID>` interface in `brightchain-lib/src/lib/interfaces/quorumEpoch.ts` — include optional `innerQuorumMemberIds` field for hierarchical quorum (Req 12.2)
  - [x] 1.3 Create `Proposal<TID>`, `ProposalInput<TID>` interfaces in `brightchain-lib/src/lib/interfaces/proposal.ts`
  - [x] 1.4 Create `Vote<TID>`, `VoteInput<TID>` interfaces in `brightchain-lib/src/lib/interfaces/vote.ts`
  - [x] 1.5 Create `IdentityRecoveryRecord<TID>` interface in `brightchain-lib/src/lib/interfaces/identityRecoveryRecord.ts`
  - [x] 1.6 Create `AliasRecord<TID>` interface in `brightchain-lib/src/lib/interfaces/aliasRecord.ts`
  - [x] 1.7 Create `OperationalState` interface in `brightchain-lib/src/lib/interfaces/operationalState.ts`
  - [x] 1.8 Create `QuorumDocumentMetadata` interface in `brightchain-lib/src/lib/interfaces/quorumDocumentMetadata.ts`
  - [x] 1.9 Create `AuditLogEntry` interface in `brightchain-lib/src/lib/interfaces/auditLogEntry.ts` — include the full event type union: `identity_disclosure_proposed`, `identity_disclosure_approved`, `identity_disclosure_rejected`, `identity_disclosure_expired`, `identity_shards_expired`, `alias_registered`, `alias_deregistered`, `epoch_created`, `member_added`, `member_removed`, `transition_ceremony_started`, `transition_ceremony_completed`, `transition_ceremony_failed`, `proposal_created`, `proposal_approved`, `proposal_rejected`, `proposal_expired`, `vote_cast`, `share_redistribution_started`, `share_redistribution_completed`, `share_redistribution_failed`
  - [x] 1.10 Create `ChainedAuditLogEntry` interface extending `AuditLogEntry` in `brightchain-lib/src/lib/interfaces/chainedAuditLogEntry.ts` — include `previousEntryHash`, `contentHash`, `signature`, `blockId1`, `blockId2`
  - [x] 1.11 Create `ContentWithIdentity<TID>` and `IdentityMode` enum in `brightchain-lib/src/lib/interfaces/contentWithIdentity.ts`
  - [x] 1.12 Create `RedistributionConfig` interface in `brightchain-lib/src/lib/interfaces/services/redistributionConfig.ts`
  - [x] 1.13 Create `StatuteOfLimitationsConfig` interface in `brightchain-lib/src/lib/interfaces/statuteConfig.ts` — include `defaultDurations` map (content type → ms), `fallbackDurationMs` (default 7 years)
  - [x] 1.14 Create `RedistributionJournalEntry` interface in `brightchain-lib/src/lib/interfaces/redistributionJournalEntry.ts` — `{ documentId, oldShares, oldMemberIds, oldThreshold, oldEpoch }`
  - [x] 1.15 Create `QuorumMetrics` interface in `brightchain-lib/src/lib/interfaces/quorumMetrics.ts` — all metrics from design (proposals.total, proposals.pending, votes.latency_ms, redistribution.progress, redistribution.failures, members.active, epoch.current, expiration.last_run, expiration.deleted_total)

## Task 2: Error Types (brightchain-lib)

- [x] 2. Create QuorumError class and QuorumErrorType enum
  - [x] 2.1 Create `QuorumErrorType` enum with all error types (mode, member, proposal, redistribution, identity, database, audit errors)
  - [x] 2.2 Create `QuorumError` class extending `Error` in `brightchain-lib/src/lib/errors/quorumError.ts`
  - [x] 2.3 Create `IdentityValidationErrorType` enum and `IdentityValidationError` class

## Task 3: Service Interfaces (brightchain-lib)

- [x] 3. Create service interfaces
  - [x] 3.1 Create `IQuorumStateMachine<TID>` interface in `brightchain-lib/src/lib/interfaces/services/quorumStateMachine.ts`
  - [x] 3.2 Create `IOperatorPrompt` interface with `ProposalDisplay` and `OperatorVoteResult` in `brightchain-lib/src/lib/interfaces/services/operatorPrompt.ts`
  - [x] 3.3 Create `IQuorumDatabase<TID>` interface in `brightchain-lib/src/lib/interfaces/services/quorumDatabase.ts`
  - [x] 3.4 Create `IIdentitySealingPipeline<TID>` interface in `brightchain-lib/src/lib/interfaces/services/identitySealingPipeline.ts`
  - [x] 3.5 Create `IMembershipProofService<TID>` interface in `brightchain-lib/src/lib/interfaces/services/membershipProof.ts`
  - [x] 3.6 Create `IIdentityValidator<TID>` interface with `IdentityValidationResult` in `brightchain-lib/src/lib/interfaces/services/identityValidator.ts`
  - [x] 3.7 Create `IExpirationScheduler` interface with `ExpirationSchedulerConfig` and `ExpirationResult` in `brightchain-lib/src/lib/interfaces/services/expirationScheduler.ts`

## Task 4: Gossip Service Extensions (brightchain-lib)

- [x] 4. Extend gossip service for quorum proposals and votes
  - [x] 4.1 Create `QuorumProposalMetadata` and `QuorumVoteMetadata` interfaces in `brightchain-lib/src/lib/interfaces/availability/`
  - [x] 4.2 Add `'quorum_proposal'` and `'quorum_vote'` to `BlockAnnouncement.type` union
  - [x] 4.3 Add `quorumProposal?` and `quorumVote?` optional fields to `BlockAnnouncement`
  - [x] 4.4 Add `announceQuorumProposal`, `announceQuorumVote`, and corresponding on/off handler methods to `IGossipService`

## Checkpoint A: Interfaces & Types Build Verification

- [x] A. Verify all new interfaces, enums, and error types compile and lint cleanly
  - [x] A.1 Update barrel exports for all new types created in Tasks 1-4 (enumerations index, interfaces index, services index, availability index, errors index)
  - [x] A.2 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] A.3 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] A.4 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify existing tests still pass (no regressions from interface changes to BlockAnnouncement, IGossipService, etc.)

## Task 5: SealingService Bootstrap and Redistribution Extensions (brightchain-lib)

- [x] 5. Extend SealingService with bootstrap mode and share redistribution
  - [x] 5.1 Add `quorumSealBootstrap<T>()` method that accepts threshold=1 and shareCount=1, bypassing `SEALING.MIN_SHARES`
  - [x] 5.2 Add `redistributeShares()` method that reconstructs the symmetric key from existing shares and re-splits under new membership
  - [x] 5.3 Add memory wiping for reconstructed keys and plaintext shares after redistribution
  - [x] 5.4 Write property test for P2: Seal/Unseal Round-Trip (seal data, unseal with threshold members succeeds, unseal with fewer fails)
  - [x] 5.5 Write property test for P3: Share Redistribution Preserves Data (encrypted data unchanged after redistribution, unseal with new members works)
  - [x] 5.6 Write property test for P13: Fresh Key Per Seal (two seals of identical data produce different encrypted outputs)

## Task 6: QuorumDataRecord Metadata Extension (brightchain-lib)

- [x] 6. Extend QuorumDataRecord with epoch and bootstrap metadata
  - [x] 6.1 Add `epochNumber`, `sealedUnderBootstrap`, and optional `identityRecoveryRecordId` fields to `QuorumDataRecord` (or create a wrapper/metadata object)
  - [x] 6.2 Update `QuorumDataRecord` constructor to accept and validate the new metadata fields
  - [x] 6.3 Relax the `memberIDs.length < 2` and `sharesRequired < 2` constraints when a `bootstrapMode` flag is passed

## Checkpoint B: SealingService & QuorumDataRecord Verification

- [x] B. Verify SealingService extensions and QuorumDataRecord changes compile, lint, and pass tests
  - [x] B.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] B.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] B.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify existing tests pass AND new property tests P2, P3, P13 pass

## Task 7: QuorumStateMachine Core Implementation (brightchain-lib)

- [x] 7. Implement QuorumStateMachine
  - [x] 7.1 Implement `initialize()` — detect bootstrap vs quorum mode based on member count vs threshold, persist operational state; detect `TransitionInProgress` on startup and trigger rollback recovery (design: crash recovery)
  - [x] 7.2 Implement `getMode()` and operational state restoration on startup
  - [x] 7.3 Implement `sealDocument()` — delegate to SealingService with bootstrap or quorum parameters, tag document with epoch and `sealedUnderBootstrap` flag via `QuorumDocumentMetadata`
  - [x] 7.4 Implement `unsealDocument()` — verify checksum (SHA-3) and creator signature using constant-time comparison before delegating to SealingService; return generic error on failure without revealing which check failed (Req 8.4-8.6)
  - [x] 7.5 Implement `getCurrentEpoch()` and `getEpoch()` query methods
  - [x] 7.6 Implement `getMetrics()` — collect and return `QuorumMetrics` (proposals.total, proposals.pending, votes.latency_ms, redistribution.progress, members.active, epoch.current, expiration stats)
  - [x] 7.7 Write property test for P1: Bootstrap Mode Threshold Invariant (member count < threshold → bootstrap mode, effective threshold = member count)

## Task 8: Epoch Management (brightchain-lib)

- [x] 8. Implement epoch lifecycle management in QuorumStateMachine
  - [x] 8.1 Implement epoch creation on initialization (epoch 1)
  - [x] 8.2 Implement epoch increment on member addition
  - [x] 8.3 Implement epoch increment on member removal
  - [x] 8.4 Implement epoch increment on transition ceremony completion
  - [x] 8.5 Write property test for P5: Epoch Monotonicity (sequence of operations produces strictly increasing epoch numbers)

## Task 9: Member Management with Share Redistribution (brightchain-lib)

- [x] 9. Implement member add/remove with share redistribution
  - [x] 9.1 Implement `addMember()` — add member, increment epoch, trigger batched share redistribution for all documents, emit audit entries `member_added` + `share_redistribution_started`/`completed`/`failed`
  - [x] 9.2 Implement `removeMember()` — validate remaining count >= threshold, remove member, increment epoch, trigger redistribution with fresh polynomial coefficients, emit audit entries `member_removed` + `share_redistribution_*`
  - [x] 9.3 Implement batched redistribution using `RedistributionConfig` (page-based document processing, progress callback, continue-on-failure)
  - [x] 9.4 Write property test for P4: Removed Member Share Invalidation (old share + new shares cannot reconstruct key)
  - [x] 9.5 Write property test for P18: Member Removal Below Threshold Rejected

## Task 10: Transition Ceremony (brightchain-lib)

- [x] 10. Implement transition ceremony from bootstrap to quorum mode
  - [x] 10.1 Implement `initiateTransition()` — verify member count >= threshold, set mode to TransitionInProgress, block operations, emit audit entry `transition_ceremony_started`
  - [x] 10.2 Implement batched re-split of all bootstrap-sealed documents using redistributeShares, emit `share_redistribution_started`/`share_redistribution_completed`/`share_redistribution_failed` per batch
  - [x] 10.3 Implement redistribution journal writes — before modifying each document, store `{ documentId, oldShares, oldMemberIds, oldThreshold, oldEpoch }` in the `redistribution_journal` collection via `db.saveJournalEntry()`
  - [x] 10.4 Implement rollback on failure — restore old shares from redistribution journal entries, reset to Bootstrap mode, delete journal entries, emit audit entry `transition_ceremony_failed`
  - [x] 10.5 Implement crash recovery in `initialize()` — detect `TransitionInProgress` on startup, query documents with new vs old epoch numbers, roll back already-re-split documents from journal, restore `OperationalState` to Bootstrap
  - [x] 10.6 Implement success path — on all documents re-split, save new QuorumEpoch, update OperationalState to Quorum, delete journal entries, emit audit entry `transition_ceremony_completed`, unblock operations
  - [x] 10.7 Write property test for P14: Transition Ceremony Atomicity (all docs re-split on success, all docs unchanged on failure)
  - [x] 10.8 Write property test for P16: Operations Blocked During Transition

## Task 11: Proposal and Voting System (brightchain-lib)

- [x] 11. Implement proposal submission and vote tallying
  - [x] 11.1 Implement `submitProposal()` — validate proposer, assign ID, validate attachment CBL if present, store as pending, announce via gossip, emit audit entry `proposal_created`
  - [x] 11.2 Implement proposal validation rules (IDENTITY_DISCLOSURE requires attachment, description max 4096 chars, etc.)
  - [x] 11.3 Implement `submitVote()` — validate voter is active member on proposal, check for duplicates, store vote, announce via gossip, emit audit entry `vote_cast`
  - [x] 11.4 Implement vote tallying — when approve count >= threshold, mark approved and execute action, emit audit entry `proposal_approved`
  - [x] 11.5 Implement proposal expiration check — mark expired when current time > expiresAt, emit audit entry `proposal_expired`
  - [x] 11.6 Implement proposal rejection — when reject count makes approval impossible, mark rejected, emit audit entry `proposal_rejected`
  - [x] 11.7 Implement proposal status change event emission
  - [x] 11.8 Implement action execution dispatch for each ProposalActionType:
    - [x] 11.8.1 `ADD_MEMBER` — call `addMember()`, trigger share redistribution
    - [x] 11.8.2 `REMOVE_MEMBER` — call `removeMember()`, trigger share redistribution
    - [x] 11.8.3 `CHANGE_THRESHOLD` — update threshold, trigger share redistribution for all active documents
    - [x] 11.8.4 `TRANSITION_TO_QUORUM_MODE` — call `initiateTransition()`
    - [x] 11.8.5 `UNSEAL_DOCUMENT` — collect encrypted shares from approve votes, decrypt, unseal document
    - [x] 11.8.6 `IDENTITY_DISCLOSURE` — collect shares, reconstruct identity from IdentityRecoveryRecord, make available exclusively to proposer; check for expired statute first (Req 17.6)
    - [x] 11.8.7 `REGISTER_ALIAS` — delegate to AliasRegistry.registerAlias()
    - [x] 11.8.8 `DEREGISTER_ALIAS` — delegate to AliasRegistry.deregisterAlias()
    - [x] 11.8.9 `EXTEND_STATUTE` — update `expiresAt` on the target IdentityRecoveryRecord to the new value (Req 17.7-17.8)
    - [x] 11.8.10 `CHANGE_INNER_QUORUM` — update `innerQuorumMemberIds` on the current epoch, create new epoch (Req 12.2)
    - [x] 11.8.11 `CUSTOM` — execute registered callback handler if one exists, or log approval without automated execution
  - [x] 11.9 Implement inner quorum routing — when member count > 20, route routine operations to inner quorum, critical operations to full membership (Req 12.2)
  - [x] 11.10 Write property test for P6: Vote Threshold Counting (threshold approve votes → approved, duplicates discarded)
  - [x] 11.11 Write property test for P17: IDENTITY_DISCLOSURE Requires Attachment

## Checkpoint C: Core State Machine Build & Test Verification

- [x] C. Verify QuorumStateMachine, epoch, member management, transition ceremony, and proposal/voting compile, lint, and pass all tests
  - [x] C.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] C.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] C.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify ALL property tests pass: P1 (bootstrap threshold), P4 (removed member invalidation), P5 (epoch monotonicity), P6 (vote threshold), P14 (transition atomicity), P16 (ops blocked during transition), P17 (disclosure requires attachment), P18 (removal below threshold)
  - [x] C.4 Review test coverage for QuorumStateMachine — ensure all public methods have at least one unit test beyond the property tests

## Task 12: Operator Prompt Implementation (brightchain-api-lib)

- [x] 12. Implement CLI operator prompt
  - [x] 12.1 Implement `CLIOperatorPrompt` class implementing `IOperatorPrompt` in `brightchain-api-lib`
  - [x] 12.2 Implement `promptForVote()` — display proposal description, action details, and attachment info; collect vote decision and password
  - [x] 12.3 Implement authentication lockout — track failed attempts per proposal, lock for configurable cooldown (default 300s) after 3 failures
  - [x] 12.4 Implement `isLocked()` check
  - [x] 12.5 Write unit tests for CLIOperatorPrompt — test lockout after 3 failures, cooldown expiry, isLocked state transitions

## Task 13: Quorum Database Adapter (brightchain-api-lib)

- [x] 13. Implement QuorumDatabaseAdapter using BrightChainDb
  - [x] 13.1 Implement `QuorumDatabaseAdapter` class implementing `IQuorumDatabase` with pool ID `"quorum-system"`
  - [x] 13.2 Implement epoch CRUD methods (saveEpoch, getEpoch, getCurrentEpoch)
  - [x] 13.3 Implement member CRUD methods (saveMember, getMember, listActiveMembers)
  - [x] 13.4 Implement document CRUD methods (saveDocument, getDocument, listDocumentsByEpoch with pagination)
  - [x] 13.5 Implement proposal and vote CRUD methods
  - [x] 13.6 Implement identity recovery record methods (save, get, delete, listExpired with pagination)
  - [x] 13.7 Implement alias registry methods (saveAlias, getAlias, isAliasAvailable)
  - [x] 13.8 Implement audit log methods — `appendAuditEntry`, `getLatestAuditEntry` (needed by AuditLogService for chain linking)
  - [x] 13.9 Implement operational state persistence (save, get)
  - [x] 13.10 Implement redistribution journal CRUD — `saveJournalEntry(entry: RedistributionJournalEntry)`, `getJournalEntries(epochNumber)`, `deleteJournalEntries(epochNumber)` for transition ceremony rollback support
  - [x] 13.11 Implement statute of limitations config persistence — `saveStatuteConfig(config: StatuteOfLimitationsConfig)`, `getStatuteConfig()` (Req 17.2)
  - [x] 13.12 Implement `withTransaction()` delegating to `BrightChainDb.withTransaction`
  - [x] 13.13 Implement `isAvailable()` health check — detect pool deletion/corruption on startup (Req 9.5)
  - [x] 13.14 Write unit tests for QuorumDatabaseAdapter — CRUD round-trips for each collection, pagination, listExpired filtering, transaction rollback, isAvailable when pool missing

## Task 14: Immutable Chained Audit Log (brightchain-lib + brightchain-api-lib)

- [x] 14. Implement chained audit log service
  - [x] 14.1 Implement `AuditLogService` in `brightchain-lib` — compute contentHash (SHA-3 of serialized entry excluding signature/blockIds), link previousEntryHash via `getLatestAuditEntry()`, sign contentHash with node operator key
  - [x] 14.2 Implement block store persistence — store each chained entry via `storeCBLWithWhitening`, attach blockId1/blockId2 to the entry
  - [x] 14.3 Implement chain verification — walk chain backward from latest entry, recompute contentHash, verify signature against signing node's public key, retrieve from block store via `retrieveCBL(blockId1, blockId2)` and confirm match, verify previousEntryHash links, detect tampering
  - [x] 14.4 Integrate audit logging into QuorumStateMachine for ALL auditable events:
    - [x] 14.4.1 Epoch events: `epoch_created`, `member_added`, `member_removed`
    - [x] 14.4.2 Transition events: `transition_ceremony_started`, `transition_ceremony_completed`, `transition_ceremony_failed`
    - [x] 14.4.3 Proposal lifecycle: `proposal_created`, `proposal_approved`, `proposal_rejected`, `proposal_expired`
    - [x] 14.4.4 Vote events: `vote_cast`
    - [x] 14.4.5 Identity disclosure: `identity_disclosure_proposed`, `identity_disclosure_approved`, `identity_disclosure_rejected`, `identity_disclosure_expired`
    - [x] 14.4.6 Identity expiration: `identity_shards_expired`
    - [x] 14.4.7 Alias events: `alias_registered`, `alias_deregistered`
    - [x] 14.4.8 Share redistribution: `share_redistribution_started`, `share_redistribution_completed`, `share_redistribution_failed`
  - [x] 14.5 Write property test for P12: Audit Chain Integrity (sequence of entries forms valid hash chain, recomputed hashes match, signatures verify)
  - [x] 14.6 Write unit tests for AuditLogService — genesis entry (null previousEntryHash), chain linking, signature verification, tamper detection

## Checkpoint D: API-Lib Implementations Build & Test Verification

- [x] D. Verify operator prompt, database adapter, and audit log compile, lint, and pass all tests
  - [x] D.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors (audit log service lives here)
  - [x] D.2 Run `NX_TUI=false npx nx run brightchain-api-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] D.3 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] D.4 Run `NX_TUI=false npx nx run brightchain-api-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] D.5 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify all existing + new tests pass including P12
  - [x] D.6 Run `NX_TUI=false npx nx run brightchain-api-lib:test --outputStyle=stream` — verify CLIOperatorPrompt and QuorumDatabaseAdapter unit tests pass

## Task 15: Identity Sealing Pipeline (brightchain-lib)

- [x] 15. Implement IdentitySealingPipeline
  - [x] 15.1 Implement `sealIdentity()` — capture real identity, generate Shamir shards, replace identity field based on mode (real/alias/anonymous), encrypt shards per member, store IdentityRecoveryRecord, attach record ID to content, discard plaintext
  - [x] 15.2 Implement `recoverIdentity()` — given sufficient decrypted shares, reconstruct the real identity from an IdentityRecoveryRecord
  - [x] 15.3 Implement shard verification step — verify shards correctly reconstruct before distributing
  - [x] 15.4 Implement Anonymous_ID (all-zeroes GuidV4) constant and identity replacement logic
  - [x] 15.5 Write property test for P7: Identity Sealing Round-Trip (seal then recover returns original identity)
  - [x] 15.6 Write unit tests for IdentitySealingPipeline — each identity mode (real/alias/anonymous), shard verification failure path, plaintext memory wipe verification

## Task 16: Alias Registry (brightchain-lib)

- [x] 16. Implement alias registry
  - [x] 16.1 Implement alias registration — validate uniqueness, generate alias keypair, seal alias-to-identity mapping via IdentitySealingPipeline, store AliasRecord
  - [x] 16.2 Implement alias deregistration — mark alias as inactive, prevent further content publication
  - [x] 16.3 Implement alias lookup — resolve alias to real identity given sufficient quorum shares
  - [x] 16.4 Integrate alias registration/deregistration with proposal system (REGISTER_ALIAS, DEREGISTER_ALIAS action types)
  - [x] 16.5 Write property test for P8: Alias Uniqueness (two members cannot register the same alias)
  - [x] 16.6 Write unit tests for AliasRegistry — registration, deregistration, duplicate rejection, lookup with insufficient shares fails

## Task 17: Membership Proof Service (brightchain-lib)

- [x] 17. Implement ring signature membership proof service
  - [x] 17.1 Implement `generateProof()` — create ring signature over content hash using signer's private key and all member public keys
  - [x] 17.2 Implement `verifyProof()` — verify ring signature against member public key set and content hash
  - [x] 17.3 Write property test for P9: Membership Proof Content Binding (proof for content H1 fails verification against H2)
  - [x] 17.4 Write property test for P10: Membership Proof Non-Identifiability (proof verifies against full set, contains no member-specific identifiers)
  - [x] 17.5 Write unit tests for MembershipProofService — valid proof generation/verification, invalid proof rejection, empty member set edge case

## Task 18: Identity Validator (brightchain-lib)

- [x] 18. Implement node-side identity validation
  - [x] 18.1 Implement `IdentityValidator.validateContent()` — dispatch to real identity, alias, or anonymous validation based on creatorId
  - [x] 18.2 Implement real identity validation — verify signature matches public key, check not banned/suspended
  - [x] 18.3 Implement alias identity validation — lookup alias, verify active, verify signature matches alias public key, check owner not banned
  - [x] 18.4 Implement anonymous identity validation — verify Membership_Proof present and valid, verify content-bound
  - [x] 18.5 Write property test for P15: Identity Validation Rejects Invalid Signatures
  - [x] 18.6 Write unit tests for IdentityValidator — each validation path (real/alias/anonymous), banned user rejection, suspended user rejection, missing membership proof on anonymous content

## Checkpoint E: Identity & Anonymity Pipeline Build & Test Verification

- [x] E. Verify identity sealing pipeline, alias registry, membership proof, and identity validator compile, lint, and pass all tests
  - [x] E.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] E.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] E.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify ALL tests pass including P7 (identity round-trip), P8 (alias uniqueness), P9 (proof content binding), P10 (proof non-identifiability), P15 (invalid signature rejection)

## Task 19: Content Ingestion Pipeline Integration (brightchain-api-lib)

- [x] 19. Wire identity validation and sealing into content ingestion
  - [x] 19.1 Create content ingestion middleware that calls IdentityValidator then IdentitySealingPipeline before accepting content into block store
  - [x] 19.2 Integrate with existing block store write path — content only accepted after successful validation and shard distribution
  - [x] 19.3 Handle all error cases — return descriptive errors for each IdentityValidationErrorType
  - [x] 19.4 Write unit tests for content ingestion middleware — valid content accepted, each rejection reason tested, verify IdentitySealingPipeline called after validation passes

## Task 20: Expiration Scheduler (brightchain-api-lib)

- [x] 20. Implement expiration scheduler for statute of limitations
  - [x] 20.1 Implement `ExpirationScheduler` class — periodic timer, configurable interval (default 24h) and batch size (default 100)
  - [x] 20.2 Implement `runOnce()` — query expired records via `listExpiredIdentityRecords(now, page, batchSize)`, delete shards, append chained audit entries (`identity_shards_expired`), report results; if batch was full set `nextBatchAvailable = true`
  - [x] 20.3 Implement `start()` and `stop()` for lifecycle management
  - [x] 20.4 Implement statute of limitations configuration — load `StatuteOfLimitationsConfig` from database, per-content-type durations with fallback (default 7 years); set `expiresAt = createdAt + duration` on IdentityRecoveryRecord creation
  - [x] 20.5 Implement rejection of IDENTITY_DISCLOSURE for expired records — when target IdentityRecoveryRecord has expired or been deleted, return `IdentityPermanentlyUnrecoverable` error (Req 17.6)
  - [x] 20.6 Write property test for P11: Temporal Expiration Permanence (expired records deleted, disclosure rejected with permanent error)
  - [x] 20.7 Write unit tests for ExpirationScheduler — runOnce with expired records, runOnce with no expired records, batch continuation (nextBatchAvailable), start/stop lifecycle, config loading

## Task 21: Gossip Service Implementation Updates (brightchain-api-lib)

- [x] 21. Update GossipService implementation for quorum messages
  - [x] 21.1 Implement `announceQuorumProposal()` — serialize QuorumProposalMetadata into BlockAnnouncement, use priority gossip
  - [x] 21.2 Implement `announceQuorumVote()` — serialize QuorumVoteMetadata into BlockAnnouncement, use priority gossip
  - [x] 21.3 Implement proposal/vote message handlers — validate, deserialize, dispatch to QuorumStateMachine
  - [x] 21.4 Implement CBL attachment caching — when a proposal with attachment is received, retrieve and cache the CBL content locally
  - [x] 21.5 Write unit tests for gossip quorum extensions — proposal serialization/deserialization round-trip, vote serialization/deserialization round-trip, invalid proposer/voter message rejection, duplicate message handling, CBL attachment retrieval

## Checkpoint F: API-Lib Integration Build & Test Verification

- [x] F. Verify content ingestion, expiration scheduler, and gossip updates compile, lint, and pass all tests
  - [x] F.1 Run `NX_TUI=false npx nx run brightchain-api-lib:build --outputStyle=stream` — fix any compilation errors
  - [x] F.2 Run `NX_TUI=false npx nx run brightchain-api-lib:lint --outputStyle=stream` — fix any lint violations
  - [x] F.3 Run `NX_TUI=false npx nx run brightchain-api-lib:test --outputStyle=stream` — verify all unit tests pass including content ingestion, expiration scheduler (P11), and gossip extension tests
  - [x] F.4 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — re-verify no regressions in brightchain-lib

## Task 22: API Endpoints (brightchain-api)

- [x] 22. Create quorum API endpoints
  - [x] 22.1 Create POST `/api/quorum/proposals` — submit a proposal (validate body, delegate to QuorumStateMachine.submitProposal)
  - [x] 22.2 Create GET `/api/quorum/proposals/:id` — get proposal status and votes
  - [x] 22.3 Create GET `/api/quorum/metrics` — expose `QuorumMetrics` from QuorumStateMachine.getMetrics()
  - [x] 22.4 Create GET `/api/quorum/epochs/:number` — get epoch details
  - [x] 22.5 Create GET `/api/quorum/status` — get current operational mode, epoch, member count
  - [x] 22.6 Create GET `/api/quorum/audit/verify` — trigger audit chain verification, return integrity status
  - [x] 22.7 Create GET `/api/quorum/aliases/:name` — check alias availability (public) or resolve alias (requires quorum auth)
  - [x] 22.8 Write unit tests for each API endpoint — request validation, success responses, error responses, auth checks

## Task 23: Application Lifecycle Wiring (brightchain-api)

- [x] 23. Wire quorum subsystem into application startup/shutdown
  - [x] 23.1 Initialize `QuorumDatabaseAdapter` with pool ID `"quorum-system"` on application startup in `brightchain-api/src/main.ts`
  - [x] 23.2 Initialize `QuorumStateMachine` with database adapter, gossip service, operator prompt, and audit log service
  - [x] 23.3 Start `ExpirationScheduler` on application startup, stop on shutdown (graceful cleanup)
  - [x] 23.4 Register gossip message handlers for `quorum_proposal` and `quorum_vote` on startup
  - [x] 23.5 Wire content ingestion middleware (IdentityValidator + IdentitySealingPipeline) into the block store write path

## Checkpoint G: Full API Build & Test Verification

- [x] G. Verify API endpoints, lifecycle wiring, and full application compile, lint, and pass all tests
  - [x] G.1 Run `NX_TUI=false npx nx run brightchain-api:build --outputStyle=stream` — fix any compilation errors
  - [x] G.2 Run `NX_TUI=false npx nx run brightchain-api:lint --outputStyle=stream` — fix any lint violations
  - [x] G.3 Run `NX_TUI=false npx nx run brightchain-api:test --outputStyle=stream` — verify all API endpoint unit tests pass
  - [x] G.4 Run `NX_TUI=false npx nx run-many --target=build --projects=brightchain-lib,brightchain-api-lib,brightchain-api --outputStyle=stream` — verify full dependency chain builds cleanly
  - [x] G.5 Run `NX_TUI=false npx nx run-many --target=test --projects=brightchain-lib,brightchain-api-lib,brightchain-api --outputStyle=stream` — verify all tests pass across all three projects

## Task 24: Barrel Exports and Index Updates (brightchain-lib + brightchain-api-lib)

- [ ] 24. Update library barrel exports for all new types
  - [ ] 24.1 Export all new enumerations from `brightchain-lib/src/lib/enumerations/index.ts` (QuorumOperationalMode, ProposalStatus, ProposalActionType, IdentityMode, IdentityValidationErrorType, QuorumErrorType)
  - [ ] 24.2 Export all new interfaces from `brightchain-lib/src/lib/interfaces/index.ts` (QuorumEpoch, Proposal, ProposalInput, Vote, VoteInput, IdentityRecoveryRecord, AliasRecord, OperationalState, QuorumDocumentMetadata, AuditLogEntry, ChainedAuditLogEntry, ContentWithIdentity, RedistributionConfig, StatuteOfLimitationsConfig, RedistributionJournalEntry, QuorumMetrics)
  - [ ] 24.3 Export all new service interfaces from `brightchain-lib/src/lib/interfaces/services/` index (IQuorumStateMachine, IOperatorPrompt, IQuorumDatabase, IIdentitySealingPipeline, IMembershipProofService, IIdentityValidator, IExpirationScheduler)
  - [ ] 24.4 Export gossip extensions (QuorumProposalMetadata, QuorumVoteMetadata) from availability interfaces index
  - [ ] 24.5 Export QuorumError and related error classes from `brightchain-lib/src/lib/errors/index.ts`
  - [ ] 24.6 Export all new service implementations from `brightchain-api-lib` index (QuorumDatabaseAdapter, CLIOperatorPrompt, ExpirationScheduler)
  - [ ] 24.7 Verify all exports compile cleanly — run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` and `NX_TUI=false npx nx run brightchain-api-lib:build --outputStyle=stream`

## Task 25: Integration and E2E Tests

- [ ] 25. Write integration tests for critical end-to-end flows
  - [ ] 25.1 Integration test: Bootstrap → Add Members → Transition Ceremony → Quorum Mode (full lifecycle)
  - [ ] 25.2 Integration test: Proposal submission → Gossip delivery → Operator vote → Tally → Action execution
  - [ ] 25.3 Integration test: Content ingestion with identity sealing — real identity, alias identity, and anonymous identity modes
  - [ ] 25.4 Integration test: IDENTITY_DISCLOSURE end-to-end — submit with CBL attachment, vote, unseal identity, verify audit trail
  - [ ] 25.5 Integration test: Statute of limitations — create identity record, advance time past expiration, run scheduler, verify deletion and disclosure rejection
  - [ ] 25.6 Integration test: Audit chain integrity — perform multiple operations, verify chain, tamper with an entry, verify detection
  - [ ] 25.7 Integration test: Share redistribution on member add/remove — verify old member shares invalidated, new member shares work

## Checkpoint H: Final Full-Suite Verification

- [ ] H. Final verification — all projects build, lint, and pass all tests (unit, property, and integration)
  - [ ] H.1 Run `NX_TUI=false npx nx run-many --target=lint --all --outputStyle=stream` — zero lint errors across entire workspace
  - [ ] H.2 Run `NX_TUI=false npx nx run-many --target=build --all --outputStyle=stream` — all projects build successfully
  - [ ] H.3 Run `NX_TUI=false npx nx run-many --target=test --projects=brightchain-lib,brightchain-api-lib,brightchain-api --outputStyle=stream` — all unit tests, property tests (P1-P18), and integration tests pass
  - [ ] H.4 Verify no `as any` or `as unknown` casts were introduced — run grep check across new files
  - [ ] H.5 Verify all new interfaces use `<TID extends PlatformID = Uint8Array>` generic pattern where applicable

## Task 26: Documentation Updates

- [ ] 26. Update project documentation
  - [ ] 26.1 Update `docs/BrightChain Writeup.md` — add quorum bootstrap mode, proposal/voting mechanism, brokered anonymity pipeline, alias registry, temporal expiration, membership proofs, immutable chained audit log, and hierarchical quorum sections
  - [ ] 26.2 Update `docs/BrightChain Summary.md` — update implementation status for quorum governance, add new completed systems
  - [ ] 26.3 Update README.md if it references quorum capabilities — add brokered anonymity, identity sealing, and legal compliance workflow descriptions
