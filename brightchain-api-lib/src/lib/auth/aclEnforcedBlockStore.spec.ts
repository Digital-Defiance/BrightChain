/**
 * Unit tests for ACLEnforcedBlockStore.
 *
 * Tests verify that the wrapper correctly enforces ACL permissions
 * before delegating to the inner store, and that PermissionDeniedError
 * contains the expected diagnostic information.
 *
 * @see Requirements 11.4, 10.3, 10.4, 10.6
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { PoolPermission } from '@brightchain/brightchain-lib';

import {
  ACLEnforcedBlockStore,
  ACLProvider,
  PermissionDeniedError,
} from './aclEnforcedBlockStore';

/** Minimal mock of the pool-scoped methods we wrap. */
function createMockInnerStore() {
  return {
    getFromPool: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    putInPool: jest.fn().mockResolvedValue('block-hash-abc'),
    deleteFromPool: jest.fn().mockResolvedValue(undefined),
  };
}

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

describe('ACLEnforcedBlockStore', () => {
  const POOL = 'test-pool';
  const NODE_ID = 'node-abc';

  describe('getFromPool', () => {
    it('delegates to inner store when node has Read permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Read] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      const result = await store.getFromPool(POOL, 'hash-123');

      expect(inner.getFromPool).toHaveBeenCalledWith(POOL, 'hash-123');
      expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('allows Admin to read (Admin implies all permissions)', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Admin] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      await expect(store.getFromPool(POOL, 'hash-123')).resolves.toBeDefined();
    });

    it('throws PermissionDeniedError when node lacks Read permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Write] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );

      await expect(store.getFromPool(POOL, 'hash-123')).rejects.toThrow(
        PermissionDeniedError,
      );
      expect(inner.getFromPool).not.toHaveBeenCalled();
    });

    it('allows read on publicRead pool for non-member', async () => {
      const acl = buildACL(
        POOL,
        [{ nodeId: 'other-node', permissions: [PoolPermission.Admin] }],
        { publicRead: true },
      );
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      await expect(store.getFromPool(POOL, 'hash-123')).resolves.toBeDefined();
    });
  });

  describe('putInPool', () => {
    it('delegates to inner store when node has Write permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Write] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      const data = new Uint8Array([10, 20, 30]);
      const result = await store.putInPool(POOL, data);

      expect(inner.putInPool).toHaveBeenCalledWith(POOL, data, undefined);
      expect(result).toBe('block-hash-abc');
    });

    it('throws PermissionDeniedError when node has only Read permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Read] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );

      await expect(store.putInPool(POOL, new Uint8Array([1]))).rejects.toThrow(
        PermissionDeniedError,
      );
      expect(inner.putInPool).not.toHaveBeenCalled();
    });

    it('allows write on publicWrite pool for non-member', async () => {
      const acl = buildACL(
        POOL,
        [{ nodeId: 'other-node', permissions: [PoolPermission.Admin] }],
        { publicWrite: true },
      );
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      await expect(
        store.putInPool(POOL, new Uint8Array([1])),
      ).resolves.toBeDefined();
    });
  });

  describe('deleteFromPool', () => {
    it('delegates to inner store when node has Write permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Write] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );
      await store.deleteFromPool(POOL, 'hash-456');

      expect(inner.deleteFromPool).toHaveBeenCalledWith(POOL, 'hash-456');
    });

    it('throws PermissionDeniedError when node lacks Write permission', async () => {
      const acl = buildACL(POOL, [
        { nodeId: NODE_ID, permissions: [PoolPermission.Read] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );

      await expect(store.deleteFromPool(POOL, 'hash-456')).rejects.toThrow(
        PermissionDeniedError,
      );
      expect(inner.deleteFromPool).not.toHaveBeenCalled();
    });
  });

  describe('PermissionDeniedError', () => {
    it('includes pool ID, node ID, required and actual permissions in message', async () => {
      const acl = buildACL(POOL, [
        {
          nodeId: NODE_ID,
          permissions: [PoolPermission.Read, PoolPermission.Replicate],
        },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );

      try {
        await store.putInPool(POOL, new Uint8Array([1]));
        fail('Expected PermissionDeniedError');
      } catch (err) {
        expect(err).toBeInstanceOf(PermissionDeniedError);
        const pde = err as PermissionDeniedError;
        expect(pde.poolId).toBe(POOL);
        expect(pde.nodeId).toBe(NODE_ID);
        expect(pde.requiredPermission).toBe(PoolPermission.Write);
        expect(pde.actualPermissions).toEqual([
          PoolPermission.Read,
          PoolPermission.Replicate,
        ]);
        expect(pde.message).toContain(PoolPermission.Write);
        expect(pde.message).toContain(POOL);
        expect(pde.message).toContain(NODE_ID);
        expect(pde.name).toBe('PermissionDeniedError');
      }
    });

    it('reports empty permissions for non-member nodes', async () => {
      const acl = buildACL(POOL, [
        { nodeId: 'other-node', permissions: [PoolPermission.Admin] },
      ]);
      const aclProvider: ACLProvider = {
        getACL: jest.fn().mockResolvedValue(acl),
      };
      const inner = createMockInnerStore();

      const store = new ACLEnforcedBlockStore(
        inner as never,
        aclProvider,
        NODE_ID,
      );

      try {
        await store.getFromPool(POOL, 'hash');
        fail('Expected PermissionDeniedError');
      } catch (err) {
        const pde = err as PermissionDeniedError;
        expect(pde.actualPermissions).toEqual([]);
      }
    });
  });
});
