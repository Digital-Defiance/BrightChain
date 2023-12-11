import type { BlockId } from '../branded/primitives/blockId';

export interface IGetBlockResponseData {
  data: string; // Base64 encoded buffer
  blockId: BlockId;
}
