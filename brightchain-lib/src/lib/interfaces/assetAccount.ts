import { Checksum } from '../types/checksum';

/**
 * Generalized per-(member, asset) account record.
 *
 * Introduced by the `asset-account-store-generalization` spec as the
 * asset-agnostic base shape. Every balance / earned / spent / reserved field
 * is `bigint` microunits to eliminate floating-point rounding from charge
 * and credit paths. For joule this is microjoules
 * (`JOULE_MICROUNITS_PER_UNIT = 1_000_000n`).
 *
 * Composite identity: `(memberId, assetId)`. No two records SHALL coexist
 * with the same composite key.
 *
 * This interface is additive: legacy `IEnergyAccount` (number-typed,
 * pre-refactor) continues to exist alongside it during the migration.
 *
 * @see asset-account-store-generalization spec, Requirements 2.1, 2.3, 1.1.
 */
export interface IAssetAccount {
  /** Member ID (checksum). */
  readonly memberId: Checksum;

  /** Canonical asset identifier. `'joule'` for joule. */
  readonly assetId: string;

  /** Current credits in microunits. */
  balance: bigint;

  /** Total microunits earned (providing resources). */
  earned: bigint;

  /** Total microunits spent (consuming resources). */
  spent: bigint;

  /** Microunits reserved for ongoing operations (operational tier only). */
  reserved: bigint;

  /** Reputation score, 0.0 to 1.0. Per-asset signal. */
  reputation: number;

  /** Account creation date. */
  readonly createdAt: Date;

  /** Last balance update. */
  lastUpdated: Date;
}

/**
 * Persisted DTO form of {@link IAssetAccount}.
 *
 * `bigint` microunit fields are serialized as decimal strings so that
 * MongoDB / JSON round-trip is lossless and free of scientific notation.
 *
 * Legacy DTOs persisted before this spec lacked `assetId` and stored
 * `balance` / `earned` / `spent` / `reserved` as `number`. The hydrator
 * SHALL default missing `assetId` to `'joule'` and SHALL multiply legacy
 * `number` balances by `JOULE_MICROUNITS_PER_UNIT`. The upgraded shape is
 * persisted on next write — no migration runs.
 *
 * @see asset-account-store-generalization spec, Requirements 1.5, 2.5, 2.6.
 */
export interface IAssetAccountDto {
  [key: string]: unknown;
  memberId: string;
  assetId: string;
  /** bigint microunits serialized as a decimal string. */
  balance: string;
  earned: string;
  spent: string;
  reserved: string;
  reputation: number;
  createdAt: string;
  lastUpdated: string;
}

/**
 * Handle returned by `AssetAccountStore.reserve()` and consumed by
 * `settle()` / `release()`. Represents a temporary hold against the
 * available balance of a specific (member, asset) account.
 *
 * Reservations are an **operational-tier** concern: they live in the
 * account store and never reach the asset ledger. The settlement tier
 * sees only the netted earn / spend that follows `settle()`.
 *
 * @see asset-account-store-generalization spec, Requirement 4.2.
 */
export interface IReservationHandle {
  /** Opaque reservation identifier (UUID-like). */
  readonly reservationId: string;

  /** Member that owns the reservation. */
  readonly memberId: Checksum;

  /** Asset the reservation holds against. */
  readonly assetId: string;

  /** Microunits held. */
  readonly amount: bigint;

  /** When the reservation was created. */
  readonly createdAt: Date;

  /** When the reservation expires and becomes eligible for lazy reap. */
  readonly expiresAt: Date;
}
