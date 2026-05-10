import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IAuditEntryBase } from '../bases/audit-entry';
import type {
  IAuditEntryParams,
  IAuditExport,
  IAuditQueryFilters,
  IComplianceReport,
  IComplianceReportParams,
} from '../params/audit-service-params';

/**
 * Service interface for audit logging, querying, export, and compliance
 * reporting.
 *
 * Every file operation is recorded as a signed, hash-chained audit entry
 * on the blockchain ledger. This service provides the high-level API for
 * logging, querying, exporting, and generating compliance reports from
 * those entries.
 */
export interface IAuditService<TID extends PlatformID> {
  /** Log an audit entry for a file operation */
  logOperation(entry: IAuditEntryParams<TID>): Promise<void>;

  /** Query the audit log with filters */
  queryAuditLog(
    filters: IAuditQueryFilters<TID>,
  ): Promise<IAuditEntryBase<TID>[]>;

  /** Export audit log entries with Merkle inclusion proofs */
  exportAuditLog(filters: IAuditQueryFilters<TID>): Promise<IAuditExport<TID>>;

  /** Generate a compliance report for a date range */
  generateComplianceReport(
    params: IComplianceReportParams<TID>,
  ): Promise<IComplianceReport<TID>>;
}
