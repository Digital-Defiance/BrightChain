import { VaultEntryType } from './vaultEntry';

export interface EntryPropertyRecord {
  id?: string;
  entryType: VaultEntryType;
  title: string;
  tags: string[];
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  siteUrl: string;
}
