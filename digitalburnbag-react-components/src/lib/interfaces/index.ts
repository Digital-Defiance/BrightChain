/**
 * Concrete frontend-specific DTO type aliases using string as the TID type parameter.
 * These types are used in the React frontend where IDs are serialized as strings.
 */
import type {
  IACLDocumentBase,
  IACLEntryBase,
  IApprovalRequestBase,
  IApprovalVoteBase,
  IAuditEntryBase,
  ICanaryBindingBase,
  IFileMetadataBase,
  IFileVersionBase,
  IFolderExportOptions,
  IFolderExportResult,
  IFolderMetadataBase,
  IKeyWrappingEntryBase,
  INotification,
  INotificationPreferences,
  IPermissionSetBase,
  IRecipientListBase,
  IResolvedACLBase,
  IShareLinkBase,
  ISkippedFileEntry,
  IStorageQuotaBase,
  IUploadSessionBase,
} from '@brightchain/digitalburnbag-lib';

export type IFileMetadataDTO = IFileMetadataBase<string>;
export type IFileVersionDTO = IFileVersionBase<string>;
export type IFolderMetadataDTO = IFolderMetadataBase<string>;
export type IACLDocumentDTO = IACLDocumentBase<string>;
export type IACLEntryDTO = IACLEntryBase<string>;
export type IResolvedACLDTO = IResolvedACLBase<string>;
export type IShareLinkDTO = IShareLinkBase<string>;
export type IKeyWrappingEntryDTO = IKeyWrappingEntryBase<string>;
export type ICanaryBindingDTO = ICanaryBindingBase<string>;
export type IRecipientListDTO = IRecipientListBase<string>;
export type IUploadSessionDTO = IUploadSessionBase<string>;
export type IApprovalRequestDTO = IApprovalRequestBase<string>;
export type IApprovalVoteDTO = IApprovalVoteBase<string>;
export type IAuditEntryDTO = IAuditEntryBase<string>;
export type IStorageQuotaDTO = IStorageQuotaBase<string>;
export type IPermissionSetDTO = IPermissionSetBase<string>;
export type INotificationDTO = INotification<string>;

export type IFolderExportResultDTO = IFolderExportResult<string>;
export type ISkippedFileEntryDTO = ISkippedFileEntry<string>;

/** Re-export IFolderExportOptions as-is (no TID generic) */
export type IFolderExportOptionsDTO = IFolderExportOptions;

// Re-export INotificationPreferences as-is (no TID generic)
export type { INotificationPreferences };
