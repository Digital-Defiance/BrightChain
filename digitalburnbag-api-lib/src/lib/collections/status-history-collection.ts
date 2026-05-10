import type { Collection } from '@brightchain/db';
import type {
  IStatusHistoryEntry,
  IStatusHistoryQueryOptions,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IStatusHistoryRepository } from '../services/health-monitor-service';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/** 90 days in milliseconds. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * BrightDB repository for the `status_history` collection.
 *
 * Implements application-level 90-day retention via `purgeExpiredEntries`
 * because BrightDB does not support TTL indexes natively.
 *
 * Requirements: 7.1, 7.4
 */
export class BrightDBStatusHistoryRepository<TID extends PlatformID>
  implements IStatusHistoryRepository<TID>
{
  constructor(
    private readonly history: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async appendEntry(entry: IStatusHistoryEntry<TID>): Promise<void> {
    await this.history.insertOne(toDoc(entry, this.ids));
  }

  async getEntriesByConnection(
    connectionId: TID,
    options?: IStatusHistoryQueryOptions,
  ): Promise<IStatusHistoryEntry<TID>[]> {
    const docs = await this.history
      .find(filter({ connectionId }, this.ids))
      .toArray();

    let entries = docs.map((d) =>
      fromDoc<TID, IStatusHistoryEntry<TID>>(d, this.ids),
    );

    // Apply signal type filter
    if (options?.signalTypes && options.signalTypes.length > 0) {
      const allowed = new Set(options.signalTypes);
      entries = entries.filter((e) => allowed.has(e.signalType));
    }

    // Apply date range filters
    if (options?.since) {
      const sinceTime = options.since.getTime();
      entries = entries.filter((e) => {
        const ts =
          e.timestamp instanceof Date
            ? e.timestamp
            : new Date(e.timestamp as unknown as string);
        return ts.getTime() >= sinceTime;
      });
    }

    if (options?.until) {
      const untilTime = options.until.getTime();
      entries = entries.filter((e) => {
        const ts =
          e.timestamp instanceof Date
            ? e.timestamp
            : new Date(e.timestamp as unknown as string);
        return ts.getTime() <= untilTime;
      });
    }

    // Sort chronologically (ascending by timestamp)
    entries.sort((a, b) => {
      const aTime =
        a.timestamp instanceof Date
          ? a.timestamp.getTime()
          : new Date(a.timestamp as unknown as string).getTime();
      const bTime =
        b.timestamp instanceof Date
          ? b.timestamp.getTime()
          : new Date(b.timestamp as unknown as string).getTime();
      return aTime - bTime;
    });

    // Apply limit
    if (options?.limit !== undefined && options.limit >= 0) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Purge entries older than 90 days.
   *
   * BrightDB does not support TTL indexes, so retention is enforced
   * at the application level. This method should be called periodically
   * (e.g. via a scheduled job).
   *
   * Requirement: 7.4
   */
  async purgeExpiredEntries(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    // Fetch all docs and delete those with createdAt older than cutoff
    const docs = await this.history.find({}).toArray();
    let purged = 0;
    for (const doc of docs) {
      const d = doc as Record<string, unknown>;
      const createdAt = d['createdAt'];
      const ts =
        createdAt instanceof Date ? createdAt : new Date(createdAt as string);
      if (ts.getTime() < cutoff.getTime()) {
        await this.history.deleteOne(filter({ _id: d['_id'] }, this.ids));
        purged++;
      }
    }
    return purged;
  }
}
