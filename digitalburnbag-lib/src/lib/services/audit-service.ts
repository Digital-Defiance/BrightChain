import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { AuditLogError } from '../errors';
import type { IAuditEntryBase } from '../interfaces/bases/audit-entry';
import type {
  IAuditEntryParams,
  IAuditExport,
  IAuditQueryFilters,
  IComplianceReport,
  IComplianceReportParams,
} from '../interfaces/params/audit-service-params';
import type { IAuditRepository } from '../interfaces/services/audit-repository';
import type { IAuditService } from '../interfaces/services/audit-service';

/**
 * Dependencies injected into AuditService that come from other services.
 */
export interface IAuditServiceDeps<_TID extends PlatformID> {
  /** Record audit entry on ledger */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>;
  /** Generate Merkle inclusion proof for a ledger entry */
  generateMerkleProof: (ledgerEntryHash: Uint8Array) => Promise<Uint8Array[]>;
}

/**
 * Manages audit logging, querying, export, and compliance reporting.
 *
 * Every file operation is recorded as a signed, hash-chained audit entry
 * on the blockchain ledger. This service provides the high-level API for
 * logging those entries, querying them, exporting with Merkle proofs, and
 * generating compliance reports.
 *
 * Delegates persistence to an `IAuditRepository`, which is implemented
 * in `digitalburnbag-api-lib` backed by BrightDB.
 */
export class AuditService<TID extends PlatformID>
  implements IAuditService<TID>
{
  constructor(
    private readonly repository: IAuditRepository<TID>,
    private readonly deps: IAuditServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Log an audit entry for a file operation.
   * Gets the next sequence number, records the entry on the ledger,
   * builds the full audit entry, and stores it via the repository.
   */
  async logOperation(entry: IAuditEntryParams<TID>): Promise<void> {
    try {
      const sequenceNumber = await this.repository.getNextSequenceNumber();

      const ledgerEntryHash = await this.deps.recordOnLedger({
        operation: 'audit_log',
        sequenceNumber,
        operationType: entry.operationType,
        actorId: String(entry.actorId),
        targetId: String(entry.targetId),
        targetType: entry.targetType,
        metadata: entry.metadata,
      });

      const now = new Date().toISOString();
      const auditEntry: IAuditEntryBase<TID> = {
        sequenceNumber,
        operationType: entry.operationType,
        actorId: entry.actorId,
        targetId: entry.targetId,
        targetType: entry.targetType,
        timestamp: now,
        ipAddress: entry.ipAddress,
        metadata: entry.metadata ?? {},
        isDuress: entry.isDuress,
        isRubberStamped: entry.isRubberStamped,
        ledgerEntryHash,
      };

      await this.repository.appendEntry(auditEntry);
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error;
      }
      throw new AuditLogError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Query the audit log with filters.
   * Delegates directly to the repository.
   */
  async queryAuditLog(
    filters: IAuditQueryFilters<TID>,
  ): Promise<IAuditEntryBase<TID>[]> {
    return this.repository.queryEntries(filters);
  }

  /**
   * Export audit log entries with Merkle inclusion proofs.
   * Queries entries matching the filters, then generates a Merkle proof
   * for each entry's ledger hash.
   */
  async exportAuditLog(
    filters: IAuditQueryFilters<TID>,
  ): Promise<IAuditExport<TID>> {
    const entries = await this.repository.queryEntries(filters);

    const merkleProofs: Uint8Array[] = [];
    for (const entry of entries) {
      const proof = await this.deps.generateMerkleProof(entry.ledgerEntryHash);
      // Flatten proof arrays into a single array per entry
      for (const p of proof) {
        merkleProofs.push(p);
      }
    }

    return {
      entries,
      merkleProofs,
    };
  }

  /**
   * Generate a compliance report for a date range.
   * Queries all entries in the range, computes statistics (total ops,
   * breakdown by type, access patterns, destruction/sharing/non-access
   * counts), generates Merkle proofs, and returns the report.
   */
  async generateComplianceReport(
    params: IComplianceReportParams<TID>,
  ): Promise<IComplianceReport<TID>> {
    const entries = await this.repository.queryEntries({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    } as IAuditQueryFilters<TID>);

    // Compute operation breakdown by type
    const operationBreakdown: Record<string, number> = {};
    for (const entry of entries) {
      const opType = entry.operationType;
      operationBreakdown[opType] = (operationBreakdown[opType] ?? 0) + 1;
    }

    // Compute access patterns: count operations per actor
    const actorCounts = new Map<string, { actorId: TID; count: number }>();
    for (const entry of entries) {
      const key = String(entry.actorId);
      const existing = actorCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        actorCounts.set(key, { actorId: entry.actorId, count: 1 });
      }
    }
    const accessPatterns = Array.from(actorCounts.values()).map((v) => ({
      actorId: v.actorId,
      operationCount: v.count,
    }));

    // Count specific event categories
    const destructionTypes = new Set<string>([
      FileAuditOperationType.FileDestroyed,
      FileAuditOperationType.DestructionScheduled,
      FileAuditOperationType.DestructionCancelled,
    ]);
    const sharingTypes = new Set<string>([
      FileAuditOperationType.ShareCreated,
      FileAuditOperationType.ShareRevoked,
      FileAuditOperationType.ShareLinkAccessed,
    ]);

    let _destructionEvents = 0;
    let _sharingEvents = 0;
    let _nonAccessProofs = 0;

    for (const entry of entries) {
      if (destructionTypes.has(entry.operationType)) {
        _destructionEvents += 1;
      }
      if (sharingTypes.has(entry.operationType)) {
        _sharingEvents += 1;
      }
      if (
        entry.operationType === FileAuditOperationType.NonAccessProofGenerated
      ) {
        _nonAccessProofs += 1;
      }
    }

    // Generate Merkle proofs for all entries
    const merkleProofs: Uint8Array[] = [];
    for (const entry of entries) {
      const proof = await this.deps.generateMerkleProof(entry.ledgerEntryHash);
      for (const p of proof) {
        merkleProofs.push(p);
      }
    }

    return {
      dateRange: {
        from:
          params.dateFrom instanceof Date
            ? params.dateFrom.toISOString()
            : params.dateFrom,
        to:
          params.dateTo instanceof Date
            ? params.dateTo.toISOString()
            : params.dateTo,
      },
      accessPatterns: params.includeAccessPatterns ? accessPatterns : undefined,
      destructionEvents: params.includeDestructionEvents
        ? entries
            .filter((e) => destructionTypes.has(e.operationType))
            .map((e) => e.metadata)
        : undefined,
      sharingActivity: params.includeSharingActivity
        ? entries
            .filter((e) => sharingTypes.has(e.operationType))
            .map((e) => e.metadata)
        : undefined,
      nonAccessProofs: params.includeNonAccessProofs
        ? entries
            .filter(
              (e) =>
                e.operationType ===
                FileAuditOperationType.NonAccessProofGenerated,
            )
            .map((e) => e.metadata)
        : undefined,
      merkleProofs,
    };
  }
}
