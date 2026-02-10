import { EntryPropertyRecord } from './entryPropertyRecord';
import { VaultEntryType } from './vaultEntry';

export interface VaultMetadata {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  entryCount: number;
  sharedWith: string[];
  vcblBlockId: string;
}

export interface DecryptedVault {
  metadata: VaultMetadata;
  propertyRecords: EntryPropertyRecord[];
}

export interface EntrySearchQuery {
  text?: string;
  type?: VaultEntryType;
  tags?: string[];
  favorite?: boolean;
}

export interface AutofillPayload {
  vaultId: string;
  entries: Array<{
    entryId: string;
    title: string;
    username: string;
    password: string;
    siteUrl: string;
    totpCode?: string;
  }>;
}
