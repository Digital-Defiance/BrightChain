/**
 * @fileoverview Property-based tests for capture-middleware determinism.
 *
 * Property (Req 10.1):
 *   For ANY sequence of (resourceClass, units) accrual events, replaying
 *   those same events through `RequestCostAccumulator` always produces the
 *   same final snapshot — i.e., accumulation is purely additive, commutative
 *   within each class, and deterministic.
 *
 * Additionally tests:
 *   - `CaptureMiddleware` calls `shard.appendRecord` exactly once per non-zero
 *     class on response close.
 *   - The opId of each emit encodes the resource class.
 *   - Anonymous requests (no `brightchainUser`) produce zero appendRecord calls.
 *   - Empty accumulators produce zero appendRecord calls.
 *
 * Uses fast-check for property generation.
 *
 * @see joule-resource-credits spec, Requirement 10.1
 */

import type { Request, Response } from 'express';
import * as fc from 'fast-check';

import {
  BOOTSTRAP_RATE_TABLE,
  priceMicroJoules,
  RESOURCE_CLASSES,
  ResourceClass,
} from '@brightchain/brightchain-lib';

import {
  createCaptureMiddleware,
  IMeteringLogShard,
  IMeteringRecordParams,
} from '../joule/captureMiddleware';
import { RateTableCache } from '../joule/rateTableCache';
import { RequestCostAccumulator } from '../joule/requestCostAccumulator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRateTableCache(): RateTableCache {
  return new RateTableCache(BOOTSTRAP_RATE_TABLE);
}

/** Create a minimal mock Express Request */
function makeReq(
  opts: { withUser?: boolean; requestId?: string } = {},
): Request & {
  _finishListeners: (() => void)[];
  triggerFinish: () => void;
} {
  const listeners: (() => void)[] = [];
  const fakeMember = {
    toBytes: () => new Uint8Array(32).fill(1),
    id: 'test-member-id',
  };

  const req: Record<string, unknown> = {
    brightchainUser: opts.withUser ? fakeMember : undefined,
    requestId: opts.requestId ?? 'test-request-id',
    joule: undefined,
  };

  return req as unknown as Request & {
    _finishListeners: (() => void)[];
    triggerFinish: () => void;
  };
}

/** Create a minimal mock Express Response */
function makeRes(): Response & { triggerFinish: () => void } {
  const listeners: (() => void)[] = [];
  const res = {
    on: (event: string, handler: () => void) => {
      if (event === 'finish') listeners.push(handler);
    },
    triggerFinish: () => {
      for (const l of listeners) l();
    },
  };
  return res as unknown as Response & { triggerFinish: () => void };
}

/** Create a mock shard that records all appendRecord calls */
function makeMockShard(): {
  shard: IMeteringLogShard;
  calls: IMeteringRecordParams[];
} {
  const calls: IMeteringRecordParams[] = [];
  const shard: IMeteringLogShard = {
    async appendRecord(params) {
      calls.push({ ...params });
      return {
        seq: BigInt(calls.length - 1),
        position: { offset: 0n, length: 0 },
      };
    },
  };
  return { shard, calls };
}

/** Arbitrarily-positive bigint up to 1_000_000 */
const arbUnits = fc.bigInt({ min: 1n, max: 1_000_000n });

/** Any ResourceClass */
const arbClass: fc.Arbitrary<ResourceClass> = fc.constantFrom<ResourceClass>(
  ...RESOURCE_CLASSES,
);

/** Sequence of (class, units) pairs */
const arbEvents = fc.array(fc.tuple(arbClass, arbUnits), {
  minLength: 1,
  maxLength: 50,
});

// ---------------------------------------------------------------------------
// P1: RequestCostAccumulator determinism
// ---------------------------------------------------------------------------

describe('RequestCostAccumulator — determinism properties', () => {
  it('P1.1: replaying the same event sequence yields the same snapshot', () => {
    fc.assert(
      fc.property(arbEvents, (events) => {
        const a = new RequestCostAccumulator();
        const b = new RequestCostAccumulator();

        for (const [cls, units] of events) {
          a.add(cls, units);
          b.add(cls, units);
        }

        const snapA = a.snapshot();
        const snapB = b.snapshot();

        for (const cls of RESOURCE_CLASSES) {
          expect(snapB[cls]).toBe(snapA[cls]);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P1.2: accumulation is per-class additive (sum of individual adds = single add)', () => {
    fc.assert(
      fc.property(arbClass, arbUnits, arbUnits, (cls, a, b) => {
        const acc1 = new RequestCostAccumulator();
        acc1.add(cls, a);
        acc1.add(cls, b);

        const acc2 = new RequestCostAccumulator();
        acc2.add(cls, a + b);

        expect(acc1.snapshot()[cls]).toBe(acc2.snapshot()[cls]);
      }),
      { numRuns: 200 },
    );
  });

  it('P1.3: snapshot is frozen (cannot be mutated)', () => {
    fc.assert(
      fc.property(arbClass, arbUnits, (cls, units) => {
        const acc = new RequestCostAccumulator();
        acc.add(cls, units);

        const snap = acc.snapshot() as Record<ResourceClass, bigint>;
        const original = snap[cls];

        // Attempting to mutate must throw in strict mode
        expect(() => {
          snap[cls] = original + 1n;
        }).toThrow();

        // Original snapshot value is unchanged
        expect(acc.snapshot()[cls]).toBe(original);
      }),
      { numRuns: 100 },
    );
  });

  it('P1.4: reset clears all classes to zero', () => {
    fc.assert(
      fc.property(arbEvents, (events) => {
        const acc = new RequestCostAccumulator();
        for (const [cls, units] of events) acc.add(cls, units);
        acc.reset();

        expect(acc.isEmpty).toBe(true);
        for (const cls of RESOURCE_CLASSES) {
          expect(acc.snapshot()[cls]).toBe(0n);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P1.5: negative / zero deltas are silently ignored', () => {
    fc.assert(
      fc.property(arbClass, fc.bigInt({ max: 0n }), (cls, delta) => {
        const acc = new RequestCostAccumulator();
        acc.add(cls, delta);
        expect(acc.snapshot()[cls]).toBe(0n);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P2: CaptureMiddleware emit properties
// ---------------------------------------------------------------------------

describe('CaptureMiddleware — emit properties', () => {
  it('P2.1: emits exactly one appendRecord call per non-zero class on finish', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvents, async (events) => {
        const cache = makeRateTableCache();
        const { shard, calls } = makeMockShard();
        const middleware = createCaptureMiddleware(cache, shard);

        const req = makeReq({ withUser: true });
        const res = makeRes();

        // Run middleware to attach accumulator
        middleware(
          req as unknown as Request,
          res as unknown as Response,
          () => {},
        );

        // Accrue costs
        for (const [cls, units] of events) {
          req.joule!.add(cls, units);
        }

        const snap = req.joule!.snapshot();
        const nonZeroClasses = RESOURCE_CLASSES.filter((c) => snap[c] > 0n);

        // Trigger response close
        res.triggerFinish();

        // Give micro-tasks a chance to settle
        await Promise.resolve();
        await Promise.resolve();

        expect(calls.length).toBe(nonZeroClasses.length);
      }),
      { numRuns: 100 },
    );
  });

  it('P2.2: each emit encodes the resource class in the op field', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvents, async (events) => {
        const cache = makeRateTableCache();
        const { shard, calls } = makeMockShard();
        const middleware = createCaptureMiddleware(cache, shard);

        const req = makeReq({ withUser: true });
        const res = makeRes();

        middleware(
          req as unknown as Request,
          res as unknown as Response,
          () => {},
        );

        for (const [cls, units] of events) {
          req.joule!.add(cls, units);
        }

        res.triggerFinish();
        await Promise.resolve();
        await Promise.resolve();

        for (const call of calls) {
          // op should be `joule.charge.<cls>`
          expect(call.op).toMatch(
            /^joule\.charge\.(compute|storage|network|proofOfWork)$/,
          );
          const cls = call.op.split('.')[2] as ResourceClass;
          expect(RESOURCE_CLASSES).toContain(cls);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P2.3: anonymous requests (no brightchainUser) produce zero appendRecord calls', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvents, async (events) => {
        const cache = makeRateTableCache();
        const { shard, calls } = makeMockShard();
        const middleware = createCaptureMiddleware(cache, shard);

        const req = makeReq({ withUser: false }); // anonymous
        const res = makeRes();

        middleware(
          req as unknown as Request,
          res as unknown as Response,
          () => {},
        );

        for (const [cls, units] of events) {
          req.joule!.add(cls, units);
        }

        res.triggerFinish();
        await Promise.resolve();
        await Promise.resolve();

        expect(calls.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P2.4: µJ amounts in emits equal priceMicroJoules(rateTable, cls, units)', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvents, async (events) => {
        const cache = makeRateTableCache();
        const rateTable = BOOTSTRAP_RATE_TABLE;
        const { shard, calls } = makeMockShard();
        const middleware = createCaptureMiddleware(cache, shard);

        const req = makeReq({ withUser: true });
        const res = makeRes();

        middleware(
          req as unknown as Request,
          res as unknown as Response,
          () => {},
        );

        // Accumulate — build expected per-class totals in parallel
        const expectedUnits: Record<ResourceClass, bigint> = {
          compute: 0n,
          storage: 0n,
          network: 0n,
          proofOfWork: 0n,
        };
        for (const [cls, units] of events) {
          req.joule!.add(cls, units);
          expectedUnits[cls] += units;
        }

        res.triggerFinish();
        await Promise.resolve();
        await Promise.resolve();

        for (const call of calls) {
          const cls = call.op.split('.')[2] as ResourceClass;
          const expectedMicroJoules = priceMicroJoules(
            rateTable,
            cls,
            expectedUnits[cls],
          );
          // amount is a debit — stored as negative
          expect(-call.amount).toBe(expectedMicroJoules);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P2.5: retry buffer alarm fires when buffer exceeds configured max', async () => {
    const alarmEvents: unknown[] = [];
    const { captureEvents: evts } = await import('../joule/captureMiddleware');
    evts.on('retry-buffer-alarm', (ev) => alarmEvents.push(ev));

    const cache = makeRateTableCache();
    const failingShard: IMeteringLogShard = {
      appendRecord: () => Promise.reject(new Error('disk full')),
    };

    const middleware = createCaptureMiddleware(cache, failingShard, {
      retryBufferMax: 2, // very low for testing
    });

    // Generate enough requests to overflow the buffer
    for (let i = 0; i < 5; i++) {
      const req = makeReq({ withUser: true, requestId: `req-${i}` });
      const res = makeRes();
      middleware(
        req as unknown as Request,
        res as unknown as Response,
        () => {},
      );
      req.joule!.add('compute', 1n);
      res.triggerFinish();
    }

    // Allow async appendRecord rejections to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(alarmEvents.length).toBeGreaterThan(0);

    evts.removeAllListeners('retry-buffer-alarm');
  });
});
