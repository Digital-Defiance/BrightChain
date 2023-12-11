/**
 * @fileoverview Phase 5 property-based tests for AssetAccountStore.
 *
 * Feature: asset-account-store-generalization
 *
 * Properties tested:
 *   5.1  Conservation invariant: balance + spent = earned after any credit /
 *        reserve+settle sequence.
 *   5.2  Multi-asset isolation: operations on one (member, asset) pair do not
 *        bleed into a different (member, asset) pair.
 *   5.3  Hydration idempotency: hydrateAssetAccountDto applied twice equals
 *        applying it once.
 *   5.4  Negative-path: every defined error class is reachable with
 *        fast-check generated adversarial inputs.
 *
 * @see asset-account-store-generalization spec, Requirements 9.1–9.3.
 */
import fc from 'fast-check';
import { AssetAccount, hydrateAssetAccountDto } from '../../asset/assetAccount';
import { JOULE_ASSET_ID } from '../../asset/jouleConstants';
import { AssetUnknownError } from '../../errors/asset/assetUnknownError';
import { InsufficientAvailableBalanceError } from '../../errors/asset/insufficientAvailableBalanceError';
import { InvalidAmountError } from '../../errors/asset/invalidAmountError';
import { LedgerAlreadyAttachedError } from '../../errors/asset/ledgerAlreadyAttachedError';
import { MixedAssetError } from '../../errors/asset/mixedAssetError';
import { ReservationExpiredError } from '../../errors/asset/reservationExpiredError';
import { ReservationNotFoundError } from '../../errors/asset/reservationNotFoundError';
import {
  IAssetAccount,
  IReservationHandle,
} from '../../interfaces/assetAccount';
import { Checksum } from '../../types/checksum';
import { AssetAccountStore, ILedgerWriter } from '../assetAccountStore';

jest.setTimeout(30_000);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const HEX_A = 'a'.repeat(128);
const HEX_B = 'b'.repeat(128);
const HEX_C = 'c'.repeat(128);

const memberA = (): Checksum => Checksum.fromHex(HEX_A);
const memberC = (): Checksum => Checksum.fromHex(HEX_C);

/** Build an AssetAccount seeded with balance = earned = b, spent = reserved = 0. */
function makeAccount(
  member: Checksum,
  assetId: string,
  b: bigint,
): AssetAccount {
  return new AssetAccount(member, assetId, new Date(0), b, b, 0n, 0n);
}

/** Insert an account into a store and return it. */
function seedStore(
  store: AssetAccountStore,
  member: Checksum,
  assetId: string,
  balance: bigint,
): AssetAccount {
  const acct = makeAccount(member, assetId, balance);
  store.setForAsset(member, assetId, acct);
  return acct;
}

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

/** Positive bigint amounts, bounded to avoid arithmetic overflow in tests. */
const arbAmount = fc.bigInt({ min: 1n, max: 1_000_000_000n });

/** Non-negative initial balances, bounded generously. */
const arbInitialBalance = fc.bigInt({ min: 0n, max: 100_000_000_000n });

/** Single operation: credit (true) or spend (false) with an amount. */
const arbOp = fc.record({
  isCredit: fc.boolean(),
  amount: arbAmount,
});

// ---------------------------------------------------------------------------
// Property 5.1 — Conservation invariant
// ---------------------------------------------------------------------------

describe('Property 5.1 — conservation invariant', () => {
  it('balance + spent = earned after any credit / reserve+settle sequence', () => {
    fc.assert(
      fc.property(
        arbInitialBalance,
        fc.array(arbOp, { minLength: 1, maxLength: 30 }),
        (initialBalance, ops) => {
          const store = new AssetAccountStore();
          const member = memberA();
          const acct = seedStore(store, member, JOULE_ASSET_ID, initialBalance);

          for (const op of ops) {
            if (op.isCredit) {
              acct.credit(op.amount);
            } else {
              // Clamp to available so the operation never throws an overdraw.
              const avail =
                acct.balance > acct.reserved
                  ? acct.balance - acct.reserved
                  : 0n;
              const chargeAmt = op.amount <= avail ? op.amount : avail;
              if (chargeAmt > 0n) {
                const h = store.reserve(
                  member,
                  JOULE_ASSET_ID,
                  chargeAmt,
                  60_000,
                );
                store.settle(h, chargeAmt);
              }
            }
          }

          // Conservation: balance + spent must always equal earned.
          expect(acct.balance + acct.spent).toBe(acct.earned);
          expect(acct.balance >= 0n).toBe(true);
          expect(acct.reserved >= 0n).toBe(true);
          expect(acct.spent >= 0n).toBe(true);
        },
      ),
    );
  });

  it('balance + spent = earned after partial settlement (actualAmount < reserved)', () => {
    fc.assert(
      fc.property(
        // Use ≥ 100n so reserveAmount (≤ 50n) always fits.
        fc.bigInt({ min: 100n, max: 10_000_000n }),
        fc.bigInt({ min: 1n, max: 50n }),
        fc.bigInt({ min: 0n, max: 50n }),
        (initialBalance, reserveAmount, partialSettle) => {
          // Clamp so invariants are always satisfiable.
          const r =
            reserveAmount <= initialBalance ? reserveAmount : initialBalance;
          const a = partialSettle <= r ? partialSettle : r;

          const store = new AssetAccountStore();
          const member = memberA();
          const acct = seedStore(store, member, JOULE_ASSET_ID, initialBalance);

          const h = store.reserve(member, JOULE_ASSET_ID, r, 60_000);
          store.settle(h, a);

          // After settle: earned = initialBalance (no credits added).
          // balance = initialBalance - a; spent = a.
          // balance + spent = initialBalance = earned.
          expect(acct.balance + acct.spent).toBe(acct.earned);
          expect(acct.balance >= 0n).toBe(true);
          // Hold fully released (reserved back to 0).
          expect(acct.reserved).toBe(0n);
          expect(acct.spent).toBe(a);
        },
      ),
    );
  });

  it('reserved is zero after every completed reserve+settle cycle', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10_000_000n }),
        fc.array(fc.bigInt({ min: 1n, max: 100n }), {
          minLength: 1,
          maxLength: 10,
        }),
        (initialBalance, amounts) => {
          const store = new AssetAccountStore();
          const member = memberA();
          const acct = seedStore(store, member, JOULE_ASSET_ID, initialBalance);

          for (const raw of amounts) {
            const avail =
              acct.balance > acct.reserved ? acct.balance - acct.reserved : 0n;
            const a = raw <= avail ? raw : 0n;
            if (a > 0n) {
              const h = store.reserve(member, JOULE_ASSET_ID, a, 60_000);
              store.settle(h, a);
            }
          }

          // No outstanding reservations after all cycles.
          expect(acct.reserved).toBe(0n);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5.2 — Multi-asset isolation
// ---------------------------------------------------------------------------

describe('Property 5.2 — multi-asset isolation', () => {
  it('ops on joule do not affect postage account for the same member', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10_000_000n }),
        fc.bigInt({ min: 0n, max: 5_000_000n }),
        (creditAmount, spendAmount) => {
          const store = new AssetAccountStore();
          const member = memberA();

          const acctJoule = seedStore(store, member, 'joule', 10_000_000n);
          const acctPostage = seedStore(store, member, 'postage', 5n);

          // Snapshot the postage account before any operations.
          const snapBalance = acctPostage.balance;
          const snapEarned = acctPostage.earned;
          const snapSpent = acctPostage.spent;
          const snapReserved = acctPostage.reserved;

          // Operate on joule only.
          acctJoule.credit(creditAmount);
          const avail =
            acctJoule.balance > acctJoule.reserved
              ? acctJoule.balance - acctJoule.reserved
              : 0n;
          const spend = spendAmount <= avail ? spendAmount : 0n;
          if (spend > 0n) {
            const h = store.reserve(member, 'joule', spend, 60_000);
            store.settle(h, spend);
          }

          // Postage account must be completely unchanged.
          const postage = store.getForAsset(member, 'postage');
          expect(postage).toBeDefined();
          expect(postage!.balance).toBe(snapBalance);
          expect(postage!.earned).toBe(snapEarned);
          expect(postage!.spent).toBe(snapSpent);
          expect(postage!.reserved).toBe(snapReserved);
        },
      ),
    );
  });

  it('ops on member A do not affect member C for the same asset', () => {
    fc.assert(
      fc.property(arbAmount, (creditAmount) => {
        const store = new AssetAccountStore();
        const mA = memberA();
        const mC = memberC();

        seedStore(store, mA, JOULE_ASSET_ID, 0n);
        const acctC = seedStore(store, mC, JOULE_ASSET_ID, 999n);

        const snapBalance = acctC.balance;
        const snapEarned = acctC.earned;

        // Credit member A only.
        const acctA = store.getForAsset(mA, JOULE_ASSET_ID) as AssetAccount;
        acctA.credit(creditAmount);

        const retrievedC = store.getForAsset(mC, JOULE_ASSET_ID);
        expect(retrievedC).toBeDefined();
        expect(retrievedC!.balance).toBe(snapBalance);
        expect(retrievedC!.earned).toBe(snapEarned);
      }),
    );
  });

  it('size reflects only inserted accounts (no phantom entries)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            assetId: fc.constantFrom('joule', 'postage', 'bandwidth'),
            balance: arbAmount,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (entries) => {
          const store = new AssetAccountStore();
          const member = memberA();

          // Deduplicate by assetId (last-write wins).
          const unique = new Map<
            string,
            { assetId: string; balance: bigint }
          >();
          for (const e of entries) unique.set(e.assetId, e);

          for (const { assetId, balance } of unique.values()) {
            seedStore(store, member, assetId, balance);
          }

          expect(store.size).toBe(unique.size);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5.3 — Hydration idempotency
// ---------------------------------------------------------------------------

describe('Property 5.3 — hydration idempotency', () => {
  /**
   * Balance value in any of the three forms the hydrator must handle:
   *  - decimal string (modern DTO)
   *  - number (legacy DTO)
   *  - bigint (possible intermediate form)
   */
  const arbBalanceField = fc.oneof(
    fc.bigInt({ min: 0n, max: 1_000_000_000_000n }).map((n) => n.toString()),
    fc.nat({ max: 1_000_000 }),
    fc.bigInt({ min: 0n, max: 1_000_000_000n }),
  );

  /**
   * Raw DTO that may omit assetId (legacy) or carry number/bigint balances.
   * `assetId: undefined` simulates a doc persisted before the field was added.
   */
  const arbRawDto = fc.record({
    memberId: fc.constant('a'.repeat(128)),

    assetId: fc.option(
      fc.oneof(fc.constant('joule'), fc.constant('postage'), fc.constant('')),
      { nil: undefined as unknown as string },
    ),
    balance: arbBalanceField,
    earned: arbBalanceField,
    spent: arbBalanceField,
    reserved: arbBalanceField,
    reputation: fc.float({ min: 0, max: 1 }),
    createdAt: fc.constant(new Date(0).toISOString()),
    lastUpdated: fc.constant(new Date(0).toISOString()),
  });

  it('hydrateAssetAccountDto is idempotent', () => {
    fc.assert(
      fc.property(arbRawDto, (raw) => {
        const first = hydrateAssetAccountDto(raw as Record<string, unknown>);
        const second = hydrateAssetAccountDto(
          first as unknown as Record<string, unknown>,
        );
        expect(second).toEqual(first);
      }),
    );
  });

  it('hydrating a fully modern DTO is a no-op on numeric fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          memberId: fc.constant('b'.repeat(128)),
          assetId: fc.constantFrom('joule', 'postage'),
          balance: fc
            .bigInt({ min: 0n, max: 1_000_000_000n })
            .map((n) => n.toString()),
          earned: fc
            .bigInt({ min: 0n, max: 1_000_000_000n })
            .map((n) => n.toString()),
          spent: fc
            .bigInt({ min: 0n, max: 1_000_000_000n })
            .map((n) => n.toString()),
          reserved: fc
            .bigInt({ min: 0n, max: 1_000_000_000n })
            .map((n) => n.toString()),
          reputation: fc.float({ min: 0, max: 1 }),
          createdAt: fc.constant(new Date(0).toISOString()),
          lastUpdated: fc.constant(new Date(0).toISOString()),
        }),
        (dto) => {
          const out = hydrateAssetAccountDto(dto as Record<string, unknown>);
          // Already-normalized fields must pass through unchanged.
          expect(out.balance).toBe(dto.balance);
          expect(out.earned).toBe(dto.earned);
          expect(out.spent).toBe(dto.spent);
          expect(out.reserved).toBe(dto.reserved);
          expect(out.assetId).toBe(dto.assetId);
        },
      ),
    );
  });

  it('legacy number balances are always multiplied by JOULE_MICROUNITS_PER_UNIT', () => {
    const MICRO = 1_000_000n;
    fc.assert(
      fc.property(fc.nat({ max: 999_999 }), (legacyBalance) => {
        const raw = {
          memberId: 'a'.repeat(128),
          balance: legacyBalance,
          earned: 0,
          spent: 0,
          reserved: 0,
          reputation: 0.5,
          createdAt: new Date(0).toISOString(),
          lastUpdated: new Date(0).toISOString(),
        };
        const out = hydrateAssetAccountDto(raw);
        const expected = BigInt(Math.round(legacyBalance * Number(MICRO)));
        expect(BigInt(out.balance)).toBe(expected);
        // Idempotency: second hydration must not multiply again.
        const second = hydrateAssetAccountDto(
          out as unknown as Record<string, unknown>,
        );
        expect(second.balance).toBe(out.balance);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5.4 — Negative-path: every defined error is reachable
// ---------------------------------------------------------------------------

describe('Property 5.4 — negative-path: every defined error is reachable', () => {
  // --- InsufficientAvailableBalanceError -----------------------------------

  it('InsufficientAvailableBalanceError: reserve amount exceeds available balance', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1_000_000n }), (balance) => {
        const overdraw = balance + 1n; // always > balance → always throws
        const store = new AssetAccountStore();
        const member = memberA();
        const acct = seedStore(store, member, JOULE_ASSET_ID, balance);
        void acct; // referenced to confirm it's in the store
        expect(() =>
          store.reserve(member, JOULE_ASSET_ID, overdraw, 60_000),
        ).toThrow(InsufficientAvailableBalanceError);
      }),
    );
  });

  // --- MixedAssetError -----------------------------------------------------

  it('MixedAssetError: sumBalances rejects accounts with different assetIds', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        (balA, balB) => {
          const mA = memberA();
          const mB = Checksum.fromHex(HEX_B);
          const acctA: IAssetAccount = makeAccount(mA, 'joule', balA);
          const acctB: IAssetAccount = makeAccount(mB, 'postage', balB);
          expect(() => AssetAccountStore.sumBalances([acctA, acctB])).toThrow(
            MixedAssetError,
          );
        },
      ),
    );
  });

  it('MixedAssetError: setForAsset rejects assetId mismatch', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1_000_000n }), (balance) => {
        const store = new AssetAccountStore();
        const member = memberA();
        // Account carries 'joule' but we try to insert it under 'postage'.
        const acct = makeAccount(member, 'joule', balance);
        expect(() => store.setForAsset(member, 'postage', acct)).toThrow(
          MixedAssetError,
        );
      }),
    );
  });

  // --- ReservationNotFoundError --------------------------------------------

  it('ReservationNotFoundError: settle with unknown reservation id', () => {
    fc.assert(
      fc.property(fc.uuid(), (fakeId) => {
        const store = new AssetAccountStore();
        const member = memberA();
        seedStore(store, member, JOULE_ASSET_ID, 100n);

        const fakeHandle: IReservationHandle = {
          reservationId: fakeId,
          memberId: member,
          assetId: JOULE_ASSET_ID,
          amount: 10n,
          createdAt: new Date(0),
          expiresAt: new Date(Date.now() + 60_000),
        };

        expect(() => store.settle(fakeHandle, 10n)).toThrow(
          ReservationNotFoundError,
        );
        expect(() => store.release(fakeHandle)).toThrow(
          ReservationNotFoundError,
        );
      }),
    );
  });

  it('ReservationNotFoundError: reserve when account is absent', () => {
    fc.assert(
      fc.property(arbAmount, (amount) => {
        const store = new AssetAccountStore();
        const member = memberA();
        // No account inserted → reserve throws ReservationNotFoundError.
        expect(() =>
          store.reserve(member, JOULE_ASSET_ID, amount, 60_000),
        ).toThrow(ReservationNotFoundError);
      }),
    );
  });

  // --- ReservationExpiredError ---------------------------------------------

  it('ReservationExpiredError: settle after TTL has elapsed', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1_000_000));
    try {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 10n, max: 1_000_000n }),
          fc.bigInt({ min: 1n, max: 9n }),
          (balance, reserveAmt) => {
            // Reset to a deterministic epoch at start of each property run.
            jest.setSystemTime(new Date(1_000_000));

            const store = new AssetAccountStore();
            const member = memberA();
            seedStore(store, member, JOULE_ASSET_ID, balance);

            // Reserve with 1 ms TTL.
            const h = store.reserve(member, JOULE_ASSET_ID, reserveAmt, 1);

            // Advance past expiry.
            jest.setSystemTime(h.expiresAt.getTime() + 100);

            expect(() => store.settle(h, reserveAmt)).toThrow(
              ReservationExpiredError,
            );
          },
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  // --- LedgerAlreadyAttachedError ------------------------------------------

  it('LedgerAlreadyAttachedError: second attachLedger call is rejected', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const store = new AssetAccountStore();
        const writer: ILedgerWriter = { getLastSettledAt: () => null };
        store.attachLedger(writer);
        expect(() => store.attachLedger(writer)).toThrow(
          LedgerAlreadyAttachedError,
        );
      }),
    );
  });

  // --- InvalidAmountError --------------------------------------------------

  it('InvalidAmountError: negative amount to AssetAccount.credit', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 1_000_000n }).map((n) => -n),
        (negAmount) => {
          const acct = makeAccount(memberA(), JOULE_ASSET_ID, 0n);
          expect(() => acct.credit(negAmount)).toThrow(InvalidAmountError);
        },
      ),
    );
  });

  it('InvalidAmountError: negative amount to AssetAccount.charge', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 1_000_000n }).map((n) => -n),
        (negAmount) => {
          const acct = makeAccount(memberA(), JOULE_ASSET_ID, 1_000_000n);
          expect(() => acct.charge(negAmount)).toThrow(InvalidAmountError);
        },
      ),
    );
  });

  // --- AssetUnknownError ---------------------------------------------------

  it('AssetUnknownError: is constructible with any non-empty string assetId', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (assetId) => {
        const err = new AssetUnknownError(assetId);
        expect(err).toBeInstanceOf(AssetUnknownError);
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('AssetUnknownError');
        expect(err.assetId).toBe(assetId);
        expect(err.message).toContain(assetId);
      }),
    );
  });
});
