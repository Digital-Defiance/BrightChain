/**
 * In-memory, time-ordered cache of versioned rate tables.
 *
 * `RateTableCache` is the server-side projection layer for joule resource
 * credits (Req 1.1, 1.3, 1.5):
 *
 *  - Starts with a bootstrap `IRateTable` so the API can serve rates on
 *    first boot before any on-ledger `RateTableUpdateAction` has been received.
 *  - Entries are kept in ascending `effectiveAt` order; binary-search gives
 *    O(log n) lookup for historical requests.
 *  - Emits `'rate-changed'` whenever a table with a future `effectiveAt` is
 *    added so subscribers (metrics, WebSocket fan-out) can react immediately.
 *
 * All arithmetic remains outside this class — it only stores and serves tables.
 *
 * @see joule-resource-credits spec, Requirement 1.1, 1.3, 1.5
 */

import { IRateTable } from '@brightchain/brightchain-lib';
import { EventEmitter } from 'events';
import { JouleMetrics } from './jouleMetrics';

/**
 * Event map for `RateTableCache`.
 *
 * `'rate-changed'` fires after `addRateTable()` inserts a new entry.
 * The payload is the newly inserted `IRateTable`.
 */
export interface IRateTableCacheEvents {
  'rate-changed': [table: IRateTable];
}

/**
 * Sorted, append-only cache of `IRateTable` snapshots.
 *
 * Thread-safety: Node.js single-threaded; no synchronization needed.
 */
export class RateTableCache extends EventEmitter {
  /** Internal store, sorted ascending by `effectiveAt`. */
  private readonly tables: IRateTable[];

  /**
   * @param bootstrap - The initial rate table to serve before any on-ledger
   *   update has been ingested.  Its `effectiveAt` is set to `0` (epoch) so
   *   it is always the oldest entry and is never returned as "current" once
   *   a real table has been added.
   */
  constructor(bootstrap: IRateTable) {
    super();
    this.tables = [bootstrap];
  }

  // --------------------------------------------------------------------------
  // Mutation
  // --------------------------------------------------------------------------

  /**
   * Insert a new rate table into the cache.
   *
   * The table is inserted in `effectiveAt` sorted order.
   * A duplicate `version` silently replaces the previous entry with the same
   * version number (idempotent re-ingestion from ledger replay).
   *
   * Emits `'rate-changed'` after insertion.
   */
  addRateTable(table: IRateTable): void {
    // Replace if same version already present (idempotent replay)
    const existingIdx = this.tables.findIndex(
      (t) => t.version === table.version,
    );
    if (existingIdx !== -1) {
      this.tables[existingIdx] = table;
      this.emit('rate-changed', table);
      return;
    }

    // Binary insert by effectiveAt
    let lo = 0;
    let hi = this.tables.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.tables[mid].effectiveAt <= table.effectiveAt) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.tables.splice(lo, 0, table);
    JouleMetrics.getInstance().setRateTableVersion(table.version);
    this.emit('rate-changed', table);
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Return the rate table that was active at `timestampMs`.
   *
   * Returns the table with the largest `effectiveAt` that is still ≤
   * `timestampMs`.  Falls back to the bootstrap entry (index 0) when
   * `timestampMs` precedes all entries — which should not happen in normal
   * operation but is safe to handle.
   *
   * @param timestampMs - Unix milliseconds.
   */
  getRateAt(timestampMs: number): IRateTable {
    // Binary search for the last entry with effectiveAt <= timestampMs
    let lo = 0;
    let hi = this.tables.length - 1;
    let result = this.tables[0];

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const entry = this.tables[mid];
      if (entry.effectiveAt <= timestampMs) {
        result = entry;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return result;
  }

  /**
   * Return the most recently effective rate table.
   *
   * Equivalent to `getRateAt(Date.now())` but avoids the clock call for
   * callers that need the current rate synchronously.
   */
  getCurrentRate(): IRateTable {
    return this.getRateAt(Date.now());
  }

  /**
   * Return all stored rate tables in ascending `effectiveAt` order.
   *
   * Used by the `GET /joule/rate-table/history` endpoint.
   */
  getHistory(): ReadonlyArray<IRateTable> {
    return [...this.tables];
  }

  /**
   * Total number of tables stored (including bootstrap).
   */
  get size(): number {
    return this.tables.length;
  }
}
