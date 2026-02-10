import { VaultEntryType } from './vaultEntry';

export interface EntryPropertyRecord {
  entryType: VaultEntryType;
  title: string;
  tags: string[];
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  siteUrl: string;
}
