import type { Collection } from '@brightchain/db';
import type {
  IAuditEntryBase,
  IAuditQueryFilters,
  IAuditRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, type IdSerializer } from './brightdb-helpers';

export class BrightDBAuditRepository<TID extends PlatformID>
  implements IAuditRepository<TID>
{
  constructor(
    private readonly auditEntries: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async appendEntry(entry: IAuditEntryBase<TID>): Promise<void> {
    // Serialize all TID fields in the entry
    const serialized: Record<string, unknown> = {
      _id: String(entry.sequenceNumber),
    };
    for (const [key, value] of Object.entries(entry)) {
      if (value instanceof Uint8Array) {
        serialized[key] = this.ids.idToString(value as TID);
      } else {
        serialized[key] = value;
      }
    }
    await this.auditEntries.insertOne(serialized);
  }

  async queryEntries(
    filters: IAuditQueryFilters<TID>,
  ): Promise<IAuditEntryBase<TID>[]> {
    const f: Record<string, unknown> = {};

    if (filters.actorId) {
      f['actorId'] = filters.actorId;
    }
    if (filters.targetId) {
      f['targetId'] = filters.targetId;
    }
    if (filters.operationType) {
      f['operationType'] = filters.operationType;
    }
    if (filters.dateFrom) {
      f['timestamp'] = { $gte: filters.dateFrom };
    }
    if (filters.dateTo) {
      f['timestamp'] = {
        ...((f['timestamp'] as Record<string, unknown>) ?? {}),
        $lte: filters.dateTo,
      };
    }

    const docs = await this.auditEntries.find(filter(f, this.ids)).toArray();

    // Apply pagination
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? docs.length;
    const start = (page - 1) * pageSize;
    const paged = docs.slice(start, start + pageSize);

    return paged.map((d) => {
      const doc = d as Record<string, unknown>;
      const { _id, ...rest } = doc;
      // Deserialize known ID fields
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (
          (key === 'actorId' || key === 'targetId') &&
          typeof value === 'string'
        ) {
          try {
            result[key] = this.ids.parseId(value);
          } catch {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
      return result as unknown as IAuditEntryBase<TID>;
    });
  }

  async getNextSequenceNumber(): Promise<number> {
    const count = await this.auditEntries.countDocuments(filter({}, this.ids));
    return count + 1;
  }
}
