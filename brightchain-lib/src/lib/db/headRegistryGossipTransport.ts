/**
 * HeadRegistryGossipTransport — Gossip-aware decorator for IHeadRegistry.
 *
 * Wraps any IHeadRegistry and wires it to an IGossipService so that:
 *   1. Outbound: after every successful setHead(), the update is announced
 *      to peers via gossip.
 *   2. Inbound: incoming 'head_update' gossip announcements are merged into
 *      the wrapped registry using last-writer-wins semantics.
 *   3. Anti-entropy: an optional periodic timer re-announces all known head
 *      pointers so that nodes that missed earlier announcements can converge.
 *
 * Usage:
 *   const transport = new HeadRegistryGossipTransport(inner, gossipService);
 *   transport.start(30_000); // optional anti-entropy every 30 s
 *   // … use transport as an IHeadRegistry …
 *   await transport.stop();
 *
 * @see Requirements 2.1, 7.1, 7.2
 */

import type { IWriteProof } from '../interfaces/auth/writeProof';
import type {
  AnnouncementHandler,
  BlockAnnouncement,
  IGossipService,
} from '../interfaces/availability/gossipService';
import type { BlockId } from '../interfaces/branded/primitives/blockId';
import type {
  DeferredHeadUpdate,
  IHeadRegistry,
} from '../interfaces/storage/headRegistry';
import type { HeadRecord } from '../interfaces/storage/headRegistryDriver';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

export class HeadRegistryGossipTransport implements IHeadRegistry {
  private readonly inner: IHeadRegistry;
  private readonly gossip: IGossipService;
  private readonly announcementHandler: AnnouncementHandler;
  private antiEntropyTimer?: ReturnType<typeof setInterval>;

  constructor(inner: IHeadRegistry, gossip: IGossipService) {
    this.inner = inner;
    this.gossip = gossip;

    // Build the inbound handler once so we can unregister the exact same
    // reference in stop().
    this.announcementHandler = (ann: BlockAnnouncement): void => {
      if (ann.type !== 'head_update' || !ann.headUpdate) return;
      const { dbName, collectionName } = ann.headUpdate;
      const blockId = String(ann.blockId);
      const timestamp: BrightDateTimestamp = ann.timestamp; // already BrightDateTimestamp
      // Best-effort inbound merge — do not let gossip errors surface.
      this.inner
        .mergeHeadUpdate(dbName, collectionName, blockId, timestamp)
        .catch(() => {
          // Intentionally swallowed: gossip failures must not crash the service.
        });
    };

    this.gossip.onAnnouncement(this.announcementHandler);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Start the optional anti-entropy timer.
   * When `antiEntropyIntervalMs` is provided and > 0, the transport will
   * periodically re-announce all known head pointers so that peers that
   * joined late (or missed earlier announcements) can converge.
   *
   * @param antiEntropyIntervalMs - Interval in milliseconds between anti-entropy
   *   passes.  Pass 0 or omit to disable.
   */
  start(antiEntropyIntervalMs?: number): void {
    if (antiEntropyIntervalMs && antiEntropyIntervalMs > 0) {
      this.antiEntropyTimer = setInterval(() => {
        void this.pushSnapshot();
      }, antiEntropyIntervalMs);
    }
  }

  /**
   * Stop the anti-entropy timer and unregister the inbound handler.
   * Should be called when the transport is no longer needed.
   */
  async stop(): Promise<void> {
    if (this.antiEntropyTimer !== undefined) {
      clearInterval(this.antiEntropyTimer);
      this.antiEntropyTimer = undefined;
    }
    this.gossip.offAnnouncement(this.announcementHandler);
  }

  /**
   * Re-announce every known head pointer via gossip.
   * Used by the anti-entropy timer and can also be called manually to
   * trigger an immediate convergence pass.
   */
  async pushSnapshot(): Promise<void> {
    const snapshot = this.inner.exportSnapshot();
    for (const [key, record] of snapshot) {
      const colon = key.indexOf(':');
      const dbName = colon === -1 ? key : key.slice(0, colon);
      const collectionName = colon === -1 ? '' : key.slice(colon + 1);
      try {
        await this.gossip.announceHeadUpdate(
          dbName,
          collectionName,
          record.blockId as BlockId,
        );
      } catch {
        // Best-effort: individual failures must not abort the whole pass.
      }
    }
  }

  // ── IHeadRegistry – mutations with outbound gossip ───────────────────────

  /**
   * Set the head pointer locally and announce the update to peers.
   * Gossip announcement is best-effort: a failure does not roll back the
   * local write.
   */
  async setHead(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    await this.inner.setHead(dbName, collectionName, blockId, writeProof);

    // Best-effort outbound announcement.
    try {
      await this.gossip.announceHeadUpdate(
        dbName,
        collectionName,
        blockId as BlockId,
      );
    } catch {
      // Intentionally swallowed: gossip failures must not break local writes.
    }
  }

  // ── IHeadRegistry – pure delegations ─────────────────────────────────────

  getHead(dbName: string, collectionName: string): string | undefined {
    return this.inner.getHead(dbName, collectionName);
  }

  async removeHead(
    dbName: string,
    collectionName: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    return this.inner.removeHead(dbName, collectionName, writeProof);
  }

  async clear(): Promise<void> {
    return this.inner.clear();
  }

  async load(): Promise<void> {
    return this.inner.load();
  }

  getAllHeads(): Map<string, string> {
    return this.inner.getAllHeads();
  }

  getHeadTimestamp(dbName: string, collectionName: string): BrightDateTimestamp | undefined {
    return this.inner.getHeadTimestamp(dbName, collectionName);
  }

  async mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: BrightDateTimestamp,
    writeProof?: IWriteProof,
  ): Promise<boolean> {
    return this.inner.mergeHeadUpdate(
      dbName,
      collectionName,
      blockId,
      timestamp,
      writeProof,
    );
  }

  async deferHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: BrightDateTimestamp,
  ): Promise<void> {
    return this.inner.deferHeadUpdate(
      dbName,
      collectionName,
      blockId,
      timestamp,
    );
  }

  async applyDeferredUpdates(blockId: string): Promise<number> {
    return this.inner.applyDeferredUpdates(blockId);
  }

  getDeferredUpdates(): DeferredHeadUpdate[] {
    return this.inner.getDeferredUpdates();
  }

  exportSnapshot(): ReadonlyMap<string, HeadRecord> {
    return this.inner.exportSnapshot();
  }

  async mergeSnapshot(
    snapshot: Iterable<readonly [string, HeadRecord]>,
  ): Promise<{ merged: number; skipped: number }> {
    return this.inner.mergeSnapshot(snapshot);
  }

  onHeadChange(
    dbName: string,
    collectionName: string,
    callback: (blockId: string) => void,
  ): () => void {
    return this.inner.onHeadChange(dbName, collectionName, callback);
  }
}
