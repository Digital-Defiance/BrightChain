/**
 * Property-based tests for Pool ACL system (Properties 23–29).
 *
 * Feature: architectural-gaps
 *
 * Tests cover permission enforcement, ACL completeness, pool creation
 * bootstrap, public access flags, quorum requirements, chain integrity,
 * and the minimum admin invariant.
 */
import { describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import fc from 'fast-check';

import type { IPoolACL, IPoolACLMember } from '@brightchain/brightchain-lib';
import {
  hasPermission,
  hasQuorum,
  PoolPermission,
} from '@brightchain/brightchain-lib';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLBootstrap } from './poolAclBootstrap';
import { PoolACLStore } from './poolAclStore';
import { LastAdminError, PoolACLUpdater } from './poolAclUpdater';

// ---------------------------------------------------------------------------
// Helpers & Arbitraries
// ---------------------------------------------------------------------------

interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  nodeId: string;
}

const authenticator = new ECDSANodeAuthenticator();

function generateKeyPair(): KeyPair {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  const privateKey = new Uint8Array(ecdh.getPrivateKey());
  const publicKey = new Uint8Array(ecdh.getPublicKey());
  return {
    privateKey,
    publicKey,
    nodeId: authenticator.deriveNodeId(publicKey),
  };
}

/** Arbitrary that produces a fresh secp256k1 key pair per sample. */
const arbKeyPair: fc.Arbitrary<KeyPair> = fc
  .constant(null)
  .map(() => generateKeyPair());

/** Arbitrary for a non-Admin permission subset (at least one). */
const arbNonAdminPermissions: fc.Arbitrary<PoolPermission[]> = fc
  .subarray(
    [PoolPermission.Read, PoolPermission.Write, PoolPermission.Replicate],
    { minLength: 1 },
  )
  .map((perms) => [...perms]); // ensure fresh array

/** Arbitrary pool ID (alphanumeric 1-20 chars). */
const arbPoolId: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,20}$/,
);

/** Arbitrary boolean pair for public flags. */
const arbPublicFlags: fc.Arbitrary<{
  publicRead: boolean;
  publicWrite: boolean;
}> = fc.record({ publicRead: fc.boolean(), publicWrite: fc.boolean() });

/**
 * Build a minimal valid ACL from a list of members (first member is owner/Admin).
 * The first member always gets Admin permission to satisfy the invariant.
 */
function buildACL(
  poolId: string,
  members: Array<{ nodeId: string; permissions: PoolPermission[] }>,
  flags: { publicRead: boolean; publicWrite: boolean },
): IPoolACL<string> {
  const now = new Date();
  const owner = members[0].nodeId;
  const aclMembers: IPoolACLMember<string>[] = members.map((m) => ({
    nodeId: m.nodeId,
    permissions: m.permissions,
    addedAt: now,
    addedBy: owner,
  }));

  return {
    poolId,
    owner,
    members: aclMembers,
    publicRead: flags.publicRead,
    publicWrite: flags.publicWrite,
    approvalSignatures: [{ nodeId: owner, signature: new Uint8Array([1]) }],
    version: 1,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Property 23: ACL permission enforcement
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 23: ACL permission enforcement', () => {
  it('Property 23a: Admin permission implies all other permissions — **Validates: Requirements 10.3, 10.4, 10.5, 11.4, 11.5, 11.6, 11.7**', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbKeyPair,
        arbPublicFlags,
        (poolId, kp, flags) => {
          const acl = buildACL(
            poolId,
            [{ nodeId: kp.nodeId, permissions: [PoolPermission.Admin] }],
            flags,
          );

          // Admin implies Read, Write, Replicate, and Admin itself
          expect(hasPermission(acl, kp.nodeId, PoolPermission.Read)).toBe(true);
          expect(hasPermission(acl, kp.nodeId, PoolPermission.Write)).toBe(
            true,
          );
          expect(hasPermission(acl, kp.nodeId, PoolPermission.Replicate)).toBe(
            true,
          );
          expect(hasPermission(acl, kp.nodeId, PoolPermission.Admin)).toBe(
            true,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 23b: non-member without public flags fails all permission checks — **Validates: Requirements 10.3, 10.4, 10.5, 11.4, 11.5, 11.6, 11.7**', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbKeyPair,
        arbKeyPair,
        (poolId, admin, outsider) => {
          fc.pre(admin.nodeId !== outsider.nodeId);

          const acl = buildACL(
            poolId,
            [{ nodeId: admin.nodeId, permissions: [PoolPermission.Admin] }],
            { publicRead: false, publicWrite: false },
          );

          expect(hasPermission(acl, outsider.nodeId, PoolPermission.Read)).toBe(
            false,
          );
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Write),
          ).toBe(false);
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Replicate),
          ).toBe(false);
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Admin),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 23c: member with specific permissions succeeds only for those — **Validates: Requirements 10.3, 10.4, 10.5, 11.4, 11.5, 11.6, 11.7**', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbKeyPair,
        arbKeyPair,
        arbNonAdminPermissions,
        (poolId, admin, member, perms) => {
          fc.pre(admin.nodeId !== member.nodeId);

          const acl = buildACL(
            poolId,
            [
              { nodeId: admin.nodeId, permissions: [PoolPermission.Admin] },
              { nodeId: member.nodeId, permissions: perms },
            ],
            { publicRead: false, publicWrite: false },
          );

          const allNonAdmin = [
            PoolPermission.Read,
            PoolPermission.Write,
            PoolPermission.Replicate,
          ];

          for (const p of allNonAdmin) {
            expect(hasPermission(acl, member.nodeId, p)).toBe(
              perms.includes(p),
            );
          }
          // Non-admin member should never have Admin permission
          expect(hasPermission(acl, member.nodeId, PoolPermission.Admin)).toBe(
            false,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: ACL completeness
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 24: ACL completeness', () => {
  it('Property 24: every valid ACL contains required fields — **Validates: Requirements 11.2**', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbKeyPair,
        fc.integer({ min: 0, max: 4 }),
        arbPublicFlags,
        (poolId, admin, extraCount, flags) => {
          const members: Array<{
            nodeId: string;
            permissions: PoolPermission[];
          }> = [{ nodeId: admin.nodeId, permissions: [PoolPermission.Admin] }];
          for (let i = 0; i < extraCount; i++) {
            members.push({
              nodeId: generateKeyPair().nodeId,
              permissions: [PoolPermission.Read],
            });
          }

          const acl = buildACL(poolId, members, flags);

          // Pool ID present
          expect(acl.poolId).toBe(poolId);
          // Owner present
          expect(acl.owner).toBe(admin.nodeId);
          // At least one Admin member
          const admins = acl.members.filter((m) =>
            m.permissions.includes(PoolPermission.Admin),
          );
          expect(admins.length).toBeGreaterThanOrEqual(1);
          // Public flags present (boolean)
          expect(typeof acl.publicRead).toBe('boolean');
          expect(typeof acl.publicWrite).toBe('boolean');
          // Version number present
          expect(typeof acl.version).toBe('number');
          expect(acl.version).toBeGreaterThanOrEqual(1);
          // At least one approval signature
          expect(acl.approvalSignatures.length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Pool creation bootstrap
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 25: Pool creation bootstrap', () => {
  it('Property 25: bootstrapped ACL has one Admin member, version 1, valid signature — **Validates: Requirements 12.1, 12.3**', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbKeyPair, async (poolId, kp) => {
        const store = new PoolACLStore(authenticator);
        const bootstrap = new PoolACLBootstrap(store, authenticator);

        const { acl } = await bootstrap.bootstrapPool(poolId, kp.privateKey);

        // Exactly one member
        expect(acl.members).toHaveLength(1);
        // That member is Admin
        expect(acl.members[0].permissions).toContain(PoolPermission.Admin);
        // That member is the creator
        expect(acl.members[0].nodeId).toBe(kp.nodeId);
        // Version is 1
        expect(acl.version).toBe(1);
        // Has exactly one approval signature from the creator
        expect(acl.approvalSignatures).toHaveLength(1);
        expect(acl.approvalSignatures[0].nodeId).toBe(kp.nodeId);
        expect(acl.approvalSignatures[0].signature.length).toBeGreaterThan(0);
        // No previous ACL
        expect(acl.previousAclBlockId).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 26: Public access flags
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 26: Public access flags', () => {
  it('Property 26: public flags grant access to non-members; without flags non-members are denied — **Validates: Requirements 12.5, 12.6**', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbKeyPair,
        arbKeyPair,
        arbPublicFlags,
        (poolId, admin, outsider, flags) => {
          fc.pre(admin.nodeId !== outsider.nodeId);

          const acl = buildACL(
            poolId,
            [{ nodeId: admin.nodeId, permissions: [PoolPermission.Admin] }],
            flags,
          );

          // Read check for non-member
          expect(hasPermission(acl, outsider.nodeId, PoolPermission.Read)).toBe(
            flags.publicRead,
          );
          // Write check for non-member
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Write),
          ).toBe(flags.publicWrite);
          // Replicate and Admin are never granted by public flags
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Replicate),
          ).toBe(false);
          expect(
            hasPermission(acl, outsider.nodeId, PoolPermission.Admin),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 27: Quorum requirement for ACL updates
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 27: Quorum requirement for ACL updates', () => {
  it('Property 27: quorum accepted iff signatures > N/2 for multi-admin; single admin always passes — **Validates: Requirements 13.1, 13.5**', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (adminCount, sigCount) => {
          const now = new Date();
          const members: IPoolACLMember<string>[] = [];
          for (let i = 0; i < adminCount; i++) {
            members.push({
              nodeId: `admin-${i}`,
              permissions: [PoolPermission.Admin],
              addedAt: now,
              addedBy: 'admin-0',
            });
          }

          const signatures: Array<{ nodeId: string; signature: Uint8Array }> =
            [];
          for (let i = 0; i < sigCount; i++) {
            signatures.push({
              nodeId: `admin-${i}`,
              signature: new Uint8Array([1]),
            });
          }

          const acl: IPoolACL<string> = {
            poolId: 'test-pool',
            owner: 'admin-0',
            members,
            publicRead: false,
            publicWrite: false,
            approvalSignatures: signatures,
            version: 1,
            updatedAt: now,
          };

          const result = hasQuorum(acl);

          if (adminCount <= 1) {
            // Single-admin mode: always passes
            expect(result).toBe(true);
          } else {
            // Multi-admin: need > N/2 signatures
            expect(result).toBe(sigCount > adminCount / 2);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 28: ACL chain integrity
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 28: ACL chain integrity', () => {
  it('Property 28: sequential updates form a linked list with incrementing versions — **Validates: Requirements 13.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbKeyPair,
        fc.integer({ min: 1, max: 4 }),
        async (poolId, admin, updateCount) => {
          const store = new PoolACLStore(authenticator);
          const bootstrap = new PoolACLBootstrap(store, authenticator);

          const { aclBlockId: firstBlockId, acl: firstAcl } =
            await bootstrap.bootstrapPool(poolId, admin.privateKey);

          let prevBlockId = firstBlockId;
          let prevAcl = firstAcl;

          for (let i = 0; i < updateCount; i++) {
            // Create a trivial update (add a new reader member)
            const newMember = generateKeyPair();
            const updatedAcl: IPoolACL<string> = {
              ...prevAcl,
              members: [
                ...prevAcl.members,
                {
                  nodeId: newMember.nodeId,
                  permissions: [PoolPermission.Read],
                  addedAt: new Date(),
                  addedBy: admin.nodeId,
                },
              ],
            };

            const newBlockId = await store.updateACL(
              prevBlockId,
              updatedAcl,
              admin.privateKey,
            );
            const loaded = await store.loadACL(newBlockId);

            // Chain reference: points to previous block
            expect(loaded.previousAclBlockId).toBe(prevBlockId);
            // Version increments by 1
            expect(loaded.version).toBe(prevAcl.version + 1);

            prevBlockId = newBlockId;
            prevAcl = loaded;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: ACL minimum admin invariant
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 29: ACL minimum admin invariant', () => {
  it('Property 29: proposing an ACL with zero admins is rejected — **Validates: Requirements 13.6**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbKeyPair,
        fc.integer({ min: 1, max: 3 }),
        async (poolId, admin, readerCount) => {
          const store = new PoolACLStore(authenticator);
          const updater = new PoolACLUpdater(store, authenticator);

          // Build a proposed ACL with only non-Admin members
          const now = new Date();
          const members: IPoolACLMember<string>[] = [];
          for (let i = 0; i < readerCount; i++) {
            members.push({
              nodeId: generateKeyPair().nodeId,
              permissions: [PoolPermission.Read],
              addedAt: now,
              addedBy: admin.nodeId,
            });
          }

          const zeroAdminAcl: IPoolACL<string> = {
            poolId,
            owner: admin.nodeId,
            members,
            publicRead: false,
            publicWrite: false,
            approvalSignatures: [],
            version: 2,
            updatedAt: now,
          };

          // proposeUpdate should reject because zero admins remain
          await expect(
            updater.proposeUpdate('fake-block-id', zeroAdminAcl),
          ).rejects.toThrow(LastAdminError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 29b: proposing an ACL with at least one Admin succeeds validation — **Validates: Requirements 13.6**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbKeyPair,
        fc.integer({ min: 0, max: 3 }),
        async (poolId, admin, readerCount) => {
          const store = new PoolACLStore(authenticator);
          const updater = new PoolACLUpdater(store, authenticator);

          const now = new Date();
          const members: IPoolACLMember<string>[] = [
            {
              nodeId: admin.nodeId,
              permissions: [PoolPermission.Admin],
              addedAt: now,
              addedBy: admin.nodeId,
            },
          ];
          for (let i = 0; i < readerCount; i++) {
            members.push({
              nodeId: generateKeyPair().nodeId,
              permissions: [PoolPermission.Read],
              addedAt: now,
              addedBy: admin.nodeId,
            });
          }

          const validAcl: IPoolACL<string> = {
            poolId,
            owner: admin.nodeId,
            members,
            publicRead: false,
            publicWrite: false,
            approvalSignatures: [],
            version: 2,
            updatedAt: now,
          };

          // Should not throw — at least one Admin exists
          const proposal = await updater.proposeUpdate(
            'fake-block-id',
            validAcl,
          );
          expect(proposal.proposedAcl.members.length).toBe(1 + readerCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
