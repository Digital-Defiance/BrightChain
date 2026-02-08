import { Request } from 'express';

/**
 * Discover block request body
 */
export interface IDiscoverBlockRequest extends Request {
  body: {
    blockId: string;
  };
}
