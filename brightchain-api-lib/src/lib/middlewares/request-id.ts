import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Header name for the request ID
 */
export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Middleware to generate and attach a UUID v4 request ID to each request.
 * The request ID is:
 * - Generated using crypto.randomUUID() for each incoming request
 * - Attached to the request context via req.requestId
 * - Included in response headers as X-Request-ID
 *
 * This enables request tracing across logs and error responses.
 *
 * @requirements 9.5
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate a new UUID v4 for this request
  const requestId = randomUUID();

  // Attach to request context
  req.requestId = requestId;

  // Set response header so clients can correlate responses
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
