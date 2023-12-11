/**
 * Feature: admin-server-dashboard, Property 9: Dashboard response JSON round-trip
 *
 * For any valid IAdminDashboardData object, serializing to JSON via JSON.stringify
 * and then deserializing via JSON.parse SHALL produce an object deeply equal to the original.
 *
 * **Validates: Requirements 11.4**
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { HealthStatus } from '../lib/enumerations/healthStatus';
import { NodeIdSource } from '../lib/enumerations/nodeIdSource';
import { NodeStatus } from '../lib/enumerations/nodeStatus';
import type { IDependencyStatus } from '../lib/interfaces/dependencyStatus';
import type { INodeInfo } from '../lib/interfaces/nodeInfo';
import type {
  IAdminBlockStoreStats,
  IAdminBrightTrustMember,
  IAdminBrightTrustStatus,
  IAdminChatStats,
  IAdminClientSession,
  IAdminDashboardData,
  IAdminDbStats,
  IAdminDependencyHealth,
  IAdminHubStats,
  IAdminMailStats,
  IAdminPassStats,
  IAdminPoolInfo,
  IAdminSystemMetrics,
} from '../lib/interfaces/responses/adminDashboardResponse';

// ─── Generators ──────────────────────────────────────────────────────────────

const arbIso8601 = fc
  .date({ min: new Date(0), max: new Date('2100-01-01T00:00:00.000Z') })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

const arbStringId = fc.uuid();

const arbNodeStatus = fc.constantFrom(...Object.values(NodeStatus));

const arbHealthStatus = fc.constantFrom(...Object.values(HealthStatus));

const arbNodeInfo: fc.Arbitrary<INodeInfo> = fc.record({
  nodeId: arbStringId,
  publicKey: fc.option(fc.string({ minLength: 10, maxLength: 64 }), {
    nil: undefined,
  }),
  status: arbNodeStatus,
  capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    maxLength: 5,
  }),
  lastSeen: arbIso8601,
  latencyMs: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
});

const arbClientSession: fc.Arbitrary<IAdminClientSession> = fc.record({
  memberId: arbStringId,
  username: fc.string({ minLength: 1, maxLength: 30 }),
  memberType: fc.string({ minLength: 1, maxLength: 20 }),
  rooms: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
    maxLength: 5,
  }),
});

const arbBrightTrustMember: fc.Arbitrary<IAdminBrightTrustMember> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  role: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
    nil: undefined,
  }),
});

const arbBrightTrustStatus: fc.Arbitrary<IAdminBrightTrustStatus> = fc.record({
  active: fc.boolean(),
  memberCount: fc.nat({ max: 100 }),
  threshold: fc.nat({ max: 100 }),
  members: fc.array(arbBrightTrustMember, { maxLength: 10 }),
});

const arbPoolInfo: fc.Arbitrary<IAdminPoolInfo> = fc.record({
  poolId: arbStringId,
  metadata: fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 15 }),
      fc.oneof(fc.string({ maxLength: 30 }), fc.integer(), fc.boolean()),
      { maxKeys: 5 },
    ),
    { nil: undefined },
  ),
});

const arbDbStats: fc.Arbitrary<IAdminDbStats> = fc.record({
  users: fc.option(fc.nat({ max: 100000 }), { nil: null }),
  roles: fc.option(fc.nat({ max: 1000 }), { nil: null }),
  usersByStatus: fc.option(
    fc.record({
      active: fc.nat({ max: 100000 }),
      locked: fc.nat({ max: 100000 }),
      pendingEmailVerification: fc.nat({ max: 100000 }),
    }),
    { nil: null },
  ),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: undefined,
  }),
});

const arbSystemMetrics: fc.Arbitrary<IAdminSystemMetrics> = fc.record({
  heapUsedBytes: fc.nat({ max: 1_000_000_000 }),
  heapTotalBytes: fc.nat({ max: 1_000_000_000 }),
  rssBytes: fc.nat({ max: 1_000_000_000 }),
  externalBytes: fc.nat({ max: 1_000_000_000 }),
  uptimeSeconds: fc.nat({ max: 1_000_000 }),
  nodeVersion: fc
    .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
    .map(([a, b, c]) => `v${a}.${b}.${c}`),
  appVersion: fc
    .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
    .map(([a, b, c]) => `${a}.${b}.${c}`),
});

const arbDependencyStatus: fc.Arbitrary<IDependencyStatus> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  status: arbHealthStatus,
  latencyMs: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
  message: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: undefined,
  }),
});

const arbDependencyHealth: fc.Arbitrary<IAdminDependencyHealth> = fc.record({
  blockStore: arbDependencyStatus,
  messageService: arbDependencyStatus,
  webSocketServer: arbDependencyStatus,
});

const arbBlockStoreStats: fc.Arbitrary<IAdminBlockStoreStats> = fc.record({
  totalBlocks: fc.nat({ max: 1_000_000 }),
  totalSizeBytes: fc.nat({ max: 1_000_000_000 }),
  countByDurability: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.nat({ max: 100_000 }),
    { maxKeys: 5 },
  ),
});

const arbHubStats: fc.Arbitrary<IAdminHubStats> = fc.record({
  totalPosts: fc.nat({ max: 100_000 }),
  activeUsersLast30Days: fc.nat({ max: 10_000 }),
});

const arbChatStats: fc.Arbitrary<IAdminChatStats> = fc.record({
  totalConversations: fc.nat({ max: 100_000 }),
  totalMessages: fc.nat({ max: 1_000_000 }),
});

const arbPassStats: fc.Arbitrary<IAdminPassStats> = fc.record({
  totalVaults: fc.nat({ max: 100_000 }),
  sharedVaults: fc.nat({ max: 100_000 }),
});

const arbMailStats: fc.Arbitrary<IAdminMailStats> = fc.record({
  totalEmails: fc.nat({ max: 1_000_000 }),
  deliveryFailures: fc.nat({ max: 100_000 }),
  emailsLast24Hours: fc.nat({ max: 100_000 }),
});

const arbAdminDashboardData: fc.Arbitrary<IAdminDashboardData> = fc.record({
  nodes: fc.array(arbNodeInfo, { maxLength: 10 }),
  localNodeId: fc.option(arbStringId, { nil: null }),
  nodeIdSource: fc.constantFrom(
    NodeIdSource.AVAILABILITY_SERVICE,
    NodeIdSource.ENVIRONMENT,
  ),
  hostname: fc.string({ minLength: 1, maxLength: 50 }),
  disconnectedPeers: fc.array(arbStringId, { maxLength: 5 }),
  lumenClientCount: fc.nat({ max: 1000 }),
  lumenClientSessions: fc.array(arbClientSession, { maxLength: 10 }),
  nodeConnectionCount: fc.nat({ max: 100 }),
  connectedNodeIds: fc.array(arbStringId, { maxLength: 10 }),
  system: arbSystemMetrics,
  db: arbDbStats,
  brightTrust: arbBrightTrustStatus,
  pools: fc.array(arbPoolInfo, { maxLength: 5 }),
  dependencies: arbDependencyHealth,
  blockStore: arbBlockStoreStats,
  hub: arbHubStats,
  chat: arbChatStats,
  pass: arbPassStats,
  mail: arbMailStats,
  timestamp: arbIso8601,
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

describe('Feature: admin-server-dashboard, Property 9: Dashboard response JSON round-trip', () => {
  it('Property 9: For any valid IAdminDashboardData, JSON.stringify then JSON.parse produces a deeply equal object', () => {
    fc.assert(
      fc.property(arbAdminDashboardData, (data) => {
        // Optional fields with undefined values are dropped by JSON.stringify,
        // so we compare against the undefined-stripped version of the original.
        expect(roundTrip(data)).toEqual(stripUndefined(data));
      }),
      { numRuns: 100 },
    );
  });
});
