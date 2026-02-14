/**
 * @fileoverview Property-based test for BrightChainDb connection state machine.
 *
 * **Feature: mongo-compatible-document-store, Property 1: Connection state machine**
 *
 * For any BrightChainDb instance and any sequence of connect and disconnect
 * calls (with arbitrary URI strings including undefined), isConnected() SHALL
 * return true if the last lifecycle call was connect, and false if the last
 * lifecycle call was disconnect (or if no lifecycle call has been made).
 * No call in the sequence SHALL throw an error.
 *
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7**
 */

import fc from 'fast-check';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { BrightChainDb } from '../database';

// Property tests can be slow due to async operations
jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Arbitrary URI string or undefined, matching what connect() accepts */
const arbUri: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.string(),
  fc.constant(''),
  fc.constant('mongodb://localhost:27017'),
  fc.webUrl(),
);

/** A single lifecycle operation: connect with optional URI, or disconnect */
type LifecycleOp =
  | { type: 'connect'; uri: string | undefined }
  | { type: 'disconnect' };

const arbLifecycleOp: fc.Arbitrary<LifecycleOp> = fc.oneof(
  arbUri.map((uri) => ({ type: 'connect' as const, uri })),
  fc.constant({ type: 'disconnect' as const }),
);

/** A sequence of lifecycle operations (1 to 50 operations) */
const arbLifecycleSequence: fc.Arbitrary<LifecycleOp[]> = fc.array(
  arbLifecycleOp,
  { minLength: 1, maxLength: 50 },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function createDb(): BrightChainDb {
  const store = new MockBlockStore();
  // MockBlockStore is a test double that doesn't fully implement IBlockStore;
  // existing tests use `as any` for this (see enhancements.spec.ts).
  return new BrightChainDb(store as any, {
    name: 'test-connection-state',
  });
}

// ---------------------------------------------------------------------------
// Property 1: Connection state machine
// ---------------------------------------------------------------------------

describe('Feature: mongo-compatible-document-store, Property 1: Connection state machine', () => {
  /**
   * **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7**
   *
   * For any sequence of connect/disconnect operations:
   * - isConnected() returns false before any lifecycle call
   * - After each connect(), isConnected() returns true
   * - After each disconnect(), isConnected() returns false
   * - No operation throws an error (idempotent transitions)
   */
  it('isConnected() reflects the last lifecycle operation for any random sequence', async () => {
    await fc.assert(
      fc.asyncProperty(arbLifecycleSequence, async (ops) => {
        const db = createDb();

        // Before any lifecycle call, isConnected() should be false
        expect(db.isConnected()).toBe(false);

        let expectedConnected = false;

        for (const op of ops) {
          if (op.type === 'connect') {
            // connect should never throw
            await db.connect(op.uri);
            expectedConnected = true;
          } else {
            // disconnect should never throw
            await db.disconnect();
            expectedConnected = false;
          }

          // After each operation, isConnected() must match expected state
          expect(db.isConnected()).toBe(expectedConnected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('repeated connects do not throw and remain connected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbUri, { minLength: 2, maxLength: 20 }),
        async (uris) => {
          const db = createDb();

          for (const uri of uris) {
            await db.connect(uri);
            expect(db.isConnected()).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('repeated disconnects do not throw and remain disconnected', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (count) => {
        const db = createDb();

        for (let i = 0; i < count; i++) {
          await db.disconnect();
          expect(db.isConnected()).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
