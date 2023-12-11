/**
 * Key store interfaces for BrightMail encryption key/certificate persistence.
 *
 * These interfaces define the platform-agnostic contract for storing and
 * retrieving GPG keypairs, GPG public keys, S/MIME certificates, and
 * encryption preferences. Implemented by BrightDB-backed service in
 * brightchain-api-lib.
 *
 * @see Requirements 1.2, 2.5, 6.2, 6.6, 13.1, 13.2
 */

import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { IGpgKeyMetadata, IGpgKeyPair } from './gpgKey';
import {
  ISmimeCertificateBundle,
  ISmimeCertificateMetadata,
} from './smimeCertificate';

/**
 * A persisted key store entry representing a GPG key or S/MIME certificate.
 *
 * @typeParam TId - The type of the identifier (defaults to string).
 *
 * @see Requirement 1.2 — Key_Store persists keypairs associated with user account
 * @see Requirement 6.2 — Key_Store persists S/MIME certificate and private key
 */
export interface IKeyStoreEntry<TId = string> {
  /** Unique identifier for this key store entry */
  id: TId;

  /** Owner user identifier */
  userId: TId;

  /** Type of cryptographic material stored */
  type: 'gpg_keypair' | 'gpg_public' | 'smime_cert' | 'smime_bundle';

  /** Email address this key/certificate is associated with */
  associatedEmail: string;

  /** Public key material (ASCII armor for GPG, PEM for S/MIME) */
  publicMaterial: string;

  /** Private key material (encrypted at rest); undefined for public-only entries */
  privateMaterial?: string;

  /** Metadata extracted from the key or certificate */
  metadata: IGpgKeyMetadata | ISmimeCertificateMetadata;

  /** Date the entry was created */
  createdAt: Date;

  /** Date the entry was last updated */
  updatedAt: Date;
}

/**
 * An encryption preference for a user, optionally scoped to a specific contact.
 *
 * @typeParam TId - The type of the identifier (defaults to string).
 *
 * @see Requirement 13.1 — Global default encryption preference persistence
 * @see Requirement 13.2 — Per-contact encryption preference persistence
 */
export interface IEncryptionPreference<TId = string> {
  /** User identifier who owns this preference */
  userId: TId;

  /** Contact email this preference applies to; undefined means global default */
  contactEmail?: string;

  /** The preferred encryption scheme */
  scheme: MessageEncryptionScheme;
}

/**
 * Platform-agnostic interface for key/certificate persistence.
 *
 * Provides operations for storing, retrieving, and deleting GPG keys,
 * S/MIME certificates, and encryption preferences. Implemented by
 * BrightDB-backed service in brightchain-api-lib.
 *
 * @typeParam TId - The type of the identifier (defaults to string).
 *
 * @see Requirement 1.2 — GPG keypair persistence
 * @see Requirement 2.5 — GPG public key association with contact email
 * @see Requirement 6.2 — S/MIME certificate and private key persistence
 * @see Requirement 6.6 — S/MIME certificate deletion
 */
export interface IKeyStore<TId = string> {
  // ── GPG operations ──────────────────────────────────────────────────

  /** Store a GPG keypair (public + private) for a user */
  storeGpgKeyPair(
    userId: TId,
    keyPair: IGpgKeyPair,
  ): Promise<IKeyStoreEntry<TId>>;

  /** Store a GPG public key for a contact email */
  storeGpgPublicKey(
    userId: TId,
    email: string,
    armoredKey: string,
    metadata: IGpgKeyMetadata,
  ): Promise<IKeyStoreEntry<TId>>;

  /** Retrieve the user's GPG keypair entry, or null if none exists */
  getGpgKeyPair(userId: TId): Promise<IKeyStoreEntry<TId> | null>;

  /** Retrieve a GPG public key entry by associated email */
  getGpgPublicKey(email: string): Promise<IKeyStoreEntry<TId> | null>;

  /** Delete the user's GPG keypair */
  deleteGpgKeyPair(userId: TId): Promise<void>;

  // ── S/MIME operations ───────────────────────────────────────────────

  /** Store an S/MIME certificate bundle (cert + optional private key) for a user */
  storeSmimeCertificate(
    userId: TId,
    bundle: ISmimeCertificateBundle,
  ): Promise<IKeyStoreEntry<TId>>;

  /** Store an S/MIME contact certificate (public only) for a contact email */
  storeSmimeContactCert(
    userId: TId,
    email: string,
    certPem: string,
    metadata: ISmimeCertificateMetadata,
  ): Promise<IKeyStoreEntry<TId>>;

  /** Retrieve the user's S/MIME certificate entry, or null if none exists */
  getSmimeCertificate(userId: TId): Promise<IKeyStoreEntry<TId> | null>;

  /** Retrieve an S/MIME contact certificate by associated email */
  getSmimeContactCert(email: string): Promise<IKeyStoreEntry<TId> | null>;

  /** Delete the user's S/MIME certificate and associated private key */
  deleteSmimeCertificate(userId: TId): Promise<void>;

  // ── Encryption preferences ──────────────────────────────────────────

  /** Set a global or per-contact encryption preference */
  setEncryptionPreference(pref: IEncryptionPreference<TId>): Promise<void>;

  /** Get the encryption preference for a user, optionally scoped to a contact */
  getEncryptionPreference(
    userId: TId,
    contactEmail?: string,
  ): Promise<IEncryptionPreference<TId> | null>;

  // ── Query ───────────────────────────────────────────────────────────

  /** Retrieve all key store entries associated with a given email address */
  getKeysForEmail(email: string): Promise<IKeyStoreEntry<TId>[]>;
}
