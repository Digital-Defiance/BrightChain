/**
 * BrightDate-aware CryptoSessionStore factory for BrightChain.
 *
 * `CryptoSessionStore` from `@digitaldefiance/node-express-suite` uses an
 * injectable `nowMs` clock for session expiry. This module provides a factory
 * that wires it to BrightDate so the entire session lifecycle is driven by the
 * same monotonic clock as the rest of the Brightchain ecosystem.
 *
 * Usage:
 * ```typescript
 * import { createBrightDateCryptoSessionStore } from '@brightchain/brightchain-api-lib';
 *
 * const sessionStore = createBrightDateCryptoSessionStore({
 *   slidingTtlMs: 15 * 60 * 1000,   // 15 minutes
 *   absoluteTtlMs: 8 * 60 * 60 * 1000, // 8 hours
 * });
 * ```
 *
 * @module session/cryptoSessionStore
 */

import { toUnixMs } from '@brightchain/brightdate';
import { CryptoSessionStore } from '@digitaldefiance/node-express-suite';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { brightDateNow } from '@brightchain/brightchain-lib';

export type { CryptoSessionStore };

/**
 * Options for `createBrightDateCryptoSessionStore`.
 * Mirrors `CryptoSessionStoreOptions` but omits `nowMs` (provided automatically).
 */
export interface BrightDateCryptoSessionStoreOptions {
  /** Sliding TTL in milliseconds (default: 15 minutes) */
  slidingTtlMs?: number;
  /** Absolute TTL in milliseconds (default: 8 hours) */
  absoluteTtlMs?: number;
  /** Sweep interval in milliseconds (default: 60 seconds) */
  sweepIntervalMs?: number;
  /** Maximum concurrent sessions per user (default: 10) */
  maxSessionsPerUser?: number;
}

/**
 * Create a `CryptoSessionStore` whose internal clock is driven by BrightDate.
 *
 * The store works internally in Unix milliseconds (sliding/absolute TTLs are
 * ms-based). `toUnixMs(brightDateNow())` is the correct bridge — it converts
 * the current BrightDateValue to Unix milliseconds without changing the store's
 * internal arithmetic.
 *
 * @param options - Session store options (TTLs, sweep interval, max sessions)
 * @returns A `CryptoSessionStore<TID>` instance clocked by BrightDate
 */
export function createBrightDateCryptoSessionStore<
  TID extends PlatformID = Buffer,
>(
  options: BrightDateCryptoSessionStoreOptions = {},
): CryptoSessionStore<TID> {
  return new CryptoSessionStore<TID>({
    ...options,
    // Bridge: BrightDateValue → Unix milliseconds
    // CryptoSessionStore compares nowMs() against absoluteExpiresAt/expiresAt
    // which are also in Unix ms, so the unit is consistent.
    nowMs: () => toUnixMs(brightDateNow()),
  });
}
