# Quorum System in BrightChain

## Overview

The BrightChain Quorum system provides a decentralized governance structure for managing sensitive data, identity verification, and brokered anonymity. It implements a digital statute of limitations through time-based data expiration and requires consensus for sensitive operations.

## Quorum Structure

### Composition

- Approximately 24 members (organizations)
- Preferably charitable organizations with board oversight
- Multiple trust levels for different operations

```typescript
enum NodeTrustLevel {
  STORAGE_ONLY, // Can only store OFFS blocks
  QUORUM_MEMBER, // Trusted for quorum operations
  QUORUM_ADMIN, // Can manage quorum membership
}

interface QuorumMemberMetadata {
  trustLevel: NodeTrustLevel;
  publicKey: Buffer;
  lastVerified: Date;
  votingWeight?: number;
}
```

### Node Requirements

- Nodes must maintain high availability
- Private keys stored in node configuration
- Keys loaded into secure buffer at startup
- Raw keys deleted from memory after loading

## Document Storage

### CBL Storage System

- Documents stored as encrypted CBL + tuples
- Each document has an expiration date
- Storage requires energy credits (Joules)
- More credits required for:
  - Longer storage duration
  - Higher redundancy
  - Extended storage periods

### Storage Credits

- Credits measured in Joules
- Used for:
  - Initial storage allocation
  - Storage duration
  - Redundancy level
  - Storage extensions

### Document Expiration

```typescript
interface StorageMetadata {
  expirationDate: Date;
  maxExtensionDate?: Date; // For statute of limitations
  creditsPaid: number; // In Joules
  redundancyLevel: number;
  lastRenewal?: Date;
}
```

## Brokered Anonymity

### Process Flow

1. User posts data with regular ID and signature
2. ID portion is zeroed out
3. Server verifies signature against known user ID
4. Data is encrypted with random key
5. Key is split using Shamir's Secret Sharing
6. Shards distributed to quorum members

### Implementation

```typescript
interface AnonymityBroker {
  userIdentity: EncryptedBlock;
  unmaskedUntil?: Date;
  unmaskVotes: Map<GuidV4, boolean>;
  unmaskReason?: string;
  unmaskThreshold: number;
}

interface QuorumDocument {
  checksum: ChecksumBuffer;
  creator: BrightChainMember;
  signature: SignatureBuffer;
  memberIDs: GuidV4[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
  expirationDate: Date;
  maxExtensionDate?: Date;
  anonymityBroker?: AnonymityBroker;
}
```

### Statute of Limitations

- Documents have mandatory expiration
- Maximum extension date enforces true statute of limitations
- After expiration:
  - Encrypted ID data is purged
  - Anonymity becomes permanent
  - Document becomes unrecoverable

## Quorum Operations

### Member Management

- New member addition requires quorum vote
- When adding new members:
  1. Network vote is called
  2. Sufficient shards collected to decrypt data
  3. Data re-encrypted with new member included
  4. New shards distributed

### Voting System

- Required for:
  - Adding/removing members
  - Unmasking anonymous data
  - Extending document storage
  - Modifying quorum parameters

### Shard Management

```typescript
interface ShardMetadata {
  shardId: Buffer;
  keeper: BrightChainMember;
  encryptionEpoch: number;
  expirationDate: Date;
}

interface ShardDistribution {
  documentId: Buffer;
  shards: Map<GuidV4, EncryptedBlock>; // Member ID to encrypted shard
  threshold: number; // Required shares for reconstruction
}
```

## Security Measures

### Key Management

- Separate key pairs for:
  - Signing operations
  - Encryption operations
  - Network communication
- Keys stored in secure buffer
- Private keys never persisted in raw form

### Vote Verification

- All votes must be signed
- Votes are time-limited
- Requires threshold of quorum participation
- Results are cryptographically verifiable

## Pending Design Decisions

1. Vote Notification System

   - How to notify operators of pending votes
   - Mechanism for vote description/context
   - Secure communication channel for vote details

2. Member Communication

   - Protocol for inter-member communication
   - Emergency protocols for member unavailability
   - Secure channel establishment

3. Credit System Implementation

   - Credit calculation formula
   - Payment/allocation mechanism
   - Credit verification system

4. Storage Extension Protocol
   - Process for requesting extensions
   - Credit cost calculation
   - Extension approval process

## Future Considerations

1. Scalability

   - Handling growing number of documents
   - Managing credit system at scale
   - Optimizing shard distribution

2. Recovery Procedures

   - Member key compromise
   - Network partition handling
   - Data recovery procedures

3. Automation
   - Automatic vote scheduling
   - Credit management automation
   - Expiration enforcement

## Implementation Priorities

1. Core Quorum Structure

   - Member management
   - Voting system
   - Shard distribution

2. Storage System

   - CBL implementation
   - Expiration handling
   - Credit system

3. Brokered Anonymity

   - Identity management
   - Unmasking protocol
   - Statute enforcement

4. Operational Tools
   - Vote management
   - Credit tracking
   - Member communication
