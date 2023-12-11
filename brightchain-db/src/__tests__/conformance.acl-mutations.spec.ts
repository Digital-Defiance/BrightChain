/**
 * @fileoverview E2E tests for WriteAclManager mutation operations with real ECDSA.
 *
 * Proves:
 *   1. setAcl with real admin signature
 *   2. addWriter with real admin signature
 *   3. removeWriter with real admin signature
 *   4. Version conflict detection
 *   5. Non-admin signature rejected for mutations
 */

import {
  BlockSize,
  initializeBrightChain,
  PooledMemoryBlockStore,
  resetInitialization,
  WriteMode,
} from '@brightchain/brightchain-lib';
import type { IAclDocument, INodeAuthenticator } from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';
import { sha256 } from '@noble/hashes/sha256';
import { WriteAclManager } from '../lib/writeAclManager';

jest.setTimeout(30_000);

function generateKeypair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    publicKey: new Uint8Array(ecdh.getPublicKey()),
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
  };
}

function ensureUncompressed(pk: Uint8Array): Buffer {
  if (pk.length === 65 && pk[0] === 0x04) return Buffer.from(pk);
  if (pk.length === 33 && (pk[0] === 0x02 || pk[0] === 0x03)) {
    return crypto.ECDH.convertKey(Buffer.from(pk), 'secp256k1', undefined, undefined, 'uncompressed') as Buffer;
  }
  throw new Error(`Invalid key length: ${pk.length}`);
}

class RealAuthenticator implements INodeAuthenticator {
  createChallenge(): Uint8Array { return new Uint8Array(crypto.randomBytes(32)); }

  async signChallenge(challenge: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(privateKey));
    const pub = ecdh.getPublicKey();
    const key = crypto.createPrivateKey({
      key: { kty: 'EC', crv: 'secp256k1', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33, 65).toString('base64url'), d: Buffer.from(privateKey).toString('base64url') },
      format: 'jwk',
    });
    return new Uint8Array(crypto.sign(null, Buffer.from(challenge), key));
  }

  async verifySignature(challenge: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      const pub = ensureUncompressed(publicKey);
      const key = crypto.createPublicKey({
        key: { kty: 'EC', crv: 'secp256k1', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33, 65).toString('base64url') },
        format: 'jwk',
      });
      return crypto.verify(null, Buffer.from(challenge), key, Buffer.from(signature));
    } catch { return false; }
  }

  deriveNodeId(publicKey: Uint8Array): string {
    return crypto.createHash('sha256').update(Buffer.from(publicKey)).digest('hex');
  }
}

/** Compute the ACL mutation payload the same way WriteAclManager does */
function computeAclPayload(aclDoc: IAclDocument): Uint8Array {
  const writersHex = aclDoc.authorizedWriters.map(w => Buffer.from(w).toString('hex')).sort().join(',');
  const adminsHex = aclDoc.aclAdministrators.map(a => Buffer.from(a).toString('hex')).sort().join(',');
  const collName = aclDoc.scope.collectionName ?? '';
  const message = `acl:${aclDoc.scope.dbName}:${collName}:${aclDoc.version}:${aclDoc.writeMode}:writers=${writersHex}:admins=${adminsHex}`;
  return sha256(new TextEncoder().encode(message));
}

function makeAclDoc(
  adminKey: Uint8Array, writers: Uint8Array[], admins: Uint8Array[],
  dbName: string, version = 1, mode = WriteMode.Restricted,
): IAclDocument {
  const now = new Date();
  return {
    writeMode: mode, authorizedWriters: writers, aclAdministrators: admins,
    scope: { dbName }, version, createdAt: now, updatedAt: now,
    creatorPublicKey: adminKey, documentId: `acl-v${version}`,
    creatorSignature: new Uint8Array(64),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

describe('WriteAclManager mutations e2e (real ECDSA)', () => {
  const auth = new RealAuthenticator();
  let adminKeys: ReturnType<typeof generateKeypair>;
  let writerKeys: ReturnType<typeof generateKeypair>;
  let newWriterKeys: ReturnType<typeof generateKeypair>;
  let nonAdminKeys: ReturnType<typeof generateKeypair>;

  beforeAll(() => {
    initializeBrightChain();
    adminKeys = generateKeypair();
    writerKeys = generateKeypair();
    newWriterKeys = generateKeypair();
    nonAdminKeys = generateKeypair();
  });

  afterAll(() => { resetInitialization(); });

  it('setAcl with valid admin signature succeeds', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    const acl = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'setdb');
    const payload = computeAclPayload(acl);
    const sig = await auth.signChallenge(payload, adminKeys.privateKey);

    const key = await mgr.setAcl(acl, sig, adminKeys.publicKey);
    expect(key).toBeDefined();

    // Verify the ACL is active
    expect(mgr.getWriteMode('setdb')).toBe(WriteMode.Restricted);
    expect(mgr.isAuthorizedWriter(writerKeys.publicKey, 'setdb')).toBe(true);
    expect(mgr.isAuthorizedWriter(nonAdminKeys.publicKey, 'setdb')).toBe(false);
  });

  it('setAcl with invalid signature is rejected', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    const acl = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'baddb');
    // Sign with wrong key
    const payload = computeAclPayload(acl);
    const badSig = await auth.signChallenge(payload, nonAdminKeys.privateKey);

    await expect(mgr.setAcl(acl, badSig, adminKeys.publicKey)).rejects.toThrow();
  });

  it('setAcl version conflict is rejected', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    // Set version 2
    const acl2 = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'verdb', 2);
    const payload2 = computeAclPayload(acl2);
    const sig2 = await auth.signChallenge(payload2, adminKeys.privateKey);
    await mgr.setAcl(acl2, sig2, adminKeys.publicKey);

    // Try to set version 1 (lower) — should fail
    const acl1 = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'verdb', 1);
    const payload1 = computeAclPayload(acl1);
    const sig1 = await auth.signChallenge(payload1, adminKeys.privateKey);
    await expect(mgr.setAcl(acl1, sig1, adminKeys.publicKey)).rejects.toThrow();
  });

  it('addWriter with valid admin signature succeeds', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    // First set an ACL
    const acl = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'adddb');
    const payload = computeAclPayload(acl);
    const sig = await auth.signChallenge(payload, adminKeys.privateKey);
    await mgr.setAcl(acl, sig, adminKeys.publicKey);

    expect(mgr.isAuthorizedWriter(newWriterKeys.publicKey, 'adddb')).toBe(false);

    // Add a new writer — sign the CURRENT ACL (addWriter verifies against current state)
    const currentAcl = mgr.getAclDocument('adddb')!;
    const addPayload = computeAclPayload(currentAcl);
    const addSig = await auth.signChallenge(addPayload, adminKeys.privateKey);

    await mgr.addWriter('adddb', undefined, newWriterKeys.publicKey, addSig, adminKeys.publicKey);

    expect(mgr.isAuthorizedWriter(newWriterKeys.publicKey, 'adddb')).toBe(true);
  });

  it('non-admin cannot add a writer', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    const acl = makeAclDoc(adminKeys.publicKey, [writerKeys.publicKey], [adminKeys.publicKey], 'nonaddb');
    const payload = computeAclPayload(acl);
    const sig = await auth.signChallenge(payload, adminKeys.privateKey);
    await mgr.setAcl(acl, sig, adminKeys.publicKey);

    // Non-admin tries to add a writer — sign the current ACL with non-admin key
    const currentAcl = mgr.getAclDocument('nonaddb')!;
    const fakePayload = computeAclPayload(currentAcl);
    const fakeSig = await auth.signChallenge(fakePayload, nonAdminKeys.privateKey);

    await expect(
      mgr.addWriter('nonaddb', undefined, newWriterKeys.publicKey, fakeSig, nonAdminKeys.publicKey),
    ).rejects.toThrow();
  });

  it('removeWriter with valid admin signature succeeds', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const mgr = new WriteAclManager(store, auth);

    const acl = makeAclDoc(
      adminKeys.publicKey,
      [writerKeys.publicKey, newWriterKeys.publicKey],
      [adminKeys.publicKey],
      'rmdb',
    );
    const payload = computeAclPayload(acl);
    const sig = await auth.signChallenge(payload, adminKeys.privateKey);
    await mgr.setAcl(acl, sig, adminKeys.publicKey);

    expect(mgr.isAuthorizedWriter(newWriterKeys.publicKey, 'rmdb')).toBe(true);

    // Remove the writer — sign the CURRENT ACL
    const currentAcl = mgr.getAclDocument('rmdb')!;
    const rmPayload = computeAclPayload(currentAcl);
    const rmSig = await auth.signChallenge(rmPayload, adminKeys.privateKey);

    await mgr.removeWriter('rmdb', undefined, newWriterKeys.publicKey, rmSig, adminKeys.publicKey);

    expect(mgr.isAuthorizedWriter(newWriterKeys.publicKey, 'rmdb')).toBe(false);
    expect(mgr.isAuthorizedWriter(writerKeys.publicKey, 'rmdb')).toBe(true);
  });
});
