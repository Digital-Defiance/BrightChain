# BrightChain Energy Economy Protocol Specification

**Version:** 1.0.0  
**Status:** Draft  
**Date:** January 2026 
**Authors:** Jessica Mulein, BrightChain Contributors

## Abstract

This specification defines the BrightChain Energy Economy Protocol, a Joule-based energy tracking and economic model for decentralized storage, computation, and network operations. The protocol incentivizes resource contribution, penalizes bad actors through proof-of-work throttling, and creates a self-sustaining ecosystem where content value determines resource allocation.

## 1. Overview

### 1.1 Purpose

The Energy Economy Protocol provides:
- Universal energy unit (Joules) for all network operations
- Fair compensation for resource providers (storage, bandwidth, computation)
- Reputation-based proof-of-work throttling
- Content valuation through consumption metrics
- Automatic resource allocation based on utility

### 1.2 Design Principles

1. **Energy Conservation**: Track all energy flows, minimize waste
2. **Fair Compensation**: Contributors earn proportional to resources provided
3. **Utility-Based Pricing**: Popular content costs less to maintain
4. **Reputation Alignment**: Good actors work less, bad actors work more
5. **Self-Sustainability**: System maintains equilibrium through market forces

### 1.3 Key Concepts

- **Joule**: Base unit of energy for all operations
- **Energy Credit**: Stored Joules owned by a member
- **Energy Debt**: Joules owed for operations performed
- **Reputation Score**: Composite metric affecting PoW requirements
- **Content Valuation**: Utility score based on consumption patterns
- **Block Temperature**: Hot (frequently accessed) vs Cold (rarely accessed)

## 2. Energy Units and Measurements

### 2.1 Base Unit: Joule

All operations measured in Joules (J), the SI unit of energy.

```typescript
type Joules = number; // Always positive, measured in J
type JoulesPerSecond = number; // Power consumption rate
type JoulesPerByte = number; // Storage cost rate
```

### 2.2 Energy Conversion Factors

```typescript
const ENERGY_CONSTANTS = {
  // Computation costs (based on typical CPU operations)
  HASH_SHA3_512_PER_KB: 0.001,        // J per KB hashed
  ENCRYPT_AES_256_PER_KB: 0.002,      // J per KB encrypted
  SIGN_ECDSA_PER_OP: 0.005,           // J per signature
  VERIFY_ECDSA_PER_OP: 0.003,         // J per verification
  XOR_OPERATION_PER_KB: 0.0001,       // J per KB XOR'd
  
  // Storage costs (based on typical HDD/SSD power consumption)
  STORAGE_PER_GB_PER_DAY: 0.5,        // J per GB per day
  STORAGE_HOT_MULTIPLIER: 2.0,        // Hot storage costs 2x
  STORAGE_COLD_MULTIPLIER: 0.5,       // Cold storage costs 0.5x
  
  // Network costs (based on typical network equipment power)
  BANDWIDTH_PER_MB: 0.01,             // J per MB transferred
  LATENCY_PENALTY_PER_MS: 0.0001,     // J per ms over threshold
  
  // Redundancy costs
  REDUNDANCY_BASE_MULTIPLIER: 1.0,    // 1x for single copy
  REDUNDANCY_PER_COPY: 0.8,           // 0.8x per additional copy
  
  // Proof of Work
  POW_MIN_DIFFICULTY: 8,              // Minimum bits (best users)
  POW_MAX_DIFFICULTY: 24,             // Maximum bits (worst users)
  POW_JOULES_PER_BIT: 0.1,            // J per difficulty bit
};
```

### 2.3 Block Size Energy Costs

```typescript
enum BlockSize {
  Tiny = 1024,           // 1 KB
  Small = 8192,          // 8 KB
  Medium = 1048576,      // 1 MB
  Large = 134217728,     // 128 MB
  Huge = 1073741824,     // 1 GB
}

// Base storage cost per block size per day
const BLOCK_STORAGE_COSTS: Record<BlockSize, Joules> = {
  [BlockSize.Tiny]: 0.0005,
  [BlockSize.Small]: 0.004,
  [BlockSize.Medium]: 0.5,
  [BlockSize.Large]: 64,
  [BlockSize.Huge]: 512,
};
```

## 3. Operation Types and Costs

### 3.1 Operation Type Enumeration

```typescript
enum OperationType {
  // Block Operations
  BLOCK_STORE = 'BLOCK_STORE',
  BLOCK_RETRIEVE = 'BLOCK_RETRIEVE',
  BLOCK_DELETE = 'BLOCK_DELETE',
  BLOCK_VERIFY = 'BLOCK_VERIFY',
  
  // CBL Operations
  CBL_CREATE = 'CBL_CREATE',
  CBL_RETRIEVE = 'CBL_RETRIEVE',
  CBL_UPDATE = 'CBL_UPDATE',
  
  // Whitening Operations
  WHITEN_BLOCK = 'WHITEN_BLOCK',
  UNWHITEN_BLOCK = 'UNWHITEN_BLOCK',
  
  // Encryption Operations
  ENCRYPT_BLOCK = 'ENCRYPT_BLOCK',
  DECRYPT_BLOCK = 'DECRYPT_BLOCK',
  ENCRYPT_MULTI = 'ENCRYPT_MULTI',
  
  // Quorum Operations
  QUORUM_SEAL = 'QUORUM_SEAL',
  QUORUM_UNSEAL = 'QUORUM_UNSEAL',
  QUORUM_VOTE = 'QUORUM_VOTE',
  
  // Messaging Operations
  MESSAGE_SEND = 'MESSAGE_SEND',
  MESSAGE_FORWARD = 'MESSAGE_FORWARD',
  MESSAGE_BROADCAST = 'MESSAGE_BROADCAST',
  
  // Reputation Operations
  RATE_CONTENT = 'RATE_CONTENT',
  RATE_MEMBER = 'RATE_MEMBER',
  
  // Network Operations
  PEER_DISCOVERY = 'PEER_DISCOVERY',
  BLOCK_REPLICATION = 'BLOCK_REPLICATION',
  GOSSIP_PROPAGATION = 'GOSSIP_PROPAGATION',
}
```

### 3.2 Operation Cost Calculation

```typescript
interface OperationCost {
  computation: Joules;    // CPU/crypto operations
  storage: Joules;        // Disk space over time
  network: Joules;        // Bandwidth usage
  proofOfWork: Joules;    // PoW requirement based on reputation
  total: Joules;          // Sum of all costs
}

class EnergyCalculator {
  calculateOperationCost(
    operation: OperationType,
    dataSize: number,
    duration: number,
    redundancy: number,
    memberReputation: number
  ): OperationCost;
}
```

### 3.3 Example Cost Calculations

```typescript
// Store 1 MB block for 30 days with 3x redundancy
const storeCost = {
  computation: 0.002,     // Hashing + verification
  storage: 15.0,          // 0.5 J/GB/day * 1MB * 30 days * 3 copies
  network: 0.03,          // 0.01 J/MB * 3 copies
  proofOfWork: 0.8,       // Based on reputation
  total: 15.832
};

// Retrieve 1 MB block
const retrieveCost = {
  computation: 0.001,     // Verification only
  storage: 0,             // No storage cost
  network: 0.01,          // 0.01 J/MB
  proofOfWork: 0.8,       // Based on reputation
  total: 0.811
};

// Encrypt 1 MB block for 5 recipients
const encryptCost = {
  computation: 0.012,     // 0.002 J/KB * 1024 KB + 5 * ECIES overhead
  storage: 0,             // Encryption doesn't store
  network: 0,             // No network transfer
  proofOfWork: 0.8,       // Based on reputation
  total: 0.812
};
```

## 4. Energy Accounts and Transactions

### 4.1 Energy Account

```typescript
interface EnergyAccount {
  memberId: Checksum;
  balance: Joules;              // Current energy credits
  earned: Joules;               // Total earned (providing resources)
  spent: Joules;                // Total spent (consuming resources)
  reserved: Joules;             // Reserved for ongoing operations
  reputation: number;           // 0.0 to 1.0
  lastUpdated: Date;
}
```

### 4.2 Energy Transaction

```typescript
interface EnergyTransaction {
  id: Checksum;
  timestamp: Date;
  source: Checksum;             // Payer member ID
  destination: Checksum;        // Payee member ID (or network)
  amount: Joules;
  operationType: OperationType;
  blockId?: Checksum;           // Associated block if applicable
  metadata: {
    dataSize?: number;
    duration?: number;
    redundancy?: number;
    proofOfWork?: number;
  };
  signature: SignatureUint8Array;
}
```

### 4.3 Transaction Types

```typescript
enum TransactionType {
  PAYMENT,          // User pays for operation
  EARNING,          // Provider earns from serving
  REFUND,           // Unused credits returned
  PENALTY,          // Reputation penalty
  REWARD,           // Reputation reward
  TRANSFER,         // Member-to-member transfer
}
```

## 5. Storage Contracts

### 5.1 Storage Contract

```typescript
interface StorageContract {
  id: Checksum;
  blockId: Checksum;
  owner: Checksum;
  createdAt: Date;
  expiresAt: Date;
  maxExtensionDate?: Date;      // Statute of limitations
  
  // Storage parameters
  blockSize: BlockSize;
  redundancy: number;           // Number of copies
  durability: DurabilityLevel;  // Hot, Warm, Cold
  
  // Energy economics
  initialPayment: Joules;
  dailyCost: Joules;
  remainingCredits: Joules;
  autoRenew: boolean;
  
  // Usage tracking
  accessCount: number;
  lastAccessed: Date;
  utilityScore: number;         // 0.0 to 1.0
  
  // Providers
  providers: Map<Checksum, ProviderAllocation>;
}

interface ProviderAllocation {
  nodeId: Checksum;
  copyNumber: number;
  energyEarned: Joules;
  lastVerified: Date;
}
```

### 5.2 Durability Levels

```typescript
enum DurabilityLevel {
  HOT = 'HOT',       // SSD, low latency, 2x cost
  WARM = 'WARM',     // HDD, normal latency, 1x cost
  COLD = 'COLD',     // Archive, high latency, 0.5x cost
  FROZEN = 'FROZEN', // Tape/offline, very high latency, 0.25x cost
}

const DURABILITY_MULTIPLIERS: Record<DurabilityLevel, number> = {
  [DurabilityLevel.HOT]: 2.0,
  [DurabilityLevel.WARM]: 1.0,
  [DurabilityLevel.COLD]: 0.5,
  [DurabilityLevel.FROZEN]: 0.25,
};
```

### 5.3 Contract Lifecycle

```typescript
class StorageContractManager {
  // Create new storage contract
  async createContract(
    owner: Member,
    blockId: Checksum,
    duration: number,
    redundancy: number,
    durability: DurabilityLevel
  ): Promise<StorageContract>;
  
  // Extend existing contract
  async extendContract(
    contractId: Checksum,
    additionalDuration: number,
    payment: Joules
  ): Promise<StorageContract>;
  
  // Auto-extend based on utility
  async autoExtendContract(
    contractId: Checksum
  ): Promise<boolean>;
  
  // Expire contract and clean up
  async expireContract(
    contractId: Checksum
  ): Promise<void>;
  
  // Calculate remaining time
  calculateRemainingTime(
    contract: StorageContract
  ): number;
}
```

## 6. Reputation System

### 6.1 Reputation Score

```typescript
interface ReputationScore {
  memberId: Checksum;
  overall: number;              // 0.0 to 1.0
  
  // Component scores
  contentQuality: number;       // Based on consumption/ratings
  resourceContribution: number; // Storage/bandwidth provided
  networkBehavior: number;      // Uptime, reliability
  socialReputation: number;     // Ratings from other members
  
  // Violation tracking
  violations: number;
  lastViolation?: Date;
  violationSeverity: number;    // 0.0 to 1.0
  
  // Proof of Work difficulty
  powDifficulty: number;        // 8 to 24 bits
  
  lastUpdated: Date;
}
```

### 6.2 Reputation Calculation

```typescript
class ReputationCalculator {
  calculateOverallReputation(
    contentQuality: number,
    resourceContribution: number,
    networkBehavior: number,
    socialReputation: number,
    violations: number,
    violationSeverity: number
  ): number {
    // Weighted average with violation penalty
    const base = (
      contentQuality * 0.3 +
      resourceContribution * 0.3 +
      networkBehavior * 0.2 +
      socialReputation * 0.2
    );
    
    const violationPenalty = violations * violationSeverity * 0.1;
    return Math.max(0, Math.min(1, base - violationPenalty));
  }
  
  calculatePowDifficulty(reputation: number): number {
    // Linear interpolation between min and max difficulty
    const { POW_MIN_DIFFICULTY, POW_MAX_DIFFICULTY } = ENERGY_CONSTANTS;
    return Math.round(
      POW_MAX_DIFFICULTY - (reputation * (POW_MAX_DIFFICULTY - POW_MIN_DIFFICULTY))
    );
  }
}
```

### 6.3 Content Valuation

```typescript
interface ContentValuation {
  blockId: Checksum;
  utilityScore: number;         // 0.0 to 1.0
  
  // Usage metrics
  accessCount: number;
  uniqueAccessors: number;
  totalBandwidth: number;
  averageAccessInterval: number;
  
  // Ratings
  positiveRatings: number;
  negativeRatings: number;
  averageRating: number;
  
  // Economic impact
  energyGenerated: Joules;      // From access fees
  energyCost: Joules;           // Storage/bandwidth costs
  netValue: Joules;             // Generated - Cost
  
  lastAccessed: Date;
  createdAt: Date;
}

class ContentValuationCalculator {
  calculateUtilityScore(
    accessCount: number,
    uniqueAccessors: number,
    averageRating: number,
    ageInDays: number
  ): number {
    // Decay function with recency bias
    const accessScore = Math.log10(accessCount + 1) / 5;
    const uniquenessScore = Math.log10(uniqueAccessors + 1) / 4;
    const ratingScore = (averageRating + 5) / 10; // -5 to +5 scale
    const recencyScore = Math.exp(-ageInDays / 365);
    
    return (
      accessScore * 0.3 +
      uniquenessScore * 0.2 +
      ratingScore * 0.3 +
      recencyScore * 0.2
    );
  }
}
```

## 7. Proof of Work Throttling

### 7.1 PoW Requirements

```typescript
interface ProofOfWork {
  nonce: number;
  difficulty: number;           // Number of leading zero bits
  hash: Checksum;
  timestamp: Date;
  operationData: Uint8Array;
}

class ProofOfWorkValidator {
  // Calculate required difficulty based on reputation
  calculateDifficulty(reputation: number): number;
  
  // Verify PoW meets difficulty requirement
  verifyProofOfWork(
    pow: ProofOfWork,
    requiredDifficulty: number
  ): boolean;
  
  // Estimate energy cost of PoW
  estimateEnergyCost(difficulty: number): Joules;
}
```

### 7.2 Adaptive Difficulty

```typescript
class AdaptiveDifficultyManager {
  // Adjust difficulty based on behavior
  adjustDifficulty(
    memberId: Checksum,
    event: BehaviorEvent
  ): number;
  
  // Temporary difficulty increase for violations
  applyTemporaryPenalty(
    memberId: Checksum,
    duration: number,
    severity: number
  ): void;
  
  // Permanent difficulty increase for severe violations
  applyPermanentPenalty(
    memberId: Checksum,
    severity: number
  ): void;
}

enum BehaviorEvent {
  CONTENT_VIOLATION,
  SPAM_DETECTED,
  ABUSE_REPORTED,
  POSITIVE_RATING,
  RESOURCE_CONTRIBUTION,
  NETWORK_RELIABILITY,
}
```

## 8. Energy Distribution

### 8.1 Provider Earnings

```typescript
interface ProviderEarnings {
  nodeId: Checksum;
  period: { start: Date; end: Date };
  
  // Earnings by category
  storageEarnings: Joules;
  bandwidthEarnings: Joules;
  computeEarnings: Joules;
  
  // Costs
  operationalCosts: Joules;
  
  // Net
  netEarnings: Joules;
  
  // Performance metrics
  uptime: number;               // 0.0 to 1.0
  reliability: number;          // 0.0 to 1.0
  averageLatency: number;       // milliseconds
}

class EarningsCalculator {
  // Calculate storage earnings for a period
  calculateStorageEarnings(
    nodeId: Checksum,
    period: { start: Date; end: Date }
  ): Joules;
  
  // Calculate bandwidth earnings
  calculateBandwidthEarnings(
    nodeId: Checksum,
    bytesServed: number
  ): Joules;
  
  // Distribute earnings to providers
  distributeEarnings(
    contract: StorageContract,
    amount: Joules
  ): Map<Checksum, Joules>;
}
```

### 8.2 Revenue Sharing

```typescript
interface RevenueShare {
  // Content creator gets portion of access fees
  creatorShare: number;         // 0.4 (40%)
  
  // Storage providers split storage fees
  storageProviderShare: number; // 0.3 (30%)
  
  // Network operators split bandwidth fees
  networkProviderShare: number; // 0.2 (20%)
  
  // Network maintenance fund
  networkFundShare: number;     // 0.1 (10%)
}

const DEFAULT_REVENUE_SHARE: RevenueShare = {
  creatorShare: 0.4,
  storageProviderShare: 0.3,
  networkProviderShare: 0.2,
  networkFundShare: 0.1,
};
```

## 9. Auto-Extension and Utility

### 9.1 Auto-Extension Logic

```typescript
class AutoExtensionManager {
  // Check if block should be auto-extended
  shouldAutoExtend(
    contract: StorageContract,
    utilityScore: number
  ): boolean {
    // Auto-extend if:
    // 1. Utility score > threshold
    // 2. Within extension window
    // 3. Not past max extension date
    const UTILITY_THRESHOLD = 0.6;
    const EXTENSION_WINDOW_DAYS = 7;
    
    const daysUntilExpiry = this.calculateDaysUntilExpiry(contract);
    const withinWindow = daysUntilExpiry <= EXTENSION_WINDOW_DAYS;
    const highUtility = utilityScore >= UTILITY_THRESHOLD;
    const canExtend = !contract.maxExtensionDate || 
                     new Date() < contract.maxExtensionDate;
    
    return withinWindow && highUtility && canExtend;
  }
  
  // Calculate extension duration based on utility
  calculateExtensionDuration(
    utilityScore: number
  ): number {
    // Higher utility = longer extension
    const BASE_EXTENSION_DAYS = 30;
    const MAX_EXTENSION_DAYS = 365;
    
    return Math.round(
      BASE_EXTENSION_DAYS + 
      (utilityScore * (MAX_EXTENSION_DAYS - BASE_EXTENSION_DAYS))
    );
  }
  
  // Calculate extension cost with utility discount
  calculateExtensionCost(
    contract: StorageContract,
    duration: number,
    utilityScore: number
  ): Joules {
    const baseCost = contract.dailyCost * duration;
    const utilityDiscount = utilityScore * 0.5; // Up to 50% discount
    return baseCost * (1 - utilityDiscount);
  }
}
```

### 9.2 Utility-Based Pricing

```typescript
class UtilityPricingEngine {
  // Calculate dynamic price based on utility
  calculatePrice(
    operation: OperationType,
    dataSize: number,
    utilityScore: number
  ): Joules {
    const baseCost = this.calculateBaseCost(operation, dataSize);
    const utilityMultiplier = this.calculateUtilityMultiplier(utilityScore);
    return baseCost * utilityMultiplier;
  }
  
  // Utility multiplier: high utility = lower cost
  calculateUtilityMultiplier(utilityScore: number): number {
    // Range: 0.5x (high utility) to 2.0x (low utility)
    return 2.0 - (utilityScore * 1.5);
  }
}
```

## 10. Implementation Interfaces

### 10.1 Energy Service

```typescript
interface IEnergyService {
  // Account management
  getAccount(memberId: Checksum): Promise<EnergyAccount>;
  createAccount(memberId: Checksum): Promise<EnergyAccount>;
  updateBalance(memberId: Checksum, amount: Joules): Promise<void>;
  
  // Transaction management
  createTransaction(tx: EnergyTransaction): Promise<Checksum>;
  getTransaction(txId: Checksum): Promise<EnergyTransaction>;
  getTransactionHistory(memberId: Checksum): Promise<EnergyTransaction[]>;
  
  // Cost calculation
  calculateOperationCost(
    operation: OperationType,
    params: OperationParams
  ): Promise<OperationCost>;
  
  // Payment processing
  chargeForOperation(
    memberId: Checksum,
    operation: OperationType,
    params: OperationParams
  ): Promise<EnergyTransaction>;
  
  // Earnings distribution
  distributeEarnings(
    providers: Checksum[],
    amount: Joules
  ): Promise<Map<Checksum, Joules>>;
}
```

### 10.2 Storage Contract Service

```typescript
interface IStorageContractService {
  // Contract lifecycle
  createContract(params: ContractParams): Promise<StorageContract>;
  getContract(contractId: Checksum): Promise<StorageContract>;
  extendContract(contractId: Checksum, duration: number): Promise<void>;
  expireContract(contractId: Checksum): Promise<void>;
  
  // Auto-extension
  checkAutoExtension(contractId: Checksum): Promise<boolean>;
  processAutoExtensions(): Promise<number>;
  
  // Provider management
  assignProviders(contractId: Checksum, count: number): Promise<Checksum[]>;
  verifyProviders(contractId: Checksum): Promise<Map<Checksum, boolean>>;
  replaceProvider(contractId: Checksum, oldProvider: Checksum): Promise<Checksum>;
}
```

### 10.3 Reputation Service

```typescript
interface IReputationService {
  // Reputation management
  getReputation(memberId: Checksum): Promise<ReputationScore>;
  updateReputation(memberId: Checksum, event: BehaviorEvent): Promise<void>;
  
  // Content valuation
  getContentValuation(blockId: Checksum): Promise<ContentValuation>;
  updateContentValuation(blockId: Checksum, access: AccessEvent): Promise<void>;
  
  // PoW difficulty
  getPowDifficulty(memberId: Checksum): Promise<number>;
  verifyPow(memberId: Checksum, pow: ProofOfWork): Promise<boolean>;
}
```

## 11. Protocol Messages

### 11.1 Energy Transaction Message

```typescript
interface EnergyTransactionMessage {
  type: 'ENERGY_TRANSACTION';
  version: '1.0';
  transaction: EnergyTransaction;
  signature: SignatureUint8Array;
}
```

### 11.2 Storage Contract Message

```typescript
interface StorageContractMessage {
  type: 'STORAGE_CONTRACT';
  version: '1.0';
  action: 'CREATE' | 'EXTEND' | 'EXPIRE';
  contract: StorageContract;
  signature: SignatureUint8Array;
}
```

### 11.3 Reputation Update Message

```typescript
interface ReputationUpdateMessage {
  type: 'REPUTATION_UPDATE';
  version: '1.0';
  memberId: Checksum;
  event: BehaviorEvent;
  timestamp: Date;
  signature: SignatureUint8Array;
}
```

## 12. Security Considerations

### 12.1 Double-Spending Prevention

- All transactions signed by member
- Transaction IDs based on content hash
- Duplicate transactions rejected
- Account balance verified before charging

### 12.2 Sybil Attack Mitigation

- Identity verification required
- Reputation tied to real-world identity
- New accounts start with high PoW difficulty
- Resource contribution required for reputation

### 12.3 Gaming Prevention

- Utility scores use multiple metrics
- Access patterns analyzed for anomalies
- Self-access doesn't count toward utility
- Rating weights based on rater reputation

## 13. Migration Path

### Phase 1: Basic Energy Tracking
- Implement EnergyAccount and EnergyTransaction
- Add operation cost calculation
- Track energy flows without enforcement

### Phase 2: Storage Contracts
- Implement StorageContract
- Add contract lifecycle management
- Enable basic payment for storage

### Phase 3: Reputation System
- Implement ReputationScore
- Add PoW difficulty adjustment
- Enable reputation-based throttling

### Phase 4: Utility-Based Pricing
- Implement ContentValuation
- Add auto-extension logic
- Enable dynamic pricing

### Phase 5: Full Economic Model
- Complete provider earnings
- Add revenue sharing
- Enable market equilibrium

## 14. Future Enhancements

- **Energy Futures**: Pre-purchase energy at fixed rates
- **Energy Lending**: Lend energy credits with interest
- **Energy Derivatives**: Options and swaps for risk management
- **Dynamic Pricing**: Real-time market-based pricing
- **Energy Pools**: Shared energy accounts for organizations
- **Carbon Credits**: Tie to renewable energy sources

## 15. References

- BrightChain Writeup: Core concepts and vision
- BrightChain Summary: System overview
- OFF System: Original whitening concept
- Ethereum Gas Model: Inspiration for operation costs
- Filecoin Economics: Storage market design
