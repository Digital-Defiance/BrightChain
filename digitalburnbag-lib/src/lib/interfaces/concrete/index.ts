/**
 * Concrete backend-specific type aliases using GuidV4Buffer as the TID type parameter.
 * These types are used in the Node.js backend where IDs are binary GuidV4Buffer values.
 */
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';
import type {
  IACLDocumentBase,
  IACLEntryBase,
  IApprovalRequestBase,
  IApprovalVoteBase,
  IAuditEntryBase,
  ICanaryBindingBase,
  IFileMetadataBase,
  IFileVersionBase,
  IFolderMetadataBase,
  IKeyWrappingEntryBase,
  INotification,
  INotificationPreferences,
  IPermissionSetBase,
  IRecipientListBase,
  IResolvedACLBase,
  IShareLinkBase,
  IStorageQuotaBase,
  IUploadSessionBase,
} from '../bases';

export type IFileMetadata = IFileMetadataBase<GuidV4Buffer>;
export type IFileVersion = IFileVersionBase<GuidV4Buffer>;
export type IFolderMetadata = IFolderMetadataBase<GuidV4Buffer>;
export type IACLDocument = IACLDocumentBase<GuidV4Buffer>;
export type IACLEntry = IACLEntryBase<GuidV4Buffer>;
export type IResolvedACL = IResolvedACLBase<GuidV4Buffer>;
export type IShareLink = IShareLinkBase<GuidV4Buffer>;
export type IKeyWrappingEntry = IKeyWrappingEntryBase<GuidV4Buffer>;
export type ICanaryBinding = ICanaryBindingBase<GuidV4Buffer>;
export type IRecipientList = IRecipientListBase<GuidV4Buffer>;
export type IUploadSession = IUploadSessionBase<GuidV4Buffer>;
export type IApprovalRequest = IApprovalRequestBase<GuidV4Buffer>;
export type IApprovalVote = IApprovalVoteBase<GuidV4Buffer>;
export type IAuditEntry = IAuditEntryBase<GuidV4Buffer>;
export type IStorageQuota = IStorageQuotaBase<GuidV4Buffer>;
export type IPermissionSet = IPermissionSetBase<GuidV4Buffer>;
export type IBackendNotification = INotification<GuidV4Buffer>;

// Re-export INotificationPreferences as-is (no TID generic)
export type { INotificationPreferences };
