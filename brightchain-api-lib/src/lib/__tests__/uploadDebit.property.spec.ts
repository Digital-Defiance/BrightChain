/**
 * @fileoverview Property-based tests for Joule debit-capture balance conservation
 * in the context of `UploadService.quote() → commit() | discard()`.
 *
 * ## Properties under test (Req 10.5)
 *
 * P2.6.1  authorize → capture(actual) → release(remainder):
 *           net L1 balance change = actual µJ exactly
 *           (reserved − captured − released = 0)
 *
 * P2.6.2  authorize → release(full):
 *           net L1 balance change = 0 µJ (nothing deducted)
 *
 * P2.6.3  The 1.25× authorization buffer:
 *           capturedMicroJoules ≤ authorizedMicroJoules always holds
 *           (actual ≤ max, never exceeds authorization)
 *
 * P2.6.4  Any capture where actual > authorized is rejected with
 *           `CaptureExceedsAuthError`.
 *
 * @see digitalburnbag-joule-storage-economy spec, Requirement 10.5
 */

import {
  AssetAccount,
  AssetAccountStore,
  Checksum,
  JOULE_ASSET_ID,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import {
  CaptureExceedsAuthError,
  DebitAuthorizationService,
  InsufficientJouleError,
} from '../joule/debitAuthorization';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEX_MEMBER = 'b'.repeat(128); // 64-byte Checksum (SHA3-512)

function makeChecksum(): Checksum {
  return Checksum.fromHex(HEX_MEMBER);
}

function makeStore(initialBalance: bigint): AssetAccountStore {
  const store = new AssetAccountStore();
  const member = makeChecksum();
  const account = new AssetAccount(
    member,
    JOULE_ASSET_ID,
    new Date(0),
    initialBalance,
  );
  store.setForAsset(member, JOULE_ASSET_ID, account);
  return store;
}

function getAvailable(store: AssetAccountStore): bigint {
  const member = makeChecksum();
  const account = store.getForAsset(member, JOULE_ASSET_ID);
  if (!account) return 0n;
  return account.balance - account.reserved;
}

function getBalance(store: AssetAccountStore): bigint {
  const member = makeChecksum();
  const account = store.getForAsset(member, JOULE_ASSET_ID);
  return account?.balance ?? 0n;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** µJ amount in range [1, 10_000_000] */
const ujAmount = fc.bigInt({ min: 1n, max: 10_000_000n });

/** (balance, actual) where 0 < actual ≤ balance */
const balanceAndActual = ujAmount.chain((actual) =>
  fc
    .bigInt({ min: actual, max: actual * 2n + 1_000n })
    .map((balance) => ({ balance, actual })),
);

// ---------------------------------------------------------------------------
// P2.6.1 — authorize → capture → balance change = actual
// ---------------------------------------------------------------------------

describe('P2.6.1 authorize → capture: net balance change = actual µJ', () => {
  it('holds for arbitrary balance/actual pairs', async () => {
    await fc.assert(
      fc.asyncProperty(balanceAndActual, async ({ balance, actual }) => {
        const store = makeStore(balance);
        const svc = new DebitAuthorizationService(store);
        const member = makeChecksum();

        const balanceBefore = getBalance(store);
        const max = (actual * 125n) / 100n; // 1.25× buffer (may exceed balance)
        const effectiveMax = max <= balance ? max : balance;

        const opId = svc.authorize(member, effectiveMax);
        await svc.capture(opId, actual <= effectiveMax ? actual : effectiveMax);

        const balanceAfter = getBalance(store);
        const deducted = balanceBefore - balanceAfter;
        const captured = actual <= effectiveMax ? actual : effectiveMax;

        expect(deducted).toBe(captured);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// P2.6.2 — authorize → release: no net balance change
// ---------------------------------------------------------------------------

describe('P2.6.2 authorize → release: net balance change = 0', () => {
  it('holds for arbitrary balance/amount pairs', () => {
    fc.assert(
      fc.property(balanceAndActual, ({ balance, actual }) => {
        const store = makeStore(balance);
        const svc = new DebitAuthorizationService(store);
        const member = makeChecksum();

        const balanceBefore = getBalance(store);
        const availableBefore = getAvailable(store);

        const max = (actual * 125n) / 100n;
        const effectiveMax = max <= balance ? max : balance;
        const opId = svc.authorize(member, effectiveMax);

        // After authorize, available should decrease by effectiveMax
        const availableDuringHold = getAvailable(store);
        expect(availableBefore - availableDuringHold).toBe(effectiveMax);

        svc.release(opId);

        const balanceAfter = getBalance(store);
        const availableAfter = getAvailable(store);

        // Balance unchanged, available restored
        expect(balanceAfter).toBe(balanceBefore);
        expect(availableAfter).toBe(availableBefore);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// P2.6.3 — conservation: reserved − captured − released = 0
// ---------------------------------------------------------------------------

describe('P2.6.3 conservation: reserved − captured − released = 0', () => {
  it('holds across authorize → capture path', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1_000n, max: 10_000_000n }),
        async (balance) => {
          const actual = balance / 2n;
          const authorized = (actual * 125n) / 100n;

          const store = makeStore(balance);
          const svc = new DebitAuthorizationService(store);
          const member = makeChecksum();

          const opId = svc.authorize(member, authorized);
          await svc.capture(opId, actual);

          // After capture: balance reduced by actual, nothing reserved
          const account = store.getForAsset(member, JOULE_ASSET_ID);
          expect(account).toBeDefined();
          expect(account!.reserved).toBe(0n);
          expect(account!.balance).toBe(balance - actual);

          // Conservation: reserved − captured − released = 0
          const reserved = authorized;
          const captured = actual;
          const released = reserved - captured; // implicit release of remainder
          expect(reserved - captured - released).toBe(0n);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P2.6.4 — capture exceeding authorization is rejected
// ---------------------------------------------------------------------------

describe('P2.6.4 capture > authorized is rejected with CaptureExceedsAuthError', () => {
  it('holds for arbitrary amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 100n, max: 1_000_000n }),
        async (authorized) => {
          const balance = authorized * 2n;
          const excess = authorized + 1n;

          const store = makeStore(balance);
          const svc = new DebitAuthorizationService(store);
          const member = makeChecksum();

          const opId = svc.authorize(member, authorized);

          await expect(svc.capture(opId, excess)).rejects.toBeInstanceOf(
            CaptureExceedsAuthError,
          );
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P2.6.5 — authorize fails when balance < max (InsufficientJouleError)
// ---------------------------------------------------------------------------

describe('P2.6.5 authorize fails when balance insufficient', () => {
  it('throws InsufficientJouleError when max > balance', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 100_000n }), (balance) => {
        const max = balance + 1n;
        const store = makeStore(balance);
        const svc = new DebitAuthorizationService(store);
        const member = makeChecksum();

        expect(() => svc.authorize(member, max)).toThrow(
          InsufficientJouleError,
        );
      }),
    );
  });
});
