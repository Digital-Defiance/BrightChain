/**
 * @enum FileAuditOperationType
 * @description Audit operation types for all file platform operations.
 * Every file operation is recorded on the blockchain ledger as a signed,
 * hash-chained entry using one of these types.
 * Extends the concept of {@link VaultLedgerEntryType} to cover the full
 * file platform surface area.
 */
export enum FileAuditOperationType {
  FileUploaded = 'file_uploaded',
  FileDownloaded = 'file_downloaded',
  FilePreviewed = 'file_previewed',
  FileDeleted = 'file_deleted',
  FileRestored = 'file_restored',
  FileDestroyed = 'file_destroyed',
  FileMoved = 'file_moved',
  FileRenamed = 'file_renamed',
  FileVersionCreated = 'file_version_created',
  FileVersionRestored = 'file_version_restored',
  FolderCreated = 'folder_created',
  FolderDeleted = 'folder_deleted',
  FolderMoved = 'folder_moved',
  /** Phix (Phoenix-cycle rename) — metadata-only or full cycle */
  FilePhixed = 'file_phixed',
  FolderPhixed = 'folder_phixed',
  ACLChanged = 'acl_changed',
  ShareCreated = 'share_created',
  ShareRevoked = 'share_revoked',
  ShareLinkAccessed = 'share_link_accessed',
  CanaryBindingCreated = 'canary_binding_created',
  CanaryBindingModified = 'canary_binding_modified',
  CanaryBindingDeleted = 'canary_binding_deleted',
  CanaryTriggered = 'canary_triggered',
  DuressTriggered = 'duress_triggered',
  DryRunExecuted = 'dry_run_executed',
  ApprovalRequested = 'quorum_requested',
  ApprovalApproved = 'quorum_approved',
  ApprovalRejected = 'quorum_rejected',
  ApprovalExpired = 'quorum_expired',
  RubberStamped = 'rubber_stamped',
  DestructionScheduled = 'destruction_scheduled',
  DestructionCancelled = 'destruction_cancelled',
  WatermarkApplied = 'watermark_applied',
  NonAccessProofGenerated = 'non_access_proof_generated',
  MagnetUrlDisclosed = 'magnet_url_disclosed',
  OwnerNotified = 'owner_notified',
  FolderExported = 'folder_exported',
  /** HTTP-level vault file access (middleware-generated) */
  VaultFileAccessed = 'vault_file_accessed',
}
