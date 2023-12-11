import { GuidV4Uint8Array, PlatformID } from '@digitaldefiance/ecies-lib';
import { IBrightChainUserInitEntry } from './brightChainUserInitEntry';

/**
 * Extended init input carrying full RBAC data for all three users.
 * Used by BrightChainMemberInitService.initializeWithRbac().
 * @template TID Platform-specific ID type (defaults to GuidV4Uint8Array)
 */
export interface IBrightChainRbacInitInput<
  TID extends PlatformID = GuidV4Uint8Array,
> {
  systemUser: IBrightChainUserInitEntry<TID>;
  adminUser: IBrightChainUserInitEntry<TID>;
  memberUser: IBrightChainUserInitEntry<TID>;
}
