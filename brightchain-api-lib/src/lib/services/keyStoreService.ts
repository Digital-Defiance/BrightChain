/**
 * KeyStoreService — BrightDB-backed implementation of IKeyStore<string>.
 *
 * Persists GPG keypairs, GPG public keys, S/MIME certificates, S/MIME bundles,
 * and encryption preferences. Private key material is encrypted at rest using
 * AES-256-GCM with the user's account key before writing to the database.
 *
 * Collections:
 *   - `encryption_keys` — key/certificate documents
 *   - `encryption_preferences` — per-user encryption preference documents
 *
 * @see Requirements 1.2, 2.5, 6.2, 6.6, 13.1, 13.2
 */

import {
  IEncryptionPreference,
  IGpgKeyMetadata,
  IGpgKeyPair,
  IKeyStore,
  IKeyStoreEntry,
  ISmimeCertificateBundle,
  ISmimeCertificateMetadata,
  MessageEncryptionScheme,
} from '@brightchain/brightchain-lib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ─── BrightDB document shapes ────────────────────────────────────────────────

/**
 * Document stored in the `encryption_keys` collection.
 */
export interface IKeyStoreDocument {
  _id?: string;
  userId: string;
  type: 'gpg_keypair' | 'gpg_public' | 'smime_cert' | 'smime_bundle';
  associatedEmail: string;
  publicMaterial: string;
  privateMaterial?: string;
  privateIv?: string;
  privateAuthTag?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Document stored in the `encryption_preferences` collection.
 */
export interface IEncryptionPreferenceDocument {
  _id?: string;
  userId: string;
  contactEmail?: string | null;
  scheme: string;
  updatedAt: string;
}

// ─── Collection names ────────────────────────────────────────────────────────

const _ENCRYPTION_KEYS_COLLECTION = 'encryption_keys';
const _ENCRYPTION_PREFERENCES_COLLECTION = 'encryption_preferences';

// ─── AES-256-GCM helpers ─────────────────────────────────────────────────────

const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits recommended for GCM
const _AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt plaintext using AES-256-GCM.
 * @returns Object with base64-encoded ciphertext, IV, and auth tag.
 */
function encryptPrivateMaterial(
  plaintext: string,
  accountKey: Buffer,
): { ciphertext: string; iv: string; authTag: string } {
  const key =
    accountKey.length === AES_KEY_LENGTH
      ? accountKey
      : Buffer.from(
          accountKey.toString('hex').slice(0, AES_KEY_LENGTH * 2),
          'hex',
        );
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext encrypted with AES-256-GCM.
 */
function decryptPrivateMaterial(
  ciphertext: string,
  iv: string,
  authTag: string,
  accountKey: Buffer,
): string {
  const key =
    accountKey.length === AES_KEY_LENGTH
      ? accountKey
      : Buffer.from(
          accountKey.toString('hex').slice(0, AES_KEY_LENGTH * 2),
          'hex',
        );
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ─── Metadata serialization helpers ──────────────────────────────────────────

function serializeGpgMetadata(meta: IGpgKeyMetadata): Record<string, unknown> {
  return {
    keyId: meta.keyId,
    fingerprint: meta.fingerprint,
    algorithm: meta.algorithm,
    gpgUserId: meta.userId,
    createdAt:
      meta.createdAt instanceof Date
        ? meta.createdAt.toISOString()
        : String(meta.createdAt),
    expiresAt:
      meta.expiresAt instanceof Date
        ? meta.expiresAt.toISOString()
        : (meta.expiresAt ?? null),
  };
}

function deserializeGpgMetadata(doc: Record<string, unknown>): IGpgKeyMetadata {
  return {
    keyId: doc['keyId'] as string,
    fingerprint: doc['fingerprint'] as string,
    algorithm: doc['algorithm'] as string,
    userId: doc['gpgUserId'] as string,
    createdAt: new Date(doc['createdAt'] as string),
    expiresAt: doc['expiresAt'] ? new Date(doc['expiresAt'] as string) : null,
  };
}

function serializeSmimeMetadata(
  meta: ISmimeCertificateMetadata,
): Record<string, unknown> {
  return {
    subject: meta.subject,
    issuer: meta.issuer,
    serialNumber: meta.serialNumber,
    validFrom:
      meta.validFrom instanceof Date
        ? meta.validFrom.toISOString()
        : String(meta.validFrom),
    validTo:
      meta.validTo instanceof Date
        ? meta.validTo.toISOString()
        : String(meta.validTo),
    emailAddresses: meta.emailAddresses,
    smimeFingerprint: meta.fingerprint,
    isExpired: meta.isExpired,
  };
}

function deserializeSmimeMetadata(
  doc: Record<string, unknown>,
): ISmimeCertificateMetadata {
  return {
    subject: doc['subject'] as string,
    issuer: doc['issuer'] as string,
    serialNumber: doc['serialNumber'] as string,
    validFrom: new Date(doc['validFrom'] as string),
    validTo: new Date(doc['validTo'] as string),
    emailAddresses: (doc['emailAddresses'] as string[]) ?? [],
    fingerprint: doc['smimeFingerprint'] as string,
    isExpired: (doc['isExpired'] as boolean) ?? false,
  };
}

// ─── Document ↔ IKeyStoreEntry conversion ────────────────────────────────────

function docToEntry(
  doc: IKeyStoreDocument,
  accountKey?: Buffer,
): IKeyStoreEntry<string> {
  const isGpg = doc.type.startsWith('gpg_');
  const metadata = isGpg
    ? deserializeGpgMetadata(doc.metadata)
    : deserializeSmimeMetadata(doc.metadata);

  let privateMaterial: string | undefined;
  if (
    doc.privateMaterial &&
    doc.privateIv &&
    doc.privateAuthTag &&
    accountKey
  ) {
    privateMaterial = decryptPrivateMaterial(
      doc.privateMaterial,
      doc.privateIv,
      doc.privateAuthTag,
      accountKey,
    );
  }

  return {
    id: doc._id ?? '',
    userId: doc.userId,
    type: doc.type,
    associatedEmail: doc.associatedEmail,
    publicMaterial: doc.publicMaterial,
    privateMaterial,
    metadata,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

// ─── Collection interface (minimal subset used by KeyStoreService) ───────────

/**
 * Minimal collection interface matching BrightDB's collection API.
 * This allows the service to work with any compatible document store.
 */
export interface IDocumentCollection<T> {
  findOne(filter: Partial<T> | Record<string, unknown>): Promise<T | null>;
  find(filter: Partial<T> | Record<string, unknown>): {
    toArray(): Promise<T[]>;
  };
  insertOne(doc: T, options?: unknown): Promise<{ insertedId: string }>;
  updateOne(
    filter: Partial<T> | Record<string, unknown>,
    update: Record<string, unknown>,
    options?: unknown,
  ): Promise<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>;
  deleteOne(
    filter: Partial<T> | Record<string, unknown>,
  ): Promise<{ deletedCount: number }>;
  deleteMany(
    filter: Partial<T> | Record<string, unknown>,
  ): Promise<{ deletedCount: number }>;
  createIndex?(
    spec: Record<string, number>,
    options?: { unique?: boolean },
  ): Promise<string>;
}

// ─── KeyStoreService ─────────────────────────────────────────────────────────

/**
 * BrightDB-backed implementation of IKeyStore<string>.
 *
 * Requires:
 *   - A function to obtain the encryption_keys collection
 *   - A function to obtain the encryption_preferences collection
 *   - A function to obtain the user's account key (Buffer, 32 bytes)
 */
export class KeyStoreService implements IKeyStore<string> {
  private readonly getKeysCollection: () => IDocumentCollection<IKeyStoreDocument>;
  private readonly getPrefsCollection: () => IDocumentCollection<IEncryptionPreferenceDocument>;
  private readonly getAccountKey: (userId: string) => Promise<Buffer>;

  constructor(deps: {
    getKeysCollection: () => IDocumentCollection<IKeyStoreDocument>;
    getPrefsCollection: () => IDocumentCollection<IEncryptionPreferenceDocument>;
    getAccountKey: (userId: string) => Promise<Buffer>;
  }) {
    this.getKeysCollection = deps.getKeysCollection;
    this.getPrefsCollection = deps.getPrefsCollection;
    this.getAccountKey = deps.getAccountKey;
  }

  /**
   * Ensure indexes exist on the collections.
   * Call once during application startup.
   */
  async ensureIndexes(): Promise<void> {
    const keys = this.getKeysCollection();
    const prefs = this.getPrefsCollection();
    if (keys.createIndex) {
      await keys.createIndex({ userId: 1, type: 1 }, { unique: true });
      await keys.createIndex({ associatedEmail: 1, type: 1 });
      await keys.createIndex({ userId: 1 });
    }
    if (prefs.createIndex) {
      await prefs.createIndex({ userId: 1, contactEmail: 1 }, { unique: true });
    }
  }

  // ── GPG operations ──────────────────────────────────────────────────

  async storeGpgKeyPair(
    userId: string,
    keyPair: IGpgKeyPair,
  ): Promise<IKeyStoreEntry<string>> {
    const accountKey = await this.getAccountKey(userId);
    const encrypted = encryptPrivateMaterial(
      keyPair.privateKeyArmored,
      accountKey,
    );
    const now = new Date().toISOString();
    const email = this.extractEmailFromGpgUserId(keyPair.metadata.userId);

    const doc: IKeyStoreDocument = {
      userId,
      type: 'gpg_keypair',
      associatedEmail: email,
      publicMaterial: keyPair.publicKeyArmored,
      privateMaterial: encrypted.ciphertext,
      privateIv: encrypted.iv,
      privateAuthTag: encrypted.authTag,
      metadata: serializeGpgMetadata(keyPair.metadata),
      createdAt: now,
      updatedAt: now,
    };

    const col = this.getKeysCollection();
    // Upsert: replace existing keypair for this user
    const result = await col.updateOne(
      { userId, type: 'gpg_keypair' } as unknown as Partial<IKeyStoreDocument>,
      { $set: doc } as unknown as Record<string, unknown>,
      { upsert: true },
    );

    const id = result.upsertedId ?? userId;
    return docToEntry({ ...doc, _id: id }, accountKey);
  }

  async storeGpgPublicKey(
    userId: string,
    email: string,
    armoredKey: string,
    metadata: IGpgKeyMetadata,
  ): Promise<IKeyStoreEntry<string>> {
    const now = new Date().toISOString();
    const doc: IKeyStoreDocument = {
      userId,
      type: 'gpg_public',
      associatedEmail: email,
      publicMaterial: armoredKey,
      metadata: serializeGpgMetadata(metadata),
      createdAt: now,
      updatedAt: now,
    };

    const col = this.getKeysCollection();
    const result = await col.updateOne(
      {
        associatedEmail: email,
        type: 'gpg_public',
      } as unknown as Partial<IKeyStoreDocument>,
      { $set: doc } as unknown as Record<string, unknown>,
      { upsert: true },
    );

    const id = result.upsertedId ?? email;
    return docToEntry({ ...doc, _id: id });
  }

  async getGpgKeyPair(userId: string): Promise<IKeyStoreEntry<string> | null> {
    const col = this.getKeysCollection();
    const doc = await col.findOne({
      userId,
      type: 'gpg_keypair',
    } as unknown as Partial<IKeyStoreDocument>);
    if (!doc) return null;
    const accountKey = await this.getAccountKey(userId);
    return docToEntry(doc, accountKey);
  }

  async getGpgPublicKey(email: string): Promise<IKeyStoreEntry<string> | null> {
    const col = this.getKeysCollection();
    const doc = await col.findOne({
      associatedEmail: email,
      type: 'gpg_public',
    } as unknown as Partial<IKeyStoreDocument>);
    if (!doc) return null;
    return docToEntry(doc);
  }

  async deleteGpgKeyPair(userId: string): Promise<void> {
    const col = this.getKeysCollection();
    await col.deleteOne({
      userId,
      type: 'gpg_keypair',
    } as unknown as Partial<IKeyStoreDocument>);
  }

  // ── S/MIME operations ───────────────────────────────────────────────

  async storeSmimeCertificate(
    userId: string,
    bundle: ISmimeCertificateBundle,
  ): Promise<IKeyStoreEntry<string>> {
    const now = new Date().toISOString();
    const email = bundle.metadata.emailAddresses[0] ?? '';
    const type: IKeyStoreDocument['type'] = bundle.privateKeyPem
      ? 'smime_bundle'
      : 'smime_cert';

    let privateMaterial: string | undefined;
    let privateIv: string | undefined;
    let privateAuthTag: string | undefined;

    if (bundle.privateKeyPem) {
      const accountKey = await this.getAccountKey(userId);
      const encrypted = encryptPrivateMaterial(
        bundle.privateKeyPem,
        accountKey,
      );
      privateMaterial = encrypted.ciphertext;
      privateIv = encrypted.iv;
      privateAuthTag = encrypted.authTag;
    }

    const doc: IKeyStoreDocument = {
      userId,
      type,
      associatedEmail: email,
      publicMaterial: bundle.certificatePem,
      privateMaterial,
      privateIv,
      privateAuthTag,
      metadata: serializeSmimeMetadata(bundle.metadata),
      createdAt: now,
      updatedAt: now,
    };

    const col = this.getKeysCollection();
    const result = await col.updateOne(
      { userId, type } as unknown as Partial<IKeyStoreDocument>,
      { $set: doc } as unknown as Record<string, unknown>,
      { upsert: true },
    );

    const id = result.upsertedId ?? userId;
    const accountKey = bundle.privateKeyPem
      ? await this.getAccountKey(userId)
      : undefined;
    return docToEntry({ ...doc, _id: id }, accountKey);
  }

  async storeSmimeContactCert(
    userId: string,
    email: string,
    certPem: string,
    metadata: ISmimeCertificateMetadata,
  ): Promise<IKeyStoreEntry<string>> {
    const now = new Date().toISOString();
    const doc: IKeyStoreDocument = {
      userId,
      type: 'smime_cert',
      associatedEmail: email,
      publicMaterial: certPem,
      metadata: serializeSmimeMetadata(metadata),
      createdAt: now,
      updatedAt: now,
    };

    const col = this.getKeysCollection();
    const result = await col.updateOne(
      {
        associatedEmail: email,
        type: 'smime_cert',
      } as unknown as Partial<IKeyStoreDocument>,
      { $set: doc } as unknown as Record<string, unknown>,
      { upsert: true },
    );

    const id = result.upsertedId ?? email;
    return docToEntry({ ...doc, _id: id });
  }

  async getSmimeCertificate(
    userId: string,
  ): Promise<IKeyStoreEntry<string> | null> {
    const col = this.getKeysCollection();
    // Look for bundle first (has private key), then cert-only
    let doc = await col.findOne({
      userId,
      type: 'smime_bundle',
    } as unknown as Partial<IKeyStoreDocument>);
    if (!doc) {
      doc = await col.findOne({
        userId,
        type: 'smime_cert',
      } as unknown as Partial<IKeyStoreDocument>);
    }
    if (!doc) return null;
    const accountKey = doc.privateMaterial
      ? await this.getAccountKey(userId)
      : undefined;
    return docToEntry(doc, accountKey);
  }

  async getSmimeContactCert(
    email: string,
  ): Promise<IKeyStoreEntry<string> | null> {
    const col = this.getKeysCollection();
    const doc = await col.findOne({
      associatedEmail: email,
      type: 'smime_cert',
    } as unknown as Partial<IKeyStoreDocument>);
    if (!doc) return null;
    return docToEntry(doc);
  }

  async deleteSmimeCertificate(userId: string): Promise<void> {
    const col = this.getKeysCollection();
    await col.deleteMany({
      userId,
      type: { $in: ['smime_cert', 'smime_bundle'] },
    } as unknown as Partial<IKeyStoreDocument>);
  }

  // ── Encryption preferences ──────────────────────────────────────────

  async setEncryptionPreference(
    pref: IEncryptionPreference<string>,
  ): Promise<void> {
    const col = this.getPrefsCollection();
    const now = new Date().toISOString();
    const filter: Record<string, unknown> = { userId: pref.userId };
    if (pref.contactEmail) {
      filter['contactEmail'] = pref.contactEmail;
    } else {
      filter['contactEmail'] = { $in: [null, undefined] };
    }

    await col.updateOne(
      filter as Partial<IEncryptionPreferenceDocument>,
      {
        $set: {
          userId: pref.userId,
          contactEmail: pref.contactEmail ?? null,
          scheme: pref.scheme,
          updatedAt: now,
        },
      } as unknown as Record<string, unknown>,
      { upsert: true },
    );
  }

  async getEncryptionPreference(
    userId: string,
    contactEmail?: string,
  ): Promise<IEncryptionPreference<string> | null> {
    const col = this.getPrefsCollection();
    const filter: Record<string, unknown> = { userId };
    if (contactEmail) {
      filter['contactEmail'] = contactEmail;
    } else {
      filter['contactEmail'] = { $in: [null, undefined] };
    }

    const doc = await col.findOne(
      filter as Partial<IEncryptionPreferenceDocument>,
    );
    if (!doc) return null;

    return {
      userId: doc.userId,
      contactEmail: doc.contactEmail ?? undefined,
      scheme: doc.scheme as MessageEncryptionScheme,
    };
  }

  // ── Query ───────────────────────────────────────────────────────────

  async getKeysForEmail(email: string): Promise<IKeyStoreEntry<string>[]> {
    const col = this.getKeysCollection();
    const docs = await col
      .find({ associatedEmail: email } as unknown as Partial<IKeyStoreDocument>)
      .toArray();
    return docs.map((doc) => docToEntry(doc));
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private extractEmailFromGpgUserId(gpgUserId: string): string {
    const match = gpgUserId.match(/<([^>]+)>/);
    return match ? match[1] : gpgUserId;
  }
}
