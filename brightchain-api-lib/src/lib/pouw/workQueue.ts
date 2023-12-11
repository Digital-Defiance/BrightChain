import { IPoUWConfig, IWorkUnit } from '@brightchain/brightchain-lib';

/**
 * An entry in the work queue, wrapping a work unit with scheduling metadata.
 */
export interface IWorkQueueEntry {
  /** The work unit payload */
  workUnit: IWorkUnit;
  /** Priority score — lower is higher priority */
  priority: number;
  /** Whether this unit contributes to a partially-completed Merkle tree */
  isPartialTree: boolean;
  /** Epoch timestamp when this entry was enqueued */
  enqueuedAt: number;
  /** If assigned, epoch timestamp when the assignment expires */
  assignedUntil?: number;
  /** Pre-computed expected result for server-side verification */
  expectedResult: string;
}

/**
 * Priority queue for PoUW work units.
 *
 * Maintains an array of {@link IWorkQueueEntry} sorted by priority (ascending).
 * Work units contributing to partially-completed Merkle trees receive priority 0;
 * new-tree work units receive priority 1. This ensures partial trees are completed
 * before new trees are started, maximising useful output.
 *
 * The queue supports:
 * - **enqueue** — insert a work unit with priority metadata
 * - **dequeue** — remove and return the highest-priority available entry
 * - **requeue** — return a previously-dequeued unit to the queue
 * - **expireStale** — remove entries older than `workUnitMaxAgeMs`
 * - **reclaimExpired** — return assigned-but-incomplete entries to the available pool
 * - **markAssigned** — mark an entry as assigned with an expiration time
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export class WorkQueue {
  private readonly entries: IWorkQueueEntry[] = [];
  private readonly minQueueDepth: number;
  private readonly workUnitMaxAgeMs: number;

  /**
   * @param config - Queue configuration extracted from {@link IPoUWConfig}
   */
  constructor(config: Pick<IPoUWConfig, 'minQueueDepth' | 'workUnitMaxAgeMs'>) {
    this.minQueueDepth = config.minQueueDepth;
    this.workUnitMaxAgeMs = config.workUnitMaxAgeMs;
  }

  /**
   * Enqueue a work unit with scheduling metadata.
   *
   * Partial-tree units (priority 0) are inserted before new-tree units
   * (priority 1). Within the same priority level, insertion order is
   * preserved (stable sort via binary search).
   *
   * @param unit - The work unit to enqueue
   * @param expectedResult - Pre-computed expected result hash for verification
   * @param isPartialTree - Whether this unit contributes to a partial tree
   */
  enqueue(
    unit: IWorkUnit,
    expectedResult: string,
    isPartialTree: boolean,
  ): void {
    const entry: IWorkQueueEntry = {
      workUnit: unit,
      priority: isPartialTree ? 0 : 1,
      isPartialTree,
      enqueuedAt: Date.now(),
      expectedResult,
    };

    // Binary search for the correct insertion index (stable: insert after
    // existing entries with the same priority).
    let lo = 0;
    let hi = this.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.entries[mid].priority <= entry.priority) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.entries.splice(lo, 0, entry);
  }

  /**
   * Dequeue the highest-priority available work unit.
   *
   * An entry is "available" if it is not currently assigned (i.e.
   * `assignedUntil` is `undefined`). Entries whose `assignedUntil`
   * has expired are also considered available.
   *
   * The entry is removed from the queue entirely. The caller
   * (typically {@link WorkCoordinator}) tracks assigned units
   * separately.
   *
   * @returns The dequeued entry, or `null` if no available entries exist
   */
  dequeue(): IWorkQueueEntry | null {
    const now = Date.now();

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const isAvailable =
        entry.assignedUntil === undefined || entry.assignedUntil < now;

      if (isAvailable) {
        this.entries.splice(i, 1);
        return entry;
      }
    }

    return null;
  }

  /**
   * Return a work unit to the queue.
   *
   * Used when an assigned work unit was not completed (e.g. the client
   * disconnected or the challenge token expired). The entry is re-inserted
   * with a cleared `assignedUntil` and a fresh `enqueuedAt` timestamp.
   *
   * @param unit - The work unit to re-enqueue
   * @param expectedResult - Pre-computed expected result hash
   * @param isPartialTree - Whether this unit contributes to a partial tree
   */
  requeue(
    unit: IWorkUnit,
    expectedResult: string,
    isPartialTree: boolean,
  ): void {
    this.enqueue(unit, expectedResult, isPartialTree);
  }

  /**
   * Mark a queued entry as assigned with an expiration time.
   *
   * This is used when a work unit remains in the queue but is logically
   * "checked out" to a client. The entry will not be returned by
   * {@link dequeue} until `assignedUntil` has passed.
   *
   * @param workUnitId - The ID of the work unit to mark
   * @param assignedUntil - Epoch timestamp when the assignment expires
   * @returns `true` if the entry was found and marked, `false` otherwise
   */
  markAssigned(workUnitId: string, assignedUntil: number): boolean {
    const entry = this.entries.find((e) => e.workUnit.id === workUnitId);
    if (entry) {
      entry.assignedUntil = assignedUntil;
      return true;
    }
    return false;
  }

  /**
   * Remove work units that have exceeded the maximum age.
   *
   * Entries whose `enqueuedAt` timestamp is older than `workUnitMaxAgeMs`
   * are removed from the queue regardless of assignment status.
   *
   * @returns The number of entries removed
   * @see Requirement 9.3
   */
  expireStale(): number {
    const now = Date.now();
    const cutoff = now - this.workUnitMaxAgeMs;
    const before = this.entries.length;

    // Remove in reverse to avoid index shifting issues
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].enqueuedAt < cutoff) {
        this.entries.splice(i, 1);
      }
    }

    return before - this.entries.length;
  }

  /**
   * Reclaim assigned-but-incomplete work units whose assignments have expired.
   *
   * Entries with an `assignedUntil` timestamp in the past are returned to
   * the available pool by clearing their `assignedUntil` field.
   *
   * @returns The number of entries reclaimed
   * @see Requirement 9.4
   */
  reclaimExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const entry of this.entries) {
      if (entry.assignedUntil !== undefined && entry.assignedUntil < now) {
        entry.assignedUntil = undefined;
        count++;
      }
    }

    return count;
  }

  /**
   * Current queue depth — the number of available (unassigned) entries.
   *
   * Entries that are currently assigned (i.e. `assignedUntil` is set and
   * has not yet expired) are excluded from the count.
   */
  get depth(): number {
    const now = Date.now();
    return this.entries.filter(
      (e) => e.assignedUntil === undefined || e.assignedUntil < now,
    ).length;
  }

  /**
   * Whether the queue needs replenishment.
   *
   * Returns `true` when the available depth falls below the configured
   * `minQueueDepth`, signalling the {@link WorkCoordinator} to generate
   * additional work units.
   *
   * @see Requirement 9.1
   */
  get needsReplenishment(): boolean {
    return this.depth < this.minQueueDepth;
  }
}
