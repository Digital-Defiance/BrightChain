/**
 * @fileoverview Property-based tests for PoolDiscoveryService
 *
 * Tests correctness properties for pool discovery across connected peers,
 * including ACL/encryption filtering, deduplication, graceful degradation,
 * and gossip-driven cache updates.
 *
 * @see Requirements 7.2, 7.3, 7.4, 7.5, 8.3
 */

import {
  BlockAnnouncement,
  IPoolACL,
  IPoolInfo,
  PoolAnnouncementMetadata,
  PoolPermission,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';

import { PoolACLStore } from '../auth/poolAclStore';
import { PoolEncryptionService } from '../encryption/poolEncryptionService';
import { IMemberContext } from '../middlewares/authentication';
import { IPeerProvider } from './gossipService';
import {
  IPoolQueryProvider,
  PoolDiscoveryService,
} from './poolDiscoveryService';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Generators ──

const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);
const arbNodeId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);
const arbMemberId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

const arbMemberType = fc.constantFrom(
  MemberType.User,
  MemberType.Admin,
  MemberType.System,
);

const arbMemberContext: fc.Arbitrary<IMemberContext> = fc.record({
  memberId: arbMemberId,
  username: fc.string({ minLength: 1, maxLength: 32 }),
  type: arbMemberType,
  iat: fc.nat(),
  exp: fc.nat(),
});

const arbPoolInfo: fc.Arbitrary<IPoolInfo<string>> = fc.record({
  poolId: arbPoolId,
  blockCount: fc.nat({ max: 1_000_000 }),
  totalSize: fc.nat({ max: Number.MAX_SAFE_INTEGER }),
  memberCount: fc.nat({ max: 10_000 }),
  encrypted: fc.boolean(),
  publicRead: fc.boolean(),
  publicWrite: fc.boolean(),
  hostingNodes: fc.array(arbNodeId, { minLength: 0, maxLength: 5 }),
});

// ── Mock Implementations ──

class MockPeerProvider implements IPeerProvider {
  constructor(
    private readonly localNodeId: string,
    private readonly connectedPeers: string[] = [],
  ) {}

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  getConnectedPeerIds(): string[] {
    return this.connectedPeers;
  }

  async sendAnnouncementBatch(): Promise<void> {
    // no-op for tests
  }

  async getPeerPublicKey(): Promise<Buffer | null> {
    return null;
  }
}

class MockPoolQueryProvider implements IPoolQueryProvider {
  private readonly peerPools: Map<string, IPoolInfo<string>[]> = new Map();
  private readonly unreachablePeers: Set<string> = new Set();

  setPeerPools(peerId: string, pools: IPoolInfo<string>[]): void {
    this.peerPools.set(peerId, pools);
  }

  setUnreachable(peerId: string): void {
    this.unreachablePeers.add(peerId);
  }

  async queryPeerPools(
    peerId: string,
    _timeoutMs: number,
  ): Promise<IPoolInfo<string>[]> {
    if (this.unreachablePeers.has(peerId)) {
      throw new Error(`Peer ${peerId} unreachable`);
    }
    return this.peerPools.get(peerId) ?? [];
  }
}

// ── Helper to build service ──

function createTestService(
  connectedPeers: string[],
  queryProvider: MockPoolQueryProvider,
  aclMap: Map<string, IPoolACL<string>> = new Map(),
): PoolDiscoveryService {
  const peerProvider = new MockPeerProvider('local-node', connectedPeers);
  const poolAclStore = new PoolACLStore();
  const encryptionService = new PoolEncryptionService();
  const aclLookup = (poolId: string) => aclMap.get(poolId);

  return new PoolDiscoveryService(
    peerProvider,
    poolAclStore,
    encryptionService,
    queryProvider,
    aclLookup,
  );
}

// ══════════════════════════════════════════════════════════════════════
// Property 6: Pool discovery results contain only authorized pools
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 6: Pool discovery results contain only authorized pools', () => {
  /**
   * Property 6a: For any set of pools and any User-type member,
   * every pool in the discovery result is either publicRead or the member
   * has Read permission in the ACL.
   *
   * **Validates: Requirements 7.2, 7.3**
   */
  it('Property 6a: User members only see authorized pools', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbPoolInfo, { minLength: 1, maxLength: 10 }),
        arbMemberContext.map((ctx) => ({ ...ctx, type: MemberType.User })),
        fc.array(arbMemberId, { minLength: 0, maxLength: 5 }),
        async (pools, memberContext, aclMemberIds) => {
          // Deduplicate pool IDs to avoid ambiguity
          const uniquePools = deduplicateByPoolId(pools);

          const queryProvider = new MockPoolQueryProvider();
          const peerId = 'peer-1';
          queryProvider.setPeerPools(peerId, uniquePools);

          // Build ACL map: randomly grant Read to some pools for the member
          const aclMap = new Map<string, IPoolACL<string>>();
          for (const pool of uniquePools) {
            const members = aclMemberIds.map((id) => ({
              nodeId: id,
              permissions: [PoolPermission.Read],
              addedAt: new Date(),
              addedBy: 'owner',
            }));

            // Randomly include the requesting member in some ACLs
            const includeMember = Math.random() > 0.5;
            if (includeMember) {
              members.push({
                nodeId: memberContext.memberId,
                permissions: [PoolPermission.Read],
                addedAt: new Date(),
                addedBy: 'owner',
              });
            }

            aclMap.set(pool.poolId, {
              poolId: pool.poolId,
              owner: 'owner',
              members,
              publicRead: pool.publicRead,
              publicWrite: pool.publicWrite,
              approvalSignatures: [],
              version: 1,
              updatedAt: new Date(),
            });
          }

          const service = createTestService([peerId], queryProvider, aclMap);
          const result = await service.discoverPools(memberContext);

          // Every returned pool must be authorized
          for (const pool of result.pools) {
            const acl = aclMap.get(pool.poolId);
            const isPublicRead = pool.publicRead;
            const hasMemberRead =
              acl !== undefined &&
              acl.members.some(
                (m) =>
                  m.nodeId === memberContext.memberId &&
                  m.permissions.includes(PoolPermission.Read),
              );
            const hasAdminPerm =
              acl !== undefined &&
              acl.members.some(
                (m) =>
                  m.nodeId === memberContext.memberId &&
                  m.permissions.includes(PoolPermission.Admin),
              );

            expect(isPublicRead || hasMemberRead || hasAdminPerm).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6b: Admin/System members see all pools regardless of ACL.
   *
   * **Validates: Requirements 7.2**
   */
  it('Property 6b: Admin/System members see all pools', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbPoolInfo, { minLength: 1, maxLength: 10 }),
        arbMemberContext.map((ctx) => ({
          ...ctx,
          type: fc.sample(
            fc.constantFrom(MemberType.Admin, MemberType.System),
            1,
          )[0],
        })),
        async (pools, memberContext) => {
          const uniquePools = deduplicateByPoolId(pools);

          const queryProvider = new MockPoolQueryProvider();
          const peerId = 'peer-1';
          queryProvider.setPeerPools(peerId, uniquePools);

          const service = createTestService([peerId], queryProvider);
          const result = await service.discoverPools(memberContext);

          // Admin/System should see all pools
          expect(result.pools.length).toBe(uniquePools.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 7: Pool discovery deduplication invariant
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 7: Pool discovery deduplication invariant', () => {
  /**
   * Property 7: For any pool discovery result, no pool ID appears more than once,
   * and each pool's hostingNodes list contains all peer nodes that reported it.
   *
   * **Validates: Requirements 7.4**
   */
  it('Property 7: no duplicate pool IDs and hostingNodes is complete', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolInfo,
        fc.array(arbNodeId, { minLength: 2, maxLength: 5 }),
        async (basePool, peerIds) => {
          // Ensure unique peer IDs
          const uniquePeerIds = [...new Set(peerIds)];
          if (uniquePeerIds.length < 2) return;

          // All peers report the same pool (publicRead so it passes ACL)
          const pool: IPoolInfo<string> = {
            ...basePool,
            publicRead: true,
          };

          const queryProvider = new MockPoolQueryProvider();
          for (const peerId of uniquePeerIds) {
            queryProvider.setPeerPools(peerId, [pool]);
          }

          const adminContext: IMemberContext = {
            memberId: 'admin-1',
            username: 'admin',
            type: MemberType.Admin,
            iat: 0,
            exp: 0,
          };

          const service = createTestService(uniquePeerIds, queryProvider);
          const result = await service.discoverPools(adminContext);

          // No duplicate pool IDs
          const poolIds = result.pools.map((p) => p.poolId);
          expect(new Set(poolIds).size).toBe(poolIds.length);

          // The single pool should appear exactly once
          expect(result.pools.length).toBe(1);

          // hostingNodes should contain all peers that reported it
          const hostingNodes = new Set(result.pools[0].hostingNodes);
          for (const peerId of uniquePeerIds) {
            expect(hostingNodes.has(peerId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 8: Pool discovery graceful degradation
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 8: Pool discovery graceful degradation', () => {
  /**
   * Property 8: For any set of connected peers where some subset is unreachable,
   * the result contains pools from reachable peers and unreachablePeers lists
   * exactly the peers that could not be reached.
   *
   * **Validates: Requirements 7.5**
   */
  it('Property 8: partial results from reachable peers, unreachable peers listed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbPoolInfo, { minLength: 1, maxLength: 5 }),
        fc.array(arbNodeId, { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 1 }),
        async (pools, peerIds, unreachableCount) => {
          const uniquePeerIds = [...new Set(peerIds)];
          if (uniquePeerIds.length < 2) return;

          // Make publicRead so ACL doesn't interfere
          const publicPools = pools.map((p) => ({ ...p, publicRead: true }));
          const dedupedPools = deduplicateByPoolId(publicPools);

          // Split peers into reachable and unreachable
          const actualUnreachable = Math.min(
            Math.max(unreachableCount % uniquePeerIds.length, 1),
            uniquePeerIds.length - 1,
          );
          const unreachable = uniquePeerIds.slice(0, actualUnreachable);
          const reachable = uniquePeerIds.slice(actualUnreachable);

          const queryProvider = new MockPoolQueryProvider();
          for (const peerId of reachable) {
            queryProvider.setPeerPools(peerId, dedupedPools);
          }
          for (const peerId of unreachable) {
            queryProvider.setUnreachable(peerId);
          }

          const adminContext: IMemberContext = {
            memberId: 'admin-1',
            username: 'admin',
            type: MemberType.Admin,
            iat: 0,
            exp: 0,
          };

          const service = createTestService(uniquePeerIds, queryProvider);
          const result = await service.discoverPools(adminContext);

          // Unreachable peers are listed
          expect(new Set(result.unreachablePeers)).toEqual(
            new Set(unreachable),
          );

          // Reachable peers are in queriedPeers
          expect(new Set(result.queriedPeers)).toEqual(new Set(reachable));

          // Pools from reachable peers are present
          if (reachable.length > 0) {
            expect(result.pools.length).toBe(dedupedPools.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 11: Pool announcement cache update invariant
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 11: Pool announcement cache update invariant', () => {
  /**
   * Property 11: For any pool announcement received from a peer, after processing,
   * the cache contains an entry for that pool with the announcing node in its
   * hosting nodes list.
   *
   * **Validates: Requirements 8.3**
   */
  it('Property 11: cache contains announced pool with correct hosting node', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbNodeId,
        fc.record({
          blockCount: fc.nat({ max: 1_000_000 }),
          totalSize: fc.nat({ max: Number.MAX_SAFE_INTEGER }),
          encrypted: fc.boolean(),
        }),
        (poolId, nodeId, metadata: PoolAnnouncementMetadata) => {
          const queryProvider = new MockPoolQueryProvider();
          const service = createTestService([], queryProvider);

          const announcement: BlockAnnouncement = {
            type: 'pool_announce',
            blockId: '',
            poolId,
            nodeId,
            timestamp: new Date(),
            ttl: 3,
            poolAnnouncement: metadata,
          };

          service.handlePoolAnnouncement(announcement);

          const cache = service.getRemotePoolCache();
          const entry = cache.get(poolId);

          expect(entry).toBeDefined();
          expect(entry?.poolId).toBe(poolId);
          expect(entry?.hostingNodes.has(nodeId)).toBe(true);
          expect(entry?.blockCount).toBe(metadata.blockCount);
          expect(entry?.totalSize).toBe(metadata.totalSize);
          expect(entry?.encrypted).toBe(metadata.encrypted);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11b: Multiple announcements from different nodes for the same pool
   * accumulate hosting nodes in the cache.
   *
   * **Validates: Requirements 8.3**
   */
  it('Property 11b: multiple announcements accumulate hosting nodes', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        fc.array(arbNodeId, { minLength: 2, maxLength: 5 }),
        (poolId, nodeIds) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          if (uniqueNodeIds.length < 2) return;

          const queryProvider = new MockPoolQueryProvider();
          const service = createTestService([], queryProvider);

          for (const nodeId of uniqueNodeIds) {
            const announcement: BlockAnnouncement = {
              type: 'pool_announce',
              blockId: '',
              poolId,
              nodeId,
              timestamp: new Date(),
              ttl: 3,
              poolAnnouncement: {
                blockCount: 10,
                totalSize: 1000,
                encrypted: false,
              },
            };
            service.handlePoolAnnouncement(announcement);
          }

          const cache = service.getRemotePoolCache();
          const entry = cache.get(poolId);

          expect(entry).toBeDefined();
          for (const nodeId of uniqueNodeIds) {
            expect(entry?.hostingNodes.has(nodeId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11c: Pool removal removes the node from hosting nodes,
   * and removes the entry entirely when no hosting nodes remain.
   *
   * **Validates: Requirements 8.3**
   */
  it('Property 11c: pool removal clears hosting node from cache', () => {
    fc.assert(
      fc.property(arbPoolId, arbNodeId, (poolId, nodeId) => {
        const queryProvider = new MockPoolQueryProvider();
        const service = createTestService([], queryProvider);

        // Add announcement
        const announcement: BlockAnnouncement = {
          type: 'pool_announce',
          blockId: '',
          poolId,
          nodeId,
          timestamp: new Date(),
          ttl: 3,
          poolAnnouncement: {
            blockCount: 10,
            totalSize: 1000,
            encrypted: false,
          },
        };
        service.handlePoolAnnouncement(announcement);

        // Remove
        service.handlePoolRemoval(poolId, nodeId);

        const cache = service.getRemotePoolCache();
        // Entry should be gone since it was the only hosting node
        expect(cache.has(poolId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Utility ──

function deduplicateByPoolId(pools: IPoolInfo<string>[]): IPoolInfo<string>[] {
  const seen = new Set<string>();
  return pools.filter((p) => {
    if (seen.has(p.poolId)) return false;
    seen.add(p.poolId);
    return true;
  });
}
