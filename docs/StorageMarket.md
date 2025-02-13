# BrightChain Storage Market

## Overview

BrightChain implements a dynamic market system for data storage, where storage costs and rewards are determined by various factors including geographic distribution, access patterns, and data type. This creates an efficient marketplace where storage resources are allocated based on actual value and usage.

## Market Dynamics

### Storage Pricing

```typescript
interface StorageOffer {
  blockId: Buffer;
  maxPayment: number; // Maximum Joules willing to pay
  minReliability: number; // Minimum required reliability
  preferences: {
    geographicSpread: boolean;
    minNodes: number;
    accessPattern: 'HOT' | 'WARM' | 'COLD';
    encrypted: boolean;
  };
  deadline: Date; // Offer expiration
}

interface StorageBid {
  nodeId: GuidV4;
  blockId: Buffer;
  price: number; // Joules requested
  reliability: number; // Node's reliability score
  location: {
    region: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  capabilities: {
    bandwidth: number;
    uptime: number;
    storageClass: 'SSD' | 'HDD' | 'TAPE';
  };
}
```

### Price Modifiers

```typescript
interface PriceModifiers {
  geographic: {
    spreadMultiplier: number; // Bonus for geographic diversity
    regionDemand: Map<string, number>; // Region-specific demand multiplier
  };
  access: {
    hotAccessMultiplier: number; // Frequently accessed data
    warmAccessMultiplier: number; // Occasionally accessed data
    coldAccessMultiplier: number; // Rarely accessed data
  };
  encryption: {
    encryptedMultiplier: number; // Premium for encrypted data
  };
  reliability: {
    uptimeMultiplier: number; // Based on node uptime
    historyMultiplier: number; // Based on node history
  };
}
```

## Block Distribution

### Block Location Tracking

```typescript
interface BlockLocation {
  blockId: Buffer;
  nodes: Map<
    GuidV4,
    {
      reliability: number;
      lastVerified: Date;
      storagePrice: number;
      accessCount: number;
      location: {
        region: string;
        coordinates?: {
          latitude: number;
          longitude: number;
        };
      };
    }
  >;
  desiredCopies: number;
  minimumCopies: number;
  spreadFactor: number; // Geographic spread requirement
}

interface NodeBlockIndex {
  version: number;
  lastUpdate: Date;
  blocks: Map<string, BlockLocation>;
  indexKeepers: GuidV4[]; // Nodes maintaining this index
  updateHistory: {
    timestamp: Date;
    changes: {
      added: BlockLocation[];
      removed: BlockLocation[];
      modified: BlockLocation[];
    };
  }[];
}
```

### Geographic Distribution

```typescript
interface GeographicStrategy {
  minDistance: number; // Minimum distance between copies (km)
  regionWeights: Map<string, number>;
  spreadCalculator: (locations: Location[]) => number;
  optimizeSpread: (current: Location[], candidates: Location[]) => Location[];
}
```

## Access Patterns

### Data Temperature

```typescript
enum DataTemperature {
  HOT, // Frequently accessed
  WARM, // Occasionally accessed
  COLD, // Rarely accessed
  FROZEN, // Archive/backup only
}

interface AccessMetrics {
  blockId: Buffer;
  temperature: DataTemperature;
  metrics: {
    readCount: number;
    lastAccess: Date;
    accessPattern: {
      hourly: number[]; // Access count per hour
      daily: number[]; // Access count per day
      monthly: number[]; // Access count per month
    };
    bandwidth: {
      total: number;
      average: number;
      peak: number;
    };
  };
}
```

## Node Reliability

### Reliability Scoring

```typescript
interface ReliabilityMetrics {
  nodeId: GuidV4;
  uptime: {
    total: number;
    last30Days: number;
    last24Hours: number;
  };
  shutdowns: {
    graceful: number;
    emergency: number;
    averageNoticeTime: number;
  };
  replication: {
    successful: number;
    failed: number;
    averageTime: number;
  };
  storage: {
    totalBlocks: number;
    hotBlocks: number;
    warmBlocks: number;
    coldBlocks: number;
  };
}

interface ReliabilityScore {
  calculate(metrics: ReliabilityMetrics): number;
  getMinimumViableScore(): number;
  getPenalties(metrics: ReliabilityMetrics): Map<string, number>;
  getBonuses(metrics: ReliabilityMetrics): Map<string, number>;
}
```

## Market Operations

### Block Placement

1. Initial Storage

   - Creator sets maximum payment
   - System calculates optimal distribution
   - Nodes bid for storage rights
   - Selection based on price, location, reliability

2. Replication

   - Triggered by node shutdown or reliability changes
   - Priority based on:
     - Remaining copies
     - Access temperature
     - Geographic distribution
     - Storage credits allocated

3. Migration
   - Moving data to better-suited nodes
   - Triggered by:
     - Change in access patterns
     - Better price offerings
     - Improved geographic distribution
     - Node reliability changes

### Credit Distribution

```typescript
interface CreditAllocation {
  calculateNodeCredit(
    blockId: Buffer,
    nodeId: GuidV4,
    metrics: {
      storage: number;
      bandwidth: number;
      reliability: number;
      geography: number;
    },
  ): number;
}
```

## Open Questions

1. Price Discovery

   - How to determine initial market price?
   - How to handle price volatility?
   - Should there be price floors/ceilings?

2. Geographic Verification

   - How to verify node locations?
   - How to prevent location spoofing?
   - What granularity of location data is needed?

3. Access Pattern Detection

   - How to measure "hotness" of data?
   - How to predict future access patterns?
   - How to handle seasonal patterns?

4. Reliability Metrics
   - What's the minimum acceptable reliability?
   - How to weight different reliability factors?
   - How to handle new nodes without history?

## Implementation Priorities

1. Core Market Mechanics

   - Offer/bid system
   - Price calculation
   - Credit distribution

2. Geographic System

   - Location verification
   - Spread calculation
   - Distribution optimization

3. Access Tracking

   - Usage monitoring
   - Pattern detection
   - Temperature calculation

4. Reliability System
   - Score calculation
   - History tracking
   - Penalty/bonus system

Would you like to discuss any of these aspects in more detail?
