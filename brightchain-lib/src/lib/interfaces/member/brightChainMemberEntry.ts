import {
  GuidV4Uint8Array,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';

/**
 * A single user entry for BrightChain member initialisation.
 * Contains only the fields the service needs — no Mongoose documents.
 * @template TID Platform-specific ID type (defaults to GuidV4Uint8Array)
 */
export interface IBrightChainMemberEntry<
  TID extends PlatformID = GuidV4Uint8Array,
> {
  /** Guid ID */
  id: TID;
  /** Member role */
  type: MemberType;
}
