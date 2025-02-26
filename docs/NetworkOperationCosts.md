# Network Operation Costs

## Overview

To prevent abuse and ensure network sustainability, operations in the BrightChain network have associated costs measured in Joules. Users must maintain a positive energy balance by contributing more resources than they consume.

## Operation Costs

### Network Operations

```typescript
interface NetworkOperationCost {
  // Base costs for different operations
  costs: {
    // Node Operations
    nodeAnnouncement: number; // Cost to announce node presence
    nodeUpdate: number; // Cost to update node status
    nodeSearch: number; // Cost to search for nodes

    // Block Operations
    blockSearch: number; // Cost to search for blocks
    blockLocationUpdate: number; // Cost to update block location
    blockTemperatureUpdate: number; // Cost to update block temperature

    // Metadata Operations
    metadataSync: number; // Cost to sync metadata
    metadataQuery: number; // Cost to query metadata
  };

  // Multipliers based on operation characteristics
  multipliers: {
    broadcastMultiplier: number; // For network-wide operations
    priorityMultiplier: number; // For urgent operations
    complexityMultiplier: number; // Based on operation complexity
  };
}
```

### Search Operations

```typescript
interface SearchCost {
  // Base cost for search
  baseCost: number;

  // Additional costs
  perNodeCost: number; // Cost per node queried
  timeoutCost: number; // Cost for extended search time
  resultsCost: number; // Cost per result returned

  // Cost calculation
  calculateCost(params: {
    nodeCount: number;
    timeout: number;
    expectedResults: number;
  }): number;
}

interface SearchLimits {
  maxNodes: number; // Maximum nodes to query
  maxTimeout: number; // Maximum search time
  maxResults: number; // Maximum results to return
  maxConcurrent: number; // Maximum concurrent searches
}
```

### Update Operations

```typescript
interface UpdateCost {
  // Base costs
  locationUpdate: number; // Cost to update location
  temperatureUpdate: number; // Cost to update temperature
  metadataUpdate: number; // Cost to update metadata

  // Batch operations
  batchDiscount: number; // Discount for batch updates
  maxBatchSize: number; // Maximum updates per batch

  // Priority levels
  priority: {
    low: number; // Multiplier for low priority
    normal: number; // Multiplier for normal priority
    high: number; // Multiplier for high priority
    urgent: number; // Multiplier for urgent priority
  };
}
```

## Credit System

### Credit Earning

```typescript
interface CreditEarning {
  // Storage contribution
  storage: {
    baseRate: number; // Base rate per GB
    reliabilityMultiplier: number; // Based on node reliability
    uptimeMultiplier: number; // Based on node uptime
  };

  // Network contribution
  network: {
    baseRate: number; // Base rate per operation
    bandwidthMultiplier: number; // Based on bandwidth provided
    latencyMultiplier: number; // Based on response time
  };

  // Geographic contribution
  geographic: {
    baseRate: number; // Base rate for location
    diversityMultiplier: number; // Based on geographic diversity
    regionDemandMultiplier: number; // Based on region demand
  };
}
```

### Credit Management

```typescript
interface CreditBalance {
  // Current balance
  available: number; // Available credits
  reserved: number; // Credits reserved for operations
  pending: number; // Credits pending from contributions

  // Limits
  maxBalance: number; // Maximum credit balance
  minBalance: number; // Minimum required balance

  // History
  transactions: {
    timestamp: Date;
    amount: number;
    type: 'EARN' | 'SPEND';
    operation: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
  }[];
}
```

## Implementation

### Cost Calculation

```typescript
interface CostCalculator {
  // Calculate operation cost
  calculateCost(
    operation: string,
    params: {
      size?: number;
      priority?: string;
      complexity?: number;
      nodes?: number;
    },
  ): number;

  // Apply discounts
  applyDiscounts(
    baseCost: number,
    discounts: {
      type: string;
      amount: number;
    }[],
  ): number;

  // Validate operation
  validateOperation(
    operation: string,
    availableCredits: number,
    cost: number,
  ): boolean;
}
```

### Credit Tracking

```typescript
interface CreditTracker {
  // Track credit changes
  updateBalance(
    nodeId: string,
    amount: number,
    type: 'EARN' | 'SPEND',
    operation: string,
  ): Promise<void>;

  // Reserve credits
  reserveCredits(
    nodeId: string,
    amount: number,
    operation: string,
  ): Promise<boolean>;

  // Release reserved credits
  releaseCredits(
    nodeId: string,
    amount: number,
    operation: string,
  ): Promise<void>;
}
```

## Example Cost Calculations

1. Block Search

```typescript
const searchCost =
  baseSearchCost +
  nodesQueried * perNodeCost +
  searchTime * timeCost +
  resultsFound * resultsCost;
```

2. Batch Update

```typescript
const batchCost =
  updates.length * baseUpdateCost * (1 - batchDiscount) * priorityMultiplier;
```

3. Node Announcement

```typescript
const announcementCost =
  baseAnnouncementCost + broadcastNodes * perNodeCost * reliabilityMultiplier;
```

## Considerations

1. Balance

- Costs must be high enough to prevent abuse
- Low enough to encourage participation
- Scale with network size and usage

2. Fairness

- New nodes should be able to join
- Costs should reflect resource usage
- Rewards should reflect contribution

3. Flexibility

- Costs should be adjustable
- Support for different priorities
- Allow for future changes

Would you like to proceed with implementing the Express/Socket.io setup with these cost considerations in mind?
