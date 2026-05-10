import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A single entry in the key wrapping table for a file version.
 * Each entry represents one party's encrypted copy of the file's symmetric key.
 * The file is encrypted once (AES-256-GCM); the symmetric key is wrapped
 * per-recipient under their public key.
 */
export interface IKeyWrappingEntryBase<TID extends PlatformID> {
  id: TID;
  /** The file version this wrapping applies to */
  fileVersionId: TID;
  /** Type of recipient */
  recipientType: 'internal_member' | 'ephemeral_share' | 'recipient_key';
  /** For internal members: the member's user ID */
  recipientUserId?: TID;
  /** For shares: the share link ID */
  shareLinkId?: TID;
  /** The public key used to wrap the symmetric key */
  wrappingPublicKey: Uint8Array;
  /** The symmetric key encrypted under wrappingPublicKey via ECIES */
  encryptedSymmetricKey: Uint8Array;
  /** Key type used for wrapping */
  keyType: 'ecies_secp256k1' | 'pgp';
  /** Who authorized this wrapping */
  createdBy: TID;
  /** Ledger entry hash recording this key disclosure */
  ledgerEntryHash: Uint8Array;
  createdAt: Date | string;
}
