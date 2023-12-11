/**
 * @fileoverview ReservationReaper — interval-based reaper for stale Joule
 * reservations.
 *
 * The reaper calls `AssetAccountStore.reapAllExpired()` on every tick.  It
 * returns expired `opId` entries to the `DebitAuthorizationService` so that
 * the active-reservation map stays in sync.
 *
 * @see joule-resource-credits spec, Requirement 3.5
 */

import { AssetAccountStore } from '@brightchain/brightchain-lib';
import { EventEmitter } from 'events';
import { DebitAuthorizationService } from './debitAuthorization';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default reap interval: 60 seconds. */
export const JOULE_REAPER_INTERVAL_MS_DEFAULT = 60_000;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Events emitted by `ReservationReaper`.
 *
 * - `'reaped'` — fired after each reap cycle with the count of released
 *   reservations.  Payload: `{ count: number, timestamp: number }`.
 */
export interface IReaperEvents {
  reaped: [{ count: number; timestamp: number }];
}

// ---------------------------------------------------------------------------
// Reaper
// ---------------------------------------------------------------------------

/**
 * Background service that periodically releases expired Joule reservations.
 *
 * Usage:
 * ```ts
 * const reaper = new ReservationReaper(store, authService, { intervalMs: 30_000 });
 * reaper.start();
 * // later:
 * reaper.stop();
 * ```
 */
export class ReservationReaper extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;

  constructor(
    private readonly store: AssetAccountStore,
    private readonly authService: DebitAuthorizationService,
    opts: { intervalMs?: number } = {},
  ) {
    super();
    this.intervalMs = opts.intervalMs ?? JOULE_REAPER_INTERVAL_MS_DEFAULT;
  }

  /** Start the periodic reap cycle. Idempotent — calling twice is a no-op. */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.reap(), this.intervalMs);
    // Ensure the timer does not keep the Node process alive.
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as NodeJS.Timeout).unref();
    }
  }

  /** Stop the periodic reap cycle. Idempotent — safe to call before `start`. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Run a single reap cycle immediately (also called on each interval tick). */
  reap(): number {
    // Reap expired reservations from the operational store.
    const count = this.store.reapAllExpired();

    // The active-reservation map inside DebitAuthorizationService also holds
    // references to now-expired opIds.  Walk them and remove any whose handle
    // has expired so subsequent capture/release attempts get a clean error.
    const now = Date.now();
    const active = this.authService.getActiveReservations();
    for (const [opId, entry] of active) {
      if (entry.handle.expiresAt.getTime() <= now) {
        // Remove silently; the next capture/release call will raise the
        // appropriate named error.
        (
          this.authService as unknown as {
            active: Map<string, unknown>;
          }
        ).active.delete(opId);
      }
    }

    this.emit('reaped', { count, timestamp: now });
    return count;
  }

  /** Whether the reaper is currently running. */
  get isRunning(): boolean {
    return this.timer !== null;
  }
}
