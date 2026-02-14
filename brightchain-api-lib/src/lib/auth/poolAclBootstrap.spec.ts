import { beforeEach, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';

import {
  hasPermission,
  hasQuorum,
  PoolPermission,
} from '@brightchain/brightchain-lib';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLBootstrap } from './poolAclBootstrap';
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

describe('PoolACLBootstrap', () => {
  const authenticator = new ECDSANodeAuthenticator();
  let store: PoolACLStore;
  let bootstrap: PoolACLBootstrap;
  let keyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
  let creatorNodeId: string;

  beforeEach(() => {
    store = new PoolACLStore(authenticator);
    bootstrap = new PoolACLBootstrap(store, authenticator);
    keyPair = generateKeyPair();
    creatorNodeId = authenticator.deriveNodeId(keyPair.publicKey);
  });

  describe('bootstrapPool', () => {
    it('should create an ACL with the creator as sole Admin', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(acl.poolId).toBe('my-pool');
      expect(acl.owner).toBe(creatorNodeId);
      expect(acl.members).toHaveLength(1);
      expect(acl.members[0].nodeId).toBe(creatorNodeId);
      expect(acl.members[0].permissions).toEqual([PoolPermission.Admin]);
      expect(acl.members[0].addedBy).toBe(creatorNodeId);
    });

    it('should return a valid block ID stored in the ACL store', async () => {
      const { aclBlockId } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(aclBlockId).toMatch(/^[0-9a-f]{64}$/);
      expect(store.hasBlock(aclBlockId)).toBe(true);
    });

    it('should sign the ACL with the creator key', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(acl.approvalSignatures).toHaveLength(1);
      expect(acl.approvalSignatures[0].nodeId).toBe(creatorNodeId);
      expect(acl.approvalSignatures[0].signature).toBeInstanceOf(Uint8Array);
      expect(acl.approvalSignatures[0].signature.length).toBeGreaterThan(0);
    });

    it('should default publicRead and publicWrite to false', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(acl.publicRead).toBe(false);
      expect(acl.publicWrite).toBe(false);
    });

    it('should set publicRead when option is true', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
        { publicRead: true },
      );

      expect(acl.publicRead).toBe(true);
      expect(acl.publicWrite).toBe(false);
    });

    it('should set publicWrite when option is true', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
        { publicWrite: true },
      );

      expect(acl.publicRead).toBe(false);
      expect(acl.publicWrite).toBe(true);
    });

    it('should set both public flags when both options are true', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
        { publicRead: true, publicWrite: true },
      );

      expect(acl.publicRead).toBe(true);
      expect(acl.publicWrite).toBe(true);
    });

    it('should set version to 1 for the initial ACL', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(acl.version).toBe(1);
    });

    it('should not set previousAclBlockId on the initial ACL', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      expect(acl.previousAclBlockId).toBeUndefined();
    });

    it('should allow single-node full Admin without quorum', async () => {
      const { acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      // Single admin: hasQuorum should be satisfied by design
      expect(hasQuorum(acl)).toBe(true);
      expect(hasPermission(acl, creatorNodeId, PoolPermission.Admin)).toBe(
        true,
      );
      expect(hasPermission(acl, creatorNodeId, PoolPermission.Read)).toBe(true);
      expect(hasPermission(acl, creatorNodeId, PoolPermission.Write)).toBe(
        true,
      );
      expect(hasPermission(acl, creatorNodeId, PoolPermission.Replicate)).toBe(
        true,
      );
    });

    it('should produce a loadable ACL from the store', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      const loaded = await store.loadACL(aclBlockId);
      expect(loaded.poolId).toBe(acl.poolId);
      expect(loaded.owner).toBe(acl.owner);
      expect(loaded.members).toHaveLength(1);
      expect(loaded.members[0].nodeId).toBe(creatorNodeId);
    });

    it('should support adding a first additional node via updateACL', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'my-pool',
        keyPair.privateKey,
      );

      // Add a second node
      const secondKeyPair = generateKeyPair();
      const secondNodeId = authenticator.deriveNodeId(secondKeyPair.publicKey);

      const updatedAcl = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: secondNodeId,
            permissions: [PoolPermission.Read, PoolPermission.Write],
            addedAt: new Date(),
            addedBy: creatorNodeId,
          },
        ],
      };

      const newBlockId = await store.updateACL(
        aclBlockId,
        updatedAcl,
        keyPair.privateKey,
      );

      const loaded = await store.loadACL(newBlockId);
      expect(loaded.members).toHaveLength(2);
      expect(loaded.members[1].nodeId).toBe(secondNodeId);
      expect(loaded.previousAclBlockId).toBe(aclBlockId);
      expect(loaded.version).toBe(2);
    });

    it('should produce different block IDs for different pools', async () => {
      const { aclBlockId: id1 } = await bootstrap.bootstrapPool(
        'pool-a',
        keyPair.privateKey,
      );
      const { aclBlockId: id2 } = await bootstrap.bootstrapPool(
        'pool-b',
        keyPair.privateKey,
      );

      expect(id1).not.toBe(id2);
    });
  });
});
