import { Request } from 'express';

/**
 * Sync request body
 */
export interface ISyncRequestBody extends Request {
  body: {
    blockIds: string[];
  };
}
