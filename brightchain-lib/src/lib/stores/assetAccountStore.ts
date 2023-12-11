import { AssetAccount } from '../asset/assetAccount';
import { JOULE_ASSET_ID } from '../asset/jouleConstants';
import { InsufficientAvailableBalanceError } from '../errors/asset/insufficientAvailableBalanceError';
import { LedgerAlreadyAttachedError } from '../errors/asset/ledgerAlreadyAttachedError';
import { MixedAssetError } from '../errors/asset/mixedAssetError';
import { ReservationExpiredError } from '../errors/asset/reservationExpiredError';
import { ReservationNotFoundError } from '../errors/asset/reservationNotFoundError';
import { IAssetAccount, IReservationHandle } from '../interfaces/assetAccount';
import { Checksum } from '../types/checksum';

/**
 * Documentation marker describing the consistency contract of the
 * operational tier. The store is an **operational projection cache**;
 * once Layer 3 (asset ledger) attaches, this cache MAY lag the
 * authoritative ledger by up to one batch window.
 *
 * @see asset-account-store-generalization spec, Requirement 5.1.
 */
export type OperationalSemantics =
  'operational projection cache; may lag the asset ledger by up to one batch window once Layer 3 is enabled.';

/**
 * Forward-declared write surface that Layer 3 will fulfill. Defined here
 * as a minimal placeholder so {@link AssetAccountStore.attachLedger} can
 * accept an instance without taking a runtime dependency on the ledger
 * implementation.
 *
 * @see asset-account-store-generalization spec, Requirement 5.3.
 */
export interface ILedgerWriter {
  /** Returns the timestamp of the most recently settled batch for an asset. */
  getLastSettledAt(assetId: string): Date | null;
}

/**
 * Asset-agnostic, in-memory account store keyed by `(memberId, assetId)`.
 *
 * The legacy {@link EnergyAccountStore} is preserved untouched during the
 * additive refactor. A future phase will fold it onto this base via
 * subclassing with `defaultAssetId = 'joule'`.
 *
 * @see asset-account-store-generalization spec, Phase 4.
 */
export class AssetAccountStore {
  /**
   * Eventual-consistency contract for this tier. Surfaced as a runtime
   * value so call sites can assert / log it.
   */
  public readonly operationalSemantics: OperationalSemantics =
    'operational projection cache; may lag the asset ledger by up to one batch window once Layer 3 is enabled.';

  protected readonly accounts: Map<string, IAssetAccount> = new Map();
  protected readonly reservations: Map<string, IReservationHandle> = new Map();
  protected ledger: ILedgerWriter | null = null;

  constructor(public readonly defaultAssetId: string = JOULE_ASSET_ID) {
    if (typeof defaultAssetId !== 'string' || defaultAssetId.length === 0) {
      throw new Error('defaultAssetId must be a non-empty string');
    }
  }

  // ---------------------------------------------------------------------
  // Keying
  // ---------------------------------------------------------------------

  protected static key(memberId: Checksum, assetId: string): string {
    return `${memberId.toHex()}::${assetId}`;
  }

  // ---------------------------------------------------------------------
  // Single-arity convenience methods (use defaultAssetId)
  // ---------------------------------------------------------------------

  get(memberId: Checksum): IAssetAccount | undefined {
    return this.getForAsset(memberId, this.defaultAssetId);
  }

  set(memberId: Checksum, account: IAssetAccount): void | Promise<void> {
    this.setForAsset(memberId, account.assetId, account);
  }

  has(memberId: Checksum): boolean {
    return this.hasForAsset(memberId, this.defaultAssetId);
  }

  delete(memberId: Checksum): boolean {
    return this.deleteForAsset(memberId, this.defaultAssetId);
  }

  // ---------------------------------------------------------------------
  // Two-arity composite-key methods
  // ---------------------------------------------------------------------

  getForAsset(memberId: Checksum, assetId: string): IAssetAccount | undefined {
    return this.accounts.get(AssetAccountStore.key(memberId, assetId));
  }

  setForAsset(
    memberId: Checksum,
    assetId: string,
    account: IAssetAccount,
  ): void {
    if (account.assetId !== assetId) {
      throw new MixedAssetError(
        [account.assetId, assetId],
        `Account assetId '${account.assetId}' does not match key assetId '${assetId}'.`,
      );
    }
    if (memberId.toHex() !== account.memberId.toHex()) {
      throw new Error('Account memberId does not match key memberId.');
    }
    this.accounts.set(AssetAccountStore.key(memberId, assetId), account);
  }

  hasForAsset(memberId: Checksum, assetId: string): boolean {
    return this.accounts.has(AssetAccountStore.key(memberId, assetId));
  }

  deleteForAsset(memberId: Checksum, assetId: string): boolean {
    return this.accounts.delete(AssetAccountStore.key(memberId, assetId));
  }

  getAllForAsset(assetId: string): IAssetAccount[] {
    const out: IAssetAccount[] = [];
    for (const account of this.accounts.values()) {
      if (account.assetId === assetId) out.push(account);
    }
    return out;
  }

  getAllAccounts(): IAssetAccount[] {
    return Array.from(this.accounts.values());
  }

  get size(): number {
    return this.accounts.size;
  }

  clear(): void {
    this.accounts.clear();
    this.reservations.clear();
  }

  // ---------------------------------------------------------------------
  // Reservations
  // ---------------------------------------------------------------------

  /**
   * Reserve `amount` microunits against the available balance of
   * `(memberId, assetId)`. The reservation expires after `ttlMs` ms; an
   * expired reservation is reaped lazily on next read or settlement
   * attempt.
   */
  reserve(
    memberId: Checksum,
    assetId: string,
    amount: bigint,
    ttlMs: number,
  ): IReservationHandle {
    this.reapExpiredFor(memberId, assetId);

    const account = this.getForAsset(memberId, assetId);
    if (!account) {
      throw new ReservationNotFoundError(
        AssetAccountStore.key(memberId, assetId),
        `No account exists for member '${memberId.toHex()}' under asset '${assetId}'.`,
      );
    }

    if (account instanceof AssetAccount) {
      account.reserve(amount); // throws InsufficientAvailableBalanceError on overdraw
    } else {
      // Plain IAssetAccount — replicate the bigint logic inline.
      const available =
        account.balance - account.reserved > 0n
          ? account.balance - account.reserved
          : 0n;
      if (typeof amount !== 'bigint' || amount < 0n) {
        throw new Error('amount must be a non-negative bigint');
      }
      if (amount > available) {
        throw new InsufficientAvailableBalanceError(assetId, amount, available);
      }
      account.reserved += amount;
      account.lastUpdated = new Date();
    }

    const now = Date.now();
    const handle: IReservationHandle = {
      reservationId: globalThis.crypto.randomUUID(),
      memberId,
      assetId,
      amount,
      createdAt: new Date(now),
      expiresAt: new Date(now + ttlMs),
    };
    this.reservations.set(handle.reservationId, handle);
    return handle;
  }

  /**
   * Settle `actualAmount` of a reservation: deduct from `balance`,
   * increment `spent`, and return any remainder to the available balance.
   * No ledger entry is emitted here — that is a Layer-2 concern.
   */
  settle(handle: IReservationHandle, actualAmount: bigint): void {
    const live = this.reservations.get(handle.reservationId);
    if (!live) {
      throw new ReservationNotFoundError(handle.reservationId);
    }
    if (live.expiresAt.getTime() <= Date.now()) {
      this.reservations.delete(live.reservationId);
      this.releaseHold(live);
      throw new ReservationExpiredError(live.reservationId, live.expiresAt);
    }
    if (typeof actualAmount !== 'bigint' || actualAmount < 0n) {
      throw new Error('actualAmount must be a non-negative bigint');
    }
    if (actualAmount > live.amount) {
      throw new Error(
        `Settlement amount ${actualAmount} exceeds reserved ${live.amount}.`,
      );
    }

    const account = this.getForAsset(live.memberId, live.assetId);
    if (!account) {
      this.reservations.delete(live.reservationId);
      throw new ReservationNotFoundError(
        live.reservationId,
        'Account vanished between reserve and settle.',
      );
    }

    // Move actualAmount from reserved → spent (deducted from balance).
    account.reserved -= live.amount; // release the full hold
    account.balance -= actualAmount;
    account.spent += actualAmount;
    account.lastUpdated = new Date();

    this.reservations.delete(live.reservationId);
  }

  /**
   * Release the full reservation back to the available balance with no
   * spend recorded.
   */
  release(handle: IReservationHandle): void {
    const live = this.reservations.get(handle.reservationId);
    if (!live) {
      throw new ReservationNotFoundError(handle.reservationId);
    }
    this.releaseHold(live);
    this.reservations.delete(live.reservationId);
  }

  protected releaseHold(handle: IReservationHandle): void {
    const account = this.getForAsset(handle.memberId, handle.assetId);
    if (!account) return;
    account.reserved =
      account.reserved > handle.amount ? account.reserved - handle.amount : 0n;
    account.lastUpdated = new Date();
  }

  /**
   * Reap any expired reservations belonging to `(memberId, assetId)`.
   * Idempotent — re-running produces identical state.
   */
  protected reapExpiredFor(memberId: Checksum, assetId: string): void {
    const now = Date.now();
    for (const [id, h] of this.reservations) {
      if (
        h.memberId.toHex() === memberId.toHex() &&
        h.assetId === assetId &&
        h.expiresAt.getTime() <= now
      ) {
        this.releaseHold(h);
        this.reservations.delete(id);
      }
    }
  }

  /** Reap every expired reservation in the store. */
  reapAllExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [id, h] of this.reservations) {
      if (h.expiresAt.getTime() <= now) {
        this.releaseHold(h);
        this.reservations.delete(id);
        count++;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------
  // Aggregate helpers
  // ---------------------------------------------------------------------

  /**
   * Sum the `balance` field across `accounts`. Throws
   * {@link MixedAssetError} if the input contains more than one
   * `assetId`.
   */
  static sumBalances(accounts: readonly IAssetAccount[]): bigint {
    if (accounts.length === 0) return 0n;
    const ids = new Set<string>();
    let total = 0n;
    for (const a of accounts) {
      ids.add(a.assetId);
      if (ids.size > 1) {
        throw new MixedAssetError(Array.from(ids));
      }
      total += a.balance;
    }
    return total;
  }

  sumBalances(accounts: readonly IAssetAccount[]): bigint {
    return AssetAccountStore.sumBalances(accounts);
  }

  // ---------------------------------------------------------------------
  // Ledger attachment (Layer 3 hook)
  // ---------------------------------------------------------------------

  /**
   * One-shot setter wiring this operational store to a Layer-3 ledger
   * writer. Throws {@link LedgerAlreadyAttachedError} on second call so
   * the system-of-record never silently switches mid-lifetime.
   */
  attachLedger(writer: ILedgerWriter): void {
    if (this.ledger !== null) {
      throw new LedgerAlreadyAttachedError();
    }
    this.ledger = writer;
  }

  /**
   * Returns the timestamp of the most recently settled batch for the
   * supplied asset, or `null` if no ledger is attached. Never throws.
   */
  getLastSettledAt(assetId: string): Date | null {
    if (this.ledger === null) return null;
    try {
      return this.ledger.getLastSettledAt(assetId);
    } catch {
      return null;
    }
  }
}
