/**
 * Property-based tests for AclDocumentStore (Property 12).
 *
 * Feature: brightdb-write-acls, Property 12: Sync Write Proof Propagation
 *
 * Tests that ACL documents stored can be loaded back with signature
 * verification, tampered documents fail verification, and version
 * chain (previousVersionBlockId) is maintained — simulating the
 * store/load cycle that underpins sync write proof propagation.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 5.3**
 */
import { describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import fc from 'fast-check';

import type { IAclDocument } from '@brightchain/brightchain-lib';
import { WriteMode } from '@brightchain/brightchain-lib';

import { AclDocumentStore } from './aclDocumentStore';
import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';

// ---------------------------------------------------------------------------
// Helpers & Arbitraries
// ---------------------------------------------------------------------------

interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyHex: string;
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
    publicKeyHex: Buffer.from(publicKey).toString('hex'),
  };
}

/** Arbitrary that produces a fresh secp256k1 key pair per sample. */
const arbKeyPair: fc.Arbitrary<KeyPair> = fc
  .constant(null)
  .map(() => generateKeyPair());

/** Arbitrary WriteMode. */
const arbWriteMode: fc.Arbitrary<WriteMode> = fc.constantFrom(
  WriteMode.Open,
  WriteMode.Restricted,
  WriteMode.OwnerOnly,
);

/** Arbitrary safe string for db/collection names (no colons, non-empty). */
const arbName: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9_-]{1,32}$/)
  .filter((s) => s.length > 0);

/**
 * Build a minimal valid IAclDocument for testing.
 */
function buildAclDocument(
  admin: KeyPair,
  overrides: Partial<IAclDocument> = {},
): IAclDocument {
  const now = new Date();
  return {
    documentId: '',
    writeMode: WriteMode.Restricted,
    authorizedWriters: [admin.publicKey],
    aclAdministrators: [admin.publicKey],
    scope: { dbName: 'testdb' },
    version: 1,
    createdAt: now,
    updatedAt: now,
    creatorPublicKey: admin.publicKey,
    creatorSignature: new Uint8Array(0),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 12: Sync Write Proof Propagation
// ---------------------------------------------------------------------------

describe('Feature: brightdb-write-acls, Property 12: Sync Write Proof Propagation', () => {
  it('Property 12a: stored ACL documents can be loaded back with signature verification — **Validates: Requirements 7.1, 7.2, 7.3, 5.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeyPair,
        arbWriteMode,
        arbName,
        fc.option(arbName, { nil: undefined }),
        async (admin, writeMode, dbName, collectionName) => {
          const store = new AclDocumentStore(authenticator);

          const doc = buildAclDocument(admin, {
            writeMode,
            scope: { dbName, collectionName },
          });

          // Store the document
          const blockId = await store.storeAclDocument(doc, admin.privateKey);

          // Load it back — signature verification happens inside loadAclDocument
          const loaded = await store.loadAclDocument(blockId);

          // Core fields must match
          expect(loaded.writeMode).toBe(writeMode);
          expect(loaded.scope.dbName).toBe(dbName);
          expect(loaded.scope.collectionName).toBe(collectionName);
          expect(loaded.version).toBe(doc.version);
          expect(loaded.authorizedWriters.length).toBe(
            doc.authorizedWriters.length,
          );
          expect(loaded.aclAdministrators.length).toBe(
            doc.aclAdministrators.length,
          );

          // The loaded document should have a non-empty creatorSignature
          // (attached during load after verification)
          expect(loaded.creatorSignature.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12b: tampered ACL documents fail signature verification — **Validates: Requirements 7.3, 5.3**', async () => {
    await fc.assert(
      fc.asyncProperty(arbKeyPair, arbName, async (admin, dbName) => {
        const store = new AclDocumentStore(authenticator);

        const doc = buildAclDocument(admin, {
          scope: { dbName },
        });

        const blockId = await store.storeAclDocument(doc, admin.privateKey);

        // Tamper with the stored block: modify the aclJson content
        const blockBytes = store['blocks'].get(blockId)!;
        const signedBlock = JSON.parse(new TextDecoder().decode(blockBytes));

        // Modify the aclJson to simulate tampering
        const parsed = JSON.parse(signedBlock.aclJson);
        parsed.version = 999;
        signedBlock.aclJson = JSON.stringify(parsed);

        // Re-store the tampered block under the same ID
        const tamperedBytes = new TextEncoder().encode(
          JSON.stringify(signedBlock),
        );
        store['blocks'].set(blockId, tamperedBytes);

        // Loading should fail signature verification
        await expect(store.loadAclDocument(blockId)).rejects.toThrow(
          /[Ss]ignature verification failed/,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12c: version chain (previousVersionBlockId) is maintained across updates — **Validates: Requirements 7.1, 7.2**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeyPair,
        arbName,
        fc.integer({ min: 1, max: 4 }),
        async (admin, dbName, updateCount) => {
          const store = new AclDocumentStore(authenticator);

          // Store initial document
          const initialDoc = buildAclDocument(admin, {
            scope: { dbName },
            version: 1,
          });
          let prevBlockId = await store.storeAclDocument(
            initialDoc,
            admin.privateKey,
          );

          // Perform sequential updates
          for (let i = 0; i < updateCount; i++) {
            const updatedDoc = buildAclDocument(admin, {
              scope: { dbName },
              version: i + 2, // strictly increasing
            });

            const newBlockId = await store.updateAclDocument(
              prevBlockId,
              updatedDoc,
              admin.privateKey,
            );

            // Load the new version and verify chain
            const loaded = await store.loadAclDocument(newBlockId);
            expect(loaded.previousVersionBlockId).toBe(prevBlockId);
            expect(loaded.version).toBe(i + 2);

            prevBlockId = newBlockId;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12d: version conflict is rejected (equal or lower version) — **Validates: Requirements 7.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeyPair,
        arbName,
        fc.integer({ min: 0, max: 5 }),
        async (admin, dbName, versionOffset) => {
          const store = new AclDocumentStore(authenticator);

          const initialDoc = buildAclDocument(admin, {
            scope: { dbName },
            version: 5,
          });
          const blockId = await store.storeAclDocument(
            initialDoc,
            admin.privateKey,
          );

          // Try to update with a version <= current (5)
          const conflictVersion = Math.min(versionOffset, 5);
          const conflictDoc = buildAclDocument(admin, {
            scope: { dbName },
            version: conflictVersion,
          });

          await expect(
            store.updateAclDocument(blockId, conflictDoc, admin.privateKey),
          ).rejects.toThrow(/[Vv]ersion conflict/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12e: document signed by one key cannot be verified with a different key — **Validates: Requirements 7.3, 5.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeyPair,
        arbKeyPair,
        arbName,
        async (admin, otherKey, dbName) => {
          // Ensure different keys
          fc.pre(
            Buffer.from(admin.privateKey).toString('hex') !==
              Buffer.from(otherKey.privateKey).toString('hex'),
          );

          const store = new AclDocumentStore(authenticator);

          const doc = buildAclDocument(admin, {
            scope: { dbName },
          });

          const blockId = await store.storeAclDocument(doc, admin.privateKey);

          // Replace the public key in the signature with a different key
          const blockBytes = store['blocks'].get(blockId)!;
          const signedBlock = JSON.parse(new TextDecoder().decode(blockBytes));
          signedBlock.signatures[0].publicKeyHex = otherKey.publicKeyHex;

          const tamperedBytes = new TextEncoder().encode(
            JSON.stringify(signedBlock),
          );
          store['blocks'].set(blockId, tamperedBytes);

          // Loading should fail because the signature doesn't match the replaced key
          await expect(store.loadAclDocument(blockId)).rejects.toThrow(
            /[Ss]ignature verification failed/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
