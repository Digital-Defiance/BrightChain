import { beforeEach, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { hasQuorum, PoolPermission } from '@brightchain/brightchain-lib';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLBootstrap } from './poolAclBootstrap';
import { PoolACLStore } from './poolAclStore';
import {
  InsufficientQuorumError,
  LastAdminError,
  PoolACLUpdater,
} from './poolAclUpdater';

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

describe('PoolACLUpdater', () => {
  const authenticator = new ECDSANodeAuthenticator();
  let store: PoolACLStore;
  let bootstrap: PoolACLBootstrap;
  let updater: PoolACLUpdater;

  // Admin key pairs and node IDs
  let admin1: { privateKey: Uint8Array; publicKey: Uint8Array };
  let admin1NodeId: string;
  let admin2: { privateKey: Uint8Array; publicKey: Uint8Array };
  let admin2NodeId: string;
  let admin3: { privateKey: Uint8Array; publicKey: Uint8Array };
  let admin3NodeId: string;

  // Non-admin key pair
  let reader: { privateKey: Uint8Array; publicKey: Uint8Array };
  let readerNodeId: string;

  beforeEach(() => {
    store = new PoolACLStore(authenticator);
    bootstrap = new PoolACLBootstrap(store, authenticator);
    updater = new PoolACLUpdater(store, authenticator);

    admin1 = generateKeyPair();
    admin1NodeId = authenticator.deriveNodeId(admin1.publicKey);
    admin2 = generateKeyPair();
    admin2NodeId = authenticator.deriveNodeId(admin2.publicKey);
    admin3 = generateKeyPair();
    admin3NodeId = authenticator.deriveNodeId(admin3.publicKey);
    reader = generateKeyPair();
    readerNodeId = authenticator.deriveNodeId(reader.publicKey);
  });

  describe('proposeUpdate', () => {
    it('should return a proposal with empty signatures', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);

      expect(proposal.currentBlockId).toBe(aclBlockId);
      expect(proposal.proposedAcl).toBe(proposedAcl);
      expect(proposal.signatures).toHaveLength(0);
    });

    it('should throw LastAdminError if proposed ACL has no admins', async () => {
      const { aclBlockId } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const noAdminAcl: IPoolACL<string> = {
        poolId: 'pool-1',
        owner: admin1NodeId,
        members: [
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
        publicRead: false,
        publicWrite: false,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      };

      await expect(
        updater.proposeUpdate(aclBlockId, noAdminAcl),
      ).rejects.toThrow(LastAdminError);
    });

    it('should accept a proposal that retains at least one admin', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      // Propose adding a reader — admin1 still remains
      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);
      expect(proposal).toBeDefined();
    });
  });

  describe('addSignature', () => {
    it('should add a signature to the proposal', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposal = await updater.proposeUpdate(aclBlockId, acl);
      await updater.addSignature(proposal, admin1.privateKey);

      expect(proposal.signatures).toHaveLength(1);
      expect(proposal.signatures[0].nodeId).toBe(admin1NodeId);
      expect(proposal.signatures[0].signature).toBeInstanceOf(Uint8Array);
      expect(proposal.signatures[0].signature.length).toBeGreaterThan(0);
    });

    it('should allow multiple signatures from different admins', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposal = await updater.proposeUpdate(aclBlockId, acl);
      await updater.addSignature(proposal, admin1.privateKey);
      await updater.addSignature(proposal, admin2.privateKey);

      expect(proposal.signatures).toHaveLength(2);
      expect(proposal.signatures[0].nodeId).toBe(admin1NodeId);
      expect(proposal.signatures[1].nodeId).toBe(admin2NodeId);
    });
  });

  describe('applyUpdate - single admin (no quorum required)', () => {
    it('should apply update with single admin signature', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      // Propose adding a reader
      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);
      await updater.addSignature(proposal, admin1.privateKey);

      const newBlockId = await updater.applyUpdate(proposal);
      expect(newBlockId).toMatch(/^[0-9a-f]{64}$/);
      expect(store.hasBlock(newBlockId)).toBe(true);
    });

    it('should chain the new ACL to the previous block', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposal = await updater.proposeUpdate(aclBlockId, acl);
      await updater.addSignature(proposal, admin1.privateKey);

      const newBlockId = await updater.applyUpdate(proposal);
      const loaded = await store.loadACL(newBlockId);

      expect(loaded.previousAclBlockId).toBe(aclBlockId);
      expect(loaded.version).toBe(2);
    });

    it('should allow single admin to update without quorum', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      // Add a second admin via proposal
      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);
      await updater.addSignature(proposal, admin1.privateKey);

      // Single admin — should succeed with just one signature
      const newBlockId = await updater.applyUpdate(proposal);
      expect(newBlockId).toBeDefined();
    });
  });

  describe('applyUpdate - multi-admin quorum', () => {
    let multiAdminBlockId: string;
    let multiAdminAcl: IPoolACL<string>;

    beforeEach(async () => {
      // Bootstrap with admin1, then add admin2 and admin3
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
          {
            nodeId: admin3NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      // Single admin at this point, so one signature suffices
      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);
      await updater.addSignature(proposal, admin1.privateKey);
      multiAdminBlockId = await updater.applyUpdate(proposal);
      multiAdminAcl = await store.loadACL(multiAdminBlockId);
    });

    it('should reject update with only 1 of 3 admin signatures', async () => {
      const proposedAcl: IPoolACL<string> = {
        ...multiAdminAcl,
        members: [
          ...multiAdminAcl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(
        multiAdminBlockId,
        proposedAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);

      await expect(updater.applyUpdate(proposal)).rejects.toThrow(
        InsufficientQuorumError,
      );
    });

    it('should accept update with 2 of 3 admin signatures (>50%)', async () => {
      const proposedAcl: IPoolACL<string> = {
        ...multiAdminAcl,
        members: [
          ...multiAdminAcl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(
        multiAdminBlockId,
        proposedAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);
      await updater.addSignature(proposal, admin2.privateKey);

      const newBlockId = await updater.applyUpdate(proposal);
      expect(newBlockId).toMatch(/^[0-9a-f]{64}$/);

      const loaded = await store.loadACL(newBlockId);
      expect(loaded.members).toHaveLength(4);
      expect(loaded.previousAclBlockId).toBe(multiAdminBlockId);
    });

    it('should accept update with all 3 admin signatures', async () => {
      const proposal = await updater.proposeUpdate(
        multiAdminBlockId,
        multiAdminAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);
      await updater.addSignature(proposal, admin2.privateKey);
      await updater.addSignature(proposal, admin3.privateKey);

      const newBlockId = await updater.applyUpdate(proposal);
      expect(newBlockId).toBeDefined();
    });

    it('should verify quorum via hasQuorum from brightchain-lib', async () => {
      const proposedAcl: IPoolACL<string> = {
        ...multiAdminAcl,
        members: [
          ...multiAdminAcl.members,
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      // 2 of 3 admins — hasQuorum should return true
      const aclWith2Sigs: IPoolACL<string> = {
        ...proposedAcl,
        approvalSignatures: [
          { nodeId: admin1NodeId, signature: new Uint8Array(1) },
          { nodeId: admin2NodeId, signature: new Uint8Array(1) },
        ],
      };
      expect(hasQuorum(aclWith2Sigs)).toBe(true);

      // 1 of 3 admins — hasQuorum should return false
      const aclWith1Sig: IPoolACL<string> = {
        ...proposedAcl,
        approvalSignatures: [
          { nodeId: admin1NodeId, signature: new Uint8Array(1) },
        ],
      };
      expect(hasQuorum(aclWith1Sig)).toBe(false);
    });
  });

  describe('applyUpdate - two admin quorum', () => {
    let twoAdminBlockId: string;
    let twoAdminAcl: IPoolACL<string>;

    beforeEach(async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const proposedAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const proposal = await updater.proposeUpdate(aclBlockId, proposedAcl);
      await updater.addSignature(proposal, admin1.privateKey);
      twoAdminBlockId = await updater.applyUpdate(proposal);
      twoAdminAcl = await store.loadACL(twoAdminBlockId);
    });

    it('should reject update with 1 of 2 admin signatures', async () => {
      const proposal = await updater.proposeUpdate(
        twoAdminBlockId,
        twoAdminAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);

      await expect(updater.applyUpdate(proposal)).rejects.toThrow(
        InsufficientQuorumError,
      );
    });

    it('should accept update with 2 of 2 admin signatures', async () => {
      const proposal = await updater.proposeUpdate(
        twoAdminBlockId,
        twoAdminAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);
      await updater.addSignature(proposal, admin2.privateKey);

      const newBlockId = await updater.applyUpdate(proposal);
      expect(newBlockId).toBeDefined();
    });
  });

  describe('prevent removal of last admin', () => {
    it('should throw LastAdminError when removing the only admin', async () => {
      const { aclBlockId } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const noAdminAcl: IPoolACL<string> = {
        poolId: 'pool-1',
        owner: admin1NodeId,
        members: [
          {
            nodeId: readerNodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
        publicRead: false,
        publicWrite: false,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      };

      await expect(
        updater.proposeUpdate(aclBlockId, noAdminAcl),
      ).rejects.toThrow(LastAdminError);
      await expect(
        updater.proposeUpdate(aclBlockId, noAdminAcl),
      ).rejects.toThrow('Cannot remove the last Admin from the ACL');
    });

    it('should throw LastAdminError when all members have non-admin permissions', async () => {
      const { aclBlockId } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const noAdminAcl: IPoolACL<string> = {
        poolId: 'pool-1',
        owner: admin1NodeId,
        members: [
          {
            nodeId: admin1NodeId,
            permissions: [PoolPermission.Read, PoolPermission.Write],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Read],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
        publicRead: false,
        publicWrite: false,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      };

      await expect(
        updater.proposeUpdate(aclBlockId, noAdminAcl),
      ).rejects.toThrow(LastAdminError);
    });

    it('should allow removing an admin if another admin remains', async () => {
      // Bootstrap and add admin2
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      const twoAdminAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const addProposal = await updater.proposeUpdate(aclBlockId, twoAdminAcl);
      await updater.addSignature(addProposal, admin1.privateKey);
      const twoAdminBlockId = await updater.applyUpdate(addProposal);

      // Now remove admin1, keeping admin2
      const removeAcl: IPoolACL<string> = {
        ...twoAdminAcl,
        members: [
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      // Should not throw — admin2 remains
      const proposal = await updater.proposeUpdate(twoAdminBlockId, removeAcl);
      expect(proposal).toBeDefined();
    });
  });

  describe('InsufficientQuorumError', () => {
    it('should include required and actual counts', async () => {
      const { aclBlockId, acl } = await bootstrap.bootstrapPool(
        'pool-1',
        admin1.privateKey,
      );

      // Add two more admins (3 total)
      const threeAdminAcl: IPoolACL<string> = {
        ...acl,
        members: [
          ...acl.members,
          {
            nodeId: admin2NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
          {
            nodeId: admin3NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
      };

      const setupProposal = await updater.proposeUpdate(
        aclBlockId,
        threeAdminAcl,
      );
      await updater.addSignature(setupProposal, admin1.privateKey);
      const threeAdminBlockId = await updater.applyUpdate(setupProposal);

      // Now try to update with only 1 signature
      const proposal = await updater.proposeUpdate(
        threeAdminBlockId,
        threeAdminAcl,
      );
      await updater.addSignature(proposal, admin1.privateKey);

      try {
        await updater.applyUpdate(proposal);
        fail('Expected InsufficientQuorumError');
      } catch (err) {
        expect(err).toBeInstanceOf(InsufficientQuorumError);
        const quorumErr = err as InsufficientQuorumError;
        expect(quorumErr.actual).toBe(1);
        expect(quorumErr.required).toBe(1); // floor(3/2) = 1, need > 1
        expect(quorumErr.name).toBe('InsufficientQuorumError');
      }
    });
  });

  describe('validateMinAdmin', () => {
    it('should not throw when at least one admin exists', () => {
      const acl: IPoolACL<string> = {
        poolId: 'pool-1',
        owner: admin1NodeId,
        members: [
          {
            nodeId: admin1NodeId,
            permissions: [PoolPermission.Admin],
            addedAt: new Date(),
            addedBy: admin1NodeId,
          },
        ],
        publicRead: false,
        publicWrite: false,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      };

      expect(() => updater.validateMinAdmin(acl)).not.toThrow();
    });

    it('should throw LastAdminError when no admin exists', () => {
      const acl: IPoolACL<string> = {
        poolId: 'pool-1',
        owner: admin1NodeId,
        members: [],
        publicRead: false,
        publicWrite: false,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      };

      expect(() => updater.validateMinAdmin(acl)).toThrow(LastAdminError);
    });
  });
});
