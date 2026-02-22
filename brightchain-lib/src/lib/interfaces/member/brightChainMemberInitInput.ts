import { GuidV4Uint8Array, PlatformID } from '@digitaldefiance/ecies-lib';
import { IBrightChainMemberEntry } from './brightChainMemberEntry';

/**
 * Native BrightChain input for BrightChainMemberInitService.initialize().
 * Replaces the Mongoose-world IServerInitResult.
 * @template TID Platform-specific ID type (defaults to GuidV4Uint8Array)
 */
export interface IBrightChainMemberInitInput<
  TID extends PlatformID = GuidV4Uint8Array,
> {
  systemUser: IBrightChainMemberEntry<TID>;
  adminUser: IBrightChainMemberEntry<TID>;
  memberUser: IBrightChainMemberEntry<TID>;
}
