import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A single audit entry recorded on the blockchain ledger.
 * Every file operation produces one of these entries.
 */
export interface IAuditEntryBase<TID extends PlatformID> {
  /** Ledger sequence number */
  sequenceNumber: number;
  operationType: string;
  actorId: TID;
  targetId: TID;
  targetType:
    | 'file'
    | 'folder'
    | 'vault_container'
    | 'share_link'
    | 'canary_binding'
    | 'quorum_request';
  timestamp: Date | string;
  ipAddress?: string;
  /** Operation-specific metadata (JSON-serializable) */
  metadata: Record<string, unknown>;
  /** Flags */
  isDuress?: boolean;
  isRubberStamped?: boolean;
  /** Ledger entry hash for verification */
  ledgerEntryHash: Uint8Array;
}
