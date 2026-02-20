/**
 * Result returned by BrightChainMemberInitService.initialize().
 *
 * NOTE: The `db` field is typed as a generic `TDb` (defaulting to `unknown`)
 * rather than importing `BrightChainDb` directly. This avoids a circular
 * dependency: brightchain-db depends on brightchain-lib, so brightchain-lib
 * must NOT import from brightchain-db. Callers in brightchain-api-lib (which
 * does depend on brightchain-db) can narrow the type by supplying the
 * concrete `BrightChainDb` type argument:
 *
 *   IBrightChainInitResult<BrightChainDb>
 */
export interface IBrightChainInitResult<TDb = unknown> {
  /** True when all candidate members were already present — no writes performed. */
  alreadyInitialized: boolean;
  /** Number of member index entries inserted in this call. */
  insertedCount: number;
  /** Number of candidate members skipped because they were already present. */
  skippedCount: number;
  /**
   * The initialised BrightChainDb instance.
   * Typed as TDb to avoid a circular dependency with brightchain-db.
   */
  db: TDb;
}
