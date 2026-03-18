---
title: "BrightTrust Member/Operator Guide"
parent: "Guides"
nav_order: 3
permalink: /guides/03-BrightTrust-member-guide/
---
# BrightTrust Member/Operator Guide

This guide is for current and prospective BrightTrust members. It covers what the BrightTrust does, how governance works, the proposal/vote lifecycle, sealed document management, the ban mechanism, and your responsibilities as a BrightTrust member.

## What the BrightTrust Is

The BrightTrust is BrightChain's governance layer. It is a group of trusted members (recommended ~24, typically charitable organizations with board oversight) who collectively manage:

- Sealed document recovery (identity records, sensitive data)
- Network policy decisions (threshold changes, member management)
- The ban mechanism (removing bad actors from the network)
- Brokered anonymity (de-anonymization under legal process)

The BrightTrust uses Shamir's Secret Sharing: sensitive data is split into cryptographic shares distributed to members. Reconstructing the data requires a threshold number of members to contribute their shares. No single member — and no minority — can access sealed data alone.

## How You Get In

BrightTrust membership is by invitation only. The process:

1. Run a storage node reliably for a sustained period — demonstrate uptime and good behavior
2. Participate actively in storage pools and the community
3. An existing BrightTrust member proposes your admission:

```typescript
const proposal = await BrightTrustStateMachine.submitProposal({
  actionType: ProposalActionType.ADD_MEMBER,
  description: 'Admit NodeOperatorX as BrightTrust member',
  actionPayload: {
    targetMemberId: candidateMember.id,
    metadata: { name: 'Org Name', role: 'operator' },
  },
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});
```

4. Active BrightTrust members vote. The proposal must reach the configured threshold (typically 51–75%).
5. If approved, a new epoch is created. All sealed documents have their shares redistributed to include you. This is called a "transition ceremony."

The transition is atomic — if redistribution fails partway through, the system rolls back using journal entries.

## Your Responsibilities

### Keep Your Node Online

Your node holds shares of sealed documents. If too many BrightTrust members go offline simultaneously, the threshold for document reconstruction may not be reachable. Uptime matters.

### Participate in Votes

Proposals have expiration dates. If you don't vote, you're effectively abstaining — which can prevent proposals from reaching their threshold. Check for pending proposals regularly.

### Secure Your Keys

Your private key is used to decrypt your shares of sealed documents. If compromised, an attacker could contribute your share to an unauthorized reconstruction. If lost, the BrightTrust may need to remove you and redistribute shares — an expensive operation.

### Authenticate Physically for Sensitive Operations

The gossip-based proposal/voting system includes physical operator authentication for high-impact actions. This means a human must confirm certain operations — they can't be automated away.

## Governance: Proposals and Votes

### Proposal Types

| Action Type | What It Does | Threshold | Cooling Period |
|-------------|-------------|-----------|----------------|
| `ADD_MEMBER` | Admit a new BrightTrust member | Standard (51–75%) | None |
| `REMOVE_MEMBER` | Remove a BrightTrust member, redistribute shares | Standard | None |
| `BAN_MEMBER` | Ban a node from the network | Supermajority (75%) | 72 hours |
| `UNBAN_MEMBER` | Lift a ban | Supermajority (75%) | 48 hours |
| `CHANGE_THRESHOLD` | Change the vote threshold | Standard | None |
| `UNSEAL_DOCUMENT` | Reconstruct a sealed document | Standard | None |
| `IDENTITY_DISCLOSURE` | De-anonymize a user (legal process) | Standard | None |
| `REGISTER_ALIAS` / `DEREGISTER_ALIAS` | Manage identity aliases | Standard | None |
| `EXTEND_STATUTE` | Extend the statute of limitations on identity data | Standard | None |
| `CHANGE_INNER_BRIGHT_TRUST` | Update the inner BrightTrust subset | Standard | None |
| `CUSTOM` | Custom governance action | Standard | None |

### Submitting a Proposal

```typescript
const proposal = await BrightTrustStateMachine.submitProposal({
  actionType: ProposalActionType.BAN_MEMBER,
  description: 'Ban node X for corrupting blocks in main pool',
  actionPayload: {
    targetMemberId: badActorId,
    reason: 'Persistent block corruption and gossip spam',
    evidenceBlockIds: ['block-id-1', 'block-id-2'],
  },
  expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
});
```

The proposal is stored, assigned an ID, and announced to other BrightTrust members via gossip.

### Voting

```typescript
await BrightTrustStateMachine.submitVote({
  proposalId: proposal.id,
  voterId: myMemberId,
  approve: true, // or false
});
```

Votes are also propagated via gossip. When the threshold is reached (and any cooling period has elapsed), the proposal is executed automatically.

### Cooling Periods

Ban and unban proposals have mandatory cooling periods:

- `BAN_MEMBER`: 72 hours (configurable, minimum 1 hour)
- `UNBAN_MEMBER`: 48 hours (configurable, minimum 1 hour)

Even if the 75% supermajority is reached immediately, the proposal will not execute until the cooling period elapses. This gives offline members time to review the evidence and vote.

## The Ban Mechanism

### When to Propose a Ban

Propose a ban when a node is:
- Corrupting or tampering with blocks
- Spamming the gossip protocol
- Refusing to serve blocks it claims to have
- Poisoning Bloom filters in the discovery protocol
- Attempting unauthorized access to private pools
- Any other behavior that degrades the network

### What Happens When a Ban Is Enacted

1. The target member's status is set to `Banned`
2. A signed `BanRecord` is created with the BrightTrust's approval signatures
3. The record is persisted to the BrightTrust database
4. A `member_banned` gossip announcement propagates to all nodes
5. If the target is a BrightTrust member, `REMOVE_MEMBER` is also executed (share redistribution)
6. Every node updates its local ban list cache
7. All enforcement points activate:
   - Gossip messages from the banned node are dropped
   - Discovery excludes the banned node
   - Reconciliation refuses to sync with the banned node
   - Block store rejects writes from the banned node
   - Active connections are torn down within 60 seconds

### Sybil Protections

Two rules prevent abuse of the ban mechanism:

1. **Epoch restriction**: Members admitted in the current epoch cannot propose bans. You must survive at least one epoch transition first.

2. **Proposer-ally filtering**: When tallying votes on a ban proposal, votes from members who were admitted by the ban proposer are excluded. This prevents someone from admitting allies and immediately using their votes.

Combined with the 75% supermajority, these protections make it mathematically infeasible for a small group to weaponize bans.

### Unbanning

Same process as banning: proposal, 75% supermajority vote, 48-hour cooling period. The member's status returns to `Active`, the ban record is removed, and enforcement is lifted.

## Sealed Documents

### Sealing

```typescript
const result = await BrightTrustStateMachine.sealDocument(
  agentMember,
  sensitiveData,
  memberIds,       // which members receive shares
  sharesRequired,  // how many shares needed to reconstruct
);
```

The data is encrypted with a random AES key, the key is split via Shamir's Secret Sharing, and each share is encrypted with the recipient member's public key.

### Unsealing

Requires `sharesRequired` members to contribute their private keys:

```typescript
const data = await BrightTrustStateMachine.unsealDocument(
  documentId,
  membersWithPrivateKey, // at least sharesRequired members
);
```

The system verifies the checksum (SHA-3) and creator signature before returning the data.

### Brokered Anonymity

BrightChain's "brokered anonymity" pipeline:

1. A content creator's real identity is captured
2. Shamir shards are generated from the identity
3. The identity field is replaced with an alias or anonymous ID
4. Encrypted shards are distributed to BrightTrust members
5. The original plaintext identity is discarded

Anonymous content carries ring signature membership proofs — proving the creator is a valid network member without revealing which one.

Identity can only be reconstructed through majority BrightTrust consensus, typically in response to legal processes (e.g., FISA warrants with documentation). After a configurable statute of limitations, identity recovery shards are permanently deleted, making the real identity permanently unrecoverable.

## Epochs

An epoch is a versioned snapshot of the BrightTrust's membership. Epoch transitions happen when:

- A member is added or removed
- A ban is enacted against a BrightTrust member
- The threshold is changed

Each epoch transition triggers share redistribution for all sealed documents. Old shares from previous epochs are invalidated — a removed member's shares become useless.

## Operational Modes

| Mode | When | What It Means |
|------|------|---------------|
| Bootstrap | Members < threshold | Reduced security, single-node operation possible |
| TransitionInProgress | During ceremony | Operations blocked, shares being redistributed |
| BrightTrust | Members ≥ threshold | Full security, all operations available |

The system detects `TransitionInProgress` on startup and triggers rollback recovery if a previous transition was interrupted.

## Monitoring

```typescript
const metrics = await BrightTrustStateMachine.getMetrics();
// metrics includes: proposal counts, vote counts, redistribution stats,
// member counts, epoch info, expiration stats
```

Key things to watch:
- Pending proposals that need your vote
- Epoch transitions (share redistribution in progress)
- Member count relative to threshold (if too many members leave, you may drop to Bootstrap mode)
- Audit log for unusual activity

## Next Steps

- [How to Join BrightChain](./01-how-to-join-brightchain.md) — Overview of all participation levels
- [Node Operator Guide](./02-node-operator-guide.md) — Day-to-day node operations
- [Security Analysis](./04-security-analysis.md) — Adversarial analysis of BrightChain's trust model
