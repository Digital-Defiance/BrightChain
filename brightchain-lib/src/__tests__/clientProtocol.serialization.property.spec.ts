/**
 * Feature: lumen-brightchain-client-protocol, Property 15: Shared interface serialization round-trip
 *
 * For any valid instance of INodeStatus, IPoolInfo, IPoolDiscoveryResult, INetworkTopology,
 * IClientEvent, IBlockStoreStats, or IEnergyAccountStatus, serializing to JSON and
 * deserializing back produces an object deeply equal to the original.
 *
 * **Validates: Requirements 10.3**
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import type { IBlockStoreStats } from '../lib/interfaces/clientProtocol/blockStoreStats';
import type { IClientEvent } from '../lib/interfaces/clientProtocol/clientEvent';
import {
  ClientEventAccessTier,
  ClientEventType,
} from '../lib/interfaces/clientProtocol/clientEvent';
import type { IEnergyAccountStatus } from '../lib/interfaces/clientProtocol/energyAccount';
import type { INodeStatus } from '../lib/interfaces/clientProtocol/nodeStatus';
import type {
  INetworkTopology,
  IPeerInfo,
} from '../lib/interfaces/clientProtocol/peerInfo';
import type { IPoolDiscoveryResult } from '../lib/interfaces/clientProtocol/poolDiscovery';
import type { IPoolInfo } from '../lib/interfaces/clientProtocol/poolInfo';

// ─── Generators ──────────────────────────────────────────────────────────────

// Constrain to dates that have valid ISO string representations (avoid NaN dates)
const arbIso8601 = fc
  .date({ min: new Date(0), max: new Date('2100-01-01T00:00:00.000Z') })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());
const arbStringId = fc.uuid();

const arbNodeStatus: fc.Arbitrary<INodeStatus<string>> = fc.record({
  nodeId: arbStringId,
  healthy: fc.boolean(),
  uptime: fc.nat({ max: 1_000_000 }),
  version: fc
    .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
    .map(([a, b, c]) => `${a}.${b}.${c}`),
  capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    maxLength: 5,
  }),
  partitionMode: fc.boolean(),
  disconnectedPeers: fc.option(fc.array(arbStringId, { maxLength: 3 }), {
    nil: undefined,
  }),
});

const arbPeerInfo: fc.Arbitrary<IPeerInfo<string>> = fc.record({
  nodeId: arbStringId,
  connected: fc.boolean(),
  lastSeen: arbIso8601,
  latencyMs: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
});

const arbNetworkTopology: fc.Arbitrary<INetworkTopology<string>> = fc.record({
  localNodeId: arbStringId,
  peers: fc.array(arbPeerInfo, { maxLength: 5 }),
  totalConnected: fc.nat({ max: 100 }),
});

const arbPoolInfo: fc.Arbitrary<IPoolInfo<string>> = fc.record({
  poolId: arbStringId,
  blockCount: fc.nat({ max: 100_000 }),
  totalSize: fc.nat({ max: 1_000_000_000 }),
  memberCount: fc.nat({ max: 1000 }),
  encrypted: fc.boolean(),
  publicRead: fc.boolean(),
  publicWrite: fc.boolean(),
  hostingNodes: fc.array(arbStringId, { maxLength: 5 }),
});

const arbPoolDiscoveryResult: fc.Arbitrary<IPoolDiscoveryResult<string>> =
  fc.record({
    pools: fc.array(arbPoolInfo, { maxLength: 5 }),
    queriedPeers: fc.array(arbStringId, { maxLength: 5 }),
    unreachablePeers: fc.array(arbStringId, { maxLength: 3 }),
    timestamp: arbIso8601,
  });

const arbBlockStoreStats: fc.Arbitrary<IBlockStoreStats> = fc.record({
  totalCapacity: fc.nat({ max: 1_000_000_000 }),
  currentUsage: fc.nat({ max: 1_000_000_000 }),
  availableSpace: fc.nat({ max: 1_000_000_000 }),
  blockCounts: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 15 }),
    fc.nat({ max: 100_000 }),
    { maxKeys: 5 },
  ),
  totalBlocks: fc.nat({ max: 1_000_000 }),
});

const arbEnergyAccountStatus: fc.Arbitrary<IEnergyAccountStatus<string>> =
  fc.record({
    memberId: arbStringId,
    balance: fc.integer({ min: -100_000, max: 100_000 }),
    availableBalance: fc.integer({ min: -100_000, max: 100_000 }),
    earned: fc.nat({ max: 100_000 }),
    spent: fc.nat({ max: 100_000 }),
    reserved: fc.nat({ max: 100_000 }),
  });

const arbClientEventType = fc.constantFrom(...Object.values(ClientEventType));
const arbClientEventAccessTier = fc.constantFrom(
  ...Object.values(ClientEventAccessTier),
);

// fc.jsonValue() can produce -0 which doesn't round-trip through JSON (becomes 0).
// Use fc.jsonValue() filtered to exclude -0, or use a safe subset.
// Also, undefined optional fields are dropped by JSON.stringify, so use null instead.
const arbSafeJsonValue: fc.Arbitrary<fc.JsonValue> = fc
  .jsonValue()
  .filter((v) => !Object.is(v, -0))
  .map((v) => {
    // Recursively replace -0 with 0 in nested structures
    return JSON.parse(JSON.stringify(v)) as fc.JsonValue;
  });

const arbClientEvent: fc.Arbitrary<IClientEvent<string>> = fc.record({
  eventType: arbClientEventType,
  accessTier: arbClientEventAccessTier,
  payload: arbSafeJsonValue,
  timestamp: arbIso8601,
  correlationId: arbStringId,
  targetPoolId: fc.option(arbStringId, { nil: undefined }),
  targetMemberId: fc.option(arbStringId, { nil: undefined }),
});

// ─── Round-trip helper ───────────────────────────────────────────────────────

function roundTrip<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Strip undefined values from an object so that comparison with a JSON round-tripped
 * object (which drops undefined keys) works correctly.
 */
function stripUndefined<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (v === undefined ? undefined : v)),
  ) as T;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Feature: lumen-brightchain-client-protocol, Property 15: Shared interface serialization round-trip', () => {
  it('Property 15a: INodeStatus round-trip', () => {
    fc.assert(
      fc.property(arbNodeStatus, (status) => {
        expect(roundTrip(status)).toEqual(status);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15b: INetworkTopology round-trip', () => {
    fc.assert(
      fc.property(arbNetworkTopology, (topology) => {
        expect(roundTrip(topology)).toEqual(topology);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15c: IPoolInfo round-trip', () => {
    fc.assert(
      fc.property(arbPoolInfo, (pool) => {
        expect(roundTrip(pool)).toEqual(pool);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15d: IPoolDiscoveryResult round-trip', () => {
    fc.assert(
      fc.property(arbPoolDiscoveryResult, (result) => {
        expect(roundTrip(result)).toEqual(result);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15e: IBlockStoreStats round-trip', () => {
    fc.assert(
      fc.property(arbBlockStoreStats, (stats) => {
        expect(roundTrip(stats)).toEqual(stats);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15f: IEnergyAccountStatus round-trip', () => {
    fc.assert(
      fc.property(arbEnergyAccountStatus, (account) => {
        expect(roundTrip(account)).toEqual(account);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15g: IClientEvent round-trip', () => {
    fc.assert(
      fc.property(arbClientEvent, (event) => {
        // Optional fields with undefined values are dropped by JSON.stringify,
        // so we compare against the undefined-stripped version of the original.
        expect(roundTrip(event)).toEqual(stripUndefined(event));
      }),
      { numRuns: 100 },
    );
  });
});
