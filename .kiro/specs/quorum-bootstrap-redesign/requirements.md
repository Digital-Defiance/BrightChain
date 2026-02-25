# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive redesign of the BrightChain quorum system. The current quorum implementation (`QuorumService`, `SealingService`, `DiskQuorumService`) uses Shamir's Secret Sharing to split AES-256-GCM symmetric keys among members, with ECIES-encrypted shares per member. However, it lacks support for bootstrap operation (single-node or few-node mode), has no mechanism for key redistribution when membership changes, provides no gossip-based proposal/voting workflow for operator-interactive decisions, and does not leverage `brightchain-db` pool isolation for quorum data segregation.

This redesign addresses eight key areas: bootstrap mode, key redistribution on membership changes, gossip-based proposal and voting with physical operator prompts, encryption architecture hardening, member removal security analysis, integration with `brightchain-db` for quorum data isolation, long-term scalability planning, and the brokered anonymity pipeline (identity sealing, alias registry, node-side validation, temporal expiration, and anonymous membership proofs).

## Glossary

- **Quorum_System**: The overall subsystem responsible for multi-party access control, member management, document sealing/unsealing, proposal voting, and key lifecycle management. Encompasses `QuorumService`, `SealingService`, `DiskQuorumService`, and new components introduced by this redesign.
- **Bootstrap_Mode**: An operational mode of the Quorum_System that allows quorum operations with fewer than the normal minimum number of members (potentially a single node), using reduced share thresholds.
- **Quorum_Mode**: The standard operational mode requiring the full configured threshold of members for all operations.
- **Transition_Ceremony**: The process of migrating from Bootstrap_Mode to Quorum_Mode by re-splitting all existing sealed data under new share parameters with the full member set.
- **Share_Redistribution**: The process of generating new Shamir shares for an existing symmetric key when quorum membership changes, without re-encrypting the underlying data payload.
- **Proposal**: A structured request submitted to quorum members for deliberation and voting, containing a human-readable description, a machine-readable action payload, and metadata.
- **Vote**: A quorum member's response to a Proposal, consisting of an approval or rejection decision, an optional comment, and the member's decrypted share (released only on approval).
- **Operator_Prompt**: A physical interactive prompt presented to a node operator requiring manual reading of the Proposal text, entry of a vote decision, and authentication via password to release the member's share.
- **Gossip_Service**: The existing `IGossipService` implementation that handles peer-to-peer announcement batching, encrypted payloads, and message delivery/acknowledgment via WebSocket.
- **Sealed_Document**: A `QuorumDataRecord` containing AES-256-GCM encrypted data, ECIES-encrypted Shamir shares per member, a checksum, and a creator signature.
- **Quorum_Epoch**: A versioned configuration snapshot of the quorum membership and threshold parameters. Each membership change increments the epoch.
- **Quorum_Database**: A `BrightChainDb` instance configured with a dedicated pool ID for isolated storage of quorum membership records, sealed documents, proposals, votes, and epoch metadata.
- **Sealing_Service**: The existing `SealingService` class that performs Shamir secret splitting, ECIES share encryption/decryption, and AES-256-GCM data encryption/decryption.
- **Member**: An entity in the quorum identified by a public key, capable of holding encrypted shares and participating in voting.
- **Threshold**: The minimum number of shares required to reconstruct the symmetric key and unseal a document.
- **CBL**: Constituent Block List — a reference to a collection of blocks stored in BrightChain, identified by a CBL ID (magnet URL or block ID pair). CBLs can contain arbitrary data such as PDFs, legal documents, or court orders, stored via the `storeCBLWithWhitening` mechanism.
- **Proposal_Attachment**: An optional CBL reference included with a Proposal, allowing the proposer to attach supporting documentation (e.g., legal orders, evidence, policy documents) that voters can retrieve and review before casting their vote.
- **Identity_Disclosure**: A Proposal action type used when an authorized party requests the release of identity data for a specific quorum member, typically in response to a legal order such as a FISA court order or subpoena.
- **Brokered_Anonymity**: The mechanism by which a user's real identity is sealed using Shamir's Secret Sharing and distributed among quorum members, while the content is published with an alias or anonymous identity. The real identity can only be recovered through a majority quorum vote.
- **Identity_Recovery_Record**: A QuorumDataRecord specifically containing the sealed real identity of a content creator, referenced by the anonymized content via a shard record ID.
- **Alias**: A registered pseudonymous identity that maps back to a member's real identity. The mapping is sealed in the quorum.
- **Anonymous_ID**: A special all-zeroes GuidV4 identifier used when content is posted with no identity attribution at all.
- **Statute_of_Limitations**: The configurable time period after which identity recovery shards are permanently deleted, making the real identity behind anonymous content permanently unrecoverable.
- **Membership_Proof**: A cryptographic proof that the creator of anonymous content is a valid network member, without revealing which specific member.
- **Identity_Sealing_Pipeline**: The end-to-end process that captures a content creator's real identity, generates Shamir shares from it, replaces the identity field with an Alias or Anonymous_ID, distributes encrypted shards to quorum members, and discards the original plaintext identity.

## Requirements

### Requirement 1: Bootstrap Mode Initialization

**User Story:** As a node operator deploying BrightChain for the first time, I want to run the quorum in a single-node or few-node bootstrap mode, so that I can begin sealing and protecting data before a full quorum is assembled.

#### Acceptance Criteria

1. WHEN the Quorum_System is initialized with fewer members than the configured Quorum_Mode threshold, THE Quorum_System SHALL enter Bootstrap_Mode with a reduced threshold equal to the number of available members (minimum 1).
2. WHILE in Bootstrap_Mode, THE Sealing_Service SHALL accept a share count and threshold as low as 1 member and 1 share, overriding the current `SEALING.MIN_SHARES` constraint of 2.
3. WHILE in Bootstrap_Mode, THE Quorum_System SHALL record all sealed documents with a metadata flag indicating they were sealed under Bootstrap_Mode and the Quorum_Epoch at sealing time.
4. THE Quorum_System SHALL persist the current operational mode (Bootstrap_Mode or Quorum_Mode) and the associated Quorum_Epoch in the Quorum_Database.
5. IF the Quorum_System is started and a persisted mode exists, THEN THE Quorum_System SHALL restore the persisted mode and epoch without requiring re-initialization.

### Requirement 2: Transition from Bootstrap Mode to Quorum Mode

**User Story:** As a node operator, I want to transition from bootstrap mode to full quorum mode once enough members have joined, so that data protection meets the target security level.

#### Acceptance Criteria

1. WHEN the number of active quorum members reaches or exceeds the configured Quorum_Mode threshold, THE Quorum_System SHALL allow the operator to initiate a Transition_Ceremony.
2. WHEN a Transition_Ceremony is initiated, THE Quorum_System SHALL create a new Quorum_Epoch with the updated member list and threshold.
3. WHEN a Transition_Ceremony is initiated, THE Sealing_Service SHALL re-split the symmetric key of each Sealed_Document created under Bootstrap_Mode using the new member set and threshold, without re-encrypting the underlying data payload.
4. WHEN a Transition_Ceremony completes, THE Quorum_System SHALL update the operational mode to Quorum_Mode and persist the new Quorum_Epoch.
5. IF a Transition_Ceremony fails partway through, THEN THE Quorum_System SHALL roll back to the previous Quorum_Epoch and remain in Bootstrap_Mode.
6. WHILE a Transition_Ceremony is in progress, THE Quorum_System SHALL reject new seal and unseal operations to prevent inconsistent state.

### Requirement 3: Share Redistribution on Member Addition

**User Story:** As a quorum administrator, I want shares to be redistributed when a new member is added, so that the new member can participate in future unsealing operations and the security parameters reflect the updated membership.

#### Acceptance Criteria

1. WHEN a new Member is added to the Quorum_System, THE Quorum_System SHALL increment the Quorum_Epoch.
2. WHEN a new Member is added, THE Quorum_System SHALL initiate Share_Redistribution for all Sealed_Documents in the current epoch.
3. WHEN performing Share_Redistribution, THE Sealing_Service SHALL require at least the current threshold number of existing members to provide their decrypted shares to reconstruct the symmetric key.
4. WHEN performing Share_Redistribution, THE Sealing_Service SHALL generate new Shamir shares for the reconstructed symmetric key using the updated member list and threshold, and encrypt each new share with the corresponding member's public key via ECIES.
5. WHEN Share_Redistribution completes for a Sealed_Document, THE Quorum_System SHALL update the document's `encryptedSharesByMemberId` map and `memberIDs` list, and record the new Quorum_Epoch on the document.
6. IF Share_Redistribution fails for a Sealed_Document, THEN THE Quorum_System SHALL log the failure with the document ID and retain the previous shares, allowing retry.

### Requirement 4: Share Redistribution on Member Removal

**User Story:** As a quorum administrator, I want shares to be redistributed when a member is removed, so that the removed member's share becomes cryptographically useless without requiring full data re-encryption.

#### Acceptance Criteria

1. WHEN a Member is removed from the Quorum_System, THE Quorum_System SHALL increment the Quorum_Epoch.
2. WHEN a Member is removed, THE Quorum_System SHALL initiate Share_Redistribution for all Sealed_Documents that include the removed member.
3. WHEN performing Share_Redistribution after member removal, THE Sealing_Service SHALL generate an entirely new set of Shamir polynomial coefficients, ensuring the removed member's old share provides zero information about the new shares.
4. WHEN Share_Redistribution completes after member removal, THE Quorum_System SHALL remove the removed member's entry from the `encryptedSharesByMemberId` map of each affected Sealed_Document.
5. THE Quorum_System SHALL NOT require re-encryption of the underlying data payload when a member is removed, because knowledge of a single Shamir share is insufficient to reconstruct the symmetric key (the share threshold is always at least 2 in Quorum_Mode).
6. IF the removal would reduce the active member count below the current threshold, THEN THE Quorum_System SHALL reject the removal and return an error indicating insufficient remaining members.

### Requirement 5: Gossip-Based Proposal Submission

**User Story:** As a quorum member, I want to submit proposals to the quorum via the gossip network, so that all members are notified of pending decisions requiring their input.

#### Acceptance Criteria

1. WHEN a quorum member submits a Proposal, THE Quorum_System SHALL assign a unique proposal ID, record the proposal in the Quorum_Database, and set the proposal status to "pending".
2. WHEN a Proposal is created, THE Gossip_Service SHALL announce the Proposal to all connected peers using a new `QUORUM_PROPOSAL` gossip message type.
3. THE Proposal message SHALL contain the proposal ID, a human-readable description (plain text, maximum 4096 characters), the action type, the action payload, the proposer's member ID, an expiration timestamp, the required vote threshold, and an optional Proposal_Attachment field.
4. WHEN a Proposal includes a Proposal_Attachment, THE Quorum_System SHALL validate that the referenced CBL ID exists and is retrievable from the Quorum_Database or the node's block store before accepting the Proposal.
5. WHEN a node receives a `QUORUM_PROPOSAL` gossip message, THE Quorum_System SHALL validate the proposer is an active quorum member and store the proposal locally in the Quorum_Database.
6. IF a Proposal with a duplicate proposal ID is received, THEN THE Quorum_System SHALL discard the duplicate without error.
7. WHEN a Proposal with a Proposal_Attachment is stored locally, THE Quorum_System SHALL retrieve and cache the referenced CBL content so that the node operator can review the attachment during voting.

### Requirement 6: Operator-Interactive Voting Mechanism

**User Story:** As a node operator, I want to be physically prompted to read, evaluate, and vote on quorum proposals, so that no automated process can release my share without my explicit consent.

#### Acceptance Criteria

1. WHEN a pending Proposal is received, THE Quorum_System SHALL present an Operator_Prompt to the node operator containing the full proposal description text and action details.
2. WHEN a pending Proposal includes a Proposal_Attachment, THE Operator_Prompt SHALL display the attachment CBL ID and provide a mechanism for the operator to retrieve and view the attached content (e.g., rendering a PDF or displaying document text) before voting.
3. THE Operator_Prompt SHALL require the node operator to enter a vote decision (approve or reject) via a text input field.
4. WHEN the operator votes "approve", THE Operator_Prompt SHALL require the operator to authenticate by entering their member password before the share is released.
5. WHEN the operator authenticates successfully and votes "approve", THE Quorum_System SHALL decrypt the member's share for the relevant Sealed_Document and include the decrypted share in the Vote response.
6. WHEN the operator votes "reject", THE Quorum_System SHALL record the rejection without releasing any share material.
7. THE Quorum_System SHALL NOT release share material through any code path that bypasses the Operator_Prompt.
8. IF the operator fails authentication three consecutive times, THEN THE Quorum_System SHALL lock the voting interface for that proposal for a configurable cooldown period (default 300 seconds).

### Requirement 7: Gossip-Based Vote Collection and Tallying

**User Story:** As a quorum administrator, I want votes to be collected and tallied via the gossip network, so that the proposal outcome is determined in a decentralized manner.

#### Acceptance Criteria

1. WHEN a node operator submits a Vote, THE Gossip_Service SHALL announce the Vote to all connected peers using a new `QUORUM_VOTE` gossip message type.
2. THE Vote message SHALL contain the proposal ID, the voter's member ID, the vote decision (approve/reject), an optional comment (maximum 1024 characters), and the ECIES-encrypted share (present only for approve votes, encrypted to the proposal initiator's public key).
3. WHEN a node receives a `QUORUM_VOTE` gossip message, THE Quorum_System SHALL validate the voter is an active quorum member listed on the proposal and store the vote in the Quorum_Database.
4. WHEN the number of "approve" votes for a Proposal reaches the required threshold, THE Quorum_System SHALL mark the proposal as "approved" and execute the associated action.
5. WHEN a Proposal expires (current time exceeds the expiration timestamp) without reaching the threshold, THE Quorum_System SHALL mark the proposal as "expired".
6. IF a duplicate Vote (same proposal ID and voter member ID) is received, THEN THE Quorum_System SHALL discard the duplicate without error.
7. THE Quorum_System SHALL emit an event when a proposal status changes (pending → approved, pending → expired, pending → rejected).

### Requirement 8: Encryption Architecture Integrity

**User Story:** As a security auditor, I want the encryption architecture to follow established cryptographic best practices, so that the quorum system provides strong confidentiality and integrity guarantees.

#### Acceptance Criteria

1. THE Sealing_Service SHALL generate a fresh AES-256-GCM symmetric key using `crypto.getRandomValues` for each seal operation, with a key size matching `ECIES.SYMMETRIC.KEY_SIZE`.
2. THE Sealing_Service SHALL split the symmetric key using Shamir's Secret Sharing via the `@digitaldefiance/secrets` library with a bit size appropriate for the number of shares.
3. THE Sealing_Service SHALL encrypt each Shamir share individually with the corresponding member's ECIES public key before storage.
4. THE Quorum_System SHALL verify the `QuorumDataRecord` checksum (SHA-3 hash of encrypted data) and creator signature on every unseal operation before attempting share decryption.
5. THE Quorum_System SHALL use constant-time comparison for all checksum and signature verification operations to prevent timing side-channel attacks.
6. IF checksum or signature verification fails during unseal, THEN THE Quorum_System SHALL reject the operation and return a descriptive error without revealing which check failed to external callers.

### Requirement 9: Quorum Data Segregation via BrightChain-DB

**User Story:** As a system architect, I want quorum data stored in a dedicated, pool-isolated database, so that quorum membership records, sealed documents, proposals, and votes are segregated from general application data.

#### Acceptance Criteria

1. THE Quorum_System SHALL create a `BrightChainDb` instance configured with a dedicated pool ID (e.g., `"quorum-system"`) for all quorum-related data storage.
2. THE Quorum_Database SHALL contain separate collections for members, sealed documents, proposals, votes, and epoch metadata.
3. WHEN the Quorum_System stores or retrieves quorum data, THE Quorum_System SHALL use the Quorum_Database exclusively, ensuring all quorum blocks are routed through the `PooledStoreAdapter`.
4. THE Quorum_Database SHALL support transactional writes via `BrightChainDb.withTransaction` for operations that modify multiple collections atomically (e.g., Share_Redistribution updating document shares and epoch metadata).
5. IF the Quorum_Database pool is deleted or corrupted, THEN THE Quorum_System SHALL detect the condition on startup and return an error indicating quorum data is unavailable.

### Requirement 10: Quorum Epoch Management

**User Story:** As a quorum administrator, I want a versioned record of all quorum membership changes, so that sealed documents can be associated with the membership configuration under which they were created and audited over time.

#### Acceptance Criteria

1. THE Quorum_System SHALL maintain a monotonically increasing Quorum_Epoch counter, starting at 1 for the initial quorum configuration.
2. WHEN the quorum membership or threshold changes (member addition, member removal, or Transition_Ceremony), THE Quorum_System SHALL create a new epoch record containing the epoch number, the list of active member IDs, the threshold, the operational mode, and a timestamp.
3. THE Quorum_System SHALL store each epoch record in the Quorum_Database epochs collection.
4. WHEN a Sealed_Document is created, THE Quorum_System SHALL record the current Quorum_Epoch number on the document metadata.
5. THE Quorum_System SHALL provide a query interface to retrieve the epoch record for a given epoch number.

### Requirement 11: Proposal Action Types

**User Story:** As a quorum administrator, I want proposals to support specific action types for common quorum operations, so that the voting mechanism can drive membership changes and key redistribution in a structured way.

#### Acceptance Criteria

1. THE Quorum_System SHALL support the following Proposal action types: `ADD_MEMBER`, `REMOVE_MEMBER`, `CHANGE_THRESHOLD`, `TRANSITION_TO_QUORUM_MODE`, `UNSEAL_DOCUMENT`, `IDENTITY_DISCLOSURE`, `REGISTER_ALIAS`, `DEREGISTER_ALIAS`, `EXTEND_STATUTE`, and `CUSTOM`.
2. WHEN a Proposal with action type `ADD_MEMBER` is approved, THE Quorum_System SHALL add the specified member and initiate Share_Redistribution.
3. WHEN a Proposal with action type `REMOVE_MEMBER` is approved, THE Quorum_System SHALL remove the specified member and initiate Share_Redistribution.
4. WHEN a Proposal with action type `CHANGE_THRESHOLD` is approved, THE Quorum_System SHALL update the threshold and initiate Share_Redistribution for all active Sealed_Documents.
5. WHEN a Proposal with action type `UNSEAL_DOCUMENT` is approved and sufficient shares are collected from approve votes, THE Quorum_System SHALL unseal the specified document and make the plaintext available to authorized members.
6. WHEN a Proposal with action type `IDENTITY_DISCLOSURE` is submitted, THE Quorum_System SHALL require a Proposal_Attachment containing the legal basis documentation (e.g., court order, FISA warrant) as a CBL reference.
7. WHEN a Proposal with action type `IDENTITY_DISCLOSURE` is approved and sufficient shares are collected, THE Quorum_System SHALL unseal the target member's identity record and make the disclosed identity data available exclusively to the proposer.
8. FOR Proposals with action type `CUSTOM`, THE Quorum_System SHALL execute a registered callback handler if one exists for the custom action subtype, or log the approval without automated execution.

### Requirement 12: Long-Term Scalability

**User Story:** As a system architect, I want the quorum system to scale gracefully as the network grows from a single node to hundreds of members, so that performance and security remain acceptable at all scales.

#### Acceptance Criteria

1. THE Quorum_System SHALL support a configurable maximum member count up to the existing `SEALING.MAX_SHARES` limit (1,048,575).
2. WHEN the quorum has more than 20 active members, THE Quorum_System SHALL support hierarchical quorum structures where a subset of members forms an inner quorum responsible for routine operations, while the full membership is required only for critical operations (e.g., threshold changes).
3. THE Quorum_System SHALL batch Share_Redistribution operations to process documents in configurable page sizes (default 100) to limit memory consumption during large-scale redistribution.
4. THE Gossip_Service SHALL use the existing priority gossip configuration to prioritize `QUORUM_PROPOSAL` and `QUORUM_VOTE` messages over routine block announcements.
5. THE Quorum_System SHALL provide metrics (proposal count, vote latency, redistribution progress) accessible via the API for monitoring at scale.

### Requirement 13: Legal Compliance Identity Disclosure Workflow

**User Story:** As a legal authority (e.g., law enforcement with a valid court order), I want to submit a proposal to the quorum requesting identity disclosure for a specific member, attaching the legal documentation as proof, so that the quorum can review the legal basis and vote on whether to release the member's identity data.

#### Acceptance Criteria

1. WHEN a party submits an `IDENTITY_DISCLOSURE` Proposal, THE Quorum_System SHALL require the action payload to contain the target member ID whose identity is being requested.
2. WHEN a party submits an `IDENTITY_DISCLOSURE` Proposal, THE Quorum_System SHALL require a Proposal_Attachment containing a CBL reference to the legal documentation (e.g., FISA court order, subpoena, warrant).
3. IF an `IDENTITY_DISCLOSURE` Proposal is submitted without a Proposal_Attachment, THEN THE Quorum_System SHALL reject the proposal and return an error indicating that legal documentation is required.
4. WHEN an `IDENTITY_DISCLOSURE` Proposal is presented to operators for voting, THE Operator_Prompt SHALL clearly label the proposal as an identity disclosure request and display the target member ID alongside the attached legal documentation.
5. WHEN an `IDENTITY_DISCLOSURE` Proposal is approved, THE Quorum_System SHALL unseal only the identity record for the target member and make the disclosed data available exclusively to the proposer, without exposing other sealed documents or other members' data.
6. THE Quorum_System SHALL record an immutable audit log entry for each `IDENTITY_DISCLOSURE` Proposal, including the proposal ID, target member ID, proposer ID, attached CBL ID, vote outcome, and timestamp.
7. WHEN an `IDENTITY_DISCLOSURE` Proposal is rejected or expires, THE Quorum_System SHALL record the outcome in the audit log without releasing any identity data.


### Requirement 14: Identity Sealing Pipeline (Brokered Anonymity Core Flow)

**User Story:** As a content creator on BrightChain, I want my real identity to be sealed and replaced with an alias or anonymous identifier when I publish content, so that my identity is protected by the quorum and can only be recovered through a majority vote.

#### Acceptance Criteria

1. WHEN a user creates content (a block, message, or post), THE Identity_Sealing_Pipeline SHALL capture the real creator identity before publication.
2. WHEN the Identity_Sealing_Pipeline processes content, THE Sealing_Service SHALL generate Shamir's Secret Sharing shards from the real creator identity using the current Quorum_Epoch threshold and member list.
3. WHEN identity shards are generated, THE Identity_Sealing_Pipeline SHALL replace the identity field on the content with one of three modes: the real identity (no anonymization), a registered Alias, or the Anonymous_ID (all-zeroes GuidV4).
4. WHEN identity shards are generated, THE Identity_Sealing_Pipeline SHALL encrypt each shard with the corresponding quorum member's public key via ECIES and distribute the encrypted shards to quorum members.
5. WHEN identity shards are distributed, THE Quorum_System SHALL store the shards as an Identity_Recovery_Record in the Quorum_Database.
6. WHEN the Identity_Recovery_Record is stored, THE Identity_Sealing_Pipeline SHALL attach the Identity_Recovery_Record ID to the content metadata so the sealed identity can be looked up later.
7. WHEN the Identity_Sealing_Pipeline completes shard distribution, THE Identity_Sealing_Pipeline SHALL discard the original plaintext identity from memory and ensure the plaintext identity is not persisted in any store.
8. THE Identity_Sealing_Pipeline SHALL support all content types stored in BrightChain, including blocks, messages, and posts.
9. IF shard generation or distribution fails, THEN THE Identity_Sealing_Pipeline SHALL reject the content submission and return a descriptive error without publishing the content.

### Requirement 15: Alias Registry

**User Story:** As a BrightChain member, I want to register pseudonymous aliases that map back to my real identity through the quorum, so that I can post under a consistent pseudonym while keeping my real identity quorum-protected.

#### Acceptance Criteria

1. WHEN a Member registers an Alias, THE Quorum_System SHALL validate that the Alias is unique across the network before accepting the registration.
2. WHEN a Member registers an Alias, THE Quorum_System SHALL seal the Alias-to-real-identity mapping as an Identity_Recovery_Record in the Quorum_Database using the Identity_Sealing_Pipeline.
3. WHEN a Member registers an Alias, THE Quorum_System SHALL associate a public key with the Alias so that content signed under the Alias can be verified without revealing the real identity.
4. WHEN an Alias registration is requested, THE Quorum_System SHALL submit the registration as a Proposal with a new `REGISTER_ALIAS` action type, requiring quorum approval via the voting mechanism.
5. WHEN an Alias deregistration is requested, THE Quorum_System SHALL submit the deregistration as a Proposal with a new `DEREGISTER_ALIAS` action type, requiring quorum approval via the voting mechanism.
6. WHEN a `REGISTER_ALIAS` Proposal is approved, THE Quorum_System SHALL store the Alias record in a dedicated aliases collection within the Quorum_Database.
7. WHEN a `DEREGISTER_ALIAS` Proposal is approved, THE Quorum_System SHALL mark the Alias as inactive in the Quorum_Database and prevent further content publication under that Alias.
8. THE Quorum_System SHALL provide a lookup interface that, given sufficient quorum shares (via an approved `IDENTITY_DISCLOSURE` Proposal), resolves an Alias to the real member identity.
9. IF a Member attempts to register an Alias that already exists, THEN THE Quorum_System SHALL reject the registration and return an error indicating the Alias is already taken.

### Requirement 16: Node-Side Identity Validation on Content Ingestion

**User Story:** As a node operator, I want my node to validate the identity and authorization of content creators before accepting content into the block store, so that only authorized members can publish content and identity recovery shards are properly generated.

#### Acceptance Criteria

1. WHEN a node receives content with a real (non-anonymous, non-alias) identity, THE Quorum_System SHALL verify that the content signature matches the claimed identity's public key.
2. WHEN a node receives content with an Alias identity, THE Quorum_System SHALL verify that the Alias is registered in the Quorum_Database and that the content signature matches the Alias's associated public key.
3. WHEN a node receives content with the Anonymous_ID, THE Quorum_System SHALL verify that the content carries a valid Membership_Proof demonstrating the creator is a legitimate network member.
4. WHEN a node receives content for ingestion, THE Quorum_System SHALL verify that the content creator (real identity, Alias owner, or anonymous member) is not banned or suspended from the network.
5. WHEN a node validates content identity, THE Identity_Sealing_Pipeline SHALL generate identity recovery shards and distribute them to quorum members before the content is accepted into the block store.
6. WHEN identity recovery shards are generated during ingestion, THE Quorum_System SHALL verify that the Shamir shares correctly reconstruct the real identity before distributing the shards to quorum members.
7. WHEN identity validation, shard generation, and shard distribution all succeed, THE Quorum_System SHALL accept the content into the block store.
8. IF identity validation fails at any step (invalid signature, unregistered Alias, invalid Membership_Proof, banned user, or shard verification failure), THEN THE Quorum_System SHALL reject the content and return a descriptive error indicating the reason for rejection.

### Requirement 17: Temporal Identity Expiration (Digital Statute of Limitations)

**User Story:** As a system architect, I want identity recovery shards to expire after a configurable time period, so that a "digital statute of limitations" permanently protects content creators' anonymity after the expiration window closes.

#### Acceptance Criteria

1. WHEN an Identity_Recovery_Record is created, THE Quorum_System SHALL assign a configurable expiration timestamp (the Statute_of_Limitations) to the record.
2. THE Quorum_System SHALL support configurable Statute_of_Limitations durations per content type (e.g., posts, messages, financial records), stored in the Quorum_Database configuration.
3. WHEN the current time exceeds the Statute_of_Limitations of an Identity_Recovery_Record, THE Quorum_System SHALL permanently delete the identity recovery shards from the Quorum_Database.
4. WHEN identity recovery shards are deleted due to expiration, THE Quorum_System SHALL retain the associated content in the block store without modification, ensuring only the identity recovery data is removed.
5. WHEN identity recovery shards are deleted due to expiration, THE Quorum_System SHALL record an audit log entry indicating the Identity_Recovery_Record ID, the content reference, and the expiration timestamp.
6. WHEN a party requests identity disclosure for content whose Identity_Recovery_Record has expired, THE Quorum_System SHALL reject the request and return an error indicating the identity is permanently unrecoverable.
7. WHEN a quorum member submits a Proposal to extend the Statute_of_Limitations for a specific Identity_Recovery_Record before expiration, THE Quorum_System SHALL process the extension as a Proposal with a new `EXTEND_STATUTE` action type requiring quorum approval.
8. WHEN an `EXTEND_STATUTE` Proposal is approved, THE Quorum_System SHALL update the expiration timestamp on the Identity_Recovery_Record to the new value.
9. THE Quorum_System SHALL process expired Identity_Recovery_Records in configurable batch sizes (default 100) to limit performance impact during purge operations.
10. THE Quorum_System SHALL run expiration checks on a configurable periodic schedule (default every 24 hours).

### Requirement 18: Anonymous Content Verification via Membership Proof

**User Story:** As a node operator, I want to verify that anonymous content was created by a legitimate network member without learning which member, so that non-members cannot flood the network with anonymous content.

#### Acceptance Criteria

1. WHEN a Member creates content using the Anonymous_ID, THE Identity_Sealing_Pipeline SHALL generate a Membership_Proof demonstrating the creator is a valid network member without revealing the specific member identity.
2. THE Membership_Proof SHALL be cryptographically verifiable by any node in the network without requiring quorum participation or share reconstruction.
3. WHEN a node receives anonymous content, THE Quorum_System SHALL validate the Membership_Proof before accepting the content into the block store.
4. IF the Membership_Proof is invalid or absent on anonymous content, THEN THE Quorum_System SHALL reject the content and return an error indicating anonymous content requires a valid Membership_Proof.
5. THE Membership_Proof SHALL be bound to the specific content it accompanies, preventing reuse of a Membership_Proof across different content items.
6. THE Membership_Proof SHALL remain valid even after the Statute_of_Limitations expires and the identity recovery shards are deleted.
