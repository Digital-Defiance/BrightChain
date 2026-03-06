/**
 * @fileoverview Unit tests for WriteAclManager
 *
 * Tests the read/query methods, ACL scope resolution, write proof
 * verification, and capability token verification.
 *
 * Uses a mock INodeAuthenticator to avoid depending on brightchain-api-lib.
 *
 * @see Requirements 1.3, 1.4, 3.2, 3.3, 6.3, 6.4, 6.5
 */

import {
  AclAdminRequiredError,
  AclVersionConflictError,
  CapabilityTokenInvalidError,
  type IAclDocument,
  type IBlockStore,
  type ICapabilityToken,
  type INodeAuthenticator,
  type IWriteProof,
  LastAdministratorError,
  WriteMode,
  createWriteProofPayload,
} from '@brightchain/brightchain-lib';
import { sha256 } from '@noble/hashes/sha256';
import {
  AclChangeEventType,
  type IAclChangeEvent,
  WriteAclManager,
} from './writeAclManager';

// ─── Test Helpers ────────────────────────────────────────────────────

/** Create a deterministic public key from a seed byte. */
function makePublicKey(seed: number): Uint8Array {
  const key = new Uint8Array(33);
  key[0] = 0x02; // compressed prefix
  key[1] = seed;
  return key;
}

/** Create a fake signature from a seed. */
function makeSignature(seed: number): Uint8Array {
  const sig = new Uint8Array(64);
  sig[0] = seed;
  return sig;
}

/**
 * Build a minimal IAclDocument for testing.
 */
function makeAclDocument(
  overrides: Partial<IAclDocument> & {
    scope: IAclDocument['scope'];
    writeMode: WriteMode;
  },
): IAclDocument {
  return {
    documentId: 'test-doc-id',
    writeMode: overrides.writeMode,
    authorizedWriters: overrides.authorizedWriters ?? [],
    aclAdministrators: overrides.aclAdministrators ?? [makePublicKey(0xff)],
    scope: overrides.scope,
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    creatorPublicKey: overrides.creatorPublicKey ?? makePublicKey(0x01),
    creatorSignature: overrides.creatorSignature ?? makeSignature(0x01),
    previousVersionBlockId: overrides.previousVersionBlockId,
  };
}

/**
 * Mock INodeAuthenticator that accepts signatures where
 * the first byte of the signature matches the first byte of the payload hash.
 * This lets us control verification outcomes deterministically.
 */
class MockAuthenticator implements INodeAuthenticator {
  createChallenge(): Uint8Array {
    return new Uint8Array(32);
  }

  async signChallenge(
    challenge: Uint8Array,
    _privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    // Return a signature whose first byte matches the challenge's first byte
    const sig = new Uint8Array(64);
    sig[0] = challenge[0];
    return sig;
  }

  async verifySignature(
    challenge: Uint8Array,
    signature: Uint8Array,
    _publicKey: Uint8Array,
  ): Promise<boolean> {
    // Valid if first byte of signature matches first byte of challenge
    return signature[0] === challenge[0];
  }

  deriveNodeId(publicKey: Uint8Array): string {
    return Buffer.from(publicKey).toString('hex');
  }
}

/** Minimal mock IBlockStore — not used by read/query methods. */
const mockBlockStore = {} as IBlockStore;

/**
 * Compute the ACL mutation payload hash matching WriteAclManager's private method.
 * Used to create valid admin signatures for mutation tests.
 */
function computeAclMutationPayload(aclDoc: IAclDocument): Uint8Array {
  const collName = aclDoc.scope.collectionName ?? '';
  const message = `acl:${aclDoc.scope.dbName}:${collName}:${aclDoc.version}:${aclDoc.writeMode}`;
  const encoded = new TextEncoder().encode(message);
  return sha256(encoded);
}

/**
 * Create a valid admin signature for a given ACL document.
 * The MockAuthenticator accepts signatures where sig[0] === payload[0].
 */
function makeValidAdminSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = payload[0];
  return sig;
}

/**
 * Create an invalid admin signature for a given ACL document.
 */
function makeInvalidAdminSignature(aclDoc: IAclDocument): Uint8Array {
  const payload = computeAclMutationPayload(aclDoc);
  const sig = new Uint8Array(64);
  sig[0] = (payload[0] + 1) % 256;
  return sig;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('WriteAclManager', () => {
  let authenticator: MockAuthenticator;
  let manager: WriteAclManager;

  beforeEach(() => {
    authenticator = new MockAuthenticator();
    manager = new WriteAclManager(mockBlockStore, authenticator);
  });

  // ─── ACL Scope Resolution ────────────────────────────────────────

  describe('resolveAcl / getWriteMode / getAclDocument', () => {
    it('should return Open_Mode when no ACL is configured', () => {
      expect(manager.getWriteMode('mydb')).toBe(WriteMode.Open);
      expect(manager.getWriteMode('mydb', 'users')).toBe(WriteMode.Open);
    });

    it('should return undefined for getAclDocument when no ACL exists', () => {
      expect(manager.getAclDocument('mydb')).toBeUndefined();
      expect(manager.getAclDocument('mydb', 'users')).toBeUndefined();
    });

    it('should return database-level ACL when only db-level is set', () => {
      const dbAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
      });
      manager.setCachedAcl(dbAcl);

      expect(manager.getWriteMode('mydb')).toBe(WriteMode.Restricted);
      expect(manager.getWriteMode('mydb', 'users')).toBe(WriteMode.Restricted);
      expect(manager.getAclDocument('mydb')).toBe(dbAcl);
      expect(manager.getAclDocument('mydb', 'users')).toBe(dbAcl);
    });

    it('should return collection-level ACL when it overrides db-level', () => {
      const dbAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
      });
      const collAcl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb', collectionName: 'users' },
      });
      manager.setCachedAcl(dbAcl);
      manager.setCachedAcl(collAcl);

      // Collection-level overrides
      expect(manager.getWriteMode('mydb', 'users')).toBe(WriteMode.OwnerOnly);
      expect(manager.getAclDocument('mydb', 'users')).toBe(collAcl);

      // Database-level still applies to other collections
      expect(manager.getWriteMode('mydb', 'posts')).toBe(WriteMode.Restricted);
      expect(manager.getWriteMode('mydb')).toBe(WriteMode.Restricted);
    });

    it('should handle multiple databases independently', () => {
      const acl1 = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'db1' },
      });
      const acl2 = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'db2' },
      });
      manager.setCachedAcl(acl1);
      manager.setCachedAcl(acl2);

      expect(manager.getWriteMode('db1')).toBe(WriteMode.Restricted);
      expect(manager.getWriteMode('db2')).toBe(WriteMode.OwnerOnly);
      expect(manager.getWriteMode('db3')).toBe(WriteMode.Open);
    });
  });

  // ─── isAuthorizedWriter ──────────────────────────────────────────

  describe('isAuthorizedWriter', () => {
    it('should return true for any key when no ACL exists (Open_Mode)', () => {
      expect(manager.isAuthorizedWriter(makePublicKey(0x42), 'mydb')).toBe(
        true,
      );
    });

    it('should return true for any key when ACL is Open_Mode', () => {
      const acl = makeAclDocument({
        writeMode: WriteMode.Open,
        scope: { dbName: 'mydb' },
      });
      manager.setCachedAcl(acl);
      expect(manager.isAuthorizedWriter(makePublicKey(0x42), 'mydb')).toBe(
        true,
      );
    });

    it('should return true for authorized writer in Restricted_Mode', () => {
      const writerKey = makePublicKey(0x10);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        authorizedWriters: [writerKey, makePublicKey(0x20)],
      });
      manager.setCachedAcl(acl);
      expect(manager.isAuthorizedWriter(writerKey, 'mydb')).toBe(true);
    });

    it('should return false for non-authorized key in Restricted_Mode', () => {
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        authorizedWriters: [makePublicKey(0x10)],
      });
      manager.setCachedAcl(acl);
      expect(manager.isAuthorizedWriter(makePublicKey(0x99), 'mydb')).toBe(
        false,
      );
    });

    it('should return true for creator in OwnerOnly_Mode', () => {
      const creatorKey = makePublicKey(0x01);
      const acl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        creatorPublicKey: creatorKey,
      });
      manager.setCachedAcl(acl);
      expect(manager.isAuthorizedWriter(creatorKey, 'mydb')).toBe(true);
    });

    it('should return false for non-creator in OwnerOnly_Mode', () => {
      const acl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        creatorPublicKey: makePublicKey(0x01),
      });
      manager.setCachedAcl(acl);
      expect(manager.isAuthorizedWriter(makePublicKey(0x99), 'mydb')).toBe(
        false,
      );
    });
  });

  // ─── isAclAdministrator ──────────────────────────────────────────

  describe('isAclAdministrator', () => {
    it('should return false when no ACL exists', () => {
      expect(manager.isAclAdministrator(makePublicKey(0x01), 'mydb')).toBe(
        false,
      );
    });

    it('should return true for admin in the ACL', () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);
      expect(manager.isAclAdministrator(adminKey, 'mydb')).toBe(true);
    });

    it('should return false for non-admin key', () => {
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [makePublicKey(0xaa)],
      });
      manager.setCachedAcl(acl);
      expect(manager.isAclAdministrator(makePublicKey(0xbb), 'mydb')).toBe(
        false,
      );
    });

    it('should resolve collection-level admin correctly', () => {
      const dbAdmin = makePublicKey(0xaa);
      const collAdmin = makePublicKey(0xbb);
      const dbAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [dbAdmin],
      });
      const collAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb', collectionName: 'users' },
        aclAdministrators: [collAdmin],
      });
      manager.setCachedAcl(dbAcl);
      manager.setCachedAcl(collAcl);

      // Collection-level admin
      expect(manager.isAclAdministrator(collAdmin, 'mydb', 'users')).toBe(true);
      expect(manager.isAclAdministrator(dbAdmin, 'mydb', 'users')).toBe(false);

      // Database-level admin
      expect(manager.isAclAdministrator(dbAdmin, 'mydb')).toBe(true);
    });
  });

  // ─── verifyWriteProof ────────────────────────────────────────────

  describe('verifyWriteProof', () => {
    it('should return true for valid proof from authorized writer', async () => {
      const writerKey = makePublicKey(0x10);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        authorizedWriters: [writerKey],
      });
      manager.setCachedAcl(acl);

      // Create a proof with a signature whose first byte matches the payload hash
      const payload = createWriteProofPayload('mydb', 'users', 'block123');
      const proof: IWriteProof = {
        signerPublicKey: writerKey,
        signature: new Uint8Array([payload[0], ...new Array(63).fill(0)]),
        dbName: 'mydb',
        collectionName: 'users',
        blockId: 'block123',
      };

      const result = await manager.verifyWriteProof(
        proof,
        'mydb',
        'users',
        'block123',
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      const writerKey = makePublicKey(0x10);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        authorizedWriters: [writerKey],
      });
      manager.setCachedAcl(acl);

      // Create a proof with a bad signature (first byte won't match payload hash)
      const payload = createWriteProofPayload('mydb', 'users', 'block123');
      const badFirstByte = (payload[0] + 1) % 256;
      const proof: IWriteProof = {
        signerPublicKey: writerKey,
        signature: new Uint8Array([badFirstByte, ...new Array(63).fill(0)]),
        dbName: 'mydb',
        collectionName: 'users',
        blockId: 'block123',
      };

      const result = await manager.verifyWriteProof(
        proof,
        'mydb',
        'users',
        'block123',
      );
      expect(result).toBe(false);
    });

    it('should return false for valid signature from non-authorized writer', async () => {
      const authorizedKey = makePublicKey(0x10);
      const unauthorizedKey = makePublicKey(0x99);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        authorizedWriters: [authorizedKey],
      });
      manager.setCachedAcl(acl);

      const payload = createWriteProofPayload('mydb', 'users', 'block123');
      const proof: IWriteProof = {
        signerPublicKey: unauthorizedKey,
        signature: new Uint8Array([payload[0], ...new Array(63).fill(0)]),
        dbName: 'mydb',
        collectionName: 'users',
        blockId: 'block123',
      };

      const result = await manager.verifyWriteProof(
        proof,
        'mydb',
        'users',
        'block123',
      );
      expect(result).toBe(false);
    });

    it('should return true in Open_Mode for any valid signature', async () => {
      // No ACL set → Open_Mode
      const anyKey = makePublicKey(0x42);
      const payload = createWriteProofPayload('mydb', 'users', 'block123');
      const proof: IWriteProof = {
        signerPublicKey: anyKey,
        signature: new Uint8Array([payload[0], ...new Array(63).fill(0)]),
        dbName: 'mydb',
        collectionName: 'users',
        blockId: 'block123',
      };

      const result = await manager.verifyWriteProof(
        proof,
        'mydb',
        'users',
        'block123',
      );
      expect(result).toBe(true);
    });
  });

  // ─── verifyCapabilityToken ───────────────────────────────────────

  describe('verifyCapabilityToken', () => {
    it('should return false for expired token', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const token: ICapabilityToken = {
        granteePublicKey: makePublicKey(0x10),
        scope: { dbName: 'mydb', collectionName: 'users' },
        expiresAt: new Date(Date.now() - 1000), // expired
        grantorSignature: new Uint8Array(64),
        grantorPublicKey: adminKey,
      };

      const result = await manager.verifyCapabilityToken(token);
      expect(result).toBe(false);
    });

    it('should return false when grantor is not an admin', async () => {
      const nonAdminKey = makePublicKey(0xbb);
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      // Build a token with valid signature but non-admin grantor
      const expiresAt = new Date(Date.now() + 60000);
      const granteeHex = Buffer.from(makePublicKey(0x10)).toString('hex');
      const message = `${granteeHex}:mydb:users:${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));

      const token: ICapabilityToken = {
        granteePublicKey: makePublicKey(0x10),
        scope: { dbName: 'mydb', collectionName: 'users' },
        expiresAt,
        grantorSignature: new Uint8Array([
          payloadHash[0],
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: nonAdminKey,
      };

      const result = await manager.verifyCapabilityToken(token);
      expect(result).toBe(false);
    });

    it('should return true for valid, non-expired token from admin', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeHex = Buffer.from(makePublicKey(0x10)).toString('hex');
      const message = `${granteeHex}:mydb:users:${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));

      const token: ICapabilityToken = {
        granteePublicKey: makePublicKey(0x10),
        scope: { dbName: 'mydb', collectionName: 'users' },
        expiresAt,
        grantorSignature: new Uint8Array([
          payloadHash[0],
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: adminKey,
      };

      const result = await manager.verifyCapabilityToken(token);
      expect(result).toBe(true);
    });

    it('should return false for invalid grantor signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeHex = Buffer.from(makePublicKey(0x10)).toString('hex');
      const message = `${granteeHex}:mydb:users:${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));
      const badFirstByte = (payloadHash[0] + 1) % 256;

      const token: ICapabilityToken = {
        granteePublicKey: makePublicKey(0x10),
        scope: { dbName: 'mydb', collectionName: 'users' },
        expiresAt,
        grantorSignature: new Uint8Array([
          badFirstByte,
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: adminKey,
      };

      const result = await manager.verifyCapabilityToken(token);
      expect(result).toBe(false);
    });
  });

  // ─── issueCapabilityToken ────────────────────────────────────────

  describe('issueCapabilityToken', () => {
    it('should issue a valid capability token when grantor is admin with valid signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeKey = makePublicKey(0x10);
      const granteeHex = Buffer.from(granteeKey).toString('hex');
      const message = `${granteeHex}:mydb::${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));

      const token: ICapabilityToken = {
        granteePublicKey: granteeKey,
        scope: { dbName: 'mydb' },
        expiresAt,
        grantorSignature: new Uint8Array([
          payloadHash[0],
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: adminKey,
      };

      // adminSignature must also match the payload
      const adminSig = new Uint8Array([
        payloadHash[0],
        ...new Array(63).fill(0),
      ]);

      const result = await manager.issueCapabilityToken(token, adminSig);
      expect(result).toBe(token);
    });

    it('should issue a token for collection-level scope', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb', collectionName: 'users' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeKey = makePublicKey(0x10);
      const granteeHex = Buffer.from(granteeKey).toString('hex');
      const message = `${granteeHex}:mydb:users:${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));

      const token: ICapabilityToken = {
        granteePublicKey: granteeKey,
        scope: { dbName: 'mydb', collectionName: 'users' },
        expiresAt,
        grantorSignature: new Uint8Array([
          payloadHash[0],
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: adminKey,
      };

      const adminSig = new Uint8Array([
        payloadHash[0],
        ...new Array(63).fill(0),
      ]);

      const result = await manager.issueCapabilityToken(token, adminSig);
      expect(result).toBe(token);
    });

    it('should reject when grantor is not an ACL administrator', async () => {
      const adminKey = makePublicKey(0xaa);
      const nonAdminKey = makePublicKey(0xbb);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeKey = makePublicKey(0x10);

      const token: ICapabilityToken = {
        granteePublicKey: granteeKey,
        scope: { dbName: 'mydb' },
        expiresAt,
        grantorSignature: new Uint8Array(64),
        grantorPublicKey: nonAdminKey,
      };

      await expect(
        manager.issueCapabilityToken(token, new Uint8Array(64)),
      ).rejects.toThrow(AclAdminRequiredError);
    });

    it('should reject when admin signature is invalid', async () => {
      const adminKey = makePublicKey(0xaa);
      const acl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
      });
      manager.setCachedAcl(acl);

      const expiresAt = new Date(Date.now() + 60000);
      const granteeKey = makePublicKey(0x10);
      const granteeHex = Buffer.from(granteeKey).toString('hex');
      const message = `${granteeHex}:mydb::${expiresAt.toISOString()}`;
      const payloadHash = sha256(new TextEncoder().encode(message));
      const badFirstByte = (payloadHash[0] + 1) % 256;

      const token: ICapabilityToken = {
        granteePublicKey: granteeKey,
        scope: { dbName: 'mydb' },
        expiresAt,
        grantorSignature: new Uint8Array([
          payloadHash[0],
          ...new Array(63).fill(0),
        ]),
        grantorPublicKey: adminKey,
      };

      // Bad admin signature (first byte doesn't match payload)
      const badAdminSig = new Uint8Array([
        badFirstByte,
        ...new Array(63).fill(0),
      ]);

      await expect(
        manager.issueCapabilityToken(token, badAdminSig),
      ).rejects.toThrow(CapabilityTokenInvalidError);
    });

    it('should reject when no ACL exists for the scope (no admin)', async () => {
      const someKey = makePublicKey(0xaa);
      const expiresAt = new Date(Date.now() + 60000);

      const token: ICapabilityToken = {
        granteePublicKey: makePublicKey(0x10),
        scope: { dbName: 'nonexistent' },
        expiresAt,
        grantorSignature: new Uint8Array(64),
        grantorPublicKey: someKey,
      };

      await expect(
        manager.issueCapabilityToken(token, new Uint8Array(64)),
      ).rejects.toThrow(AclAdminRequiredError);
    });
  });

  // ─── Cache Management ────────────────────────────────────────────

  describe('cache management', () => {
    it('should track cache size', () => {
      expect(manager.cacheSize).toBe(0);

      manager.setCachedAcl(
        makeAclDocument({
          writeMode: WriteMode.Restricted,
          scope: { dbName: 'db1' },
        }),
      );
      expect(manager.cacheSize).toBe(1);

      manager.setCachedAcl(
        makeAclDocument({
          writeMode: WriteMode.Restricted,
          scope: { dbName: 'db1', collectionName: 'users' },
        }),
      );
      expect(manager.cacheSize).toBe(2);
    });

    it('should remove cached ACL', () => {
      manager.setCachedAcl(
        makeAclDocument({
          writeMode: WriteMode.Restricted,
          scope: { dbName: 'db1' },
        }),
      );
      expect(manager.cacheSize).toBe(1);

      const removed = manager.removeCachedAcl('db1');
      expect(removed).toBe(true);
      expect(manager.cacheSize).toBe(0);
      expect(manager.getWriteMode('db1')).toBe(WriteMode.Open);
    });

    it('should return false when removing non-existent ACL', () => {
      const removed = manager.removeCachedAcl('nonexistent');
      expect(removed).toBe(false);
    });

    it('should overwrite existing ACL on setCachedAcl', () => {
      manager.setCachedAcl(
        makeAclDocument({
          writeMode: WriteMode.Restricted,
          scope: { dbName: 'db1' },
        }),
      );
      expect(manager.getWriteMode('db1')).toBe(WriteMode.Restricted);

      manager.setCachedAcl(
        makeAclDocument({
          writeMode: WriteMode.OwnerOnly,
          scope: { dbName: 'db1' },
        }),
      );
      expect(manager.getWriteMode('db1')).toBe(WriteMode.OwnerOnly);
      expect(manager.cacheSize).toBe(1);
    });
  });

  // ─── setAcl ──────────────────────────────────────────────────────

  describe('setAcl', () => {
    it('should set a new ACL document with valid admin signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const aclDoc = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const sig = makeValidAdminSignature(aclDoc);

      const key = await manager.setAcl(aclDoc, sig, adminKey);
      expect(key).toBe('mydb');
      expect(manager.getWriteMode('mydb')).toBe(WriteMode.Restricted);
      expect(manager.getAclDocument('mydb')).toBe(aclDoc);
    });

    it('should reject setAcl with invalid admin signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const aclDoc = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const badSig = makeInvalidAdminSignature(aclDoc);

      await expect(manager.setAcl(aclDoc, badSig, adminKey)).rejects.toThrow(
        AclAdminRequiredError,
      );
    });

    it('should reject setAcl when signer is not a current admin', async () => {
      const adminKey = makePublicKey(0xaa);
      const nonAdminKey = makePublicKey(0xbb);

      // Set initial ACL with adminKey as admin
      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      // Try to update with nonAdminKey (valid signature but not an admin)
      const newAcl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 2,
      });
      const sig = makeValidAdminSignature(newAcl);

      await expect(manager.setAcl(newAcl, sig, nonAdminKey)).rejects.toThrow(
        AclAdminRequiredError,
      );
    });

    it('should enforce monotonically increasing version numbers', async () => {
      const adminKey = makePublicKey(0xaa);

      // Set initial ACL at version 5
      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 5,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      // Try to set ACL with version <= 5
      const staleAcl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 5,
      });
      const staleSig = makeValidAdminSignature(staleAcl);

      await expect(
        manager.setAcl(staleAcl, staleSig, adminKey),
      ).rejects.toThrow(AclVersionConflictError);

      // Lower version also rejected
      const olderAcl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 3,
      });
      const olderSig = makeValidAdminSignature(olderAcl);

      await expect(
        manager.setAcl(olderAcl, olderSig, adminKey),
      ).rejects.toThrow(AclVersionConflictError);
    });

    it('should accept setAcl with version > current version', async () => {
      const adminKey = makePublicKey(0xaa);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      const newAcl = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 2,
      });
      const newSig = makeValidAdminSignature(newAcl);

      const key = await manager.setAcl(newAcl, newSig, adminKey);
      expect(key).toBe('mydb');
      expect(manager.getWriteMode('mydb')).toBe(WriteMode.OwnerOnly);
    });

    it('should emit AclSet change event', async () => {
      const adminKey = makePublicKey(0xaa);
      const events: IAclChangeEvent[] = [];
      manager.on((e) => events.push(e));

      const aclDoc = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const sig = makeValidAdminSignature(aclDoc);
      await manager.setAcl(aclDoc, sig, adminKey);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AclChangeEventType.AclSet);
      expect(events[0].dbName).toBe('mydb');
      expect(events[0].newVersion).toBe(1);
      expect(events[0].adminPublicKey).toBe(adminKey);
    });

    it('should handle collection-level ACL scope', async () => {
      const adminKey = makePublicKey(0xaa);
      const aclDoc = makeAclDocument({
        writeMode: WriteMode.OwnerOnly,
        scope: { dbName: 'mydb', collectionName: 'users' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const sig = makeValidAdminSignature(aclDoc);

      const key = await manager.setAcl(aclDoc, sig, adminKey);
      expect(key).toBe('mydb:users');
      expect(manager.getWriteMode('mydb', 'users')).toBe(WriteMode.OwnerOnly);
      // Database-level should still be Open
      expect(manager.getWriteMode('mydb')).toBe(WriteMode.Open);
    });
  });

  // ─── addWriter ───────────────────────────────────────────────────

  describe('addWriter', () => {
    it('should add a writer to an existing ACL', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      // Set up initial ACL
      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      // Compute the signature for the addWriter mutation payload
      // The mutation uses the current ACL to compute the payload
      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);

      await manager.addWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.version).toBe(2);
      expect(updatedAcl.authorizedWriters).toHaveLength(1);
      expect(manager.isAuthorizedWriter(writerKey, 'mydb')).toBe(true);
    });

    it('should reject addWriter with invalid admin signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      const currentAcl = manager.getAclDocument('mydb')!;
      const badSig = makeInvalidAdminSignature(currentAcl);

      await expect(
        manager.addWriter('mydb', undefined, writerKey, badSig, adminKey),
      ).rejects.toThrow(AclAdminRequiredError);
    });

    it('should not duplicate an existing writer', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [writerKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.authorizedWriters).toHaveLength(1);
    });

    it('should emit WriterAdded change event', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);
      const events: IAclChangeEvent[] = [];

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      // Register listener after setAcl to only capture addWriter events
      manager.on((e) => events.push(e));

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AclChangeEventType.WriterAdded);
      expect(events[0].affectedPublicKey).toBe(writerKey);
    });

    it('should create a default ACL when none exists', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      // No ACL set — addWriter should create a default one
      // For a new ACL, the payload is computed from the default ACL (version 0)
      const defaultAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'newdb' },
        aclAdministrators: [adminKey],
        version: 0,
      });
      const sig = makeValidAdminSignature(defaultAcl);

      await manager.addWriter('newdb', undefined, writerKey, sig, adminKey);

      const acl = manager.getAclDocument('newdb')!;
      expect(acl).toBeDefined();
      expect(acl.version).toBe(1);
      expect(acl.authorizedWriters).toHaveLength(1);
      expect(manager.isAuthorizedWriter(writerKey, 'newdb')).toBe(true);
    });
  });

  // ─── removeWriter ────────────────────────────────────────────────

  describe('removeWriter', () => {
    it('should remove a writer from the ACL', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [writerKey, makePublicKey(0x20)],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.removeWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.version).toBe(2);
      expect(updatedAcl.authorizedWriters).toHaveLength(1);
      expect(manager.isAuthorizedWriter(writerKey, 'mydb')).toBe(false);
    });

    it('should reject removeWriter with invalid admin signature', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [writerKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      const currentAcl = manager.getAclDocument('mydb')!;
      const badSig = makeInvalidAdminSignature(currentAcl);

      await expect(
        manager.removeWriter('mydb', undefined, writerKey, badSig, adminKey),
      ).rejects.toThrow(AclAdminRequiredError);
    });

    it('should emit WriterRemoved change event', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);
      const events: IAclChangeEvent[] = [];

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [writerKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      manager.on((e) => events.push(e));

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.removeWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AclChangeEventType.WriterRemoved);
      expect(events[0].affectedPublicKey).toBe(writerKey);
    });

    it('should immediately revoke write access after removal', async () => {
      const adminKey = makePublicKey(0xaa);
      const writerKey = makePublicKey(0x10);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        authorizedWriters: [writerKey],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, adminKey);

      // Writer is authorized before removal
      expect(manager.isAuthorizedWriter(writerKey, 'mydb')).toBe(true);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.removeWriter(
        'mydb',
        undefined,
        writerKey,
        mutationSig,
        adminKey,
      );

      // Writer is no longer authorized after removal
      expect(manager.isAuthorizedWriter(writerKey, 'mydb')).toBe(false);
    });
  });

  // ─── addAdmin ────────────────────────────────────────────────────

  describe('addAdmin', () => {
    it('should add a new admin to the ACL', async () => {
      const existingAdmin = makePublicKey(0xaa);
      const newAdmin = makePublicKey(0xbb);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [existingAdmin],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, existingAdmin);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addAdmin(
        'mydb',
        undefined,
        newAdmin,
        mutationSig,
        existingAdmin,
      );

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.version).toBe(2);
      expect(updatedAcl.aclAdministrators).toHaveLength(2);
      expect(manager.isAclAdministrator(newAdmin, 'mydb')).toBe(true);
    });

    it('should reject addAdmin with invalid signature', async () => {
      const existingAdmin = makePublicKey(0xaa);
      const newAdmin = makePublicKey(0xbb);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [existingAdmin],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, existingAdmin);

      const currentAcl = manager.getAclDocument('mydb')!;
      const badSig = makeInvalidAdminSignature(currentAcl);

      await expect(
        manager.addAdmin('mydb', undefined, newAdmin, badSig, existingAdmin),
      ).rejects.toThrow(AclAdminRequiredError);
    });

    it('should not duplicate an existing admin', async () => {
      const existingAdmin = makePublicKey(0xaa);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [existingAdmin],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, existingAdmin);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addAdmin(
        'mydb',
        undefined,
        existingAdmin,
        mutationSig,
        existingAdmin,
      );

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.aclAdministrators).toHaveLength(1);
    });

    it('should emit AdminAdded change event', async () => {
      const existingAdmin = makePublicKey(0xaa);
      const newAdmin = makePublicKey(0xbb);
      const events: IAclChangeEvent[] = [];

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [existingAdmin],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, existingAdmin);

      manager.on((e) => events.push(e));

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addAdmin(
        'mydb',
        undefined,
        newAdmin,
        mutationSig,
        existingAdmin,
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AclChangeEventType.AdminAdded);
      expect(events[0].affectedPublicKey).toBe(newAdmin);
    });
  });

  // ─── removeAdmin ─────────────────────────────────────────────────

  describe('removeAdmin', () => {
    it('should remove an admin when multiple admins exist', async () => {
      const admin1 = makePublicKey(0xaa);
      const admin2 = makePublicKey(0xbb);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [admin1, admin2],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, admin1);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.removeAdmin('mydb', undefined, admin2, mutationSig, admin1);

      const updatedAcl = manager.getAclDocument('mydb')!;
      expect(updatedAcl.version).toBe(2);
      expect(updatedAcl.aclAdministrators).toHaveLength(1);
      expect(manager.isAclAdministrator(admin2, 'mydb')).toBe(false);
      expect(manager.isAclAdministrator(admin1, 'mydb')).toBe(true);
    });

    it('should reject removal of the last administrator', async () => {
      const soleAdmin = makePublicKey(0xaa);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [soleAdmin],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, soleAdmin);

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);

      await expect(
        manager.removeAdmin(
          'mydb',
          undefined,
          soleAdmin,
          mutationSig,
          soleAdmin,
        ),
      ).rejects.toThrow(LastAdministratorError);

      // ACL should remain unchanged
      expect(manager.getAclDocument('mydb')!.aclAdministrators).toHaveLength(1);
      expect(manager.getAclDocument('mydb')!.version).toBe(1);
    });

    it('should reject removeAdmin with invalid signature', async () => {
      const admin1 = makePublicKey(0xaa);
      const admin2 = makePublicKey(0xbb);

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [admin1, admin2],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, admin1);

      const currentAcl = manager.getAclDocument('mydb')!;
      const badSig = makeInvalidAdminSignature(currentAcl);

      await expect(
        manager.removeAdmin('mydb', undefined, admin2, badSig, admin1),
      ).rejects.toThrow(AclAdminRequiredError);
    });

    it('should emit AdminRemoved change event', async () => {
      const admin1 = makePublicKey(0xaa);
      const admin2 = makePublicKey(0xbb);
      const events: IAclChangeEvent[] = [];

      const initialAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [admin1, admin2],
        version: 1,
      });
      const initialSig = makeValidAdminSignature(initialAcl);
      await manager.setAcl(initialAcl, initialSig, admin1);

      manager.on((e) => events.push(e));

      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.removeAdmin('mydb', undefined, admin2, mutationSig, admin1);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AclChangeEventType.AdminRemoved);
      expect(events[0].affectedPublicKey).toBe(admin2);
    });

    it('should reject removal of last admin for collection-level ACL', async () => {
      const soleAdmin = makePublicKey(0xaa);

      const collAcl = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb', collectionName: 'users' },
        aclAdministrators: [soleAdmin],
        version: 1,
      });
      const sig = makeValidAdminSignature(collAcl);
      await manager.setAcl(collAcl, sig, soleAdmin);

      const currentAcl = manager.getAclDocument('mydb', 'users')!;
      const mutationSig = makeValidAdminSignature(currentAcl);

      await expect(
        manager.removeAdmin('mydb', 'users', soleAdmin, mutationSig, soleAdmin),
      ).rejects.toThrow(LastAdministratorError);
    });
  });

  // ─── Event Listener Management ───────────────────────────────────

  describe('event listener management', () => {
    it('should support registering and removing listeners', async () => {
      const adminKey = makePublicKey(0xaa);
      const events: IAclChangeEvent[] = [];
      const listener = (e: IAclChangeEvent) => events.push(e);

      manager.on(listener);

      const aclDoc = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const sig = makeValidAdminSignature(aclDoc);
      await manager.setAcl(aclDoc, sig, adminKey);

      expect(events).toHaveLength(1);

      // Remove listener
      manager.off(listener);

      // Subsequent mutations should not trigger the removed listener
      const currentAcl = manager.getAclDocument('mydb')!;
      const mutationSig = makeValidAdminSignature(currentAcl);
      await manager.addWriter(
        'mydb',
        undefined,
        makePublicKey(0x10),
        mutationSig,
        adminKey,
      );

      expect(events).toHaveLength(1); // still 1, not 2
    });

    it('should support multiple listeners', async () => {
      const adminKey = makePublicKey(0xaa);
      const events1: IAclChangeEvent[] = [];
      const events2: IAclChangeEvent[] = [];

      manager.on((e) => events1.push(e));
      manager.on((e) => events2.push(e));

      const aclDoc = makeAclDocument({
        writeMode: WriteMode.Restricted,
        scope: { dbName: 'mydb' },
        aclAdministrators: [adminKey],
        version: 1,
      });
      const sig = makeValidAdminSignature(aclDoc);
      await manager.setAcl(aclDoc, sig, adminKey);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });
  });
});
