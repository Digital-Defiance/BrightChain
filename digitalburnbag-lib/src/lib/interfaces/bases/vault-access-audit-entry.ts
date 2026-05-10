import { AccessOutcome } from '../../enumerations/access-outcome';
import { AccessorType } from '../../enumerations/accessor-type';

/**
 * Metadata shape for a vault file access audit entry.
 * Stored in the IAuditEntryBase.metadata field.
 *
 * This is NOT a new base interface — it defines the metadata contract
 * for audit entries with operationType = VaultFileAccessed.
 */
export interface IVaultAccessAuditMetadata {
  /** Classification of the accessor */
  accessorType: AccessorType;
  /** Result of the access attempt */
  accessOutcome: AccessOutcome;
  /** HTTP method */
  httpMethod: string;
  /** Request endpoint path */
  endpointPath: string;
  /** User-Agent header */
  userAgent: string;
  /** Vault container ID (string-serialized for metadata) */
  vaultContainerId?: string;
  /** File ID (string-serialized for metadata) */
  fileId?: string;
  /** Whether this access broke a vault seal */
  sealBroken?: boolean;
  /** Share link ID if accessed via share link */
  shareLinkId?: string;
  /** Number of skipped entries due to rate limiting (on the next written entry) */
  skippedEntries?: number;
}
