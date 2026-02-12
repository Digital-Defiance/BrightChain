/**
 * Get block data request params and query
 */
export interface IGetBlockDataRequest {
  params: {
    blockId: string;
  };
  query: {
    poolId?: string;
  };
}
