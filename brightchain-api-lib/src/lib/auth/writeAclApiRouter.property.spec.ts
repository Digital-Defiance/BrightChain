/**
 * Property-based tests for WriteAclApiRouter (Property 14).
 *
 * Feature: brightdb-write-acls, Property 14: API Admin Authentication Enforcement
 *
 * For any mutating ACL API request (PUT, POST, DELETE on ACL endpoints),
 * the request SHALL succeed if and only if it includes a valid ECDSA signature
 * from a current ACL_Administrator. Requests without a valid admin signature
 * SHALL receive HTTP 403.
 *
 * **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**
 */
import { describe, expect, it } from '@jest/globals';
import express from 'express';
import fc from 'fast-check';
import request from 'supertest';

import {
  type IAclDocument,
  type IBlockStore,
  type INodeAuthenticator,
  WriteMode,
} from '@brightchain/brightchain-lib';
import { WriteAclManager } from '@brightchain/db';
import { sha256 } from '@noble/hashes/sha256';

import { createWriteAclApiRouter } from './writeAclApiRouter';
import { WriteAclAuditLogger } from './writeAclAuditLogger';

// ─── Test Helpers ────────────────────────────────────────────────────

/** Create a deterministic public key from a seed byte. */
function makePublicKey(seed: number): Uint8Array {
  const key = new Uint8Array(33);
  key[0] = 0x02;
  key[1] = seed;
  return key;
}

/**
 * Mock INodeAuthenticator: signatures are valid when sig[0] === payload[0].
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
function makeValidSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = payload[0];
  return sig;
}

/** Create an invalid admin signature for a given ACL document. */
function makeInvalidSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = (payload[0] + 1) % 256;
  return sig;
}

/** Build a minimal IAclDocument for testing. */
function makeAclDocument(
  dbName: string,
  adminKey: Uint8Array,
  version = 1,
  collectionName?: string,
): IAclDocument {
  const now = new Date();
  return {
    documentId: 'test-doc',
    writeMode: WriteMode.Restricted,
    authorizedWriters: [],
    aclAdministrators: [adminKey],
    scope: { dbName, collectionName },
    version,
    createdAt: now,
    updatedAt: now,
    creatorPublicKey: adminKey,
    creatorSignature: new Uint8Array(64),
  };
}

/**
 * Create a test Express app with the WriteAclApiRouter mounted.
 * Seeds the ACL manager with an initial ACL for the given dbName.
 */
function createTestApp(dbName: string, adminKey: Uint8Array) {
  const authenticator = new MockAuthenticator();
  const aclManager = new WriteAclManager(mockBlockStore, authenticator);
  const auditLogger = new WriteAclAuditLogger();

  // Seed an initial ACL so the manager knows about the admin
  const initialAcl = makeAclDocument(dbName, adminKey, 1);
  aclManager.setCachedAcl(initialAcl);

  const router = createWriteAclApiRouter(aclManager, auditLogger);
  const app = express();
  app.use(express.json());
  app.use(router);

  return { app, aclManager, auditLogger };
}

// ─── Generators ──────────────────────────────────────────────────────

/** Arbitrary safe db/collection name (alphanumeric + underscore, no hyphens for Express 5 compatibility). */
const arbName: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/)
  .filter((s) => s.length > 0);

/** Arbitrary admin seed byte (1-254 to avoid edge cases). */
const _arbSeed: fc.Arbitrary<number> = fc.integer({ min: 1, max: 254 });

/** Arbitrary hex-encoded public key. */
const _arbPublicKeyHex: fc.Arbitrary<string> = fc
  .uint8Array({ minLength: 33, maxLength: 33 })
  .map((bytes) => {
    bytes[0] = 0x02;
    return Buffer.from(bytes).toString('hex');
  });

/**
 * Mutating endpoint types for the ACL API.
 */
type MutatingEndpoint =
  | 'put-acl'
  | 'post-writers'
  | 'delete-writers'
  | 'post-tokens';

const arbEndpoint: fc.Arbitrary<MutatingEndpoint> = fc.constantFrom(
  'put-acl' as MutatingEndpoint,
  'post-writers' as MutatingEndpoint,
  'delete-writers' as MutatingEndpoint,
  'post-tokens' as MutatingEndpoint,
);

// ─── Property 14 ─────────────────────────────────────────────────────

describe('Feature: brightdb-write-acls, Property 14: API Admin Authentication Enforcement', () => {
  it('mutating ACL requests without admin headers SHALL receive HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(arbName, arbEndpoint, async (dbName, endpoint) => {
        const adminKey = makePublicKey(0x42);
        const { app } = createTestApp(dbName, adminKey);

        let res: request.Response;
        switch (endpoint) {
          case 'put-acl':
            res = await request(app)
              .put(`/acl/${dbName}`)
              .send({ writeMode: 'restricted', version: 2 });
            break;
          case 'post-writers':
            res = await request(app)
              .post(`/acl/${dbName}/writers`)
              .send({ publicKeyHex: 'aa'.repeat(33) });
            break;
          case 'delete-writers':
            res = await request(app).delete(
              `/acl/${dbName}/writers/${'bb'.repeat(33)}`,
            );
            break;
          case 'post-tokens':
            res = await request(app)
              .post(`/acl/${dbName}/tokens`)
              .send({
                granteePublicKey: 'cc'.repeat(33),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                grantorSignature: 'dd'.repeat(64),
                grantorPublicKey: Buffer.from(adminKey).toString('hex'),
              });
            break;
        }

        expect(res!.status).toBe(403);
        expect(res!.body.error).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  it('mutating ACL requests with valid admin signature SHALL succeed (not 403)', async () => {
    await fc.assert(
      fc.asyncProperty(arbName, arbEndpoint, async (dbName, endpoint) => {
        const adminKey = makePublicKey(0x42);
        const { app, aclManager } = createTestApp(dbName, adminKey);
        const adminKeyHex = Buffer.from(adminKey).toString('hex');

        // For each endpoint, compute the correct signature
        // based on what the ACL manager will see
        let res: request.Response;
        switch (endpoint) {
          case 'put-acl': {
            // The setAcl call will see the ACL doc we send
            const aclDoc = makeAclDocument(dbName, adminKey, 2);
            const sig = makeValidSignature(aclDoc);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .put(`/acl/${dbName}`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({
                writeMode: 'restricted',
                version: 2,
                aclAdministrators: [adminKeyHex],
                creatorPublicKey: adminKeyHex,
              });
            break;
          }
          case 'post-writers': {
            // addWriter uses getOrCreateAcl which returns the cached ACL (version 1)
            // then verifyAdminSignature computes payload from that ACL
            const cachedAcl = aclManager.getAclDocument(dbName)!;
            const sig = makeValidSignature(cachedAcl);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .post(`/acl/${dbName}/writers`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({ publicKeyHex: 'aa'.repeat(33) });
            break;
          }
          case 'delete-writers': {
            const cachedAcl = aclManager.getAclDocument(dbName)!;
            const sig = makeValidSignature(cachedAcl);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .delete(`/acl/${dbName}/writers/${'bb'.repeat(33)}`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex);
            break;
          }
          case 'post-tokens': {
            // issueCapabilityToken checks isAclAdministrator then verifies
            // the admin signature over the token payload
            const granteeKey = makePublicKey(0x99);
            const granteeHex = Buffer.from(granteeKey).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000);
            const collName = '';
            const tokenPayloadMsg = `${granteeHex}:${dbName}:${collName}:${expiresAt.toISOString()}`;
            const tokenPayload = sha256(
              new TextEncoder().encode(tokenPayloadMsg),
            );
            const tokenSig = new Uint8Array(64);
            tokenSig[0] = tokenPayload[0];
            const tokenSigHex = Buffer.from(tokenSig).toString('hex');

            // The admin signature header is used for issueCapabilityToken
            res = await request(app)
              .post(`/acl/${dbName}/tokens`)
              .set('X-Acl-Admin-Signature', tokenSigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({
                granteePublicKey: granteeHex,
                expiresAt: expiresAt.toISOString(),
                grantorSignature: tokenSigHex,
                grantorPublicKey: adminKeyHex,
              });
            break;
          }
        }

        // Should NOT be 403 — the admin signature is valid
        expect(res!.status).not.toBe(403);
      }),
      { numRuns: 100 },
    );
  });

  it('mutating ACL requests with invalid admin signature SHALL receive HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(arbName, arbEndpoint, async (dbName, endpoint) => {
        const adminKey = makePublicKey(0x42);
        const { app, aclManager } = createTestApp(dbName, adminKey);
        const adminKeyHex = Buffer.from(adminKey).toString('hex');

        // Use an invalid signature (wrong first byte)
        let res: request.Response;
        switch (endpoint) {
          case 'put-acl': {
            const aclDoc = makeAclDocument(dbName, adminKey, 2);
            const sig = makeInvalidSignature(aclDoc);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .put(`/acl/${dbName}`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({
                writeMode: 'restricted',
                version: 2,
                aclAdministrators: [adminKeyHex],
                creatorPublicKey: adminKeyHex,
              });
            break;
          }
          case 'post-writers': {
            const cachedAcl = aclManager.getAclDocument(dbName)!;
            const sig = makeInvalidSignature(cachedAcl);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .post(`/acl/${dbName}/writers`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({ publicKeyHex: 'aa'.repeat(33) });
            break;
          }
          case 'delete-writers': {
            const cachedAcl = aclManager.getAclDocument(dbName)!;
            const sig = makeInvalidSignature(cachedAcl);
            const sigHex = Buffer.from(sig).toString('hex');

            res = await request(app)
              .delete(`/acl/${dbName}/writers/${'bb'.repeat(33)}`)
              .set('X-Acl-Admin-Signature', sigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex);
            break;
          }
          case 'post-tokens': {
            // Compute the actual token payload hash so we can ensure the
            // signature's first byte differs from it (the MockAuthenticator
            // checks signature[0] === challenge[0]).
            const granteeKeyInvalid = Uint8Array.from(
              Buffer.from('cc'.repeat(33), 'hex'),
            );
            const granteeHexInvalid =
              Buffer.from(granteeKeyInvalid).toString('hex');
            const expiresAtInvalid = new Date(Date.now() + 3600000);
            const collNameInvalid = '';
            const tokenPayloadMsgInvalid = `${granteeHexInvalid}:${dbName}:${collNameInvalid}:${expiresAtInvalid.toISOString()}`;
            const tokenPayloadInvalid = sha256(
              new TextEncoder().encode(tokenPayloadMsgInvalid),
            );
            const wrongSig = new Uint8Array(64);
            // Ensure first byte differs from the payload hash
            wrongSig[0] = (tokenPayloadInvalid[0] + 1) % 256;
            const wrongSigHex = Buffer.from(wrongSig).toString('hex');

            res = await request(app)
              .post(`/acl/${dbName}/tokens`)
              .set('X-Acl-Admin-Signature', wrongSigHex)
              .set('X-Acl-Admin-PublicKey', adminKeyHex)
              .send({
                granteePublicKey: granteeHexInvalid,
                expiresAt: expiresAtInvalid.toISOString(),
                grantorSignature: wrongSigHex,
                grantorPublicKey: adminKeyHex,
              });
            break;
          }
        }

        expect(res!.status).toBe(403);
      }),
      { numRuns: 100 },
    );
  });
});
