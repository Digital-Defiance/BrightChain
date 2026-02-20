import { MemberType } from '@digitaldefiance/ecies-lib';

/**
 * A single user entry for BrightChain member initialisation.
 * Contains only the fields the service needs — no Mongoose documents.
 */
export interface IBrightChainMemberEntry {
  /** Stable string ID (e.g. ShortHexGuid) */
  id: string;
  /** Member role */
  type: MemberType;
}

/**
 * Native BrightChain input for BrightChainMemberInitService.initialize().
 * Replaces the Mongoose-world IServerInitResult.
 */
export interface IBrightChainMemberInitInput {
  systemUser: IBrightChainMemberEntry;
  adminUser: IBrightChainMemberEntry;
  memberUser: IBrightChainMemberEntry;
}
