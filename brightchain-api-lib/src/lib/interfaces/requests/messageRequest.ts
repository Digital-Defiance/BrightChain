import { Request } from 'express';
/**
 * Base interface for message API requests
 */
export interface MessageRequest extends Request {
  headers: Request['headers'] & {
    authorization?: string;
  };
}
