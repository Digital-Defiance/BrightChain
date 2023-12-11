/**
 * @fileoverview DebitAuthorization service — two-phase Joule reservation
 * (authorize → capture | release) over the operational `AssetAccountStore`.
 *
 * ## Design
 *
 * Reservations live **entirely in Layer 1** (the operational account store).
 * They do NOT appear in Layer 3 (the asset ledger).  Only the `capture` path
 * emits a Resource_Event to the metering-log.  The `release` path is a
 * silent reversal of the hold.
 *
 * @see joule-resource-credits spec, Requirements 3.1 – 3.7
 */

import {
  AssetAccountStore,
  Checksum,
  EnergyAccount,
  EnergyAccountStore,
  InsufficientAvailableBalanceError,
  IReservationHandle,
  JOULE_ASSET_ID,
  ReservationExpiredError,
  ReservationNotFoundError,
} from '@brightchain/brightchain-lib';
import { v4 as uuidv4 } from 'uuid';
import { IMeteringLogShard, IMeteringRecordParams } from './captureMiddleware';
import { JouleMetrics } from './jouleMetrics';

// ---------------------------------------------------------------------------
// Named error codes (Req 10.3 — adversarial)
// ---------------------------------------------------------------------------

/** Thrown when `capture(opId, actual)` where `actual > max`. */
export class CaptureExceedsAuthError extends Error {
  public readonly code = 'CAPTURE_EXCEEDS_AUTH';
  constructor(opId: string, actual: bigint, max: bigint) {
    super(
      `Capture amount ${actual}µJ exceeds authorized ${max}µJ for opId '${opId}'.`,
    );
    this.name = 'CaptureExceedsAuthError';
  }
}

/** Thrown when an opId is not found in the active reservation map. */
export class ReservationOpNotFoundError extends Error {
  public readonly code = 'RESERVATION_NOT_FOUND';
  constructor(opId: string) {
    super(`No active reservation found for opId '${opId}'.`);
    this.name = 'ReservationOpNotFoundError';
  }
}

/** Thrown when the reservation has expired before capture/release. */
export class ReservationTimedOutError extends Error {
  public readonly code = 'RESERVATION_EXPIRED';
  constructor(opId: string, expiresAt: Date) {
    super(
      `Reservation for opId '${opId}' expired at ${expiresAt.toISOString()}.`,
    );
    this.name = 'ReservationTimedOutError';
  }
}

/** Thrown when a member has insufficient Joule balance to authorize. */
export class InsufficientJouleError extends Error {
  public readonly code = 'INSUFFICIENT_JOULE';
  public readonly httpStatus = 402;
  constructor(memberId: string, required: bigint, available: bigint) {
    super(
      `Member '${memberId}' has ${available}µJ available; ${required}µJ required.`,
    );
    this.name = 'InsufficientJouleError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for `DebitAuthorizationService`. */
export interface IDebitAuthorizationOptions {
  /**
   * How long (ms) a reservation lives before the reaper may release it.
   * @default 300_000 (5 minutes)
   */
  reservationTtlMs?: number;

  /** Metering-log shard used to record captured Resource_Events. */
  meteringLogShard?: IMeteringLogShard;
}

/** A record of an active reservation, keyed by `opId`. */
interface IActiveReservation {
  handle: IReservationHandle;
  memberId: Checksum;
  maxMicroJoules: bigint;
  opId: string;
  requestId?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Default TTL for reservations: 5 minutes. */
export const JOULE_RESERVATION_TTL_MS_DEFAULT = 300_000;

/**
 * Two-phase debit authorization for Joule credits.
 *
 * ### Usage
 *
 * ```ts
 * const auth = new DebitAuthorizationService(store, { meteringLogShard: shard });
 *
 * // Pre-handler: estimate and authorize.
 * const { opId } = await auth.authorize(memberId, estimatedMax);
 *
 * try {
 *   const result = await doWork();
 *   await auth.capture(opId, result.actualMicroJoules, requestId);
 * } catch {
 *   await auth.release(opId);
 * }
 * ```
 */
export class DebitAuthorizationService {
  private readonly reservationTtlMs: number;
  private readonly meteringLogShard: IMeteringLogShard | undefined;

  /** `opId → IActiveReservation` */
  private readonly active = new Map<string, IActiveReservation>();

  constructor(
    private readonly store: AssetAccountStore,
    opts: IDebitAuthorizationOptions = {},
  ) {
    this.reservationTtlMs =
      opts.reservationTtlMs ?? JOULE_RESERVATION_TTL_MS_DEFAULT;
    this.meteringLogShard = opts.meteringLogShard;
  }

  // -------------------------------------------------------------------------
  // authorize
  // -------------------------------------------------------------------------

  /**
   * Reserve up to `maxMicroJoules` against `memberId`'s Joule balance.
   *
   * @returns The `opId` to pass to `capture` or `release`.
   * @throws {InsufficientJouleError} when the balance is too low.
   *
   * @see joule-resource-credits spec, Requirement 3.1, 3.2
   */
  authorize(
    memberId: Checksum,
    maxMicroJoules: bigint,
    opId: string = uuidv4(),
  ): string {
    let handle: IReservationHandle;
    try {
      // Ensure the account exists before reserving. EnergyAccountStore.getOrCreate()
      // is async, but the synchronous path (account already in-memory) is the hot path.
      // For a missing account we create it synchronously with trial credits — the same
      // balance getOrCreate() would produce — so the behaviour is identical.
      if (!this.store.has(memberId)) {
        if (this.store instanceof EnergyAccountStore) {
          const account = EnergyAccount.createWithTrialCredits(memberId);
          // Use the async set() so the account is persisted to the backing collection.
          // We fire-and-forget the persistence; the in-memory state is updated
          // synchronously by the super.set() call inside EnergyAccountStore.set().
          void this.store.set(memberId, account);
        }
      }
      handle = this.store.reserve(
        memberId,
        JOULE_ASSET_ID,
        maxMicroJoules,
        this.reservationTtlMs,
      );
    } catch (err) {
      if (err instanceof InsufficientAvailableBalanceError) {
        const account = this.store.getForAsset(memberId, JOULE_ASSET_ID);
        const available =
          account !== undefined ? account.balance - account.reserved : 0n;
        JouleMetrics.getInstance().recordAuthorizeFailure('INSUFFICIENT_JOULE');
        throw new InsufficientJouleError(
          memberId.toHex(),
          maxMicroJoules,
          available,
        );
      }
      throw err;
    }

    this.active.set(opId, {
      handle,
      memberId,
      maxMicroJoules,
      opId,
    });

    return opId;
  }

  // -------------------------------------------------------------------------
  // capture
  // -------------------------------------------------------------------------

  /**
   * Settle `actualMicroJoules` against a prior authorization.
   *
   * - Deducts `actualMicroJoules` from the member's balance.
   * - Emits a Resource_Event to the metering-log shard (if configured).
   * - Removes the reservation from the active map.
   *
   * @throws {ReservationOpNotFoundError} if `opId` is unknown.
   * @throws {ReservationTimedOutError} if the reservation expired.
   * @throws {CaptureExceedsAuthError} if `actual > max`.
   *
   * @see joule-resource-credits spec, Requirement 3.3
   */
  async capture(
    opId: string,
    actualMicroJoules: bigint,
    memberId?: Uint8Array,
    requestId?: string,
  ): Promise<void> {
    const entry = this.active.get(opId);
    if (!entry) {
      throw new ReservationOpNotFoundError(opId);
    }

    if (entry.handle.expiresAt.getTime() <= Date.now()) {
      this.active.delete(opId);
      this.releaseHandleSilently(entry.handle);
      throw new ReservationTimedOutError(opId, entry.handle.expiresAt);
    }

    if (actualMicroJoules > entry.maxMicroJoules) {
      throw new CaptureExceedsAuthError(
        opId,
        actualMicroJoules,
        entry.maxMicroJoules,
      );
    }

    // Settle in Layer 1 — no ledger entry generated.
    try {
      this.store.settle(entry.handle, actualMicroJoules);
    } catch (err) {
      if (err instanceof ReservationNotFoundError) {
        this.active.delete(opId);
        throw new ReservationOpNotFoundError(opId);
      }
      if (err instanceof ReservationExpiredError) {
        this.active.delete(opId);
        throw new ReservationTimedOutError(opId, entry.handle.expiresAt);
      }
      throw err;
    }

    // Persist the updated account so the balance change survives restarts.
    // EnergyAccountStore.set() is async (writes through to DB); fire-and-forget
    // since the in-memory state is already correct and a failure here should
    // not block the caller.
    const updatedAccount = this.store.getForAsset(
      entry.memberId,
      JOULE_ASSET_ID,
    );
    if (updatedAccount) {
      void Promise.resolve(
        this.store.set(entry.memberId, updatedAccount),
      ).catch(() => {
        // Best-effort persistence — in-memory state is authoritative.
      });
    }

    this.active.delete(opId);
    // Record reservation age metric
    JouleMetrics.getInstance().recordReservationAge(
      Date.now() - entry.handle.createdAt.getTime(),
    );

    // Emit Resource_Event to metering-log shard (Req 3.3).
    if (this.meteringLogShard && actualMicroJoules > 0n) {
      const memberIdBytes =
        memberId ?? entry.memberId.toUint8Array?.() ?? new Uint8Array(32);
      const params: IMeteringRecordParams = {
        op: `joule.authorized.capture`,
        memberId: memberIdBytes,
        assetId: JOULE_ASSET_ID,
        amount: -actualMicroJoules, // debit
        opId: requestId ? `${requestId}:auth:${opId}` : `auth:${opId}`,
        contextHash: new Uint8Array(32),
      };
      // Best-effort — do not block on metering-log.
      this.meteringLogShard.appendRecord(params).catch(() => {
        // Intentional no-op: metering-log failure must not surface to caller.
        // Production code would queue to retry buffer; omitted here for clarity.
      });
    }
  }

  // -------------------------------------------------------------------------
  // release
  // -------------------------------------------------------------------------

  /**
   * Return the full reservation to the available balance with no spend
   * recorded.  No Resource_Event is emitted.
   *
   * @throws {ReservationOpNotFoundError} if `opId` is unknown.
   *
   * @see joule-resource-credits spec, Requirement 3.4
   */
  release(opId: string): void {
    const entry = this.active.get(opId);
    if (!entry) {
      throw new ReservationOpNotFoundError(opId);
    }
    this.active.delete(opId);
    try {
      this.store.release(entry.handle);
    } catch (err) {
      if (
        err instanceof ReservationNotFoundError ||
        err instanceof ReservationExpiredError
      ) {
        // Handle already gone (expired, double-release) — treat as success.
        return;
      }
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // activeReservations (informational)
  // -------------------------------------------------------------------------

  /** Returns all currently active reservations (for the reaper and tests). */
  getActiveReservations(): ReadonlyMap<string, Readonly<IActiveReservation>> {
    return this.active as ReadonlyMap<string, Readonly<IActiveReservation>>;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private releaseHandleSilently(handle: IReservationHandle): void {
    try {
      this.store.release(handle);
    } catch {
      // Already gone.
    }
  }
}
