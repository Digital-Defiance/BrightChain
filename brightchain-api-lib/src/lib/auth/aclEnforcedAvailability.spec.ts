/**
 * Unit tests for ACL-enforced availability wrappers (gossip, reconciliation, discovery).
 *
 * Tests verify that each wrapper correctly enforces ACL permissions and that
 * PermissionDeniedError contains the expected diagnostic information.
 *
 * @see Requirements 11.5, 11.6, 11.7
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { PoolPermission } from '@brightchain/brightchain-lib';

import {
  ACLEnforcedDiscovery,
  ACLEnforcedGossipFilter,
  ACLEnforcedReconciliation,
} from './aclEnforcedAvailability';
import { ACLProvider, PermissionDeniedError } from './aclEnforcedBlockStore';

/** Build a test ACL with the given members and flags. */
function buildACL(
  poolId: string,
  members: Array<{ nodeId: string; permissions: PoolPermission[] }>,
  opts?: { publicRead?: boolean; publicWrite?: boolean },
): IPoolACL<string> {
  return {
    poolId,
    owner: members[0]?.nodeId ?? 'owner',
    members: members.map((m) => ({
      nodeId: m.nodeId,
      permissions: m.permissions,
      addedAt: new Date(),
      addedBy: members[0]?.nodeId ?? 'owner',
    })),
    publicRead: opts?.publicRead ?? false,
    publicWrite: opts?.publicWrite ?? false,
    approvalSignatures: [],
    version: 1,
    updatedAt: new Date(),
  };
}

describe('ACLEnforcedGossipFilter', () => {
  const POOL = 'gossip-pool';

  it('accepts announcement from node with Write permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-a', permissions: [PoolPermission.Write] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'node-a')).toBe(true);
  });

  it('accepts announcement from node with Replicate permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-a', permissions: [PoolPermission.Replicate] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'node-a')).toBe(true);
  });

  it('accepts announcement from Admin (implies all permissions)', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-a', permissions: [PoolPermission.Admin] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'node-a')).toBe(true);
  });

  it('rejects announcement from node with only Read permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-a', permissions: [PoolPermission.Read] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'node-a')).toBe(false);
  });

  it('rejects announcement from non-member node', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'other-node', permissions: [PoolPermission.Admin] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'unknown-node')).toBe(
      false,
    );
  });

  it('accepts announcement from non-member on publicWrite pool', async () => {
    const acl = buildACL(
      POOL,
      [{ nodeId: 'admin', permissions: [PoolPermission.Admin] }],
      { publicWrite: true },
    );
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const filter = new ACLEnforcedGossipFilter(provider);

    expect(await filter.shouldAcceptAnnouncement(POOL, 'unknown-node')).toBe(
      true,
    );
  });
});

describe('ACLEnforcedReconciliation', () => {
  const POOL = 'recon-pool';
  const CURRENT_NODE = 'node-local';
  const PEER_NODE = 'node-peer';

  it('succeeds when both nodes have Replicate permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: CURRENT_NODE, permissions: [PoolPermission.Replicate] },
      { nodeId: PEER_NODE, permissions: [PoolPermission.Replicate] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const recon = new ACLEnforcedReconciliation(provider, CURRENT_NODE);

    await expect(
      recon.verifyReconciliationPermission(POOL, PEER_NODE),
    ).resolves.toBeUndefined();
  });

  it('succeeds when both nodes are Admin', async () => {
    const acl = buildACL(POOL, [
      { nodeId: CURRENT_NODE, permissions: [PoolPermission.Admin] },
      { nodeId: PEER_NODE, permissions: [PoolPermission.Admin] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const recon = new ACLEnforcedReconciliation(provider, CURRENT_NODE);

    await expect(
      recon.verifyReconciliationPermission(POOL, PEER_NODE),
    ).resolves.toBeUndefined();
  });

  it('throws when current node lacks Replicate permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: CURRENT_NODE, permissions: [PoolPermission.Read] },
      { nodeId: PEER_NODE, permissions: [PoolPermission.Replicate] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const recon = new ACLEnforcedReconciliation(provider, CURRENT_NODE);

    try {
      await recon.verifyReconciliationPermission(POOL, PEER_NODE);
      fail('Expected PermissionDeniedError');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const pde = err as PermissionDeniedError;
      expect(pde.poolId).toBe(POOL);
      expect(pde.nodeId).toBe(CURRENT_NODE);
      expect(pde.requiredPermission).toBe(PoolPermission.Replicate);
      expect(pde.actualPermissions).toEqual([PoolPermission.Read]);
    }
  });

  it('throws when peer node lacks Replicate permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: CURRENT_NODE, permissions: [PoolPermission.Replicate] },
      { nodeId: PEER_NODE, permissions: [PoolPermission.Read] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const recon = new ACLEnforcedReconciliation(provider, CURRENT_NODE);

    try {
      await recon.verifyReconciliationPermission(POOL, PEER_NODE);
      fail('Expected PermissionDeniedError');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const pde = err as PermissionDeniedError;
      expect(pde.poolId).toBe(POOL);
      expect(pde.nodeId).toBe(PEER_NODE);
      expect(pde.requiredPermission).toBe(PoolPermission.Replicate);
      expect(pde.actualPermissions).toEqual([PoolPermission.Read]);
    }
  });

  it('throws for non-member peer', async () => {
    const acl = buildACL(POOL, [
      { nodeId: CURRENT_NODE, permissions: [PoolPermission.Replicate] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const recon = new ACLEnforcedReconciliation(provider, CURRENT_NODE);

    try {
      await recon.verifyReconciliationPermission(POOL, 'stranger');
      fail('Expected PermissionDeniedError');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const pde = err as PermissionDeniedError;
      expect(pde.nodeId).toBe('stranger');
      expect(pde.actualPermissions).toEqual([]);
    }
  });
});

describe('ACLEnforcedDiscovery', () => {
  const POOL = 'discovery-pool';

  it('succeeds when querying node has Read permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-q', permissions: [PoolPermission.Read] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    await expect(
      discovery.verifyDiscoveryPermission(POOL, 'node-q'),
    ).resolves.toBeUndefined();
  });

  it('succeeds when querying node is Admin', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-q', permissions: [PoolPermission.Admin] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    await expect(
      discovery.verifyDiscoveryPermission(POOL, 'node-q'),
    ).resolves.toBeUndefined();
  });

  it('succeeds on publicRead pool for non-member', async () => {
    const acl = buildACL(
      POOL,
      [{ nodeId: 'admin', permissions: [PoolPermission.Admin] }],
      { publicRead: true },
    );
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    await expect(
      discovery.verifyDiscoveryPermission(POOL, 'unknown-node'),
    ).resolves.toBeUndefined();
  });

  it('throws when querying node has only Write permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-q', permissions: [PoolPermission.Write] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    try {
      await discovery.verifyDiscoveryPermission(POOL, 'node-q');
      fail('Expected PermissionDeniedError');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const pde = err as PermissionDeniedError;
      expect(pde.poolId).toBe(POOL);
      expect(pde.nodeId).toBe('node-q');
      expect(pde.requiredPermission).toBe(PoolPermission.Read);
      expect(pde.actualPermissions).toEqual([PoolPermission.Write]);
    }
  });

  it('throws for non-member on private pool', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'admin', permissions: [PoolPermission.Admin] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    try {
      await discovery.verifyDiscoveryPermission(POOL, 'stranger');
      fail('Expected PermissionDeniedError');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      const pde = err as PermissionDeniedError;
      expect(pde.nodeId).toBe('stranger');
      expect(pde.actualPermissions).toEqual([]);
    }
  });

  it('error message contains pool ID, node ID, and required permission', async () => {
    const acl = buildACL(POOL, [
      { nodeId: 'node-q', permissions: [PoolPermission.Replicate] },
    ]);
    const provider: ACLProvider = {
      getACL: jest.fn().mockResolvedValue(acl),
    };
    const discovery = new ACLEnforcedDiscovery(provider);

    try {
      await discovery.verifyDiscoveryPermission(POOL, 'node-q');
      fail('Expected PermissionDeniedError');
    } catch (err) {
      const pde = err as PermissionDeniedError;
      expect(pde.message).toContain(POOL);
      expect(pde.message).toContain('node-q');
      expect(pde.message).toContain(PoolPermission.Read);
      expect(pde.name).toBe('PermissionDeniedError');
    }
  });
});
