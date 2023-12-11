/**
 * @fileoverview Property-based tests for WriteAclManager.
 *
 * Tests correctness properties 3, 7, 9, 10, 11, 13, and 17 from the
 * BrightDB Write ACLs design document using fast-check.
 *
 * Uses the same MockAuthenticator pattern as writeAclManager.spec.ts:
 * signatures are valid when sig[0] === payload[0].
 */

import {
  AclAdminRequiredError,
  AclVersionConflictError,
  EncryptionMode,
  type IAclDocument,
  type IBlockStore,
  type ICapabilityToken,
  type INodeAuthenticator,
  LastAdministratorError,
  WriteMode,
  WriterNotInPoolError,
} from '@brightchain/brightchain-lib';
import { sha256 } from '@noble/hashes/sha256';
import fc from 'fast-check';
import { WriteAclManager } from './writeAclManager';

// ─── Test Helpers ────────────────────────────────────────────────────

/** Create a deterministic public key from a seed byte. */
function makePublicKey(seed: number): Uint8Array {
  const key = new Uint8Array(33);
  key[0] = 0x02;
  key[1] = seed;
  return key;
}

/**
 * Mock INodeAuthenticator that accepts signatures where
 * the first byte of the signature matches the first byte of the payload hash.
 */
class MockAuthenticator implements INodeAuthenticator {
  createChallenge(): Uint8Array {
    return new Uint8Array(32);
  }

  async signChallenge(
    challenge: Uint8Array,
    _privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    const sig = new Uint8Array(64);
    sig[0] = challenge[0];
    return sig;
  }

  async verifySignature(
    challenge: Uint8Array,
    signature: Uint8Array,
    _publicKey: Uint8Array,
  ): Promise<boolean> {
    return signature[0] === challenge[0];
  }

  deriveNodeId(publicKey: Uint8Array): string {
    return Buffer.from(publicKey).toString('hex');
  }
}

const mockBlockStore = {} as IBlockStore;

/**
 * Compute the ACL mutation payload hash matching WriteAclManager's private method.
 */
function computeAclMutationPayload(aclDoc: IAclDocument): Uint8Array {
  const writersHex = aclDoc.authorizedWriters
    .map((w) => Buffer.from(w).toString('hex'))
    .sort()
    .join(',');
  const adminsHex = aclDoc.aclAdministrators
    .map((a) => Buffer.from(a).toString('hex'))
    .sort()
    .join(',');
  const collName = aclDoc.scope.collectionName ?? '';
  const message = `acl:${aclDoc.scope.dbName}:${collName}:${aclDoc.version}:${aclDoc.writeMode}:writers=${writersHex}:admins=${adminsHex}`;
  const encoded = new TextEncoder().encode(message);
  return sha256(encoded);
}

/** Create a valid admin signature for a given ACL document. */
function makeValidAdminSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = payload[0];
  return sig;
}

/** Create an invalid admin signature for a given ACL document. */
function makeInvalidAdminSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = (payload[0] + 1) % 256;
  return sig;
}

/** Build a minimal IAclDocument for testing. */
function makeAclDocument(
  overrides: Partial<IAclDocument> & {
    scope: IAclDocument['scope'];
    writeMode: WriteMode;
  },
): IAclDocument {
  return {
    documentId: overrides.documentId ?? 'test-doc-id',
    writeMode: overrides.writeMode,
    authorizedWriters: overrides.authorizedWriters ?? [],
    aclAdministrators: overrides.aclAdministrators ?? [makePublicKey(0xff)],
    scope: overrides.scope,
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    creatorPublicKey: overrides.creatorPublicKey ?? makePublicKey(0x01),
    creatorSignature: overrides.creatorSignature ?? new Uint8Array(64),
    previousVersionBlockId: overrides.previousVersionBlockId,
  };
}

// ─── Generators ──────────────────────────────────────────────────────

/** Arbitrary non-empty string without colons (valid for scope names). */
const arbScopeName = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((s) => !s.includes(':') && s.trim().length > 0);

/** Arbitrary WriteMode */
const arbWriteMode = fc.constantFrom(
  WriteMode.Open,
  WriteMode.Restricted,
  WriteMode.OwnerOnly,
);

/** Arbitrary seed byte for public key generation (1-254 to avoid 0 and 255 reserved). */
const arbKeySeed = fc.integer({ min: 1, max: 254 });

// ─── Property 3: ACL Scope Resolution ────────────────────────────────

/**
 * Feature: brightdb-write-acls, Property 3: ACL Scope Resolution
 *
 * For any database name, collection name, database-level ACL, and optional
 * collection-level ACL: if a collection-level ACL exists, resolveAcl SHALL
 * return the collection-level ACL; otherwise, it SHALL return the database-level
 * ACL. If neither exists, the effective write mode SHALL be Open_Mode.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
describe('Feature: brightdb-write-acls, Property 3: ACL Scope Resolution', () => {
  it('returns collection-level ACL when present, else db-level, else Open_Mode', () => {
    fc.assert(
      fc.property(
        arbScopeName,
        arbScopeName,
        arbWriteMode,
        arbWriteMode,
        fc.boolean(),
        fc.boolean(),
        (dbName, collName, dbMode, collMode, hasDbAcl, hasCollAcl) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          if (hasDbAcl) {
            manager.setCachedAcl(
              makeAclDocument({
                writeMode: dbMode,
                scope: { dbName },
              }),
            );
          }

          if (hasCollAcl) {
            manager.setCachedAcl(
              makeAclDocument({
                writeMode: collMode,
                scope: { dbName, collectionName: collName },
              }),
            );
          }

          const effectiveMode = manager.getWriteMode(dbName, collName);

          if (hasCollAcl) {
            // Collection-level overrides
            return effectiveMode === collMode;
          } else if (hasDbAcl) {
            // Falls back to database-level
            return effectiveMode === dbMode;
          } else {
            // No ACL → Open_Mode
            return effectiveMode === WriteMode.Open;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('db-level ACL applies to collections without their own ACL', () => {
    fc.assert(
      fc.property(
        arbScopeName,
        arbScopeName,
        arbScopeName,
        arbWriteMode,
        arbWriteMode,
        (dbName, collWithAcl, collWithoutAcl, dbMode, collMode) => {
          // Ensure the two collection names are different
          fc.pre(collWithAcl !== collWithoutAcl);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          manager.setCachedAcl(
            makeAclDocument({
              writeMode: dbMode,
              scope: { dbName },
            }),
          );
          manager.setCachedAcl(
            makeAclDocument({
              writeMode: collMode,
              scope: { dbName, collectionName: collWithAcl },
            }),
          );

          // Collection with its own ACL gets collection-level mode
          const withAclMode = manager.getWriteMode(dbName, collWithAcl);
          // Collection without its own ACL inherits db-level mode
          const withoutAclMode = manager.getWriteMode(dbName, collWithoutAcl);

          return withAclMode === collMode && withoutAclMode === dbMode;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: ACL Management Requires Administrator Signature ─────

/**
 * Feature: brightdb-write-acls, Property 7: ACL Management Requires Administrator Signature
 *
 * For any ACL mutation (add writer, remove writer, add admin, remove admin,
 * change write mode), the operation SHALL succeed if and only if the request
 * is signed by a public key that appears in the current Write_ACL's
 * aclAdministrators list. The resulting ACL document SHALL have a version
 * number strictly greater than the previous version.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 1.5**
 */
describe('Feature: brightdb-write-acls, Property 7: ACL Management Requires Administrator Signature', () => {
  it('mutations succeed iff signed by current admin; version strictly increases', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        arbKeySeed,
        fc.constantFrom(
          'addWriter',
          'removeWriter',
          'addAdmin',
        ) as fc.Arbitrary<string>,
        async (dbName, adminSeed, nonAdminSeed, targetSeed, operation) => {
          // Ensure admin and non-admin are different
          fc.pre(adminSeed !== nonAdminSeed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const nonAdminKey = makePublicKey(nonAdminSeed);
          const targetKey = makePublicKey(targetSeed);

          // Set up initial ACL with adminKey as sole admin and targetKey as writer
          const initialAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            authorizedWriters: [targetKey],
            version: 1,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, adminKey);

          const versionBefore = manager.getAclDocument(dbName)?.version ?? 0;

          // Build the ACL doc that the mutation will operate on
          // (needed to compute the valid signature for the mutation)
          const currentAcl = manager.getAclDocument(dbName)!;

          // Compute valid signature for the mutation payload
          // The mutation methods internally call getOrCreateAcl then verifyAdminSignature
          // which computes payload from the *current* ACL doc
          const mutationPayload = computeAclMutationPayload(currentAcl);
          const validSig = new Uint8Array(64);
          validSig[0] = mutationPayload[0];
          const invalidSig = new Uint8Array(64);
          invalidSig[0] = (mutationPayload[0] + 1) % 256;

          // --- Non-admin should fail ---
          let nonAdminFailed = false;
          try {
            if (operation === 'addWriter') {
              await manager.addWriter(
                dbName,
                undefined,
                targetKey,
                validSig,
                nonAdminKey,
              );
            } else if (operation === 'removeWriter') {
              await manager.removeWriter(
                dbName,
                undefined,
                targetKey,
                validSig,
                nonAdminKey,
              );
            } else {
              await manager.addAdmin(
                dbName,
                undefined,
                targetKey,
                validSig,
                nonAdminKey,
              );
            }
          } catch (e) {
            if (e instanceof AclAdminRequiredError) {
              nonAdminFailed = true;
            }
          }

          if (!nonAdminFailed) return false;

          // Version should not have changed after failed attempt
          const versionAfterFail = manager.getAclDocument(dbName)?.version ?? 0;
          if (versionAfterFail !== versionBefore) return false;

          // --- Admin with valid signature should succeed ---
          let adminSucceeded = false;
          try {
            if (operation === 'addWriter') {
              await manager.addWriter(
                dbName,
                undefined,
                targetKey,
                validSig,
                adminKey,
              );
            } else if (operation === 'removeWriter') {
              await manager.removeWriter(
                dbName,
                undefined,
                targetKey,
                validSig,
                adminKey,
              );
            } else {
              await manager.addAdmin(
                dbName,
                undefined,
                targetKey,
                validSig,
                adminKey,
              );
            }
            adminSucceeded = true;
          } catch {
            adminSucceeded = false;
          }

          if (!adminSucceeded) return false;

          // Version must be strictly greater
          const versionAfterSuccess =
            manager.getAclDocument(dbName)?.version ?? 0;
          return versionAfterSuccess > versionBefore;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('admin with invalid signature is rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        async (dbName, adminSeed, targetSeed) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const targetKey = makePublicKey(targetSeed);

          // Set up initial ACL
          const initialAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, adminKey);

          const currentAcl = manager.getAclDocument(dbName)!;
          const badSig = makeInvalidAdminSignature(currentAcl);

          let rejected = false;
          try {
            await manager.addWriter(
              dbName,
              undefined,
              targetKey,
              badSig,
              adminKey,
            );
          } catch (e) {
            if (e instanceof AclAdminRequiredError) {
              rejected = true;
            }
          }
          return rejected;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: ACL Version Monotonicity ────────────────────────────

/**
 * Feature: brightdb-write-acls, Property 9: ACL Version Monotonicity
 *
 * For any ACL document update, the system SHALL accept the update if and only
 * if the incoming version number is strictly greater than the current version
 * number. Updates with equal or lower version numbers SHALL be rejected.
 *
 * **Validates: Requirements 2.6, 7.4**
 */
describe('Feature: brightdb-write-acls, Property 9: ACL Version Monotonicity', () => {
  it('accepts updates iff incoming version > current version', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 1000 }),
        async (dbName, adminSeed, currentVersion, incomingVersion) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);

          // Set initial ACL at currentVersion
          const initialAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: currentVersion,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, adminKey);

          // Attempt to set ACL at incomingVersion
          const newAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: incomingVersion,
          });
          const newSig = makeValidAdminSignature(newAcl);

          let accepted = false;
          let rejectedWithVersionConflict = false;
          try {
            await manager.setAcl(newAcl, newSig, adminKey);
            accepted = true;
          } catch (e) {
            if (e instanceof AclVersionConflictError) {
              rejectedWithVersionConflict = true;
            }
          }

          if (incomingVersion > currentVersion) {
            // Should be accepted
            return accepted && !rejectedWithVersionConflict;
          } else {
            // Should be rejected (equal or lower)
            return !accepted && rejectedWithVersionConflict;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: ACL Document Signature Verification on Load ────────

/**
 * Feature: brightdb-write-acls, Property 10: ACL Document Signature Verification on Load
 *
 * Loading a tampered ACL document fails; loading a correctly signed document
 * succeeds. Since WriteAclManager doesn't have a loadAclDocument method
 * (that's in AclDocumentStore), we test that setAcl rejects documents with
 * invalid admin signatures and accepts documents with valid ones.
 *
 * **Validates: Requirements 2.3, 2.4**
 */
describe('Feature: brightdb-write-acls, Property 10: ACL Document Signature Verification on Load', () => {
  it('setAcl rejects tampered signatures and accepts valid ones', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbWriteMode,
        fc.boolean(),
        async (dbName, adminSeed, writeMode, useValidSignature) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);

          const aclDoc = makeAclDocument({
            writeMode,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });

          const sig = useValidSignature
            ? makeValidAdminSignature(aclDoc)
            : makeInvalidAdminSignature(aclDoc);

          let accepted = false;
          let rejectedWithAdminError = false;
          try {
            await manager.setAcl(aclDoc, sig, adminKey);
            accepted = true;
          } catch (e) {
            if (e instanceof AclAdminRequiredError) {
              rejectedWithAdminError = true;
            }
          }

          if (useValidSignature) {
            return accepted && !rejectedWithAdminError;
          } else {
            return !accepted && rejectedWithAdminError;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Capability Token Temporal Validity ─────────────────

/**
 * Feature: brightdb-write-acls, Property 11: Capability Token Temporal Validity
 *
 * For any valid Capability_Token signed by a current ACL_Administrator,
 * a write request using that token SHALL succeed if and only if the current
 * time is before the token's expiresAt timestamp and the token's scope
 * matches the target database/collection.
 *
 * **Validates: Requirements 6.3**
 */
describe('Feature: brightdb-write-acls, Property 11: Capability Token Temporal Validity', () => {
  it('token accepted iff not expired, scope matches, and grantor is admin', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        fc.boolean(),
        fc.boolean(),
        async (dbName, adminSeed, granteeSeed, isExpired, isScopeMatch) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const granteeKey = makePublicKey(granteeSeed);

          // Set up ACL with admin
          const acl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });
          const aclSig = makeValidAdminSignature(acl);
          await manager.setAcl(acl, aclSig, adminKey);

          // Build token
          const expiresAt = isExpired
            ? new Date(Date.now() - 60000) // expired
            : new Date(Date.now() + 60000); // valid

          const tokenDbName = isScopeMatch ? dbName : dbName + '_other';

          // Compute the token payload to create a valid grantor signature
          const granteeHex = Buffer.from(granteeKey).toString('hex');
          const message = `${granteeHex}:${tokenDbName}::${expiresAt.toISOString()}`;
          const payloadHash = sha256(new TextEncoder().encode(message));

          const token: ICapabilityToken = {
            granteePublicKey: granteeKey,
            scope: { dbName: tokenDbName },
            expiresAt,
            grantorSignature: new Uint8Array([
              payloadHash[0],
              ...new Array(63).fill(0),
            ]),
            grantorPublicKey: adminKey,
          };

          const result = await manager.verifyCapabilityToken(token);

          // Token should be accepted only if not expired AND scope matches
          // (grantor is admin because we set up the ACL with adminKey)
          const shouldAccept = !isExpired && isScopeMatch;
          return result === shouldAccept;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('token rejected when grantor is not a current admin', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        arbKeySeed,
        async (dbName, adminSeed, nonAdminSeed, granteeSeed) => {
          fc.pre(adminSeed !== nonAdminSeed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const nonAdminKey = makePublicKey(nonAdminSeed);
          const granteeKey = makePublicKey(granteeSeed);

          // Set up ACL with adminKey only
          const acl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });
          const aclSig = makeValidAdminSignature(acl);
          await manager.setAcl(acl, aclSig, adminKey);

          // Build a valid (non-expired, matching scope) token but with non-admin grantor
          const expiresAt = new Date(Date.now() + 60000);
          const granteeHex = Buffer.from(granteeKey).toString('hex');
          const message = `${granteeHex}:${dbName}::${expiresAt.toISOString()}`;
          const payloadHash = sha256(new TextEncoder().encode(message));

          const token: ICapabilityToken = {
            granteePublicKey: granteeKey,
            scope: { dbName },
            expiresAt,
            grantorSignature: new Uint8Array([
              payloadHash[0],
              ...new Array(63).fill(0),
            ]),
            grantorPublicKey: nonAdminKey,
          };

          const result = await manager.verifyCapabilityToken(token);
          return result === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 17: Last Administrator Protection ──────────────────────

/**
 * Feature: brightdb-write-acls, Property 17: Last Administrator Protection
 *
 * For any Write_ACL with exactly one ACL_Administrator, attempting to remove
 * that administrator SHALL be rejected, leaving the ACL unchanged.
 *
 * **Validates: Requirements 4.5**
 */
describe('Feature: brightdb-write-acls, Property 17: Last Administrator Protection', () => {
  it('removing the sole admin is rejected; ACL remains unchanged', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbWriteMode,
        async (dbName, adminSeed, writeMode) => {
          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);

          // Set up ACL with exactly one admin
          const initialAcl = makeAclDocument({
            writeMode,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, adminKey);

          // Snapshot the ACL state before removal attempt
          const aclBefore = manager.getAclDocument(dbName)!;
          const versionBefore = aclBefore.version;
          const adminsBefore = aclBefore.aclAdministrators.length;

          // Attempt to remove the sole admin
          const currentAcl = manager.getAclDocument(dbName)!;
          const mutationPayload = computeAclMutationPayload(currentAcl);
          const validSig = new Uint8Array(64);
          validSig[0] = mutationPayload[0];

          let rejected = false;
          try {
            await manager.removeAdmin(
              dbName,
              undefined,
              adminKey,
              validSig,
              adminKey,
            );
          } catch (e) {
            if (e instanceof LastAdministratorError) {
              rejected = true;
            }
          }

          if (!rejected) return false;

          // ACL should be unchanged
          const aclAfter = manager.getAclDocument(dbName)!;
          return (
            aclAfter.version === versionBefore &&
            aclAfter.aclAdministrators.length === adminsBefore
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing an admin when multiple admins exist succeeds', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        async (dbName, admin1Seed, admin2Seed) => {
          fc.pre(admin1Seed !== admin2Seed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const admin1Key = makePublicKey(admin1Seed);
          const admin2Key = makePublicKey(admin2Seed);

          // Set up ACL with two admins
          const initialAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [admin1Key, admin2Key],
            version: 1,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, admin1Key);

          // Remove admin2 using admin1's signature
          const currentAcl = manager.getAclDocument(dbName)!;
          const mutationPayload = computeAclMutationPayload(currentAcl);
          const validSig = new Uint8Array(64);
          validSig[0] = mutationPayload[0];

          let succeeded = false;
          try {
            await manager.removeAdmin(
              dbName,
              undefined,
              admin2Key,
              validSig,
              admin1Key,
            );
            succeeded = true;
          } catch {
            succeeded = false;
          }

          if (!succeeded) return false;

          // admin2 should no longer be an admin
          const aclAfter = manager.getAclDocument(dbName)!;
          return (
            aclAfter.aclAdministrators.length === 1 &&
            !manager.isAclAdministrator(admin2Key, dbName)
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Pool Encryption Member Subset Invariant ────────────

/**
 * Feature: brightdb-write-acls, Property 13: Pool Encryption Member Subset Invariant
 *
 * For any Write_ACL on a pool with EncryptionMode.PoolShared, every public key
 * in authorizedWriters SHALL also appear in the pool encryption member list.
 * Adding a writer not in the pool member list SHALL be rejected. Removing a
 * member from the pool encryption list SHALL automatically remove them from
 * the Write_ACL.
 *
 * **Validates: Requirements 8.2, 8.4**
 */

describe('Feature: brightdb-write-acls, Property 13: Pool Encryption Member Subset Invariant', () => {
  it('setAcl rejects writers not in pool member list when PoolShared', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        fc.array(arbKeySeed, { minLength: 1, maxLength: 5 }),
        arbKeySeed,
        async (dbName, adminSeed, poolMemberSeeds, nonMemberSeed) => {
          // Ensure nonMemberSeed is not in poolMemberSeeds and not the admin
          fc.pre(!poolMemberSeeds.includes(nonMemberSeed));
          fc.pre(nonMemberSeed !== adminSeed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const poolMemberKeys = poolMemberSeeds.map(makePublicKey);
          const nonMemberKey = makePublicKey(nonMemberSeed);

          // Configure pool encryption with PoolShared mode
          manager.setPoolEncryptionConfig(EncryptionMode.PoolShared, [
            adminKey,
            ...poolMemberKeys,
          ]);

          // Attempt to set ACL with a non-pool-member as authorized writer
          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            authorizedWriters: [nonMemberKey],
            version: 1,
          });
          const sig = makeValidAdminSignature(aclDoc);

          let rejected = false;
          try {
            await manager.setAcl(aclDoc, sig, adminKey);
          } catch (e) {
            if (e instanceof WriterNotInPoolError) {
              rejected = true;
            }
          }

          return rejected;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('setAcl accepts writers that are pool members when PoolShared', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        fc.array(arbKeySeed, { minLength: 1, maxLength: 5 }),
        async (dbName, adminSeed, writerSeeds) => {
          // Ensure admin is distinct from writers
          fc.pre(!writerSeeds.includes(adminSeed));
          // Ensure unique writer seeds
          fc.pre(new Set(writerSeeds).size === writerSeeds.length);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const writerKeys = writerSeeds.map(makePublicKey);

          // All writers + admin are pool members
          manager.setPoolEncryptionConfig(EncryptionMode.PoolShared, [
            adminKey,
            ...writerKeys,
          ]);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            authorizedWriters: writerKeys,
            version: 1,
          });
          const sig = makeValidAdminSignature(aclDoc);

          let accepted = false;
          try {
            await manager.setAcl(aclDoc, sig, adminKey);
            accepted = true;
          } catch {
            accepted = false;
          }

          return accepted;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('addWriter rejects non-pool-member when PoolShared', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        async (dbName, adminSeed, nonMemberSeed) => {
          fc.pre(adminSeed !== nonMemberSeed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const nonMemberKey = makePublicKey(nonMemberSeed);

          // Pool only contains admin, not the writer we'll try to add
          manager.setPoolEncryptionConfig(EncryptionMode.PoolShared, [
            adminKey,
          ]);

          // Set up initial ACL
          const initialAcl = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            version: 1,
          });
          const initialSig = makeValidAdminSignature(initialAcl);
          await manager.setAcl(initialAcl, initialSig, adminKey);

          // Attempt to add non-pool-member as writer
          const currentAcl = manager.getAclDocument(dbName)!;
          const mutationPayload = computeAclMutationPayload(currentAcl);
          const validSig = new Uint8Array(64);
          validSig[0] = mutationPayload[0];

          let rejected = false;
          try {
            await manager.addWriter(
              dbName,
              undefined,
              nonMemberKey,
              validSig,
              adminKey,
            );
          } catch (e) {
            if (e instanceof WriterNotInPoolError) {
              rejected = true;
            }
          }

          return rejected;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing pool member automatically removes them from Write_ACL', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        fc.array(arbKeySeed, { minLength: 1, maxLength: 5 }),
        fc.nat(),
        async (dbName, adminSeed, writerSeeds, removeIdx) => {
          // Ensure unique seeds and admin is distinct
          const uniqueWriterSeeds = [...new Set(writerSeeds)].filter(
            (s) => s !== adminSeed,
          );
          fc.pre(uniqueWriterSeeds.length >= 1);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const writerKeys = uniqueWriterSeeds.map(makePublicKey);

          // All writers + admin are pool members
          manager.setPoolEncryptionConfig(EncryptionMode.PoolShared, [
            adminKey,
            ...writerKeys,
          ]);

          // Set up ACL with all writers
          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            authorizedWriters: writerKeys,
            version: 1,
          });
          const sig = makeValidAdminSignature(aclDoc);
          await manager.setAcl(aclDoc, sig, adminKey);

          // Pick a writer to remove from pool
          const targetIdx = removeIdx % uniqueWriterSeeds.length;
          const removedKey = writerKeys[targetIdx];

          // Remove from pool — should auto-remove from ACL
          manager.onPoolMemberRemoved(removedKey);

          // Verify the writer is no longer in the ACL
          const updatedAcl = manager.getAclDocument(dbName)!;
          const stillInAcl = updatedAcl.authorizedWriters.some(
            (w) =>
              w.length === removedKey.length &&
              w.every((b, i) => b === removedKey[i]),
          );

          return !stillInAcl;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EncryptionMode.None allows writers without pool member constraints', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbKeySeed,
        arbKeySeed,
        async (dbName, adminSeed, writerSeed) => {
          fc.pre(adminSeed !== writerSeed);

          const authenticator = new MockAuthenticator();
          const manager = new WriteAclManager(mockBlockStore, authenticator);

          const adminKey = makePublicKey(adminSeed);
          const writerKey = makePublicKey(writerSeed);

          // No encryption — writer does NOT need to be a pool member
          manager.setPoolEncryptionConfig(EncryptionMode.None, []);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName },
            aclAdministrators: [adminKey],
            authorizedWriters: [writerKey],
            version: 1,
          });
          const sig = makeValidAdminSignature(aclDoc);

          let accepted = false;
          try {
            await manager.setAcl(aclDoc, sig, adminKey);
            accepted = true;
          } catch {
            accepted = false;
          }

          return accepted;
        },
      ),
      { numRuns: 100 },
    );
  });
});
