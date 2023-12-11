/**
 * @fileoverview Property-based tests for `DebitAuthorizationService`
 * authorization conservation.
 *
 * ## Properties under test (Req 10.2, 10.3)
 *
 * P3.1  After a successful `capture(opId, actual)`:
 *         balance_post = balance_pre - actual
 *
 * P3.2  After a successful `release(opId)`:
 *         balance_post = balance_pre  (no deduction)
 *
 * P3.3  A double-capture (same `opId` twice) is rejected with
 *         `ReservationOpNotFoundError` on the second call.
 *
 * P3.4  A capture where `actual > max` is rejected with
 *         `CaptureExceedsAuthError`.
 *
 * P3.5  A capture after `release` is rejected with
 *         `ReservationOpNotFoundError`.
 *
 * P3.6  Authorize / release cycles do NOT advance any ledger sequence —
 *         the attached `ILedgerWriter.getLastSettledAt` is never called
 *         during operational-only reserve/release paths.
 *
 * @see joule-resource-credits spec, Requirements 3.1 – 3.7, 10.2, 10.3
 */

import * as fc from 'fast-check';

import {
  AssetAccount,
  AssetAccountStore,
  Checksum,
  ILedgerWriter,
  JOULE_ASSET_ID,
} from '@brightchain/brightchain-lib';

import {
  CaptureExceedsAuthError,
  DebitAuthorizationService,
  InsufficientJouleError,
  ReservationOpNotFoundError,
} from '../joule/debitAuthorization';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEX_MEMBER = 'a'.repeat(128); // 64-byte Checksum (SHA3-512)

function makeMember(): Checksum {
  return Checksum.fromHex(HEX_MEMBER);
}

function makeStore(initialBalance: bigint): AssetAccountStore {
  const store = new AssetAccountStore();
  const member = makeMember();
  const account = new AssetAccount(
    member,
    JOULE_ASSET_ID,
    new Date(0),
    initialBalance,
  );
  store.setForAsset(member, JOULE_ASSET_ID, account);
  return store;
}

function getBalance(store: AssetAccountStore): bigint {
  const acc = store.getForAsset(makeMember(), JOULE_ASSET_ID);
  return acc?.balance ?? 0n;
}

function makeService(store: AssetAccountStore): DebitAuthorizationService {
  return new DebitAuthorizationService(store, {
    reservationTtlMs: 30_000,
  });
}

// ---------------------------------------------------------------------------
// P3.1 — capture deducts exactly `actual` from balance
// ---------------------------------------------------------------------------

describe('DebitAuthorizationService — property tests', () => {
  it('P3.1: capture(opId, actual) => balance decreases by exactly actual', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1_000n, max: 1_000_000_000n }), // initial balance
        fc.bigInt({ min: 1n }), // max authorization
        (startBalance, authOffset) => {
          // Keep max ≤ startBalance to ensure authorization succeeds.
          const maxMicro =
            startBalance > authOffset ? authOffset : startBalance;
          // Actual is ≤ max.
          const actual = maxMicro;

          const store = makeStore(startBalance);
          const svc = makeService(store);

          const opId = svc.authorize(makeMember(), maxMicro);
          const balanceBefore = getBalance(store);

          return svc.capture(opId, actual).then(() => {
            const balanceAfter = getBalance(store);
            return balanceAfter === balanceBefore - actual;
          });
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // P3.2 — release leaves balance unchanged
  // -------------------------------------------------------------------------

  it('P3.2: release(opId) => balance is unchanged', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1_000n, max: 1_000_000_000n }),
        fc.bigInt({ min: 1n }),
        (startBalance, authOffset) => {
          const maxMicro =
            startBalance > authOffset ? authOffset : startBalance;

          const store = makeStore(startBalance);
          const svc = makeService(store);
          const opId = svc.authorize(makeMember(), maxMicro);
          const balanceBefore = getBalance(store);

          svc.release(opId);

          const balanceAfter = getBalance(store);
          return balanceAfter === balanceBefore;
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // P3.3 — double-capture is rejected
  // -------------------------------------------------------------------------

  it('P3.3: double-capture rejects with ReservationOpNotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 10_000n, max: 1_000_000_000n }),
        async (startBalance) => {
          const maxMicro = startBalance / 2n;
          const actual = maxMicro / 2n;

          const store = makeStore(startBalance);
          const svc = makeService(store);
          const opId = svc.authorize(makeMember(), maxMicro);

          await svc.capture(opId, actual);

          let threw = false;
          try {
            await svc.capture(opId, actual);
          } catch (err) {
            threw = err instanceof ReservationOpNotFoundError;
          }
          return threw;
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // P3.4 — capture > max is rejected
  // -------------------------------------------------------------------------

  it('P3.4: capture(opId, actual > max) rejects with CaptureExceedsAuthError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 10_000n, max: 1_000_000_000n }),
        fc.bigInt({ min: 1n, max: 100n }),
        async (startBalance, overage) => {
          const maxMicro = startBalance / 2n;
          const overCapture = maxMicro + overage;

          const store = makeStore(startBalance);
          const svc = makeService(store);
          const opId = svc.authorize(makeMember(), maxMicro);

          let threw = false;
          try {
            await svc.capture(opId, overCapture);
          } catch (err) {
            threw = err instanceof CaptureExceedsAuthError;
          }
          // Cleanup
          try {
            svc.release(opId);
          } catch {
            // already gone due to our capture attempt failing internally
          }
          return threw;
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // P3.5 — capture after release is rejected
  // -------------------------------------------------------------------------

  it('P3.5: capture after release rejects with ReservationOpNotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 10_000n, max: 1_000_000_000n }),
        async (startBalance) => {
          const maxMicro = startBalance / 2n;

          const store = makeStore(startBalance);
          const svc = makeService(store);
          const opId = svc.authorize(makeMember(), maxMicro);
          svc.release(opId);

          let threw = false;
          try {
            await svc.capture(opId, maxMicro);
          } catch (err) {
            threw = err instanceof ReservationOpNotFoundError;
          }
          return threw;
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // P3.6 — Operational-only: ledger writer is never consulted
  // -------------------------------------------------------------------------

  it('P3.6: authorize/release cycles never call ILedgerWriter.getLastSettledAt', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 10_000n, max: 1_000_000_000n }),
        fc.integer({ min: 1, max: 5 }),
        (startBalance, cycles) => {
          let ledgerCallCount = 0;
          const mockLedger: ILedgerWriter = {
            getLastSettledAt: (_assetId: string) => {
              ledgerCallCount++;
              return null;
            },
          };

          const store = makeStore(startBalance);
          store.attachLedger(mockLedger);

          const svc = makeService(store);

          for (let i = 0; i < cycles; i++) {
            const maxMicro = startBalance / BigInt(cycles + 1);
            const opId = svc.authorize(makeMember(), maxMicro);
            svc.release(opId);
          }

          return ledgerCallCount === 0;
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // Deterministic unit: authorize rejects when balance is zero
  // -------------------------------------------------------------------------

  it('authorize with zero balance throws InsufficientJouleError', () => {
    const store = makeStore(0n);
    const svc = makeService(store);
    expect(() => svc.authorize(makeMember(), 1n)).toThrow(
      InsufficientJouleError,
    );
  });

  it('authorize with amount > balance throws InsufficientJouleError', () => {
    const store = makeStore(100n);
    const svc = makeService(store);
    expect(() => svc.authorize(makeMember(), 101n)).toThrow(
      InsufficientJouleError,
    );
  });

  it('release of unknown opId throws ReservationOpNotFoundError', () => {
    const store = makeStore(1_000n);
    const svc = makeService(store);
    expect(() => svc.release('no-such-op')).toThrow(ReservationOpNotFoundError);
  });
});
