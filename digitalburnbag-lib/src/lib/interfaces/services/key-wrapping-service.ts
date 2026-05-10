import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IKeyWrappingEntryBase } from '../bases/key-wrapping-entry';

/**
 * Service interface for key wrapping operations.
 * Manages per-recipient encryption of file symmetric keys using ECIES.
 *
 * Validates: Requirements 44.1, 44.2, 44.3, 44.4, 44.5, 44.6, 44.7
 */
export interface IKeyWrappingService<TID extends PlatformID> {
  /** Wrap a symmetric key for an internal member using their public key */
  wrapKeyForMember(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    recipientUserId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>>;

  /** Wrap a symmetric key for an ephemeral share link, generating a new key pair */
  wrapKeyForEphemeralShare(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    shareLinkId: TID,
    requesterId: TID,
  ): Promise<{
    entry: IKeyWrappingEntryBase<TID>;
    ephemeralPrivateKey: Uint8Array;
  }>;

  /** Wrap a symmetric key under a caller-provided recipient public key */
  wrapKeyForRecipientKey(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    recipientPublicKey: Uint8Array,
    keyType: 'ecies_secp256k1' | 'pgp',
    shareLinkId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>>;

  /** Get a wrapped key entry for a file version by recipient or share link */
  getWrappedKey(
    fileVersionId: TID,
    recipientUserId?: TID,
    shareLinkId?: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null>;

  /** Revoke a single key wrapping entry */
  revokeWrapping(entryId: TID, requesterId: TID): Promise<void>;

  /** Revoke all key wrapping entries for a file version */
  revokeAllWrappings(fileVersionId: TID, requesterId: TID): Promise<number>;

  /**
   * Store a key wrapping entry where the symmetric key was already ECIES-encrypted
   * by the client (E2EE upload path). Fetches the recipient's public key for the
   * `wrappingPublicKey` record field, then stores the caller-provided ciphertext
   * without performing any additional encryption.
   */
  storePreWrappedKeyForMember(
    fileVersionId: TID,
    encryptedSymmetricKey: Uint8Array,
    recipientUserId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>>;
}
