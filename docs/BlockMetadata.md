# Block Metadata Management

## Overview

Each block in the system needs associated metadata to track its temperature (access patterns), location (which nodes have copies), and other essential information. This metadata needs to be efficiently stored and quickly accessible.

## Block Metadata Structure

### Core Metadata

```typescript
interface BlockMetadata {
  blockId: Buffer;
  version: number;
  created: Date;
  lastAccessed: Date;
  size: number;

  // Temperature tracking
  temperature: {
    current: DataTemperature;
    lastChange: Date;
    accessCounts: {
      lastHour: number;
      lastDay: number;
      lastWeek: number;
      lastMonth: number;
    };
  };

  // Location tracking
  copies: {
    current: number;
    target: number;
    minimum: number;
    locations: Map<
      GuidV4,
      {
        nodeId: GuidV4;
        region: string;
        lastVerified: Date;
        status: BlockStatusType;
      }
    >;
  };

  // Storage requirements
  requirements: {
    minRedundancy: number;
    geographicSpread: boolean;
    expirationDate?: Date;
    retentionRequired: boolean;
  };
}
```

### Metadata Storage

1. Local Storage

```typescript
interface LocalMetadataStore {
  // Store metadata alongside block
  path: string; // e.g., "block_path.metadata.json"
  format: 'JSON' | 'BSON'; // Storage format

  // Methods
  read(): Promise<BlockMetadata>;
  write(metadata: BlockMetadata): Promise<void>;
  update(partial: Partial<BlockMetadata>): Promise<void>;
}
```

2. Network Index

```typescript
interface NetworkMetadataIndex {
  // Distributed index of metadata
  version: number;
  entries: Map<
    Buffer,
    {
      metadata: BlockMetadata;
      lastUpdate: Date;
      updateNode: GuidV4;
    }
  >;

  // Methods
  query(blockId: Buffer): Promise<BlockMetadata>;
  update(blockId: Buffer, metadata: BlockMetadata): Promise<void>;
  sync(otherNode: GuidV4): Promise<void>;
}
```

## Implementation

### File Structure

```
/blocks/
  ├── [block_size]/
  │   ├── [prefix1]/
  │   │   ├── [prefix2]/
  │   │   │   ├── [block_id]
  │   │   │   └── [block_id].metadata.json
  │   │   └── ...
  │   └── ...
  └── ...
```

### Access Tracking

```typescript
interface AccessTracker {
  // Track block access
  recordAccess(blockId: Buffer, type: 'READ' | 'WRITE'): void;

  // Update temperature based on access patterns
  updateTemperature(blockId: Buffer): Promise<DataTemperature>;

  // Batch processing
  processAccessLogs(): Promise<void>;
}

// Simple starting thresholds
const DEFAULT_THRESHOLDS = {
  viral: {
    hourlyAccess: 1000, // Very high traffic
    concurrentUsers: 100,
  },
  hot: {
    dailyAccess: 100, // Regular daily access
    weeklyAccess: 500,
  },
  warm: {
    weeklyAccess: 50, // Weekly access
    monthlyAccess: 100,
  },
  cool: {
    monthlyAccess: 10, // Monthly access
    quarterlyAccess: 20,
  },
  cold: {
    quarterlyAccess: 20, // Rare access
    yearlyAccess: 1,
  },
  frozen: {
    yearlyAccess: 0, // No access
  },
};
```

### Location Management

```typescript
interface LocationManager {
  // Track block locations
  addLocation(blockId: Buffer, nodeId: GuidV4, region: string): Promise<void>;
  removeLocation(blockId: Buffer, nodeId: GuidV4): Promise<void>;

  // Verify block availability
  verifyLocations(blockId: Buffer): Promise<Map<GuidV4, boolean>>;

  // Find optimal nodes for replication
  findReplicationTargets(
    blockId: Buffer,
    count: number,
    preferences: {
      regions?: string[];
      minDistance?: number;
      excludeNodes?: GuidV4[];
    },
  ): Promise<GuidV4[]>;
}
```

### Metadata Synchronization

```typescript
interface MetadataSync {
  // Sync metadata with other nodes
  syncInterval: number; // e.g., 5 minutes
  batchSize: number; // e.g., 1000 entries

  // Methods
  startSync(): void;
  stopSync(): void;
  forceSyncBlock(blockId: Buffer): Promise<void>;
}
```

## Starting Implementation

For a proof of concept, we can start with:

1. Simple File-Based Storage

- Store metadata in JSON files
- One metadata file per block
- Basic file system operations

2. Basic Temperature Tracking

- Track access counts in time windows
- Use simple thresholds for temperature changes
- Store counts in metadata file

3. Location Tracking

- Track which nodes have copies
- Basic region information
- Last verification time

4. Periodic Updates

- Update metadata on access
- Periodic temperature recalculation
- Basic location verification

## Next Steps

1. Implement Basic Structure

- Create metadata file structure
- Implement read/write operations
- Set up access tracking

2. Add Temperature Management

- Implement access counting
- Add temperature calculation
- Set up periodic updates

3. Add Location Tracking

- Track block copies
- Implement verification
- Add replication management

4. Add Synchronization

- Basic node synchronization
- Conflict resolution
- Periodic sync jobs

Would you like to start implementing any of these components?
