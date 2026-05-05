import type { BlockId } from '../branded/primitives/blockId';

export type VaultEntryType =
  | 'login'
  | 'secure_note'
  | 'credit_card'
  | 'identity';

export interface VaultEntryBase {
  id: string;
  type: VaultEntryType;
  title: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  favorite: boolean;
  attachments?: AttachmentReference[];
}

export interface LoginEntry extends VaultEntryBase {
  type: 'login';
  siteUrl: string;
  username: string;
  password: string;
  totpSecret?: string;
}

export interface SecureNoteEntry extends VaultEntryBase {
  type: 'secure_note';
  content: string;
}

export interface CreditCardEntry extends VaultEntryBase {
  type: 'credit_card';
  cardholderName: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
}

export interface IdentityEntry extends VaultEntryBase {
  type: 'identity';
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type VaultEntry =
  | LoginEntry
  | SecureNoteEntry
  | CreditCardEntry
  | IdentityEntry;

export interface AttachmentReference {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  blockId: BlockId;
  isCbl: boolean;
}

/**
 * Encrypted vault entry transmitted to/from the server.
 *
 * Sensitive fields (password, cvv, card number, note content, etc.) are
 * encrypted client-side with AES-256-GCM before being sent to the server.
 * The server stores and returns the opaque `encryptedData` blob without
 * ever decrypting it.
 *
 * Non-sensitive index fields (type, title, tags, favorite, siteUrl) are
 * kept in plaintext so the server can build property records for search
 * and autofill matching without accessing secrets.
 *
 * Wire format for `encryptedData`:
 *   base64( [IV(12 bytes)] [AuthTag(16 bytes)] [Ciphertext] )
 */
export interface IEncryptedVaultEntry {
  /** Unique identifier */
  id: string;
  /** Entry type – kept plaintext for client-side filtering */
  type: VaultEntryType;
  /** Title – kept plaintext for list display */
  title: string;
  /** Tags – kept plaintext for search and filter */
  tags: string[];
  /** Favourite flag – kept plaintext */
  favorite: boolean;
  /** Site URL – kept plaintext for autofill URL matching */
  siteUrl?: string;
  /**
   * AES-256-GCM encrypted JSON of all sensitive fields.
   * Format: base64 of [IV(12 bytes)][AuthTag(16 bytes)][Ciphertext]
   * Encrypted entirely client-side; the server treats this as an opaque blob.
   */
  encryptedData: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: AttachmentReference[];
}
