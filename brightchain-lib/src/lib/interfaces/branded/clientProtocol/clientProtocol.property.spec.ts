/**
 * @fileoverview Property-based tests for safeParseInterface on client protocol types
 *
 * // Feature: branded-dto-integration, Property 2: safeParseInterface accepts valid data
 * // Feature: branded-dto-integration, Property 3: safeParseInterface rejects invalid data
 *
 * Property 2: For any branded interface definition and any plain object whose fields
 * satisfy the schema, safeParseInterface() returns a success result containing a
 * branded instance whose enumerable fields are equal to the input.
 *
 * Property 3: For any branded interface definition and any plain object that violates
 * the schema (missing required field, wrong type, or invalid branded-primitive ref),
 * safeParseInterface() returns a failure result with a non-empty error message.
 *
 * Validates: Requirements 2.5, 2.6, 2.7
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

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
  PoolDetailDef,
  PoolInfoDef,
} from './index';

jest.setTimeout(60000);

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
  eventType: nonEmptyStringArb,
  accessTier: nonEmptyStringArb,
  payload: fc.oneof(fc.constant(null), fc.record({ key: nonEmptyStringArb })),
  timestamp: nonEmptyStringArb,
  correlationId: nonEmptyStringArb,
});

describe('Property 2: safeParseInterface accepts valid data', () => {
  it('NodeStatusDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validNodeStatusArb, (data) => {
        expect(NodeStatusDef.validate(data)).toBe(true);
        if (NodeStatusDef.validate(data)) {
          const instance = NodeStatusDef.create(data);
          expect(instance.nodeId).toBe(data.nodeId);
          expect(instance.healthy).toBe(data.healthy);
          expect(instance.uptime).toBe(data.uptime);
          expect(instance.version).toBe(data.version);
          expect(instance.partitionMode).toBe(data.partitionMode);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('PeerInfoDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validPeerInfoArb, (data) => {
        expect(PeerInfoDef.validate(data)).toBe(true);
        if (PeerInfoDef.validate(data)) {
          const instance = PeerInfoDef.create(data);
          expect(instance.nodeId).toBe(data.nodeId);
          expect(instance.connected).toBe(data.connected);
          expect(instance.lastSeen).toBe(data.lastSeen);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('NetworkTopologyDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validNetworkTopologyArb, (data) => {
        expect(NetworkTopologyDef.validate(data)).toBe(true);
        if (NetworkTopologyDef.validate(data)) {
          const instance = NetworkTopologyDef.create(data);
          expect(instance.localNodeId).toBe(data.localNodeId);
          expect(instance.totalConnected).toBe(data.totalConnected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('PoolAclSummaryDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validPoolAclSummaryArb, (data) => {
        expect(PoolAclSummaryDef.validate(data)).toBe(true);
        if (PoolAclSummaryDef.validate(data)) {
          const instance = PoolAclSummaryDef.create(data);
          expect(instance.memberCount).toBe(data.memberCount);
          expect(instance.adminCount).toBe(data.adminCount);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('PoolInfoDef: validate() accepts valid data (poolId passes PoolId primitive)', () => {
    fc.assert(
      fc.property(validPoolInfoArb, (data) => {
        expect(PoolInfoDef.validate(data)).toBe(true);
        if (PoolInfoDef.validate(data)) {
          const instance = PoolInfoDef.create(data);
          expect(instance.poolId).toBe(data.poolId);
          expect(instance.blockCount).toBe(data.blockCount);
          expect(instance.encrypted).toBe(data.encrypted);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('PoolDetailDef: validate() accepts valid data with branded aclSummary', () => {
    fc.assert(
      fc.property(
        validPoolInfoArb,
        validPoolAclSummaryArb,
        (poolData, aclData) => {
          const aclSummary = PoolAclSummaryDef.create(aclData);
          const data = { ...poolData, owner: 'owner-node', aclSummary };
          expect(PoolDetailDef.validate(data)).toBe(true);
          if (PoolDetailDef.validate(data)) {
            const instance = PoolDetailDef.create(data);
            expect(instance.poolId).toBe(poolData.poolId);
            expect(instance.owner).toBe('owner-node');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EnergyAccountStatusDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validEnergyAccountStatusArb, (data) => {
        expect(EnergyAccountStatusDef.validate(data)).toBe(true);
        if (EnergyAccountStatusDef.validate(data)) {
          const instance = EnergyAccountStatusDef.create(data);
          expect(instance.memberId).toBe(data.memberId);
          expect(instance.balance).toBe(data.balance);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('BlockStoreStatsDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validBlockStoreStatsArb, (data) => {
        expect(BlockStoreStatsDef.validate(data)).toBe(true);
        if (BlockStoreStatsDef.validate(data)) {
          const instance = BlockStoreStatsDef.create(data);
          expect(instance.totalCapacity).toBe(data.totalCapacity);
          expect(instance.totalBlocks).toBe(data.totalBlocks);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('ClientEventDef: validate() accepts valid data (payload may be null or object)', () => {
    fc.assert(
      fc.property(validClientEventArb, (data) => {
        expect(ClientEventDef.validate(data)).toBe(true);
        if (ClientEventDef.validate(data)) {
          const instance = ClientEventDef.create(data);
          expect(instance.eventType).toBe(data.eventType);
          expect(instance.correlationId).toBe(data.correlationId);
          expect(instance.timestamp).toBe(data.timestamp);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 3: safeParseInterface rejects invalid data', () => {
  it('NodeStatusDef: validate() returns false when a required field is missing', () => {
    const fields = [
      'nodeId',
      'healthy',
      'uptime',
      'version',
      'capabilities',
      'partitionMode',
    ] as const;
    fc.assert(
      fc.property(
        validNodeStatusArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(NodeStatusDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('PeerInfoDef: validate() returns false when a required field is missing', () => {
    const fields = ['nodeId', 'connected', 'lastSeen'] as const;
    fc.assert(
      fc.property(
        validPeerInfoArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(PeerInfoDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EnergyAccountStatusDef: validate() returns false when a required field is missing', () => {
    const fields = [
      'memberId',
      'balance',
      'availableBalance',
      'earned',
      'spent',
      'reserved',
    ] as const;
    fc.assert(
      fc.property(
        validEnergyAccountStatusArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(EnergyAccountStatusDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('BlockStoreStatsDef: validate() returns false when a required field is missing', () => {
    const fields = [
      'totalCapacity',
      'currentUsage',
      'availableSpace',
      'blockCounts',
      'totalBlocks',
    ] as const;
    fc.assert(
      fc.property(
        validBlockStoreStatsArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(BlockStoreStatsDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ClientEventDef: validate() returns false when a required field is missing', () => {
    const fields = [
      'eventType',
      'accessTier',
      'timestamp',
      'correlationId',
    ] as const;
    fc.assert(
      fc.property(
        validClientEventArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(ClientEventDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('NodeStatusDef: validate() returns false when nodeId receives a number', () => {
    fc.assert(
      fc.property(validNodeStatusArb, numberArb, (data, wrongValue) => {
        const mutated: Record<string, unknown> = {
          ...data,
          nodeId: wrongValue,
        };
        expect(NodeStatusDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('NodeStatusDef: validate() returns false when healthy receives a string', () => {
    fc.assert(
      fc.property(validNodeStatusArb, nonEmptyStringArb, (data, wrongValue) => {
        const mutated: Record<string, unknown> = {
          ...data,
          healthy: wrongValue,
        };
        expect(NodeStatusDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('EnergyAccountStatusDef: validate() returns false when balance receives a string', () => {
    fc.assert(
      fc.property(
        validEnergyAccountStatusArb,
        nonEmptyStringArb,
        (data, wrongValue) => {
          const mutated: Record<string, unknown> = {
            ...data,
            balance: wrongValue,
          };
          expect(EnergyAccountStatusDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('BlockStoreStatsDef: validate() returns false when totalCapacity receives a string', () => {
    fc.assert(
      fc.property(
        validBlockStoreStatsArb,
        nonEmptyStringArb,
        (data, wrongValue) => {
          const mutated: Record<string, unknown> = {
            ...data,
            totalCapacity: wrongValue,
          };
          expect(BlockStoreStatsDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('PoolInfoDef: validate() returns false when poolId fails PoolId primitive validation', () => {
    const invalidPoolIdArb = fc
      .string({ minLength: 0, maxLength: 80 })
      .filter((s) => !/^[a-zA-Z0-9_-]{1,64}$/.test(s));
    fc.assert(
      fc.property(validPoolInfoArb, invalidPoolIdArb, (data, badPoolId) => {
        const mutated: Record<string, unknown> = { ...data, poolId: badPoolId };
        expect(PoolInfoDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('PoolDetailDef: validate() returns false when poolId fails PoolId primitive validation', () => {
    const invalidPoolIdArb = fc
      .string({ minLength: 0, maxLength: 80 })
      .filter((s) => !/^[a-zA-Z0-9_-]{1,64}$/.test(s));
    fc.assert(
      fc.property(
        validPoolInfoArb,
        validPoolAclSummaryArb,
        invalidPoolIdArb,
        (poolData, aclData, badPoolId) => {
          const aclSummary = PoolAclSummaryDef.create(aclData);
          const mutated: Record<string, unknown> = {
            ...poolData,
            poolId: badPoolId,
            owner: 'owner-node',
            aclSummary,
          };
          expect(PoolDetailDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('NodeStatusDef: validate() returns false for non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(nonObjectArb, (value) => {
        expect(NodeStatusDef.validate(value)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('PoolInfoDef: validate() returns false for non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(nonObjectArb, (value) => {
        expect(PoolInfoDef.validate(value)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
