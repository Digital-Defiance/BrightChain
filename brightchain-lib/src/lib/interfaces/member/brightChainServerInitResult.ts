import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IBrightChainInitResult } from './brightChainInitResult';
import { IBrightChainUserCredentials } from './brightChainUserCredentials';

/**
 * Extended init result with grouped per-user credentials.
 * Extends IBrightChainInitResult (which has all flat fields) with
 * convenience grouped bundles for system/admin/member.
 *
 * Built by BrightChainMemberInitService.buildServerInitResult().
 */
export interface IBrightChainServerInitResult<
  TID extends PlatformID,
  TDb = unknown,
> extends IBrightChainInitResult<TID, TDb> {
  system: IBrightChainUserCredentials<TID>;
  admin: IBrightChainUserCredentials<TID>;
  member: IBrightChainUserCredentials<TID>;
}
