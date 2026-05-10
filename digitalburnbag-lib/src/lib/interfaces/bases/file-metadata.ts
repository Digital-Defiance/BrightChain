import { PlatformID } from '@digitaldefiance/ecies-lib';
import { VaultVisibility } from '../../enumerations/vault-visibility';

/**
 * File metadata stored in BrightDB — no encrypted content.
 * Uses the generic `<TID extends PlatformID>` pattern for DTO compatibility:
 * frontend uses `string`, backend uses `GuidV4Buffer`.
 */
export interface IFileMetadataBase<TID extends PlatformID> {
  id: TID;
  ownerId: TID;
  /** The vault container this file belongs to (denormalized for query efficiency) */
  vaultContainerId: TID;
  folderId: TID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  tags: string[];
  /** Reference to the current version */
  currentVersionId: TID;
  /** Vault reference for the current version */
  vaultCreationLedgerEntryHash: Uint8Array;
  /** ACL document ID (null = inherit from parent folder) */
  aclId?: TID;
  /**
   * Per-file visibility override. When set, overrides the vault container's
   * visibility for this file only. When absent, inherits from the container.
   */
  visibility?: VaultVisibility;
  /** Soft-delete timestamp (null = not deleted) */
  deletedAt?: Date | string;
  /** Original parent folder path before deletion (for restore) */
  deletedFromPath?: string;
  /** Scheduled destruction timestamp */
  scheduledDestructionAt?: Date | string;
  /** Whether this file requires quorum for sensitive ops */
  approvalGoverned: boolean;
  /** Visible watermark enabled */
  visibleWatermark: boolean;
  /** Invisible watermark enabled */
  invisibleWatermark: boolean;
  /**
   * RS data shards (k). Defaults to BURNBAG_TIER_RS_PARAMS[storageTier].k if absent.
   * Diverges from tier defaults only when AUTO_RS_UPGRADE has run on the contract.
   */
  rsK?: number;
  /**
   * RS parity shards (m). Defaults to BURNBAG_TIER_RS_PARAMS[storageTier].m if absent.
   * Diverges from tier defaults only when AUTO_RS_UPGRADE has run on the contract.
   */
  rsM?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: TID;
  updatedBy: TID;
}
