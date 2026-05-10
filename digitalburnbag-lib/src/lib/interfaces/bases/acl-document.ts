import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IACLEntryBase } from './acl-entry';

/**
 * A complete ACL document containing permission entries.
 */
export interface IACLDocumentBase<TID extends PlatformID> {
  id: TID;
  entries: IACLEntryBase<TID>[];
  createdAt: Date | string;
  updatedAt: Date | string;
  updatedBy: TID;
}
