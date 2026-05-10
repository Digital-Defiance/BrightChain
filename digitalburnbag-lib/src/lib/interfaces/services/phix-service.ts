import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  IPhixParams,
  IPhixPlan,
  IPhixResult,
} from '../params/phix-service-params';

/**
 * Service interface for Phix (Phoenix-cycle rename) operations.
 *
 * A Phix is a rename that honours the burnbag contract: nothing mutates
 * in place. For lightweight renames (metadata-only), the old name is
 * replaced atomically. For heavy renames that require data migration,
 * the system performs a full phoenix cycle: clone → verify → destroy.
 *
 * The two-phase API (plan → execute) gives the UI the data it needs
 * to render the [ Phix ] button's confirmation dialog, progress bar,
 * and completion animation.
 */
export interface IPhixService<TID extends PlatformID> {
  /**
   * Phase 1: Generate a Phix plan.
   *
   * Inspects the target item, counts affected children (for folders),
   * determines whether this is a metadata-only or full-cycle operation,
   * and returns a plan the UI can present to the user.
   *
   * Does NOT modify any data.
   */
  plan(params: IPhixParams<TID>): Promise<IPhixPlan<TID>>;

  /**
   * Phase 2: Execute a previously generated Phix plan.
   *
   * For MetadataOnly plans: updates the name field and audit log.
   * For FullCycle plans: clones data under new identity, verifies
   * integrity, destroys the original, and logs the full cycle.
   *
   * @param plan - The plan returned by `plan()`. Must not be stale.
   * @param requesterId - The user executing the phix.
   */
  execute(plan: IPhixPlan<TID>, requesterId: TID): Promise<IPhixResult<TID>>;
}
