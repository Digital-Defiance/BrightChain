import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IACLDocumentBase } from '../bases/acl-document';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFolderMetadataBase } from '../bases/folder-metadata';
import type { IPermissionSetBase } from '../bases/permission-set';

/**
 * Repository interface abstracting BrightDB access for ACL operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IACLRepository<TID extends PlatformID> {
  /** Get an ACL document by ID, or null if not found */
  getACLById(aclId: TID): Promise<IACLDocumentBase<TID> | null>;

  /** Store or update an ACL document */
  upsertACL(acl: IACLDocumentBase<TID>): Promise<void>;

  /** Update the aclId reference on a file */
  updateFileAclId(fileId: TID, aclId: TID): Promise<void>;

  /** Update the aclId reference on a folder */
  updateFolderAclId(folderId: TID, aclId: TID): Promise<void>;

  /** Get a folder by ID (needed for hierarchy traversal) */
  getFolderById(folderId: TID): Promise<IFolderMetadataBase<TID> | null>;

  /** Get a file by ID (needed to resolve aclId and folderId) */
  getFileById(fileId: TID): Promise<IFileMetadataBase<TID> | null>;

  /** Get a custom permission set by ID */
  getPermissionSetById(id: TID): Promise<IPermissionSetBase<TID> | null>;

  /** Store a new custom permission set */
  createPermissionSet(ps: IPermissionSetBase<TID>): Promise<void>;

  /** List custom permission sets, optionally filtered by organization */
  listPermissionSets(organizationId?: TID): Promise<IPermissionSetBase<TID>[]>;
}
