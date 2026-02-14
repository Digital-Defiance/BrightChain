import fc from 'fast-check';
import { PoolId } from '../storage/pooledBlockStore';
import {
  ILocationRecord,
  locationRecordFromJSON,
  locationRecordToJSON,
} from './locationRecord';

/**
 * Property tests for ILocationRecord poolId round-trip serialization
 *
 * **Validates: Requirements 5.4**
 *
 * Property 12: Location record poolId round-trip serialization
 * For any ILocationRecord with a valid poolId, serializing via locationRecordToJSON
 * and deserializing via locationRecordFromJSON produces a record with the same poolId value.
 * Records without poolId also round-trip correctly (backward compat).
 */
describe('Feature: cross-node-pool-coordination, Property 12: Location record poolId round-trip serialization', () => {
  // --- Smart Generators ---

  /** Generates a valid pool ID matching /^[a-zA-Z0-9_-]{1,64}$/ */
  const validPoolIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

  /** Generates a non-empty string suitable for node IDs */
  const nodeIdArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid Date (avoiding edge cases that break ISO serialization) */
  const validDateArb = fc
    .date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') })
    .filter((d) => !isNaN(d.getTime()));

  /** Generates a valid optional latencyMs (non-negative number) */
  const latencyMsArb = fc.option(
    fc.double({ min: 0, max: 100000, noNaN: true }),
    { nil: undefined },
  );

  /** Generates a full ILocationRecord with a valid poolId */
  const locationRecordWithPoolIdArb: fc.Arbitrary<ILocationRecord> = fc.record({
    nodeId: nodeIdArb,
    lastSeen: validDateArb,
    isAuthoritative: fc.boolean(),
    latencyMs: latencyMsArb,
    poolId: validPoolIdArb,
  });

  /** Generates a full ILocationRecord without poolId */
  const locationRecordWithoutPoolIdArb: fc.Arbitrary<ILocationRecord> =
    fc.record({
      nodeId: nodeIdArb,
      lastSeen: validDateArb,
      isAuthoritative: fc.boolean(),
      latencyMs: latencyMsArb,
    });

  /** Generates a full ILocationRecord with optional poolId (either present or absent) */
  const locationRecordArb: fc.Arbitrary<ILocationRecord> = fc.oneof(
    locationRecordWithPoolIdArb,
    locationRecordWithoutPoolIdArb,
  );

  // --- Property Tests ---

  /**
   * Property 12a: Records with a valid poolId round-trip with the same poolId.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 12a: records with valid poolId preserve poolId through round-trip serialization', () => {
    fc.assert(
      fc.property(locationRecordWithPoolIdArb, (record) => {
        const serialized = locationRecordToJSON(record);
        const deserialized = locationRecordFromJSON(serialized);

        expect(deserialized.poolId).toBe(record.poolId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12b: Records without poolId round-trip with poolId remaining undefined.
   * This ensures backward compatibility — records created before pool support
   * continue to serialize/deserialize correctly.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 12b: records without poolId round-trip with poolId remaining undefined', () => {
    fc.assert(
      fc.property(locationRecordWithoutPoolIdArb, (record) => {
        const serialized = locationRecordToJSON(record);
        const deserialized = locationRecordFromJSON(serialized);

        expect(deserialized.poolId).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12c: All fields of a location record are preserved through round-trip,
   * not just poolId. This validates the full structural integrity of the serialization.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 12c: all location record fields are preserved through round-trip serialization', () => {
    fc.assert(
      fc.property(locationRecordArb, (record) => {
        const serialized = locationRecordToJSON(record);
        const deserialized = locationRecordFromJSON(serialized);

        expect(deserialized.nodeId).toBe(record.nodeId);
        expect(deserialized.lastSeen.toISOString()).toBe(
          record.lastSeen.toISOString(),
        );
        expect(deserialized.isAuthoritative).toBe(record.isAuthoritative);
        expect(deserialized.latencyMs).toBe(record.latencyMs);
        expect(deserialized.poolId).toBe(record.poolId);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property tests for distinct location records for different pool placements
 *
 * **Validates: Requirements 5.5**
 *
 * Property 13: Distinct location records for different pool placements
 * For any block ID with location records in two different pools (P1 and P2)
 * on different nodes, the availability service SHALL maintain both location
 * records as distinct entries. Querying locations filtered by P1 SHALL not
 * return the P2 record, and vice versa.
 */
describe('Feature: cross-node-pool-coordination, Property 13: Distinct location records for different pool placements', () => {
  // --- Minimal IAvailabilityService contract implementation ---
  // Since this test lives in brightchain-lib and cannot import the real
  // AvailabilityService from brightchain-api-lib, we implement the interface
  // contract inline: updateLocation uses (nodeId, poolId) as composite key,
  // and getBlockLocations supports optional poolId filtering.

  interface BlockLocationData {
    locations: ILocationRecord[];
  }

  /**
   * Minimal implementation of the IAvailabilityService location tracking contract.
   * Uses (nodeId, poolId) as composite key per Requirement 5.5.
   */
  class LocationTracker {
    private readonly blockData = new Map<string, BlockLocationData>();

    async updateLocation(
      blockId: string,
      location: ILocationRecord,
    ): Promise<void> {
      let data = this.blockData.get(blockId);
      const matchesCompositeKey = (l: ILocationRecord): boolean =>
        l.nodeId === location.nodeId && l.poolId === location.poolId;

      if (!data) {
        data = { locations: [] };
        this.blockData.set(blockId, data);
      }

      const existingIndex = data.locations.findIndex(matchesCompositeKey);
      if (existingIndex >= 0) {
        data.locations[existingIndex] = { ...location };
      } else {
        data.locations.push({ ...location });
      }
    }

    async getBlockLocations(
      blockId: string,
      poolId?: PoolId,
    ): Promise<ILocationRecord[]> {
      const data = this.blockData.get(blockId);
      if (!data) return [];
      const locations = [...data.locations];
      if (poolId !== undefined) {
        return locations.filter((l) => l.poolId === poolId);
      }
      return locations;
    }

    clear(): void {
      this.blockData.clear();
    }
  }

  // --- Smart Generators ---

  /** Generates a valid pool ID matching /^[a-zA-Z0-9_-]{1,64}$/ */
  const validPoolIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

  /** Generates a non-empty string suitable for node IDs */
  const nodeIdArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid hex-encoded block ID */
  const blockIdArb = fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 64 })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

  /** Generates a valid Date */
  const validDateArb = fc
    .date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') })
    .filter((d) => !isNaN(d.getTime()));

  /**
   * Generates a scenario with two distinct pools and two distinct nodes.
   * This is the core input for Property 13: a block placed in P1 on node1
   * and in P2 on node2.
   */
  const distinctPoolPlacementArb = fc
    .record({
      blockId: blockIdArb,
      pool1: validPoolIdArb,
      pool2: validPoolIdArb,
      node1: nodeIdArb,
      node2: nodeIdArb,
      lastSeen1: validDateArb,
      lastSeen2: validDateArb,
      isAuth1: fc.boolean(),
      isAuth2: fc.boolean(),
    })
    .filter((s) => s.pool1 !== s.pool2 && s.node1 !== s.node2);

  /**
   * Generates a scenario where the same nodeId has entries in two different pools.
   * Tests that (nodeId, poolId) composite key creates separate entries even for
   * the same node.
   */
  const sameNodeDifferentPoolsArb = fc
    .record({
      blockId: blockIdArb,
      pool1: validPoolIdArb,
      pool2: validPoolIdArb,
      nodeId: nodeIdArb,
      lastSeen1: validDateArb,
      lastSeen2: validDateArb,
      isAuth1: fc.boolean(),
      isAuth2: fc.boolean(),
    })
    .filter((s) => s.pool1 !== s.pool2);

  // --- Test Setup ---

  let tracker: LocationTracker;

  beforeEach(() => {
    tracker = new LocationTracker();
  });

  // --- Property Tests ---

  /**
   * Property 13a: Both location records are maintained as distinct entries
   * when a block has records in two different pools on different nodes.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 13a: maintains distinct location records for different pool placements on different nodes', async () => {
    await fc.assert(
      fc.asyncProperty(distinctPoolPlacementArb, async (scenario) => {
        tracker.clear();

        const record1: ILocationRecord = {
          nodeId: scenario.node1,
          lastSeen: scenario.lastSeen1,
          isAuthoritative: scenario.isAuth1,
          poolId: scenario.pool1,
        };
        const record2: ILocationRecord = {
          nodeId: scenario.node2,
          lastSeen: scenario.lastSeen2,
          isAuthoritative: scenario.isAuth2,
          poolId: scenario.pool2,
        };

        await tracker.updateLocation(scenario.blockId, record1);
        await tracker.updateLocation(scenario.blockId, record2);

        const allLocations = await tracker.getBlockLocations(scenario.blockId);
        expect(allLocations).toHaveLength(2);

        // Both records are distinct
        const nodeIds = allLocations.map((l) => l.nodeId);
        expect(nodeIds).toContain(scenario.node1);
        expect(nodeIds).toContain(scenario.node2);

        const poolIds = allLocations.map((l) => l.poolId);
        expect(poolIds).toContain(scenario.pool1);
        expect(poolIds).toContain(scenario.pool2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13b: Querying with poolId P1 returns only P1 records,
   * not P2 records.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 13b: querying with pool P1 returns only P1 records', async () => {
    await fc.assert(
      fc.asyncProperty(distinctPoolPlacementArb, async (scenario) => {
        tracker.clear();

        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node1,
          lastSeen: scenario.lastSeen1,
          isAuthoritative: scenario.isAuth1,
          poolId: scenario.pool1,
        });
        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node2,
          lastSeen: scenario.lastSeen2,
          isAuthoritative: scenario.isAuth2,
          poolId: scenario.pool2,
        });

        const p1Locations = await tracker.getBlockLocations(
          scenario.blockId,
          scenario.pool1,
        );
        expect(p1Locations).toHaveLength(1);
        expect(p1Locations[0].nodeId).toBe(scenario.node1);
        expect(p1Locations[0].poolId).toBe(scenario.pool1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13c: Querying with poolId P2 returns only P2 records,
   * not P1 records.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 13c: querying with pool P2 returns only P2 records', async () => {
    await fc.assert(
      fc.asyncProperty(distinctPoolPlacementArb, async (scenario) => {
        tracker.clear();

        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node1,
          lastSeen: scenario.lastSeen1,
          isAuthoritative: scenario.isAuth1,
          poolId: scenario.pool1,
        });
        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node2,
          lastSeen: scenario.lastSeen2,
          isAuthoritative: scenario.isAuth2,
          poolId: scenario.pool2,
        });

        const p2Locations = await tracker.getBlockLocations(
          scenario.blockId,
          scenario.pool2,
        );
        expect(p2Locations).toHaveLength(1);
        expect(p2Locations[0].nodeId).toBe(scenario.node2);
        expect(p2Locations[0].poolId).toBe(scenario.pool2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13d: Querying without poolId returns all records across all pools.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 13d: querying without poolId returns all records across pools', async () => {
    await fc.assert(
      fc.asyncProperty(distinctPoolPlacementArb, async (scenario) => {
        tracker.clear();

        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node1,
          lastSeen: scenario.lastSeen1,
          isAuthoritative: scenario.isAuth1,
          poolId: scenario.pool1,
        });
        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.node2,
          lastSeen: scenario.lastSeen2,
          isAuthoritative: scenario.isAuth2,
          poolId: scenario.pool2,
        });

        const allLocations = await tracker.getBlockLocations(scenario.blockId);
        expect(allLocations).toHaveLength(2);

        // Verify both pools are represented
        const poolIds = allLocations.map((l) => l.poolId);
        expect(poolIds).toContain(scenario.pool1);
        expect(poolIds).toContain(scenario.pool2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13e: The same nodeId with different poolIds creates separate entries.
   * This validates the composite key (nodeId, poolId) — a single node can have
   * the same block in two different pools, and both records are maintained.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 13e: same nodeId with different poolIds creates separate entries', async () => {
    await fc.assert(
      fc.asyncProperty(sameNodeDifferentPoolsArb, async (scenario) => {
        tracker.clear();

        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.nodeId,
          lastSeen: scenario.lastSeen1,
          isAuthoritative: scenario.isAuth1,
          poolId: scenario.pool1,
        });
        await tracker.updateLocation(scenario.blockId, {
          nodeId: scenario.nodeId,
          lastSeen: scenario.lastSeen2,
          isAuthoritative: scenario.isAuth2,
          poolId: scenario.pool2,
        });

        // Both entries exist (same node, different pools)
        const allLocations = await tracker.getBlockLocations(scenario.blockId);
        expect(allLocations).toHaveLength(2);
        expect(allLocations.every((l) => l.nodeId === scenario.nodeId)).toBe(
          true,
        );

        // Filtering by pool returns only the matching entry
        const p1Locations = await tracker.getBlockLocations(
          scenario.blockId,
          scenario.pool1,
        );
        expect(p1Locations).toHaveLength(1);
        expect(p1Locations[0].poolId).toBe(scenario.pool1);

        const p2Locations = await tracker.getBlockLocations(
          scenario.blockId,
          scenario.pool2,
        );
        expect(p2Locations).toHaveLength(1);
        expect(p2Locations[0].poolId).toBe(scenario.pool2);
      }),
      { numRuns: 100 },
    );
  });
});
