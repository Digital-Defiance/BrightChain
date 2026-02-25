import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IBrightChainMemberInitInput } from './brightChainMemberInitInput';

/**
 * Base result returned by BrightChainMemberInitService.initialize().
 *
 * Contains only the common fields shared by both the base member-index
 * initialization and the full RBAC initialization. The full RBAC result
 * (IBrightChainInitResult) extends this with all flat credential fields.
 *
 * The `db` field is typed as a generic `TDb` (defaulting to `unknown`)
 * rather than importing `BrightChainDb` directly. This avoids a circular
 * dependency: brightchain-db depends on brightchain-lib, so brightchain-lib
 * must NOT import from brightchain-db.
 */
export interface IBrightChainBaseInitResult<
  TDb = unknown,
  TID extends PlatformID = PlatformID,
> {
  input: IBrightChainMemberInitInput<TID>;
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
