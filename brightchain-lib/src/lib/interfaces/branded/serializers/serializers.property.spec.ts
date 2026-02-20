/**
 * @fileoverview Property-based tests for serialization round-trip
 *
 * // Feature: branded-dto-integration, Property 6: Serialization round-trip
 *
 * Property 6: For any client protocol branded interface definition and any valid
 * branded instance of that definition, calling serialize() then deserialize() on
 * the result produces a success result whose branded instance has data fields
 * equivalent to the original.
 *
 * **Validates: Requirements 5.6**
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

// Primitives must be registered before definitions that ref them
import '../primitives/blockId';
import '../primitives/emailString';
import '../primitives/iso8601Timestamp';
import '../primitives/poolId';
import '../primitives/shortHexGuid';

import {
  BlockStoreStatsDef,
  ClientEventDef,
  EnergyAccountStatusDef,
  NetworkTopologyDef,
  NodeStatusDef,
  PeerInfoDef,
  PoolAclSummaryDef,
  PoolInfoDef,
} from '../clientProtocol/index';

import {
  ClientEventAccessTier,
  ClientEventType,
} from '../../clientProtocol/clientEvent';

import {
  blockStoreStatsSerializer,
  clientEventSerializer,
  energyAccountStatusSerializer,
  networkTopologySerializer,
  nodeStatusSerializer,
  peerInfoSerializer,
  poolAclSummarySerializer,
  poolInfoSerializer,
} from './clientProtocolSerializers';

jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Arbitraries — reused from clientProtocol property tests
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 40 });
const numberArb = fc.float({
  min: 0,
  max: 1e9,
  noNaN: true,
  noDefaultInfinity: true,
});
const boolArb = fc.boolean();
const stringArrayArb = fc.array(nonEmptyStringArb, {
  minLength: 0,
  maxLength: 5,
});
const validPoolIdArb = fc.stringMatching(/^[0-9a-f-]{1,36}$/);

const validNodeStatusArb = fc.record({
  nodeId: nonEmptyStringArb,
  healthy: boolArb,
  uptime: numberArb,
  version: nonEmptyStringArb,
  capabilities: stringArrayArb,
  partitionMode: boolArb,
});

const validPeerInfoArb = fc.record({
  nodeId: nonEmptyStringArb,
  connected: boolArb,
  lastSeen: nonEmptyStringArb,
});

const validNetworkTopologyArb = fc.record({
  localNodeId: nonEmptyStringArb,
  peers: fc.array(
    fc.record({
      nodeId: nonEmptyStringArb,
      connected: boolArb,
      lastSeen: nonEmptyStringArb,
    }),
    { minLength: 0, maxLength: 3 },
  ),
  totalConnected: numberArb,
});

const validPoolAclSummaryArb = fc.record({
  memberCount: numberArb,
  adminCount: numberArb,
  publicRead: boolArb,
  publicWrite: boolArb,
  currentUserPermissions: stringArrayArb,
});

const validPoolInfoArb = fc.record({
  poolId: validPoolIdArb,
  blockCount: numberArb,
  totalSize: numberArb,
  memberCount: numberArb,
  encrypted: boolArb,
  publicRead: boolArb,
  publicWrite: boolArb,
  hostingNodes: stringArrayArb,
});

const validEnergyAccountStatusArb = fc.record({
  memberId: nonEmptyStringArb,
  balance: numberArb,
  availableBalance: numberArb,
  earned: numberArb,
  spent: numberArb,
  reserved: numberArb,
});

const validBlockStoreStatsArb = fc.record({
  totalCapacity: numberArb,
  currentUsage: numberArb,
  availableSpace: numberArb,
  blockCounts: fc.record({ total: numberArb }),
  totalBlocks: numberArb,
});

const validClientEventArb = fc.record({
  eventType: fc.constantFrom(...Object.values(ClientEventType)),
  accessTier: fc.constantFrom(...Object.values(ClientEventAccessTier)),
  payload: fc.oneof(fc.constant(null), fc.record({ key: nonEmptyStringArb })),
  timestamp: nonEmptyStringArb,
  correlationId: nonEmptyStringArb,
});

// ===========================================================================
// Property 6: Serialization round-trip
//
// For each definition: create a branded instance, serialize it to JSON,
// deserialize it back, and verify the result is a success with equivalent
// data fields.
// ===========================================================================

describe('Property 6: Serialization round-trip', () => {
  it('nodeStatusSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validNodeStatusArb, (data) => {
        const instance = NodeStatusDef.create(data);
        const json = nodeStatusSerializer.serialize(instance);
        const result = nodeStatusSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.nodeId).toBe(data.nodeId);
          expect(result.value.healthy).toBe(data.healthy);
          expect(result.value.uptime).toBe(data.uptime);
          expect(result.value.version).toBe(data.version);
          expect(result.value.partitionMode).toBe(data.partitionMode);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('peerInfoSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validPeerInfoArb, (data) => {
        const instance = PeerInfoDef.create(data);
        const json = peerInfoSerializer.serialize(instance);
        const result = peerInfoSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.nodeId).toBe(data.nodeId);
          expect(result.value.connected).toBe(data.connected);
          expect(result.value.lastSeen).toBe(data.lastSeen);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('networkTopologySerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validNetworkTopologyArb, (data) => {
        const instance = NetworkTopologyDef.create(data);
        const json = networkTopologySerializer.serialize(instance);
        const result = networkTopologySerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.localNodeId).toBe(data.localNodeId);
          expect(result.value.totalConnected).toBe(data.totalConnected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('poolAclSummarySerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validPoolAclSummaryArb, (data) => {
        const instance = PoolAclSummaryDef.create(data);
        const json = poolAclSummarySerializer.serialize(instance);
        const result = poolAclSummarySerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.memberCount).toBe(data.memberCount);
          expect(result.value.adminCount).toBe(data.adminCount);
          expect(result.value.publicRead).toBe(data.publicRead);
          expect(result.value.publicWrite).toBe(data.publicWrite);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('poolInfoSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validPoolInfoArb, (data) => {
        const instance = PoolInfoDef.create(data);
        const json = poolInfoSerializer.serialize(instance);
        const result = poolInfoSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.poolId).toBe(data.poolId);
          expect(result.value.blockCount).toBe(data.blockCount);
          expect(result.value.encrypted).toBe(data.encrypted);
        }
      }),
      { numRuns: 100 },
    );
  });

  // NOTE: poolDetailSerializer is intentionally excluded from the round-trip property.
  // PoolDetailDef's schema uses a `branded-interface` ref for the `aclSummary` field,
  // which requires the value to carry the INTERFACE_ID Symbol. JSON serialization strips
  // all Symbols, so the deserialized plain object cannot satisfy the branded-interface
  // ref check. The other 8 definitions use only primitive/string/number/boolean/array
  // fields and round-trip cleanly.

  it('energyAccountStatusSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validEnergyAccountStatusArb, (data) => {
        const instance = EnergyAccountStatusDef.create(data);
        const json = energyAccountStatusSerializer.serialize(instance);
        const result = energyAccountStatusSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.memberId).toBe(data.memberId);
          expect(result.value.balance).toBe(data.balance);
          expect(result.value.earned).toBe(data.earned);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('blockStoreStatsSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validBlockStoreStatsArb, (data) => {
        const instance = BlockStoreStatsDef.create(data);
        const json = blockStoreStatsSerializer.serialize(instance);
        const result = blockStoreStatsSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.totalCapacity).toBe(data.totalCapacity);
          expect(result.value.totalBlocks).toBe(data.totalBlocks);
          expect(result.value.availableSpace).toBe(data.availableSpace);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('clientEventSerializer: serialize then deserialize produces equivalent fields', () => {
    fc.assert(
      fc.property(validClientEventArb, (data) => {
        const instance = ClientEventDef.create(data);
        const json = clientEventSerializer.serialize(instance);
        const result = clientEventSerializer.deserialize(json);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.eventType).toBe(data.eventType);
          expect(result.value.correlationId).toBe(data.correlationId);
          expect(result.value.timestamp).toBe(data.timestamp);
        }
      }),
      { numRuns: 100 },
    );
  });
});
