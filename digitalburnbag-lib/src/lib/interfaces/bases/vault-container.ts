import { PlatformID } from '@digitaldefiance/ecies-lib';
import { VaultContainerState } from '../../enumerations/vault-container-state';
import { VaultVisibility } from '../../enumerations/vault-visibility';

/**
 * A Vault Container is the top-level organizational unit in Digital Burnbag.
 * Every folder and file lives inside exactly one vault container.
 *
 * Vault containers provide:
 * - Container-level ACLs (inherited by all contents unless overridden)
 * - Container-level canary bindings (apply to everything within)
 * - Container-level sharing rules and quorum policies
 * - Aggregate non-access verification (all file vaults pristine)
 * - Cascade destruction (destroy all file vaults atomically)
 *
 * The cryptographic Vault per file version is unchanged — the container
 * is a metadata/organizational concept, not a new cryptographic primitive.
 */
export interface IVaultContainerBase<TID extends PlatformID> {
  id: TID;
  ownerId: TID;
  name: string;
  description?: string;
  /** Root folder for this vault container's file hierarchy */
  rootFolderId: TID;
  /** Container-level ACL (inherited by all contents unless overridden) */
  aclId?: TID;
  /**
   * Visibility controls who can discover and access this vault without an
   * explicit ACL entry. Defaults to `private`.
   * - private  : Only explicit ACL principals
   * - unlisted : Link-accessible but not indexed
   * - public   : Indexed in the discovery feed; eligible for popularity replication
   */
  visibility: VaultVisibility;
  /** Whether sensitive operations require quorum approval */
  approvalGoverned: boolean;
  /** Current lifecycle state */
  state: VaultContainerState;
  /**
   * ISO timestamp when the vault was sealed.
   * Only set when state === 'sealed'.
   */
  sealedAt?: string;
  /**
   * Hex-encoded Merkle root of all file content hashes at seal time.
   * Provides a cryptographic anchor for the pristine guarantee.
   * Only set when state === 'sealed'.
   */
  sealHash?: string;
  /** Optional per-container storage quota in bytes */
  quotaBytes?: number;
  /** Current storage usage in bytes */
  usedBytes: number;
  /**
   * ISO timestamp for scheduled destruction after the cool-down period.
   * Only set when state === 'pending-deletion'.
   */
  pendingDeletionAt?: string;
  /**
   * The state before PendingDeletion was entered.
   * Used to restore the vault on cancellation.
   */
  previousState?: VaultContainerState;
  /**
   * ISO timestamp when the vault was disowned.
   * Only set when state === 'disowned'.
   */
  disownedAt?: string;
  /**
   * The former owner who disowned the vault.
   * Only set when state === 'disowned'.
   */
  disownedBy?: TID;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: TID;
  updatedBy: TID;
}
