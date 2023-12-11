import type { BlockId } from '../branded/primitives/blockId';
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
  vcblBlockId: BlockId;
}

export interface DecryptedVault {
  metadata: VaultMetadata;
  propertyRecords: EntryPropertyRecord[];
}

/**
 * Generic decrypted vault following the IBaseData<TID> workspace convention.
 *
 * - Frontend uses `IDecryptedVault<string>` (default)
 * - Backend uses `IDecryptedVault<GuidV4Buffer>`
 *
 * @template TID - ID type. Defaults to `string` for frontend/JSON compatibility.
 */
export interface IDecryptedVault<TID = string> {
  metadata: {
    id: TID;
    name: string;
    ownerId: TID;
    createdAt: Date | string;
    updatedAt: Date | string;
    entryCount: number;
    sharedWith: TID[];
    vcblBlockId: BlockId;
  };
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

/**
 * Generic autofill payload following the IBaseData<TID> workspace convention.
 *
 * - Frontend uses `IAutofillPayload<string>` (default)
 * - Backend uses `IAutofillPayload<GuidV4Buffer>`
 *
 * @template TID - ID type. Defaults to `string` for frontend/JSON compatibility.
 */
export interface IAutofillPayload<TID = string> {
  vaultId: TID;
  entries: Array<{
    entryId: TID;
    title: string;
    username: string;
    password: string;
    siteUrl: string;
    totpCode?: string;
  }>;
}
