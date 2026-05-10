import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IACLDocumentBase } from './acl-document';

/**
 * Resolved ACL with inheritance information.
 * Indicates whether the ACL is explicit or inherited from a parent folder.
 */
export interface IResolvedACLBase<TID extends PlatformID> {
  acl: IACLDocumentBase<TID>;
  /** Whether this ACL was inherited from a parent folder */
  inherited: boolean;
  /** The folder ID from which this ACL was inherited (if inherited) */
  inheritedFromFolderId?: TID;
}
