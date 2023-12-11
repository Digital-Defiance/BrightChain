/* eslint-disable @typescript-eslint/no-explicit-any */
import { HandleableError } from '@digitaldefiance/i18n-lib';
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
  sendResponse: (res: Response, statusCode: number, body: unknown) => void,
  _next: NextFunction,
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
  // Use a custom replacer to convert BigInt values to strings so
  // JSON.stringify does not throw "Do not know how to serialize a BigInt".
  const body = JSON.parse(
    JSON.stringify(data, (_key: string, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
  res.status(statusCode).json(body);
}
