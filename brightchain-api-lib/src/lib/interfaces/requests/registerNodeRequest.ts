import { Request } from 'express';

/**
 * Register node request body
 */
export interface IRegisterNodeRequest extends Request {
  body: {
    nodeId: string;
    publicKey: string;
  };
}
