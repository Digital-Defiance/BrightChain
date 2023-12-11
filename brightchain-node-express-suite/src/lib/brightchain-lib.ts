/**
 * Re-exports from @brightchain/brightchain-lib.
 * Only generic infrastructure symbols — NO domain-specific modules.
 */
export {
  BlockSize,
  BlockStoreType,
  validBlockSizes,
} from '@brightchain/brightchain-lib';

export type { IBlockStore, IInitResult } from '@brightchain/brightchain-lib';
