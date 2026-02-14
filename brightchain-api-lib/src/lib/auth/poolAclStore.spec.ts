import { beforeEach, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { PoolPermission } from '@brightchain/brightchain-lib';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLStore } from './poolAclStore';

/** Generate a secp256k1 key pair as raw bytes. */
function generateKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey()),
  };
}

/** Create a minimal valid ACL for testing. */
function createTestACL(nodeId: string): IPoolACL<string> {
  const now = new Date();
  return {
    poolId: 'test-pool',
    owner: nodeId,
    members: [
      {
        nodeId,
        permissions: [PoolPermission.Admin],
        addedAt: now,
        addedBy: nodeId,
      },
    ],
    publicRead: false,
    publicWrite: false,
    approvalSignatures: [],
    version: 1,
    updatedAt: now,
  };
}

describe('PoolACLStore', () => {
  const auth = new ECDSANodeAuthenticator();
  let store: PoolACLStore;
  let keyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
  let nodeId: string;

  beforeEach(() => {
    store = new PoolACLStore(auth);
    keyPair = generateKeyPair();
    nodeId = auth.deriveNodeId(keyPair.publicKey);
  });

  describe('storeACL', () => {
    it('should store an ACL and return a block ID', async () => {
      const acl = createTestACL(nodeId);
      const blockId = await store.storeACL(acl, keyPair.privateKey);

      expect(blockId).toMatch(/^[0-9a-f]{64}$/);
      expect(store.hasBlock(blockId)).toBe(true);
    });

    it('should produce different block IDs for different ACLs', async () => {
      const acl1 = createTestACL(nodeId);
      acl1.poolId = 'pool-a';
      const acl2 = createTestACL(nodeId);
      acl2.poolId = 'pool-b';

      const id1 = await store.storeACL(acl1, keyPair.privateKey);
      const id2 = await store.storeACL(acl2, keyPair.privateKey);

      expect(id1).not.toBe(id2);
    });
  });

  describe('loadACL', () => {
    it('should round-trip an ACL through store and load', async () => {
      const acl = createTestACL(nodeId);
      const blockId = await store.storeACL(acl, keyPair.privateKey);
      const loaded = await store.loadACL(blockId);

      expect(loaded.poolId).toBe(acl.poolId);
      expect(loaded.owner).toBe(acl.owner);
      expect(loaded.version).toBe(acl.version);
      expect(loaded.publicRead).toBe(acl.publicRead);
      expect(loaded.publicWrite).toBe(acl.publicWrite);
      expect(loaded.members).toHaveLength(1);
      expect(loaded.members[0].nodeId).toBe(nodeId);
      expect(loaded.members[0].permissions).toEqual([PoolPermission.Admin]);
    });

    it('should restore approvalSignatures from the signed block', async () => {
      const acl = createTestACL(nodeId);
      const blockId = await store.storeACL(acl, keyPair.privateKey);
      const loaded = await store.loadACL(blockId);

      expect(loaded.approvalSignatures).toHaveLength(1);
      expect(loaded.approvalSignatures[0].nodeId).toBe(nodeId);
      expect(loaded.approvalSignatures[0].signature).toBeInstanceOf(Uint8Array);
      expect(loaded.approvalSignatures[0].signature.length).toBeGreaterThan(0);
    });

    it('should throw for non-existent block ID', async () => {
      await expect(store.loadACL('nonexistent')).rejects.toThrow(
        'ACL block not found: nonexistent',
      );
    });

    it('should throw when signer is not a member', async () => {
      // Subclass to inject a tampered block for testing
      class TestableStore extends PoolACLStore {
        injectBlock(id: string, data: Uint8Array): void {
          this.blocks.set(id, data);
        }
      }

      const testStore = new TestableStore(auth);

      // Build a signed block where the signer nodeId doesn't match any ACL member
      const acl = createTestACL(nodeId);
      const aclJson = JSON.stringify({
        poolId: acl.poolId,
        owner: acl.owner,
        members: acl.members.map((m) => ({
          ...m,
          addedAt: m.addedAt.toISOString(),
        })),
        publicRead: false,
        publicWrite: false,
        version: 1,
        updatedAt: acl.updatedAt.toISOString(),
      });

      const signedBlock = {
        aclJson,
        signatures: [{ nodeId: 'unknown-node', signature: 'deadbeef' }],
      };

      const blockBytes = new TextEncoder().encode(JSON.stringify(signedBlock));
      const tamperedId = crypto
        .createHash('sha256')
        .update(Buffer.from(blockBytes))
        .digest('hex');

      testStore.injectBlock(tamperedId, blockBytes);

      await expect(testStore.loadACL(tamperedId)).rejects.toThrow(
        'Signer unknown-node is not a member of the ACL',
      );
    });

    it('should preserve Date fields through serialization', async () => {
      const acl = createTestACL(nodeId);
      const blockId = await store.storeACL(acl, keyPair.privateKey);
      const loaded = await store.loadACL(blockId);

      expect(loaded.updatedAt).toBeInstanceOf(Date);
      expect(loaded.members[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateACL', () => {
    it('should set previousAclBlockId to the current block ID', async () => {
      const acl = createTestACL(nodeId);
      const firstBlockId = await store.storeACL(acl, keyPair.privateKey);

      const updatedAcl = createTestACL(nodeId);
      const secondBlockId = await store.updateACL(
        firstBlockId,
        updatedAcl,
        keyPair.privateKey,
      );

      const loaded = await store.loadACL(secondBlockId);
      expect(loaded.previousAclBlockId).toBe(firstBlockId);
    });

    it('should increment the version number', async () => {
      const acl = createTestACL(nodeId);
      const firstBlockId = await store.storeACL(acl, keyPair.privateKey);

      const updatedAcl = createTestACL(nodeId);
      const secondBlockId = await store.updateACL(
        firstBlockId,
        updatedAcl,
        keyPair.privateKey,
      );

      const loaded = await store.loadACL(secondBlockId);
      expect(loaded.version).toBe(2);
    });

    it('should form a chain across multiple updates', async () => {
      const acl = createTestACL(nodeId);
      const id1 = await store.storeACL(acl, keyPair.privateKey);

      const acl2 = createTestACL(nodeId);
      const id2 = await store.updateACL(id1, acl2, keyPair.privateKey);

      const acl3 = createTestACL(nodeId);
      const id3 = await store.updateACL(id2, acl3, keyPair.privateKey);

      const loaded3 = await store.loadACL(id3);
      expect(loaded3.version).toBe(3);
      expect(loaded3.previousAclBlockId).toBe(id2);

      const loaded2 = await store.loadACL(id2);
      expect(loaded2.version).toBe(2);
      expect(loaded2.previousAclBlockId).toBe(id1);

      const loaded1 = await store.loadACL(id1);
      expect(loaded1.version).toBe(1);
      expect(loaded1.previousAclBlockId).toBeUndefined();
    });

    it('should throw when current block ID does not exist', async () => {
      const acl = createTestACL(nodeId);
      await expect(
        store.updateACL('nonexistent', acl, keyPair.privateKey),
      ).rejects.toThrow('Current ACL block not found: nonexistent');
    });

    it('should preserve ACL content through update', async () => {
      const acl = createTestACL(nodeId);
      const firstBlockId = await store.storeACL(acl, keyPair.privateKey);

      // Add a second member in the update
      const secondKeyPair = generateKeyPair();
      const secondNodeId = auth.deriveNodeId(secondKeyPair.publicKey);

      const updatedAcl = createTestACL(nodeId);
      updatedAcl.members.push({
        nodeId: secondNodeId,
        permissions: [PoolPermission.Read, PoolPermission.Write],
        addedAt: new Date(),
        addedBy: nodeId,
      });

      const secondBlockId = await store.updateACL(
        firstBlockId,
        updatedAcl,
        keyPair.privateKey,
      );

      const loaded = await store.loadACL(secondBlockId);
      expect(loaded.members).toHaveLength(2);
      expect(loaded.members[1].nodeId).toBe(secondNodeId);
      expect(loaded.members[1].permissions).toEqual([
        PoolPermission.Read,
        PoolPermission.Write,
      ]);
    });
  });

  describe('hasBlock', () => {
    it('should return true for stored blocks', async () => {
      const acl = createTestACL(nodeId);
      const blockId = await store.storeACL(acl, keyPair.privateKey);
      expect(store.hasBlock(blockId)).toBe(true);
    });

    it('should return false for non-existent blocks', () => {
      expect(store.hasBlock('nonexistent')).toBe(false);
    });
  });
});
