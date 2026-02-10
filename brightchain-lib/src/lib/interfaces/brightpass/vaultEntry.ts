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
  blockId: string;
  isCbl: boolean;
}
