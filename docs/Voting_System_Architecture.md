# BrightChain Voting System Architecture

## Overview

BrightChain implements a comprehensive cryptographic voting system with government-grade security features, supporting 15+ voting methods from simple plurality to complex ranked choice voting. The system is built on Paillier homomorphic encryption, enabling secure vote tallying without revealing individual votes until the final count.

**Key Features:**
- 15+ voting methods with security classifications
- Homomorphic encryption for privacy-preserving vote aggregation
- Verifiable receipts with cryptographic signatures
- Immutable audit logs with hash-chained integrity
- Public bulletin board with Merkle tree verification
- Role separation (poll aggregators cannot decrypt votes)
- Multi-round support for IRV, STAR, and STV
- Hierarchical aggregation (Precinct → County → State → National)
- Cross-platform compatibility (Node.js and browsers)

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Poll (Vote Aggregator)                                     │
│  ├─ Paillier PUBLIC key only  ← encrypts & aggregates      │
│  ├─ Authority's EC keys       ← signs receipts              │
│  └─ Cannot decrypt votes                                    │
│                                                              │
│  PollTallier (Separate Entity)                              │
│  ├─ Paillier PRIVATE key      ← decrypts ONLY after close  │
│  └─ Computes results                                        │
│                                                              │
│  Voter (Member)                                             │
│  ├─ EC keypair                ← verifies receipts           │
│  └─ Voting public key         ← encrypts votes              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Security Model

**Role Separation:**
- **Poll**: Aggregates encrypted votes, cannot decrypt
- **PollTallier**: Separate entity with private key, decrypts only after poll closure
- **Voter**: Encrypts votes, verifies receipts

**Cryptographic Foundation:**
- **ECDH-to-Paillier Bridge**: Derives Paillier keys from existing ECDSA/ECDH keys
- **Homomorphic Addition**: E(a) + E(b) = E(a+b) enables encrypted tallying
- **128-bit Security**: Miller-Rabin primality testing (256 rounds, error < 2^-512)
- **Timing Attack Resistance**: Constant-time operations, deterministic random bit generation

## Voting Methods

### Classification by Security Level

#### ✅ Fully Secure (Single-round, Privacy-preserving)

These methods support complete homomorphic encryption - votes remain encrypted throughout the entire process until final tally.

**1. Plurality (First-Past-The-Post)**
- **Description**: Each voter selects one candidate. Candidate with most votes wins.
- **Use Cases**: Simple elections, single-winner contests
- **Encoding**: Single choice index encrypted
- **API**: `PollFactory.createPlurality(choices, authority)`
- **Demo**: `PluralityDemo.tsx`

**2. Approval Voting**
- **Description**: Voters approve any number of candidates. Most approvals wins.
- **Use Cases**: Committee elections, multi-option decisions
- **Encoding**: Bitmap of approved candidates
- **API**: `PollFactory.createApproval(choices, authority)`
- **Demo**: `ApprovalDemo.tsx`

**3. Weighted Voting**
- **Description**: Votes have different weights (e.g., shareholder voting)
- **Use Cases**: Stakeholder decisions, proportional representation
- **Encoding**: Choice index with weight multiplier
- **API**: `PollFactory.createWeighted(choices, authority, config)`
- **Configuration**: `{ minWeight, maxWeight, allowFractional }`
- **Demo**: `WeightedDemo.tsx`

**4. Borda Count**
- **Description**: Ranked voting with points (n-1 for 1st, n-2 for 2nd, etc.)
- **Use Cases**: Preference aggregation, consensus building
- **Encoding**: Ranked preferences with point allocation
- **API**: `PollFactory.createBorda(choices, authority)`
- **Demo**: `BordaDemo.tsx`

**5. Score Voting**
- **Description**: Rate each candidate 0-10, highest average wins
- **Use Cases**: Quality assessments, satisfaction surveys
- **Encoding**: Score array for each candidate
- **API**: `PollFactory.createScore(choices, authority, config)`
- **Configuration**: `{ minScore, maxScore }`
- **Demo**: `ScoreDemo.tsx`

**6. Yes/No**
- **Description**: Binary referendum voting
- **Use Cases**: Ballot measures, simple decisions
- **Encoding**: Single bit (0=No, 1=Yes)
- **API**: `PollFactory.createYesNo(question, authority)`
- **Demo**: `YesNoDemo.tsx`

**7. Yes/No/Abstain**
- **Description**: Binary voting with abstention option
- **Use Cases**: Formal votes requiring quorum
- **Encoding**: Ternary value (0=No, 1=Yes, 2=Abstain)
- **API**: `PollFactory.createYesNoAbstain(question, authority)`
- **Demo**: `YesNoAbstainDemo.tsx`

**8. Supermajority**
- **Description**: Requires 2/3 or 3/4 threshold to pass
- **Use Cases**: Constitutional amendments, critical decisions
- **Encoding**: Yes/No with threshold configuration
- **API**: `PollFactory.createSupermajority(question, authority, config)`
- **Configuration**: `{ threshold: 0.667 | 0.75 }`
- **Demo**: `SupermajorityDemo.tsx`

#### ⚠️ Multi-Round (Requires intermediate decryption)

These methods require decrypting intermediate results between rounds, reducing privacy guarantees.

**9. Ranked Choice (IRV - Instant Runoff Voting)**
- **Description**: Voters rank candidates. Lowest eliminated, votes transferred until majority.
- **Use Cases**: Single-winner elections, avoiding vote splitting
- **Encoding**: Ordered preference list
- **API**: `PollFactory.createRankedChoice(choices, authority)`
- **Rounds**: Multiple elimination rounds with vote transfers
- **Demo**: `RankedChoiceDemo.tsx`

**10. Two-Round Runoff**
- **Description**: Top 2 candidates advance to runoff if no majority
- **Use Cases**: Presidential elections, high-stakes decisions
- **Encoding**: Single choice (round 1), then runoff choice
- **API**: `PollFactory.createTwoRound(choices, authority)`
- **Demo**: `TwoRoundDemo.tsx`

**11. STAR (Score Then Automatic Runoff)**
- **Description**: Score all candidates, top 2 by score go to automatic runoff
- **Use Cases**: Combines score voting benefits with runoff
- **Encoding**: Score array, then preference between top 2
- **API**: `PollFactory.createSTAR(choices, authority)`
- **Demo**: `STARDemo.tsx`

**12. STV (Single Transferable Vote)**
- **Description**: Proportional representation with vote transfers
- **Use Cases**: Multi-winner elections, proportional representation
- **Encoding**: Ranked preferences with quota calculation
- **API**: `PollFactory.createSTV(choices, authority, config)`
- **Configuration**: `{ seats: number }`
- **Demo**: `STVDemo.tsx`

#### ❌ Insecure (No privacy - special cases only)

These methods cannot maintain vote privacy due to their mathematical requirements.

**13. Quadratic Voting**
- **Description**: Cost = votes², enables intensity expression
- **Use Cases**: Resource allocation, preference intensity
- **Encoding**: Vote counts with quadratic cost calculation
- **API**: `PollFactory.createQuadratic(choices, authority, config)`
- **Configuration**: `{ credits: number }`
- **Security**: Requires non-homomorphic operations, votes visible
- **Demo**: `QuadraticDemo.tsx`

**14. Consensus**
- **Description**: Requires 95%+ agreement
- **Use Cases**: Community decisions, unanimous consent
- **Encoding**: Yes/No with high threshold
- **API**: `PollFactory.createConsensus(question, authority)`
- **Security**: Threshold checking requires decryption
- **Demo**: `ConsensusDemo.tsx`

**15. Consent-Based**
- **Description**: Passes unless strong objections (sociocracy)
- **Use Cases**: Collaborative decision-making
- **Encoding**: Support/Neutral/Object with objection threshold
- **API**: `PollFactory.createConsentBased(question, authority)`
- **Security**: Objection counting requires decryption
- **Demo**: `ConsentBasedDemo.tsx`

## API Reference

### Core Classes

#### Poll<TID extends PlatformID>

Main poll class for vote aggregation.

```typescript
class Poll<TID extends PlatformID = Uint8Array> {
  constructor(
    id: TID,
    method: VotingMethod,
    choices: string[],
    authority: Member,
    config?: PollConfiguration
  );
  
  // Vote casting
  vote(voter: Member, encryptedVote: EncryptedVote<TID>): VoteReceipt;
  
  // Receipt verification
  verifyReceipt(voter: Member, receipt: VoteReceipt): boolean;
  
  // Poll lifecycle
  close(): void;
  isOpen(): boolean;
  isClosed(): boolean;
  
  // Vote access (for tallying)
  getVotes(): EncryptedVote<TID>[];
  getVoteCount(): number;
}
```

#### PollTallier

Separate entity for decrypting and tallying votes.

```typescript
class PollTallier {
  constructor(
    authority: Member,
    privateKey: PrivateKey,
    publicKey: PublicKey
  );
  
  // Tally votes
  tally(poll: Poll): PollResults;
  
  // Verify tally integrity
  verifyTally(poll: Poll, results: PollResults): boolean;
}
```

#### VoteEncoder

Encrypts votes using Paillier homomorphic encryption.

```typescript
class VoteEncoder {
  constructor(votingPublicKey: PublicKey);
  
  // Method-specific encoding
  encodePlurality(choiceIndex: number, numChoices: number): EncryptedVote;
  encodeApproval(approvedIndices: number[], numChoices: number): EncryptedVote;
  encodeWeighted(choiceIndex: number, weight: number, numChoices: number): EncryptedVote;
  encodeBorda(rankings: number[], numChoices: number): EncryptedVote;
  encodeScore(scores: number[], numChoices: number): EncryptedVote;
  encodeRankedChoice(rankings: number[], numChoices: number): EncryptedVote;
  encodeYesNo(vote: boolean): EncryptedVote;
  encodeYesNoAbstain(vote: 'yes' | 'no' | 'abstain'): EncryptedVote;
  
  // Generic encoding
  encode(method: VotingMethod, voteData: any, numChoices: number): EncryptedVote;
}
```

#### PollFactory

Convenient factory for creating polls with method-specific configurations.

```typescript
class PollFactory {
  static createPlurality(choices: string[], authority: Member): Poll;
  static createApproval(choices: string[], authority: Member): Poll;
  static createWeighted(choices: string[], authority: Member, config: WeightedConfig): Poll;
  static createBorda(choices: string[], authority: Member): Poll;
  static createScore(choices: string[], authority: Member, config?: ScoreConfig): Poll;
  static createRankedChoice(choices: string[], authority: Member): Poll;
  static createYesNo(question: string, authority: Member): Poll;
  static createYesNoAbstain(question: string, authority: Member): Poll;
  static createSupermajority(question: string, authority: Member, config: SupermajorityConfig): Poll;
  static createTwoRound(choices: string[], authority: Member): Poll;
  static createSTAR(choices: string[], authority: Member): Poll;
  static createSTV(choices: string[], authority: Member, config: STVConfig): Poll;
  static createQuadratic(choices: string[], authority: Member, config: QuadraticConfig): Poll;
  static createConsensus(question: string, authority: Member): Poll;
  static createConsentBased(question: string, authority: Member): Poll;
}
```

### Government Compliance Components

#### ImmutableAuditLog

Cryptographic hash-chain audit trail.

```typescript
class ImmutableAuditLog<TID extends PlatformID = Uint8Array> {
  constructor(authority: Member);
  
  // Record events
  recordPollCreated(pollId: TID, metadata: any): void;
  recordVoteCast(pollId: TID, voterIdHash: Uint8Array, metadata?: any): void;
  recordPollClosed(pollId: TID, metadata: any): void;
  
  // Verification
  verifyChain(): boolean;
  getEntries(): AuditEntry[];
}
```

#### PublicBulletinBoard

Transparent, append-only vote publication with Merkle tree integrity.

```typescript
class PublicBulletinBoard {
  constructor(authority: Member);
  
  // Publish votes
  publishVote(pollId: TID, encryptedVote: bigint[], voterIdHash: Uint8Array): void;
  
  // Publish tally
  publishTally(pollId: TID, tallies: bigint[], choices: string[], votes: bigint[][]): void;
  
  // Verification
  verifyEntry(entry: BulletinBoardEntry): boolean;
  verifyMerkleTree(): boolean;
  getEntries(pollId: TID): BulletinBoardEntry[];
}
```

#### PollEventLogger

Comprehensive event tracking with microsecond timestamps.

```typescript
class PollEventLogger<TID extends PlatformID = Uint8Array> {
  constructor(idProvider: IIdProvider<TID>);
  
  // Log events
  logPollCreated(pollId: TID, authorityId: TID, config: PollConfiguration): void;
  logVoteCast(pollId: TID, voterToken: Uint8Array, metadata?: any): void;
  logPollClosed(pollId: TID, tallyHash: Uint8Array, metadata?: any): void;
  
  // Query events
  getEventsForPoll(pollId: TID): EventLogEntry[];
  verifySequence(): boolean;
}
```

### Security Validation

#### VotingSecurityValidator

Security level validation and enforcement.

```typescript
class VotingSecurityValidator {
  static getSecurityLevel(method: VotingMethod): SecurityLevel;
  static validate(method: VotingMethod, options?: { allowInsecure?: boolean }): void;
  static isFullyHomomorphic(method: VotingMethod): boolean;
  static requiresMultiRound(method: VotingMethod): boolean;
  static isInsecure(method: VotingMethod): boolean;
}
```

### Hierarchical Aggregation

Support for multi-level vote aggregation.

```typescript
class PrecinctAggregator {
  aggregateVotes(polls: Poll[]): AggregatedResults;
}

class CountyAggregator {
  aggregatePrecincts(precincts: AggregatedResults[]): AggregatedResults;
}

class StateAggregator {
  aggregateCounties(counties: AggregatedResults[]): AggregatedResults;
}

class NationalAggregator {
  aggregateStates(states: AggregatedResults[]): AggregatedResults;
}
```

## Types and Interfaces

### Core Types

```typescript
// Platform-agnostic ID type
type PlatformID = Uint8Array | Guid | ObjectId | string;

// Voting method enumeration
enum VotingMethod {
  Plurality = 'plurality',
  Approval = 'approval',
  Weighted = 'weighted',
  Borda = 'borda',
  Score = 'score',
  RankedChoice = 'ranked-choice',
  YesNo = 'yes-no',
  YesNoAbstain = 'yes-no-abstain',
  Supermajority = 'supermajority',
  TwoRound = 'two-round',
  STAR = 'star',
  STV = 'stv',
  Quadratic = 'quadratic',
  Consensus = 'consensus',
  ConsentBased = 'consent-based'
}

// Security classification
enum SecurityLevel {
  FullyHomomorphic = 'fully-homomorphic',
  MultiRound = 'multi-round',
  Insecure = 'insecure'
}
```

### Vote Structures

```typescript
interface EncryptedVote<TID extends PlatformID = Uint8Array> {
  voterId: TID;
  encrypted: bigint[];  // Paillier-encrypted vote components
  timestamp: number;
  signature?: Uint8Array;
}

interface VoteReceipt {
  pollId: PlatformID;
  voterId: PlatformID;
  timestamp: number;
  signature: Uint8Array;
  receiptId: string;
}

interface PollResults<TID extends PlatformID = Uint8Array> {
  pollId: TID;
  method: VotingMethod;
  choices: string[];
  tallies: bigint[];
  winner?: number;
  winners?: number[];  // For multi-winner methods
  voterCount: number;
  rounds?: RoundResult[];  // For multi-round methods
}

interface RoundResult {
  round: number;
  tallies: bigint[];
  eliminated?: number;
  winner?: number;
}
```

### Configuration Types

```typescript
interface PollConfiguration {
  method: VotingMethod;
  choices: string[];
  metadata?: any;
}

interface WeightedConfig {
  minWeight: number;
  maxWeight: number;
  allowFractional: boolean;
}

interface ScoreConfig {
  minScore: number;
  maxScore: number;
}

interface SupermajorityConfig {
  threshold: number;  // 0.667 for 2/3, 0.75 for 3/4
}

interface STVConfig {
  seats: number;
}

interface QuadraticConfig {
  credits: number;
}
```

## Usage Examples

### Basic Plurality Election

```typescript
import { ECIESService, Member, MemberType, EmailString } from '@brightchain/brightchain-lib';
import { PollFactory, VoteEncoder, PollTallier } from '@digitaldefiance/ecies-lib';

// Create authority with voting keys
const ecies = new ECIESService();
const { member: authority } = Member.newMember(
  ecies,
  MemberType.System,
  'Election Authority',
  new EmailString('authority@example.com')
);
await authority.deriveVotingKeys();

// Create poll
const poll = PollFactory.createPlurality(
  ['Alice', 'Bob', 'Charlie'],
  authority
);

// Create voter and cast vote
const { member: voter } = Member.newMember(
  ecies,
  MemberType.User,
  'Voter',
  new EmailString('voter@example.com')
);

const encoder = new VoteEncoder(authority.votingPublicKey!);
const vote = encoder.encodePlurality(0, 3); // Vote for Alice
const receipt = poll.vote(voter, vote);

// Verify receipt
console.log('Receipt valid:', poll.verifyReceipt(voter, receipt));

// Close and tally
poll.close();
const tallier = new PollTallier(
  authority,
  authority.votingPrivateKey!,
  authority.votingPublicKey!
);
const results = tallier.tally(poll);

console.log('Winner:', results.choices[results.winner!]);
console.log('Tallies:', results.tallies);
```

### Ranked Choice with Audit Log

```typescript
import { ImmutableAuditLog } from '@digitaldefiance/ecies-lib';

// Create audit log
const auditLog = new ImmutableAuditLog(authority);

// Create poll
const poll = PollFactory.createRankedChoice(
  ['Alice', 'Bob', 'Charlie', 'Diana'],
  authority
);

// Record poll creation
auditLog.recordPollCreated(poll.id, {
  method: 'ranked-choice',
  choices: ['Alice', 'Bob', 'Charlie', 'Diana']
});

// Cast votes with audit trail
const encoder = new VoteEncoder(authority.votingPublicKey!);
const vote = encoder.encodeRankedChoice([0, 1, 2], 4); // Alice > Bob > Charlie
poll.vote(voter, vote);

// Record vote in audit log
const voterIdHash = new Uint8Array(
  await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id))
);
auditLog.recordVoteCast(poll.id, voterIdHash);

// Close and tally
poll.close();
const results = tallier.tally(poll);

// Record closure
auditLog.recordPollClosed(poll.id, {
  totalVotes: poll.getVoteCount(),
  winner: results.choices[results.winner!]
});

// Verify audit log integrity
console.log('Audit log valid:', auditLog.verifyChain());
```

### Approval Voting with Bulletin Board

```typescript
import { PublicBulletinBoard } from '@digitaldefiance/ecies-lib';

// Create bulletin board
const bulletinBoard = new PublicBulletinBoard(authority);

// Create poll
const poll = PollFactory.createApproval(
  ['TypeScript', 'Python', 'Rust', 'Go', 'Java'],
  authority
);

// Cast vote and publish to bulletin board
const encoder = new VoteEncoder(authority.votingPublicKey!);
const vote = encoder.encodeApproval([0, 2, 3], 5); // Approve TS, Rust, Go
poll.vote(voter, vote);

// Publish encrypted vote
const voterIdHash = new Uint8Array(
  await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id))
);
bulletinBoard.publishVote(poll.id, vote.encrypted, voterIdHash);

// Close and tally
poll.close();
const results = tallier.tally(poll);

// Publish tally
const allVotes = poll.getVotes().map(v => v.encrypted);
bulletinBoard.publishTally(poll.id, results.tallies, results.choices, allVotes);

// Verify bulletin board integrity
console.log('Bulletin board valid:', bulletinBoard.verifyMerkleTree());
```

## Security Considerations

### Cryptographic Security

**Paillier Encryption:**
- 3072-bit modulus for 128-bit security
- Miller-Rabin primality testing (256 rounds, error < 2^-512)
- Probabilistic encryption (different ciphertexts for same vote)

**ECDH-to-Paillier Bridge:**
- HKDF-based key derivation from ECDH keys
- Domain separation for voting purpose
- Deterministic recovery (same ECDH keys → same Paillier keys)

**Timing Attack Mitigation:**
- Constant-time operations where possible
- Fixed iteration count for prime generation
- Deterministic random bit generation (HMAC-DRBG)

### Privacy Guarantees

**Fully Secure Methods:**
- Votes remain encrypted until final tally
- Poll aggregator cannot decrypt individual votes
- Homomorphic addition preserves privacy

**Multi-Round Methods:**
- Intermediate decryption required between rounds
- Reduced privacy guarantees
- Suitable for elections where transparency is required

**Insecure Methods:**
- No privacy guarantees
- Use only for special cases (resource allocation, consensus)
- Clearly marked in API and documentation

### Best Practices

1. **Key Management:**
   - Store private keys securely (encrypted at rest)
   - Use separate PollTallier entity with private key
   - Rotate keys periodically (90-180 days)

2. **Receipt Verification:**
   - Always provide receipts to voters
   - Implement receipt verification UI
   - Store receipts for audit purposes

3. **Audit Logging:**
   - Use ImmutableAuditLog for all operations
   - Verify chain integrity regularly
   - Store audit logs permanently

4. **Bulletin Board:**
   - Publish all encrypted votes
   - Verify Merkle tree integrity
   - Enable public verification

5. **Security Validation:**
   - Use VotingSecurityValidator before deployment
   - Clearly communicate security level to users
   - Require explicit opt-in for insecure methods

## Testing

The voting system includes comprehensive test coverage:

- **900+ tests** in `voting.spec.ts`
- **Stress tests** with 1000+ voters
- **Property-based tests** for cryptographic properties
- **Cross-platform tests** (Node.js and browsers)
- **Security validation tests**
- **Government compliance tests**

Run tests:
```bash
npm test -- voting.spec.ts
npm test -- voting-stress.spec.ts
npm test -- poll-core.spec.ts
```

## Performance

**Typical Performance:**
- Vote encryption: <10ms per vote
- Vote aggregation: <1ms per vote (homomorphic addition)
- Tally decryption: <100ms for 1000 votes
- Receipt verification: <5ms per receipt

**Scalability:**
- Tested with 10,000+ voters
- Hierarchical aggregation for large-scale elections
- Batch processing support
- Memory-efficient streaming for large datasets

## Browser Compatibility

The voting system works in modern browsers with Web Crypto API support:

- Chrome 60+
- Firefox 57+
- Safari 11+
- Edge 79+

**Browser-Specific Notes:**
- Uses Web Crypto API for cryptographic operations
- IndexedDB for local storage (not localStorage)
- HTTPS required for Web Crypto API
- Content Security Policy considerations

## Related Documentation

- [VOTING_SECURITY_BEST_PRACTICES.md](./VOTING_SECURITY_BEST_PRACTICES.md) - Security guidelines
- [SECURITY_ANALYSIS_ECIES_PAILLIER_BRIDGE.md](./SECURITY_ANALYSIS_ECIES_PAILLIER_BRIDGE.md) - Cryptographic analysis
- [BrightChain Summary.md](./BrightChain%20Summary.md) - Overall system architecture
- [Quorum.md](./Quorum.md) - Quorum-based governance integration

## Future Enhancements

**Planned Features:**
- Threshold decryption (k-of-n guardians)
- Zero-knowledge proofs for vote validity
- Verifiable shuffle for anonymity
- Blockchain integration for immutability
- Mobile app support
- Hardware security module (HSM) integration

**Research Areas:**
- Post-quantum cryptography
- Formal verification of voting protocols
- Advanced anonymity techniques
- Scalability improvements for national elections

## License

MIT © Digital Defiance

## Support

For questions or issues:
- GitHub Issues: https://github.com/Digital-Defiance/BrightChain/issues
- Email: security@digitaldefiance.io
- Documentation: https://github.com/Digital-Defiance/BrightChain/tree/main/docs
