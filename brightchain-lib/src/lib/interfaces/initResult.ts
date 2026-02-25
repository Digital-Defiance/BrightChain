import type { IBlockStore } from './storage/blockStore';

/**
 * Generic initialization result for any storage backend.
 * Used by both BrightChain and non-BrightChain stacks to produce
 * compatible initialization outputs.
 */
export interface IInitResult<TBackend = unknown> {
  success: boolean;
  error?: string;
  backend?: TBackend;
}

/**
 * BrightChain-specific initialization data returned by the
 * DatabaseInitFunction on success.
 *
 * Uses interface-level references only (IBlockStore) so that the
 * concrete MemberStore / EnergyAccountStore classes don't need to
 * be imported here — callers already know the types from the init
 * function's return signature.
 */
export interface IBrightChainInitData {
  blockStore: IBlockStore;
  /** The BrightChainDb instance (typed as unknown to avoid circular dep) */
  db: unknown;
  memberStore: unknown;
  energyStore: unknown;
}
