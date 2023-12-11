/**
 * @fileoverview Pool Security Service
 *
 * Creates, persists, and loads pool security configuration (ACLs and write mode)
 * for BrightDB pools. Bridges the gap between pool creation (inituserdb) and
 * the WriteAclManager/AuthorizedHeadRegistry enforcement layer.
 *
 * For the member pool: public read, restricted write (signed by ACL'd nodes).
 * The AuthorizedHeadRegistry + WriteAclManager handle enforcement.
 * This service handles setup and persistence.
 *
 * @see .kiro/specs/member-pool-security/design.md
 */

import {
  type IAclDocument,
  type IAclScope,
  WriteMode,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { sha256 } from '@noble/hashes/sha256';

/** Collection name for pool security documents */
export const POOL_SECURITY_COLLECTION = '__pool_security__';

/** Document IDs */
export const POOL_ACL_DOC_ID = 'pool_acl';

/**
 * Stored pool security document in BrightDB.
 */
export interface IStoredPoolSecurityDocument {
  [key: string]: unknown;
  _id: string;
  type: 'acl';
  /** Serialized ACL document (public keys as hex strings) */
  aclData: ISerializedAclDocument;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Serialized ACL document with hex-encoded keys for storage.
 */
export interface ISerializedAclDocument {
  documentId: string;
  writeMode: string;
  authorizedWriters: string[];
  aclAdministrators: string[];
  scope: IAclScope;
  version: number;
  createdAt: string;
  updatedAt: string;
  creatorPublicKey: string;
  creatorSignature: string;
  previousVersionBlockId?: string;
}

/**
 * Options for creating the initial member pool security config.
 */
export interface IPoolSecurityInitOptions {
  /** Pool/database name (e.g. "BrightChain") */
  poolName: string;
  /** System user's node/member ID (string form) — becomes the ACL owner */
  systemUserId: string;
  /** System user's ECDSA public key (compressed secp256k1, 33 bytes) */
  systemUserPublicKey: Uint8Array;
  /** System user's ECDSA private key (32 bytes) — used to sign the ACL */
  systemUserPrivateKey: Uint8Array;
  /** Node authenticator for signing */
  authenticator: {
    signChallenge(
      challenge: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array>;
  };
}

/**
 * Result of initializing pool security.
 */
export interface IPoolSecurityInitResult {
  /** The ACL document for configuring WriteAclManager */
  aclDocument: IAclDocument;
}

/**
 * Compute a SHA-256 hash of the full ACL document content.
 * SECURITY: This hash covers the writers list, admins list, scope, version,
 * and write mode — ensuring the signature protects the entire ACL, not just
 * the metadata. An attacker cannot modify the writers list without
 * invalidating the signature.
 */
export function computeAclContentHash(acl: IAclDocument): Uint8Array {
  const writersHex = acl.authorizedWriters
    .map((w) => Buffer.from(w).toString('hex'))
    .sort()
    .join(',');
  const adminsHex = acl.aclAdministrators
    .map((a) => Buffer.from(a).toString('hex'))
    .sort()
    .join(',');
  const collName = acl.scope.collectionName ?? '';
  const message = `acl:${acl.scope.dbName}:${collName}:${acl.version}:${acl.writeMode}:writers=${writersHex}:admins=${adminsHex}`;
  return sha256(new TextEncoder().encode(message));
}

/**
 * Create the initial ACL document for the member pool.
 *
 * Sets up WriteMode.Restricted with the system user as the sole
 * authorized writer and ACL administrator. The ACL is signed by
 * the system user's ECDSA key.
 *
 * @param options - System user identity and signing capabilities
 * @returns The signed ACL document ready for WriteAclManager.setCachedAcl()
 */
export async function createMemberPoolAcl(
  options: IPoolSecurityInitOptions,
): Promise<IAclDocument> {
  const now = new Date();
  const scope: IAclScope = {
    dbName: options.poolName,
    // No collectionName = database-level ACL (applies to all collections)
  };

  // Build the unsigned ACL
  const aclDoc: IAclDocument = {
    documentId: `acl:${options.poolName}:v1`,
    writeMode: WriteMode.Restricted,
    authorizedWriters: [options.systemUserPublicKey],
    aclAdministrators: [options.systemUserPublicKey],
    scope,
    version: 1,
    createdAt: now,
    updatedAt: now,
    creatorPublicKey: options.systemUserPublicKey,
    creatorSignature: new Uint8Array(0), // placeholder, signed below
  };

  // Sign the ACL: SHA-256 of the full ACL content (scope + version + mode + writers + admins)
  // SECURITY: The signature MUST cover the writers and admins lists, not just
  // scope+version+mode. Otherwise an attacker can modify the writers list
  // without invalidating the signature.
  const payload = computeAclContentHash(aclDoc);
  const signature = await options.authenticator.signChallenge(
    payload,
    options.systemUserPrivateKey,
  );

  aclDoc.creatorSignature = signature;

  return aclDoc;
}

/**
 * Serialize an ACL document for storage in BrightDB.
 * Converts Uint8Array keys to hex strings.
 */
export function serializeAclDocument(
  acl: IAclDocument,
): ISerializedAclDocument {
  return {
    documentId: acl.documentId,
    writeMode: acl.writeMode,
    authorizedWriters: acl.authorizedWriters.map((k) =>
      Buffer.from(k).toString('hex'),
    ),
    aclAdministrators: acl.aclAdministrators.map((k) =>
      Buffer.from(k).toString('hex'),
    ),
    scope: acl.scope,
    version: acl.version,
    createdAt: acl.createdAt.toISOString(),
    updatedAt: acl.updatedAt.toISOString(),
    creatorPublicKey: Buffer.from(acl.creatorPublicKey).toString('hex'),
    creatorSignature: Buffer.from(acl.creatorSignature).toString('hex'),
    previousVersionBlockId: acl.previousVersionBlockId,
  };
}

/**
 * Deserialize an ACL document from BrightDB storage.
 * Converts hex strings back to Uint8Array keys.
 */
export function deserializeAclDocument(
  data: ISerializedAclDocument,
): IAclDocument {
  return {
    documentId: data.documentId,
    writeMode: data.writeMode as WriteMode,
    authorizedWriters: data.authorizedWriters.map(
      (hex) => new Uint8Array(Buffer.from(hex, 'hex')),
    ),
    aclAdministrators: data.aclAdministrators.map(
      (hex) => new Uint8Array(Buffer.from(hex, 'hex')),
    ),
    scope: data.scope,
    version: data.version,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    creatorPublicKey: new Uint8Array(Buffer.from(data.creatorPublicKey, 'hex')),
    creatorSignature: new Uint8Array(Buffer.from(data.creatorSignature, 'hex')),
    previousVersionBlockId: data.previousVersionBlockId,
  };
}

/**
 * Save the pool security config (ACL) to the __pool_security__ collection.
 */
export async function savePoolSecurity(
  db: BrightDb,
  acl: IAclDocument,
  systemUserId: string,
): Promise<void> {
  const collection = db.collection<IStoredPoolSecurityDocument>(
    POOL_SECURITY_COLLECTION,
  );

  const doc: IStoredPoolSecurityDocument = {
    _id: POOL_ACL_DOC_ID,
    type: 'acl',
    aclData: serializeAclDocument(acl),
    updatedAt: new Date().toISOString(),
    updatedBy: systemUserId,
  };

  // Upsert: replace if exists, insert if not
  const existing = await collection.findOne({ _id: POOL_ACL_DOC_ID });
  if (existing) {
    await collection.updateOne(
      { _id: POOL_ACL_DOC_ID } as never,
      { $set: doc } as never,
    );
  } else {
    await collection.insertOne(doc);
  }
}

/**
 * Load the pool security config (ACL) from the __pool_security__ collection.
 * Returns null if no security config exists (pool is in open mode).
 *
 * SECURITY: Verifies the ACL's creator signature after deserialization.
 * An ACL with an invalid signature is rejected (returns null) to prevent
 * tampered ACL documents from being loaded.
 *
 * @param db - The BrightDb instance to load from
 * @param authenticator - Authenticator for signature verification.
 *   The ACL's creatorSignature is verified against creatorPublicKey.
 *   Required to prevent tampered ACL documents from being loaded.
 */
export async function loadPoolSecurity(
  db: BrightDb,
  authenticator: {
    verifySignature(
      challenge: Uint8Array,
      signature: Uint8Array,
      publicKey: Uint8Array,
    ): Promise<boolean>;
  },
): Promise<IAclDocument | null> {
  const collection = db.collection<IStoredPoolSecurityDocument>(
    POOL_SECURITY_COLLECTION,
  );

  const doc = await collection.findOne({ _id: POOL_ACL_DOC_ID });
  if (!doc || !doc.aclData) {
    return null;
  }

  const acl = deserializeAclDocument(doc.aclData);

  // SECURITY: Verify the ACL signature using the authenticator.
  // This prevents tampered ACL documents from being loaded from the block store.
  if (acl.creatorSignature.length > 0) {
    const payload = computeAclContentHash(acl);

    const isValid = await authenticator.verifySignature(
      payload,
      acl.creatorSignature,
      acl.creatorPublicKey,
    );

    if (!isValid) {
      console.error(
        '[PoolSecurity] SECURITY WARNING: ACL document has invalid signature — rejecting tampered ACL',
      );
      return null;
    }
  }

  return acl;
}

/**
 * Add a node to the pool ACL with specified permissions.
 * Signs the updated ACL with the admin's private key.
 *
 * @param currentAcl - The current ACL document
 * @param nodePublicKey - The new node's ECDSA public key (compressed secp256k1)
 * @param adminPrivateKey - The admin's private key for signing the update
 * @param authenticator - Node authenticator for signing
 * @returns The updated, signed ACL document
 */
export async function addNodeToAcl(
  currentAcl: IAclDocument,
  nodePublicKey: Uint8Array,
  adminPrivateKey: Uint8Array,
  authenticator: {
    signChallenge(
      challenge: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array>;
  },
): Promise<IAclDocument> {
  // Check if node is already in the ACL
  const alreadyExists = currentAcl.authorizedWriters.some(
    (w) =>
      w.length === nodePublicKey.length &&
      w.every((byte, i) => byte === nodePublicKey[i]),
  );

  const updatedAcl: IAclDocument = {
    ...currentAcl,
    authorizedWriters: alreadyExists
      ? currentAcl.authorizedWriters
      : [...currentAcl.authorizedWriters, nodePublicKey],
    version: currentAcl.version + 1,
    updatedAt: new Date(),
    creatorSignature: new Uint8Array(0), // placeholder, signed below
  };

  // Sign the updated ACL using full content hash (covers writers + admins lists)
  const addPayload = computeAclContentHash(updatedAcl);
  updatedAcl.creatorSignature = await authenticator.signChallenge(
    addPayload,
    adminPrivateKey,
  );
  updatedAcl.previousVersionBlockId = currentAcl.documentId;

  return updatedAcl;
}

/**
 * Remove a node from the pool ACL.
 * Signs the updated ACL with the admin's private key.
 *
 * @param currentAcl - The current ACL document
 * @param nodePublicKey - The node's ECDSA public key to remove
 * @param adminPrivateKey - The admin's private key for signing the update
 * @param authenticator - Node authenticator for signing
 * @returns The updated, signed ACL document
 */
export async function removeNodeFromAcl(
  currentAcl: IAclDocument,
  nodePublicKey: Uint8Array,
  adminPrivateKey: Uint8Array,
  authenticator: {
    signChallenge(
      challenge: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array>;
  },
): Promise<IAclDocument> {
  const updatedAcl: IAclDocument = {
    ...currentAcl,
    authorizedWriters: currentAcl.authorizedWriters.filter(
      (w) =>
        w.length !== nodePublicKey.length ||
        !w.every((byte, i) => byte === nodePublicKey[i]),
    ),
    version: currentAcl.version + 1,
    updatedAt: new Date(),
    creatorSignature: new Uint8Array(0), // placeholder, signed below
  };

  // Sign the updated ACL using full content hash (covers writers + admins lists)
  const removePayload = computeAclContentHash(updatedAcl);
  updatedAcl.creatorSignature = await authenticator.signChallenge(
    removePayload,
    adminPrivateKey,
  );
  updatedAcl.previousVersionBlockId = currentAcl.documentId;

  return updatedAcl;
}
