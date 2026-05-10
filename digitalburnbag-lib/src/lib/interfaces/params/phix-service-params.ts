import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PhixPlanType } from '../../enumerations/phix-plan-type';

/**
 * Parameters for requesting a Phix (Phoenix-cycle rename).
 */
export interface IPhixParams<TID extends PlatformID> {
  /** The item to phix */
  itemId: TID;
  /** Whether this is a file or folder */
  itemType: 'file' | 'folder';
  /** The new name */
  newName: string;
  /** Who is requesting the phix */
  requesterId: TID;
}

/**
 * A Phix plan — the preview shown to the user before execution.
 *
 * This is the data behind the [ Phix ] button's tooltip and
 * confirmation dialog. It tells the user exactly what will happen:
 * how many items are affected, whether data moves, and how long
 * it will take.
 */
export interface IPhixPlan<TID extends PlatformID> {
  /** The item being phixed */
  itemId: TID;
  itemType: 'file' | 'folder';
  /** Current name (the typo) */
  oldName: string;
  /** New name (the fix) */
  newName: string;
  /** Weight of the operation */
  planType: PhixPlanType;
  /** Number of files affected (1 for a file, N for a folder) */
  affectedFileCount: number;
  /** Number of subfolders affected (0 for a file) */
  affectedFolderCount: number;
  /** Total bytes across all affected files */
  totalSizeBytes: number;
  /** Human-readable description of what will happen */
  summary: string;
  /** Estimated duration in milliseconds (0 for metadata-only) */
  estimatedDurationMs: number;
  /** Whether vault re-encryption is required */
  requiresReEncryption: boolean;
  /**
   * Estimated energy cost in joules.
   * BrightChain runs on joules — every operation has a cost.
   * For metadata-only renames this is near-zero (a DB write).
   * For full-cycle operations this reflects the real cost of
   * re-encrypting, re-blocking, and re-vaulting the data.
   * Gild will editorialize about this number regardless of size.
   */
  estimatedJoules: number;
}

/**
 * Result of a completed Phix operation.
 */
export interface IPhixResult<TID extends PlatformID> {
  /** Whether the phix succeeded */
  success: boolean;
  /** The plan that was executed */
  plan: IPhixPlan<TID>;
  /** Timestamp of completion */
  completedAt: string;
  /** Audit trail entry ID */
  auditEntryId?: TID;
}
