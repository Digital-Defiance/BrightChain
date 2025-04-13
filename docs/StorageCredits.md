# Storage Credits System in BrightChain

## Overview

The BrightChain Storage Credits system uses energy credits (measured in Joules) to manage and allocate storage resources across the network. This system ensures fair resource utilization and provides a mechanism for implementing digital statute of limitations through expiration dates.

## Credit System

### Credit Measurement

- Base unit: Joule (J)
- Represents energy cost of storage
- Accounts for:
  - Physical storage space
  - Duration of storage
  - Redundancy level
  - Network overhead
  - Processing costs

### Credit Allocation

```typescript
interface StorageCredit {
  amount: number; // Joules
  expirationDate: Date; // When credits expire if unused
  source: string; // How credits were obtained
  restrictions?: {
    minDuration?: number; // Minimum storage duration
    maxDuration?: number; // Maximum storage duration
    maxRedundancy?: number; // Maximum redundancy level
  };
}

interface StorageCost {
  baseStorage: number; // Base storage cost in Joules
  duration: number; // Duration multiplier
  redundancy: number; // Redundancy multiplier
  overhead: number; // Network overhead cost
  total: number; // Total cost in Joules
}
```

## Storage Parameters

### Duration Management

```typescript
interface DurationConfig {
  minimumDuration: number; // Minimum storage period
  maximumDuration: number; // Maximum storage period (statute of limitations)
  extensionCost: number; // Cost multiplier for extending storage
  gracePeriod: number; // Time before deletion after expiration
}
```

### Redundancy Levels

```typescript
interface RedundancyConfig {
  minimumCopies: number; // Minimum required copies
  maximumCopies: number; // Maximum allowed copies
  costPerCopy: number; // Additional cost per copy
  geographicSpread: boolean; // Whether copies must be geographically distributed
}
```

## Cost Calculation

### Base Formula

```typescript
interface CostCalculation {
  calculateStorageCost(
    sizeBytes: number,
    durationDays: number,
    redundancyLevel: number,
  ): number {
    const baseCost = sizeBytes * BASE_STORAGE_COST;
    const durationCost = baseCost * (durationDays / 365);
    const redundancyCost = baseCost * (redundancyLevel - 1);
    const overhead = calculateOverhead(sizeBytes, redundancyLevel);

    return baseCost + durationCost + redundancyCost + overhead;
  }
}
```

### Modifiers

- Geographic distribution multiplier
- Priority level multiplier
- Network congestion multiplier
- Time-of-day multiplier

## Storage Extension

### Extension Rules

1. Must be requested before expiration
2. Requires available credits
3. Cannot exceed maximum duration
4. May require quorum approval for sensitive data

### Extension Process

```typescript
interface StorageExtension {
  documentId: Buffer;
  currentExpiration: Date;
  requestedExtension: Date;
  creditCost: number;
  approvalRequired: boolean;
  approvalStatus?: {
    approved: boolean;
    votes: Map<GuidV4, boolean>;
    requiredVotes: number;
  };
}
```

## Credit Management

### Credit Sources

1. Direct allocation
2. Computation contribution
3. Storage contribution
4. Network contribution

### Credit Expiration

- Credits have their own expiration dates
- Expired credits are removed from the system
- Cannot use expired credits for storage extension
- Grace period for credit renewal

## Implementation

### Storage Contract

```typescript
interface StorageContract {
  documentId: Buffer;
  owner: Member;
  storageMetadata: {
    size: number;
    redundancy: number;
    expirationDate: Date;
    maxExtensionDate?: Date;
  };
  creditAllocation: {
    initial: number;
    remaining: number;
    lastUpdated: Date;
  };
  extensions: StorageExtension[];
}
```

### Credit Tracking

```typescript
interface CreditLedger {
  memberId: GuidV4;
  balance: number;
  transactions: {
    timestamp: Date;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    reason: string;
  }[];
  pendingTransactions: Map<string, number>;
}
```

## Monitoring and Metrics

### System Metrics

- Total system storage used
- Average redundancy level
- Credit circulation
- Extension frequency
- Expiration compliance

### Member Metrics

- Credit balance
- Storage usage
- Extension patterns
- Contribution history

## Future Considerations

1. Dynamic Pricing

   - Market-based credit pricing
   - Demand-based cost adjustment
   - Geographic price variation

2. Credit Trading

   - Member-to-member credit transfer
   - Credit marketplace
   - Trading restrictions

3. Incentive Programs

   - Early renewal discounts
   - Long-term storage benefits
   - Contribution rewards

4. Automation
   - Automatic credit allocation
   - Smart contract integration
   - Predictive extension

## Implementation Priorities

1. Core Credit System

   - Credit calculation
   - Basic allocation
   - Expiration handling

2. Storage Management

   - Duration tracking
   - Extension processing
   - Redundancy management

3. Monitoring System

   - Usage tracking
   - Credit accounting
   - System metrics

4. Advanced Features
   - Dynamic pricing
   - Trading system
   - Incentive programs
