/**
 * @fileoverview E2E tests for remaining BrightDb features. No mocks.
 *
 * Covers:
 *   1. Cursor server-side pagination (ephemeral but functional)
 *   2. Capability tokens (issue + verify with real ECDSA)
 *   3. Pool encryption mode (writer validation against pool membership)
 *   4. CBLIndex snapshot + restore round-trip
 *   5. Express middleware (real HTTP requests against real store)
 *   6. Schema re-application after restart
 */

import {
  BlockSize,
  initializeBrightChain,
  PooledMemoryBlockStore,
  resetInitialization,
  WriteMode,
} from '@brightchain/brightchain-lib';
import type { IAclDocument, ICapabilityToken, INodeAuthenticator } from '@brightchain/brightchain-lib';
import { EncryptionMode } from '@brightchain/brightchain-lib/lib/interfaces/storage/encryptedPool';
import { CBLVisibility } from '@brightchain/brightchain-lib/lib/interfaces/storage/cblIndex';
import { sha256 } from '@noble/hashes/sha256';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CBLIndex } from '../lib/cblIndex';
import { BrightDb } from '../lib/database';
import { PersistentHeadRegistry } from '../lib/headRegistry';
import { WriteAclManager } from '../lib/writeAclManager';

jest.setTimeout(30_000);

function generateKeypair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return { publicKey: new Uint8Array(ecdh.getPublicKey()), privateKey: new Uint8Array(ecdh.getPrivateKey()) };
}

function ensureUncompressed(pk: Uint8Array): Buffer {
  if (pk.length === 65 && pk[0] === 0x04) return Buffer.from(pk);
  return crypto.ECDH.convertKey(Buffer.from(pk), 'secp256k1', undefined, undefined, 'uncompressed') as Buffer;
}

class RealAuth implements INodeAuthenticator {
  createChallenge(): Uint8Array { return new Uint8Array(crypto.randomBytes(32)); }
  async signChallenge(c: Uint8Array, pk: Uint8Array): Promise<Uint8Array> {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(pk));
    const pub = ecdh.getPublicKey();
    const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'secp256k1', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33, 65).toString('base64url'), d: Buffer.from(pk).toString('base64url') }, format: 'jwk' });
    return new Uint8Array(crypto.sign(null, Buffer.from(c), key));
  }
  async verifySignature(c: Uint8Array, s: Uint8Array, pk: Uint8Array): Promise<boolean> {
    try {
      const pub = ensureUncompressed(pk);
      const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'secp256k1', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33, 65).toString('base64url') }, format: 'jwk' });
      return crypto.verify(null, Buffer.from(c), key, Buffer.from(s));
    } catch { return false; }
  }
  deriveNodeId(pk: Uint8Array): string { return crypto.createHash('sha256').update(Buffer.from(pk)).digest('hex'); }
}

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'bc-remain-'));
}

// ═══════════════════════════════════════════════════════════════════════════════

describe('Remaining BrightDb features e2e', () => {
  beforeAll(() => { initializeBrightChain(); });
  afterAll(() => { resetInitialization(); });

  // ─── 1. Cursor server-side pagination ─────────────────────────────────

  describe('cursor pagination', () => {
    it('createCursorSession + getNextBatch pages through real data', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightDb(store, { name: 'cursordb' });
      const col = db.collection('items');

      // Insert 10 docs
      for (let i = 0; i < 10; i++) {
        await col.insertOne({ _id: `item${i}`, idx: i } as never);
      }

      // Get all doc IDs
      const allDocs = await col.find({}).toArray();
      const allIds = allDocs.map((d: any) => d._id);

      // Create cursor with batch size 3
      const cursor = db.createCursorSession({
        collection: 'items',
        documentIds: allIds,
        batchSize: 3,
        position: 0, filter: {},
      });

      expect(cursor.id).toBeDefined();

      // Page through
      const batch1 = db.getNextBatch(cursor.id);
      expect(batch1).toHaveLength(3);

      const batch2 = db.getNextBatch(cursor.id);
      expect(batch2).toHaveLength(3);

      const batch3 = db.getNextBatch(cursor.id);
      expect(batch3).toHaveLength(3);

      const batch4 = db.getNextBatch(cursor.id);
      expect(batch4).toHaveLength(1); // last page

      const batch5 = db.getNextBatch(cursor.id);
      expect(batch5).toHaveLength(0); // exhausted

      // Close
      expect(db.closeCursorSession(cursor.id)).toBe(true);
      expect(db.getNextBatch(cursor.id)).toBeNull(); // closed
    });

    it('expired cursor returns null', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      // Very short timeout
      const db = new BrightDb(store, { name: 'expdb', cursorTimeoutMs: 1 });

      const cursor = db.createCursorSession({
        collection: 'test',
        documentIds: ['a', 'b'],
        batchSize: 1,
        position: 0, filter: {},
      });

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 50));

      // Creating a new cursor triggers cleanup of expired ones
      db.createCursorSession({
        collection: 'test',
        documentIds: [],
        batchSize: 1,
        position: 0, filter: {},
      });

      expect(db.getCursorSession(cursor.id)).toBeNull();
    });
  });

  // ─── 2. Capability tokens with real ECDSA ─────────────────────────────

  describe('capability tokens', () => {
    const auth = new RealAuth();

    it('issue + verify round-trip with real signatures', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const adminKeys = generateKeypair();
      const granteeKeys = generateKeypair();
      const mgr = new WriteAclManager(store, auth);

      // Set up ACL so admin is recognized
      const acl: IAclDocument = {
        writeMode: WriteMode.Restricted,
        authorizedWriters: [],
        aclAdministrators: [adminKeys.publicKey],
        scope: { dbName: 'capdb' },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorPublicKey: adminKeys.publicKey,
        documentId: 'acl-1',
        creatorSignature: new Uint8Array(64),
      };
      mgr.setCachedAcl(acl);

      // Build token
      const expiresAt = new Date(Date.now() + 60_000);
      const granteeHex = Buffer.from(granteeKeys.publicKey).toString('hex');
      const tokenPayloadMsg = `${granteeHex}:capdb::${expiresAt.toISOString()}`;
      const tokenPayload = sha256(new TextEncoder().encode(tokenPayloadMsg));
      const grantorSig = await auth.signChallenge(tokenPayload, adminKeys.privateKey);

      const token: ICapabilityToken = {
        granteePublicKey: granteeKeys.publicKey,
        scope: { dbName: 'capdb' },
        expiresAt,
        grantorSignature: grantorSig,
        grantorPublicKey: adminKeys.publicKey,
      };

      // Issue (validates admin status + signature)
      const adminSig = await auth.signChallenge(tokenPayload, adminKeys.privateKey);
      const issued = await mgr.issueCapabilityToken(token, adminSig);
      expect(issued).toBeDefined();

      // Verify
      const valid = await mgr.verifyCapabilityToken(issued);
      expect(valid).toBe(true);
    });

    it('expired token is rejected', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const adminKeys = generateKeypair();
      const granteeKeys = generateKeypair();
      const mgr = new WriteAclManager(store, auth);

      const acl: IAclDocument = {
        writeMode: WriteMode.Restricted,
        authorizedWriters: [],
        aclAdministrators: [adminKeys.publicKey],
        scope: { dbName: 'expdb' },
        version: 1, createdAt: new Date(), updatedAt: new Date(),
        creatorPublicKey: adminKeys.publicKey,
        documentId: 'acl-1', creatorSignature: new Uint8Array(64),
      };
      mgr.setCachedAcl(acl);

      // Already expired
      const expiresAt = new Date(Date.now() - 1000);
      const granteeHex = Buffer.from(granteeKeys.publicKey).toString('hex');
      const msg = `${granteeHex}:expdb::${expiresAt.toISOString()}`;
      const payload = sha256(new TextEncoder().encode(msg));
      const sig = await auth.signChallenge(payload, adminKeys.privateKey);

      const token: ICapabilityToken = {
        granteePublicKey: granteeKeys.publicKey,
        scope: { dbName: 'expdb' },
        expiresAt,
        grantorSignature: sig,
        grantorPublicKey: adminKeys.publicKey,
      };

      expect(await mgr.verifyCapabilityToken(token)).toBe(false);
    });

    it('token signed by non-admin is rejected', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const adminKeys = generateKeypair();
      const fakeAdmin = generateKeypair();
      const granteeKeys = generateKeypair();
      const mgr = new WriteAclManager(store, auth);

      const acl: IAclDocument = {
        writeMode: WriteMode.Restricted,
        authorizedWriters: [],
        aclAdministrators: [adminKeys.publicKey], // fakeAdmin is NOT an admin
        scope: { dbName: 'fakedb' },
        version: 1, createdAt: new Date(), updatedAt: new Date(),
        creatorPublicKey: adminKeys.publicKey,
        documentId: 'acl-1', creatorSignature: new Uint8Array(64),
      };
      mgr.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60_000);
      const granteeHex = Buffer.from(granteeKeys.publicKey).toString('hex');
      const msg = `${granteeHex}:fakedb::${expiresAt.toISOString()}`;
      const payload = sha256(new TextEncoder().encode(msg));
      const sig = await auth.signChallenge(payload, fakeAdmin.privateKey);

      const token: ICapabilityToken = {
        granteePublicKey: granteeKeys.publicKey,
        scope: { dbName: 'fakedb' },
        expiresAt,
        grantorSignature: sig,
        grantorPublicKey: fakeAdmin.publicKey, // not an admin
      };

      expect(await mgr.verifyCapabilityToken(token)).toBe(false);
    });
  });

  // ─── 3. Pool encryption mode ──────────────────────────────────────────

  describe('pool encryption mode', () => {
    const auth = new RealAuth();

    it('PoolShared mode rejects writers who are not pool members', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const adminKeys = generateKeypair();
      const memberKeys = generateKeypair();
      const nonMemberKeys = generateKeypair();
      const mgr = new WriteAclManager(store, auth);

      // Configure pool encryption with memberKeys as the only member
      mgr.setPoolEncryptionConfig(EncryptionMode.PoolShared, [memberKeys.publicKey]);

      // Set ACL with nonMemberKeys as a writer
      const acl: IAclDocument = {
        writeMode: WriteMode.Restricted,
        authorizedWriters: [nonMemberKeys.publicKey],
        aclAdministrators: [adminKeys.publicKey],
        scope: { dbName: 'encdb' },
        version: 1, createdAt: new Date(), updatedAt: new Date(),
        creatorPublicKey: adminKeys.publicKey,
        documentId: 'acl-1', creatorSignature: new Uint8Array(64),
      };

      // Compute payload and sign
      const writersHex = acl.authorizedWriters.map(w => Buffer.from(w).toString('hex')).sort().join(',');
      const adminsHex = acl.aclAdministrators.map(a => Buffer.from(a).toString('hex')).sort().join(',');
      const message = `acl:encdb::1:restricted:writers=${writersHex}:admins=${adminsHex}`;
      const payload = sha256(new TextEncoder().encode(message));
      const sig = await auth.signChallenge(payload, adminKeys.privateKey);

      // Should reject because nonMemberKeys is not a pool member
      await expect(mgr.setAcl(acl, sig, adminKeys.publicKey)).rejects.toThrow();
    });

    it('PoolShared mode accepts writers who are pool members', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const adminKeys = generateKeypair();
      const memberKeys = generateKeypair();
      const mgr = new WriteAclManager(store, auth);

      mgr.setPoolEncryptionConfig(EncryptionMode.PoolShared, [memberKeys.publicKey, adminKeys.publicKey]);

      const acl: IAclDocument = {
        writeMode: WriteMode.Restricted,
        authorizedWriters: [memberKeys.publicKey],
        aclAdministrators: [adminKeys.publicKey],
        scope: { dbName: 'encdb2' },
        version: 1, createdAt: new Date(), updatedAt: new Date(),
        creatorPublicKey: adminKeys.publicKey,
        documentId: 'acl-1', creatorSignature: new Uint8Array(64),
      };

      const writersHex = acl.authorizedWriters.map(w => Buffer.from(w).toString('hex')).sort().join(',');
      const adminsHex = acl.aclAdministrators.map(a => Buffer.from(a).toString('hex')).sort().join(',');
      const message = `acl:encdb2::1:restricted:writers=${writersHex}:admins=${adminsHex}`;
      const payload = sha256(new TextEncoder().encode(message));
      const sig = await auth.signChallenge(payload, adminKeys.privateKey);

      // Should succeed
      await mgr.setAcl(acl, sig, adminKeys.publicKey);
      expect(mgr.isAuthorizedWriter(memberKeys.publicKey, 'encdb2')).toBe(true);
    });

    it('isPoolMember correctly identifies members', () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const auth2 = new RealAuth();
      const mgr = new WriteAclManager(store, auth2);
      const k1 = generateKeypair();
      const k2 = generateKeypair();

      mgr.setPoolEncryptionConfig(EncryptionMode.PoolShared, [k1.publicKey]);
      expect(mgr.isPoolMember(k1.publicKey)).toBe(true);
      expect(mgr.isPoolMember(k2.publicKey)).toBe(false);
    });
  });

  // ─── 4. CBLIndex snapshot + restore ───────────────────────────────────

  describe('CBLIndex snapshot + restore', () => {
    it('snapshot and restore round-trips through block store', async () => {
      const dataDir = await makeTempDir();
      try {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        const db1 = new BrightDb(store, { name: 'snapdb', dataDir });
        await db1.connect();
        const idx1 = new CBLIndex(db1, store, { parityCount: 0 });

        // Add entries
        const { sha3_512 } = await import('@noble/hashes/sha3');
        for (let i = 0; i < 3; i++) {
          const d1 = new Uint8Array(512); d1[0] = i;
          const d2 = new Uint8Array(512); d2[0] = i + 100;
          const h1 = Buffer.from(sha3_512(d1)).toString('hex');
          const h2 = Buffer.from(sha3_512(d2)).toString('hex');
          await store.put(h1, d1);
          await store.put(h2, d2);
          await idx1.addEntry({
            magnetUrl: `magnet:?xt=urn:brightchain:cbl&bs=512&b1=${h1}&b2=${h2}`,
            blockId1: h1 as any, blockId2: h2 as any, blockSize: 512,
            createdAt: new Date(), visibility: CBLVisibility.Public,
          });
        }

        // Take snapshot
        const magnetUrl = await idx1.snapshot();
        expect(magnetUrl).toContain('magnet:');

        // Wipe the collection and restore from snapshot
        const db2 = new BrightDb(store, { name: 'snapdb2' });
        await db2.connect();
        const idx2 = new CBLIndex(db2, store, { parityCount: 0 });

        await idx2.restoreFromSnapshot(magnetUrl);

        // All 3 entries should be restored
        const all = await idx2.query({});
        expect(all).toHaveLength(3);
      } finally {
        await fs.rm(dataDir, { recursive: true, force: true });
      }
    });
  });

  // ─── 5. Schema re-application after restart ───────────────────────────

  describe('schema re-application after restart', () => {
    it('data written with schema validation is intact after restart; schema must be re-applied', async () => {
      const dataDir = await makeTempDir();
      try {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Phase 1: write with schema
        const db1 = new BrightDb(store, { name: 'schemadb', dataDir });
        await db1.connect();
        const col1 = db1.collection('validated');
        col1.setSchema({
          name: 'test',
          properties: { name: { type: 'string', required: true }, age: { type: 'number' } },
          required: ['name'],
          validationLevel: 'strict',
          validationAction: 'error',
        });

        await col1.insertOne({ _id: 'v1', name: 'alice', age: 30 } as never);

        // Invalid doc should be rejected
        await expect(
          col1.insertOne({ _id: 'v2', age: 25 } as never), // missing name
        ).rejects.toThrow();

        // Phase 2: restart — schema is NOT automatically restored
        const reg2 = new PersistentHeadRegistry({ dataDir });
        await reg2.load();
        const db2 = new BrightDb(store, { name: 'schemadb', headRegistry: reg2 });
        await db2.connect();
        const col2 = db2.collection('validated');

        // Data is intact
        const found = await col2.findById('v1');
        expect(found).not.toBeNull();
        expect((found as any).name).toBe('alice');

        // Without schema, invalid doc would be accepted
        await col2.insertOne({ _id: 'v3', age: 99 } as never); // no name — accepted
        expect(await col2.findById('v3')).not.toBeNull();

        // Re-apply schema
        col2.setSchema({
          name: 'test',
          properties: { name: { type: 'string', required: true }, age: { type: 'number' } },
          required: ['name'],
          validationLevel: 'strict',
          validationAction: 'error',
        });

        // Now invalid docs are rejected again
        await expect(
          col2.insertOne({ _id: 'v4', age: 10 } as never),
        ).rejects.toThrow();
      } finally {
        await fs.rm(dataDir, { recursive: true, force: true });
      }
    });
  });
});
