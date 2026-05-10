import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Folder metadata stored in BrightDB.
 * Supports hierarchical folder structure with ACL inheritance.
 */
export interface IFolderMetadataBase<TID extends PlatformID> {
  id: TID;
  ownerId: TID;
  /** The vault container this folder belongs to */
  vaultContainerId: TID;
  /** Null/undefined for the container's root folder */
  parentFolderId?: TID;
  name: string;
  /** ACL document ID (null = inherit from parent folder) */
  aclId?: TID;
  /** Soft-delete timestamp (null = not deleted) */
  deletedAt?: Date | string;
  /** Original parent folder path before deletion (for restore) */
  deletedFromPath?: string;
  /** Whether this folder requires quorum for sensitive ops */
  approvalGoverned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: TID;
  updatedBy: TID;
}
