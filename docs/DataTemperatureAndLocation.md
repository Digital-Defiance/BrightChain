# Data Temperature and Location Management

## Data Temperature Classification

### Temperature Levels

```typescript
enum DataTemperature {
  FROZEN, // Archive data, rarely if ever accessed
  COLD, // Accessed quarterly or less
  COOL, // Accessed monthly
  WARM, // Accessed weekly
  HOT, // Accessed daily
  VIRAL, // Constant high-volume access
}

interface TemperatureThresholds {
  // Access counts per time period
  viral: {
    hourlyAccess: number; // e.g., >1000 per hour
    concurrentUsers: number; // e.g., >100 simultaneous
  };
  hot: {
    dailyAccess: number; // e.g., >100 per day
    weeklyAccess: number; // e.g., >500 per week
  };
  warm: {
    weeklyAccess: number; // e.g., >50 per week
    monthlyAccess: number; // e.g., >100 per month
  };
  cool: {
    monthlyAccess: number; // e.g., >10 per month
    quarterlyAccess: number; // e.g., >20 per quarter
  };
  cold: {
    quarterlyAccess: number; // e.g., <=20 per quarter
    yearlyAccess: number; // e.g., >0 per year
  };
  frozen: {
    yearlyAccess: number; // e.g., 0 per year
    retentionRequired: boolean;
  };
}
```

### Temperature Calculation

```typescript
interface AccessPattern {
  blockId: Buffer;
  timeWindows: {
    hourly: number[]; // Last 24 hours
    daily: number[]; // Last 30 days
    weekly: number[]; // Last 12 weeks
    monthly: number[]; // Last 12 months
  };
  weightedScore: number; // Calculated temperature score
  currentTemperature: DataTemperature;
  temperatureHistory: {
    temperature: DataTemperature;
    timestamp: Date;
    duration: number; // How long at this temperature
  }[];
}

interface TemperatureCalculator {
  // Configurable weights for different time periods
  weights: {
    hourly: number; // e.g., 0.4
    daily: number; // e.g., 0.3
    weekly: number; // e.g., 0.2
    monthly: number; // e.g., 0.1
  };

  // Methods
  calculateScore(pattern: AccessPattern): number;
  determineTemperature(score: number): DataTemperature;
  predictNextTemperature(pattern: AccessPattern): DataTemperature;
}
```

### Temperature Transitions

```typescript
interface TemperatureTransition {
  from: DataTemperature;
  to: DataTemperature;
  requiredDuration: number; // Time needed at new access level
  cooldownPeriod: number; // Time before next transition
  replicationChanges: {
    minCopies: number;
    targetCopies: number;
    geographicSpread: number;
  };
}

interface TemperaturePolicy {
  transitions: TemperatureTransition[];
  minimumTransitionTime: number;
  maximumTransitionsPerDay: number;
  hysteresisThreshold: number; // Prevent rapid oscillation
}
```

## Geographic Location Management

### Location Verification

```typescript
interface LocationInfo {
  postalCode: string;
  region: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  verificationMethods: VerificationMethod[];
  lastVerified: Date;
  confidence: number; // 0-1 confidence score
}

enum VerificationMethod {
  OPERATOR_PROVIDED, // Operator input at startup
  IP_GEOLOCATION, // IP-based verification
  LATENCY_TRIANGULATION, // Network latency-based
  THIRD_PARTY, // External verification service
}

interface LocationVerifier {
  verifyLocation(info: LocationInfo): Promise<{
    verified: boolean;
    confidence: number;
    methods: VerificationMethod[];
    details: {
      ipLocation?: string;
      latencyResults?: Map<string, number>;
      thirdPartyVerification?: any;
    };
  }>;
}
```

### Proof of Location

The system uses multiple methods to verify node locations while maintaining privacy:

1. Primary: Operator-Provided

   - Postal code/zip code input at startup
   - Region and country information
   - Optional coordinate information

2. Secondary: IP Geolocation

   - Used as fallback verification
   - Cross-referenced with provided location
   - Periodic re-verification

3. Tertiary: Latency Triangulation

```typescript
interface LatencyProof {
  nodeId: GuidV4;
  measurements: {
    timestamp: Date;
    peers: Map<
      GuidV4,
      {
        latency: number; // Round-trip time
        samples: number[]; // Individual measurements
        jitter: number; // Latency variation
      }
    >;
    triangulation: {
      estimatedRegion: string;
      confidence: number;
      margin: number; // Error margin in km
    };
  };
}
```

### Geographic Distribution

```typescript
interface GeographicDistribution {
  regions: Map<
    string,
    {
      nodeCount: number;
      totalStorage: number;
      availableStorage: number;
      averageLatency: number;
      reliability: number;
    }
  >;

  spreadMetrics: {
    entropy: number; // Distribution evenness
    coverage: number; // Geographic coverage
    redundancy: number; // Cross-region redundancy
  };
}

interface SpreadCalculator {
  calculateSpread(nodes: Map<GuidV4, LocationInfo>): number;
  optimizeDistribution(
    current: LocationInfo[],
    candidates: LocationInfo[],
  ): LocationInfo[];
  calculateRedundancy(distribution: GeographicDistribution): number;
}
```

## Implementation Considerations

### Temperature Management

1. Monitoring System

   - Real-time access tracking
   - Pattern recognition
   - Trend analysis
   - Prediction modeling

2. Transition Management

   - Smooth temperature changes
   - Resource allocation
   - Replication adjustment
   - Cost optimization

3. Storage Optimization
   - Temperature-based placement
   - Geographic distribution
   - Access latency
   - Cost efficiency

### Location System

1. Privacy Considerations

   - Minimal location precision
   - Data aggregation
   - Anonymous verification
   - Opt-in detailed location

2. Verification Process

   - Multiple verification methods
   - Confidence scoring
   - Periodic re-verification
   - Failure handling

3. Distribution Strategy
   - Regional balance
   - Cost optimization
   - Performance optimization
   - Redundancy management

## Open Questions

1. Temperature Mechanics

   - Should we implement sub-levels within each temperature?
   - How to handle seasonal patterns?
   - Should we have different thresholds for different data types?

2. Location Verification

   - What's the minimum acceptable confidence score?
   - How often should we re-verify locations?
   - How to handle VPN/proxy scenarios?

3. Distribution Strategy
   - What's the optimal balance between spread and cost?
   - How to handle region-specific requirements?
   - Should we implement region-specific pricing?

Would you like to discuss any of these aspects in more detail?
