import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../../enumerations/file-audit-operation-type';
import type { IAuditEntryBase } from '../bases/audit-entry';

/**
 * Parameters for logging an audit entry.
 */
export interface IAuditEntryParams<TID extends PlatformID> {
  operationType: FileAuditOperationType;
  actorId: TID;
  targetId: TID;
  targetType: 'file' | 'folder' | 'vault_container';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  isDuress?: boolean;
  isRubberStamped?: boolean;
}

/**
 * Filters for querying audit entries.
 */
export interface IAuditQueryFilters<TID extends PlatformID> {
  actorId?: TID;
  targetId?: TID;
  operationType?: FileAuditOperationType;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  pageSize?: number;
}

/**
 * Verifiable audit log export with Merkle inclusion proofs.
 */
export interface IAuditExport<TID extends PlatformID> {
  entries: IAuditEntryBase<TID>[];
  merkleProofs: Uint8Array[];
}

/**
 * Parameters for generating a compliance report.
 */
export interface IComplianceReportParams<_TID extends PlatformID> {
  dateFrom: Date;
  dateTo: Date;
  includeAccessPatterns?: boolean;
  includeDestructionEvents?: boolean;
  includeSharingActivity?: boolean;
  includeNonAccessProofs?: boolean;
}

/**
 * Generated compliance report.
 */
export interface IComplianceReport<_TID extends PlatformID> {
  dateRange: { from: Date | string; to: Date | string };
  accessPatterns?: Record<string, unknown>[];
  destructionEvents?: Record<string, unknown>[];
  sharingActivity?: Record<string, unknown>[];
  nonAccessProofs?: Record<string, unknown>[];
  merkleProofs: Uint8Array[];
}
