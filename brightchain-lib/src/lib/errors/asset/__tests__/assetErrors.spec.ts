import { AssetUnknownError } from '../assetUnknownError';
import { InsufficientAvailableBalanceError } from '../insufficientAvailableBalanceError';
import { InvalidAmountError } from '../invalidAmountError';
import { LedgerAlreadyAttachedError } from '../ledgerAlreadyAttachedError';
import { MixedAssetError } from '../mixedAssetError';
import { ReservationExpiredError } from '../reservationExpiredError';
import { ReservationNotFoundError } from '../reservationNotFoundError';

describe('asset error classes', () => {
  it('InvalidAmountError carries the offending value', () => {
    const err = new InvalidAmountError('bad', -1);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(InvalidAmountError);
    expect(err.name).toBe('InvalidAmountError');
    expect(err.value).toBe(-1);
  });

  it('MixedAssetError lists the offending assetIds', () => {
    const err = new MixedAssetError(['joule', 'postage']);
    expect(err).toBeInstanceOf(MixedAssetError);
    expect(err.assetIds).toEqual(['joule', 'postage']);
    expect(err.message).toContain('joule');
    expect(err.message).toContain('postage');
  });

  it('InsufficientAvailableBalanceError exposes requested vs available', () => {
    const err = new InsufficientAvailableBalanceError('joule', 100n, 30n);
    expect(err.assetId).toBe('joule');
    expect(err.requested).toBe(100n);
    expect(err.available).toBe(30n);
    expect(err.message).toContain('100');
    expect(err.message).toContain('30');
  });

  it('ReservationNotFoundError carries the reservationId', () => {
    const err = new ReservationNotFoundError('rsv-1');
    expect(err.reservationId).toBe('rsv-1');
    expect(err.message).toContain('rsv-1');
  });

  it('ReservationExpiredError carries id and expiry timestamp', () => {
    const ts = new Date('2026-01-01T00:00:00Z');
    const err = new ReservationExpiredError('rsv-2', ts);
    expect(err.reservationId).toBe('rsv-2');
    expect(err.expiredAt).toBe(ts);
  });

  it('LedgerAlreadyAttachedError has a stable name', () => {
    const err = new LedgerAlreadyAttachedError();
    expect(err.name).toBe('LedgerAlreadyAttachedError');
  });

  it('AssetUnknownError carries the assetId', () => {
    const err = new AssetUnknownError('mystery');
    expect(err.assetId).toBe('mystery');
    expect(err.message).toContain('mystery');
  });

  it('all asset errors are catchable as Error', () => {
    const errors = [
      new InvalidAmountError(),
      new MixedAssetError(['a', 'b']),
      new InsufficientAvailableBalanceError('joule', 1n, 0n),
      new ReservationNotFoundError('id'),
      new ReservationExpiredError('id', new Date()),
      new LedgerAlreadyAttachedError(),
      new AssetUnknownError('x'),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
