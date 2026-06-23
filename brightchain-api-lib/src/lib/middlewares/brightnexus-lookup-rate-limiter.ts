/**
 * @fileoverview Rate limiter for public BrightNexus BSLP lookup and discovery endpoints.
 */

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { SlidingWindowRateLimiter } from '../pouw/rateLimiter';

/** Default: 120 requests per minute per client IP */
const DEFAULT_RATE_LIMIT = 120;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Create a rate limiter for public geo registry reads.
 */
export function createBrightNexusLookupRateLimiter(
  limit: number = DEFAULT_RATE_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): RequestHandler {
  const rateLimiter = new SlidingWindowRateLimiter(limit, windowMs);
  rateLimiter.startCleanup(windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const result = rateLimiter.checkRate(
      clientIp,
      req.path || '/brightnexus/lookup',
    );

    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(result.resetMs / 1000)));
      res.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message:
          'BrightNexus lookup rate limit exceeded. Maximum ' +
          limit +
          ' requests per minute.',
      });
      return;
    }

    next();
  };
}
