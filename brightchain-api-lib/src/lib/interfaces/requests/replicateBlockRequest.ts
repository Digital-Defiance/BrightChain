import { Request } from 'express';

/**
 * Replicate block request body
 */
export interface IReplicateBlockRequest extends Request {
  params: {
    blockId: string;
  };
  body: {
    targetNodeIds: string[];
  };
}
