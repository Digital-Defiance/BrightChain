import { AssetAccount } from '../../asset/assetAccount';
import { JOULE_ASSET_ID } from '../../asset/jouleConstants';
import { InsufficientAvailableBalanceError } from '../../errors/asset/insufficientAvailableBalanceError';
import { LedgerAlreadyAttachedError } from '../../errors/asset/ledgerAlreadyAttachedError';
import { MixedAssetError } from '../../errors/asset/mixedAssetError';
import { ReservationExpiredError } from '../../errors/asset/reservationExpiredError';
import { ReservationNotFoundError } from '../../errors/asset/reservationNotFoundError';
import { Checksum } from '../../types/checksum';
import { AssetAccountStore, ILedgerWriter } from '../assetAccountStore';

const HEX_A = 'a'.repeat(128);
const HEX_B = 'b'.repeat(128);
const memberA = (): Checksum => Checksum.fromHex(HEX_A);
const memberB = (): Checksum => Checksum.fromHex(HEX_B);

const seed = (
  store: AssetAccountStore,
  member: Checksum,
  assetId: string,
  balance: bigint,
): AssetAccount => {
  const account = new AssetAccount(member, assetId, new Date(0), balance);
  store.setForAsset(member, assetId, account);
  return account;
};

describe('AssetAccountStore', () => {
  describe('construction', () => {
    it('defaults defaultAssetId to "joule"', () => {
      expect(new AssetAccountStore().defaultAssetId).toBe(JOULE_ASSET_ID);
    });

    it('rejects empty defaultAssetId', () => {
      expect(() => new AssetAccountStore('')).toThrow();
    });

    it('exposes operationalSemantics marker', () => {
      const s = new AssetAccountStore();
      expect(s.operationalSemantics).toMatch(/operational projection cache/);
    });
  });

  describe('composite-key isolation', () => {
    it('keeps (member, asset) pairs distinct', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      seed(s, memberA(), 'postage', 50n);
      seed(s, memberB(), 'joule', 25n);
      expect(s.size).toBe(3);
      expect(s.getForAsset(memberA(), 'joule')!.balance).toBe(100n);
      expect(s.getForAsset(memberA(), 'postage')!.balance).toBe(50n);
      expect(s.getForAsset(memberB(), 'joule')!.balance).toBe(25n);
    });

    it('single-arity convenience methods use defaultAssetId', () => {
      const s = new AssetAccountStore('joule');
      const acc = seed(s, memberA(), 'joule', 100n);
      expect(s.has(memberA())).toBe(true);
      expect(s.get(memberA())).toBe(acc);
      s.delete(memberA());
      expect(s.has(memberA())).toBe(false);
    });

    it('setForAsset rejects mismatched assetId', () => {
      const s = new AssetAccountStore();
      const a = new AssetAccount(memberA(), 'joule', new Date(0), 1n);
      expect(() => s.setForAsset(memberA(), 'postage', a)).toThrow(
        MixedAssetError,
      );
    });

    it('setForAsset rejects mismatched memberId', () => {
      const s = new AssetAccountStore();
      const a = new AssetAccount(memberA(), 'joule', new Date(0), 1n);
      expect(() => s.setForAsset(memberB(), 'joule', a)).toThrow();
    });

    it('deleteForAsset returns false when nothing was deleted', () => {
      const s = new AssetAccountStore();
      expect(s.deleteForAsset(memberA(), 'joule')).toBe(false);
    });
  });

  describe('listing', () => {
    it('getAllForAsset filters by assetId', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 1n);
      seed(s, memberA(), 'postage', 2n);
      seed(s, memberB(), 'joule', 3n);
      const joules = s.getAllForAsset('joule');
      expect(joules).toHaveLength(2);
      expect(joules.every((a) => a.assetId === 'joule')).toBe(true);
    });

    it('getAllAccounts returns every record', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 1n);
      seed(s, memberA(), 'postage', 2n);
      expect(s.getAllAccounts()).toHaveLength(2);
    });

    it('clear empties accounts and reservations', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      s.reserve(memberA(), 'joule', 10n, 60_000);
      s.clear();
      expect(s.size).toBe(0);
    });
  });

  describe('reservations', () => {
    it('reserve happy path issues handle and increments reserved', () => {
      const s = new AssetAccountStore();
      const acc = seed(s, memberA(), 'joule', 100n);
      const handle = s.reserve(memberA(), 'joule', 30n, 60_000);
      expect(handle.amount).toBe(30n);
      expect(handle.assetId).toBe('joule');
      expect(handle.reservationId).toMatch(/[0-9a-f-]+/);
      expect(acc.reserved).toBe(30n);
      expect(handle.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('reserve throws InsufficientAvailableBalanceError on overdraw', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 10n);
      expect(() => s.reserve(memberA(), 'joule', 11n, 60_000)).toThrow(
        InsufficientAvailableBalanceError,
      );
    });

    it('reserve throws ReservationNotFoundError when account missing', () => {
      const s = new AssetAccountStore();
      expect(() => s.reserve(memberA(), 'joule', 1n, 60_000)).toThrow(
        ReservationNotFoundError,
      );
    });

    it('settle moves actualAmount to spent and releases the rest', () => {
      const s = new AssetAccountStore();
      const acc = seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 40n, 60_000);
      s.settle(h, 25n);
      expect(acc.reserved).toBe(0n);
      expect(acc.balance).toBe(75n);
      expect(acc.spent).toBe(25n);
    });

    it('settle rejects amounts above reserved', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 10n, 60_000);
      expect(() => s.settle(h, 11n)).toThrow();
    });

    it('settle rejects negative amounts', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 10n, 60_000);
      expect(() => s.settle(h, -1n)).toThrow();
    });

    it('settle on expired reservation throws ReservationExpiredError and releases hold', () => {
      const s = new AssetAccountStore();
      const acc = seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 40n, 1);
      // Advance clock past expiry.
      jest.useFakeTimers();
      jest.setSystemTime(h.expiresAt.getTime() + 10);
      try {
        expect(() => s.settle(h, 5n)).toThrow(ReservationExpiredError);
      } finally {
        jest.useRealTimers();
      }
      expect(acc.reserved).toBe(0n);
    });

    it('settle on unknown handle throws ReservationNotFoundError', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      const fake = {
        reservationId: 'nope',
        memberId: memberA(),
        assetId: 'joule',
        amount: 1n,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      };
      expect(() => s.settle(fake, 1n)).toThrow(ReservationNotFoundError);
    });

    it('release returns the full reservation with no spend', () => {
      const s = new AssetAccountStore();
      const acc = seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 40n, 60_000);
      s.release(h);
      expect(acc.reserved).toBe(0n);
      expect(acc.balance).toBe(100n);
      expect(acc.spent).toBe(0n);
    });

    it('release throws ReservationNotFoundError after settle', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 100n);
      const h = s.reserve(memberA(), 'joule', 10n, 60_000);
      s.release(h);
      expect(() => s.release(h)).toThrow(ReservationNotFoundError);
    });

    it('lazy reaping releases expired reservations on next reserve', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1_000_000));
      try {
        const s = new AssetAccountStore();
        const acc = seed(s, memberA(), 'joule', 100n);
        const old = s.reserve(memberA(), 'joule', 80n, 1);
        jest.setSystemTime(old.expiresAt.getTime() + 10);
        // Available was 20 before reap, becomes 100 after reap.
        const fresh = s.reserve(memberA(), 'joule', 90n, 60_000);
        expect(fresh.amount).toBe(90n);
        expect(acc.reserved).toBe(90n);
      } finally {
        jest.useRealTimers();
      }
    });

    it('reapAllExpired returns the count of reaped handles', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1_000_000));
      try {
        const s = new AssetAccountStore();
        seed(s, memberA(), 'joule', 100n);
        const a = s.reserve(memberA(), 'joule', 10n, 1);
        const b = s.reserve(memberA(), 'joule', 10n, 60_000);
        jest.setSystemTime(a.expiresAt.getTime() + 10);
        expect(s.reapAllExpired()).toBe(1);
        // The non-expired reservation survives.
        expect(() => s.release(b)).not.toThrow();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('aggregate helpers', () => {
    it('sumBalances returns 0n on empty input', () => {
      expect(AssetAccountStore.sumBalances([])).toBe(0n);
      expect(new AssetAccountStore().sumBalances([])).toBe(0n);
    });

    it('sumBalances totals same-asset records', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 30n);
      seed(s, memberB(), 'joule', 70n);
      expect(s.sumBalances(s.getAllForAsset('joule'))).toBe(100n);
    });

    it('sumBalances throws MixedAssetError on mixed assets', () => {
      const s = new AssetAccountStore();
      seed(s, memberA(), 'joule', 1n);
      seed(s, memberA(), 'postage', 1n);
      expect(() => s.sumBalances(s.getAllAccounts())).toThrow(MixedAssetError);
    });
  });

  describe('ledger attachment', () => {
    it('getLastSettledAt returns null before attach', () => {
      expect(new AssetAccountStore().getLastSettledAt('joule')).toBeNull();
    });

    it('attachLedger is one-shot', () => {
      const s = new AssetAccountStore();
      const writer: ILedgerWriter = { getLastSettledAt: () => null };
      s.attachLedger(writer);
      expect(() => s.attachLedger(writer)).toThrow(LedgerAlreadyAttachedError);
    });

    it('getLastSettledAt forwards to the writer once attached', () => {
      const s = new AssetAccountStore();
      const stamp = new Date(123_456_789);
      s.attachLedger({ getLastSettledAt: () => stamp });
      expect(s.getLastSettledAt('joule')).toBe(stamp);
    });

    it('getLastSettledAt swallows writer errors and returns null', () => {
      const s = new AssetAccountStore();
      s.attachLedger({
        getLastSettledAt: () => {
          throw new Error('boom');
        },
      });
      expect(s.getLastSettledAt('joule')).toBeNull();
    });
  });
});
