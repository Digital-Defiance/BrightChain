/**
 * @fileoverview Property-based tests for validateBody middleware
 *
 * // Feature: branded-dto-integration, Property 7: Validation middleware passes valid bodies
 * // Feature: branded-dto-integration, Property 8: Validation middleware rejects invalid bodies
 *
 * Property 7: For any valid request body, validateBody calls next() and attaches brandedBody.
 * Property 8: For any invalid request body, validateBody calls res.status(400) and does NOT call next().
 *
 * **Validates: Requirements 6.2, 6.3**
 */
import { describe, expect, it } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import fc from 'fast-check';

import { LoginRequestDef } from '@brightchain/brightchain-lib';
import { validateBody } from './validateBody';

jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Minimal Express mock helpers
// ---------------------------------------------------------------------------

type MockRequest = Partial<Request> & { body: unknown; brandedBody?: unknown };

function makeMockReq(body: unknown): MockRequest {
  return { body };
}

interface MockResponse {
  statusCode: number | undefined;
  jsonBody: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
}

function makeMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: undefined,
    jsonBody: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.jsonBody = body;
      return res;
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates valid LoginRequest bodies (non-empty username and password). */
const validLoginBodyArb = fc
  .record({
    username: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0),
    password: fc.string({ minLength: 1, maxLength: 100 }),
  })
  .map((r) => r as Record<string, unknown>);

/** Generates bodies that fail LoginRequest validation. */
const invalidLoginBodyArb = fc.oneof(
  // empty username
  fc
    .record({
      username: fc.constant(''),
      password: fc.string({ minLength: 1, maxLength: 100 }),
    })
    .map((r) => r as Record<string, unknown>),
  // empty password
  fc
    .record({
      username: fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0),
      password: fc.constant(''),
    })
    .map((r) => r as Record<string, unknown>),
  // missing username
  fc
    .record({ password: fc.string({ minLength: 1, maxLength: 100 }) })
    .map((r) => r as Record<string, unknown>),
  // missing password
  fc
    .record({
      username: fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0),
    })
    .map((r) => r as Record<string, unknown>),
  // wrong types
  fc
    .record({
      username: fc.integer(),
      password: fc.integer(),
    })
    .map((r) => r as Record<string, unknown>),
);

// ===========================================================================
// Property 7: Validation middleware passes valid bodies
// ===========================================================================

describe('Property 7: Validation middleware passes valid bodies', () => {
  it('For any valid LoginRequest body, next() is called and brandedBody is attached — **Validates: Requirements 6.2**', () => {
    fc.assert(
      fc.property(validLoginBodyArb, (body) => {
        const req = makeMockReq(body);
        const res = makeMockRes();
        let nextCalled = false;
        const next: NextFunction = () => {
          nextCalled = true;
        };

        validateBody(LoginRequestDef)(
          req as Request,
          res as unknown as Response,
          next,
        );

        expect(nextCalled).toBe(true);
        expect(req.brandedBody).toBeDefined();
        expect(res.statusCode).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Property 8: Validation middleware rejects invalid bodies
// ===========================================================================

describe('Property 8: Validation middleware rejects invalid bodies', () => {
  it('For any invalid LoginRequest body, res.status(400) is called and next() is NOT called — **Validates: Requirements 6.3**', () => {
    fc.assert(
      fc.property(invalidLoginBodyArb, (body) => {
        const req = makeMockReq(body);
        const res = makeMockRes();
        let nextCalled = false;
        const next: NextFunction = () => {
          nextCalled = true;
        };

        validateBody(LoginRequestDef)(
          req as Request,
          res as unknown as Response,
          next,
        );

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(400);
      }),
      { numRuns: 100 },
    );
  });
});
