/**
 * @fileoverview Rate limiter middleware for the public BrightDate /now endpoint.
 *
 * Uses the existing SlidingWindowRateLimiter to enforce a per-IP request limit
 * (default: 60 requests per minute). Sets standard rate limit headers on all
 * responses and returns 429 when the limit is exceeded.
 *
 * This middleware is designed to be mounted in front of the BrightDateNowController
 * in the ApiRouter. When the full PoUW middleware is also mounted upstream, it
 * provides an additional challenge-response layer on top of this basic limiter.
 */

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { SlidingWindowRateLimiter } from '../pouw/rateLimiter';

/** Default: 60 requests per minute per client IP */
const DEFAULT_RATE_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Create a rate limiter middleware for the BrightDate public endpoint.
 *
 * @param limit - Maximum requests per window (default: 60)
 * @param windowMs - Window duration in milliseconds (default: 60000)
 * @returns Express middleware that enforces the rate limit
 */
export function createBrightDateRateLimiter(
  limit: number = DEFAULT_RATE_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): RequestHandler {
  const rateLimiter = new SlidingWindowRateLimiter(limit, windowMs);
  rateLimiter.startCleanup(windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const result = rateLimiter.checkRate(clientIp, '/brightdate/now');

    // Always set rate limit headers for transparency
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(result.resetMs / 1000)));
      res.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message:
          'Rate limit exceeded. Maximum ' +
          limit +
          ' requests per minute. ' +
          'Please retry after the Retry-After period.',
      });
      return;
    }

    next();
  };
}
