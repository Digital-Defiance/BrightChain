import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IAuditEntryBase } from '../bases/audit-entry';
import type { IAuditQueryFilters } from '../params/audit-service-params';

/**
 * Repository interface abstracting BrightDB access for audit operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IAuditRepository<TID extends PlatformID> {
  /** Store an audit entry */
  appendEntry(entry: IAuditEntryBase<TID>): Promise<void>;

  /** Query audit entries with filters */
  queryEntries(
    filters: IAuditQueryFilters<TID>,
  ): Promise<IAuditEntryBase<TID>[]>;

  /** Get the next sequence number for audit entries */
  getNextSequenceNumber(): Promise<number>;
}
