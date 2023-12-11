/**
 * Property-Based Tests for PoUW Middleware
 *
 * Feature: proof-of-useful-work-ratelimit, Property 18: Rate Limit Headers Presence
 *
 * For any HTTP response produced by the PoUW middleware, the response SHALL include
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers
 * with correct numeric values.
 *
 * **Validates: Requirements 8.6**
 */

import { NextFunction, Request, Response } from 'express';
import * as fc from 'fast-check';
import { createPoUWMiddleware, pouwEvents } from '../middleware';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    headers: {},
    path: '/api/test',
    route: undefined,
    body: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): {
  res: Response;
  getHeaders: () => Record<string, string | number>;
  getStatus: () => number;
  getBody: () => unknown;
} {
  const headers: Record<string, string | number> = {};
  let statusCode = 200;
  let body: unknown = null;

  const res = {
    setHeader: jest.fn((name: string, value: string | number) => {
      headers[name.toLowerCase()] = value;
    }),
    getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
    status: jest.fn(function (code: number) {
      statusCode = code;
      return res;
    }),
    json: jest.fn(function (data: unknown) {
      body = data;
      return res;
    }),
    end: jest.fn(),
  } as unknown as Response;

  return {
    res,
    getHeaders: () => headers,
    getStatus: () => statusCode,
    getBody: () => body,
  };
}

describe('PoUW Middleware Property Tests', () => {
  // Suppress noisy event listeners during tests
  beforeEach(() => {
    pouwEvents.removeAllListeners();
  });

  /**
   * Property 18: Rate Limit Headers Presence
   *
   * **Validates: Requirements 8.6**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 18: Rate Limit Headers Presence', () => {
    it('all responses include X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset with numeric values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }), // total number of requests to send
          fc.integer({ min: 1, max: 50 }), // rate limit
          fc.integer({ min: 1000, max: 120000 }), // windowMs
          (requestCount, rateLimit, windowMs) => {
            const middleware = createPoUWMiddleware({
              hmacSecret: 'test-secret-for-property-18',
              rateLimit,
              windowMs,
            });

            for (let i = 0; i < requestCount; i++) {
              const req = createMockReq({ ip: '10.0.0.1' });
              const { res, getHeaders } = createMockRes();
              const next: NextFunction = jest.fn();

              middleware(req, res, next);

              const headers = getHeaders();

              // All three rate limit headers must be present
              expect(headers).toHaveProperty('x-ratelimit-limit');
              expect(headers).toHaveProperty('x-ratelimit-remaining');
              expect(headers).toHaveProperty('x-ratelimit-reset');

              // All values must be numeric (non-negative integers)
              const limit = headers['x-ratelimit-limit'];
              const remaining = headers['x-ratelimit-remaining'];
              const reset = headers['x-ratelimit-reset'];

              expect(typeof limit).toBe('number');
              expect(typeof remaining).toBe('number');
              expect(typeof reset).toBe('number');

              expect(limit).toBeGreaterThanOrEqual(0);
              expect(remaining).toBeGreaterThanOrEqual(0);
              expect(reset).toBeGreaterThanOrEqual(0);

              // Limit header should match the configured rate limit
              expect(limit).toBe(rateLimit);

              // Remaining should never exceed the limit
              expect(remaining).toBeLessThanOrEqual(rateLimit);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rate limit headers are present on both allowed and rate-limited responses', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // rate limit (small to ensure we hit both allowed and denied)
          fc.integer({ min: 5000, max: 60000 }), // windowMs
          (rateLimit, windowMs) => {
            const middleware = createPoUWMiddleware({
              hmacSecret: 'test-secret-for-property-18-both',
              rateLimit,
              windowMs,
            });

            // Send rateLimit + 5 requests to guarantee both allowed and denied
            const totalRequests = rateLimit + 5;
            let sawAllowed = false;
            let sawDenied = false;

            for (let i = 0; i < totalRequests; i++) {
              const req = createMockReq({ ip: '10.0.0.2' });
              const { res, getHeaders, getStatus } = createMockRes();
              const next: NextFunction = jest.fn();

              middleware(req, res, next);

              const headers = getHeaders();
              const status = getStatus();

              // Headers must be present regardless of allowed/denied
              expect(headers).toHaveProperty('x-ratelimit-limit');
              expect(headers).toHaveProperty('x-ratelimit-remaining');
              expect(headers).toHaveProperty('x-ratelimit-reset');

              if ((next as jest.Mock).mock.calls.length > 0) {
                sawAllowed = true;
              }
              if (status === 429) {
                sawDenied = true;
              }
            }

            // We should have seen both allowed and denied responses
            expect(sawAllowed).toBe(true);
            expect(sawDenied).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('X-RateLimit-Remaining decreases monotonically for consecutive allowed requests', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 50 }), // rate limit (at least 2)
          fc.integer({ min: 5000, max: 60000 }), // windowMs
          (rateLimit, windowMs) => {
            const middleware = createPoUWMiddleware({
              hmacSecret: 'test-secret-for-property-18-monotonic',
              rateLimit,
              windowMs,
            });

            let previousRemaining = rateLimit;

            // Send exactly rateLimit requests (all should be allowed)
            for (let i = 0; i < rateLimit; i++) {
              const req = createMockReq({ ip: '10.0.0.3' });
              const { res, getHeaders } = createMockRes();
              const next: NextFunction = jest.fn();

              middleware(req, res, next);

              const headers = getHeaders();
              const remaining = headers['x-ratelimit-remaining'] as number;

              // Remaining should be strictly less than previous
              expect(remaining).toBeLessThan(previousRemaining);
              previousRemaining = remaining;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
