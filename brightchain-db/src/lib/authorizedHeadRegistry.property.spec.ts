/**
 * @fileoverview Property-based tests for AuthorizedHeadRegistry.
 *
 * Tests correctness properties 4, 5, 6, and 8 from the
 * BrightDB Write ACLs design document using fast-check.
 *
 * Uses the same MockAuthenticator pattern as writeAclManager.property.spec.ts:
 * signatures are valid when sig[0] === payload[0].
 */

import type {
  IAclDocument,
  IBlockStore,
  INodeAuthenticator,
  IWriteProof,
} from '@brightchain/brightchain-lib';
import {
  createWriteProofPayload,
  InMemoryHeadRegistry,
  WriteAuthorizationError,
  WriteMode,
} from '@brightchain/brightchain-lib';
import { sha256 } from '@noble/hashes/sha256';
import fc from 'fast-check';
import { AuthorizedHeadRegistry } from './authorizedHeadRegistry';
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

/** Compute the ACL mutation payload hash matching WriteAclManager's private method. */
function computeAclMutationPayload(aclDoc: IAclDocument): Uint8Array {
  const collName = aclDoc.scope.collectionName ?? '';
  const message = `acl:${aclDoc.scope.dbName}:${collName}:${aclDoc.version}:${aclDoc.writeMode}`;
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

/** Create a valid write proof for the given parameters. */
function makeValidWriteProof(
  signerPublicKey: Uint8Array,
  dbName: string,
  collectionName: string,
  blockId: string,
): IWriteProof {
  const payload = createWriteProofPayload(dbName, collectionName, blockId);
  const sig = new Uint8Array(64);
  sig[0] = payload[0]; // MockAuthenticator accepts when sig[0] === payload[0]
  return {
    signerPublicKey,
    signature: sig,
    dbName,
    collectionName,
    blockId,
  };
}

/** Create an invalid write proof (bad signature). */
function makeInvalidWriteProof(
  signerPublicKey: Uint8Array,
  dbName: string,
  collectionName: string,
  blockId: string,
): IWriteProof {
  const payload = createWriteProofPayload(dbName, collectionName, blockId);
  const sig = new Uint8Array(64);
  sig[0] = (payload[0] + 1) % 256; // MockAuthenticator rejects
  return {
    signerPublicKey,
    signature: sig,
    dbName,
    collectionName,
    blockId,
  };
}

/**
 * Set up a WriteAclManager with a cached ACL and return an AuthorizedHeadRegistry.
 */
function createTestRegistry(
  authenticator: MockAuthenticator,
  aclDoc: IAclDocument,
): {
  inner: InMemoryHeadRegistry;
  aclManager: WriteAclManager;
  registry: AuthorizedHeadRegistry;
} {
  const inner = InMemoryHeadRegistry.createIsolated();
  const aclManager = new WriteAclManager(mockBlockStore, authenticator);

  // Cache the ACL via setAcl with a valid admin signature
  const adminKey = aclDoc.aclAdministrators[0];
  const adminSig = makeValidAdminSignature(aclDoc);
  // We need to set the ACL synchronously for test setup — use setCachedAcl
  aclManager.setCachedAcl(aclDoc);

  const registry = new AuthorizedHeadRegistry(inner, aclManager, authenticator);

  return { inner, aclManager, registry };
}

// ─── Generators ──────────────────────────────────────────────────────

/** Arbitrary non-empty string without colons (valid for scope names). */
const arbScopeName = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((s) => !s.includes(':') && s.trim().length > 0);

/** Arbitrary block ID (hex-like string). */
const arbBlockId = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary seed byte for public key generation (1-254). */
const arbKeySeed = fc.integer({ min: 1, max: 254 });

/** Arbitrary mutation type. */
const arbMutation = fc.constantFrom(
  'setHead' as const,
  'removeHead' as const,
  'mergeHeadUpdate' as const,
);

// ─── Property 4: Restricted Mode Write Authorization Enforcement ─────

/**
 * Feature: brightdb-write-acls, Property 4: Restricted Mode Write Authorization Enforcement
 *
 * For any head registry mutation (setHead, removeHead, mergeHeadUpdate) on a
 * database/collection in Restricted_Mode, the operation SHALL succeed if and
 * only if a valid Write_Proof is provided where: (a) the signature verifies
 * against the signer's public key, and (b) the signer's public key appears in
 * the active Write_ACL's authorizedWriters list. Without a valid proof, the
 * head pointer SHALL remain unchanged.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2**
 */
describe('Feature: brightdb-write-acls, Property 4: Restricted Mode Write Authorization Enforcement', () => {
  it('mutation succeeds iff valid proof from authorized writer; head unchanged on failure', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbKeySeed,
        arbKeySeed,
        arbMutation,
        fc.boolean(),
        fc.boolean(),
        async (
          dbName,
          collName,
          blockId,
          writerSeed,
          nonWriterSeed,
          mutation,
          useAuthorizedWriter,
          useValidSignature,
        ) => {
          fc.pre(writerSeed !== nonWriterSeed);

          const authenticator = new MockAuthenticator();
          const writerKey = makePublicKey(writerSeed);
          const nonWriterKey = makePublicKey(nonWriterSeed);
          const adminKey = makePublicKey(0xff);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [adminKey],
            authorizedWriters: [writerKey],
            creatorPublicKey: adminKey,
          });

          const { inner, registry } = createTestRegistry(authenticator, aclDoc);

          // Set an initial head so we can verify it stays unchanged on failure
          await inner.setHead(dbName, collName, 'initial-block');
          const headBefore = inner.getHead(dbName, collName);

          const signerKey = useAuthorizedWriter ? writerKey : nonWriterKey;
          const proof = useValidSignature
            ? makeValidWriteProof(signerKey, dbName, collName, blockId)
            : makeInvalidWriteProof(signerKey, dbName, collName, blockId);

          const shouldSucceed = useAuthorizedWriter && useValidSignature;

          let succeeded = false;
          try {
            switch (mutation) {
              case 'setHead':
                await registry.setHead(dbName, collName, blockId, proof);
                break;
              case 'removeHead':
                await registry.removeHead(dbName, collName, proof);
                break;
              case 'mergeHeadUpdate':
                await registry.mergeHeadUpdate(
                  dbName,
                  collName,
                  blockId,
                  new Date(Date.now() + 10000),
                  proof,
                );
                break;
            }
            succeeded = true;
          } catch (e) {
            if (!(e instanceof WriteAuthorizationError)) {
              throw e; // unexpected error
            }
          }

          if (shouldSucceed) {
            return succeeded;
          } else {
            // Should have failed, and head should be unchanged
            const headAfter = inner.getHead(dbName, collName);
            return !succeeded && headAfter === headBefore;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mutation without any proof is rejected in Restricted mode', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbKeySeed,
        arbMutation,
        async (dbName, collName, blockId, writerSeed, mutation) => {
          const authenticator = new MockAuthenticator();
          const writerKey = makePublicKey(writerSeed);
          const adminKey = makePublicKey(0xff);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [adminKey],
            authorizedWriters: [writerKey],
            creatorPublicKey: adminKey,
          });

          const { inner, registry } = createTestRegistry(authenticator, aclDoc);

          await inner.setHead(dbName, collName, 'initial-block');
          const headBefore = inner.getHead(dbName, collName);

          let rejected = false;
          try {
            switch (mutation) {
              case 'setHead':
                await registry.setHead(dbName, collName, blockId);
                break;
              case 'removeHead':
                await registry.removeHead(dbName, collName);
                break;
              case 'mergeHeadUpdate':
                await registry.mergeHeadUpdate(
                  dbName,
                  collName,
                  blockId,
                  new Date(Date.now() + 10000),
                );
                break;
            }
          } catch (e) {
            if (e instanceof WriteAuthorizationError) {
              rejected = true;
            }
          }

          const headAfter = inner.getHead(dbName, collName);
          return rejected && headAfter === headBefore;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Open Mode Accepts All Writes ────────────────────────

/**
 * Feature: brightdb-write-acls, Property 5: Open Mode Accepts All Writes
 *
 * For any head registry mutation on a database/collection in Open_Mode,
 * the operation SHALL succeed without requiring a Write_Proof.
 *
 * **Validates: Requirements 3.5**
 */
describe('Feature: brightdb-write-acls, Property 5: Open Mode Accepts All Writes', () => {
  it('mutations succeed without write proof in Open mode', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbMutation,
        async (dbName, collName, blockId, mutation) => {
          const authenticator = new MockAuthenticator();
          const adminKey = makePublicKey(0xff);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Open,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [adminKey],
            authorizedWriters: [],
            creatorPublicKey: adminKey,
          });

          const { registry } = createTestRegistry(authenticator, aclDoc);

          let succeeded = false;
          try {
            switch (mutation) {
              case 'setHead':
                await registry.setHead(dbName, collName, blockId);
                break;
              case 'removeHead':
                await registry.removeHead(dbName, collName);
                break;
              case 'mergeHeadUpdate':
                await registry.mergeHeadUpdate(
                  dbName,
                  collName,
                  blockId,
                  new Date(Date.now() + 10000),
                );
                break;
            }
            succeeded = true;
          } catch {
            succeeded = false;
          }

          return succeeded;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mutations also succeed with a write proof in Open mode (proof is ignored)', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbKeySeed,
        async (dbName, collName, blockId, signerSeed) => {
          const authenticator = new MockAuthenticator();
          const adminKey = makePublicKey(0xff);
          const signerKey = makePublicKey(signerSeed);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Open,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [adminKey],
            authorizedWriters: [],
            creatorPublicKey: adminKey,
          });

          const { registry } = createTestRegistry(authenticator, aclDoc);

          // Even an invalid proof should be fine in Open mode
          const proof = makeInvalidWriteProof(
            signerKey,
            dbName,
            collName,
            blockId,
          );

          let succeeded = false;
          try {
            await registry.setHead(dbName, collName, blockId, proof);
            succeeded = true;
          } catch {
            succeeded = false;
          }

          return succeeded;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Owner Only Mode Restricts to Creator ────────────────

/**
 * Feature: brightdb-write-acls, Property 6: Owner Only Mode Restricts to Creator
 *
 * For any head registry mutation on a database/collection in Owner_Only_Mode
 * and for any signer, the operation SHALL succeed if and only if the
 * Write_Proof is signed by the creatorPublicKey recorded in the ACL document.
 *
 * **Validates: Requirements 3.6**
 */
describe('Feature: brightdb-write-acls, Property 6: Owner Only Mode Restricts to Creator', () => {
  it('mutation succeeds iff proof signed by creator', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbKeySeed,
        arbKeySeed,
        arbMutation,
        fc.boolean(),
        async (
          dbName,
          collName,
          blockId,
          creatorSeed,
          otherSeed,
          mutation,
          useCreator,
        ) => {
          fc.pre(creatorSeed !== otherSeed);

          const authenticator = new MockAuthenticator();
          const creatorKey = makePublicKey(creatorSeed);
          const otherKey = makePublicKey(otherSeed);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.OwnerOnly,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [creatorKey],
            authorizedWriters: [creatorKey, otherKey], // both are writers
            creatorPublicKey: creatorKey,
          });

          const { inner, registry } = createTestRegistry(authenticator, aclDoc);

          await inner.setHead(dbName, collName, 'initial-block');
          const headBefore = inner.getHead(dbName, collName);

          const signerKey = useCreator ? creatorKey : otherKey;
          const proof = makeValidWriteProof(
            signerKey,
            dbName,
            collName,
            blockId,
          );

          let succeeded = false;
          try {
            switch (mutation) {
              case 'setHead':
                await registry.setHead(dbName, collName, blockId, proof);
                break;
              case 'removeHead':
                await registry.removeHead(dbName, collName, proof);
                break;
              case 'mergeHeadUpdate':
                await registry.mergeHeadUpdate(
                  dbName,
                  collName,
                  blockId,
                  new Date(Date.now() + 10000),
                  proof,
                );
                break;
            }
            succeeded = true;
          } catch (e) {
            if (!(e instanceof WriteAuthorizationError)) {
              throw e;
            }
          }

          if (useCreator) {
            return succeeded;
          } else {
            const headAfter = inner.getHead(dbName, collName);
            return !succeeded && headAfter === headBefore;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mutation without proof is rejected in OwnerOnly mode', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbKeySeed,
        async (dbName, collName, blockId, creatorSeed) => {
          const authenticator = new MockAuthenticator();
          const creatorKey = makePublicKey(creatorSeed);

          const aclDoc = makeAclDocument({
            writeMode: WriteMode.OwnerOnly,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [creatorKey],
            creatorPublicKey: creatorKey,
          });

          const { registry } = createTestRegistry(authenticator, aclDoc);

          let rejected = false;
          try {
            await registry.setHead(dbName, collName, blockId);
          } catch (e) {
            if (e instanceof WriteAuthorizationError) {
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

// ─── Property 8: Writer Removal Immediately Revokes Access ───────────

/**
 * Feature: brightdb-write-acls, Property 8: Writer Removal Immediately Revokes Access
 *
 * For any Authorized_Writer that is removed from a Write_ACL, any subsequent
 * Write_Proof signed by that member's key SHALL be rejected by the head
 * registry, even if the proof was valid before the removal.
 *
 * **Validates: Requirements 4.6**
 */
describe('Feature: brightdb-write-acls, Property 8: Writer Removal Immediately Revokes Access', () => {
  it('after removing a writer, subsequent proofs from that writer are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbScopeName,
        arbScopeName,
        arbBlockId,
        arbBlockId,
        arbKeySeed,
        arbKeySeed,
        async (dbName, collName, blockId1, blockId2, writerSeed, adminSeed) => {
          fc.pre(writerSeed !== adminSeed);
          fc.pre(blockId1 !== blockId2);

          const authenticator = new MockAuthenticator();
          const writerKey = makePublicKey(writerSeed);
          const adminKey = makePublicKey(adminSeed);

          // Set up ACL with writer authorized
          const aclDoc = makeAclDocument({
            writeMode: WriteMode.Restricted,
            scope: { dbName, collectionName: collName },
            aclAdministrators: [adminKey],
            authorizedWriters: [writerKey],
            creatorPublicKey: adminKey,
          });

          const { inner, aclManager, registry } = createTestRegistry(
            authenticator,
            aclDoc,
          );

          // First write should succeed
          const proof1 = makeValidWriteProof(
            writerKey,
            dbName,
            collName,
            blockId1,
          );
          let firstWriteSucceeded = false;
          try {
            await registry.setHead(dbName, collName, blockId1, proof1);
            firstWriteSucceeded = true;
          } catch {
            firstWriteSucceeded = false;
          }

          if (!firstWriteSucceeded) return false;

          // Remove the writer via ACL mutation
          const currentAcl = aclManager.getAclDocument(dbName, collName)!;
          const mutationPayload = computeAclMutationPayload(currentAcl);
          const adminSig = new Uint8Array(64);
          adminSig[0] = mutationPayload[0];

          await aclManager.removeWriter(
            dbName,
            collName,
            writerKey,
            adminSig,
            adminKey,
          );

          // Verify writer was removed
          const isStillWriter = aclManager.isAuthorizedWriter(
            writerKey,
            dbName,
            collName,
          );
          if (isStillWriter) return false;

          // Second write with the removed writer should fail
          const proof2 = makeValidWriteProof(
            writerKey,
            dbName,
            collName,
            blockId2,
          );
          let secondWriteRejected = false;
          try {
            await registry.setHead(dbName, collName, blockId2, proof2);
          } catch (e) {
            if (e instanceof WriteAuthorizationError) {
              secondWriteRejected = true;
            }
          }

          // Head should still be blockId1 (the first successful write)
          const currentHead = inner.getHead(dbName, collName);
          return secondWriteRejected && currentHead === blockId1;
        },
      ),
      { numRuns: 100 },
    );
  });
});
