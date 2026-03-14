import { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Stub init result interface for upstream Application compatibility.
 * BrightChain does not use mongoose init results, so this is a minimal type
 * that satisfies the upstream Application's TInitResults generic parameter.
 * @template TID - Platform ID type
 */
export interface IBrightChainInitResult<TID extends PlatformID> {
  /** Placeholder — BrightChain does not use Mongoose init results */
  readonly _brand?: 'BrightChainInitResult';
}
