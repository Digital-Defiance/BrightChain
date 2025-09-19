import { HandleableError } from '@brightchain/brightchain-lib';
import { NextFunction, Response } from 'express';

/**
 * Find auth token from request headers
 */
export function findAuthToken(headers: any): string | null {
  const authHeader = headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Handle errors in API responses
 */
export function handleError(
  error: HandleableError | Error,
  res: Response,
  sendResponse: Function,
  next: NextFunction,
): void {
  if (error instanceof HandleableError) {
    sendResponse(res, error.statusCode || 500, { message: error.message });
  } else {
    sendResponse(res, 500, { message: 'Internal server error' });
  }
}

/**
 * Send API message response
 */
export function sendApiMessageResponse(
  res: Response,
  statusCode: number,
  data: any,
): void {
  res.status(statusCode).json(data);
}
