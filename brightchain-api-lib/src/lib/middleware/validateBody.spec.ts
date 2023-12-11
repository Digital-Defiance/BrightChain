/**
 * Unit tests for validateBody middleware edge cases.
 * Requirements: 6.5
 */
import { describe, expect, it } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';

import { LoginRequestDef } from '@brightchain/brightchain-lib';
import { validateBody } from './validateBody';

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

function makeNext(): { fn: NextFunction; called: boolean } {
  const tracker = { fn: (() => undefined) as NextFunction, called: false };
  tracker.fn = () => {
    tracker.called = true;
  };
  return tracker;
}

// ---------------------------------------------------------------------------
// Edge case tests — Requirement 6.5
// ---------------------------------------------------------------------------

describe('validateBody middleware edge cases (Requirement 6.5)', () => {
  it('returns HTTP 400 when body is null', () => {
    const req = makeMockReq(null);
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
    expect((res.jsonBody as Record<string, unknown>)['error']).toMatch(
      /missing or not an object/i,
    );
  });

  it('returns HTTP 400 when body is undefined', () => {
    const req = makeMockReq(undefined);
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
  });

  it('returns HTTP 400 when body is an array', () => {
    const req = makeMockReq([{ username: 'alice', password: 'secret' }]);
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
    expect((res.jsonBody as Record<string, unknown>)['error']).toMatch(
      /missing or not an object/i,
    );
  });

  it('returns HTTP 400 when body is a string', () => {
    const req = makeMockReq('{"username":"alice","password":"secret"}');
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
    expect((res.jsonBody as Record<string, unknown>)['error']).toMatch(
      /missing or not an object/i,
    );
  });

  it('returns HTTP 400 when body is a number', () => {
    const req = makeMockReq(42);
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
  });

  it('attaches brandedBody and calls next() for a valid body', () => {
    const req = makeMockReq({ username: 'alice', password: 'hunter2' });
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(next.called).toBe(true);
    expect(req.brandedBody).toBeDefined();
    expect(res.statusCode).toBeUndefined();
  });

  it('returns HTTP 400 with fieldErrors when body fails schema validation', () => {
    const req = makeMockReq({ username: '', password: 'hunter2' });
    const res = makeMockRes();
    const next = makeNext();

    validateBody(LoginRequestDef)(
      req as Request,
      res as unknown as Response,
      next.fn,
    );

    expect(res.statusCode).toBe(400);
    expect(next.called).toBe(false);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body['error']).toBeDefined();
  });
});
